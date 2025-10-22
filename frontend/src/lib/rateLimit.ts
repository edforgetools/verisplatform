import { NextRequest, NextResponse } from 'next/server';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  capacity: number; // Maximum tokens
  refillRate: number; // Tokens per second
  windowMs: number; // Time window in milliseconds
}

// In-memory storage for token buckets
const buckets = new Map<string, TokenBucket>();

// Default rate limit configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  capacity: 10, // 10 requests
  refillRate: 1, // 1 token per second
  windowMs: 60000, // 1 minute window
};

// Redis client (optional, behind env flag)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;

// Initialize Redis if enabled (only in server environment)
// This is done lazily to avoid build-time module resolution issues
let redisInitialized = false;

async function initializeRedis() {
  if (
    redisInitialized ||
    !process.env.REDIS_URL ||
    typeof window !== 'undefined'
  ) {
    return;
  }

  try {
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(process.env.REDIS_URL!);
    redisInitialized = true;
  } catch {
    console.warn(
      'Redis not available, falling back to in-memory rate limiting',
    );
  }
}

/**
 * Generate a unique key for rate limiting based on IP and route
 */
function getRateLimitKey(ip: string, route: string): string {
  return `rate_limit:${ip}:${route}`;
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  // Fallback to connection IP (may not work in all environments)
  return 'unknown';
}

/**
 * Refill tokens in a bucket based on time elapsed
 */
function refillTokens(bucket: TokenBucket, config: RateLimitConfig): void {
  const now = Date.now();
  const timePassed = now - bucket.lastRefill;
  const tokensToAdd = (timePassed / 1000) * config.refillRate;

  bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

/**
 * Check if request is within rate limit using in-memory storage
 */
async function checkInMemoryRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: config.capacity, // Start with full capacity
      lastRefill: now,
    };
    buckets.set(key, bucket);
  } else {
    refillTokens(bucket, config);
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetTime: now + (config.capacity / config.refillRate) * 1000,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetTime: bucket.lastRefill + (config.capacity / config.refillRate) * 1000,
  };
}

/**
 * Check if request is within rate limit using Redis
 */
async function checkRedisRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  await initializeRedis();

  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Use Redis sorted set to track requests
  const pipeline = redisClient.pipeline();

  // Remove old entries
  pipeline.zremrangebyscore(key, 0, windowStart);

  // Count current requests
  pipeline.zcard(key);

  // Add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`);

  // Set expiration
  pipeline.expire(key, Math.ceil(config.windowMs / 1000));

  const results = await pipeline.exec();
  const currentCount = results[1][1] as number;

  if (currentCount < config.capacity) {
    return {
      allowed: true,
      remaining: config.capacity - currentCount - 1,
      resetTime: now + config.windowMs,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetTime: now + config.windowMs,
  };
}

/**
 * Main rate limiting function
 */
export async function rateLimit(
  request: NextRequest,
  route: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    const ip = getClientIP(request);
    const key = getRateLimitKey(ip, route);

    let result: { allowed: boolean; remaining: number; resetTime: number };

    if (redisClient) {
      result = await checkRedisRateLimit(key, config);
    } else {
      result = await checkInMemoryRateLimit(key, config);
    }

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': config.capacity.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            },
          },
        ),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true };
  }
}

/**
 * Middleware wrapper for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  route: string,
  config?: RateLimitConfig,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Only apply rate limiting to POST requests
    if (request.method !== 'POST') {
      return handler(request);
    }

    const { allowed, response } = await rateLimit(request, route, config);

    if (!allowed) {
      return response!;
    }

    return handler(request);
  };
}

/**
 * Clean up old buckets from memory (call periodically)
 */
export function cleanupBuckets(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > maxAge) {
      buckets.delete(key);
    }
  }
}

/**
 * Clear all buckets (useful for testing)
 */
export function clearAllBuckets(): void {
  buckets.clear();
}

// Clean up buckets every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupBuckets, 60 * 60 * 1000);
}
