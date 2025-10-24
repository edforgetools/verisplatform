/**
 * Idempotency system for preventing duplicate charges and proofs
 * Server-only module for handling idempotency keys
 */

import { supabaseService } from "./db";
import { logger } from "./logger";

interface IdempotencyRecord {
  key: string;
  response: any;
  status: number;
  created_at: string;
  expires_at: string;
}

// In-memory fallback for idempotency when Redis is not available
export const inMemoryIdempotency = new Map<string, IdempotencyRecord>();

/**
 * Get idempotency key from request headers
 */
export function getIdempotencyKey(req: Request): string | null {
  return req.headers.get("Idempotency-Key") || null;
}

/**
 * Check if an idempotency key exists and return cached response
 */
export async function checkIdempotency(key: string): Promise<{
  exists: boolean;
  response?: any;
  status?: number;
}> {
  try {
    // Try Redis first (if available)
    const redis = await getRedis();
    if (redis) {
      const cached = await redis.get(`idempotency:${key}`);
      if (cached) {
        const record: IdempotencyRecord = JSON.parse(cached);
        if (new Date(record.expires_at) > new Date()) {
          return {
            exists: true,
            response: record.response,
            status: record.status,
          };
        } else {
          // Expired, remove from Redis
          await redis.del(`idempotency:${key}`);
        }
      }
    }

    // Fallback to in-memory storage
    const record = inMemoryIdempotency.get(key);
    if (record && new Date(record.expires_at) > new Date()) {
      return {
        exists: true,
        response: record.response,
        status: record.status,
      };
    } else if (record) {
      // Expired, remove from memory
      inMemoryIdempotency.delete(key);
    }

    return { exists: false };
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error", key },
      "Failed to check idempotency",
    );
    return { exists: false };
  }
}

/**
 * Store idempotency response
 */
export async function storeIdempotency(
  key: string,
  response: any,
  status: number,
  ttlMinutes: number = 10,
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const record: IdempotencyRecord = {
      key,
      response,
      status,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    // Try Redis first (if available)
    const redis = await getRedis();
    if (redis) {
      await redis.setex(`idempotency:${key}`, ttlMinutes * 60, JSON.stringify(record));
    } else {
      // Fallback to in-memory storage
      inMemoryIdempotency.set(key, record);
    }

    logger.info({ key, status, ttlMinutes }, "Idempotency response stored");
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error", key },
      "Failed to store idempotency",
    );
    // Don't throw - idempotency failures shouldn't break the main flow
  }
}

/**
 * Get Redis client (if available)
 */
async function getRedis(): Promise<any> {
  try {
    const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
    if (!url) return null;

    const { default: Redis } = await import("ioredis");
    return new Redis(url);
  } catch (error) {
    return null;
  }
}

/**
 * Higher-order function that wraps a handler with idempotency
 */
export function withIdempotency<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  ttlMinutes: number = 10,
) {
  return async (...args: T): Promise<Response> => {
    const req = args[0] as Request;
    const idempotencyKey = getIdempotencyKey(req);

    if (!idempotencyKey) {
      // No idempotency key, proceed normally
      return handler(...args);
    }

    // Check if we've seen this key before
    const cached = await checkIdempotency(idempotencyKey);
    if (cached.exists) {
      logger.info(
        { idempotencyKey, status: cached.status },
        "Returning cached idempotency response",
      );
      return new Response(JSON.stringify(cached.response), {
        status: cached.status,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
      });
    }

    // Execute the handler
    const response = await handler(...args);

    // Store the response for future requests
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    await storeIdempotency(idempotencyKey, responseData, response.status, ttlMinutes);

    // Return the response with idempotency header
    return new Response(responseText, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Idempotency-Key": idempotencyKey,
      },
    });
  };
}

/**
 * Clean up expired idempotency records (should be called periodically)
 */
export async function cleanupExpiredIdempotency(): Promise<void> {
  try {
    const now = new Date();

    // Clean up in-memory records
    for (const [key, record] of inMemoryIdempotency.entries()) {
      if (new Date(record.expires_at) <= now) {
        inMemoryIdempotency.delete(key);
      }
    }

    // Clean up Redis records (if available)
    const redis = await getRedis();
    if (redis) {
      // Redis TTL handles expiration automatically
      // This is just for logging
      logger.info("Idempotency cleanup completed");
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to cleanup expired idempotency records",
    );
  }
}
