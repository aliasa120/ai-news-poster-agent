import stringSimilarity from 'string-similarity';
import { FeederArticle, ExistingTitle } from './types';

export interface FuzzyResult {
    unique: FeederArticle[];
    duplicates: FeederArticle[];
    stats: {
        checked: number;
        duplicatesFound: number;
    };
}

/**
 * Layer 3: Fuzzy Title Matching
 * Checks for duplicates based on string similarity of titles.
 * Threshold: 0.4 (40%) as requested.
 */
export function checkFuzzyDuplicates(
    newArticles: FeederArticle[],
    existingItems: ExistingTitle[], // Changed from string[] to ExistingTitle[]
    threshold: number = 0.60 // Tuned to 0.60 for cleaner feed (catches " - Source" variations)
): FuzzyResult {
    const unique: FeederArticle[] = [];
    const duplicates: FeederArticle[] = [];
    const derivedKeys = new Set<string>(); // Keep track of "Title + Description" keys

    console.log(`[L3:Fuzzy] Checking ${newArticles.length} articles against ${existingItems.length} DB items...`);

    // Import cleanText locally to avoid circular dependency issues at top level if any
    const { cleanText } = require('./utils');

    // Helper to build comparison string
    const getCompareString = (title: string, desc: string | null) => {
        return cleanText(`${title} ${desc || ''}`);
    };

    // Pre-calculate clean strings for existing items
    const existingStrings = existingItems.map(item => getCompareString(item.title, item.content_snippet));

    for (const article of newArticles) {
        const rawTitle = article.title;
        // Compare Title + Snippet
        const cleanCompareString = getCompareString(article.title, article.content_snippet);

        let isDuplicate = false;

        // 1. Check against ITSELF (Self-dedup within the batch)
        if (derivedKeys.size > 0) {
            const derivedArray = Array.from(derivedKeys);
            const selfMatches = stringSimilarity.findBestMatch(cleanCompareString, derivedArray);

            if (selfMatches.bestMatch.rating >= threshold) {
                console.log(`[L3:Fuzzy] Self-duplicate: "${rawTitle}" ~= "${selfMatches.bestMatch.target.substring(0, 50)}..." (${(selfMatches.bestMatch.rating * 100).toFixed(1)}%)`);
                duplicates.push(article);
                continue;
            }
        }

        // 2. Check against DB (Existing items)
        if (existingStrings.length > 0) {
            const dbMatches = stringSimilarity.findBestMatch(cleanCompareString, existingStrings);

            if (dbMatches.bestMatch.rating >= threshold) {
                const matchIndex = dbMatches.bestMatchIndex;
                const matchedItem = existingItems[matchIndex];
                console.log(`[L3:Fuzzy] DB Duplicate: "${rawTitle}" ~= "${matchedItem.title}" (${(dbMatches.bestMatch.rating * 100).toFixed(1)}%)`);
                isDuplicate = true;
                duplicates.push(article);
                continue;
            }
        }

        // If unique, add to lists
        unique.push(article);
        derivedKeys.add(cleanCompareString);
    }

    return {
        unique,
        duplicates,
        stats: {
            checked: newArticles.length,
            duplicatesFound: duplicates.length
        }
    };
}
