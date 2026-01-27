import { Pinecone } from '@pinecone-database/pinecone';
import { FeederArticle } from './types';
import { cleanText } from './utils';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'agent-knowledge';

// Tuned to 0.78 for "Ultra Clean Feed" (merges "Squad named" vs "Player dropped")
// Old: 0.85 (Clean) -> 0.78 (Aggressive)
const SIMILARITY_THRESHOLD = 0.78;
// Model matching the existing index (1024 dims)
const EMBEDDING_MODEL = 'llama-text-embed-v2';

export interface VectorResult {
    unique: FeederArticle[];
    duplicates: FeederArticle[];
    stats: {
        checked: number;
        duplicatesFound: number;
    };
}

/**
 * Generate embeddings using Pinecone Inference API
 * Matches the index dimension (1024)
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!PINECONE_API_KEY) throw new Error('PINECONE_API_KEY not set');

    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

    // Use Pinecone Inference for 1024-dim embeddings
    const response = await pc.inference.embed(
        EMBEDDING_MODEL,
        texts,
        { inputType: 'passage', truncate: 'END' }
    );

    return response.data.map((r: any) => r.values || []);
}

/**
 * Layer 5: Semantic Vector Search
 * 1. Generate embeddings for new articles
 * 2. Query Pinecone for similar vectors (threshold > 0.6)
 * 3. Filter out duplicates
 */
export async function checkSemanticDuplicates(
    articles: FeederArticle[],
    threshold: number = SIMILARITY_THRESHOLD
): Promise<VectorResult> {
    const unique: FeederArticle[] = [];
    const duplicates: FeederArticle[] = [];

    if (!PINECONE_API_KEY) {
        console.warn('[L5:Vector] Pinecone API key missing, skipping layer');
        return { unique: articles, duplicates: [], stats: { checked: articles.length, duplicatesFound: 0 } };
    }

    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(PINECONE_INDEX_NAME);

    console.log(`[L5:Vector] Generating embeddings for ${articles.length} articles using ${EMBEDDING_MODEL}...`);

    // Prepare texts (Title + Snippet) - Cleaned to remove jargon/sources
    const texts = articles.map(a => cleanText(`${a.title}. ${a.content_snippet || ''}`));

    try {
        const embeddings = await generateEmbeddings(texts);

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            const vector = embeddings[i];

            if (!vector || vector.length === 0) {
                // Skip if embedding failed
                unique.push(article);
                continue;
            }

            // Query Pinecone
            const queryResponse = await index.query({
                vector,
                topK: 1,
                includeMetadata: true
            });

            if (queryResponse.matches.length > 0) {
                const match = queryResponse.matches[0];
                if (match.score && match.score >= threshold) {
                    console.log(`[L5:Vector] Duplicate found: "${article.title}" ~= "${match.metadata?.title}" (${(match.score * 100).toFixed(1)}%)`);
                    duplicates.push(article);
                    continue;
                }
            }

            unique.push(article);
        }
    } catch (error) {
        console.error('[L5:Vector] Error during vector check:', error);
        // On error, better to fail safe and keep articles or skip layer?
        // We'll return potentially duplicated articles with a warning log.
        return { unique: articles, duplicates: [], stats: { checked: articles.length, duplicatesFound: 0 } };
    }

    return {
        unique,
        duplicates,
        stats: {
            checked: articles.length,
            duplicatesFound: duplicates.length
        }
    };
}

/**
 * Save embeddings for NEW unique articles to Pinecone
 */
export async function saveEmbeddings(articles: FeederArticle[]): Promise<void> {
    if (!PINECONE_API_KEY || articles.length === 0) return;

    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(PINECONE_INDEX_NAME);

    const texts = articles.map(a => cleanText(`${a.title}. ${a.content_snippet || ''}`));

    try {
        const embeddings = await generateEmbeddings(texts);

        const records = articles.map((a, i) => ({
            // Use hashed ID to avoid Pinecone 512 char limit (Google News URLs are long)
            id: a.hash || `auto-${Date.now()}-${i}`,
            values: embeddings[i],
            metadata: {
                title: a.title,
                url: a.link,
                source: a.source_name || 'unknown',
                published_at: a.pub_date || new Date().toISOString(),
                // Add text content to metadata for reference (and hybrid search if enabled)
                content: texts[i].substring(0, 1000)
            }
        }));


        // Upsert in batches of 50
        const batchSize = 50;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            await index.upsert(batch);
        }

        console.log(`[L5:Vector] Saved ${records.length} embeddings to Pinecone`);
    } catch (error) {
        console.error('[L5:Vector] Error saving embeddings:', error);
    }
}

/**
 * Delete ALL vectors from Pinecone (Danger Zone)
 */
export async function deleteAllEmbeddings(): Promise<void> {
    if (!PINECONE_API_KEY) return;

    try {
        const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
        const index = pc.index(PINECONE_INDEX_NAME);

        // Pinecone deleteAll is namespace-specific!

        // 1. Try to clear 'articles' namespace (if it exists)
        try {
            await index.namespace('articles').deleteAll();
        } catch (e) {
            // Ignore 404s if namespace doesn't exist
            console.log('[L5:Vector] "articles" namespace empty or not found (skipping)');
        }

        // 2. Clear default namespace (where data might be sitting)
        await index.deleteAll();

        console.log(`[L5:Vector] Cleared all embeddings from 'articles' and default namespaces in "${PINECONE_INDEX_NAME}"`);
    } catch (error) {
        console.error('[L5:Vector] Error deleting all embeddings:', error);
    }
}
