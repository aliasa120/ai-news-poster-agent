import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { scrapeArticle, getProviderStatus, type ScrapingProvider } from './multi-scraper';
import { truncateContent } from './jina-reader';
import { multiSearch, multiSearchNews, setSearchProvider, getSearchProvider, type SearchProvider } from './multi-search';
import { queryKnowledge, findSimilarDecisions, storeExperience } from './pinecone-rag';

// Re-export types and setters
export type { ScrapingProvider, SearchProvider };
export { setSearchProvider, getSearchProvider };

// Current scraping provider setting (can be updated from settings)
let currentScrapingProvider: ScrapingProvider = 'auto';

export function setScrapingProvider(provider: ScrapingProvider) {
    currentScrapingProvider = provider;
    console.log(`[Tools] Scraping provider set to: ${provider}`);
}

export function getScrapingProvider(): ScrapingProvider {
    return currentScrapingProvider;
}

/**
 * Jina Reader Tool - Read full article content from URL
 * Now uses multi-scraper with automatic fallback and rate limiting
 * TIER 2: Use when snippet lacks detail
 */
export const jinaReaderTool = new DynamicStructuredTool({
    name: 'read_article',
    description: `Read full article content from a URL. TIER 2 tool.

WHEN TO USE:
- Snippet has < 100 characters
- Title is vague like "Minister announces policy"
- Missing key facts: numbers, dates, quotes, names

WHEN NOT TO USE:
- You already have enough info from snippet (use TIER 1)
- You need multiple perspectives (use search_web instead)

RETURNS: Full article text (up to 10,000 chars)`,
    schema: z.object({
        url: z.string().describe('The article URL'),
    }),
    func: async ({ url }) => {
        console.log(`[Tool] Reading article: ${url}`);
        const status = getProviderStatus();
        console.log(`[Tool] Provider status - Jina Free: ${status.jina_free.tokens}/20, Jina API: ${status.jina_api.tokens}/200`);

        const result = await scrapeArticle(url, {
            provider: currentScrapingProvider,
            maxChars: 10000, // About 2500 words - full article content
        });

        if (!result.success) {
            return `Error: ${result.error}`;
        }

        const providerUsed = result.provider || 'unknown';
        const waitNote = result.waitedForRateLimit ? ' (waited for rate limit)' : '';
        console.log(`[Tool] Scraped with ${providerUsed}${waitNote}`);

        return result.content || '';
    },
});

/**
 * Web Search Tool - Search + Read ALL articles in PARALLEL
 * TIER 3: Use for breaking news or unclear content
 * 
 * NEW BEHAVIOR:
 * 1. Searches Google with your query
 * 2. Gets top 3 results
 * 3. Reads ALL 3 articles in PARALLEL via Jina AI (Promise.all)
 * 4. Returns combined full content from all sources
 * 
 * This is more efficient than calling read_article 3 times sequentially!
 */
