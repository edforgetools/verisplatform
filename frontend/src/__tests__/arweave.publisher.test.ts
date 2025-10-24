/**
 * Tests for Arweave publisher functionality
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { publishSnapshotToArweave, isSnapshotPublished } from "../lib/arweave-publisher";

// Mock AWS SDK
const mockS3Client = {
  send: jest.fn(),
};

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => mockS3Client),
  GetObjectCommand: jest.fn(),
}));

// Mock Arweave
const mockArweave = {
  transactions: {
    post: jest.fn(),
    get: jest.fn(),
    sign: jest.fn(),
  },
  wallets: {
    jwkToAddress: jest.fn(),
  },
  createTransaction: jest.fn(),
  arql: jest.fn(),
};

jest.mock("arweave", () => ({
  init: jest.fn(() => mockArweave),
}));

// Crypto module is mocked in jest.setup.js

describe("Arweave Publisher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ARWEAVE_GATEWAY_URL = "https://arweave.net";
  });

  describe("publishSnapshotToArweave", () => {
            it("publishes snapshot artifacts to Arweave", async () => {
              const mockManifest = {
                batch: 1,
                count: 2,
                merkle_root: "test-merkle-root",
                sha256_jsonl: "test-hash",
                sha256_manifest_without_signature: "test-hash",
                created_at: "2024-01-01T00:00:00Z",
                schema_version: 1,
                signature: "test-signature",
              };

              const mockS3Response = {
                Body: {
                  transformToString: jest.fn().mockResolvedValue(JSON.stringify(mockManifest)),
                },
              };

      mockS3Client.send
        .mockResolvedValueOnce(mockS3Response) // GetObjectCommand for manifest
        .mockResolvedValueOnce(mockS3Response); // GetObjectCommand for JSONL
      mockArweave.createTransaction.mockResolvedValue({
        addTag: jest.fn(),
      });
      mockArweave.transactions.sign.mockResolvedValue(undefined);
      mockArweave.transactions.post.mockResolvedValue({ status: 200 });

      const result = await publishSnapshotToArweave(1);

      expect(result).toBeDefined();
      expect(mockS3Client.send).toHaveBeenCalled();
      expect(mockArweave.createTransaction).toHaveBeenCalled();
      expect(mockArweave.transactions.sign).toHaveBeenCalled();
      expect(mockArweave.transactions.post).toHaveBeenCalled();
    });

            it("throws error when manifest integrity verification fails", async () => {
              const mockS3Response = {
                Body: {
                  transformToString: jest.fn().mockResolvedValue("invalid-json-content"),
                },
              };

              mockS3Client.send.mockResolvedValue(mockS3Response);

              await expect(publishSnapshotToArweave(1)).rejects.toThrow();
            });

    it("throws error when JSONL hash mismatch", async () => {
      const mockS3Response = {
        Body: {
          transformToString: jest.fn().mockResolvedValue(
            JSON.stringify({
              batch: 1,
              count: 2,
              merkle_root: "test-merkle-root",
              sha256_jsonl: "test-hash",
              sha256_manifest_without_signature: "test-hash",
              created_at: "2024-01-01T00:00:00Z",
              schema_version: 1,
              signature: "test-signature",
            }),
          ),
        },
      };

      mockS3Client.send.mockResolvedValue(mockS3Response);
      mockArweave.createTransaction.mockResolvedValue({
        addTag: jest.fn(),
      });

      // Mock hash mismatch
      const crypto = require("crypto");
      crypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue("different-hash"),
      });

      await expect(publishSnapshotToArweave(1)).rejects.toThrow();
    });

    it("throws error when Arweave transaction fails", async () => {
      const mockS3Response = {
        Body: {
          transformToString: jest.fn().mockResolvedValue(
            JSON.stringify({
              batch: 1,
              count: 2,
              merkle_root: "test-merkle-root",
              sha256_jsonl: "test-hash",
              sha256_manifest_without_signature: "test-hash",
              created_at: "2024-01-01T00:00:00Z",
              schema_version: 1,
              signature: "test-signature",
            }),
          ),
        },
      };

      mockS3Client.send
        .mockResolvedValueOnce(mockS3Response) // GetObjectCommand for manifest
        .mockResolvedValueOnce(mockS3Response); // GetObjectCommand for JSONL
      mockArweave.createTransaction.mockResolvedValue({
        addTag: jest.fn(),
      });
      mockArweave.transactions.sign.mockResolvedValue(undefined);
      mockArweave.transactions.post.mockRejectedValue(new Error("Arweave error"));

      await expect(publishSnapshotToArweave(1)).rejects.toThrow("Arweave error");
    });
  });

  describe("isSnapshotPublished", () => {
    it("returns true when snapshot is published", async () => {
      mockArweave.arql.mockResolvedValueOnce([{ id: "txid-123" }]);

      const result = await isSnapshotPublished(1);

      expect(result).toBe(true);
      expect(mockArweave.arql).toHaveBeenCalled();
    });

    it("returns false when snapshot is not published", async () => {
      mockArweave.arql.mockResolvedValueOnce([]);

      const result = await isSnapshotPublished(1);

      expect(result).toBe(false);
      expect(mockArweave.arql).toHaveBeenCalled();
    });

    it("returns false when Arweave query fails", async () => {
      mockArweave.arql.mockRejectedValue(new Error("Arweave query failed"));

      const result = await isSnapshotPublished(1);

      expect(result).toBe(false);
      expect(mockArweave.arql).toHaveBeenCalled();
    });
  });
});
