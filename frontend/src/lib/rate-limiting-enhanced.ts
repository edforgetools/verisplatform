/**
 * Enhanced Rate Limiting System
 *
 * This module provides comprehensive rate limiting functionality including:
 * - Token bucket algorithm
 * - Sliding window rate limiting
 * - Distributed rate limiting with Redis
 * - Rate limiting by user, IP, and endpoint
 * - Adaptive rate limiting
 * - Rate limit monitoring and analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";

// =============================================================================
// RATE LIMITING INTERFACES
// =============================================================================

export interface RateLimitConfig {
  // Basic limits
  requests: number;
  windowMs: number;

  // Advanced options
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;

  // Adaptive options
  adaptive?: boolean;
  minRequests?: number;
  maxRequests?: number;

  // Monitoring
  trackUsage?: boolean;
  alertThreshold?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
  windowStart: number;
  retryAfter?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitStats {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  averageResponseTime: number;
  lastReset: number;
}

// =============================================================================
// RATE LIMITING ALGORITHMS
// =============================================================================

/**
 * Token Bucket Rate Limiter
 */
class TokenBucketLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private capacity: number,
    private refillRate: number, // tokens per second
    private windowMs: number,
  ) {}

  async checkLimit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key) || { tokens: this.capacity, lastRefill: now };

    // Calculate tokens to add based on time elapsed
    const timeElapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timeElapsed * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if request is allowed
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.buckets.set(key, bucket);

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime: now + this.windowMs,
        totalRequests: this.capacity - bucket.tokens,
        windowStart: now,
      };
    } else {
      this.buckets.set(key, bucket);
      const retryAfter = Math.ceil((1 - bucket.tokens) / this.refillRate);

      return {
        allowed: false,
        remaining: 0,
        resetTime: now + this.windowMs,
        totalRequests: this.capacity,
        windowStart: now,
        retryAfter,
      };
    }
  }

  getStats(key: string): RateLimitStats | null {
    const bucket = this.buckets.get(key);
    if (!bucket) return null;

    return {
      totalRequests: this.capacity - bucket.tokens,
      allowedRequests: this.capacity - bucket.tokens,
      blockedRequests: 0, // Token bucket doesn't track blocked requests
      averageResponseTime: 0,
      lastReset: bucket.lastRefill,
    };
  }
}

/**
 * Sliding Window Rate Limiter
 */
class SlidingWindowLimiter {
  private windows = new Map<string, number[]>();

  constructor(private limit: number, private windowMs: number) {}

  async checkLimit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this key
    const requests = this.windows.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter((timestamp) => timestamp > windowStart);

    // Check if we can add a new request
    if (validRequests.length < this.limit) {
      validRequests.push(now);
      this.windows.set(key, validRequests);

      return {
        allowed: true,
        remaining: this.limit - validRequests.length,
        resetTime: validRequests[0] + this.windowMs,
        totalRequests: validRequests.length,
        windowStart,
      };
    } else {
      // Request blocked
      const retryAfter = validRequests[0] + this.windowMs - now;

      return {
        allowed: false,
        remaining: 0,
        resetTime: validRequests[0] + this.windowMs,
        totalRequests: validRequests.length,
        windowStart,
        retryAfter: Math.max(0, retryAfter),
      };
    }
  }

  getStats(key: string): RateLimitStats | null {
    const requests = this.windows.get(key);
    if (!requests) return null;

    const now = Date.now();
    const windowStart = now - this.windowMs;
    const validRequests = requests.filter((timestamp) => timestamp > windowStart);

    return {
      totalRequests: validRequests.length,
      allowedRequests: validRequests.length,
      blockedRequests: 0, // Sliding window doesn't track blocked requests
      averageResponseTime: 0,
      lastReset: windowStart,
    };
  }
}

/**
 * Redis-based Distributed Rate Limiter
 */
class RedisRateLimiter {
  private redis: any = null;

  constructor(private limit: number, private windowMs: number) {}

  private async getRedis() {
    if (this.redis) return this.redis;

    const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
    if (!url) return null;

    try {
      const { default: Redis } = await import("ioredis");
      this.redis = new Redis(url);
      return this.redis;
    } catch (error) {
      logger.error({ event: "redis_connection_failed", error }, "Failed to connect to Redis");
      return null;
    }
  }

