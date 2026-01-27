// Agent settings from database
export interface AgentSettings {
    id?: string;
    batch_size: number;
    order_by: 'pub_date' | 'fetched_at' | 'created_at';
    order_direction: 'asc' | 'desc';
    model: string;
    is_active: boolean;
    auto_run_interval: number;
    scraping_provider: 'auto' | 'jina_api' | 'jina_free' | 'exa';
    search_provider: 'serper' | 'searxng' | 'auto';
    created_at?: string;
    updated_at?: string;
}

// Scraping providers
export const SCRAPING_PROVIDERS = [
    { id: 'auto', name: 'Auto (Recommended)', description: 'Automatic fallback: Jina API → Jina Free → Exa' },
    { id: 'jina_api', name: 'Jina AI (API Key)', description: '200 req/min, requires JINA_API_KEY' },
    { id: 'jina_free', name: 'Jina AI (Free)', description: '20 req/min, auto-waits when limit reached' },
    { id: 'exa', name: 'Exa AI', description: 'Requires EXA_API_KEY' },
] as const;

// Search providers
export const SEARCH_PROVIDERS = [
    { id: 'serper', name: 'Serper (Google API)', description: 'Paid Google Search API' },
    { id: 'searxng', name: 'SearXNG (Self-hosted)', description: 'Privacy-focused meta-search engine' },
    { id: 'auto', name: 'Auto', description: 'Uses Serper if available, otherwise SearXNG' },
] as const;

// Available models - Groq and Cerebras providers
export const AVAILABLE_MODELS = [
    // Groq Models
    { id: 'groq-gpt-oss-120b', name: 'GPT-OSS 120B (Groq)', description: 'Powerful reasoning' },
    { id: 'groq-llama-3.3-70b', name: 'Llama 3.3 70B (Groq)', description: 'Balanced' },
    { id: 'groq-llama-3.1-8b', name: 'Llama 3.1 8B (Groq)', description: 'Fast' },
    { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B (Groq)', description: 'User Requested' },
    // Cerebras Models (Ultra-fast inference)
    { id: 'cerebras-gpt-oss-120b', name: 'GPT-OSS 120B (Cerebras)', description: '2200 tok/s' },
    { id: 'cerebras-llama-3.3-70b', name: 'Llama 3.3 70B (Cerebras)', description: '1100 tok/s' },
] as const;

// Agent run record
export interface AgentRun {
    id?: string;
    started_at: string;
    completed_at?: string;
    articles_processed: number;
    articles_skipped: number;
    posts_generated: number;
    errors: AgentError[];
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    created_at?: string;
}

// Agent queue item
export interface AgentQueueItem {
    id?: string;
    news_item_id: string;
    run_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
    decision?: 'generate' | 'skip' | 'need_more_info';
    reasoning?: string;
    x_post?: string;
    instagram_caption?: string;
    facebook_post?: string;
    hashtags?: string[];
    tool_calls?: ToolCall[];
    error?: string;
    processed_at?: string;
    created_at?: string;
}

// Error tracking
export interface AgentError {
    article_id: string;
    error: string;
    timestamp: string;
}

// Tool call tracking
export interface ToolCall {
    tool: 'jina_reader' | 'serper_search' | 'pinecone_rag';
    input: string;
    output?: string;
    timestamp: string;
}

// LLM Analysis result
export interface ArticleAnalysis {
    has_enough_info: boolean;
    needs_verification: boolean;
    is_factual_news: boolean;
    category: string;
    key_points: string[];
    missing_info?: string[];
}

// Post generation result
export interface GeneratedPosts {
    decision: 'generate' | 'skip' | 'need_more_info';
    reasoning: string;
    x_post?: string;
    instagram_caption?: string;
    facebook_post?: string;
    hashtags?: string[];
}

// Jina Reader response
export interface JinaReaderResponse {
    success: boolean;
    content?: string;
    title?: string;
    error?: string;
}

// Serper search response
export interface SerperSearchResult {
    title: string;
    link: string;
    snippet: string;
}

export interface SerperSearchResponse {
    success: boolean;
    results?: SerperSearchResult[];
    error?: string;
}

// ==========================================
// DEEP AGENT TYPES (New Architecture)
// ==========================================

export interface PlanStep {
    id: string;
    instruction: string;
    tool?: 'search_web' | 'search_news' | 'read_article' | 'none';
    status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
    result?: string;
    reasoning?: string;
}

export interface AgentPlan {
    steps: PlanStep[];
    goal: string;
    original_query: string;
}

export interface Reflection {
    critique: string;
    score: number; // 1-10
    suggestions: string[];
    is_satisfactory: boolean;
}

export interface StepResult {
    success: boolean;
    data: string;
    error?: string;
    metadata?: Record<string, any>;
}

