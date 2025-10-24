import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;

// In-memory token bucket storage
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export const inMemoryBuckets = new Map<string, TokenBucket>();

async function getRedis() {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
  if (!url) return null;
  const { default: Redis } = await import("ioredis");
  redisClient = new Redis(url);
  return redisClient;
}

/**
 * In-memory token bucket rate limiter
 */
function inMemoryRateLimit(key: string, capacity: number, refillRate: number, _windowMs: number) {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(key) || { tokens: capacity, lastRefill: now };

  // Refill tokens based on time elapsed
  const timeElapsed = now - bucket.lastRefill;
  const tokensToAdd = (timeElapsed / 1000) * refillRate;
  bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  // Check if request is allowed
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    inMemoryBuckets.set(key, bucket);
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  } else {
    inMemoryBuckets.set(key, bucket);
    return { allowed: false, remaining: 0 };
  }
}

export async function rateLimit(key: string, limit = 60, windowSec = 60) {
  const redis = await getRedis();
  if (!redis) {
    // Fallback to in-memory rate limiting
    const capacity = limit;
    const refillRate = limit / windowSec; // tokens per second
    const windowMs = windowSec * 1000;
    return inMemoryRateLimit(key, capacity, refillRate, windowMs);
  }

  const bucket = `rl:${key}`;
  const used = await redis.incr(bucket);
  if (used === 1) await redis.expire(bucket, windowSec);
  return { allowed: used <= limit, remaining: Math.max(limit - used, 0) };
}

interface RateLimitConfig {
  capacity: number; // Maximum requests
  refillRate: number; // Requests per second
  windowMs: number; // Time window in milliseconds
}

/**
 * Higher-order function that wraps a handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  route: string,
  config: RateLimitConfig,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const key = `${route}:${ip}`;

    // Convert config to rateLimit parameters
    const limit = config.capacity;
    const windowSec = Math.ceil(config.windowMs / 1000);

    const result = await rateLimit(key, limit, windowSec);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": result.remaining.toString(),
          },
        },
      );
    }

    const response = await handler(req);

    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());

    return response;
  };
}
