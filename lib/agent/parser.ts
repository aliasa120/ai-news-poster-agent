/**
 * Agent Response Parser
 * 
 * Parses and validates LLM responses, handles fallbacks.
 */

import { NewsItem } from '../types';
import { ToolCall } from './types';
import { createFallbackXPost, createFallbackInstagram, createFallbackFacebook } from './prompts';

// ============= TYPES =============

export interface ParsedResponse {
    tier_used?: number;
    decision: string;
    reasoning: string;
    x_post?: string | null;
    instagram_caption?: string | null;
    facebook_post?: string | null;
    hashtags?: string[];
}

export interface GeneratedPosts {
    xPost: string;
    instagram: string;
    facebook: string;
    hashtags: string[];
    reasoning: string;
    tierUsed: 1 | 2 | 3 | 4;
    isFallback: boolean;
}

// ============= PARSER =============

/**
 * Parse the agent's response content to extract JSON
 */
export function parseAgentResponse(content: string): ParsedResponse | null {
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch {
        return null;
    }
}

// ============= TIER CALCULATION =============

/**
 * Calculate tier based on actual tool usage (not LLM's self-report)
 */
export function calculateTier(toolCount: number, decision: string): 1 | 2 | 3 | 4 {
    if (decision === 'skip') return 4;
    if (toolCount === 0) return 1;
    if (toolCount === 1) return 2;
    return 3;
}

// ============= FALLBACK GENERATION =============

/**
 * Create fallback posts when parsing fails
 */
export function createFallbackPosts(article: NewsItem, toolCalls: ToolCall[]): GeneratedPosts {
    const tierUsed = calculateTier(toolCalls.length, 'generate');

    return {
        xPost: createFallbackXPost(article),
        instagram: createFallbackInstagram(article),
        facebook: createFallbackFacebook(article),
        hashtags: ['PakistanNews', 'BreakingNews'],
        reasoning: 'Fallback posts created from title (parse error)',
        tierUsed,
        isFallback: true,
    };
}

/**
 * Force generation when LLM tries to skip
 */
export function forceGeneration(
    article: NewsItem,
    parsed: ParsedResponse,
    toolCalls: ToolCall[]
): GeneratedPosts {
    const tierUsed = calculateTier(toolCalls.length, 'generate');

    return {
        xPost: parsed.x_post || createFallbackXPost(article),
        instagram: parsed.instagram_caption || createFallbackInstagram(article),
        facebook: parsed.facebook_post || createFallbackFacebook(article),
        hashtags: parsed.hashtags || ['PakistanNews', 'BreakingNews'],
        reasoning: parsed.reasoning || 'Forced generation',
        tierUsed,
        isFallback: true,
    };
}

/**
 * Extract posts from successful parse
 */
export function extractPosts(
    parsed: ParsedResponse,
    toolCalls: ToolCall[]
): GeneratedPosts {
    const tierUsed = calculateTier(toolCalls.length, parsed.decision);

    return {
        xPost: parsed.x_post || '',
        instagram: parsed.instagram_caption || '',
        facebook: parsed.facebook_post || '',
        hashtags: parsed.hashtags || ['PakistanNews'],
        reasoning: parsed.reasoning,
        tierUsed,
        isFallback: false,
    };
}
