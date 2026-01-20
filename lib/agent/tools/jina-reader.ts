import { JinaReaderResponse } from '../types';
import { rateLimiter } from './rate-limiter';

const JINA_API_KEY = process.env.JINA_API_KEY;

/**
 * Read article with Jina API key (200 req/min)
 */
export async function readArticleWithKey(url: string): Promise<JinaReaderResponse> {
    if (!JINA_API_KEY) {
        return {
            success: false,
            error: 'JINA_API_KEY not configured',
        };
    }

    try {
        // Wait for rate limit token
        await rateLimiter.waitForToken('jina_api');

        const jinaUrl = `https://r.jina.ai/${url}`;
        console.log(`[JinaAPI] Reading: ${url}`);

        const response = await fetch(jinaUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${JINA_API_KEY}`,
            },
        });

        if (!response.ok) {
            return {
                success: false,
                error: `Jina Reader failed: ${response.status} ${response.statusText}`,
            };
        }

        const text = await response.text();

        return {
            success: true,
            content: text,
            title: extractTitle(text),
        };
    } catch (error) {
        console.error('[JinaAPI] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Read article with Jina FREE tier (20 req/min, no API key)
 * Automatically waits when rate limit is reached
 */
export async function readArticleFree(url: string): Promise<JinaReaderResponse> {
    try {
        // Wait for rate limit token - this will block if limit reached
        await rateLimiter.waitForToken('jina_free');

        const jinaUrl = `https://r.jina.ai/${url}`;
        console.log(`[JinaFree] Reading: ${url} (${rateLimiter.getAvailableTokens('jina_free')} tokens left)`);

        const response = await fetch(jinaUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                // No Authorization header = free tier
            },
        });

        if (!response.ok) {
            // Check for rate limit error
            if (response.status === 429) {
                console.log('[JinaFree] Rate limited by server, waiting...');
                // Wait 60 seconds and retry
                await new Promise(resolve => setTimeout(resolve, 60000));
                return readArticleFree(url);
            }

            return {
                success: false,
                error: `Jina Reader failed: ${response.status} ${response.statusText}`,
            };
        }

        const text = await response.text();

        return {
            success: true,
            content: text,
            title: extractTitle(text),
        };
    } catch (error) {
        console.error('[JinaFree] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Legacy function - uses API key if available, otherwise free tier
 */
export async function readArticle(url: string): Promise<JinaReaderResponse> {
    if (JINA_API_KEY) {
        return readArticleWithKey(url);
    }
    return readArticleFree(url);
}

/**
 * Check if Jina API key is available
 */
export function isJinaApiAvailable(): boolean {
    return !!JINA_API_KEY;
}

/**
 * Extract title from Jina markdown response
 */
function extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : '';
}

/**
 * Truncate content to fit token limits
 */
export function truncateContent(content: string, maxChars: number = 4000): string {
    if (content.length <= maxChars) return content;
    return content.substring(0, maxChars) + '... [truncated]';
}
