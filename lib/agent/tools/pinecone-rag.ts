/**
 * Pinecone RAG for Agent Memory & Guidelines
 * Uses Pinecone MCP for vector storage and retrieval
 */

import { Pinecone } from '@pinecone-database/pinecone';

const INDEX_NAME = 'agent-knowledge';
const NAMESPACE_DECISIONS = 'decisions';
const NAMESPACE_GUIDELINES = 'guidelines';
const NAMESPACE_ARTICLES = 'articles';  // NEW: For semantic deduplication

interface RAGResponse {
    success: boolean;
    guidance?: string;
    sources?: string[];
    error?: string;
}

interface AgentExperience {
    articleTitle: string;
    sourceName: string;
    tierUsed: 1 | 2 | 3 | 4;
    toolsCalled: string[];
    decision: 'generate' | 'skip';
    reasoning: string;
    contentType: string;
}

interface PastDecision {
    title: string;
    tier: number;
    decision: string;
    reasoning: string;
    score: number;
}

// Initialize Pinecone client
let pinecone: Pinecone | null = null;

function getPinecone(): Pinecone {
    if (!pinecone) {
        const apiKey = process.env.PINECONE_API_KEY;
        if (!apiKey) {
            throw new Error('PINECONE_API_KEY not set');
        }
        pinecone = new Pinecone({ apiKey });
    }
    return pinecone;
}

/**
 * Query knowledge base for guidelines
 */
export async function queryKnowledge(query: string): Promise<RAGResponse> {
    try {
        const pc = getPinecone();
        const index = pc.index(INDEX_NAME);

        // Query for guidelines
        const results = await index.namespace(NAMESPACE_GUIDELINES).query({
            topK: 3,
            includeMetadata: true,
            vector: await getEmbedding(query),
        });

        if (!results.matches || results.matches.length === 0) {
            return {
                success: true,
                guidance: getDefaultGuidance(query),
                sources: [],
            };
        }

        const guidance = results.matches
            .map(m => m.metadata?.content as string || '')
            .filter(Boolean)
            .join('\n\n');

        return {
            success: true,
            guidance: guidance || getDefaultGuidance(query),
            sources: results.matches.map(m => m.id),
        };
    } catch (error) {
        console.error('[RAG] Query error:', error);
        return {
            success: true,
            guidance: getDefaultGuidance(query),
            sources: [],
        };
    }
}

/**
 * Store agent decision for future learning
 */
export async function storeExperience(experience: AgentExperience): Promise<void> {
    try {
        const pc = getPinecone();
        const index = pc.index(INDEX_NAME);

        const content = `Article: ${experience.articleTitle}. Source: ${experience.sourceName}. ` +
            `Used tier ${experience.tierUsed}, decision: ${experience.decision}. ` +
            `Tools: ${experience.toolsCalled.join(', ')}. Reason: ${experience.reasoning}`;

        const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        await index.namespace(NAMESPACE_DECISIONS).upsert([{
            id,
            values: await getEmbedding(content),
            metadata: {
                content,
                title: experience.articleTitle,
                source: experience.sourceName,
                tier: experience.tierUsed,
                decision: experience.decision,
                tools: experience.toolsCalled,
                contentType: experience.contentType,
                timestamp: new Date().toISOString(),
            },
        }]);

        console.log(`[RAG] Stored experience: ${id}`);
    } catch (error) {
        console.error('[RAG] Store error:', error);
    }
}

/**
 * Find similar past decisions
 */
export async function findSimilarDecisions(
    title: string,
    source: string,
    limit: number = 3
): Promise<PastDecision[]> {
    try {
        const pc = getPinecone();
        const index = pc.index(INDEX_NAME);

        const query = `Article: ${title}. Source: ${source}`;

        const results = await index.namespace(NAMESPACE_DECISIONS).query({
            topK: limit,
            includeMetadata: true,
            vector: await getEmbedding(query),
        });

        if (!results.matches || results.matches.length === 0) {
            return [];
        }

        return results.matches.map(m => ({
            title: m.metadata?.title as string || '',
            tier: m.metadata?.tier as number || 2,
            decision: m.metadata?.decision as string || '',
            reasoning: m.metadata?.content as string || '',
            score: m.score || 0,
        }));
    } catch (error) {
        console.error('[RAG] Find similar error:', error);
        return [];
    }
}

