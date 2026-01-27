import Groq from 'groq-sdk';
import { ArticleAnalysis, GeneratedPosts } from './types';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Default model - can be overridden by settings
const DEFAULT_MODEL = 'moonshotai/kimi-k2-instruct-0905';

/**
 * Analyze article to determine if we have enough info
 */
export async function analyzeArticle(
    title: string,
    snippet: string,
    source: string,
    model: string = DEFAULT_MODEL
): Promise<ArticleAnalysis> {
    const response = await groq.chat.completions.create({
        model,
        messages: [
            {
                role: 'system',
                content: `You are a news analysis AI. Analyze the given news article and determine:
1. If there's enough information to write social media posts
2. If the news needs verification
3. If it's factual news (not opinion)
4. The category of news
5. Key points to highlight

Respond in JSON format only.`,
            },
            {
                role: 'user',
                content: `Title: ${title}
Source: ${source}
Content: ${snippet || 'No content available'}`,
            },
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'article_analysis',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        has_enough_info: { type: 'boolean' },
                        needs_verification: { type: 'boolean' },
                        is_factual_news: { type: 'boolean' },
                        category: {
                            type: 'string',
                            enum: ['politics', 'sports', 'business', 'technology', 'entertainment', 'health', 'world', 'science', 'other']
                        },
                        key_points: { type: 'array', items: { type: 'string' } },
                        missing_info: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['has_enough_info', 'needs_verification', 'is_factual_news', 'category', 'key_points', 'missing_info'],
                    additionalProperties: false,
                },
            },
        },
        temperature: 0.3,
        max_completion_tokens: 1000,
        reasoning_format: 'parsed', // Enable reasoning capture
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from Groq');
    }

    return JSON.parse(content) as ArticleAnalysis;
}

/**
 * Generate social media posts for all platforms
 */
export async function generatePosts(
    title: string,
    content: string,
    source: string,
    category: string,
    additionalContext?: string,
    model: string = DEFAULT_MODEL
): Promise<GeneratedPosts> {
    const response = await groq.chat.completions.create({
        model,
        messages: [
            {
                role: 'system',
                content: `You are a social media content creator for Pakistan news.
Generate posts for X (Twitter), Instagram, and Facebook.

RULES:
- X post: Max 280 characters, include 2-3 hashtags
- Instagram caption: Engaging, can be longer, use relevant emojis
- Facebook post: Full paragraph, professional tone
- All posts must be factual and neutral
- Include source attribution
- Use Pakistan-relevant hashtags

If news is not suitable for posting (opinion, unverifiable, sensitive), set decision to "skip".

Respond in JSON format only.`,
            },
            {
                role: 'user',
                content: `Title: ${title}
Source: ${source}
Category: ${category}
Content: ${content}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}`,
            },
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'generated_posts',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        decision: {
                            type: 'string',
                            enum: ['generate', 'skip', 'need_more_info']
                        },
                        reasoning: { type: 'string' },
                        x_post: { type: ['string', 'null'] },
                        instagram_caption: { type: ['string', 'null'] },
                        facebook_post: { type: ['string', 'null'] },
                        hashtags: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['decision', 'reasoning', 'x_post', 'instagram_caption', 'facebook_post', 'hashtags'],
                    additionalProperties: false,
                },
            },
        },
        temperature: 0.7,
        max_completion_tokens: 2000,
        reasoning_format: 'parsed',
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
        throw new Error('No response from Groq');
    }

    return JSON.parse(responseContent) as GeneratedPosts;
}

/**
 * Decide next action when agent is stuck
 */
export async function decideNextAction(
    situation: string,
    availableTools: string[],
    previousAttempts: string[],
    model: string = DEFAULT_MODEL
): Promise<{ action: string; tool?: string; reason: string }> {
    const response = await groq.chat.completions.create({
        model,
        messages: [
            {
                role: 'system',
                content: `You are an AI agent deciding what to do next.
Available tools: ${JSON.stringify(GROQ_TOOL_DEFINITIONS, null, 2)}
Previous attempts: ${previousAttempts.join(', ') || 'None'}

Decide the best next action. Respond in JSON format.`,
            },
            {
                role: 'user',
                content: situation,
            },
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'next_action',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['use_tool', 'generate_posts', 'skip_article', 'query_knowledge']
                        },
                        tool: { type: ['string', 'null'] },
                        reason: { type: 'string' },
                    },
                    required: ['action', 'tool', 'reason'],
                    additionalProperties: false,
                },
            },
        },
        temperature: 0.3,
        max_completion_tokens: 300,
        reasoning_format: 'parsed',
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from Groq');
    }

    return JSON.parse(content);
}

