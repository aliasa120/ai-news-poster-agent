/**
 * Rate Limiter - Token Bucket Algorithm
 * 
 * Tracks requests per provider and auto-waits when limit is reached.
 * Designed for Jina AI free tier (20 req/min without API key).
 */

interface RateLimitConfig {
    requestsPerMinute: number;
}

interface BucketState {
    tokens: number;
    lastRefill: number;
}

// Default rate limits per provider
const RATE_LIMITS: Record<string, RateLimitConfig> = {
    'jina_free': { requestsPerMinute: 20 },
    'jina_api': { requestsPerMinute: 200 },
    'exa': { requestsPerMinute: 100 }, // Exa has no strict limit but we cap it
};

class RateLimiter {
    private buckets: Map<string, BucketState> = new Map();
    private configs: Record<string, RateLimitConfig>;

    constructor(configs?: Record<string, RateLimitConfig>) {
        this.configs = configs || RATE_LIMITS;
    }

    /**
     * Get or create bucket for a provider
     */
    private getBucket(provider: string): BucketState {
        if (!this.buckets.has(provider)) {
            const config = this.configs[provider] || { requestsPerMinute: 60 };
            this.buckets.set(provider, {
                tokens: config.requestsPerMinute,
                lastRefill: Date.now(),
            });
        }
        return this.buckets.get(provider)!;
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refillTokens(provider: string): void {
        const bucket = this.getBucket(provider);
        const config = this.configs[provider] || { requestsPerMinute: 60 };
        const now = Date.now();
        const elapsed = now - bucket.lastRefill;

        // Refill based on time passed (tokens per millisecond)
        const tokensToAdd = (elapsed / 60000) * config.requestsPerMinute;
        bucket.tokens = Math.min(config.requestsPerMinute, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
    }

    /**
     * Check if request can be made without waiting
     */
    canMakeRequest(provider: string): boolean {
        this.refillTokens(provider);
        const bucket = this.getBucket(provider);
        return bucket.tokens >= 1;
    }

    /**
     * Get number of available tokens
     */
    getAvailableTokens(provider: string): number {
        this.refillTokens(provider);
        const bucket = this.getBucket(provider);
        return Math.floor(bucket.tokens);
    }

    /**
     * Get time until next token is available (in ms)
     */
    getWaitTime(provider: string): number {
        this.refillTokens(provider);
        const bucket = this.getBucket(provider);

        if (bucket.tokens >= 1) return 0;

        const config = this.configs[provider] || { requestsPerMinute: 60 };
        const tokensNeeded = 1 - bucket.tokens;
        const msPerToken = 60000 / config.requestsPerMinute;
        return Math.ceil(tokensNeeded * msPerToken);
    }

    /**
     * Wait for a token to become available (async)
     * This is the key method for agent wait functionality
     */
    async waitForToken(provider: string): Promise<void> {
        const waitTime = this.getWaitTime(provider);

        if (waitTime > 0) {
            console.log(`[RateLimiter] ${provider}: Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
            await this.sleep(waitTime);
        }

        // Consume token
        this.refillTokens(provider);
        const bucket = this.getBucket(provider);
        bucket.tokens -= 1;
    }

    /**
     * Record a request (consume a token)
     */
    recordRequest(provider: string): boolean {
        this.refillTokens(provider);
        const bucket = this.getBucket(provider);

        if (bucket.tokens < 1) {
            return false; // No tokens available
        }

        bucket.tokens -= 1;
        return true;
    }

    /**
     * Reset rate limiter for a provider
     */
    reset(provider: string): void {
        this.buckets.delete(provider);
    }

    /**
     * Reset all rate limiters
     */
    resetAll(): void {
        this.buckets.clear();
    }

    /**
     * Get status for all providers
     */
    getStatus(): Record<string, { available: number; limit: number; waitTime: number }> {
        const status: Record<string, { available: number; limit: number; waitTime: number }> = {};

        for (const provider of Object.keys(this.configs)) {
            this.refillTokens(provider);
            const bucket = this.getBucket(provider);
            const config = this.configs[provider];

            status[provider] = {
                available: Math.floor(bucket.tokens),
                limit: config.requestsPerMinute,
                waitTime: this.getWaitTime(provider),
            };
        }

        return status;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Export class for testing
export { RateLimiter, RATE_LIMITS };
export type { RateLimitConfig, BucketState };