/**
 * Seed initial guidelines into the knowledge base
 */
export async function seedGuidelines(): Promise<void> {
    const guidelines = [
        {
            id: 'guide_tier_selection',
            content: `TIER SELECTION RULES:
- Tier 1 (Direct): Use when snippet has specific numbers (prices, scores, dates) and source is reliable. NO API calls.
- Tier 2 (Read): Use when snippet is vague but URL is available. ONE Jina API call.
- Tier 3 (Verify): Use for breaking news or unverified sources. Jina + Search (max 4 API calls).
- Tier 4 (Skip): Use for opinion pieces, unverifiable news, or low-quality content.
GOAL: Minimize API calls while maintaining quality.`,
        },
        {
            id: 'guide_pakistan_context',
            content: `PAKISTAN NEWS CONTEXT:
- Reliable sources: Dawn, Geo, ARY, Express Tribune, The News, Samaa
- Be neutral on political topics - no bias
- Currency: PKR (Pakistani Rupee), USD references common
- Key topics: Economy (dollar rate, inflation), Politics, Cricket, CPEC, Weather
- Avoid sectarian or inflammatory content`,
        },
        {
            id: 'guide_post_format',
            content: `POST FORMATTING:
- X/Twitter: Max 280 chars, 2-3 hashtags, emojis sparingly, cite source
- Instagram: Longer caption OK, more emojis, engaging tone, call-to-action
- Facebook: Full paragraph, professional, include context
- Always use #PakistanNews or relevant local hashtags`,
        },
        {
            id: 'guide_skip_criteria',
            content: `WHEN TO SKIP:
- Opinion/editorial pieces (not factual)
- Cannot verify from 2+ sources for breaking news
- Clickbait with no substance
- Old news (>3 days unless significant)
- Duplicate of recently processed article
- Sensitive content without official confirmation`,
        },
    ];

    try {
        const pc = getPinecone();
        const index = pc.index(INDEX_NAME);

        const vectors = await Promise.all(
            guidelines.map(async g => ({
                id: g.id,
                values: await getEmbedding(g.content),
                metadata: { content: g.content, type: 'guideline' },
            }))
        );

        await index.namespace(NAMESPACE_GUIDELINES).upsert(vectors);
        console.log(`[RAG] Seeded ${guidelines.length} guidelines`);
    } catch (error) {
        console.error('[RAG] Seed error:', error);
    }
}

/**
 * Get embedding using Pinecone's inference
 * Falls back to simple hash-based vector for development
 */
async function getEmbedding(text: string): Promise<number[]> {
    try {
        const pc = getPinecone();

        // Use Pinecone's inference API
        const response = await pc.inference.embed(
            'llama-text-embed-v2',
            [text],
            { inputType: 'passage' }
        );

        if (response.data && response.data[0]) {
            const embedding = response.data[0] as { values?: number[] };
            if (embedding.values) {
                return embedding.values;
            }
        }

        throw new Error('No embedding returned');
    } catch (error) {
        console.error('[RAG] Embedding error, using fallback:', error);
        // Fallback: simple deterministic vector (for dev only)
        return generateFallbackVector(text, 1024);
    }
}

/**
 * Fallback vector generation (for development)
 */
function generateFallbackVector(text: string, dim: number): number[] {
    const vector: number[] = [];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }
    for (let i = 0; i < dim; i++) {
        hash = ((hash << 5) - hash) + i;
        vector.push(Math.sin(hash) * 0.5 + 0.5);
    }
    return vector;
}

/**
 * Default guidance when RAG is not available
 */
function getDefaultGuidance(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('tier') || lowerQuery.includes('tool')) {
        return 'Use Tier 1 (direct) for price updates with numbers. Use Tier 2 (read article) when snippet is short. Use Tier 3 (search) only for breaking news verification.';
    }

    if (lowerQuery.includes('skip')) {
        return 'Skip opinion pieces, unverifiable breaking news, and clickbait. Always provide reasoning.';
    }

    if (lowerQuery.includes('format') || lowerQuery.includes('post')) {
        return 'X: 280 chars max with hashtags. Instagram: longer with emojis. Facebook: full paragraph.';
    }

    return 'Process efficiently. Minimize API calls. Skip if unsure about credibility.';
}

// ============= SEMANTIC ARTICLE DEDUPLICATION =============

interface SemanticDuplicateResult {
    isDuplicate: boolean;
    similarTitle?: string;
    similarityScore?: number;
    hash?: string;
}

