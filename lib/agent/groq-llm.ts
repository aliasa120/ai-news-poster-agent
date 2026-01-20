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
        max_completion_tokens: 500,
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
        max_completion_tokens: 1000,
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
Available tools: ${availableTools.join(', ')}
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
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from Groq');
    }

    return JSON.parse(content);
}
