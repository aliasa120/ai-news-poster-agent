import { supabase } from '../supabase';
import { NewsItem } from '../types';
import { AgentSettings, AgentRun, AgentQueueItem, AgentError } from './types';

/**
 * Get agent settings
 */
export async function getAgentSettings(): Promise<AgentSettings | null> {
    const { data, error } = await supabase
        .from('agent_settings')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching agent settings:', error);
        return null;
    }

    return data;
}

/**
 * Update agent settings
 */
export async function updateAgentSettings(settings: Partial<AgentSettings>): Promise<AgentSettings | null> {
    const existing = await getAgentSettings();

    if (!existing?.id) {
        console.error('No agent settings found');
        return null;
    }

    const { data, error } = await supabase
        .from('agent_settings')
        .update({
            ...settings,
            updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

    if (error) {
        console.error('Error updating agent settings:', error);
        return null;
    }

    return data;
}

/**
 * Get unprocessed articles based on settings
 */
export async function getUnprocessedArticles(settings: AgentSettings): Promise<NewsItem[]> {
    const { data, error } = await supabase
        .from('news_items')
        .select('*')
        .eq('is_posted', false)
        .order(settings.order_by, { ascending: settings.order_direction === 'asc' })
        .limit(settings.batch_size);

    if (error) {
        console.error('Error fetching unprocessed articles:', error);
        return [];
    }

    return data || [];
}

/**
 * Create a new agent run
 */
export async function createAgentRun(): Promise<AgentRun | null> {
    const { data, error } = await supabase
        .from('agent_runs')
        .insert({
            started_at: new Date().toISOString(),
            status: 'running',
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating agent run:', error);
        return null;
    }

    return data;
}

/**
 * Update agent run
 */
export async function updateAgentRun(
    runId: string,
    updates: Partial<AgentRun>
): Promise<void> {
    const { error } = await supabase
        .from('agent_runs')
        .update(updates)
        .eq('id', runId);

    if (error) {
        console.error('Error updating agent run:', error);
    }
}

/**
 * Complete agent run
 */
export async function completeAgentRun(
    runId: string,
    processed: number,
    skipped: number,
    generated: number,
    errors: AgentError[]
): Promise<void> {
    const { error } = await supabase
        .from('agent_runs')
        .update({
            completed_at: new Date().toISOString(),
            articles_processed: processed,
            articles_skipped: skipped,
            posts_generated: generated,
            errors,
            status: errors.length > 0 && processed === 0 ? 'failed' : 'completed',
        })
        .eq('id', runId);

    if (error) {
        console.error('Error completing agent run:', error);
    }
}

/**
 * Bulk enqueue articles into agent_queue with status="pending"
 * This is step 1 of the new SQS-style flow
 */
export async function enqueueArticles(
    runId: string,
    articles: NewsItem[]
): Promise<number> {
    if (articles.length === 0) return 0;

    const queueItems = articles.map((article) => ({
        run_id: runId,
        news_item_id: article.id,
        status: 'pending',
    }));

    const { data, error } = await supabase
        .from('agent_queue')
        .insert(queueItems)
        .select();

    if (error) {
        console.error('[Store] Error bulk enqueuing articles:', error);
        return 0;
    }

    console.log(`[Store] Enqueued ${data?.length || 0} articles for run ${runId}`);
    return data?.length || 0;
}

/**
 * Get pending queue items for a run (for processing one-by-one)
 */
export async function getPendingQueueItems(runId: string): Promise<(AgentQueueItem & { news_items: NewsItem })[]> {
    const { data, error } = await supabase
        .from('agent_queue')
        .select(`
            *,
            news_items (*)
        `)
        .eq('run_id', runId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[Store] Error fetching pending queue items:', error);
        return [];
    }

    return data || [];
}

/**
 * Get all pending queue items (for preview - shows what's waiting to be processed)
 */
export async function getAllPendingQueueItems(): Promise<(AgentQueueItem & { news_items: NewsItem })[]> {
    const { data, error } = await supabase
        .from('agent_queue')
        .select(`
            *,
            news_items (*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);

    if (error) {
        console.error('[Store] Error fetching all pending queue items:', error);
        return [];
    }

    return data || [];
}

/**
 * Clear all pending queue items (for cleanup after cancelled runs)
 */
export async function clearPendingQueue(): Promise<number> {
    const { data, error } = await supabase
        .from('agent_queue')
        .delete()
        .eq('status', 'pending')
        .select('id');

    if (error) {
        console.error('[Store] Error clearing pending queue:', error);
        return 0;
    }

    return data?.length || 0;
}

/**
 * Add single item to agent queue (legacy, still used internally)
 */
export async function addToQueue(
    runId: string,
    newsItemId: string
): Promise<AgentQueueItem | null> {
    const { data, error } = await supabase
        .from('agent_queue')
        .insert({
            run_id: runId,
            news_item_id: newsItemId,
            status: 'pending',
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding to queue:', error);
        return null;
    }

    return data;
}

/**
 * Update queue item
 */
export async function updateQueueItem(
    queueId: string,
    updates: Partial<AgentQueueItem>
): Promise<void> {
    const { error } = await supabase
        .from('agent_queue')
        .update({
            ...updates,
            processed_at: updates.status === 'completed' || updates.status === 'skipped'
                ? new Date().toISOString()
                : undefined,
        })
        .eq('id', queueId);

    if (error) {
        console.error('Error updating queue item:', error);
    }
}

/**
 * Mark news item as posted
 */
export async function markNewsItemProcessed(
    newsItemId: string,
    xPost?: string,
    instagramCaption?: string,
    facebookPost?: string
): Promise<void> {
    const platforms: string[] = [];
    if (xPost) platforms.push('x');
    if (instagramCaption) platforms.push('instagram');
    if (facebookPost) platforms.push('facebook');

    console.log(`[Store] markNewsItemProcessed: ${newsItemId}, platforms: ${platforms.join(', ')}`);

    // First get the article's hash and title for persistent storage
    const { data: article } = await supabase
        .from('news_items')
        .select('hash, title')
        .eq('id', newsItemId)
        .single();

    // Update the article as posted
    const { data, error } = await supabase
        .from('news_items')
        .update({
            is_posted: true,
            posted_platforms: platforms,
            updated_at: new Date().toISOString(),
        })
        .eq('id', newsItemId)
        .select('id, is_posted');

    if (error) {
        console.error('[Store] Error marking news item as processed:', error);
    } else {
        console.log(`[Store] Successfully marked ${newsItemId} as processed:`, data);

        // Save hash to processed_hashes table (persists even after article deletion)
        if (article?.hash && article?.title) {
            const { saveProcessedHash } = await import('../feed-store');
            await saveProcessedHash(article.hash, article.title);
            console.log(`[Store] Saved processed hash for future deduplication`);
        }
    }
}

/**
 * Get recent agent runs
 */
export async function getRecentRuns(limit: number = 10): Promise<AgentRun[]> {
    const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching agent runs:', error);
        return [];
    }

    return data || [];
}

/**
 * Get queue items for a run
 */
export async function getQueueItems(runId: string): Promise<AgentQueueItem[]> {
    const { data, error } = await supabase
        .from('agent_queue')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching queue items:', error);
        return [];
    }

    return data || [];
}

/**
 * Get active run (if any)
 */
export async function getActiveRun(): Promise<AgentRun | null> {
    const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('status', 'running')
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active run:', error);
    }

    return data || null;
}

/**
 * Activity log entry type
 */
export interface ActivityLog {
    id?: string;
    run_id: string;
    // Expanded types for granular streaming
    type: 'info' | 'tool' | 'decision' | 'error' | 'success' | 'thinking' | 'step' | 'reading' | 'searching' | 'generating';
    message: string;
    article_title?: string;
    tool_name?: string;
    metadata?: Record<string, any>; // Extra data for UI
    created_at?: string;
}

/**
 * Log agent activity
 */
export async function logActivity(
    runId: string,
    type: ActivityLog['type'],
    message: string,
    articleTitle?: string,
    toolName?: string,
    metadata?: Record<string, any>
): Promise<void> {
    const { error } = await supabase
        .from('agent_activity')
        .insert({
            run_id: runId,
            type,
            message,
            article_title: articleTitle,
            tool_name: toolName,
            metadata,
        });

    if (error) {
        console.error('Error logging activity:', error);
    }
}

/**
 * Get recent activity for a run
 */
export async function getActivity(runId: string, limit: number = 50): Promise<ActivityLog[]> {
    const { data, error } = await supabase
        .from('agent_activity')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching activity:', error);
        return [];
    }

    return data || [];
}

/**
 * Request agent cancellation
 */
export async function requestCancellation(runId: string): Promise<void> {
    const { error } = await supabase
        .from('agent_runs')
        .update({ should_cancel: true })
        .eq('id', runId);

    if (error) {
        console.error('Error requesting cancellation:', error);
    }
}

/**
 * Check if agent should be cancelled
 */
export async function shouldCancel(runId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('agent_runs')
        .select('should_cancel')
        .eq('id', runId)
        .single();

    if (error) {
        console.error('Error checking cancellation:', error);
        return false;
    }

    return data?.should_cancel || false;
}

/**
 * Get latest activity across all runs
 */
export async function getLatestActivity(limit: number = 20): Promise<ActivityLog[]> {
    const { data, error } = await supabase
        .from('agent_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching latest activity:', error);
        return [];
    }

    return data || [];
}