  async checkLimit(key: string): Promise<RateLimitResult> {
    const redis = await this.getRedis();
    if (!redis) {
      // Fallback to in-memory limiting
      return this.fallbackCheckLimit(key);
    }

    try {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline();

      // Remove old entries
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiration
      pipeline.expire(key, Math.ceil(this.windowMs / 1000));

      const results = await pipeline.exec();
      const currentCount = results[1][1] as number;

      if (currentCount < this.limit) {
        return {
          allowed: true,
          remaining: this.limit - currentCount - 1,
          resetTime: now + this.windowMs,
          totalRequests: currentCount + 1,
          windowStart,
        };
      } else {
        // Get oldest request to calculate retry after
        const oldestRequest = await redis.zrange(key, 0, 0, "WITHSCORES");
        const retryAfter =
          oldestRequest.length > 0 ? parseInt(oldestRequest[1]) + this.windowMs - now : 0;

        return {
          allowed: false,
          remaining: 0,
          resetTime: now + this.windowMs,
          totalRequests: currentCount,
          windowStart,
          retryAfter: Math.max(0, retryAfter),
        };
      }
    } catch (error) {
      logger.error({ event: "redis_rate_limit_error", error }, "Redis rate limit error");
      return this.fallbackCheckLimit(key);
    }
  }

  private fallbackCheckLimit(key: string): RateLimitResult {
    // Simple fallback - allow all requests
    return {
      allowed: true,
      remaining: this.limit - 1,
      resetTime: Date.now() + this.windowMs,
      totalRequests: 1,
      windowStart: Date.now(),
    };
  }

  async getStats(key: string): Promise<RateLimitStats | null> {
    const redis = await this.getRedis();
    if (!redis) return null;

    try {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      const count = await redis.zcount(key, windowStart, now);

      return {
        totalRequests: count,
        allowedRequests: count,
        blockedRequests: 0,
        averageResponseTime: 0,
        lastReset: windowStart,
      };
    } catch (error) {
      logger.error({ event: "redis_stats_error", error }, "Redis stats error");
      return null;
    }
  }
}

// =============================================================================
// RATE LIMITING SERVICE
// =============================================================================

class RateLimitingService {
  private limiters = new Map<
    string,
    TokenBucketLimiter | SlidingWindowLimiter | RedisRateLimiter
  >();
  private stats = new Map<string, RateLimitStats>();
  private adaptiveConfigs = new Map<string, RateLimitConfig>();

  /**
   * Create or get a rate limiter for a specific key
   */
  private getLimiter(
    key: string,
    config: RateLimitConfig,
  ): TokenBucketLimiter | SlidingWindowLimiter | RedisRateLimiter {
    const limiterKey = `${key}:${config.requests}:${config.windowMs}`;

    if (!this.limiters.has(limiterKey)) {
      // Choose algorithm based on configuration
      if (config.adaptive) {
        // Use token bucket for adaptive rate limiting
        const limiter = new TokenBucketLimiter(
          config.requests,
          config.requests / (config.windowMs / 1000),
          config.windowMs,
        );
        this.limiters.set(limiterKey, limiter);
      } else {
        // Use sliding window for standard rate limiting
        const limiter = new SlidingWindowLimiter(config.requests, config.windowMs);
        this.limiters.set(limiterKey, limiter);
      }
    }

    return this.limiters.get(limiterKey)!;
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig,
    request: NextRequest,
  ): Promise<RateLimitResult> {
    const limiter = this.getLimiter(key, config);
    const result = await limiter.checkLimit(key);

    // Update statistics
    if (config.trackUsage) {
      this.updateStats(key, result);
    }

    // Adaptive rate limiting
    if (config.adaptive) {
      await this.updateAdaptiveConfig(key, config, result, request);
    }

    // Log rate limit events
    if (!result.allowed) {
      logger.warn(
        {
          event: "rate_limit_exceeded",
          key: key.substring(0, 10) + "...", // Truncate for privacy
          limit: config.requests,
          windowMs: config.windowMs,
          remaining: result.remaining,
          retryAfter: result.retryAfter,
        },
        "Rate limit exceeded",
      );
    }

    return result;
  }

  /**
   * Update statistics
   */
  private updateStats(key: string, result: RateLimitResult): void {
    const currentStats = this.stats.get(key) || {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      lastReset: Date.now(),
    };

    currentStats.totalRequests++;
    if (result.allowed) {
      currentStats.allowedRequests++;
    } else {
      currentStats.blockedRequests++;
    }

    this.stats.set(key, currentStats);
  }

  /**
   * Update adaptive configuration based on performance
   */
  private async updateAdaptiveConfig(
    key: string,
    config: RateLimitConfig,
    result: RateLimitResult,
    request: NextRequest,
  ): Promise<void> {
    if (!config.adaptive || !config.minRequests || !config.maxRequests) {
      return;
    }

    const stats = this.stats.get(key);
    if (!stats) return;

    // Calculate success rate
    const successRate = stats.allowedRequests / stats.totalRequests;

    // Adjust rate limit based on success rate
    if (successRate > 0.95 && config.requests < config.maxRequests) {
      // Increase rate limit
      config.requests = Math.min(config.maxRequests, Math.ceil(config.requests * 1.1));
    } else if (successRate < 0.8 && config.requests > config.minRequests) {
      // Decrease rate limit
      config.requests = Math.max(config.minRequests, Math.floor(config.requests * 0.9));
    }

    this.adaptiveConfigs.set(key, config);
  }

