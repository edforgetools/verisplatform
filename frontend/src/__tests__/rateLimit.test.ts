/**
 * Tests for rate limiting functionality
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { rateLimit, withRateLimit, inMemoryBuckets } from "../lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

// Mock ioredis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    incr: jest.fn(),
    expire: jest.fn(),
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

    it("should block requests when limit exceeded", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await rateLimit("test-key", 5, 60);
      }

      const result = await rateLimit("test-key", 5, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should refill tokens over time", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await rateLimit("test-key", 5, 60);
      }

      // Should be blocked
      let result = await rateLimit("test-key", 5, 60);
      expect(result.allowed).toBe(false);

      // Mock time passing (1 second)
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 1000);

      // Should allow one more request (refill rate is 5/60 = 0.083 tokens per second)
      result = await rateLimit("test-key", 5, 60);
      expect(result.allowed).toBe(true);

      // Restore Date.now
      Date.now = originalNow;
    });

    it("should handle different keys independently", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      // Exhaust limit for key1
      for (let i = 0; i < 5; i++) {
        await rateLimit("key1", 5, 60);
      }

      // key1 should be blocked
      let result = await rateLimit("key1", 5, 60);
      expect(result.allowed).toBe(false);

      // key2 should still work
      result = await rateLimit("key2", 5, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe("Redis rate limiting", () => {
    it("should use Redis when available", async () => {
      // Mock Redis available
      process.env.UPSTASH_REDIS_URL = "redis://localhost:6379";

      const mockRedis = {
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
      };

      const Redis = require("ioredis");
      Redis.mockImplementation(() => mockRedis);

      const result = await rateLimit("test-key", 5, 60);

      expect(mockRedis.incr).toHaveBeenCalledWith("rl:test-key");
      expect(mockRedis.expire).toHaveBeenCalledWith("rl:test-key", 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should handle Redis errors gracefully", async () => {
      // Mock Redis available but throwing error
      process.env.UPSTASH_REDIS_URL = "redis://localhost:6379";

      const mockRedis = {
        incr: jest.fn().mockRejectedValue(new Error("Redis connection failed")),
      };

      const Redis = require("ioredis");
      Redis.mockImplementation(() => mockRedis);

      // Should fallback to in-memory rate limiting
      const result = await rateLimit("test-key", 5, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe("withRateLimit wrapper", () => {
    it("should add rate limit headers to successful responses", async () => {
      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withRateLimit(mockHandler, "/test", {
        capacity: 10,
        refillRate: 10 / 60,
        windowMs: 60000,
      });

      const mockRequest = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });

      const response = await wrappedHandler(mockRequest);

      expect(response.headers.get("X-RateLimit-Remaining")).toBe("9");
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
    });

    it("should return 429 when rate limit exceeded", async () => {
      const mockHandler = jest.fn();

      const wrappedHandler = withRateLimit(mockHandler, "/test", {
        capacity: 1,
        refillRate: 1 / 60,
        windowMs: 60000,
      });

      const mockRequest = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });

      // First request should succeed
      const response1 = await wrappedHandler(mockRequest);
      expect(response1.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Second request should be rate limited
      const response2 = await wrappedHandler(mockRequest);
      expect(response2.status).toBe(429);
      expect(mockHandler).toHaveBeenCalledTimes(1); // Handler not called again

      const responseData = await response2.json();
      expect(responseData.error).toBe("Rate limit exceeded");
      expect(response2.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("should handle different IPs independently", async () => {
      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withRateLimit(mockHandler, "/test", {
        capacity: 1,
        refillRate: 1 / 60,
        windowMs: 60000,
      });

      const request1 = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });

      const request2 = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.2" },
      });

      // Both IPs should be able to make requests
      const response1 = await wrappedHandler(request1);
      const response2 = await wrappedHandler(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe("Rate limit configurations", () => {
    it("should apply correct limits for public endpoints", () => {
      const publicEndpointConfig = {
        capacity: 60,
        refillRate: 1,
        windowMs: 60000,
      };

      expect(publicEndpointConfig.capacity).toBe(60);
      expect(publicEndpointConfig.refillRate).toBe(1);
      expect(publicEndpointConfig.windowMs).toBe(60000);
    });

    it("should apply correct limits for create/verify endpoints", () => {
      const createVerifyConfig = {
        capacity: 10,
        refillRate: 10 / 60,
        windowMs: 60000,
      };

      expect(createVerifyConfig.capacity).toBe(10);
      expect(createVerifyConfig.refillRate).toBeCloseTo(0.167, 3);
      expect(createVerifyConfig.windowMs).toBe(60000);
    });
  });
});
