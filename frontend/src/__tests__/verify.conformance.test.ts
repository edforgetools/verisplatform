/**
 * Tests for verification API conformance between primary and mirror backends
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { verifyProofFromMirror } from "../lib/mirror-reader";

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetObjectCommand: jest.fn(),
}));

// Mock database
jest.mock("../lib/db", () => ({
  supabaseService: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { batch: 1 },
            }),
          }),
        }),
      }),
    }),
  }),
}));

// Mock proof schema
jest.mock("../lib/proof-schema", () => ({
  verifyCanonicalProof: jest.fn(() => true),
}));

describe("Verification Conformance", () => {
  const mockProof = {
    schema_version: 1,
    hash_algo: "sha256",
    hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    signed_at: "2024-01-01T00:00:00.000Z",
    signer_fingerprint: "mock-fingerprint",
    subject: { type: "file", namespace: "veris", id: "test-proof-id" },
    metadata: { file_name: "test.pdf" },
    signature: "mock-signature",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.AWS_REGION = "us-east-1";
    process.env.REGISTRY_S3_BUCKET = "test-bucket";
    process.env.REGISTRY_S3_PREFIX = "registry/";
  });

  describe("Primary vs Mirror Conformance", () => {
    it("should return identical response format for same proof", async () => {
      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest.fn().mockResolvedValue({
          Body: {
            transformToByteArray: jest.fn().mockResolvedValue(Buffer.from("compressed-data")),
          },
        }),
      };
      S3Client.mockImplementation(() => mockS3Client);

      // Mock zlib
      const mockGunzip = jest.fn().mockResolvedValue(Buffer.from(JSON.stringify(mockProof)));
      jest.doMock("zlib", () => ({
        gunzip: mockGunzip,
      }));

      const result = await verifyProofFromMirror("test-proof-id");

      // Expected response format
      const expectedFormat = {
        schema_version: 1,
        proof_hash: expect.any(String),
        valid: expect.any(Boolean),
        verified_at: expect.any(String),
        signer_fp: expect.any(String),
        source_registry: "s3",
        errors: expect.any(Array),
      };

      expect(result).toMatchObject(expectedFormat);
      expect(result.schema_version).toBe(1);
      expect(result.source_registry).toBe("s3");
    });

    it("should handle proof not found in mirror", async () => {
      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest.fn().mockResolvedValue({
          Body: {
            transformToByteArray: jest.fn().mockResolvedValue(Buffer.from("compressed-data")),
          },
        }),
      };
      S3Client.mockImplementation(() => mockS3Client);

      // Mock zlib to return empty JSONL
      const mockGunzip = jest.fn().mockResolvedValue(Buffer.from(""));
      jest.doMock("zlib", () => ({
        gunzip: mockGunzip,
      }));

      const result = await verifyProofFromMirror("non-existent-proof");

      expect(result).toEqual({
        schema_version: 1,
        proof_hash: "",
        valid: false,
        verified_at: expect.any(String),
        signer_fp: null,
        source_registry: "s3",
        errors: ["Proof not found in mirror"],
      });
    });

    it("should handle verification failure", async () => {
      const { verifyCanonicalProof } = require("../lib/proof-schema");
      verifyCanonicalProof.mockReturnValue(false);

      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest.fn().mockResolvedValue({
          Body: {
            transformToByteArray: jest.fn().mockResolvedValue(Buffer.from("compressed-data")),
          },
        }),
      };
      S3Client.mockImplementation(() => mockS3Client);

      // Mock zlib
      const mockGunzip = jest.fn().mockResolvedValue(Buffer.from(JSON.stringify(mockProof)));
      jest.doMock("zlib", () => ({
        gunzip: mockGunzip,
      }));

      const result = await verifyProofFromMirror("test-proof-id");

      expect(result).toEqual({
        schema_version: 1,
        proof_hash: mockProof.hash_full,
        valid: false,
        verified_at: expect.any(String),
        signer_fp: null,
        source_registry: "s3",
        errors: ["Proof verification failed"],
      });
    });
  });

  describe("Response Format Consistency", () => {
    it("should maintain consistent field types", async () => {
      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest.fn().mockResolvedValue({
          Body: {
            transformToByteArray: jest.fn().mockResolvedValue(Buffer.from("compressed-data")),
          },
        }),
      };
      S3Client.mockImplementation(() => mockS3Client);

      // Mock zlib
      const mockGunzip = jest.fn().mockResolvedValue(Buffer.from(JSON.stringify(mockProof)));
      jest.doMock("zlib", () => ({
        gunzip: mockGunzip,
      }));

      const result = await verifyProofFromMirror("test-proof-id");

      // Check field types
      expect(typeof result.schema_version).toBe("number");
      expect(typeof result.proof_hash).toBe("string");
      expect(typeof result.valid).toBe("boolean");
      expect(typeof result.verified_at).toBe("string");
      expect(typeof result.source_registry).toBe("string");
      expect(Array.isArray(result.errors)).toBe(true);

      // signer_fp can be string or null
      expect(typeof result.signer_fp === "string" || result.signer_fp === null).toBe(true);
    });

    it("should use ISO8601 timestamp format", async () => {
      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest.fn().mockResolvedValue({
          Body: {
            transformToByteArray: jest.fn().mockResolvedValue(Buffer.from("compressed-data")),
          },
        }),
      };
      S3Client.mockImplementation(() => mockS3Client);

      // Mock zlib
      const mockGunzip = jest.fn().mockResolvedValue(Buffer.from(JSON.stringify(mockProof)));
      jest.doMock("zlib", () => ({
        gunzip: mockGunzip,
      }));

      const result = await verifyProofFromMirror("test-proof-id");

      // Check ISO8601 format
      const timestamp = new Date(result.verified_at);
      expect(timestamp.toISOString()).toBe(result.verified_at);
    });
  });
});
