/**
 * Tests for registry snapshot functionality
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { createRegistrySnapshot } from "../lib/registry-snapshot";

// Mock AWS SDK
const mockS3Client = {
  send: jest.fn(),
};

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => mockS3Client),
  HeadObjectCommand: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

// Mock database
const mockSupabaseService = jest.fn().mockReturnValue({
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [
              {
                id: "proof-1",
                user_id: "user-1",
                file_name: "test1.pdf",
                file_hash: "hash1",
                created_at: "2024-01-01T00:00:00Z",
              },
              {
                id: "proof-2",
                user_id: "user-2",
                file_name: "test2.pdf",
                file_hash: "hash2",
                created_at: "2024-01-01T00:01:00Z",
              },
            ],
            error: null,
          }),
        }),
      }),
    }),
  }),
});

jest.mock("../lib/db", () => ({
  supabaseService: mockSupabaseService,
}));

// Crypto module and crypto-server are mocked in jest.setup.js

describe("Registry Snapshot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createRegistrySnapshot", () => {
    it("creates snapshot for batch of proofs", async () => {
      mockS3Client.send
        .mockResolvedValueOnce({}) // HeadObjectCommand - file doesn't exist
        .mockResolvedValueOnce({}) // PutObjectCommand for JSONL
        .mockResolvedValueOnce({}); // PutObjectCommand for manifest

      const mockProofs = [
        {
          hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          metadata: {},
          schema_version: 1,
          signed_at: "2024-01-01T00:00:00Z",
          signer_fingerprint: "test-fingerprint",
          subject: undefined,
        },
        {
          hash_full: "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
          metadata: {},
          schema_version: 1,
          signed_at: "2024-01-01T00:00:00Z",
          signer_fingerprint: "test-fingerprint",
          subject: undefined,
        },
      ] as any;

      const result = await createRegistrySnapshot(1, mockProofs);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("batch");
      expect(result).toHaveProperty("s3_url");
      expect(result).toHaveProperty("count");
      expect(result.batch).toBe(1);
      expect(result.count).toBe(2);
    });

    it("handles existing snapshot (idempotency)", async () => {
      mockS3Client.send
        .mockResolvedValueOnce({}) // HeadObjectCommand - file exists
        .mockResolvedValueOnce({}); // GetObjectCommand - read existing file

      const mockProofs = [
        {
          hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          metadata: {},
          schema_version: 1,
          signed_at: "2024-01-01T00:00:00Z",
          signer_fingerprint: "test-fingerprint",
          subject: undefined,
        },
        {
          hash_full: "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
          metadata: {},
          schema_version: 1,
          signed_at: "2024-01-01T00:00:00Z",
          signer_fingerprint: "test-fingerprint",
          subject: undefined,
        },
      ] as any;

      const result = await createRegistrySnapshot(1, mockProofs);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("batch");
      expect(result).toHaveProperty("s3_url");
    });

    it("handles database errors gracefully", async () => {
      mockSupabaseService.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Database error" },
                }),
              }),
            }),
          }),
        }),
      });

      const mockProofs = [
        {
          hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          metadata: {},
          schema_version: 1,
          signed_at: "2024-01-01T00:00:00Z",
          signer_fingerprint: "test-fingerprint",
          subject: undefined,
        },
      ] as any;

      await expect(createRegistrySnapshot(1, mockProofs)).rejects.toThrow();
    });

    it("handles S3 errors gracefully", async () => {
      mockS3Client.send.mockRejectedValue(new Error("S3 error"));

      const mockProofs = [
        {
          hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          metadata: {},
          schema_version: 1,
          signed_at: "2024-01-01T00:00:00Z",
          signer_fingerprint: "test-fingerprint",
          subject: undefined,
        },
      ] as any;

      await expect(createRegistrySnapshot(1, mockProofs)).rejects.toThrow("S3 error");
    });
  });

  describe("Determinism", () => {
    it("produces identical results for same input", async () => {
      mockS3Client.send
        .mockResolvedValueOnce({}) // HeadObjectCommand - file doesn't exist
        .mockResolvedValueOnce({}) // PutObjectCommand for JSONL
        .mockResolvedValueOnce({}); // PutObjectCommand for manifest

      const mockProofs = [
        {
          hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          metadata: {},
          schema_version: 1,
          signed_at: "2024-01-01T00:00:00Z",
          signer_fingerprint: "test-fingerprint",
          subject: undefined,
        },
      ] as any;

      const result1 = await createRegistrySnapshot(1, mockProofs);
      const result2 = await createRegistrySnapshot(1, mockProofs);

      expect(result1.s3_url).toBe(result2.s3_url);
      expect(result1.count).toBe(result2.count);
    });

    it("produces different results for different inputs", async () => {
      mockS3Client.send
        .mockResolvedValueOnce({}) // HeadObjectCommand - file doesn't exist
        .mockResolvedValueOnce({}) // PutObjectCommand for JSONL
        .mockResolvedValueOnce({}); // PutObjectCommand for manifest

      const mockProofs1 = [
        {
          hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          metadata: {},
          schema_version: 1,
          signed_at: "2024-01-01T00:00:00Z",
          signer_fingerprint: "test-fingerprint",
          subject: undefined,
        },
      ] as any;

      const mockProofs2 = [
        {
          hash_full: "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
          metadata: {},
          schema_version: 1,
          signed_at: "2024-01-01T00:00:00Z",
          signer_fingerprint: "test-fingerprint",
          subject: undefined,
        },
      ] as any;

      const result1 = await createRegistrySnapshot(1, mockProofs1);
      const result2 = await createRegistrySnapshot(2, mockProofs2);

      expect(result1.s3_url).not.toBe(result2.s3_url);
    });
  });
});
