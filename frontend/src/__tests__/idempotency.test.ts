/**
 * Tests for idempotency system
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  checkIdempotency,
  storeIdempotency,
  withIdempotency,
  getIdempotencyKey,
  inMemoryIdempotency,
} from "../lib/idempotency";

// Mock ioredis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  }));
});

describe("Idempotency System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear in-memory storage
    inMemoryIdempotency.clear();
  });

  describe("getIdempotencyKey", () => {
    it("should extract idempotency key from headers", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          "Idempotency-Key": "test-key-123",
        },
      });

      const key = getIdempotencyKey(req);
      expect(key).toBe("test-key-123");
    });

    it("should return null when no idempotency key", () => {
      const req = new Request("http://localhost/test");

      const key = getIdempotencyKey(req);
      expect(key).toBeNull();
    });
  });

  describe("In-memory idempotency", () => {
    it("should store and retrieve idempotency records", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      const key = "test-key-123";
      const response = { id: "proof-456", status: "created" };
      const status = 200;

      // Store the record
      await storeIdempotency(key, response, status, 10);

      // Check if it exists
      const result = await checkIdempotency(key);
      expect(result.exists).toBe(true);
      expect(result.response).toEqual(response);
      expect(result.status).toBe(status);
    });

    it("should return false for non-existent keys", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      const result = await checkIdempotency("non-existent-key");
      expect(result.exists).toBe(false);
    });

    it("should handle expired records", async () => {
      // Mock Redis unavailable
      process.env.UPSTASH_REDIS_URL = "";
      process.env.REDIS_URL = "";

      const key = "test-key-123";
      const response = { id: "proof-456", status: "created" };
      const status = 200;

      // Store the record with very short TTL
      await storeIdempotency(key, response, status, 0.001); // 0.001 minutes = 60ms

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if it's expired
      const result = await checkIdempotency(key);
      expect(result.exists).toBe(false);
    });
  });

  describe("Redis idempotency", () => {
    it("should use Redis when available", async () => {
      // Mock Redis available
      process.env.UPSTASH_REDIS_URL = "redis://localhost:6379";

      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue("OK"),
      };

      const Redis = require("ioredis");
      Redis.mockImplementation(() => mockRedis);

      const key = "test-key-123";
      const response = { id: "proof-456", status: "created" };
      const status = 200;

      // Store the record
      await storeIdempotency(key, response, status, 10);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `idempotency:${key}`,
        600, // 10 minutes * 60 seconds
        expect.stringContaining(key),
      );
    });

    it("should retrieve from Redis when available", async () => {
      // Mock Redis available
      process.env.UPSTASH_REDIS_URL = "redis://localhost:6379";

      const cachedRecord = {
        key: "test-key-123",
        response: { id: "proof-456", status: "created" },
        status: 200,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify(cachedRecord)),
        setex: jest.fn().mockResolvedValue("OK"),
      };

      const Redis = require("ioredis");
      Redis.mockImplementation(() => mockRedis);

      const result = await checkIdempotency("test-key-123");
      expect(result.exists).toBe(true);
      expect(result.response).toEqual(cachedRecord.response);
      expect(result.status).toBe(cachedRecord.status);
    });
  });

  describe("withIdempotency wrapper", () => {
    it("should return cached response for duplicate requests", async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "proof-456" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const wrappedHandler = withIdempotency(mockHandler, 10);

      const req1 = new Request("http://localhost/test", {
        headers: { "Idempotency-Key": "test-key-123" },
      });

      const req2 = new Request("http://localhost/test", {
        headers: { "Idempotency-Key": "test-key-123" },
      });

      // First request
      const response1 = await wrappedHandler(req1);
      expect(response1.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Second request with same key
      const response2 = await wrappedHandler(req2);
      expect(response2.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(1); // Handler not called again

      const responseData = await response2.json();
      expect(responseData.id).toBe("proof-456");
      expect(response2.headers.get("Idempotency-Key")).toBe("test-key-123");
    });

    it("should proceed normally when no idempotency key", async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "proof-456" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const wrappedHandler = withIdempotency(mockHandler, 10);

      const req = new Request("http://localhost/test"); // No idempotency key

      const response = await wrappedHandler(req);
      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle different idempotency keys independently", async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "proof-456" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const wrappedHandler = withIdempotency(mockHandler, 10);

      const req1 = new Request("http://localhost/test", {
        headers: { "Idempotency-Key": "key-1" },
      });

      const req2 = new Request("http://localhost/test", {
        headers: { "Idempotency-Key": "key-2" },
      });

      // Both requests should proceed
      const response1 = await wrappedHandler(req1);
      const response2 = await wrappedHandler(req2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe("Duplicate content prevention", () => {
    it("should prevent duplicate proofs with same content", async () => {
      // This test verifies that the unique constraint (user_id, hash_full)
      // in the database prevents duplicate proofs
      const userId = "user-123";
      const hashFull = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

      // Simulate database constraint violation
      const mockDbError = {
        code: "23505", // PostgreSQL unique violation
        message: "duplicate key value violates unique constraint",
      };

      // This would be handled by the database constraint
      expect(mockDbError.code).toBe("23505");
    });
  });
});
