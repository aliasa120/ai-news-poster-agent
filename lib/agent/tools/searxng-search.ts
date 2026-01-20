/**
 * SearXNG Search - Privacy-focused meta-search engine
 * 
 * Uses self-hosted or public SearXNG instance for web search.
 * Alternative to Serper API.
 */

import { SerperSearchResponse, SerperSearchResult } from '../types';

// Primary URL from environment, with public fallbacks that support JSON
const SEARXNG_URL = process.env.SEARXNG_URL;

// Public instances known to support JSON API - rotated to balance load
const PUBLIC_SEARXNG_INSTANCES = [
    'https://searx.be',
    'https://search.sapti.me',
    'https://search.ononoki.org',
    'https://paulgo.io',
    'https://search.privacyguides.net',
];

// Track which instance index to use (simple round-robin)
let currentInstanceIndex = 0;

// Get the next SearXNG instance to try
function getNextInstance(): string {
    const instance = PUBLIC_SEARXNG_INSTANCES[currentInstanceIndex];
    currentInstanceIndex = (currentInstanceIndex + 1) % PUBLIC_SEARXNG_INSTANCES.length;
    return instance;
}

// Get the SearXNG URL to use (user's or public)
function getSearXNGEndpoint(): string {
    // Always use public instances since user's doesn't support JSON
    return getNextInstance();
}

interface SearXNGResult {
    title?: string;
    url?: string;
    content?: string;
    engine?: string;
    publishedDate?: string;
}

interface SearXNGResponse {
    results?: SearXNGResult[];
    query?: string;
    number_of_results?: number;
}

/**
 * Search using SearXNG instance
 * Returns results in same format as Serper for compatibility
 */
export async function searchWithSearXNG(
    query: string,
    numResults: number = 3,
    engines: string = 'google',
    language: string = 'en-PK'
): Promise<SerperSearchResponse> {
    try {
        console.log(`[SearXNG] Searching: ${query}`);

        // Use POST with form data (as configured in most SearXNG instances)
        const formData = new URLSearchParams({
            q: query,
            format: 'json',
            engines: engines,
            language: language,
            pageno: '1',
        });

        const baseUrl = getSearXNGEndpoint();
        console.log(`[SearXNG] Using instance: ${baseUrl}`);

        const response = await fetch(`${baseUrl}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            // If POST fails, try GET as fallback
            console.log(`[SearXNG] POST failed (${response.status}), trying GET...`);
            return await searchWithSearXNGGet(query, numResults, engines, language);
        }

        const data: SearXNGResponse = await response.json();

        if (!data.results || data.results.length === 0) {
            return {
                success: true,
                results: [],
            };
        }

        // Convert SearXNG results to our standard format
        const results: SerperSearchResult[] = data.results
            .slice(0, numResults)
            .map((item) => ({
                title: item.title || '',
                link: item.url || '',
                snippet: item.content || '',
            }));

        console.log(`[SearXNG] Found ${results.length} results`);

        return {
            success: true,
            results,
        };
    } catch (error) {
        console.error('[SearXNG] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown SearXNG error',
        };
    }
}

/**
 * Fallback GET method for SearXNG
 */
async function searchWithSearXNGGet(
    query: string,
    numResults: number,
    engines: string,
    language: string
): Promise<SerperSearchResponse> {
    const params = new URLSearchParams({
        q: query,
        format: 'json',
        engines: engines,
        language: language,
        pageno: '1',
    });

    const baseUrl = getSearXNGEndpoint();
    const searchUrl = `${baseUrl}/search?${params.toString()}`;

    const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });

    if (!response.ok) {
        return {
            success: false,
            error: `SearXNG failed: ${response.status} ${response.statusText}. JSON format may not be enabled in SearXNG settings.yml`,
        };
    }

    const data: SearXNGResponse = await response.json();

    const results: SerperSearchResult[] = (data.results || [])
        .slice(0, numResults)
        .map((item) => ({
            title: item.title || '',
            link: item.url || '',
            snippet: item.content || '',
        }));

    console.log(`[SearXNG] GET found ${results.length} results`);

    return {
        success: true,
        results,
    };
}

/**
 * Search for news using SearXNG
 * Uses 'news' category in SearXNG
 */
export async function searchNewsWithSearXNG(
    query: string,
    numResults: number = 3
): Promise<SerperSearchResponse> {
    try {
        console.log(`[SearXNG] News search: ${query}`);

        // Use POST with form data
        const formData = new URLSearchParams({
            q: query,
            format: 'json',
            categories: 'news',
            language: 'en-PK',
            pageno: '1',
        });

        const baseUrl = getSearXNGEndpoint();

        const response = await fetch(`${baseUrl}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            // Fallback to GET
            console.log(`[SearXNG] News POST failed (${response.status}), trying GET...`);
            const params = new URLSearchParams({
                q: query,
                format: 'json',
                categories: 'news',
                language: 'en-PK',
                pageno: '1',
            });

            const getResponse = await fetch(`${baseUrl}/search?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });

            if (!getResponse.ok) {
                return {
                    success: false,
                    error: `SearXNG news failed: ${getResponse.status} ${getResponse.statusText}. Enable JSON format in settings.yml`,
                };
            }

            const getData: SearXNGResponse = await getResponse.json();
            const getResults: SerperSearchResult[] = (getData.results || [])
                .slice(0, numResults)
                .map((item) => ({
                    title: item.title || '',
                    link: item.url || '',
                    snippet: item.content || '',
                }));

            return { success: true, results: getResults };
        }

        const data: SearXNGResponse = await response.json();

        const results: SerperSearchResult[] = (data.results || [])
            .slice(0, numResults)
            .map((item) => ({
                title: item.title || '',
                link: item.url || '',
                snippet: item.content || '',
            }));

        console.log(`[SearXNG] News found ${results.length} results`);

        return {
            success: true,
            results,
        };
    } catch (error) {
        console.error('[SearXNG] News error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown SearXNG error',
        };
    }
}

/**
 * Check if SearXNG is available (always true since we have public fallbacks)
 */
export function isSearXNGAvailable(): boolean {
    return true; // Always available with public fallbacks
}

/**
 * Get SearXNG instance URL
 */
export function getSearXNGUrl(): string {
    return getSearXNGEndpoint();
}
