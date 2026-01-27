import { NextRequest, NextResponse } from 'next/server';
import {
    insertNewsItems,
    getNewsItems,
    getFeederSettings,
    updateFeederSettings,
    getNewsCount,
    deleteAllNewsItems,
    logFetch,
    getFetchLogs,
    deleteProcessedItems,
    enforceRetentionLimit,
    getProcessedCounts,
} from '@/lib/feed-store';
import { parseGoogleNewsFeed } from '@/lib/rss-parser';
import {
    isGuidSeen,
    isHashSeen,
    getTitlesForVerification,
    saveGuid,
    saveHash,
    saveTitleFull
} from '@/lib/feeder/permanent-store';
import { generateNewsHash } from '@/lib/deduplication';
import { FeedResponse, SettingsResponse, FetchLogsResponse } from '@/lib/types';
import { checkFuzzyDuplicates } from '@/lib/feeder/fuzzy-matcher';
import { checkNerDuplicates } from '@/lib/feeder/ner-fingerprint';
import { checkSemanticDuplicates, saveEmbeddings, deleteAllEmbeddings } from '@/lib/feeder/vector-search';

/**
 * GET: Fetch news items from database only (no RSS fetch)
 * Use query param ?refresh=true to fetch from RSS using Deep Agent
 * Use query param ?logs=true to get fetch logs
 */
