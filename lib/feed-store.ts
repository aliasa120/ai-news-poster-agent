import { supabase } from './supabase';
import { NewsItem, FeederSettings, FetchLog } from './types';

/**
 * Normalize a title for content-based deduplication
 * Removes source names, punctuation, and extra whitespace
 */
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[-–—]/g, ' ')  // Replace dashes with spaces
        .replace(/\s*[|:]\s*.+$/, '')  // Remove " | Source" or ": Source" at end
        .replace(/\s*-\s*[^-]+$/, '')  // Remove " - Source" at end
        .replace(/[^\w\s]/g, '')  // Remove punctuation
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim()
        .substring(0, 100);  // Take first 100 chars for comparison
}

/**
 * Get all processed hashes (persists even after article deletion)
 */
export async function getProcessedHashes(): Promise<{ hashes: Set<string>; titles: Set<string> }> {
    const { data, error } = await supabase
        .from('processed_hashes')
        .select('hash, title_normalized');

    if (error) {
        console.error('[Feeder] Error fetching processed hashes:', error);
        return { hashes: new Set(), titles: new Set() };
    }

    const hashes = new Set(data?.map((item) => item.hash).filter(Boolean) || []);
    const titles = new Set(data?.map((item) => item.title_normalized).filter(Boolean) || []);

    return { hashes, titles };
}

/**
 * Save a SEEN hash (called immediately when article is fetched)
 * This persists even after article is deleted by retention limit
 * Prevents same article from reappearing after retention cleanup
 */
export async function saveSeenHash(hash: string, title: string): Promise<void> {
    const titleNormalized = normalizeTitle(title);

    const { error } = await supabase
        .from('processed_hashes')
        .upsert({
            hash,
            title,
            title_normalized: titleNormalized,
            processed_at: new Date().toISOString(),  // Use processed_at for compatibility
        }, {
            onConflict: 'hash',
            ignoreDuplicates: true,
        });

    if (error) {
        console.error('[Feeder] Error saving seen hash:', error);
    }
}

/**
 * Save multiple seen hashes in batch (more efficient)
 */
export async function saveSeenHashes(items: { hash: string; title: string }[]): Promise<void> {
    if (items.length === 0) return;

    const records = items.map(item => ({
        hash: item.hash,
        title: item.title,
        title_normalized: normalizeTitle(item.title),
        processed_at: new Date().toISOString(),  // Use processed_at for compatibility
    }));

    const { error } = await supabase
        .from('processed_hashes')
        .upsert(records, {
            onConflict: 'hash',
            ignoreDuplicates: true,
        });

    if (error) {
        console.error('[Feeder] Error saving seen hashes:', error);
    } else {
        console.log(`[Feeder] Saved ${items.length} seen hashes for future deduplication`);
    }
}

/**
 * Save a processed hash (called when article is marked as posted)
 */
export async function saveProcessedHash(hash: string, title: string): Promise<void> {
    const titleNormalized = normalizeTitle(title);

    const { error } = await supabase
        .from('processed_hashes')
        .upsert({
            hash,
            title,
            title_normalized: titleNormalized,
            processed_at: new Date().toISOString(),
        }, {
            onConflict: 'hash',
            ignoreDuplicates: true,
        });

    if (error) {
        console.error('[Feeder] Error saving processed hash:', error);
    }
}

/**
 * Check if an article is a duplicate (by hash or similar title)
 * Layer 1: Exact hash match
 * Layer 2: Fuzzy title matching (catches same story from different sources)
 */
