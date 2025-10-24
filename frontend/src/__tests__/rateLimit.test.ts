/**
 * Tests for rate limiting functionality
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { rateLimit, withRateLimit, inMemoryBuckets } from "../lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

// Mock ioredis
const mockIncr = jest.fn();
const mockExpire = jest.fn();

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    incr: mockIncr,
    expire: mockExpire,
  }));
});

describe("Rate Limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear in-memory buckets
    inMemoryBuckets.clear();
  });

  describe("In-memory rate limiting", () => {
    it("should allow requests within limit", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      const result1 = await rateLimit("test-key", 5, 60);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = await rateLimit("test-key", 5, 60);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it("should block requests exceeding limit", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      // Make 5 requests (limit)
      for (let i = 0; i < 5; i++) {
        const result = await rateLimit("test-key", 5, 60);
        expect(result.allowed).toBe(true);
      }

      // 6th request should be blocked
      const result = await rateLimit("test-key", 5, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should handle different keys independently", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      // Use up limit for key1
      for (let i = 0; i < 5; i++) {
        await rateLimit("key1", 5, 60);
      }

      // key2 should still have full limit
      const result = await rateLimit("key2", 5, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should refill tokens over time", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      // Use up all tokens
      for (let i = 0; i < 5; i++) {
        await rateLimit("test-key", 5, 60);
      }

      // Mock time passing (60 seconds)
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 61000);

      // Should allow one more request (refill rate is 5/60 = 0.083 tokens per second)
      const result = await rateLimit("test-key", 5, 60);
      expect(result.allowed).toBe(true);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe("Redis rate limiting", () => {
    it("should use Redis when available", async () => {
      // Mock Redis available
      process.env.UPSTASH_REDIS_REST_URL = "redis://localhost:6379";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
      process.env.REDIS_URL = "redis://localhost:6379";

      mockIncr.mockResolvedValue(1);
      mockExpire.mockResolvedValue(1);

      const result = await rateLimit("test-key", 5, 60);
      expect(result.allowed).toBe(true);
      expect(mockIncr).toHaveBeenCalled();
      expect(mockExpire).toHaveBeenCalled();
    });

    it("should handle Redis errors gracefully", async () => {
      // Mock Redis available but throwing errors
      process.env.UPSTASH_REDIS_REST_URL = "redis://localhost:6379";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      mockIncr.mockRejectedValue(new Error("Redis connection failed"));

      // Should fall back to in-memory rate limiting
      const result = await rateLimit("test-key", 5, 60);
      expect(result.allowed).toBe(true);
    });
  });

  describe("withRateLimit wrapper", () => {
    it("should add rate limit headers to successful responses", async () => {
      const mockHandler = jest.fn().mockResolvedValue(new NextResponse("OK", { status: 200 }));

      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const wrappedHandler = withRateLimit(mockHandler, 10, 60);
      const response = await wrappedHandler(mockRequest);

      expect(response.headers.get("X-RateLimit-Remaining")).toBe("9");
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
    });

    it("should return 429 when rate limit exceeded", async () => {
      const mockHandler = jest.fn().mockResolvedValue(new NextResponse("OK", { status: 200 }));

      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const wrappedHandler = withRateLimit(mockHandler, 1, 60);

      // First request should succeed
      const response1 = await wrappedHandler(mockRequest);
      expect(response1.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Second request should be rate limited
      const response2 = await wrappedHandler(mockRequest);
      expect(response2.status).toBe(429);
      expect(mockHandler).toHaveBeenCalledTimes(1); // Should not call handler again
    });

    it("should handle different IPs independently", async () => {
      const mockHandler = jest.fn().mockResolvedValue(new NextResponse("OK", { status: 200 }));

      const request1 = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const request2 = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "192.168.1.2",
        },
      });

      const wrappedHandler = withRateLimit(mockHandler, 1, 60);

      const response1 = await wrappedHandler(request1);
      const response2 = await wrappedHandler(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });
});
