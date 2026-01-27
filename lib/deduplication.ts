import SHA256 from 'crypto-js/sha256';

/**
 * Deduplication Module v2
 * 
 * This module now only provides hash-based deduplication.
 * AI-powered title matching has been moved to the feeder agent system.
 * 
 * @see lib/feeder/title-verifier-agent.ts for AI-based deduplication
 */

/**
 * Generate a unique hash for a news item based on title and source
 * This is used for deduplication - same news from different times will have same hash
 */
export function generateNewsHash(title: string, source: string | null): string {
    // Normalize: lowercase, trim, remove extra spaces
    const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedSource = (source || 'unknown').toLowerCase().trim();

    const combined = `${normalizedTitle}|${normalizedSource}`;
    return SHA256(combined).toString();
}

/**
 * Check if a hash already exists in the provided array of existing hashes
 */
export function isDuplicate(hash: string, existingHashes: Set<string>): boolean {
    return existingHashes.has(hash);
}

/**
 * Filter out duplicate items from a list based on their hashes
 */
export function filterDuplicates<T extends { hash: string }>(
    items: T[],
    existingHashes: Set<string>
): { unique: T[]; duplicates: T[] } {
    const unique: T[] = [];
    const duplicates: T[] = [];
    const seenHashes = new Set<string>();

    for (const item of items) {
        if (existingHashes.has(item.hash) || seenHashes.has(item.hash)) {
            duplicates.push(item);
        } else {
            unique.push(item);
            seenHashes.add(item.hash);
        }
    }

    return { unique, duplicates };
}

/**
 * Normalize a title for comparison
 * Removes common noise like source names, extra punctuation
 */
export function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[-–—]/g, ' ')           // Replace dashes with spaces
        .replace(/\s*[|:]\\s*.+$/, '')    // Remove "| Source" at end
        .replace(/\s*-\s*[^-]+$/, '')     // Remove "- Source" at end
        .replace(/[^\w\s]/g, '')          // Remove punctuation
        .replace(/\s+/g, ' ')             // Normalize whitespace
        .trim();
}

/**
 * Extract key words from a title for quick comparison
 * @deprecated Use AI-based title verification in lib/feeder/title-verifier-agent.ts
 */
export function extractKeyWords(title: string): Set<string> {
    const STOP_WORDS = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
        'used', 'its', 'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
        'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
        'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
        'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same',
        'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
        'after', 'before', 'above', 'below', 'between', 'into', 'through',
        'during', 'under', 'again', 'further', 'then', 'once', 'says', 'said',
        'amid', 'over', 'about', 'against', 'up', 'down', 'out', 'off', 'until'
    ]);

    const normalized = normalizeTitle(title);
    const words = normalized.split(' ').filter(word =>
        word.length > 1 && !STOP_WORDS.has(word)
    );

    return new Set(words);
}
