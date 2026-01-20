/**
 * Multi-Scraper Orchestrator
 * 
 * Manages multiple scraping providers with automatic fallback and rate limiting.
 * Provider priority: Jina API → Jina Free → Exa AI
 */

import { readArticleWithKey, readArticleFree, isJinaApiAvailable, truncateContent } from './jina-reader';
import { scrapeWithExa, isExaAvailable } from './exa-scraper';
import { rateLimiter } from './rate-limiter';

export type ScrapingProvider = 'jina_api' | 'jina_free' | 'exa' | 'auto';

interface ScrapeResult {
    success: boolean;
    content?: string;
    title?: string;
    provider?: ScrapingProvider;
    error?: string;
    waitedForRateLimit?: boolean;
}

interface ScrapeOptions {
    provider?: ScrapingProvider;
    maxChars?: number;
    allowFallback?: boolean;
}

/**
 * Get rate limiter status for all providers
 */
export function getProviderStatus() {
    return {
        jina_api: {
            available: isJinaApiAvailable(),
            tokens: rateLimiter.getAvailableTokens('jina_api'),
            limit: 200,
        },
        jina_free: {
            available: true, // Always available
            tokens: rateLimiter.getAvailableTokens('jina_free'),
            limit: 20,
        },
        exa: {
            available: isExaAvailable(),
            tokens: rateLimiter.getAvailableTokens('exa'),
            limit: 100,
        },
    };
}

/**
 * Scrape article with specified or auto-selected provider
 */
export async function scrapeArticle(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const {
        provider = 'auto',
        maxChars = 4000,
        allowFallback = true,
    } = options;

    // Determine which provider to use
    const providerToUse = provider === 'auto' ? selectBestProvider() : provider;

    console.log(`[MultiScraper] Using provider: ${providerToUse} for ${url}`);

    let result: ScrapeResult;

    switch (providerToUse) {
        case 'jina_api':
            result = await tryJinaApi(url, maxChars);
            break;
        case 'jina_free':
            result = await tryJinaFree(url, maxChars);
            break;
        case 'exa':
            result = await tryExa(url, maxChars);
            break;
        default:
            result = { success: false, error: `Unknown provider: ${providerToUse}` };
    }

    // Try fallback if allowed and failed
    if (!result.success && allowFallback && provider === 'auto') {
        console.log(`[MultiScraper] Provider ${providerToUse} failed, trying fallback...`);
        result = await tryFallbackChain(url, maxChars, providerToUse);
    }

    return result;
}

/**
 * Select best available provider based on availability and rate limits
 */
function selectBestProvider(): ScrapingProvider {
    // Priority 1: Jina API if key available and tokens
    if (isJinaApiAvailable() && rateLimiter.canMakeRequest('jina_api')) {
        return 'jina_api';
    }

    // Priority 2: Jina Free if tokens available (will wait if needed)
    // We always try Jina Free as it auto-waits
    if (rateLimiter.canMakeRequest('jina_free')) {
        return 'jina_free';
    }

    // Priority 3: Exa if API key available
    if (isExaAvailable()) {
        return 'exa';
    }

    // Fallback to Jina Free with wait
    return 'jina_free';
}

/**
 * Try Jina with API key
 */
async function tryJinaApi(url: string, maxChars: number): Promise<ScrapeResult> {
    const startTime = Date.now();
    const result = await readArticleWithKey(url);

    return {
        success: result.success,
        content: result.success ? truncateContent(result.content || '', maxChars) : undefined,
        title: result.title,
        provider: 'jina_api',
        error: result.error,
        waitedForRateLimit: rateLimiter.getWaitTime('jina_api') > 0,
    };
}

/**
 * Try Jina free tier (auto-waits on rate limit)
 */
async function tryJinaFree(url: string, maxChars: number): Promise<ScrapeResult> {
    const waitTime = rateLimiter.getWaitTime('jina_free');
    const willWait = waitTime > 0;

    if (willWait) {
        console.log(`[MultiScraper] Jina Free rate limited, waiting ${Math.ceil(waitTime / 1000)}s...`);
    }

    const result = await readArticleFree(url);

    return {
        success: result.success,
        content: result.success ? truncateContent(result.content || '', maxChars) : undefined,
        title: result.title,
        provider: 'jina_free',
        error: result.error,
        waitedForRateLimit: willWait,
    };
}

/**
 * Try Exa AI
 */
async function tryExa(url: string, maxChars: number): Promise<ScrapeResult> {
    const result = await scrapeWithExa(url, maxChars);

    return {
        success: result.success,
        content: result.content,
        title: result.title,
        provider: 'exa',
        error: result.error,
    };
}

/**
 * Try fallback chain after primary provider fails
 */
async function tryFallbackChain(
    url: string,
    maxChars: number,
    failedProvider: ScrapingProvider
): Promise<ScrapeResult> {
    const providers: ScrapingProvider[] = ['jina_api', 'jina_free', 'exa'];

    for (const provider of providers) {
        // Skip the already-failed provider
        if (provider === failedProvider) continue;

        // Skip unavailable providers
        if (provider === 'jina_api' && !isJinaApiAvailable()) continue;
        if (provider === 'exa' && !isExaAvailable()) continue;

        console.log(`[MultiScraper] Fallback: trying ${provider}`);

        let result: ScrapeResult;
        switch (provider) {
            case 'jina_api':
                result = await tryJinaApi(url, maxChars);
                break;
            case 'jina_free':
                result = await tryJinaFree(url, maxChars);
                break;
            case 'exa':
                result = await tryExa(url, maxChars);
                break;
            default:
                continue;
        }

        if (result.success) {
            return result;
        }
    }

    return {
        success: false,
        error: 'All scraping providers failed',
    };
}

export type { ScrapeResult, ScrapeOptions };
