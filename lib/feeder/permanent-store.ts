/**
 * Permanent Storage for Deduplication
 * 
 * This module manages permanent storage of:
 * - GUIDs: RSS item unique identifiers (never deleted automatically)
 * - Hashes: SHA256(title + source) for exact matching
 * - Titles: Article titles with descriptions for AI verification
 * 
 * Data is ONLY deleted when user explicitly clears via settings.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export interface PermanentGuid {
    guid: string;
    created_at: Date;
}

export interface PermanentHash {
    hash: string;
    source: string | null;
    created_at: Date;
}

export interface PermanentTitle {
    id: string;
    title: string;
    description: string | null;
    source: string | null;
    published_at: string | null;
    created_at: Date;
}

// ============================================
// GUID Functions
// ============================================

/**
 * Check if a GUID has been seen before
 */
export async function hasSeenGuid(guid: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('permanent_guids')
        .select('guid')
        .eq('guid', guid)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('[PermanentStore] Error checking GUID:', error);
    }

    return !!data;
}

// Alias for hasSeenGuid
export const isGuidSeen = hasSeenGuid;

/**
 * Save a GUID to permanent storage
 */
export async function saveGuid(guid: string, source?: string): Promise<void> {
    const { error } = await supabase
        .from('permanent_guids')
        .upsert({ guid, source: source || null, created_at: new Date().toISOString() }, { onConflict: 'guid' });

    if (error) {
        console.error('[PermanentStore] Error saving GUID:', error);
    }
}

/**
 * Save multiple GUIDs at once
 */
export async function saveGuids(guids: string[]): Promise<void> {
    if (guids.length === 0) return;

    const records = guids.map(guid => ({
        guid,
        created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from('permanent_guids')
        .upsert(records, { onConflict: 'guid' });

    if (error) {
        console.error('[PermanentStore] Error saving GUIDs:', error);
    }
}

/**
 * Get count of stored GUIDs
 */
export async function getGuidCount(): Promise<number> {
    const { count, error } = await supabase
        .from('permanent_guids')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('[PermanentStore] Error counting GUIDs:', error);
        return 0;
    }

    return count || 0;
}

// ============================================
// Hash Functions
// ============================================

/**
 * Check if a hash has been seen before
 */
export async function hasSeenHash(hash: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('permanent_hashes')
        .select('hash')
        .eq('hash', hash)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('[PermanentStore] Error checking hash:', error);
    }

    return !!data;
}

// Alias for hasSeenHash
export const isHashSeen = hasSeenHash;

/**
 * Save a hash to permanent storage
 */
export async function saveHash(hash: string, title: string, source: string): Promise<void> {
    const { error } = await supabase
        .from('permanent_hashes')
        .upsert({ hash, title, source, created_at: new Date().toISOString() }, { onConflict: 'hash' });

    if (error) {
        console.error('[PermanentStore] Error saving hash:', error);
    }
}

// ============================================
// Fingerprint Functions (L4: NER)
// ============================================

/**
 * Check if a fingerprint has been seen before
 */
export async function hasSeenFingerprint(fingerprint: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('permanent_fingerprints')
        .select('fingerprint')
        .eq('fingerprint', fingerprint)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('[PermanentStore] Error checking fingerprint:', error);
        return false;
    }

    return !!data;
}

/**
 * Save a fingerprint to permanent storage
 */
export async function saveFingerprint(fingerprint: string, event: string, place: string, entity: string, date: string): Promise<void> {
    const { error } = await supabase
        .from('permanent_fingerprints')
        .upsert({
            fingerprint,
            event,
            place,
            entity,
            date,
            created_at: new Date().toISOString()
        }, { onConflict: 'fingerprint' });

    if (error) {
        console.error('[PermanentStore] Error saving fingerprint:', error);
    }
}

/**
 * Save multiple hashes at once
 */
export async function saveHashes(hashes: { hash: string; source: string | null }[]): Promise<void> {
    if (hashes.length === 0) return;

    const records = hashes.map(h => ({
        hash: h.hash,
        source: h.source,
        created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from('permanent_hashes')
        .upsert(records, { onConflict: 'hash' });

    if (error) {
        console.error('[PermanentStore] Error saving hashes:', error);
    }
}

/**
 * Get all hashes as a Set for efficient lookup
 */
export async function getAllHashes(): Promise<Set<string>> {
    const { data, error } = await supabase
        .from('permanent_hashes')
        .select('hash');

    if (error) {
        console.error('[PermanentStore] Error fetching hashes:', error);
        return new Set();
    }

    return new Set(data?.map(d => d.hash) || []);
}

/**
 * Get count of stored hashes
 */
export async function getHashCount(): Promise<number> {
    const { count, error } = await supabase
        .from('permanent_hashes')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('[PermanentStore] Error counting hashes:', error);
        return 0;
    }

    return count || 0;
}

// ============================================
// Title Functions
// ============================================

/**
 * Get titles for AI verification, ordered by most recent first
 * @param limit Maximum number of titles to return (default 500)
 */
export async function getTitlesForVerification(limit: number = 500): Promise<PermanentTitle[]> {
    const { data, error } = await supabase
        .from('permanent_titles')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

    if (error) {
        console.error('[PermanentStore] Error fetching titles:', error);
        return [];
    }

    return data || [];
}

/**
 * Get total count of titles for subagent calculation
 * Used to determine how many subagents to spawn (ceiling of count / 50)
 */
export async function getTitleCountForVerification(): Promise<number> {
    const { count, error } = await supabase
        .from('permanent_titles')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('[PermanentStore] Error counting titles for verification:', error);
        return 0;
    }

    return count || 0;
}

/**
 * Get a batch of titles for subagent verification
 * @param offset - Starting position (0-indexed)
 * @param limit - Number of titles to fetch (default 50)
 * @returns Titles in newest-first order
 */
export async function getTitlesBatch(offset: number, limit: number = 50): Promise<PermanentTitle[]> {
    const { data, error } = await supabase
        .from('permanent_titles')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error(`[PermanentStore] Error fetching titles batch (offset=${offset}, limit=${limit}):`, error);
        return [];
    }

    return data || [];
}