/**
 * Store an article embedding in Pinecone for future semantic search
 * Called when a new unique article is added to the feeder
 */
export async function storeArticleEmbedding(
    hash: string,
    title: string,
    source: string
): Promise<void> {
    try {
        const pc = getPinecone();
        const index = pc.index(INDEX_NAME);

        // Create a content string for embedding
        const content = `${title} - ${source}`;

        await index.namespace(NAMESPACE_ARTICLES).upsert([{
            id: hash,  // Use hash as unique ID
            values: await getEmbedding(content),
            metadata: {
                title,
                source,
                content,
                storedAt: new Date().toISOString(),
            },
        }]);

        console.log(`[RAG] Stored article embedding: ${hash.substring(0, 12)}...`);
    } catch (error) {
        console.error('[RAG] Store article error:', error);
    }
}

/**
 * Store multiple articles in batch (more efficient)
 */
export async function storeArticleBatch(
    articles: { hash: string; title: string; source: string }[]
): Promise<void> {
    if (articles.length === 0) return;

    try {
        const pc = getPinecone();
        const index = pc.index(INDEX_NAME);

        // Generate embeddings for all articles
        const vectors = await Promise.all(
            articles.map(async (article) => {
                const content = `${article.title} - ${article.source}`;
                return {
                    id: article.hash,
                    values: await getEmbedding(content),
                    metadata: {
                        title: article.title,
                        source: article.source,
                        content,
                        storedAt: new Date().toISOString(),
                    },
                };
            })
        );

        await index.namespace(NAMESPACE_ARTICLES).upsert(vectors);
        console.log(`[RAG] Stored ${articles.length} article embeddings`);
    } catch (error) {
        console.error('[RAG] Batch store error:', error);
    }
}

/**
 * Find if an article is a semantic duplicate of any stored article
 * Uses cosine similarity to detect same story from different sources
 * 
 * @param title - The new article title to check
 * @param source - The source name (for logging)
 * @param threshold - Similarity threshold (0.85 = 85% similar)
 * @returns SemanticDuplicateResult with match info
 */
export async function findSemanticDuplicate(
    title: string,
    source: string,
    threshold: number = 0.85
): Promise<SemanticDuplicateResult> {
    try {
        const pc = getPinecone();
        const index = pc.index(INDEX_NAME);

        const content = `${title} - ${source}`;

        const results = await index.namespace(NAMESPACE_ARTICLES).query({
            topK: 1,
            includeMetadata: true,
            vector: await getEmbedding(content),
        });

        if (!results.matches || results.matches.length === 0) {
            return { isDuplicate: false };
        }

        const topMatch = results.matches[0];
        const similarity = topMatch.score || 0;

        if (similarity >= threshold) {
            const similarTitle = topMatch.metadata?.title as string || 'Unknown';
            console.log(`[RAG] Semantic duplicate found (${(similarity * 100).toFixed(1)}%):
  New: "${title.substring(0, 60)}..."
  Existing: "${similarTitle.substring(0, 60)}..."`);

            return {
                isDuplicate: true,
                similarTitle,
                similarityScore: similarity,
                hash: topMatch.id,
            };
        }

        return { isDuplicate: false };
    } catch (error) {
        console.error('[RAG] Semantic search error:', error);
        return { isDuplicate: false };  // Fail open - don't block on error
    }
}

/**
 * Check multiple articles for semantic duplicates in batch
 */
export async function findSemanticDuplicatesBatch(
    articles: { title: string; source: string }[],
    threshold: number = 0.85
): Promise<Map<string, SemanticDuplicateResult>> {
    const results = new Map<string, SemanticDuplicateResult>();

    // Process in parallel for speed
    await Promise.all(
        articles.map(async (article) => {
            const result = await findSemanticDuplicate(article.title, article.source, threshold);
            results.set(article.title, result);
        })
    );

    return results;
}

/**
 * Get count of stored articles in Pinecone
 */
export async function getStoredArticleCount(): Promise<number> {
    try {
        const pc = getPinecone();
        const index = pc.index(INDEX_NAME);
        const stats = await index.describeIndexStats();
        return stats.namespaces?.[NAMESPACE_ARTICLES]?.recordCount || 0;
    } catch (error) {
        console.error('[RAG] Stats error:', error);
        return 0;
    }
}
