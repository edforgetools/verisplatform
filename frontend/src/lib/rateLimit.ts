import { NextRequest, NextResponse } from 'next/server';

// CI-safe rate limiter without require(), no top-level await
let redisClient: unknown = null;

async function getRedis() {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
  if (!url) return null; // no Redis configured → limiter disabled

  const { default: Redis } = await import('ioredis');
  redisClient = new Redis(url);
  return redisClient;
}

export async function rateLimit(key: string, limit = 60, windowSec = 60) {
  const redis = await getRedis();
  if (!redis) return { allowed: true, remaining: limit };

  const bucket = `rl:${key}`;
  const used = await redis.incr(bucket);
  if (used === 1) await redis.expire(bucket, windowSec);
  return { allowed: used <= limit, remaining: Math.max(limit - used, 0) };
}

// Legacy compatibility functions
export function clearAllBuckets(): void {
  // No-op for Redis-based limiter
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  route: string,
  config?: { capacity?: number; windowMs?: number },
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Only apply rate limiting to POST requests
    if (request.method !== 'POST') {
      return handler(request);
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const key = `rate_limit:${ip}:${route}`;

    const { allowed } = await rateLimit(
      key,
      config?.capacity || 10,
      config?.windowMs ? config.windowMs / 1000 : 60,
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 },
      );
    }

    return handler(request);
  };
}