/**
 * Save a title to permanent storage
 */
export async function saveTitle(title: string, description?: string | null, source?: string | null): Promise<void> {
    const { error } = await supabase
        .from('permanent_titles')
        .insert({
            title: title,
            description: description || null,
            source: source || null,
            published_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        });

    if (error) {
        console.error('[PermanentStore] Error saving title:', error);
    }
}

/**
 * Save a title with full details
 */
export async function saveTitleFull(titleData: Omit<PermanentTitle, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
        .from('permanent_titles')
        .insert({
            title: titleData.title,
            description: titleData.description,
            source: titleData.source,
            published_at: titleData.published_at,
            created_at: new Date().toISOString(),
        });

    if (error) {
        console.error('[PermanentStore] Error saving title:', error);
    }
}

/**
 * Save multiple titles at once
 */
export async function saveTitles(titles: Omit<PermanentTitle, 'id' | 'created_at'>[]): Promise<void> {
    if (titles.length === 0) return;

    const records = titles.map(t => ({
        title: t.title,
        description: t.description,
        source: t.source,
        published_at: t.published_at,
        created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from('permanent_titles')
        .insert(records);

    if (error) {
        console.error('[PermanentStore] Error saving titles:', error);
    }
}

/**
 * Get count of stored titles
 */
export async function getTitleCount(): Promise<number> {
    const { count, error } = await supabase
        .from('permanent_titles')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('[PermanentStore] Error counting titles:', error);
        return 0;
    }

    return count || 0;
}

// ============================================
// Clear Functions (Danger Zone)
// ============================================

/**
 * Clear all permanent GUIDs
 */
export async function clearAllGuids(): Promise<{ success: boolean; deleted: number }> {
    const count = await getGuidCount();
    const { error } = await supabase
        .from('permanent_guids')
        .delete()
        .neq('guid', ''); // Delete all

    if (error) {
        console.error('[PermanentStore] Error clearing GUIDs:', error);
        return { success: false, deleted: 0 };
    }

    console.log(`[PermanentStore] Cleared ${count} GUIDs`);
    return { success: true, deleted: count };
}

/**
 * Clear all permanent hashes
 */
export async function clearAllHashes(): Promise<{ success: boolean; deleted: number }> {
    const count = await getHashCount();
    const { error } = await supabase
        .from('permanent_hashes')
        .delete()
        .neq('hash', ''); // Delete all

    if (error) {
        console.error('[PermanentStore] Error clearing hashes:', error);
        return { success: false, deleted: 0 };
    }

    console.log(`[PermanentStore] Cleared ${count} hashes`);
    return { success: true, deleted: count };
}

/**
 * Clear all permanent titles
 */
export async function clearAllTitles(): Promise<{ success: boolean; deleted: number }> {
    const count = await getTitleCount();
    const { error } = await supabase
        .from('permanent_titles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
        console.error('[PermanentStore] Error clearing titles:', error);
        return { success: false, deleted: 0 };
    }

    console.log(`[PermanentStore] Cleared ${count} titles`);
    return { success: true, deleted: count };
}

/**
 * Clear all permanent fingerprints
 */
export async function clearAllFingerprints(): Promise<{ success: boolean; deleted: number }> {
    const { count, error: countError } = await supabase
        .from('permanent_fingerprints')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('[PermanentStore] Error counting fingerprints:', countError);
        return { success: false, deleted: 0 };
    }

    const { error } = await supabase
        .from('permanent_fingerprints')
        .delete()
        .neq('fingerprint', ''); // Delete all

    if (error) {
        console.error('[PermanentStore] Error clearing fingerprints:', error);
        return { success: false, deleted: 0 };
    }

    console.log(`[PermanentStore] Cleared ${count} fingerprints`);
    return { success: true, deleted: count || 0 };
}

/**
 * Clear ALL permanent data (full reset)
 */
export async function clearAllPermanentData(): Promise<{
    success: boolean;
    guids: number;
    hashes: number;
    titles: number;
    fingerprints: number;
}> {
    const [guidsResult, hashesResult, titlesResult, fingerprintsResult] = await Promise.all([
        clearAllGuids(),
        clearAllHashes(),
        clearAllTitles(),
        clearAllFingerprints(),
    ]);

    return {
        success: guidsResult.success && hashesResult.success && titlesResult.success && fingerprintsResult.success,
        guids: guidsResult.deleted,
        hashes: hashesResult.deleted,
        titles: titlesResult.deleted,
        fingerprints: fingerprintsResult.deleted,
    };
}

/**
 * Get count of stored fingerprints
 */
export async function getFingerprintCount(): Promise<number> {
    const { count, error } = await supabase
        .from('permanent_fingerprints')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('[PermanentStore] Error counting fingerprints:', error);
        return 0;
    }

    return count || 0;
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
    guids: number;
    hashes: number;
    titles: number;
    fingerprints: number;
}> {
    const [guids, hashes, titles, fingerprints] = await Promise.all([
        getGuidCount(),
        getHashCount(),
        getTitleCount(),
        getFingerprintCount(),
    ]);

    return { guids, hashes, titles, fingerprints };
}
