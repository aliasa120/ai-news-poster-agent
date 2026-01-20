import Parser from 'rss-parser';
import { NewsItem, RSSFeedItem } from './types';
import { generateNewsHash } from './deduplication';

// Custom parser with media and enclosure support
type CustomFeed = { items: CustomItem[] };
type CustomItem = RSSFeedItem & {
    'media:content'?: { $: { url: string } } | Array<{ $: { url: string } }>;
    'media:thumbnail'?: { $: { url: string } } | Array<{ $: { url: string } }>;
    enclosure?: { url: string; type?: string };
};

const parser: Parser<CustomFeed, CustomItem> = new Parser({
    customFields: {
        item: [
            ['media:content', 'media:content'],
            ['media:thumbnail', 'media:thumbnail'],
            ['source', 'source'],
        ],
    },
});

// Google News RSS URL for Pakistan
const GOOGLE_NEWS_RSS_URL = 'https://news.google.com/rss/search?q=pakistan&hl=en-PK&gl=PK&ceid=PK:en';

/**
 * Extract image URL from various RSS feed formats
 */
function extractImageUrl(item: CustomItem): string | null {
    // Try media:content (can be array or object)
    if (item['media:content']) {
        const mediaContent = item['media:content'];
        if (Array.isArray(mediaContent) && mediaContent.length > 0) {
            return mediaContent[0].$?.url || null;
        } else if (typeof mediaContent === 'object' && mediaContent.$?.url) {
            return mediaContent.$.url;
        }
    }

    // Try media:thumbnail
    if (item['media:thumbnail']) {
        const thumbnail = item['media:thumbnail'];
        if (Array.isArray(thumbnail) && thumbnail.length > 0) {
            return thumbnail[0].$?.url || null;
        } else if (!Array.isArray(thumbnail) && thumbnail.$?.url) {
            return thumbnail.$.url;
        }
    }

    // Try enclosure
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
        return item.enclosure.url;
    }

    return null;
}

/**
 * Extract source name from item
 */
function extractSourceName(item: CustomItem): string | null {
    if (typeof item.source === 'string') {
        return item.source;
    }
    // Google News format might have source as object
    if (item.source && typeof item.source === 'object') {
        return (item.source as unknown as { _: string })._ || null;
    }
    return null;
}

/**
 * Parse Google News RSS feed and return NewsItem array
 * @param freshnessHours - Only include articles from the last X hours (1, 2, 6, 12, 24)
 */
export async function parseGoogleNewsFeed(freshnessHours?: number): Promise<NewsItem[]> {
    // Build URL with freshness filter
    let url = GOOGLE_NEWS_RSS_URL;
    if (freshnessHours && freshnessHours > 0) {
        // Google News supports when:Xh parameter
        url = `https://news.google.com/rss/search?q=pakistan+when:${freshnessHours}h&hl=en-PK&gl=PK&ceid=PK:en`;
    }

    try {
        const feed = await parser.parseURL(url);
        const now = new Date();
        const cutoffTime = freshnessHours ? new Date(now.getTime() - freshnessHours * 60 * 60 * 1000) : null;

        const newsItems: NewsItem[] = feed.items
            .map((item) => {
                const title = item.title || 'Untitled';
                const sourceName = extractSourceName(item);
                const hash = generateNewsHash(title, sourceName);

                return {
                    title,
                    link: item.link || '',
                    source_name: sourceName,
                    image_url: extractImageUrl(item),
                    content_snippet: item.contentSnippet || item.content || null,
                    pub_date: item.pubDate || null,
                    hash,
                    is_posted: false,
                    posted_platforms: [],
                };
            })
            .filter((item) => {
                // Filter by freshness if specified
                if (cutoffTime && item.pub_date) {
                    const pubDate = new Date(item.pub_date);
                    return pubDate >= cutoffTime;
                }
                return true;
            });

        console.log(`[RSS] Fetched ${feed.items.length} articles, ${newsItems.length} within ${freshnessHours || 'unlimited'}h freshness`);
        return newsItems;
    } catch (error) {
        console.error('Error parsing RSS feed:', error);
        throw new Error(`Failed to parse RSS feed: ${error}`);
    }
}

/**
 * Get the default Google News RSS URL
 */
export function getGoogleNewsUrl(): string {
    return GOOGLE_NEWS_RSS_URL;
}

