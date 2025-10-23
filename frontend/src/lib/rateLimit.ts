import { NextRequest, NextResponse } from 'next/server';
import { ENV } from './env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;

async function getRedis() {
  if (redisClient) return redisClient;
  const url = ENV.server.UPSTASH_REDIS_URL || ENV.server.REDIS_URL;
  if (!url) return null;
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
  config: RateLimitConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const key = `${route}:${ip}`;
    
    // Convert config to rateLimit parameters
    const limit = config.capacity;
    const windowSec = Math.ceil(config.windowMs / 1000);
    
    const result = await rateLimit(key, limit, windowSec);
    
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    return handler(req);
  };
}