export const serperSearchTool = new DynamicStructuredTool({
    name: 'search_web',
    description: `Search Google AND read top 3 articles in PARALLEL. TIER 3 tool - VERY POWERFUL!

WHEN TO USE:
- Need to VERIFY breaking news from multiple sources
- Source credibility is questionable
- Need additional context or background
- Controversial claims need fact-checking

⚠️ QUERY FORMULATION:
- GOOD: "Pakistan GDP growth rate 2026" (specific question)
- GOOD: "PTI rally Lahore January details" (specific event)
- BAD: "PM announces economic package" (copies title - don't do this!)
- BAD: "What is happening?" (too vague)

RETURNS: Full content from 3 different sources (8000 chars each).
No need to call read_article after - this tool already reads articles!`,
    schema: z.object({
        query: z.string().describe('Specific search query - ask a QUESTION, do NOT copy the article title'),
    }),
    func: async ({ query }) => {
        console.log(`[Tool] search_web: "${query}"`);

        // Step 1: Search Google
        console.log(`[Tool] Step 1: Searching Google...`);
        const searchResult = await multiSearch(query, 3);

        if (!searchResult.success) {
            return `Search Error: ${searchResult.error}`;
        }
        if (!searchResult.results?.length) {
            return 'No search results found.';
        }

        const urls = searchResult.results.map(r => r.link);
        console.log(`[Tool] Step 2: Found ${urls.length} URLs, reading in PARALLEL...`);

        // Step 2: Read ALL articles in PARALLEL using Promise.all
        const startTime = Date.now();
        const articlePromises = urls.map(url =>
            scrapeArticle(url, {
                provider: currentScrapingProvider,
                maxChars: 8000, // 8000 chars per article (total ~24000 for 3) - MAXIMUM content
            })
        );

        // Wait for ALL parallel requests to complete
        const articles = await Promise.all(articlePromises);
        const elapsed = Date.now() - startTime;
        console.log(`[Tool] Step 3: All ${urls.length} articles fetched in ${elapsed}ms (PARALLEL)`);

        // Step 3: Combine results
        const combined = articles.map((article, i) => {
            const source = searchResult.results![i];
            if (article.success && article.content) {
                const provider = article.provider || 'unknown';
                return `## Source ${i + 1}: ${source.title}
URL: ${source.link}
Provider: ${provider}

${article.content}`;
            } else {
                return `## Source ${i + 1}: ${source.title}
URL: ${source.link}
⚠️ Failed to read: ${article.error || 'Unknown error'}

Snippet: ${source.snippet}`;
            }
        }).join('\n\n---\n\n');

        console.log(`[Tool] Returning combined content from ${articles.filter(a => a.success).length}/${urls.length} sources`);
        return combined;
    },
});

/**
 * News Search Tool - Search + Read ALL news in PARALLEL
 * TIER 3: Verify from multiple news sources
 * 
 * NEW BEHAVIOR:
 * 1. Searches news sources
 * 2. Gets top 3 news results  
 * 3. Reads ALL 3 articles in PARALLEL via Jina AI
 * 4. Returns combined full content
 */
export const newsSearchTool = new DynamicStructuredTool({
    name: 'search_news',
    description: `Search NEWS sources AND read top 3 articles in PARALLEL. TIER 3 alternative.

WHEN TO USE:
- Need to verify if breaking news is widely reported
- Want news-specific sources (not general web)
- Checking story credibility across news outlets

⚠️ QUERY FORMULATION:
- GOOD: "Pakistan economic reforms January 2026" (specific topic)
- BAD: "Latest news Pakistan" (too broad)

RETURNS: Full content from 3 news sources (8000 chars each).`,
    schema: z.object({
        query: z.string().describe('Specific news topic - be precise about event/topic'),
    }),
    func: async ({ query }) => {
        console.log(`[Tool] search_news: "${query}"`);

        // Step 1: Search news
        const searchResult = await multiSearchNews(query, 3);

        if (!searchResult.success) {
            return `News Search Error: ${searchResult.error}`;
        }
        if (!searchResult.results?.length) {
            return 'No news articles found.';
        }

        // Check if results have URLs (some news APIs don't return full URLs)
        const resultsWithUrls = searchResult.results.filter((r: { link?: string }) => r.link);

        if (resultsWithUrls.length === 0) {
            // Fallback to snippets only
            return searchResult.results
                .map((r: { title: string; snippet: string }, i: number) =>
                    `${i + 1}. ${r.title}\n${r.snippet}`
                ).join('\n\n');
        }

        const urls = resultsWithUrls.map((r: { link: string }) => r.link);
        console.log(`[Tool] Found ${urls.length} news URLs, reading in PARALLEL...`);

        // Step 2: Read ALL news articles in PARALLEL
        const startTime = Date.now();
        const articlePromises = urls.map((url: string) =>
            scrapeArticle(url, {
                provider: currentScrapingProvider,
                maxChars: 8000, // 8000 chars per article - MAXIMUM content
            })
        );

        const articles = await Promise.all(articlePromises);
        const elapsed = Date.now() - startTime;
        console.log(`[Tool] All ${urls.length} news articles fetched in ${elapsed}ms (PARALLEL)`);

        // Step 3: Combine results
        const combined = articles.map((article, i) => {
            const source = resultsWithUrls[i];
            if (article.success && article.content) {
                return `## News ${i + 1}: ${source.title}
URL: ${source.link}

${article.content}`;
            } else {
                return `## News ${i + 1}: ${source.title}
⚠️ Failed to read full article

Snippet: ${source.snippet || 'No snippet available'}`;
            }
        }).join('\n\n---\n\n');

        return combined;
    },
});

