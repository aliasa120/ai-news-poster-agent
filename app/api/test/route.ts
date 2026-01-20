/**
 * API Test Endpoint
 * 
 * Allows testing individual APIs: Serper, SearXNG, Jina Free
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchGoogle, searchNews } from '@/lib/agent/tools/serper-search';
import { searchWithSearXNG, searchNewsWithSearXNG } from '@/lib/agent/tools/searxng-search';
import { readArticleFree, readArticleWithKey } from '@/lib/agent/tools/jina-reader';

export async function POST(request: NextRequest) {
    try {
        const { api, query, url } = await request.json();

        let result: { success: boolean; data?: unknown; error?: string; time: number };
        const startTime = Date.now();

        switch (api) {
            case 'serper_search': {
                const searchResult = await searchGoogle(query || 'Pakistan news', 3);
                result = {
                    success: searchResult.success,
                    data: searchResult.results,
                    error: searchResult.error,
                    time: Date.now() - startTime,
                };
                break;
            }

            case 'serper_news': {
                const newsResult = await searchNews(query || 'Pakistan news', 3);
                result = {
                    success: newsResult.success,
                    data: newsResult.results,
                    error: newsResult.error,
                    time: Date.now() - startTime,
                };
                break;
            }

            case 'searxng_search': {
                const searxResult = await searchWithSearXNG(query || 'Pakistan news', 3);
                result = {
                    success: searxResult.success,
                    data: searxResult.results,
                    error: searxResult.error,
                    time: Date.now() - startTime,
                };
                break;
            }

            case 'searxng_news': {
                const searxNewsResult = await searchNewsWithSearXNG(query || 'Pakistan news', 3);
                result = {
                    success: searxNewsResult.success,
                    data: searxNewsResult.results,
                    error: searxNewsResult.error,
                    time: Date.now() - startTime,
                };
                break;
            }

            case 'jina_free': {
                const testUrl = url || 'https://www.dawn.com';
                const jinaResult = await readArticleFree(testUrl);
                if (jinaResult.success && jinaResult.content) {
                    result = {
                        success: true,
                        data: {
                            fullContent: jinaResult.content, // Full content, no truncation
                            totalLength: jinaResult.content.length,
                            title: jinaResult.title
                        },
                        time: Date.now() - startTime,
                    };
                } else {
                    result = {
                        success: false,
                        error: jinaResult.error || 'Unknown error',
                        time: Date.now() - startTime,
                    };
                }
                break;
            }

            case 'jina_api': {
                const testUrl = url || 'https://www.dawn.com';
                const jinaResult = await readArticleWithKey(testUrl);
                if (jinaResult.success && jinaResult.content) {
                    result = {
                        success: true,
                        data: {
                            fullContent: jinaResult.content, // Full content, no truncation
                            totalLength: jinaResult.content.length,
                            title: jinaResult.title
                        },
                        time: Date.now() - startTime,
                    };
                } else {
                    result = {
                        success: false,
                        error: jinaResult.error || 'Unknown error',
                        time: Date.now() - startTime,
                    };
                }
                break;
            }

            default:
                return NextResponse.json({ error: 'Unknown API' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('[API Test] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// GET endpoint for health check
export async function GET() {
    const envStatus = {
        SERPER_API_KEY: !!process.env.SERPER_API_KEY,
        SEARXNG_URL: process.env.SEARXNG_URL || 'Not set',
        JINA_API_KEY: !!process.env.JINA_API_KEY,
    };

    return NextResponse.json({
        status: 'ok',
        env: envStatus,
    });
}
