/**
 * Comprehensive unit tests for the public verification route
 * Tests valid, tampered, expired, and missing inputs as specified
 */

import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import { NextRequest } from "next/server";
import { GET as handleVerify } from "@/app/api/verify/route";

// Mock all dependencies
const mockSupabaseService = jest.fn();
const mockVerifySignature = jest.fn();
const mockGetKeyFingerprint = jest.fn();
const mockDownloadProofFromRegistry = jest.fn();
const mockVerifyCanonicalProof = jest.fn();
const mockStreamFileToTmp = jest.fn();
const mockCleanupTmpFile = jest.fn();
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
const mockCapture = jest.fn();
const mockJsonOk = jest.fn();
const mockJsonErr = jest.fn();

// Mock modules
jest.mock("@/lib/db", () => ({
  supabaseService: mockSupabaseService,
}));

jest.mock("@/lib/crypto-server", () => ({
  verifySignature: mockVerifySignature,
  getKeyFingerprint: mockGetKeyFingerprint,
}));

jest.mock("@/lib/s3-registry", () => ({
  downloadProofFromRegistry: mockDownloadProofFromRegistry,
}));

jest.mock("@/lib/proof-schema", () => ({
  verifyCanonicalProof: mockVerifyCanonicalProof,
}));

jest.mock("@/lib/file-upload", () => ({
  streamFileToTmp: mockStreamFileToTmp,
  cleanupTmpFile: mockCleanupTmpFile,
}));

jest.mock("@/lib/logger", () => ({
  logger: mockLogger,
}));

jest.mock("@/lib/observability", () => ({
  capture: mockCapture,
}));

jest.mock("@/lib/http", () => ({
  jsonOk: mockJsonOk,
  jsonErr: mockJsonErr,
}));

