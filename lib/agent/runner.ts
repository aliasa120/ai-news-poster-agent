/**
 * Agent Runner - Main Orchestration
 * 
 * Handles the complete agent run lifecycle: initialization, queue processing, and completion.
 */

import { NewsItem } from '../types';
import { AgentRun, AgentError, AgentQueueItem } from './types';
import { setScrapingProvider, setSearchProvider, type ScrapingProvider, type SearchProvider } from './tools/langchain-tools';
import { seedGuidelines } from './tools/pinecone-rag';
import { createNewsAgent } from './agent-factory';
import { processArticle, ProcessResult } from './processor';
import {
    getAgentSettings,
    getUnprocessedArticles,
    createAgentRun,
    updateAgentRun,
    completeAgentRun,
    enqueueArticles,
    getPendingQueueItems,
    updateQueueItem,
    getActiveRun,
    logActivity,
    shouldCancel,
    requestCancellation,
} from './store';
import {
    createNewAbortController,
    setRunId,
    getRunId,
    isAborted,
    cleanup,
    delay,
    abort,
} from './state';

// ============= CONSTANTS =============

const DELAY_BETWEEN_ARTICLES = 1500;

// ============= TIER TRACKING =============

interface TierCounts {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
}

// ============= MAIN RUNNER =============

/**
 * Run the agent - main entry point
 */
export async function runAgent(): Promise<AgentRun | null> {
    // Check if already running
    const activeRun = await getActiveRun();
    if (activeRun) {
        console.log('[Agent] Already running:', activeRun.id);
        return activeRun;
    }

    // Get settings
    const settings = await getAgentSettings();
    if (!settings) {
        console.error('[Agent] No settings');
        return null;
    }

    // Initialize state
    createNewAbortController();

    // Create run record
    const run = await createAgentRun();
    if (!run?.id) {
        console.error('[Agent] Failed to create run');
        return null;
    }

    setRunId(run.id);
    console.log(`[Agent] Started run ${run.id}`);

    // Apply provider settings
    applyProviderSettings(settings);

    // Seed guidelines
    await seedGuidelinesQuietly();

    await logActivity(run.id, 'info', `🚀 Started with model: ${settings.model}`);

    // Fetch articles
    const articles = await getUnprocessedArticles(settings);
    const total = articles.length;

    console.log(`[Agent] Found ${total} articles`);
    await logActivity(run.id, 'info', `📰 Found ${total} articles to process`);

    if (total === 0) {
        await logActivity(run.id, 'info', '✅ No new articles to process');
        await completeAgentRun(run.id, 0, 0, 0, []);
        cleanup();
        return run;
    }

    // Enqueue articles
    await logActivity(run.id, 'info', `📥 Enqueueing ${total} articles...`);
    const enqueuedCount = await enqueueArticles(run.id, articles);
    console.log(`[Agent] Enqueued ${enqueuedCount} articles`);
    await logActivity(run.id, 'info', `✅ ${enqueuedCount} articles added to queue`);

    // Process queue
    const stats = await processQueue(run.id, settings.model, articles.length);

    // Complete run
    await finalizeRun(run.id, stats);

    return run;
}

// ============= PROVIDER SETTINGS =============

function applyProviderSettings(settings: { scraping_provider?: string; search_provider?: string }): void {
    if (settings.scraping_provider) {
        setScrapingProvider(settings.scraping_provider as ScrapingProvider);
        console.log(`[Agent] Scraping provider: ${settings.scraping_provider}`);
    }

    if (settings.search_provider) {
        setSearchProvider(settings.search_provider as SearchProvider);
        console.log(`[Agent] Search provider: ${settings.search_provider}`);
    }
}

async function seedGuidelinesQuietly(): Promise<void> {
    try {
        await seedGuidelines();
    } catch (e) {
        console.log('[Agent] Guidelines seed skipped:', e);
    }
}

// ============= QUEUE PROCESSING =============

interface ProcessStats {
    processed: number;
    skipped: number;
    generated: number;
    errors: AgentError[];
    tierCounts: TierCounts;
}

