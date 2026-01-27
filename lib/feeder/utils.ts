/**
 * Clean text for AI/NLP processing
 * Removes common source separators, extra whitespace, and jargon.
 */
export function cleanText(text: string): string {
    if (!text) return '';

    // 1. Remove common source endings (e.g., " - CNN", " | BBC News")
    let cleaned = text.split(/ [-|] /)[0];

    // 2. Remove URL-like patterns
    cleaned = cleaned.replace(/https?:\/\/\S+/g, '');

    // 3. Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 4. Lowercase for consistent processing (optional, but good for ID generation)
    // We keep case for embeddings/NER usually, so returning original case but cleaned
    return cleaned;
}
