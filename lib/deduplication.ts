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