/**
 * Knowledge Base Tool - Query guidelines
 * Use FIRST to understand how to handle specific situations
 */
export const knowledgeBaseTool = new DynamicStructuredTool({
    name: 'get_guidance',
    description: `Query knowledge base for guidance on handling specific situations.
Examples: "how to handle political news", "when to skip", "post format rules"
Use at START of processing if unsure about approach.`,
    schema: z.object({
        question: z.string().describe('Question about guidelines'),
    }),
    func: async ({ question }) => {
        console.log(`[Tool] Guidance: ${question}`);
        const result = await queryKnowledge(question);
        return result.guidance || 'Use best judgment.';
    },
});

/**
 * Find Similar Tool - Check past decisions
 * Helps learn from previous processing
 */
export const findSimilarTool = new DynamicStructuredTool({
    name: 'find_similar',
    description: `Find similar articles processed before. Use to:
- See how similar articles were handled
- Learn from past tier selections
- Avoid repeating mistakes`,
    schema: z.object({
        title: z.string().describe('Article title'),
        source: z.string().describe('News source name'),
    }),
    func: async ({ title, source }) => {
        console.log(`[Tool] Similar: ${title}`);
        const decisions = await findSimilarDecisions(title, source, 3);

        if (decisions.length === 0) {
            return 'No similar articles found. Use tier selection rules.';
        }

        return decisions
            .map((d, i) => `${i + 1}. "${d.title}" - Tier ${d.tier}, ${d.decision}`)
            .join('\n');
    },
});

/**
 * Remember Decision Tool - Store for future learning
 */
export const rememberDecisionTool = new DynamicStructuredTool({
    name: 'remember_decision',
    description: `Store your decision for future reference. Call AFTER generating posts or skipping.
This helps the agent learn patterns over time.`,
    schema: z.object({
        articleTitle: z.string().describe('Article title'),
        sourceName: z.string().describe('News source'),
        tierUsed: z.number().min(1).max(4).describe('Tier used (1-4)'),
        toolsCalled: z.array(z.string()).describe('Tools used'),
        decision: z.enum(['generate', 'skip']).describe('Final decision'),
        reasoning: z.string().describe('Why this decision'),
        contentType: z.string().describe('Type: price_update, event, breaking, etc'),
    }),
    func: async ({ articleTitle, sourceName, tierUsed, toolsCalled, decision, reasoning, contentType }) => {
        console.log(`[Tool] Remember: ${decision} for "${articleTitle}"`);

        await storeExperience({
            articleTitle,
            sourceName,
            tierUsed: tierUsed as 1 | 2 | 3 | 4,
            toolsCalled,
            decision,
            reasoning,
            contentType,
        });

        return `Decision stored: ${decision} using Tier ${tierUsed}`;
    },
});

/**
 * Get all tools for the agent - ordered by priority
 */
export function getAgentTools() {
    return [
        // Tier 1: No tools needed for direct generation
        // Tier 2: Read article
        jinaReaderTool,
        // Tier 3: Search & verify
        serperSearchTool,
        newsSearchTool,
        // Memory tools
        knowledgeBaseTool,
        findSimilarTool,
        rememberDecisionTool,
    ];
}
