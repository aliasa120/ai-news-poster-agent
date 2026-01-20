/**
 * Multi-Search Orchestrator
 * 
 * Manages multiple search providers with automatic fallback.
 * Providers: Serper (Google API) or SearXNG (self-hosted)
 */

import { searchGoogle, searchNews } from './serper-search';
import { searchWithSearXNG, searchNewsWithSearXNG, isSearXNGAvailable } from './searxng-search';
import { SerperSearchResponse } from '../types';

export type SearchProvider = 'serper' | 'searxng' | 'auto';

// Current search provider setting (can be updated from settings)
let currentSearchProvider: SearchProvider = 'serper';

/**
 * Set the search provider to use
 */
export function setSearchProvider(provider: SearchProvider) {
    currentSearchProvider = provider;
    console.log(`[MultiSearch] Search provider set to: ${provider}`);
}

/**
 * Get current search provider
 */
export function getSearchProvider(): SearchProvider {
    return currentSearchProvider;
}

/**
 * Search the web using configured provider
 */
export async function multiSearch(query: string, numResults: number = 3): Promise<SerperSearchResponse> {
    const provider = currentSearchProvider === 'auto' ? selectBestProvider() : currentSearchProvider;

    console.log(`[MultiSearch] Using ${provider} for: ${query.substring(0, 50)}...`);

    switch (provider) {
        case 'searxng':
            return searchWithSearXNG(query, numResults);
        case 'serper':
        default:
            return searchGoogle(query, numResults);
    }
}

/**
 * Search for news using configured provider
 */
export async function multiSearchNews(query: string, numResults: number = 3): Promise<SerperSearchResponse> {
    const provider = currentSearchProvider === 'auto' ? selectBestProvider() : currentSearchProvider;

    console.log(`[MultiSearch] News search using ${provider}`);

    switch (provider) {
        case 'searxng':
            return searchNewsWithSearXNG(query, numResults);
        case 'serper':
        default:
            return searchNews(query, numResults);
    }
}

/**
 * Select best available provider
 */
function selectBestProvider(): 'serper' | 'searxng' {
    // Default to Serper if available, otherwise SearXNG
    if (process.env.SERPER_API_KEY) {
        return 'serper';
    }
    if (isSearXNGAvailable()) {
        return 'searxng';
    }
    return 'serper'; // Fallback
}

/**
 * Get provider status
 */
export function getSearchProviderStatus() {
    return {
        serper: {
            available: !!process.env.SERPER_API_KEY,
            name: 'Serper (Google API)',
        },
        searxng: {
            available: isSearXNGAvailable(),
            name: 'SearXNG (Self-hosted)',
            url: process.env.SEARXNG_URL || 'https://r3yhghcd.rcld.app',
        },
    };
}