jest.mock("@/lib/env", () => ({
  ENV: {
    server: {
      VERIFICATION_TIMESTAMP_TOLERANCE_MS: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
}));

// Import the handler after mocking
// Note: We'll test the route indirectly through API calls to avoid environment validation issues

describe("Public Verification Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGetKeyFingerprint.mockReturnValue("test-fingerprint-123");
    mockJsonOk.mockImplementation((data) => new Response(JSON.stringify(data), { status: 200 }));
    mockJsonErr.mockImplementation(
      (message, status) => new Response(JSON.stringify({ error: message }), { status }),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("Valid Inputs", () => {
    it("should verify a valid proof from S3 registry", async () => {
      const validProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "test-hash-123",
        signed_at: new Date().toISOString(),
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "test-proof-id",
        },
        metadata: {},
        signature: "valid-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(validProof);
      mockVerifyCanonicalProof.mockReturnValue(true);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockDownloadProofFromRegistry).toHaveBeenCalledWith("test-hash-123", true);
      expect(mockVerifyCanonicalProof).toHaveBeenCalledWith(validProof);
      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: true,
        signer: "test-fingerprint-123",
        issued_at: validProof.signed_at,
        latency_ms: expect.any(Number),
        errors: [],
      });
    });

    it("should verify a valid proof from database fallback", async () => {
      const validProof = {
        hash_full: "test-hash-123",
        signature: "valid-signature",
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Mock S3 registry failure
      mockDownloadProofFromRegistry.mockRejectedValue(new Error("Not found"));

      // Mock database success
      const mockDbQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: validProof,
                error: null,
              }),
            }),
          }),
        }),
      };
      mockSupabaseService.mockReturnValue(mockDbQuery);
      mockVerifySignature.mockReturnValue(true);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockVerifySignature).toHaveBeenCalledWith("test-hash-123", "valid-signature");
      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: true,
        signer: "test-fingerprint-123",
        issued_at: validProof.timestamp,
        latency_ms: expect.any(Number),
        errors: [],
      });
    });

    it("should verify a valid uploaded file", async () => {
      const validProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "file-hash-456",
        signed_at: new Date().toISOString(),
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "file-proof-id",
        },
        metadata: {},
        signature: "valid-signature",
      };

      mockStreamFileToTmp.mockResolvedValue({
        tmpPath: "/tmp/test-file",
        hashFull: "file-hash-456",
      });
      mockDownloadProofFromRegistry.mockResolvedValue(validProof);
      mockVerifyCanonicalProof.mockReturnValue(true);

      const formData = new FormData();
      const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
      formData.append("file", file);

      const request = new NextRequest("http://localhost/api/verify", {
        method: "POST",
        body: formData,
      });
      const response = await handleVerify(request);

      expect(mockStreamFileToTmp).toHaveBeenCalledWith(file);
      expect(mockDownloadProofFromRegistry).toHaveBeenCalledWith("file-hash-456", true);
      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: true,
        signer: "test-fingerprint-123",
        issued_at: validProof.signed_at,
        latency_ms: expect.any(Number),
        errors: [],
      });
    });
  });

  describe("Tampered Inputs", () => {
    it("should reject proof with invalid signature", async () => {
      const tamperedProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "test-hash-123",
        signed_at: new Date().toISOString(),
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "test-proof-id",
        },
        metadata: {},
        signature: "tampered-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(tamperedProof);
      mockVerifyCanonicalProof.mockReturnValue(false);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "test-fingerprint-123",
        issued_at: tamperedProof.signed_at,
        latency_ms: expect.any(Number),
        errors: ["Signature verification failed"],
      });
    });

    it("should reject proof with tampered content", async () => {
      const tamperedProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "tampered-hash-456",
        signed_at: new Date().toISOString(),
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "tampered-proof-id",
        },
        metadata: {},
        signature: "valid-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(tamperedProof);
      mockVerifyCanonicalProof.mockReturnValue(false);

      const request = new NextRequest("http://localhost/api/verify?hash=tampered-hash-456");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "test-fingerprint-123",
        issued_at: tamperedProof.signed_at,
        latency_ms: expect.any(Number),
        errors: ["Signature verification failed"],
      });
    });

    it("should reject database proof with invalid signature", async () => {
      const tamperedProof = {
        hash_full: "test-hash-123",
        signature: "tampered-signature",
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Mock S3 registry failure
      mockDownloadProofFromRegistry.mockRejectedValue(new Error("Not found"));

      // Mock database success but invalid signature
      const mockDbQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: tamperedProof,
                error: null,
              }),
            }),
          }),
        }),
      };
      mockSupabaseService.mockReturnValue(mockDbQuery);
      mockVerifySignature.mockReturnValue(false);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "test-fingerprint-123",
        issued_at: tamperedProof.timestamp,
        latency_ms: expect.any(Number),
        errors: ["Signature verification failed"],
      });
    });
  });

  describe("Expired Inputs", () => {
    it("should reject proof with expired timestamp", async () => {
      const expiredProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "test-hash-123",
        signed_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "expired-proof-id",
        },
        metadata: {},
        signature: "valid-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(expiredProof);
      mockVerifyCanonicalProof.mockReturnValue(true);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "test-fingerprint-123",
        issued_at: expiredProof.signed_at,
        latency_ms: expect.any(Number),
        errors: ["Timestamp outside tolerance window (25h > 24h)"],
      });
    });

    it("should reject proof with future timestamp", async () => {
      const futureProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "test-hash-123",
        signed_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // 25 hours in future
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "future-proof-id",
        },
        metadata: {},
        signature: "valid-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(futureProof);
      mockVerifyCanonicalProof.mockReturnValue(true);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "test-fingerprint-123",
        issued_at: futureProof.signed_at,
        latency_ms: expect.any(Number),
        errors: ["Timestamp outside tolerance window (25h > 24h)"],
      });
    });

    it("should reject proof with invalid timestamp format", async () => {
      const invalidTimestampProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "test-hash-123",
        signed_at: "invalid-timestamp",
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "invalid-timestamp-proof-id",
        },
        metadata: {},
        signature: "valid-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(invalidTimestampProof);
      mockVerifyCanonicalProof.mockReturnValue(true);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "test-fingerprint-123",
        issued_at: "invalid-timestamp",
        latency_ms: expect.any(Number),
        errors: ["Invalid timestamp format"],
      });
    });
  });

  describe("Missing Inputs", () => {
    it("should handle missing hash parameter", async () => {
      const request = new NextRequest("http://localhost/api/verify");
      const response = await handleVerify(request);

      expect(mockJsonErr).toHaveBeenCalledWith("Hash parameter or file is required", 400);
    });

    it("should handle missing file in multipart request", async () => {
      const formData = new FormData();
      // No file added to form data

      const request = new NextRequest("http://localhost/api/verify", {
        method: "POST",
        body: formData,
      });
      const response = await handleVerify(request);

      expect(mockJsonErr).toHaveBeenCalledWith("File is required for file-based verification", 400);
    });

    it("should handle proof not found in S3 registry", async () => {
      mockDownloadProofFromRegistry.mockRejectedValue(new Error("Proof not found"));

      const request = new NextRequest("http://localhost/api/verify?hash=nonexistent-hash");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "",
        issued_at: expect.any(String),
        latency_ms: expect.any(Number),
        errors: ["S3 registry error: Proof not found"],
      });
    });

    it("should handle proof not found in database", async () => {
      // Mock S3 registry failure
      mockDownloadProofFromRegistry.mockRejectedValue(new Error("Not found"));

      // Mock database failure
      const mockDbQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "No rows found" },
              }),
            }),
          }),
        }),
      };
      mockSupabaseService.mockReturnValue(mockDbQuery);

      const request = new NextRequest("http://localhost/api/verify?hash=nonexistent-hash");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "",
        issued_at: expect.any(String),
        latency_ms: expect.any(Number),
        errors: ["S3 registry error: Not found", "Database error: Proof not found in database"],
      });
    });

    it("should handle missing signature in database proof", async () => {
      const proofWithoutSignature = {
        hash_full: "test-hash-123",
        signature: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Mock S3 registry failure
      mockDownloadProofFromRegistry.mockRejectedValue(new Error("Not found"));

      // Mock database success but no signature
      const mockDbQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: proofWithoutSignature,
                error: null,
              }),
            }),
          }),
        }),
      };
      mockSupabaseService.mockReturnValue(mockDbQuery);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "test-fingerprint-123",
        issued_at: proofWithoutSignature.timestamp,
        latency_ms: expect.any(Number),
        errors: ["Signature verification failed"],
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle S3 registry download errors", async () => {
      mockDownloadProofFromRegistry.mockRejectedValue(new Error("S3 connection failed"));

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "",
        issued_at: expect.any(String),
        latency_ms: expect.any(Number),
        errors: ["S3 registry error: S3 connection failed"],
      });
    });

    it("should handle database connection errors", async () => {
      // Mock S3 registry failure
      mockDownloadProofFromRegistry.mockRejectedValue(new Error("Not found"));

      // Mock database connection error
      mockSupabaseService.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: false,
        signer: "",
        issued_at: expect.any(String),
        latency_ms: expect.any(Number),
        errors: ["S3 registry error: Not found", "Database error: Database connection failed"],
      });
    });

    it("should handle file upload errors", async () => {
      mockStreamFileToTmp.mockRejectedValue(new Error("File upload failed"));

      const formData = new FormData();
      const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
      formData.append("file", file);

      const request = new NextRequest("http://localhost/api/verify", {
        method: "POST",
        body: formData,
      });
      const response = await handleVerify(request);

      expect(mockJsonErr).toHaveBeenCalledWith("Internal server error", 500);
    });

    it("should handle JSON parsing errors", async () => {
      const request = new NextRequest("http://localhost/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });
      const response = await handleVerify(request);

      expect(mockJsonErr).toHaveBeenCalledWith("Internal server error", 500);
    });
  });

  describe("Response Format", () => {
    it("should return correct response format for valid proof", async () => {
      const validProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "test-hash-123",
        signed_at: "2024-01-01T12:00:00.000Z",
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "test-proof-id",
        },
        metadata: {},
        signature: "valid-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(validProof);
      mockVerifyCanonicalProof.mockReturnValue(true);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      const expectedResponse = {
        valid: true,
        signer: "test-fingerprint-123",
        issued_at: "2024-01-01T12:00:00.000Z",
        latency_ms: expect.any(Number),
        errors: [],
      };

      expect(mockJsonOk).toHaveBeenCalledWith(expectedResponse);
    });

    it("should return correct response format for invalid proof", async () => {
      const invalidProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "test-hash-123",
        signed_at: "2024-01-01T12:00:00.000Z",
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "test-proof-id",
        },
        metadata: {},
        signature: "invalid-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(invalidProof);
      mockVerifyCanonicalProof.mockReturnValue(false);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      const expectedResponse = {
        valid: false,
        signer: "test-fingerprint-123",
        issued_at: "2024-01-01T12:00:00.000Z",
        latency_ms: expect.any(Number),
        errors: ["Signature verification failed"],
      };

      expect(mockJsonOk).toHaveBeenCalledWith(expectedResponse);
    });
  });

  describe("Latency Measurement", () => {
    it("should measure and return latency in milliseconds", async () => {
      const validProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "test-hash-123",
        signed_at: new Date().toISOString(),
        signer_fingerprint: "test-fingerprint-123",
        subject: {
          type: "document",
          namespace: "test",
          id: "test-proof-id",
        },
        metadata: {},
        signature: "valid-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(validProof);
      mockVerifyCanonicalProof.mockReturnValue(true);

      const request = new NextRequest("http://localhost/api/verify?hash=test-hash-123");
      const response = await handleVerify(request);

      expect(mockJsonOk).toHaveBeenCalledWith({
        valid: true,
        signer: "test-fingerprint-123",
        issued_at: validProof.signed_at,
        latency_ms: expect.any(Number),
        errors: [],
      });

      // Verify latency is a positive number
      const callArgs = mockJsonOk.mock.calls[0][0];
      expect(callArgs.latency_ms).toBeGreaterThan(0);
    });
  });
});
