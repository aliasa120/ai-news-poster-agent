import { SerperSearchResponse, SerperSearchResult } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

/**
 * Search Google using Serper API for additional context
 */
export async function searchGoogle(query: string, numResults: number = 3): Promise<SerperSearchResponse> {
    if (!SERPER_API_KEY) {
        return {
            success: false,
            error: 'Serper API key not configured',
        };
    }

    try {
        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: query,
                num: numResults,
                gl: 'pk', // Pakistan
                hl: 'en', // English
            }),
        });

        if (!response.ok) {
            return {
                success: false,
                error: `Serper API failed: ${response.status} ${response.statusText}`,
            };
        }

        const data = await response.json();

        const results: SerperSearchResult[] = (data.organic || [])
            .map((item: { title?: string; link?: string; snippet?: string }) => ({
                title: item.title || '',
                link: item.link || '',
                snippet: item.snippet || '',
            }))
            .slice(0, numResults);

        // Log search activity with metadata
        const { getRunId } = require('../state');
        const { logActivity } = require('../store');
        const runId = getRunId();
        if (runId) {
            await logActivity(runId, 'searching', `🔍 Searched: ${query}`, undefined, 'Serper', {
                query,
                results: results.slice(0, 3), // Log top 3 results
                total_results: results.length
            });
        }

        return {
            success: true,
            results,
        };
    } catch (error) {
        console.error('Serper search error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Search for news specifically
 */
export async function searchNews(query: string, numResults: number = 3): Promise<SerperSearchResponse> {
    if (!SERPER_API_KEY) {
        return {
            success: false,
            error: 'Serper API key not configured',
        };
    }

    try {
        const response = await fetch('https://google.serper.dev/news', {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: query,
                num: numResults,
                gl: 'pk',
                hl: 'en',
            }),
        });

        if (!response.ok) {
            return {
                success: false,
                error: `Serper News API failed: ${response.status} ${response.statusText}`,
            };
        }

        const data = await response.json();

        const results: SerperSearchResult[] = (data.news || [])
            .map((item: { title?: string; link?: string; snippet?: string }) => ({
                title: item.title || '',
                link: item.link || '',
                snippet: item.snippet || '',
            }))
            .slice(0, numResults); // Enforce limit explicitly

        // Log search activity with metadata
        const { getRunId } = require('../state');
        const { logActivity } = require('../store');
        const runId = getRunId();
        if (runId) {
            await logActivity(runId, 'searching', `📰 News Search: ${query}`, undefined, 'Serper News', {
                query,
                results: results.slice(0, 3), // Log top 3 results
                total_results: results.length
            });
        }

        return {
            success: true,
            results,
        };
    } catch (error) {
        console.error('Serper news search error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
