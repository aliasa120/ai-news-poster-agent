import { NextRequest, NextResponse } from 'next/server';
import { parseGoogleNewsFeed } from '@/lib/rss-parser';
import { filterDuplicates } from '@/lib/deduplication';
import {
    getExistingHashes,
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
    getProcessedHashes,
    isDuplicateArticle,
} from '@/lib/feed-store';
import { FeedResponse, SettingsResponse, FetchLogsResponse } from '@/lib/types';

/**
 * GET: Fetch news items from database only (no RSS fetch)
 * Use query param ?refresh=true to fetch from RSS
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
        const freshnessHours = settings?.freshness_hours || undefined;

        // Only fetch from RSS if refresh=true
        if (shouldRefresh) {
            // 1. Delete processed articles first (cleanup)
            processedDeleted = await deleteProcessedItems();
            console.log(`[Feeder] Deleted ${processedDeleted} processed articles`);

            // 2. Parse the Google News RSS feed (with freshness filter)
            const feedItems = await parseGoogleNewsFeed(freshnessHours);
            const totalFetched = feedItems.length;

            // 3. Get existing hashes AND processed hashes for enhanced deduplication
            const existingHashes = await getExistingHashes();
            const { hashes: processedHashes, titles: processedTitles } = await getProcessedHashes();

            console.log(`[Feeder] Dedup check: ${existingHashes.size} existing, ${processedHashes.size} processed hashes, ${processedTitles.size} processed titles`);

            // 4. Filter out duplicates (including same topic from different sources)
            const uniqueItems = feedItems.filter(item =>
                !isDuplicateArticle(item, processedHashes, processedTitles, existingHashes)
            );
            duplicatesSkipped = totalFetched - uniqueItems.length;

            console.log(`[Feeder] Filtered: ${uniqueItems.length} unique, ${duplicatesSkipped} duplicates skipped`);

            // 5. Insert new items into database
            if (uniqueItems.length > 0) {
                newCount = await insertNewsItems(uniqueItems);
            }

            // 6. Enforce retention limit (keep only latest X articles)
            retentionTrimmed = await enforceRetentionLimit(maxRetention);
            if (retentionTrimmed > 0) {
                console.log(`[Feeder] Trimmed ${retentionTrimmed} old articles (retention: ${maxRetention})`);
            }

            // 7. Log the fetch operation
            await logFetch(totalFetched, newCount, duplicatesSkipped);

            // 8. Update last fetch time
            await updateFeederSettings({ last_fetch: new Date().toISOString() });
        }

        // 9. Get all items from database
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
export async function DELETE(): Promise<NextResponse<{ success: boolean; error?: string }>> {
    try {
        await deleteAllNewsItems();
        return NextResponse.json({ success: true });
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