export function isDuplicateArticle(
    item: NewsItem,
    processedHashes: Set<string>,
    processedTitles: Set<string>,
    existingHashes: Set<string>,
    existingTitlesArray?: string[]  // New: array of titles for fuzzy matching
): boolean {
    // Layer 1: Check exact hash match
    if (item.hash && (processedHashes.has(item.hash) || existingHashes.has(item.hash))) {
        return true;
    }

    // Layer 2A: Check exact normalized title match
    const normalizedTitle = normalizeTitle(item.title);
    if (processedTitles.has(normalizedTitle)) {
        console.log(`[Feeder] Skipping duplicate by exact title: "${item.title.substring(0, 50)}..."`);
        return true;
    }

    // Layer 2B: Fuzzy title matching (uses synonyms and Jaccard similarity)
    if (existingTitlesArray && existingTitlesArray.length > 0) {
        // Import dynamically to avoid circular dependency
        const { findSimilarTitle } = require('./deduplication');
        const similarTitle = findSimilarTitle(item.title, existingTitlesArray, 0.6);
        if (similarTitle) {
            console.log(`[Feeder] Skipping duplicate by fuzzy match: "${item.title.substring(0, 50)}..."`);
            return true;
        }
    }

    return false;
}

/**
 * Get all existing news hashes for deduplication
 */
export async function getExistingHashes(): Promise<Set<string>> {
    const { data, error } = await supabase
        .from('news_items')
        .select('hash');

    if (error) {
        console.error('Error fetching hashes:', error);
        return new Set();
    }

    return new Set(data?.map((item) => item.hash) || []);
}

/**
 * Get all existing news titles for fuzzy deduplication
 * Returns an array (not Set) because we need to iterate for similarity check
 */
export async function getExistingTitles(): Promise<string[]> {
    const { data, error } = await supabase
        .from('news_items')
        .select('title');

    if (error) {
        console.error('Error fetching titles:', error);
        return [];
    }

    return data?.map((item) => item.title).filter(Boolean) || [];
}

/**
 * Insert new news items into database (uses upsert to handle duplicates)
 */
export async function insertNewsItems(items: NewsItem[]): Promise<number> {
    if (items.length === 0) return 0;

    // Mark all items as new and set fetched_at
    const itemsWithMeta = items.map((item) => ({
        ...item,
        is_new: true,
        fetched_at: new Date().toISOString(),
    }));

    // Use upsert with onConflict to skip duplicates
    const { data, error } = await supabase
        .from('news_items')
        .upsert(itemsWithMeta, {
            onConflict: 'hash',
            ignoreDuplicates: true,
        })
        .select();

    if (error) {
        console.error('Error inserting news items:', error);
        return 0;
    }

    return data?.length || 0;
}

/**
 * Mark old items as not new (items older than 30 minutes)
 */
export async function markOldItemsAsNotNew(): Promise<void> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { error } = await supabase
        .from('news_items')
        .update({ is_new: false })
        .lt('fetched_at', thirtyMinutesAgo)
        .eq('is_new', true);

    if (error) {
        console.error('Error marking old items:', error);
    }
}

/**
 * Get all news items, ordered by pub_date (newest first)
 */
export async function getNewsItems(limit = 50): Promise<NewsItem[]> {
    // First mark old items as not new
    await markOldItemsAsNotNew();

    const { data, error } = await supabase
        .from('news_items')
        .select('*')
        .order('fetched_at', { ascending: false })
        .order('pub_date', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching news items:', error);
        return [];
    }

    return data || [];
}

/**
 * Get unposted news items
 */
export async function getUnpostedItems(limit = 20): Promise<NewsItem[]> {
    const { data, error } = await supabase
        .from('news_items')
        .select('*')
        .eq('is_posted', false)
        .order('pub_date', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching unposted items:', error);
        return [];
    }

    return data || [];
}

/**
 * Mark item as posted to a platform
 */
