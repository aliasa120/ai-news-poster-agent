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
    description: `Read full article content from URL. Uses multi-scraper with rate limiting.
- Jina Free: 20 req/min (auto-waits when limit reached)
- Jina API: 200 req/min (if API key set)
- Exa AI: Fallback option
Use ONLY when snippet has less than 100 chars or missing key facts.`,
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
 * Web Search Tool - Search for verification/context
 * TIER 3: Use for breaking news or unclear content
 * Now uses multi-search (Serper or SearXNG based on settings)
 */
export const serperSearchTool = new DynamicStructuredTool({
    name: 'search_web',
    description: `Search Google for verification. Use ONLY when:
- Breaking news needs multiple source confirmation
- Article content is unclear after reading
- Cannot verify facts from article alone
Returns top 3 results. EXPENSIVE - use sparingly.`,
    schema: z.object({
        query: z.string().describe('Search query - be specific'),
    }),
    func: async ({ query }) => {
        console.log(`[Tool] search_web`);
        console.log(`[Tool] Search: ${query}`);
        const result = await multiSearch(query, 3);
        if (!result.success) return `Error: ${result.error}`;
        if (!result.results?.length) return 'No results found.';

        return result.results
            .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.link}`)
            .join('\n\n');
    },
});

/**
 * News Search Tool - Find related news
 * TIER 3: Verify from multiple news sources
 * Now uses multi-search (Serper or SearXNG based on settings)
 */
export const newsSearchTool = new DynamicStructuredTool({
    name: 'search_news',
    description: `Search for related news articles. Use ONLY when:
- Need to verify breaking news from multiple sources
- Want to check if story is widely reported
Returns top 3 news results. Use after search_web if needed.`,
    schema: z.object({
        query: z.string().describe('News topic to search'),
    }),
    func: async ({ query }) => {
        console.log(`[Tool] News: ${query}`);
        const result = await multiSearchNews(query, 3);
        if (!result.success) return `Error: ${result.error}`;
        if (!result.results?.length) return 'No news found.';

        return result.results
            .map((r: { title: string; snippet: string }, i: number) => `${i + 1}. ${r.title}\n   ${r.snippet}`)
            .join('\n\n');
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
