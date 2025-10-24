/**
 * Tests for Veris SDK Client
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { VerisClient } from "../client.js";
import { CreateProofRequest, VerifyProofRequest } from "../types.js";

// Mock axios
jest.mock("axios");
const mockedAxios = jest.mocked(require("axios"));

describe("VerisClient", () => {
  let client: VerisClient;
  const mockConfig = {
    baseUrl: "https://api.verisplatform.com",
    apiKey: "test-api-key",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
      defaults: {
        headers: {
          common: {},
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    client = new VerisClient(mockConfig);
  });

  describe("createProof", () => {
    it("should create a proof successfully", async () => {
      const mockFile = new File(["test content"], "test.txt", { type: "text/plain" });
      const request: CreateProofRequest = {
        file: mockFile,
        userId: "user-123",
        project: "test-project",
      };

      const mockResponse = {
        data: {
          id: "proof-123",
          hash_prefix: "A1B2-C3D4",
          timestamp: "2024-01-01T00:00:00.000Z",
          url: "/proof/proof-123",
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.createProof(request);

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/api/proof/create",
        expect.any(FormData),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
    });
  });

  describe("verifyProof", () => {
    it("should verify proof by ID", async () => {
      const request: VerifyProofRequest = {
        id: "proof-123",
      };

      const mockResponse = {
        data: {
          schema_version: 1,
          proof_hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          valid: true,
          verified_at: "2024-01-01T00:00:00.000Z",
          signer_fp: "veris-signing-key",
          source_registry: "primary" as const,
          errors: [],
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.verifyProof(request);

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/api/proof/verify", { id: "proof-123" });
    });

    it("should verify proof by hash and signature", async () => {
      const request: VerifyProofRequest = {
        hashHex: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        signatureB64: "mock-signature",
      };

      const mockResponse = {
        data: {
          schema_version: 1,
          proof_hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          valid: true,
          verified_at: "2024-01-01T00:00:00.000Z",
          signer_fp: "veris-signing-key",
          source_registry: "primary" as const,
          errors: [],
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.verifyProof(request);

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/api/proof/verify", {
        hashHex: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        signatureB64: "mock-signature",
      });
    });

    it("should verify proof by file upload", async () => {
      const mockFile = new File(["test content"], "test.txt", { type: "text/plain" });
      const request: VerifyProofRequest = {
        file: mockFile,
        proofId: "proof-123",
      };

      const mockResponse = {
        data: {
          schema_version: 1,
          proof_hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          valid: true,
          verified_at: "2024-01-01T00:00:00.000Z",
          signer_fp: "veris-signing-key",
          source_registry: "primary" as const,
          errors: [],
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.verifyProof(request);

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/api/proof/verify",
        expect.any(FormData),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
    });
  });

  describe("getProof", () => {
    it("should get proof details", async () => {
      const mockResponse = {
        data: {
          id: "proof-123",
          file_name: "test.txt",
          hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          hash_prefix: "A1B2-C3D4",
          signature: "mock-signature",
          timestamp: "2024-01-01T00:00:00.000Z",
          project: "test-project",
          visibility: "public",
          created_at: "2024-01-01T00:00:00.000Z",
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getProof("proof-123");

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/api/proof/proof-123");
    });
  });

  describe("getLatestIntegrity", () => {
    it("should get latest integrity snapshot", async () => {
      const mockResponse = {
        data: {
          batch: 1,
          merkle_root: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          s3_url: "https://bucket.s3.amazonaws.com/manifest.json",
          arweave_txid: "arweave-tx-id",
          schema_version: 1,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getLatestIntegrity();

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/api/integrity/latest");
    });
  });

  describe("getIntegrityHealth", () => {
    it("should get system health status", async () => {
      const mockResponse = {
        data: {
          status: "healthy" as const,
          total_proofs: 1500,
          checks: {
            signing_key_present: true,
            database_accessible: true,
            snapshot_exists: true,
            snapshot_recent: true,
            arweave_published: true,
            snapshot_count_correct: true,
          },
          issues: [],
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getIntegrityHealth();

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/api/integrity/health");
    });
  });

  describe("API key management", () => {
    it("should set API key", () => {
      const mockAxiosInstance = mockedAxios.create();
      client.setApiKey("new-api-key");

      expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe("Bearer new-api-key");
    });

    it("should clear API key", () => {
      const mockAxiosInstance = mockedAxios.create();
      client.clearApiKey();

      expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBeUndefined();
    });
  });
});
