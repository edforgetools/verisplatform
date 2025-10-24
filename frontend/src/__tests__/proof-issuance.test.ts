/**
 * Tests for proof issuance API contract
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/proof/create/route";
import {
  validateCreateProofRequest,
  validateCreateProofResponse,
  CreateProofRequest,
  CreateProofResponse,
} from "@/types/proof-api";
import { logger } from "@/lib/logger";

// Mock dependencies
jest.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    NEXT_PUBLIC_STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: "sk_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    SUPABASE_SERVICE_KEY: "placeholder-service-key",
    VERIS_SIGNING_PRIVATE_KEY: "placeholder-private-key-".repeat(10),
    VERIS_SIGNING_PUBLIC_KEY: "placeholder-public-key-".repeat(10),
    CRON_JOB_TOKEN: "placeholder-cron-token",
    UPSTASH_REDIS_REST_URL: "https://placeholder-redis.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "placeholder-redis-token",
    REGISTRY_S3_BUCKET: "test-bucket",
    ARWEAVE_WALLET_JSON: '{"kty":"EC","crv":"P-256","x":"test","y":"test","d":"test"}',
    AWS_REGION: "us-east-1",
  },
}));
jest.mock("@/lib/auth-server", () => ({
  getAuthenticatedUserId: jest.fn(),
}));
jest.mock("@/lib/entitlements", () => ({
  assertEntitled: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock("@/lib/file-upload", () => ({
  streamFileToTmp: jest.fn(),
  cleanupTmpFile: jest.fn(),
}));
jest.mock("@/lib/crypto-server");
jest.mock("@/lib/proof-schema");
jest.mock("@/lib/db");
jest.mock("@/lib/billing-service");
jest.mock("@/lib/ids");
jest.mock("@/lib/logger");
jest.mock("@/lib/observability");

const mockGetAuthenticatedUserId = jest.fn();
const mockAssertEntitled = jest.fn();
const mockStreamFileToTmp = jest.fn();
const mockSignHash = jest.fn();
const mockCreateCanonicalProof = jest.fn();
const mockCanonicalizeAndSign = jest.fn();
const mockSupabaseService = jest.fn();
const mockRecordBillingEvent = jest.fn();
const mockGenerateProofId = jest.fn();
const mockLogger = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Import mocked modules
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { assertEntitled } from "@/lib/entitlements";
import { streamFileToTmp, cleanupTmpFile } from "@/lib/file-upload";
import { signHash } from "@/lib/crypto-server";
import { createCanonicalProof, canonicalizeAndSign } from "@/lib/proof-schema";
import { supabaseService } from "@/lib/db";
import { recordBillingEvent } from "@/lib/billing-service";
import { generateProofId } from "@/lib/ids";
import { logger } from "@/lib/logger";

// Setup mocks
(getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>) =
  mockGetAuthenticatedUserId;
(assertEntitled as jest.MockedFunction<typeof assertEntitled>) = mockAssertEntitled;
(streamFileToTmp as jest.MockedFunction<typeof streamFileToTmp>) = mockStreamFileToTmp;
(signHash as jest.MockedFunction<typeof signHash>) = mockSignHash;
(createCanonicalProof as jest.MockedFunction<typeof createCanonicalProof>) =
  mockCreateCanonicalProof;
(canonicalizeAndSign as jest.MockedFunction<typeof canonicalizeAndSign>) = mockCanonicalizeAndSign;
(supabaseService as jest.MockedFunction<typeof supabaseService>) = mockSupabaseService;
(recordBillingEvent as jest.MockedFunction<typeof recordBillingEvent>) = mockRecordBillingEvent;
(generateProofId as jest.MockedFunction<typeof generateProofId>) = mockGenerateProofId;

describe("Proof Issuance API Contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    mockAssertEntitled.mockResolvedValue(undefined);
    mockStreamFileToTmp.mockResolvedValue({
      tmpPath: "/tmp/test-file",
      hashFull: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      hashPrefix: "a1b2c3d4",
    });
    mockGenerateProofId.mockReturnValue("proof123");
    mockCreateCanonicalProof.mockReturnValue({
      schema_version: 1,
      hash_algo: "sha256",
      hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      signed_at: "2024-01-01T00:00:00.000Z",
      signer_fingerprint: "fingerprint123",
      subject: { type: "file", namespace: "veris", id: "proof123" },
      metadata: { file_name: "test.txt", project: null, user_id: "user123" },
    });
    mockCanonicalizeAndSign.mockReturnValue({
      schema_version: 1,
      hash_algo: "sha256",
      hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      signed_at: "2024-01-01T00:00:00.000Z",
      signer_fingerprint: "fingerprint123",
      subject: { type: "file", namespace: "veris", id: "proof123" },
      metadata: { file_name: "test.txt", project: null, user_id: "user123" },
      signature: "signature123",
    });

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: "proof123",
                user_id: "user123",
                file_name: "test.txt",
                version: 1,
                hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
                hash_prefix: "a1b2c3d4",
                signature: "signature123",
                timestamp: "2024-01-01T00:00:00.000Z",
                project: null,
                visibility: "public",
                proof_json: {},
                created_at: "2024-01-01T00:00:00.000Z",
              },
              error: null,
            }),
          }),
        }),
      }),
    };
    mockSupabaseService.mockReturnValue(mockSupabase);
    mockRecordBillingEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Request DTOs", () => {
    it("should validate valid CreateProofRequest", () => {
      const validRequest = {
        file: new File(["test content"], "test.txt", { type: "text/plain" }),
        user_id: "user123",
        project: "test-project",
      };

      expect(() => validateCreateProofRequest(validRequest)).not.toThrow();
    });

    it("should reject CreateProofRequest without file", () => {
      const invalidRequest = {
        user_id: "user123",
        project: "test-project",
      };

      expect(() => validateCreateProofRequest(invalidRequest)).toThrow();
    });

    it("should reject CreateProofRequest without user_id", () => {
      const invalidRequest = {
        file: new File(["test content"], "test.txt", { type: "text/plain" }),
        project: "test-project",
      };

      expect(() => validateCreateProofRequest(invalidRequest)).toThrow();
    });

    it("should accept CreateProofRequest without optional project", () => {
      const validRequest = {
        file: new File(["test content"], "test.txt", { type: "text/plain" }),
        user_id: "user123",
      };

      expect(() => validateCreateProofRequest(validRequest)).not.toThrow();
    });
  });

  describe("Response DTOs", () => {
    it("should validate valid CreateProofResponse", () => {
      const validResponse: CreateProofResponse = {
        proof_id: "proof123",
        hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        timestamp: "2024-01-01T00:00:00.000Z",
        signature: "signature123",
        url: "https://example.com/proof/proof123",
      };

      expect(() => validateCreateProofResponse(validResponse)).not.toThrow();
    });

    it("should reject CreateProofResponse with invalid hash format", () => {
      const invalidResponse = {
        proof_id: "proof123",
        hash: "invalid-hash",
        timestamp: "2024-01-01T00:00:00.000Z",
        signature: "signature123",
      };

      expect(() => validateCreateProofResponse(invalidResponse)).toThrow();
    });

    it("should reject CreateProofResponse without required fields", () => {
      const invalidResponse = {
        proof_id: "proof123",
        hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        // missing timestamp and signature
      };

      expect(() => validateCreateProofResponse(invalidResponse)).toThrow();
    });

    it("should accept CreateProofResponse without optional url", () => {
      const validResponse: CreateProofResponse = {
        proof_id: "proof123",
        hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        timestamp: "2024-01-01T00:00:00.000Z",
        signature: "signature123",
      };

      expect(() => validateCreateProofResponse(validResponse)).not.toThrow();
    });
  });

  describe("API Endpoint", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue(null);

      const formData = new FormData();
      formData.append("file", new File(["test"], "test.txt"));
      formData.append("user_id", "user123");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 when file is missing", async () => {
      const formData = new FormData();
      formData.append("user_id", "user123");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 when user_id is missing", async () => {
      const formData = new FormData();
      formData.append("file", new File(["test"], "test.txt"));

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 403 when user_id doesn't match authenticated user", async () => {
      const formData = new FormData();
      formData.append("file", new File(["test"], "test.txt"));
      formData.append("user_id", "different-user");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 when user lacks permissions", async () => {
      mockAssertEntitled.mockRejectedValue(new Error("Insufficient permissions"));

      const formData = new FormData();
      formData.append("file", new File(["test"], "test.txt"));
      formData.append("user_id", "user123");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should successfully create proof and return proper response format", async () => {
      const formData = new FormData();
      formData.append("file", new File(["test content"], "test.txt", { type: "text/plain" }));
      formData.append("user_id", "user123");
      formData.append("project", "test-project");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const responseData = await response.json();

      // Validate response structure matches DTO
      expect(() => validateCreateProofResponse(responseData)).not.toThrow();

      // Check required fields are present
      expect(responseData).toHaveProperty("proof_id");
      expect(responseData).toHaveProperty("hash");
      expect(responseData).toHaveProperty("timestamp");
      expect(responseData).toHaveProperty("signature");

      // Check hash format
      expect(responseData.hash).toMatch(/^[a-f0-9]{64}$/);

      // Check timestamp format
      expect(new Date(responseData.timestamp)).toBeInstanceOf(Date);

      // Check optional fields
      expect(responseData).toHaveProperty("url");
    });

    it("should handle database errors gracefully", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          }),
        }),
      };
      mockSupabaseService.mockReturnValue(mockSupabase);

      const formData = new FormData();
      formData.append("file", new File(["test"], "test.txt"));
      formData.append("user_id", "user123");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it("should record billing event on successful proof creation", async () => {
      const formData = new FormData();
      formData.append("file", new File(["test"], "test.txt"));
      formData.append("user_id", "user123");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      expect(mockRecordBillingEvent).toHaveBeenCalledWith({
        type: "proof.create",
        userId: "user123",
        proofId: "proof123",
        success: true,
        metadata: {
          file_name: "test.txt",
          project: null,
          hash_prefix: "a1b2c3d4",
        },
      });
    });

    it("should clean up temporary files", async () => {
      const formData = new FormData();
      formData.append("file", new File(["test"], "test.txt"));
      formData.append("user_id", "user123");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      expect(cleanupTmpFile).toHaveBeenCalledWith("/tmp/test-file");
    });
  });

  describe("Input Validation", () => {
    it("should validate file type and size", async () => {
      mockStreamFileToTmp.mockRejectedValue(new Error("Invalid file type"));

      const formData = new FormData();
      formData.append("file", new File(["test"], "test.txt"));
      formData.append("user_id", "user123");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("Response Validation", () => {
    it("should validate response before sending", async () => {
      // Mock a response that would fail validation
      mockCanonicalizeAndSign.mockReturnValue({
        signature: "", // Empty signature should fail validation
      });

      const formData = new FormData();
      formData.append("file", new File(["test"], "test.txt"));
      formData.append("user_id", "user123");

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
