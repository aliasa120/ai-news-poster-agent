/**
 * Trusted News Sources Configuration
 * 
 * Defines the sources for Pakistani news fetched from Google News.
 * The query is built using (site:domain) syntax to filter directly at source.
 */

export interface NewsSource {
    name: string;
    domain: string;
    priority: 'main' | 'secondary' | 'official';
}

// Main Pakistani Sources - Most trusted local news
export const MAIN_SOURCES: NewsSource[] = [
    { name: 'Geo News', domain: 'geo.tv', priority: 'main' },
    { name: 'ARY News', domain: 'arynews.tv', priority: 'main' },
    { name: 'Dawn', domain: 'dawn.com', priority: 'main' },
    { name: 'The Express Tribune', domain: 'tribune.com.pk', priority: 'main' },
    { name: 'The News International', domain: 'thenews.com.pk', priority: 'main' },
    { name: 'Samaa TV', domain: 'samaa.tv', priority: 'main' },
    { name: 'Dunya News', domain: 'dunyanews.tv', priority: 'main' },
    { name: '92 News', domain: '92newshd.tv', priority: 'main' },
    { name: 'Bol News', domain: 'bolnews.com', priority: 'main' },
    { name: 'Pakistan Today', domain: 'pakistantoday.com.pk', priority: 'main' },
    { name: 'Business Recorder', domain: 'brecorder.com', priority: 'main' },
    { name: 'Daily Times', domain: 'dailytimes.com.pk', priority: 'main' },
    { name: 'ProPakistani', domain: 'propakistani.pk', priority: 'main' },
];

// Secondary International Sources - Cover Pakistan frequently
export const SECONDARY_SOURCES: NewsSource[] = [
    { name: 'Al Jazeera', domain: 'aljazeera.com', priority: 'secondary' },
    { name: 'BBC', domain: 'bbc.com', priority: 'secondary' },
    { name: 'Reuters', domain: 'reuters.com', priority: 'secondary' },
    { name: 'Arab News Pakistan', domain: 'arabnews.pk', priority: 'secondary' },
];

// Official Government Sources - Pakistani government channels
export const OFFICIAL_SOURCES: NewsSource[] = [
    { name: 'ISPR', domain: 'ispr.gov.pk', priority: 'official' },
    { name: 'Radio Pakistan', domain: 'radio.gov.pk', priority: 'official' },
    { name: 'PTV News', domain: 'ptv.com.pk', priority: 'official' },
    { name: 'APP', domain: 'app.com.pk', priority: 'official' },
];

// All sources combined
export const ALL_SOURCES: NewsSource[] = [
    ...MAIN_SOURCES,
    ...SECONDARY_SOURCES,
    ...OFFICIAL_SOURCES,
];

/**
 * Get all source domains as a flat array
 */
export function getAllDomains(): string[] {
    return ALL_SOURCES.map(s => s.domain);
}

/**
 * Get only main source domains
 */
export function getMainDomains(): string[] {
    return MAIN_SOURCES.map(s => s.domain);
}

/**
 * Build a Google News site: filter query string
 * Example output: "(site:dawn.com OR site:geo.tv OR site:tribune.com.pk)"
 * 
 * @param includeSecondary - Include international sources (default: true)
 * @param includeOfficial - Include government sources (default: true)
 */
export function buildSiteFilterQuery(
    includeSecondary: boolean = true,
    includeOfficial: boolean = true
): string {
    let sources = [...MAIN_SOURCES];

    if (includeSecondary) {
        sources = [...sources, ...SECONDARY_SOURCES];
    }

    if (includeOfficial) {
        sources = [...sources, ...OFFICIAL_SOURCES];
    }

    const siteFilters = sources.map(s => `site:${s.domain}`).join(' OR ');
    return `(${siteFilters})`;
}

/**
 * Check if a source is trusted based on filtering options
 * @param sourceOrUrl - Source name or URL to check
 * @param includeOfficial - Include official government sources (default: true)
 * @param includeSecondary - Include secondary international sources (default: true)
 */
export function isTrustedSource(
    sourceOrUrl: string,
    includeOfficial: boolean = true,
    includeSecondary: boolean = true
): boolean {
    const input = sourceOrUrl.toLowerCase();

    // Build list of allowed sources based on filters
    let allowedSources = [...MAIN_SOURCES]; // Main sources always included

    if (includeSecondary) {
        allowedSources = [...allowedSources, ...SECONDARY_SOURCES];
    }

    if (includeOfficial) {
        allowedSources = [...allowedSources, ...OFFICIAL_SOURCES];
    }

    // Check if input matches any allowed source
    // Handle both URLs and source names
    if (input.startsWith('http')) {
        try {
            const hostname = new URL(input).hostname.toLowerCase();
            return allowedSources.some(s => hostname.includes(s.domain) || hostname.endsWith(s.domain));
        } catch {
            return false;
        }
    } else {
        // Check against source names (case insensitive)
        return allowedSources.some(s =>
            input.includes(s.name.toLowerCase()) ||
            input.includes(s.domain) ||
            s.name.toLowerCase().includes(input)
        );
    }
}

/**
 * Get source info by domain
 */
export function getSourceByDomain(url: string): NewsSource | null {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return ALL_SOURCES.find(s => hostname.includes(s.domain)) || null;
    } catch {
        return null;
    }
}
