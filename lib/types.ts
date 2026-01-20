// News item from RSS feed
export interface NewsItem {
    id?: string;
    title: string;
    link: string;
    source_name: string | null;
    image_url: string | null;
    content_snippet: string | null;
    pub_date: string | null;
    hash: string;
    is_posted: boolean;
    posted_platforms: string[];
    is_new?: boolean;
    fetched_at?: string;
    created_at?: string;
    updated_at?: string;
}

// Feeder settings
export interface FeederSettings {
    id?: string;
    refresh_interval: number; // in milliseconds
    is_active: boolean;
    last_fetch: string | null;
    max_retention?: number; // max articles to keep (default 100)
    freshness_hours?: number; // only fetch news from last X hours (1, 2, 6, 12, 24)
    created_at?: string;
    updated_at?: string;
}

// Fetch log entry
export interface FetchLog {
    id?: string;
    fetched_at: string;
    total_fetched: number;
    new_items: number;
    duplicates_skipped: number;
    source: string;
}

// RSS Feed item from parser
export interface RSSFeedItem {
    title?: string;
    link?: string;
    pubDate?: string;
    content?: string;
    contentSnippet?: string;
    source?: string;
    'media:content'?: { $: { url: string } };
    enclosure?: { url: string };
}

// API Response types
export interface FeedResponse {
    success: boolean;
    items: NewsItem[];
    newCount: number;
    totalCount: number;
    duplicatesSkipped?: number;
    error?: string;
}

export interface SettingsResponse {
    success: boolean;
    settings: FeederSettings | null;
    error?: string;
}

export interface FetchLogsResponse {
    success: boolean;
    logs: FetchLog[];
    error?: string;
}
