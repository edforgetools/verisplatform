import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({ 
  url: process.env.UPSTASH_REDIS_REST_URL!, 
  token: process.env.UPSTASH_REDIS_REST_TOKEN! 
});

const limiter = new Ratelimit({ 
  redis, 
  limiter: Ratelimit.slidingWindow(60, '1 m') 
});

export async function middleware(req: Request) {
  const url = new URL(req.url);
  
  // Only apply rate limiting to API routes
  if (!url.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check for cron job authentication - bypass rate limiting for authenticated cron jobs
  const cronKey = req.headers.get('x-cron-key');
  const allowed = cronKey && (cronKey === (process.env.CRON_JOB_TOKEN ?? process.env.CRON_SECRET));
  if (allowed) {
    return NextResponse.next();
  }

  // Apply rate limiting based on IP address
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await limiter.limit(`api:${ip}`);
  
  if (!success) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