/**
 * Generate a research plan for the Deep Agent
 */
// Import tool definitions
import { GROQ_TOOL_DEFINITIONS } from './tools/definitions';
import { AgentPlan } from './types';

export async function generatePlan(
    goal: string,
    context: string,
    model: string = DEFAULT_MODEL
): Promise<AgentPlan> {
    const response = await groq.chat.completions.create({
        model,
        messages: [
            {
                role: 'system',
                content: `You are a Senior Editor and Research Planner.
Break down the user's news request into a concrete list of research steps.

AVAILABLE TOOLS (JSON Schema Definitions):
${JSON.stringify(GROQ_TOOL_DEFINITIONS, null, 2)}

- CRITICAL: Queries MUST be keyword-based strings suitable for a search engine. 
- ABSOLUTELY FORBIDDEN to use: "Search for", "Find", "Look up", "Check if".
- NEVER include the tool name (e.g., "search_web") or the word "query" in the instruction.
- The "instruction" field is the RAW QUERY passed to Google.

    Examples:
    - User: "Check if the strike is over"
    - Planner Step: "strike update latest news" 
      (NOT: "Search if strike is over", NOT: "search_web query strike")
    
    - User: "Who won the match?"
    - Planner Step: "match winner result"
    
    - Planner Step: "match winner result"
    
    - User: "Compare prices of X and Y"
    - Planner Step 1: "X price specs"
    - Planner Step 2: "Y price specs"

- RULE: LIMIT PLAN TO MAX 3 STEPS.
- RULE: Do NOT use 'read_article' unless you have a specific "https://" URL in the Context. If no URL, use 'search_web'.
- RULE: COMBINE SEARCHES. Do not create separate steps for related info.
    - BAD: Step 1: "search inflation", Step 2: "search rate", Step 3: "search reaction"
    - GOOD: Step 1: "search_web query Pakistan inflation rate reaction 2026"

Respond in JSON format matching the AgentPlan schema.`,
            },
            {
                role: 'user',
                content: `Goal: ${goal}
Context: ${context || 'None'}`,
            },
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'agent_plan',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        goal: { type: 'string' },
                        original_query: { type: 'string' },
                        steps: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    instruction: { type: 'string' },
                                    tool: {
                                        type: 'string',
                                        enum: ['search_web', 'search_news', 'read_article', 'find_similar', 'get_guidance', 'none']
                                    },
                                    status: { type: 'string', enum: ['pending'] },
                                },
                                required: ['id', 'instruction', 'tool', 'status'],
                                additionalProperties: false,
                            },
                        },
                    },
                    required: ['goal', 'original_query', 'steps'],
                    additionalProperties: false,
                },
            },
        },
        temperature: 0.5,
        reasoning_format: 'parsed',
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from Groq');
    }

    return JSON.parse(content) as AgentPlan;
}

/**
 * Reflect on the generated post
 */
import { Reflection } from './types';

export async function reflectOnPost(
    goal: string,
    post: any,
    context: string,
    model: string = DEFAULT_MODEL
): Promise<Reflection> {
    const response = await groq.chat.completions.create({
        model,
        messages: [
            {
                role: 'system',
                content: `You are a strict Quality Assurance Editor.
Review the generated social media posts against the goal and context.

CRITERIA:
1. Accuracy: Does it reflect the source facts?
2. tone: Is it neutral and professional?
3. goal: Does it answer the user's request?
4. Safety: No hate speech or unverified rumors.

CRITICAL: You MUST include "is_satisfactory": true/false in your JSON.

EXAMPLE OUTPUT:
{
    "critique": "The post aligns with the source...",
    "score": 8,
    "suggestions": ["Add hashtags"],
    "is_satisfactory": true
}

Respond in JSON format matching the Reflection schema.`,
            },
            {
                role: 'user',
                content: `Goal: ${goal}
Generated Posts: ${JSON.stringify(post)}
Source Context: ${context.substring(0, 2000)}...`, // Truncate context to save tokens
            },
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'reflection',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        critique: { type: 'string' },
                        score: { type: 'number', description: '1-10 score' },
                        suggestions: { type: 'array', items: { type: 'string' } },
                        is_satisfactory: { type: 'boolean' },
                    },
                    required: ['critique', 'score', 'suggestions', 'is_satisfactory'],
                    additionalProperties: false,
                },
            },
        },
        temperature: 0.3,
        reasoning_format: 'parsed',
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from Groq');
    }

    return JSON.parse(content) as Reflection;
}
