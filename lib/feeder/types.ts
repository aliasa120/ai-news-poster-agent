/**
 * Feeder Types v2
 * 
 * Updated type definitions for the agentic feeder system with proper sub-agent coordination.
 * Sub-agents only IDENTIFY matches, main agent makes all skip/keep decisions.
 */

import { z } from 'zod';

// ============================================
// Feeder Settings Schema
// ============================================

export const FeederSettingsSchema = z.object({
    // AI Provider for feeder agents
    ai_provider: z.enum(['groq', 'cerebras', 'openai']).default('groq'),
    ai_model: z.string().optional(),

    // Source filtering
    enable_source_filter: z.boolean().default(true),
    include_official_sources: z.boolean().default(true),
    include_secondary_sources: z.boolean().default(true),

    // Verification settings
    max_check_titles: z.number().min(100).max(1000).default(500),
    enable_ai_verification: z.boolean().default(true),
    batch_size: z.number().min(25).max(100).default(50),

    // Freshness
    freshness_hours: z.number().min(1).max(48).default(6),
});

export type FeederSettings = z.infer<typeof FeederSettingsSchema>;

// Default feeder settings
export const DEFAULT_FEEDER_SETTINGS: FeederSettings = {
    ai_provider: 'groq',
    ai_model: undefined,
    enable_source_filter: true,
    include_official_sources: true,
    include_secondary_sources: true,
    max_check_titles: 500,
    enable_ai_verification: true,
    batch_size: 50,
    freshness_hours: 6,
};

// ============================================
// Article Types
// ============================================

export interface FeederArticle {
    id?: string;
    guid: string | null;
    title: string;
    link: string;
    source_name: string | null;
    image_url: string | null;
    content_snippet: string | null;
    pub_date: string | null;
    hash: string;
    is_posted: boolean;
    posted_platforms: string[];
    fingerprint?: string; // Optional L4 NER Fingerprint
}

export interface ExistingTitle {
    id: string;
    title: string;
    content_snippet: string | null;
    source_name: string | null;
    pub_date: string | null;
}

// ============================================
// Sub-Agent Types - IDENTIFICATION ONLY (no skip decisions)
// ============================================

/**
 * A single match found by a sub-agent
 * The sub-agent identifies which existing title matches, but doesn't skip anything
 */
export interface TitleMatch {
    existingTitleId: string;
    existingTitle: string;
    matchType: 'DUPLICATE' | 'UPDATE';
    confidence: number;  // 0.0 to 1.0
    reason: string;      // Why this was identified as a match
}

/**
 * Result from a single sub-agent
 * Contains ALL matches found within its assigned batch
 */
export interface SubAgentResult {
    agentId: string;
    batchIndex: number;
    batchStart: number;
    batchEnd: number;
    matchingTitles: TitleMatch[];
    tokensUsed: number;
    processingTimeMs: number;
    error?: string;
}

// Zod schema for LLM structured output
export const TitleMatchSchema = z.object({
    existingTitleId: z.string().describe('ID of the matching existing title'),
    existingTitle: z.string().describe('The existing title text that matches'),
    matchType: z.enum(['DUPLICATE', 'UPDATE']).describe(
        'DUPLICATE = same story, same information. UPDATE = same story, new information (changed numbers, new developments)'
    ),
    confidence: z.number().min(0).max(1).describe('Confidence score from 0.0 to 1.0'),
    reason: z.string().describe('Brief explanation of why this is a match'),
});

export const SubAgentOutputSchema = z.object({
    matchingTitles: z.array(TitleMatchSchema).describe(
        'List of existing titles that match the new article. Empty if no matches found.'
    ),
});

export type SubAgentOutput = z.infer<typeof SubAgentOutputSchema>;

// ============================================
// Aggregated Result Types (Main Agent Decision)
// ============================================

/**
 * Final verdict for an article, made by the main agent after aggregating all sub-agent results
 */
export interface AggregatedVerdict {
    articleId: string;
    articleTitle: string;
    verdict: 'UNIQUE' | 'UPDATE' | 'DUPLICATE';
    matchedWithId?: string;        // ID of the matched existing article
    matchedWithTitle?: string;     // Title of the matched existing article
    matchType?: 'DUPLICATE' | 'UPDATE';
    confidence?: number;
    identifiedByAgent?: string;    // Which sub-agent found the match
    reason?: string;
}

// ============================================
// Pipeline State Types
// ============================================

export interface PipelineState {
    // Input
    candidateArticles: FeederArticle[];
    existingTitles: ExistingTitle[];
    settings: FeederSettings;

    // Processing stages
    stage: 'fetching' | 'guid_check' | 'hash_check' | 'ai_verification' | 'saving' | 'complete';
    currentArticleIndex: number;

    // Sub-agent coordination
    subAgentResults: SubAgentResult[];
    aggregatedVerdicts: AggregatedVerdict[];

    // Output
    uniqueArticles: FeederArticle[];
    updateArticles: FeederArticle[];
    duplicateArticles: FeederArticle[];

    // Stats
    stats: ProcessingStats;
    errors: string[];
}

// ============================================
// Processing Result Types
// ============================================

export interface ProcessingStats {
    total_fetched: number;
    source_filtered: number;
    guid_skipped: number;
    hash_skipped: number;
    ai_duplicates: number;
    ai_updates: number;
    ai_unique: number;
    ai_skipped: number;  // AI verification was skipped (disabled or error)
    final_saved: number;
    tokens_used: number;
    sub_agents_spawned: number;
    processing_time_ms: number;
}

export interface FeederResult {
    success: boolean;
    articles: FeederArticle[];
    stats: ProcessingStats;
    verdicts: AggregatedVerdict[];
    error?: string;
}

// ============================================
// AI Provider Models
// ============================================

export const AI_MODELS = {
    groq: [
        { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Fast)' },
        { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Latest)' },
        { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B' },
        { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32K context)' },
    ],
    cerebras: [
        { value: 'gpt-oss-120b', label: 'GPT-OSS 120B (2200 tok/s)' },
        { value: 'llama-3.3-70b', label: 'Llama 3.3 70B (1100 tok/s)' },
        { value: 'llama3.1-8b', label: 'Llama 3.1 8B (2100 tok/s)' },
    ],
    openai: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
        { value: 'gpt-4o', label: 'GPT-4o (Best)' },
    ],
};

export type AIProvider = keyof typeof AI_MODELS;

// ============================================
// Progress Callback Type
// ============================================

export type ProgressCallback = (update: {
    stage: string;
    message: string;
    progress?: number;  // 0-100
    subAgentId?: string;
}) => void;
