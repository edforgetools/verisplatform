import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ENV, getCronKey } from "@/lib/env";

// Initialize Redis only if environment variables are available and not in test environment
let redis: Redis | null = null;
let limiter: Ratelimit | null = null;

// Skip Redis initialization in test environments or when using placeholder values
const isTestEnvironment =
  process.env.NODE_ENV === "test" ||
  process.env.NEXT_PHASE === "phase-production-build" ||
  ENV.server.UPSTASH_REDIS_REST_URL?.includes("placeholder") ||
  ENV.server.UPSTASH_REDIS_REST_TOKEN?.includes("placeholder");

if (
  !isTestEnvironment &&
  ENV.server.UPSTASH_REDIS_REST_URL &&
  ENV.server.UPSTASH_REDIS_REST_TOKEN
) {
  try {
    redis = new Redis({
      url: ENV.server.UPSTASH_REDIS_REST_URL,
      token: ENV.server.UPSTASH_REDIS_REST_TOKEN,
    });

    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
    });
  } catch (error) {
    console.warn("Failed to initialize Redis:", error);
  }
}

export async function middleware(req: Request) {
  try {
    const url = new URL(req.url);

    // Create response - will add security headers to all responses
    let response: NextResponse;

    // Only apply rate limiting to API routes
    if (!url.pathname.startsWith("/api")) {
      response = NextResponse.next();
    } else {
      // Check for cron job authentication - bypass rate limiting for authenticated cron jobs
      const cronKey = req.headers.get("x-cron-key");
      const allowed = cronKey && cronKey === getCronKey();
      if (allowed) {
        response = NextResponse.next();
      } else if (!limiter) {
        // Skip rate limiting if Redis is not configured (e.g., in test environments)
        response = NextResponse.next();
      } else {
        // Apply rate limiting based on IP address
        const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
        const { success } = await limiter.limit(`api:${ip}`);

        if (!success) {
          response = NextResponse.json(
            { error: "Too Many Requests" },
            { status: 429 }
          );
        } else {
          response = NextResponse.next();
        }
      }
    }

    // Add security headers to all responses
    response.headers.set("X-DNS-Prefetch-Control", "on");
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );

    return response;
  } catch (error) {
    // If there's any error in middleware, just continue without rate limiting
    console.warn("Middleware error:", error);
    const response = NextResponse.next();
    
    // Still add security headers even on error
    response.headers.set("X-DNS-Prefetch-Control", "on");
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );
    
    return response;
  }
}

export const config = {
  matcher: ["/(.*)"],
};