  /**
   * Get rate limit statistics
   */
  getStats(key: string): RateLimitStats | null {
    return this.stats.get(key) || null;
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string): Promise<void> {
    // Remove from all limiters
    for (const [limiterKey, limiter] of this.limiters) {
      if (limiterKey.startsWith(key)) {
        this.limiters.delete(limiterKey);
      }
    }

    // Remove statistics
    this.stats.delete(key);
    this.adaptiveConfigs.delete(key);
  }

  /**
   * Get rate limit info for headers
   */
  getRateLimitInfo(key: string, config: RateLimitConfig, result: RateLimitResult): RateLimitInfo {
    return {
      limit: config.requests,
      remaining: result.remaining,
      resetTime: result.resetTime,
      retryAfter: result.retryAfter,
    };
  }
}

// =============================================================================
// RATE LIMITING MIDDLEWARE
// =============================================================================

const rateLimitingService = new RateLimitingService();

/**
 * Default key generators
 */
export const keyGenerators = {
  ip: (req: NextRequest) => {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    return `ip:${ip}`;
  },

  user: (req: NextRequest) => {
    const userId = req.headers.get("x-user-id") || "anonymous";
    return `user:${userId}`;
  },

  ipAndUser: (req: NextRequest) => {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userId = req.headers.get("x-user-id") || "anonymous";
    return `ip:${ip}:user:${userId}`;
  },

  endpoint: (req: NextRequest) => {
    const url = new URL(req.url);
    return `endpoint:${req.method}:${url.pathname}`;
  },

  ipAndEndpoint: (req: NextRequest) => {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const url = new URL(req.url);
    return `ip:${ip}:endpoint:${req.method}:${url.pathname}`;
  },
};

/**
 * Enhanced rate limiting middleware
 */
export function withEnhancedRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const keyGenerator = config.keyGenerator || keyGenerators.ipAndEndpoint;
    const key = keyGenerator(req);

    try {
      const result = await rateLimitingService.checkRateLimit(key, config, req);
      const rateLimitInfo = rateLimitingService.getRateLimitInfo(key, config, result);

      if (!result.allowed) {
        const response = NextResponse.json(
          {
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: "Too many requests",
              retryAfter: result.retryAfter,
            },
            meta: {
              timestamp: new Date().toISOString(),
              rateLimit: rateLimitInfo,
            },
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": rateLimitInfo.limit.toString(),
              "X-RateLimit-Remaining": rateLimitInfo.remaining.toString(),
              "X-RateLimit-Reset": rateLimitInfo.resetTime.toString(),
              "Retry-After": result.retryAfter?.toString() || "60",
            },
          },
        );

        return response;
      }

      // Call the actual handler
      const response = await handler(req);

      // Add rate limit headers to successful responses
      response.headers.set("X-RateLimit-Limit", rateLimitInfo.limit.toString());
      response.headers.set("X-RateLimit-Remaining", rateLimitInfo.remaining.toString());
      response.headers.set("X-RateLimit-Reset", rateLimitInfo.resetTime.toString());

      return response;
    } catch (error) {
      logger.error(
        {
          event: "rate_limit_error",
          key: key.substring(0, 10) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
        "Rate limiting error",
      );

      // On error, allow the request to proceed
      return handler(req);
    }
  };
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // Strict rate limiting for sensitive endpoints
  strict: {
    requests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: keyGenerators.ipAndUser,
    trackUsage: true,
  },

  // Standard rate limiting for API endpoints
  standard: {
    requests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: keyGenerators.ipAndEndpoint,
    trackUsage: true,
  },

  // Relaxed rate limiting for public endpoints
  relaxed: {
    requests: 1000,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: keyGenerators.ip,
    trackUsage: true,
  },

  // Adaptive rate limiting
  adaptive: {
    requests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: keyGenerators.ipAndUser,
    adaptive: true,
    minRequests: 10,
    maxRequests: 500,
    trackUsage: true,
  },

  // File upload rate limiting
  fileUpload: {
    requests: 5,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: keyGenerators.ipAndUser,
    trackUsage: true,
  },

  // Authentication rate limiting
  auth: {
    requests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyGenerator: keyGenerators.ip,
    trackUsage: true,
  },
};

/**
 * Utility function to get rate limit statistics
 */
export function getRateLimitStats(key: string): RateLimitStats | null {
  return rateLimitingService.getStats(key);
}

/**
 * Utility function to reset rate limit
 */
export async function resetRateLimit(key: string): Promise<void> {
  return rateLimitingService.resetRateLimit(key);
}