export async function GET(request: NextRequest): Promise<NextResponse<FeedResponse | FetchLogsResponse>> {
    try {
        const searchParams = request.nextUrl.searchParams;
        const shouldRefresh = searchParams.get('refresh') === 'true';
        const getLogs = searchParams.get('logs') === 'true';

        // Return fetch logs if requested
        if (getLogs) {
            const logs = await getFetchLogs(20);
            return NextResponse.json({
                success: true,
                logs,
            } as FetchLogsResponse);
        }

        let newCount = 0;
        let duplicatesSkipped = 0;
        let processedDeleted = 0;
        let retentionTrimmed = 0;

        // Get settings for retention limit and freshness
        const settings = await getFeederSettings();
        const maxRetention = settings?.max_retention || 100;

        // Only fetch from RSS if refresh=true
        if (shouldRefresh && settings) {
            // 1. Delete processed articles first (cleanup)
            processedDeleted = await deleteProcessedItems();
            console.log(`[Feeder] Deleted ${processedDeleted} processed articles`);

            // ============================================
            // APP LAYER: L1 (GUID) and L2 (Hash) Checks
            // ============================================

            // Step 0: Fetch RSS from Google News
            console.log(`[Feeder] Fetching RSS feed...`);
            const freshness = settings.freshness_hours || 6;
            const includeSecondary = (settings as any).include_secondary_sources !== false;
            const includeOfficial = (settings as any).include_official_sources !== false;

            const rawArticles = await parseGoogleNewsFeed(freshness, includeSecondary, includeOfficial);
            console.log(`[Feeder] Fetched ${rawArticles.length} articles from RSS`);

            // Step 1 (Layer 1): GUID Check
            console.log(`[Feeder] L1: Checking GUIDs...`);
            const afterGuid = [];
            for (const article of rawArticles) {
                const guid = article.link; // Use link as GUID
                const seen = await isGuidSeen(guid);
                if (!seen) {
                    afterGuid.push({ ...article, guid });
                }
            }
            console.log(`[Feeder] L1: ${afterGuid.length}/${rawArticles.length} passed GUID check`);

            // Step 2 (Layer 2): Hash Check
            console.log(`[Feeder] L2: Checking Hashes...`);
            const afterHash = [];
            for (const article of afterGuid) {
                const hash = generateNewsHash(article.title, article.source_name || 'unknown');
                const seen = await isHashSeen(hash);
                if (!seen) {
                    afterHash.push(article);
                }
            }
            console.log(`[Feeder] L2: ${afterHash.length}/${afterGuid.length} passed Hash check`);

            // ============================================
            // AGENT REPLACEMENT: L3, L4, L5 Checks
            // ============================================

            if (afterHash.length === 0) {
                console.log(`[Feeder] No new articles after L1/L2 filtering`);
            } else {
                console.log(`[Feeder] Starting Advanced Deduplication (L3-L5) with ${afterHash.length} articles...`);

                // Fetch recent titles/articles for comparison
                const dbItems = await getTitlesForVerification(500);

                // Map to ExistingTitle interface (PermanentTitle uses different field names)
                const existingItems = dbItems.map(item => ({
                    id: item.id,
                    title: item.title,
                    content_snippet: item.description,
                    source_name: item.source,
                    pub_date: item.published_at
                }));

                // --------------------------------------------
                // L3: Fuzzy Content Match (≥ 75–80%)
                // Now checks Title + Description
                // --------------------------------------------
                const l3Result = checkFuzzyDuplicates(afterHash, existingItems, 0.75);

                console.log(`[Feeder] L3: ${l3Result.unique.length}/${afterHash.length} passed Fuzzy Title check`);

                // --------------------------------------------
                // L4: NER Fingerprint (Event/Loc/Entity/Date)
                // --------------------------------------------
                // We only check self-duplicates within the batch + the unique ones from L3
                const l4Result = await checkNerDuplicates(l3Result.unique, []);

                console.log(`[Feeder] L4: ${l4Result.unique.length}/${l3Result.unique.length} passed NER Fingerprint check`);

                // --------------------------------------------
                // L5: Semantic Vector Search (≥ 88%)
                // --------------------------------------------
                const l5Result = await checkSemanticDuplicates(l4Result.unique, 0.88);

                console.log(`[Feeder] L5: ${l5Result.unique.length}/${l4Result.unique.length} passed Vector/Semantic check`);

                // --------------------------------------------
                // FINAL: Save Unique Articles
                // --------------------------------------------
                const finalArticles = l5Result.unique;
                newCount = finalArticles.length;

                if (finalArticles.length > 0) {
                    console.log(`[Feeder] Saving ${finalArticles.length} unique articles...`);

                    // 1. Save Articles to DB
                    await insertNewsItems(finalArticles);

                    // 2. Save Metadata to permanent store
                    // 2. Save Metadata to permanent store
                    const PermanentStore = await import('@/lib/feeder/permanent-store');
                    for (const article of finalArticles) {
                        // Safe casting or non-null assertion for GUID as L1 filtered items have link->guid
                        if (article.guid) await PermanentStore.saveGuid(article.guid);
                        const sourceName = article.source_name || 'unknown';
                        await PermanentStore.saveHash(article.hash, article.title, sourceName);

                        await PermanentStore.saveTitleFull({
                            title: article.title,
                            description: article.content_snippet,
                            source: sourceName,
                            published_at: article.pub_date || new Date().toISOString()
                        });

                        // Save Fingerprint if available (L4)
                        if (article.fingerprint) {
                            const parts = article.fingerprint.split('|');
                            if (parts.length === 4) {
                                await PermanentStore.saveFingerprint(
                                    article.fingerprint,
                                    parts[0], // event
                                    parts[1], // place
                                    parts[2], // entity
                                    parts[3]  // date
                                );
                            }
                        }
                    }
                }

                // SAVE EMBEDDINGS (L5)
                await saveEmbeddings(finalArticles);
            }

            // Enforce retention limit (keep only latest X articles)
            retentionTrimmed = await enforceRetentionLimit(maxRetention);
            if (retentionTrimmed > 0) {
                console.log(`[Feeder] Trimmed ${retentionTrimmed} old articles (retention: ${maxRetention})`);
            }

            // Log the fetch operation
            await logFetch(0, newCount, duplicatesSkipped);

            // Update last fetch time
            await updateFeederSettings({ last_fetch: new Date().toISOString() });
        }

        // Get all items from database
        const allItems = await getNewsItems(200);
        const totalCount = await getNewsCount();
        const counts = await getProcessedCounts();

        return NextResponse.json({
            success: true,
            items: allItems,
            newCount,
            totalCount,
            duplicatesSkipped,
            processedDeleted,
            retentionTrimmed,
            processedCount: counts.processed,
            unprocessedCount: counts.unprocessed,
        });
    } catch (error) {
        console.error('Feeder API error:', error);
        return NextResponse.json(
            {
                success: false,
                items: [],
                newCount: 0,
                totalCount: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * POST: Update feeder settings
 */
export async function POST(request: NextRequest): Promise<NextResponse<SettingsResponse>> {
    try {
        const body = await request.json();
        const { refresh_interval, is_active, max_retention, freshness_hours } = body;

        const updatedSettings = await updateFeederSettings({
            refresh_interval,
            is_active,
            max_retention,
            freshness_hours,
        });

        return NextResponse.json({
            success: true,
            settings: updatedSettings,
        });
    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json(
            {
                success: false,
                settings: null,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE: Delete all news items
 */
/**
 * DELETE: Delete all news items
 * Query param ?full=true to also clear PERMANENT Deduplication Data (L3/L4/L5)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean; error?: string; stats?: any }>> {
    try {
        const searchParams = request.nextUrl.searchParams;
        const fullWipe = searchParams.get('full') === 'true';

        // 1. Delete transient news items (Feed)
        await deleteAllNewsItems();

        let permanentStats = null;

        // 2. If requested, delete PERMANENT data (Hard Reset)
        if (fullWipe) {
            console.warn('[Feeder] Performing FULL HARD RESET (Clearing DB, L3, L4, L5)');

            // Clear Permanent Store (L3/L4)
            const PermanentStore = await import('@/lib/feeder/permanent-store');
            permanentStats = await PermanentStore.clearAllPermanentData();

            // Clear Pinecone (L5)
            await deleteAllEmbeddings();
        }

        return NextResponse.json({
            success: true,
            stats: permanentStats
        });
    } catch (error) {
        console.error('Delete all error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
