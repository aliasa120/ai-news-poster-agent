import { SerperSearchResponse, SerperSearchResult } from '../types';

const SEARXNG_BASE_URL = process.env.SEARXNG_BASE_URL || 'http://localhost:8080';

// Domains to exclude from search results (social media, forums, etc.)
const BLOCKED_DOMAINS = [
    'facebook.com',
    'fb.com',
    'twitter.com',
    'x.com',
    'reddit.com',
    'instagram.com',
    'tiktok.com',
    'pinterest.com',
    'linkedin.com',
    'tumblr.com',
    'quora.com',
    'youtube.com',  // Video, not article
    'youtu.be',
];

/**
 * Check if a URL should be blocked (social media, forums, etc.)
 */
function isBlockedUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        return BLOCKED_DOMAINS.some(domain =>
            hostname === domain ||
            hostname.endsWith('.' + domain) ||
            hostname.includes('.' + domain + '/')
        );
    } catch {
        return false;
    }
}

/**
 * Check if SearXNG is configured
 */
export function isSearXNGAvailable(): boolean {
    return !!process.env.SEARXNG_BASE_URL;
}

/**
 * Search interface for SearXNG (compatible with Serper interface)
 */
export async function searchWithSearXNG(query: string, numResults: number = 3): Promise<SerperSearchResponse> {
    try {
        const searchUrl = new URL(`${SEARXNG_BASE_URL}/search`);
        searchUrl.searchParams.append('q', query);
        searchUrl.searchParams.append('format', 'json');
        searchUrl.searchParams.append('engines', 'google,bing,duckduckgo'); // Multiple engines for variety
        searchUrl.searchParams.append('language', 'en-US');

        console.log(`[SearXNG] Searching: ${searchUrl.toString()}`);

        const response = await fetch(searchUrl.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return {
                success: false,
                error: `SearXNG failed: ${response.status} ${response.statusText}`,
            };
        }

        const data = await response.json();

        // Filter out blocked domains (social media) and map results
        const allResults = (data.results || []).filter((item: any) => {
            const url = item.url || '';
            const isBlocked = isBlockedUrl(url);
            if (isBlocked) {
                console.log(`[SearXNG] Filtered out blocked URL: ${url}`);
            }
            return !isBlocked;
        });

        // Map to Serper format, taking top N after filtering
        const results: SerperSearchResult[] = allResults.slice(0, numResults).map((item: any) => ({
            title: item.title || '',
            link: item.url || '',
            snippet: item.content || item.snippet || '',
        }));

        console.log(`[SearXNG] Filtered ${(data.results || []).length - allResults.length} social media results, keeping ${results.length}`);

        // Log search activity with metadata
        const { getRunId } = require('../state');
        const { logActivity } = require('../store');
        const runId = getRunId();
        if (runId) {
            await logActivity(runId, 'searching', `🔍 Searched (SearXNG): ${query}`, undefined, 'SearXNG', {
                query,
                results: results.slice(0, 3),
                total_results: allResults.length,
                filtered_out: (data.results || []).length - allResults.length
            });
        }

        return {
            success: true,
            results,
        };
    } catch (error) {
        console.error('SearXNG search error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Search specifically for news using SearXNG
 */
export async function searchNewsWithSearXNG(query: string, numResults: number = 3): Promise<SerperSearchResponse> {
    try {
        const searchUrl = new URL(`${SEARXNG_BASE_URL}/search`);
        searchUrl.searchParams.append('q', query);
        searchUrl.searchParams.append('format', 'json');
        searchUrl.searchParams.append('engines', 'google news,bing news,duckduckgo'); // Multiple news engines
        searchUrl.searchParams.append('categories', 'news');
        searchUrl.searchParams.append('language', 'en-US');

        console.log(`[SearXNG] News Search: ${searchUrl.toString()}`);

        const response = await fetch(searchUrl.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return {
                success: false,
                error: `SearXNG News API failed: ${response.status} ${response.statusText}`,
            };
        }

        const data = await response.json();

        // Filter out blocked domains (social media) and map results
        const allResults = (data.results || []).filter((item: any) => {
            const url = item.url || '';
            const isBlocked = isBlockedUrl(url);
            if (isBlocked) {
                console.log(`[SearXNG News] Filtered out blocked URL: ${url}`);
            }
            return !isBlocked;
        });

        // Map to Serper format, taking top N after filtering
        const results: SerperSearchResult[] = allResults.slice(0, numResults).map((item: any) => ({
            title: item.title || '',
            link: item.url || '',
            snippet: item.content || item.snippet || '',
        }));

        console.log(`[SearXNG News] Filtered ${(data.results || []).length - allResults.length} social media results, keeping ${results.length}`);

        // Log search activity with metadata
        const { getRunId } = require('../state');
        const { logActivity } = require('../store');
        const runId = getRunId();
        if (runId) {
            await logActivity(runId, 'searching', `📰 News Search (SearXNG): ${query}`, undefined, 'SearXNG News', {
                query,
                results: results.slice(0, 3),
                total_results: allResults.length,
                filtered_out: (data.results || []).length - allResults.length
            });
        }

        return {
            success: true,
            results,
        };
    } catch (error) {
        console.error('SearXNG news search error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
