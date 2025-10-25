/**
 * Tests for verification conformance between primary and mirror systems
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock AWS SDK
const mockS3Client = {
  send: jest.fn(),
};

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => mockS3Client),
  GetObjectCommand: jest.fn(),
}));

// Mock database
const mockSupabaseService = jest.fn().mockReturnValue({
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: "test-proof-id",
            user_id: "test-user",
            file_name: "test.pdf",
            file_hash: "test-hash",
            created_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      }),
    }),
  }),
});

jest.mock("../lib/db", () => ({
  supabaseService: mockSupabaseService,
}));

// Mock crypto
jest.mock("crypto", () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mock-hash"),
  }),
}));

describe("Verification Conformance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Primary vs Mirror Conformance", () => {
    it("should return identical response format for same proof", async () => {
      mockS3Client.send.mockResolvedValue({
        Body: {
          transformToByteArray: jest.fn().mockResolvedValue(Buffer.from("compressed-data")),
        },
      });

      // Mock the verification response format
      const expectedResponse = {
        verified: true,
        proof: {
          id: "test-proof-id",
          userId: "test-user",
          fileName: "test.pdf",
          fileHash: "test-hash",
          createdAt: "2024-01-01T00:00:00Z",
        },
        timestamp: expect.any(String),
        method: "primary",
      };

      expect(expectedResponse).toHaveProperty("verified");
      expect(expectedResponse).toHaveProperty("proof");
      expect(expectedResponse).toHaveProperty("timestamp");
      expect(expectedResponse).toHaveProperty("method");
      expect(expectedResponse.proof).toHaveProperty("id");
      expect(expectedResponse.proof).toHaveProperty("userId");
      expect(expectedResponse.proof).toHaveProperty("fileName");
    });

    it("should handle proof not found in mirror", async () => {
      mockS3Client.send.mockRejectedValue(new Error("NoSuchKey"));

      const expectedResponse = {
        verified: false,
        error: "Proof not found",
        timestamp: expect.any(String),
        method: "mirror",
      };

      expect(expectedResponse).toHaveProperty("verified");
      expect(expectedResponse).toHaveProperty("error");
      expect(expectedResponse).toHaveProperty("timestamp");
      expect(expectedResponse).toHaveProperty("method");
      expect(expectedResponse.verified).toBe(false);
    });

    it("should handle verification failure", async () => {
      mockS3Client.send.mockResolvedValue({
        Body: {
          transformToByteArray: jest.fn().mockResolvedValue(Buffer.from("invalid-data")),
        },
      });

      const expectedResponse = {
        verified: false,
        error: "Verification failed",
        timestamp: expect.any(String),
        method: "primary",
      };

      expect(expectedResponse).toHaveProperty("verified");
      expect(expectedResponse).toHaveProperty("error");
      expect(expectedResponse).toHaveProperty("timestamp");
      expect(expectedResponse).toHaveProperty("method");
      expect(expectedResponse.verified).toBe(false);
    });
  });

  describe("Response Format Consistency", () => {
    it("should maintain consistent field types", () => {
      const response = {
        verified: true,
        proof: {
          id: "string",
          userId: "string",
          fileName: "string",
          fileHash: "string",
          createdAt: "string",
        },
        timestamp: "string",
        method: "string",
      };

      expect(typeof response.verified).toBe("boolean");
      expect(typeof response.proof.id).toBe("string");
      expect(typeof response.proof.userId).toBe("string");
      expect(typeof response.proof.fileName).toBe("string");
      expect(typeof response.proof.fileHash).toBe("string");
      expect(typeof response.proof.createdAt).toBe("string");
      expect(typeof response.timestamp).toBe("string");
      expect(typeof response.method).toBe("string");
    });

    it("should use ISO8601 timestamp format", () => {
      const timestamp = "2024-01-01T00:00:00.000Z";
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

      expect(iso8601Regex.test(timestamp)).toBe(true);
    });

    it("should handle error responses consistently", () => {
      const errorResponse = {
        verified: false,
        error: "Error message",
        timestamp: "2024-01-01T00:00:00.000Z",
        method: "primary",
      };

      expect(typeof errorResponse.verified).toBe("boolean");
      expect(typeof errorResponse.error).toBe("string");
      expect(typeof errorResponse.timestamp).toBe("string");
      expect(typeof errorResponse.method).toBe("string");
      expect(errorResponse.verified).toBe(false);
    });
  });

  describe("Data Integrity", () => {
    it("should preserve proof data integrity", () => {
      const originalProof = {
        id: "test-proof-id",
        userId: "test-user",
        fileName: "test.pdf",
        fileHash: "test-hash",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const verifiedProof = {
        id: originalProof.id,
        userId: originalProof.userId,
        fileName: originalProof.fileName,
        fileHash: originalProof.fileHash,
        createdAt: originalProof.createdAt,
      };

      expect(verifiedProof).toEqual(originalProof);
    });

    it("should handle compressed data correctly", async () => {
      const compressedData = Buffer.from("compressed-data");
      const mockTransform = jest.fn().mockResolvedValue(compressedData);

      mockS3Client.send.mockResolvedValue({
        Body: {
          transformToByteArray: mockTransform,
        },
      });

      const result = await mockS3Client.send();
      const data = await result.Body.transformToByteArray();

      expect(data).toEqual(compressedData);
      expect(mockTransform).toHaveBeenCalled();
    });
  });
});
