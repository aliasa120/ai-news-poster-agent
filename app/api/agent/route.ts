import { NextRequest, NextResponse } from 'next/server';
import { runAgent, cancelAgent } from '@/lib/agent';
import {
    getAgentSettings,
    updateAgentSettings,
    getRecentRuns,
    getActiveRun,
    getLatestActivity,
    getActivity,
    getUnprocessedArticles,
    getAllPendingQueueItems,
    clearPendingQueue,
} from '@/lib/agent/store';

/**
 * GET: Get agent status, recent runs, and activity
 * ?preview=true - Returns pending queue items + unprocessed articles from feeder
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const runId = searchParams.get('runId');
        const preview = searchParams.get('preview') === 'true';

        // If runId is provided, get activity for that run
        if (runId) {
            const activity = await getActivity(runId, 30);
            return NextResponse.json({
                success: true,
                activity,
            });
        }

        const [settings, runs, activeRun, activity] = await Promise.all([
            getAgentSettings(),
            getRecentRuns(10),
            getActiveRun(),
            getLatestActivity(20),
        ]);

        // If preview is requested, get pending queue items + unprocessed articles
        let upcomingArticles: { id?: string; title: string; source_name: string | null; pub_date: string | null }[] = [];
        let pendingQueueItems: { id?: string; title: string; source_name: string | null; status: string }[] = [];

        if (preview && settings) {
            // Get pending items in queue (SQS-style)
            const queueItems = await getAllPendingQueueItems();
            pendingQueueItems = queueItems.map(item => ({
                id: item.id,
                title: item.news_items?.title || 'Unknown',
                source_name: item.news_items?.source_name || null,
                status: item.status,
            }));

            // Also get unprocessed articles from feeder (for preview before enqueue)
            if (pendingQueueItems.length === 0) {
                upcomingArticles = await getUnprocessedArticles(settings);
            }
        }

        return NextResponse.json({
            success: true,
            settings,
            runs,
            activeRun,
            isRunning: !!activeRun,
            activity,
            pendingQueueItems: preview ? pendingQueueItems : undefined,
            upcomingArticles: preview ? upcomingArticles : undefined,
        });
    } catch (error) {
        console.error('Agent status error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * POST: Start agent or update settings
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { action, settings: newSettings } = body;

        if (action === 'start') {
            // Start the agent (runs in background)
            runAgent().catch(console.error); // Don't await - run in background
            return NextResponse.json({
                success: true,
                message: 'Agent starting...',
            });
        }

        if (action === 'cancel') {
            await cancelAgent();
            return NextResponse.json({
                success: true,
                message: 'Agent cancellation requested',
            });
        }

        if (action === 'clear_queue') {
            const clearedCount = await clearPendingQueue();
            return NextResponse.json({
                success: true,
                message: `Cleared ${clearedCount} pending queue items`,
                clearedCount,
            });
        }

        if (action === 'update_settings' && newSettings) {
            const updated = await updateAgentSettings(newSettings);
            return NextResponse.json({
                success: true,
                settings: updated,
            });
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Invalid action',
            },
            { status: 400 }
        );
    } catch (error) {
        console.error('Agent action error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
