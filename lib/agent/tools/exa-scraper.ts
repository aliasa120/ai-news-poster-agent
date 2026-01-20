/**
 * Exa AI Scraper - Content extraction using Exa API
 * 
 * Uses getContents endpoint to fetch text from URLs.
 * Text only (no summary/highlights) as per user requirement.
 */

import Exa from 'exa-js';

const EXA_API_KEY = process.env.EXA_API_KEY;

interface ExaScraperResult {
    success: boolean;
    content?: string;
    title?: string;
    author?: string;
    publishedDate?: string;
    error?: string;
}

/**
 * Scrape article content using Exa AI
 * Uses getContents with text=true only (no summary/highlights)
 */
export async function scrapeWithExa(url: string, maxCharacters: number = 4000): Promise<ExaScraperResult> {
    if (!EXA_API_KEY) {
        return {
            success: false,
            error: 'EXA_API_KEY not configured',
        };
    }

    try {
        const exa = new Exa(EXA_API_KEY);

        // Use getContents with text only (no summary, no highlights)
        const response = await exa.getContents([url], {
            text: {
                maxCharacters: maxCharacters,
                includeHtmlTags: false,
            },
            // livecrawl: 'fallback' for uncached pages
            livecrawl: 'fallback',
            livecrawlTimeout: 10000,
        });

        if (!response.results || response.results.length === 0) {
            return {
                success: false,
                error: 'No content returned from Exa',
            };
        }

        const result = response.results[0];

        return {
            success: true,
            content: result.text || '',
            title: result.title || '',
            author: result.author || undefined,
            publishedDate: result.publishedDate || undefined,
        };
    } catch (error) {
        console.error('[ExaScraper] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown Exa error',
        };
    }
}

/**
 * Check if Exa API is available
 */
export function isExaAvailable(): boolean {
    return !!EXA_API_KEY;
}

export type { ExaScraperResult };