export async function markAsPosted(
    itemId: string,
    platform: 'x' | 'instagram' | 'facebook'
): Promise<void> {
    const { data: item } = await supabase
        .from('news_items')
        .select('posted_platforms')
        .eq('id', itemId)
        .single();

    const platforms = item?.posted_platforms || [];
    if (!platforms.includes(platform)) {
        platforms.push(platform);
    }

    const { error } = await supabase
        .from('news_items')
        .update({
            posted_platforms: platforms,
            is_posted: platforms.length === 3,
            updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

    if (error) {
        console.error('Error marking as posted:', error);
        throw error;
    }
}

/**
 * Get feeder settings
 */
export async function getFeederSettings(): Promise<FeederSettings | null> {
    const { data, error } = await supabase
        .from('feeder_settings')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching settings:', error);
        return null;
    }

    return data;
}

/**
 * Update feeder settings
 */
export async function updateFeederSettings(
    settings: Partial<FeederSettings>
): Promise<FeederSettings | null> {
    const existing = await getFeederSettings();

    if (!existing?.id) {
        console.error('No settings found to update');
        return null;
    }

    const { data, error } = await supabase
        .from('feeder_settings')
        .update({
            ...settings,
            updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

    if (error) {
        console.error('Error updating settings:', error);
        return null;
    }

    return data;
}

/**
 * Get total count of news items
 */
export async function getNewsCount(): Promise<number> {
    const { count, error } = await supabase
        .from('news_items')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting news items:', error);
        return 0;
    }

    return count || 0;
}

/**
 * Delete all news items from database
 */
export async function deleteAllNewsItems(): Promise<void> {
    const { error } = await supabase
        .from('news_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
        console.error('Error deleting all news items:', error);
        throw error;
    }
}

/**
 * Log a fetch operation
 */
export async function logFetch(
    totalFetched: number,
    newItems: number,
    duplicatesSkipped: number
): Promise<void> {
    const { error } = await supabase.from('fetch_logs').insert({
        total_fetched: totalFetched,
        new_items: newItems,
        duplicates_skipped: duplicatesSkipped,
        source: 'google_news',
    });

    if (error) {
        console.error('Error logging fetch:', error);
    }
}

/**
 * Get recent fetch logs
 */
export async function getFetchLogs(limit = 10): Promise<FetchLog[]> {
    const { data, error } = await supabase
        .from('fetch_logs')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching logs:', error);
        return [];
    }

    return data || [];
}

/**
 * Delete all processed articles (is_posted = true)
 * Returns the count of deleted items
 */
export async function deleteProcessedItems(): Promise<number> {
    // First count how many will be deleted
    const { count } = await supabase
        .from('news_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_posted', true);

    const { error } = await supabase
        .from('news_items')
        .delete()
        .eq('is_posted', true);

    if (error) {
        console.error('Error deleting processed items:', error);
        return 0;
    }

    return count || 0;
}

/**
 * Enforce retention limit - keep only the latest X unprocessed articles
 * Uses pub_date to keep the most RECENTLY PUBLISHED articles (not fetched)
 * This ensures newer articles replace older ones, not the other way around
 */
export async function enforceRetentionLimit(maxRetention: number): Promise<number> {
    // Get IDs of articles to keep (latest X unprocessed by PUBLICATION date)
    const { data: keepItems } = await supabase
        .from('news_items')
        .select('id')
        .eq('is_posted', false)
        .order('pub_date', { ascending: false })  // Changed from fetched_at to pub_date
        .limit(maxRetention);

    const keepIds = keepItems?.map(item => item.id) || [];

    if (keepIds.length === 0) return 0;

    // Count items that will be deleted
    const { count: totalUnprocessed } = await supabase
        .from('news_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_posted', false);

    const toDelete = (totalUnprocessed || 0) - keepIds.length;
    if (toDelete <= 0) return 0;

    // Delete unprocessed items NOT in the keep list (oldest by pub_date)
    const { error } = await supabase
        .from('news_items')
        .delete()
        .eq('is_posted', false)
        .not('id', 'in', `(${keepIds.join(',')})`);

    if (error) {
        console.error('Error enforcing retention limit:', error);
        return 0;
    }

    return toDelete;
}

/**
 * Get count of processed vs unprocessed items
 */
export async function getProcessedCounts(): Promise<{ processed: number; unprocessed: number }> {
    const { count: processed } = await supabase
        .from('news_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_posted', true);

    const { count: unprocessed } = await supabase
        .from('news_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_posted', false);

    return {
        processed: processed || 0,
        unprocessed: unprocessed || 0,
    };
}