async function processQueue(runId: string, modelId: string, totalArticles: number): Promise<ProcessStats> {
    const agent = createNewsAgent(modelId);
    const stats: ProcessStats = {
        processed: 0,
        skipped: 0,
        generated: 0,
        errors: [],
        tierCounts: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 },
    };

    const queueItems = await getPendingQueueItems(runId);

    for (let i = 0; i < queueItems.length; i++) {
        const queueItem = queueItems[i];
        const article = queueItem.news_items as NewsItem;

        if (!article) {
            console.log(`[Agent] Skipping queue item ${queueItem.id} - no article data`);
            continue;
        }

        // Check for cancellation
        if (isAborted() || await shouldCancel(runId)) {
            console.log('[Agent] Cancelled');
            await logActivity(runId, 'info', '🛑 Stopped by user');
            break;
        }

        try {
            await processQueueItem(queueItem, article, runId, agent, i, queueItems.length, stats);

            // Update run progress
            await updateAgentRun(runId, {
                articles_processed: stats.processed,
                articles_skipped: stats.skipped,
                posts_generated: stats.generated,
            });

            // Delay between articles
            if (i < queueItems.length - 1 && !isAborted()) {
                await delay(DELAY_BETWEEN_ARTICLES);
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') break;
            handleProcessingError(error, article, runId, stats);
        }
    }

    return stats;
}

async function processQueueItem(
    queueItem: AgentQueueItem,
    article: NewsItem,
    runId: string,
    agent: ReturnType<typeof createNewsAgent>,
    index: number,
    total: number,
    stats: ProcessStats
): Promise<void> {
    // Mark as processing
    await updateQueueItem(queueItem.id!, { status: 'processing' });

    // Log progress
    await logActivity(runId, 'step', `📋 Processing ${index + 1}/${total}`, article.title);

    // Process article
    const result = await processArticle(article, queueItem, runId, agent);

    // Track tier
    stats.tierCounts[`tier${result.tierUsed}` as keyof TierCounts]++;

    // Log result
    if (result.skipped) {
        stats.skipped++;
        await logActivity(runId, 'decision', `⏭️ Skipped (Tier ${result.tierUsed}): ${result.reasoning || 'No reason'}`, article.title);
        console.log(`[Agent] Skipped: ${article.title.slice(0, 30)}... (Tier ${result.tierUsed})`);
    } else if (result.generated) {
        stats.generated++;
        await logActivity(runId, 'success', `✅ Generated (Tier ${result.tierUsed}, ${result.toolCalls} tools)`, article.title);
        console.log(`[Agent] Generated: ${article.title.slice(0, 30)}... (Tier ${result.tierUsed}, ${result.toolCalls} tools)`);
    }

    stats.processed++;
}

function handleProcessingError(error: unknown, article: NewsItem, runId: string, stats: ProcessStats): void {
    const errorMsg = error instanceof Error ? error.message.slice(0, 100) : 'Unknown';
    console.error(`[Agent] Error:`, errorMsg);
    logActivity(runId, 'error', `❌ ${errorMsg}`, article.title);
    stats.errors.push({
        article_id: article.id || 'unknown',
        error: errorMsg,
        timestamp: new Date().toISOString(),
    });
}

// ============= FINALIZATION =============

async function finalizeRun(runId: string, stats: ProcessStats): Promise<void> {
    const wasAborted = isAborted();
    await completeAgentRun(runId, stats.processed, stats.skipped, stats.generated, stats.errors);

    const tierStats = `T1:${stats.tierCounts.tier1} T2:${stats.tierCounts.tier2} T3:${stats.tierCounts.tier3} T4:${stats.tierCounts.tier4}`;
    const finalMsg = wasAborted
        ? `🛑 Stopped: ${stats.processed} processed, ${stats.generated} generated [${tierStats}]`
        : `🎉 Done: ${stats.processed} processed, ${stats.generated} generated [${tierStats}]`;

    await logActivity(runId, 'info', finalMsg);
    console.log(`[Agent] ${finalMsg}`);
    cleanup();
}

// ============= CANCEL =============

/**
 * Cancel the currently running agent
 */
export async function cancelAgent(): Promise<void> {
    console.log('[Agent] Cancel requested');

    abort();

    const runId = getRunId();
    if (runId) {
        await requestCancellation(runId);
        await updateAgentRun(runId, {
            status: 'cancelled',
            completed_at: new Date().toISOString(),
        });
        await logActivity(runId, 'info', '🛑 Cancelled');
    }

    const activeRun = await getActiveRun();
    if (activeRun?.id) {
        await requestCancellation(activeRun.id);
        await updateAgentRun(activeRun.id, {
            status: 'cancelled',
            completed_at: new Date().toISOString(),
        });
    }
}
