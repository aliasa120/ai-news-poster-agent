import SHA256 from 'crypto-js/sha256';

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

// ============= FUZZY TITLE MATCHING (Layer 2) =============

/**
 * Stop words to remove from titles for better comparison
 * These words don't contribute to story identification
 */
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

/**
 * Synonym groups - words that mean the same thing in news context
 */
const SYNONYM_GROUPS: string[][] = [
    ['ban', 'closure', 'block', 'restriction', 'bar', 'prohibited'],
    ['aircraft', 'flights', 'planes', 'jets', 'airplane'],
    ['lands', 'arrives', 'reaches', 'touches down'],
    ['meet', 'meeting', 'talks', 'discussion', 'dialogue'],
    ['killed', 'dead', 'died', 'martyred', 'slain'],
    ['injured', 'wounded', 'hurt'],
    ['announces', 'declared', 'unveils', 'reveals', 'says'],
    ['extends', 'extended', 'prolongs', 'continues'],
    ['strengthens', 'boost', 'enhance', 'improve', 'deepen'],
    ['attack', 'assault', 'strike', 'blast', 'explosion'],
];

/**
 * Normalize a title to key words for fuzzy comparison
 * Removes source names, stop words, and normalizes synonyms
 */
export function extractKeyWords(title: string): Set<string> {
    // Step 1: Basic normalization
    let normalized = title
        .toLowerCase()
        .replace(/[-–—]/g, ' ')           // Replace dashes with spaces
        .replace(/\s*[|:]\s*.+$/, '')     // Remove "| Source" at end
        .replace(/\s*-\s*[^-]+$/, '')     // Remove "- Source" at end
        .replace(/[^\w\s]/g, '')          // Remove punctuation
        .replace(/\s+/g, ' ')             // Normalize whitespace
        .trim();

    // Step 2: Split into words and filter stop words
    const words = normalized.split(' ').filter(word =>
        word.length > 2 && !STOP_WORDS.has(word)
    );

    // Step 3: Normalize synonyms to canonical form (first word in group)
    const normalizedWords = words.map(word => {
        for (const group of SYNONYM_GROUPS) {
            if (group.includes(word)) {
                return group[0]; // Use first word as canonical
            }
        }
        return word;
    });

    return new Set(normalizedWords);
}

/**
 * Calculate Jaccard similarity between two sets of words
 * Returns a value between 0 (no overlap) and 1 (identical)
 */
export function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = [...set1].filter(word => set2.has(word)).length;
    const union = new Set([...set1, ...set2]).size;

    return intersection / union;
}

/**
 * Check if two titles are about the same story using fuzzy matching
 * @param title1 First title
 * @param title2 Second title
 * @param threshold Similarity threshold (default 0.6 = 60% overlap)
 */
export function isSimilarTitle(
    title1: string,
    title2: string,
    threshold: number = 0.6
): boolean {
    const words1 = extractKeyWords(title1);
    const words2 = extractKeyWords(title2);

    const similarity = jaccardSimilarity(words1, words2);

    return similarity >= threshold;
}

/**
 * Find similar titles from a list
 * Returns the first similar title found, or null if none match
 */
export function findSimilarTitle(
    newTitle: string,
    existingTitles: string[],
    threshold: number = 0.6
): string | null {
    const newWords = extractKeyWords(newTitle);

    for (const existingTitle of existingTitles) {
        const existingWords = extractKeyWords(existingTitle);
        const similarity = jaccardSimilarity(newWords, existingWords);

        if (similarity >= threshold) {
            console.log(`[Dedup] Similar titles found (${(similarity * 100).toFixed(0)}%):
  New: "${newTitle.substring(0, 60)}..."
  Existing: "${existingTitle.substring(0, 60)}..."`);
            return existingTitle;
        }
    }

    return null;
}

/**
 * Filter items using both hash AND fuzzy title matching
 * Layer 1: Hash check (exact match)
 * Layer 2: Fuzzy title check (similar content)
 */
export function filterDuplicatesWithFuzzy<T extends { hash: string; title: string }>(
    items: T[],
    existingHashes: Set<string>,
    existingTitles: string[],
    similarityThreshold: number = 0.6
): { unique: T[]; duplicates: T[]; fuzzyMatches: number } {
    const unique: T[] = [];
    const duplicates: T[] = [];
    const seenHashes = new Set<string>();
    const seenTitles: string[] = [];
    let fuzzyMatches = 0;

    for (const item of items) {
        // Layer 1: Hash check
        if (existingHashes.has(item.hash) || seenHashes.has(item.hash)) {
            duplicates.push(item);
            continue;
        }

        // Layer 2: Fuzzy title check against existing AND already-seen new items
        const allTitles = [...existingTitles, ...seenTitles];
        const similarTitle = findSimilarTitle(item.title, allTitles, similarityThreshold);

        if (similarTitle) {
            duplicates.push(item);
            fuzzyMatches++;
            continue;
        }

        // Not a duplicate - add to unique list
        unique.push(item);
        seenHashes.add(item.hash);
        seenTitles.push(item.title);
    }

    if (fuzzyMatches > 0) {
        console.log(`[Dedup] Caught ${fuzzyMatches} duplicates via fuzzy matching`);
    }

    return { unique, duplicates, fuzzyMatches };
}
