/**
 * Tests for registry snapshot functionality
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { createRegistrySnapshot, computeMerkleRoot } from "../lib/registry-snapshot";
import { CanonicalProofV1 } from "../lib/proof-schema";

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

// Mock crypto-server
jest.mock("../lib/crypto-server", () => ({
  signHash: jest.fn((hash: string) => "mock-signature-base64"),
  sha256: jest.fn((buf: Buffer) => {
    // Simple mock hash function
    const str = buf.toString("hex");
    return str.slice(0, 64).padEnd(64, "0");
  }),
}));

// Mock zlib
jest.mock("zlib", () => ({
  gzip: jest.fn((buf: Buffer) => Promise.resolve(Buffer.from("compressed-" + buf.toString()))),
}));

describe("Registry Snapshot", () => {
  const mockProofs: CanonicalProofV1[] = [
    {
      schema_version: 1,
      hash_algo: "sha256",
      hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      signed_at: "2024-01-01T00:00:00.000Z",
      signer_fingerprint: "mock-fingerprint",
      subject: { type: "file", namespace: "veris", id: "proof-1" },
      metadata: { file_name: "test1.pdf" },
      signature: "mock-signature-1",
    },
    {
      schema_version: 1,
      hash_algo: "sha256",
      hash_full: "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
      signed_at: "2024-01-01T00:00:01.000Z",
      signer_fingerprint: "mock-fingerprint",
      subject: { type: "file", namespace: "veris", id: "proof-2" },
      metadata: { file_name: "test2.pdf" },
      signature: "mock-signature-2",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.AWS_REGION = "us-east-1";
    process.env.REGISTRY_S3_BUCKET = "test-bucket";
    process.env.REGISTRY_S3_PREFIX = "registry/";
  });

  describe("computeMerkleRoot", () => {
    it("computes Merkle root for single proof", () => {
      const hashes = ["a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"];
      const root = computeMerkleRoot(hashes);
      expect(root).toBe(hashes[0]);
    });

    it("computes Merkle root for multiple proofs", () => {
      const hashes = [
        "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
      ];
      const root = computeMerkleRoot(hashes);
      expect(root).toBeDefined();
      expect(root).toHaveLength(64);
    });

    it("computes Merkle root for odd number of proofs", () => {
      const hashes = [
        "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
        "c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678",
      ];
      const root = computeMerkleRoot(hashes);
      expect(root).toBeDefined();
      expect(root).toHaveLength(64);
    });

    it("throws error for empty array", () => {
      expect(() => computeMerkleRoot([])).toThrow("Cannot compute Merkle root of empty array");
    });
  });

  describe("createRegistrySnapshot", () => {
    it("creates snapshot for batch of proofs", async () => {
      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest
          .fn()
          .mockResolvedValueOnce({}) // HeadObjectCommand - file doesn't exist
          .mockResolvedValueOnce({}) // PutObjectCommand for JSONL
          .mockResolvedValueOnce({}), // PutObjectCommand for manifest
      };
      S3Client.mockImplementation(() => mockS3Client);

      const result = await createRegistrySnapshot(1, mockProofs);

      expect(result).toEqual({
        batch: 1,
        count: 2,
        merkle_root: expect.any(String),
        s3_url: "https://test-bucket.s3.us-east-1.amazonaws.com/registry/snapshots/1.manifest.json",
        manifest: expect.objectContaining({
          batch: 1,
          count: 2,
          merkle_root: expect.any(String),
          schema_version: 1,
          signature: "mock-signature-base64",
        }),
      });

      expect(mockS3Client.send).toHaveBeenCalledTimes(3);
    });

    it("handles existing snapshot (idempotency)", async () => {
      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest.fn().mockResolvedValueOnce({}), // HeadObjectCommand - file exists
      };
      S3Client.mockImplementation(() => mockS3Client);

      const result = await createRegistrySnapshot(1, mockProofs);

      expect(result).toEqual({
        batch: 1,
        count: 2,
        merkle_root: expect.any(String),
        s3_url: "https://test-bucket.s3.us-east-1.amazonaws.com/registry/snapshots/1.manifest.json",
        manifest: expect.objectContaining({
          batch: 1,
          count: 2,
          merkle_root: expect.any(String),
          schema_version: 1,
          signature: "mock-signature-base64",
        }),
      });

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    });

    it("throws error when AWS_REGION is missing", async () => {
      delete process.env.AWS_REGION;

      await expect(createRegistrySnapshot(1, mockProofs)).rejects.toThrow(
        "AWS_REGION environment variable is required",
      );
    });

    it("throws error when REGISTRY_S3_BUCKET is missing", async () => {
      delete process.env.REGISTRY_S3_BUCKET;

      await expect(createRegistrySnapshot(1, mockProofs)).rejects.toThrow(
        "REGISTRY_S3_BUCKET environment variable is required",
      );
    });
  });

  describe("Determinism", () => {
    it("produces identical results for same input", async () => {
      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest
          .fn()
          .mockResolvedValueOnce({}) // HeadObjectCommand - file doesn't exist
          .mockResolvedValueOnce({}) // PutObjectCommand for JSONL
          .mockResolvedValueOnce({}) // PutObjectCommand for manifest
          .mockResolvedValueOnce({}) // HeadObjectCommand - file doesn't exist
          .mockResolvedValueOnce({}) // PutObjectCommand for JSONL
          .mockResolvedValueOnce({}), // PutObjectCommand for manifest
      };
      S3Client.mockImplementation(() => mockS3Client);

      const result1 = await createRegistrySnapshot(1, mockProofs);
      const result2 = await createRegistrySnapshot(1, mockProofs);

      expect(result1.merkle_root).toBe(result2.merkle_root);
      expect(result1.manifest.merkle_root).toBe(result2.manifest.merkle_root);
    });
  });
});
