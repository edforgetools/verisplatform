/**
 * Tests for Arweave publisher functionality
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { publishSnapshotToArweave, isSnapshotPublished } from "../lib/arweave-publisher";

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetObjectCommand: jest.fn(),
}));

// Mock Arweave
jest.mock("arweave", () => ({
  init: jest.fn().mockReturnValue({
    createTransaction: jest.fn(),
    transactions: {
      sign: jest.fn(),
      post: jest.fn(),
    },
    arql: jest.fn(),
  }),
}));

// Mock crypto-server
jest.mock("../lib/crypto-server", () => ({
  verifySignature: jest.fn(() => true),
  sha256: jest.fn((buf: Buffer) => {
    // Simple mock hash function
    const str = buf.toString("hex");
    return str.slice(0, 64).padEnd(64, "0");
  }),
}));

describe("Arweave Publisher", () => {
  const mockManifest = {
    batch: 1,
    count: 1000,
    merkle_root: "mock-merkle-root",
    sha256_jsonl: "mock-jsonl-hash",
    sha256_manifest_without_signature: "mock-manifest-hash",
    created_at: "2024-01-01T00:00:00.000Z",
    schema_version: 1,
    signature: "mock-signature",
  };

  const mockJsonlData = Buffer.from("mock-jsonl-data");

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.AWS_REGION = "us-east-1";
    process.env.REGISTRY_S3_BUCKET = "test-bucket";
    process.env.REGISTRY_S3_PREFIX = "registry/";
    process.env.ARWEAVE_WALLET_JSON = JSON.stringify({ kty: "RSA", n: "mock-key" });
    process.env.ARWEAVE_GATEWAY_URL = "https://arweave.net";
  });

  describe("publishSnapshotToArweave", () => {
    it("publishes snapshot artifacts to Arweave", async () => {
      const { S3Client } = require("@aws-sdk/client-s3");
      const { init: arweaveInit } = require("arweave");

      const mockS3Client = {
        send: jest
          .fn()
          .mockResolvedValueOnce({
            Body: {
              transformToString: jest.fn().mockResolvedValue(JSON.stringify(mockManifest)),
            },
          })
          .mockResolvedValueOnce({
            Body: {
              transformToByteArray: jest.fn().mockResolvedValue(mockJsonlData),
            },
          }),
      };
      S3Client.mockImplementation(() => mockS3Client);

      const mockArweave = {
        createTransaction: jest.fn().mockResolvedValue({
          id: "mock-tx-id",
          addTag: jest.fn(),
        }),
        transactions: {
          sign: jest.fn().mockResolvedValue(undefined),
          post: jest.fn().mockResolvedValue({ status: 200 }),
        },
      };
      arweaveInit.mockReturnValue(mockArweave);

      const result = await publishSnapshotToArweave(1);

      expect(result).toEqual({
        batch: 1,
        manifestTxId: "mock-tx-id",
        jsonlTxId: "mock-tx-id",
        manifestUrl: "https://arweave.net/mock-tx-id",
        jsonlUrl: "https://arweave.net/mock-tx-id",
      });

      expect(mockS3Client.send).toHaveBeenCalledTimes(2);
      expect(mockArweave.createTransaction).toHaveBeenCalledTimes(2);
      expect(mockArweave.transactions.sign).toHaveBeenCalledTimes(2);
      expect(mockArweave.transactions.post).toHaveBeenCalledTimes(2);
    });

    it("throws error when ARWEAVE_WALLET_JSON is missing", async () => {
      delete process.env.ARWEAVE_WALLET_JSON;

      await expect(publishSnapshotToArweave(1)).rejects.toThrow(
        "ARWEAVE_WALLET_JSON environment variable is required",
      );
    });

    it("throws error when manifest integrity verification fails", async () => {
      const { verifySignature } = require("../lib/crypto-server");
      verifySignature.mockReturnValue(false);

      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest.fn().mockResolvedValueOnce({
          Body: {
            transformToString: jest.fn().mockResolvedValue(JSON.stringify(mockManifest)),
          },
        }),
      };
      S3Client.mockImplementation(() => mockS3Client);

      await expect(publishSnapshotToArweave(1)).rejects.toThrow(
        "Manifest integrity verification failed",
      );
    });

    it("throws error when JSONL hash mismatch", async () => {
      const { sha256 } = require("../lib/crypto-server");
      sha256.mockReturnValue("different-hash");

      const { S3Client } = require("@aws-sdk/client-s3");
      const mockS3Client = {
        send: jest
          .fn()
          .mockResolvedValueOnce({
            Body: {
              transformToString: jest.fn().mockResolvedValue(JSON.stringify(mockManifest)),
            },
          })
          .mockResolvedValueOnce({
            Body: {
              transformToByteArray: jest.fn().mockResolvedValue(mockJsonlData),
            },
          }),
      };
      S3Client.mockImplementation(() => mockS3Client);

      await expect(publishSnapshotToArweave(1)).rejects.toThrow(
        "JSONL hash mismatch with manifest",
      );
    });

    it("throws error when Arweave transaction fails", async () => {
      const { S3Client } = require("@aws-sdk/client-s3");
      const { init: arweaveInit } = require("arweave");

      const mockS3Client = {
        send: jest
          .fn()
          .mockResolvedValueOnce({
            Body: {
              transformToString: jest.fn().mockResolvedValue(JSON.stringify(mockManifest)),
            },
          })
          .mockResolvedValueOnce({
            Body: {
              transformToByteArray: jest.fn().mockResolvedValue(mockJsonlData),
            },
          }),
      };
      S3Client.mockImplementation(() => mockS3Client);

      const mockArweave = {
        createTransaction: jest.fn().mockResolvedValue({
          id: "mock-tx-id",
          addTag: jest.fn(),
        }),
        transactions: {
          sign: jest.fn().mockResolvedValue(undefined),
          post: jest.fn().mockResolvedValue({ status: 400 }),
        },
      };
      arweaveInit.mockReturnValue(mockArweave);

      await expect(publishSnapshotToArweave(1)).rejects.toThrow(
        "Failed to post JSONL transaction: 400",
      );
    });
  });

  describe("isSnapshotPublished", () => {
    it("returns true when snapshot is published", async () => {
      const { init: arweaveInit } = require("arweave");

      const mockArweave = {
        arql: jest.fn().mockResolvedValue(["tx-id-1", "tx-id-2"]),
      };
      arweaveInit.mockReturnValue(mockArweave);

      const result = await isSnapshotPublished(1);

      expect(result).toBe(true);
      expect(mockArweave.arql).toHaveBeenCalledWith({
        tags: [
          { name: "App", values: ["veris"] },
          { name: "Type", values: ["registry-snapshot"] },
          { name: "Batch", values: ["1"] },
        ],
      });
    });

    it("returns false when snapshot is not published", async () => {
      const { init: arweaveInit } = require("arweave");

      const mockArweave = {
        arql: jest.fn().mockResolvedValue([]),
      };
      arweaveInit.mockReturnValue(mockArweave);

      const result = await isSnapshotPublished(1);

      expect(result).toBe(false);
    });

    it("returns false when Arweave query fails", async () => {
      const { init: arweaveInit } = require("arweave");

      const mockArweave = {
        arql: jest.fn().mockRejectedValue(new Error("Arweave error")),
      };
      arweaveInit.mockReturnValue(mockArweave);

      const result = await isSnapshotPublished(1);

      expect(result).toBe(false);
    });
  });
});
