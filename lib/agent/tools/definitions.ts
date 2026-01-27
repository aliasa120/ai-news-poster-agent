
/**
 * Tool Definitions for Groq API (Local Tool Calling)
 * These definitions enable the LLM to understand and call tools natively.
 */

export const GROQ_TOOL_DEFINITIONS = [
    {
        type: 'function',
        function: {
            name: 'search_web',
            description: `Search Google and read top 3 articles in PARALLEL. Use for verification, breaking news, or gathering multiple perspectives.
Returns combined content from 3 sources avoiding the need to call read_article separately.`,
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Specific search query (e.g., "Pakistan GDP 2026"). Do not just copy the title.',
                    },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'search_news',
            description: `Search SPECIFIC news sources and read top 3 articles. Use when checking story credibility or finding specific news coverage.`,
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'News topic or event name.',
                    },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'read_article',
            description: `Read the full content of a specific URL. Use when you have a link but need more details than the snippet provides.`,
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The valid URL to scrape.',
                    },
                },
                required: ['url'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_guidance',
            description: `Query the knowledge base for guidelines on how to handle specific situations (e.g., "political neutrality", "formatting").`,
            parameters: {
                type: 'object',
                properties: {
                    question: {
                        type: 'string',
                        description: 'The question about guidelines.',
                    },
                },
                required: ['question'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'find_similar',
            description: `Find previously processed articles that are similar to the current one. Helps in consistent decision making.`,
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'Current article title.',
                    },
                    source: {
                        type: 'string',
                        description: 'Source name.',
                    },
                },
                required: ['title', 'source'],
            },
        },
    },
];
