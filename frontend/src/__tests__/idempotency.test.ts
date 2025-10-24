/**
 * Tests for idempotency system
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { NextRequest, NextResponse } from "next/server";
import {
  checkIdempotency,
  storeIdempotency,
  withIdempotency,
  getIdempotencyKey,
  inMemoryIdempotency,
} from "../lib/idempotency";

// Mock ioredis
const mockGet = jest.fn();
const mockSetex = jest.fn();
const mockDel = jest.fn();

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    get: mockGet,
    setex: mockSetex,
    del: mockDel,
  }));
});

describe("Idempotency System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear in-memory storage
    inMemoryIdempotency.clear();
  });

  describe("getIdempotencyKey", () => {
    it("should extract idempotency key from request headers", () => {
      const mockRequest = {
        headers: {
          get: jest.fn((name: string) => (name === "Idempotency-Key" ? "test-key" : null)),
        },
      } as any;

      const key = getIdempotencyKey(mockRequest);
      expect(key).toBe("test-key");
    });

    it("should return null when no idempotency key header", () => {
      const mockRequest = {
        headers: {
          get: jest.fn(() => null),
        },
      } as any;

      const key = getIdempotencyKey(mockRequest);
      expect(key).toBeNull();
    });

    it("should return null when idempotency key header is empty", () => {
      const mockRequest = {
        headers: {
          get: jest.fn((name: string) => (name === "Idempotency-Key" ? "" : null)),
        },
      } as any;

      const key = getIdempotencyKey(mockRequest);
      expect(key).toBeNull();
    });
  });

  describe("In-memory idempotency", () => {
            it("should store and retrieve idempotency data", async () => {
              const key = "test-key";
              const response = { result: "success" };
              const status = 200;

              await storeIdempotency(key, response, status);
              const retrieved = await checkIdempotency(key);

              expect(retrieved.exists).toBe(true);
              expect(retrieved.response).toEqual(response);
              expect(retrieved.status).toBe(status);
            });

    it("should return null for non-existent keys", async () => {
      const retrieved = await checkIdempotency("non-existent-key");
      expect(retrieved.exists).toBe(false);
    });

            it("should handle concurrent requests", async () => {
              const key = "concurrent-key";
              const response = { result: "success" };
              const status = 200;

              // Simulate concurrent requests
              const promises = [
                storeIdempotency(key, response, status),
                storeIdempotency(key, response, status),
                storeIdempotency(key, response, status),
              ];

              await Promise.all(promises);

              const retrieved = await checkIdempotency(key);
              expect(retrieved.exists).toBe(true);
              expect(retrieved.response).toEqual(response);
              expect(retrieved.status).toBe(status);
            });
  });

  describe("Redis idempotency", () => {
            it("should use Redis when available", async () => {
              // Mock Redis available
              process.env.UPSTASH_REDIS_REST_URL = "redis://localhost:6379";
              process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

              const key = "redis-key";
              const response = { result: "success" };
              const status = 200;
              const record = { response, status, created_at: "2024-01-01T00:00:00Z", expires_at: "2024-01-01T01:00:00Z" };

              mockGet.mockResolvedValue(JSON.stringify(record));
              mockSetex.mockResolvedValue("OK");

              const retrieved = await checkIdempotency(key);
              expect(retrieved.exists).toBe(true);
              expect(retrieved.response).toEqual(response);
              expect(retrieved.status).toBe(status);
              expect(mockGet).toHaveBeenCalledWith(`idempotency:${key}`);
            });

            it("should retrieve from Redis when available", async () => {
              // Mock Redis available
              process.env.UPSTASH_REDIS_REST_URL = "redis://localhost:6379";
              process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

              const key = "redis-key";
              const response = { result: "success" };
              const status = 200;
              const record = { response, status, created_at: "2024-01-01T00:00:00Z", expires_at: "2024-01-01T01:00:00Z" };

              mockGet.mockResolvedValue(JSON.stringify(record));

              const retrieved = await checkIdempotency(key);
              expect(retrieved.exists).toBe(true);
              expect(retrieved.response).toEqual(response);
              expect(retrieved.status).toBe(status);
              expect(mockGet).toHaveBeenCalledWith(`idempotency:${key}`);
            });

    it("should handle Redis errors gracefully", async () => {
      // Mock Redis available but throwing errors
      process.env.UPSTASH_REDIS_REST_URL = "redis://localhost:6379";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      mockGet.mockRejectedValue(new Error("Redis connection failed"));

      // Should fall back to in-memory storage
      const retrieved = await checkIdempotency("test-key");
      expect(retrieved.exists).toBe(false);
    });
  });

  describe("withIdempotency wrapper", () => {
    it("should return cached response for duplicate requests", async () => {
      const mockHandler = jest.fn().mockImplementation(
        () =>
          new NextResponse(JSON.stringify({ result: "success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      );

      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "test-key",
        },
      });

      const wrappedHandler = withIdempotency(mockHandler);

      // First request
      const response1 = await wrappedHandler(mockRequest);
      expect(response1.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Second request with same idempotency key
      const response2 = await wrappedHandler(mockRequest);
      expect(response2.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(1); // Should not call handler again
    });

    it("should handle different idempotency keys independently", async () => {
      const mockHandler = jest.fn().mockImplementation(
        () =>
          new NextResponse(JSON.stringify({ result: "success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      );

      const request1 = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ data: "test1" }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "key-1",
        },
      });

      const request2 = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ data: "test2" }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "key-2",
        },
      });

      const wrappedHandler = withIdempotency(mockHandler);

      const response1 = await wrappedHandler(request1);
      const response2 = await wrappedHandler(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it("should handle requests without idempotency key", async () => {
      const mockHandler = jest.fn().mockImplementation(
        () =>
          new NextResponse(JSON.stringify({ result: "success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      );

      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const wrappedHandler = withIdempotency(mockHandler);

      const response = await wrappedHandler(mockRequest);
      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });
});
