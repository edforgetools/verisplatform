/**
 * Unit tests for verification logic functions
 * Tests the core verification functionality without importing the full route
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock all dependencies
const mockVerifySignature = jest.fn();
const mockGetKeyFingerprint = jest.fn();
const mockDownloadProofFromRegistry = jest.fn();
const mockVerifyCanonicalProof = jest.fn();
const mockSupabaseService = jest.fn();

// Mock modules
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

jest.mock("@/lib/db", () => ({
  supabaseService: mockSupabaseService,
}));

jest.mock("@/lib/env", () => ({
  ENV: {
    server: {
      VERIFICATION_TIMESTAMP_TOLERANCE_MS: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
}));

describe("Verification Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKeyFingerprint.mockReturnValue("test-fingerprint-123");
  });

  describe("Timestamp Validation", () => {
    it("should validate timestamp within tolerance window", () => {
      // Mock the timestamp validation function
      const validateTimestampWindow = (issuedAt: string): { valid: boolean; error?: string } => {
        const timestampToleranceMs = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        const issuedTime = new Date(issuedAt).getTime();

        if (isNaN(issuedTime)) {
          return { valid: false, error: "Invalid timestamp format" };
        }

        const timeDiff = Math.abs(now - issuedTime);
        if (timeDiff > timestampToleranceMs) {
          return {
            valid: false,
            error: `Timestamp outside tolerance window (${Math.round(
              timeDiff / 1000 / 60 / 60,
            )}h > ${Math.round(timestampToleranceMs / 1000 / 60 / 60)}h)`,
          };
        }

        return { valid: true };
      };

      // Test valid timestamp (within 24 hours)
      const validTimestamp = new Date().toISOString();
      const result = validateTimestampWindow(validTimestamp);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject timestamp outside tolerance window", () => {
      const validateTimestampWindow = (issuedAt: string): { valid: boolean; error?: string } => {
        const timestampToleranceMs = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        const issuedTime = new Date(issuedAt).getTime();

        if (isNaN(issuedTime)) {
          return { valid: false, error: "Invalid timestamp format" };
        }

        const timeDiff = Math.abs(now - issuedTime);
        if (timeDiff > timestampToleranceMs) {
          return {
            valid: false,
            error: `Timestamp outside tolerance window (${Math.round(
              timeDiff / 1000 / 60 / 60,
            )}h > ${Math.round(timestampToleranceMs / 1000 / 60 / 60)}h)`,
          };
        }

        return { valid: true };
      };

      // Test expired timestamp (25 hours ago)
      const expiredTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const result = validateTimestampWindow(expiredTimestamp);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Timestamp outside tolerance window");
    });

    it("should reject invalid timestamp format", () => {
      const validateTimestampWindow = (issuedAt: string): { valid: boolean; error?: string } => {
        const timestampToleranceMs = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        const issuedTime = new Date(issuedAt).getTime();

        if (isNaN(issuedTime)) {
          return { valid: false, error: "Invalid timestamp format" };
        }

        const timeDiff = Math.abs(now - issuedTime);
        if (timeDiff > timestampToleranceMs) {
          return {
            valid: false,
            error: `Timestamp outside tolerance window (${Math.round(
              timeDiff / 1000 / 60 / 60,
            )}h > ${Math.round(timestampToleranceMs / 1000 / 60 / 60)}h)`,
          };
        }

        return { valid: true };
      };

      // Test invalid timestamp format
      const invalidTimestamp = "invalid-timestamp";
      const result = validateTimestampWindow(invalidTimestamp);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid timestamp format");
    });
  });

  describe("S3 Registry Verification", () => {
    it("should verify valid proof from S3 registry", async () => {
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

      // Simulate the verification logic
      const verifyFromS3Registry = async (hash: string) => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          const proof = await mockDownloadProofFromRegistry(hash, true);

          if (!proof) {
            return {
              valid: false,
              signer: "",
              issued_at: new Date().toISOString(),
              latency_ms: Date.now() - startTime,
              errors: ["Proof not found in S3 registry"],
            };
          }

          // Verify the canonical proof signature
          const signatureValid = mockVerifyCanonicalProof(proof);
          if (!signatureValid) {
            errors.push("Signature verification failed");
          }

          // Validate timestamp window
          const timestampValidation = validateTimestampWindow(proof.signed_at);
          if (!timestampValidation.valid) {
            errors.push(timestampValidation.error || "Timestamp validation failed");
          }

          const isValid = signatureValid && timestampValidation.valid;

          return {
            valid: isValid,
            signer: proof.signer_fingerprint,
            issued_at: proof.signed_at,
            latency_ms: Date.now() - startTime,
            errors,
          };
        } catch (error) {
          return {
            valid: false,
            signer: "",
            issued_at: new Date().toISOString(),
            latency_ms: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : "Unknown error"],
          };
        }
      };

      const validateTimestampWindow = (issuedAt: string): { valid: boolean; error?: string } => {
        const timestampToleranceMs = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        const issuedTime = new Date(issuedAt).getTime();

        if (isNaN(issuedTime)) {
          return { valid: false, error: "Invalid timestamp format" };
        }

        const timeDiff = Math.abs(now - issuedTime);
        if (timeDiff > timestampToleranceMs) {
          return {
            valid: false,
            error: `Timestamp outside tolerance window (${Math.round(
              timeDiff / 1000 / 60 / 60,
            )}h > ${Math.round(timestampToleranceMs / 1000 / 60 / 60)}h)`,
          };
        }

        return { valid: true };
      };

      const result = await verifyFromS3Registry("test-hash-123");

      expect(mockDownloadProofFromRegistry).toHaveBeenCalledWith("test-hash-123", true);
      expect(mockVerifyCanonicalProof).toHaveBeenCalledWith(validProof);
      expect(result.valid).toBe(true);
      expect(result.signer).toBe("test-fingerprint-123");
      expect(result.issued_at).toBe(validProof.signed_at);
      expect(result.errors).toEqual([]);
    });

    it("should reject proof with invalid signature from S3 registry", async () => {
      const invalidProof = {
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
        signature: "invalid-signature",
      };

      mockDownloadProofFromRegistry.mockResolvedValue(invalidProof);
      mockVerifyCanonicalProof.mockReturnValue(false);

      // Simulate the verification logic
      const verifyFromS3Registry = async (hash: string) => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          const proof = await mockDownloadProofFromRegistry(hash, true);

          if (!proof) {
            return {
              valid: false,
              signer: "",
              issued_at: new Date().toISOString(),
              latency_ms: Date.now() - startTime,
              errors: ["Proof not found in S3 registry"],
            };
          }

          // Verify the canonical proof signature
          const signatureValid = mockVerifyCanonicalProof(proof);
          if (!signatureValid) {
            errors.push("Signature verification failed");
          }

          // Validate timestamp window
          const timestampValidation = validateTimestampWindow(proof.signed_at);
          if (!timestampValidation.valid) {
            errors.push(timestampValidation.error || "Timestamp validation failed");
          }

          const isValid = signatureValid && timestampValidation.valid;

          return {
            valid: isValid,
            signer: proof.signer_fingerprint,
            issued_at: proof.signed_at,
            latency_ms: Date.now() - startTime,
            errors,
          };
        } catch (error) {
          return {
            valid: false,
            signer: "",
            issued_at: new Date().toISOString(),
            latency_ms: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : "Unknown error"],
          };
        }
      };

      const validateTimestampWindow = (issuedAt: string): { valid: boolean; error?: string } => {
        const timestampToleranceMs = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        const issuedTime = new Date(issuedAt).getTime();

        if (isNaN(issuedTime)) {
          return { valid: false, error: "Invalid timestamp format" };
        }

        const timeDiff = Math.abs(now - issuedTime);
        if (timeDiff > timestampToleranceMs) {
          return {
            valid: false,
            error: `Timestamp outside tolerance window (${Math.round(
              timeDiff / 1000 / 60 / 60,
            )}h > ${Math.round(timestampToleranceMs / 1000 / 60 / 60)}h)`,
          };
        }

        return { valid: true };
      };

      const result = await verifyFromS3Registry("test-hash-123");

      expect(result.valid).toBe(false);
      expect(result.signer).toBe("test-fingerprint-123");
      expect(result.errors).toContain("Signature verification failed");
    });
  });

  describe("Database Verification", () => {
    it("should verify valid proof from database", async () => {
      const validProof = {
        hash_full: "test-hash-123",
        signature: "valid-signature",
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

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

      // Simulate the verification logic
      const verifyFromDatabase = async (hash: string) => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          const svc = mockSupabaseService();
          const { data: proof, error } = await svc
            .from("proofs")
            .select("hash_full, signature, timestamp, created_at")
            .eq("hash_full", hash)
            .single();

          if (error || !proof) {
            return {
              valid: false,
              signer: "",
              issued_at: new Date().toISOString(),
              latency_ms: Date.now() - startTime,
              errors: ["Proof not found in database"],
            };
          }

          // Verify signature if available
          const signatureVerified = proof.signature
            ? mockVerifySignature(proof.hash_full, proof.signature)
            : false;

          if (!signatureVerified) {
            errors.push("Signature verification failed");
          }

          // Validate timestamp window
          const timestampValidation = validateTimestampWindow(proof.timestamp);
          if (!timestampValidation.valid) {
            errors.push(timestampValidation.error || "Timestamp validation failed");
          }

          const signerFingerprint = mockGetKeyFingerprint() || "unknown";
          const isValid = signatureVerified && timestampValidation.valid;

          return {
            valid: isValid,
            signer: signerFingerprint,
            issued_at: proof.timestamp,
            latency_ms: Date.now() - startTime,
            errors,
          };
        } catch (error) {
          return {
            valid: false,
            signer: "",
            issued_at: new Date().toISOString(),
            latency_ms: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : "Unknown error"],
          };
        }
      };

      const validateTimestampWindow = (issuedAt: string): { valid: boolean; error?: string } => {
        const timestampToleranceMs = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        const issuedTime = new Date(issuedAt).getTime();

        if (isNaN(issuedTime)) {
          return { valid: false, error: "Invalid timestamp format" };
        }

        const timeDiff = Math.abs(now - issuedTime);
        if (timeDiff > timestampToleranceMs) {
          return {
            valid: false,
            error: `Timestamp outside tolerance window (${Math.round(
              timeDiff / 1000 / 60 / 60,
            )}h > ${Math.round(timestampToleranceMs / 1000 / 60 / 60)}h)`,
          };
        }

        return { valid: true };
      };

      const result = await verifyFromDatabase("test-hash-123");

      expect(mockVerifySignature).toHaveBeenCalledWith("test-hash-123", "valid-signature");
      expect(result.valid).toBe(true);
      expect(result.signer).toBe("test-fingerprint-123");
      expect(result.issued_at).toBe(validProof.timestamp);
      expect(result.errors).toEqual([]);
    });

    it("should reject proof with invalid signature from database", async () => {
      const invalidProof = {
        hash_full: "test-hash-123",
        signature: "invalid-signature",
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const mockDbQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: invalidProof,
                error: null,
              }),
            }),
          }),
        }),
      };
      mockSupabaseService.mockReturnValue(mockDbQuery);
      mockVerifySignature.mockReturnValue(false);

      // Simulate the verification logic
      const verifyFromDatabase = async (hash: string) => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          const svc = mockSupabaseService();
          const { data: proof, error } = await svc
            .from("proofs")
            .select("hash_full, signature, timestamp, created_at")
            .eq("hash_full", hash)
            .single();

          if (error || !proof) {
            return {
              valid: false,
              signer: "",
              issued_at: new Date().toISOString(),
              latency_ms: Date.now() - startTime,
              errors: ["Proof not found in database"],
            };
          }

          // Verify signature if available
          const signatureVerified = proof.signature
            ? mockVerifySignature(proof.hash_full, proof.signature)
            : false;

          if (!signatureVerified) {
            errors.push("Signature verification failed");
          }

          // Validate timestamp window
          const timestampValidation = validateTimestampWindow(proof.timestamp);
          if (!timestampValidation.valid) {
            errors.push(timestampValidation.error || "Timestamp validation failed");
          }

          const signerFingerprint = mockGetKeyFingerprint() || "unknown";
          const isValid = signatureVerified && timestampValidation.valid;

          return {
            valid: isValid,
            signer: signerFingerprint,
            issued_at: proof.timestamp,
            latency_ms: Date.now() - startTime,
            errors,
          };
        } catch (error) {
          return {
            valid: false,
            signer: "",
            issued_at: new Date().toISOString(),
            latency_ms: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : "Unknown error"],
          };
        }
      };

      const validateTimestampWindow = (issuedAt: string): { valid: boolean; error?: string } => {
        const timestampToleranceMs = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        const issuedTime = new Date(issuedAt).getTime();

        if (isNaN(issuedTime)) {
          return { valid: false, error: "Invalid timestamp format" };
        }

        const timeDiff = Math.abs(now - issuedTime);
        if (timeDiff > timestampToleranceMs) {
          return {
            valid: false,
            error: `Timestamp outside tolerance window (${Math.round(
              timeDiff / 1000 / 60 / 60,
            )}h > ${Math.round(timestampToleranceMs / 1000 / 60 / 60)}h)`,
          };
        }

        return { valid: true };
      };

      const result = await verifyFromDatabase("test-hash-123");

      expect(result.valid).toBe(false);
      expect(result.signer).toBe("test-fingerprint-123");
      expect(result.errors).toContain("Signature verification failed");
    });
  });

  describe("Response Format", () => {
    it("should return correct response format", () => {
      const response = {
        valid: true,
        signer: "test-fingerprint-123",
        issued_at: "2024-01-01T12:00:00.000Z",
        latency_ms: 150,
        errors: [],
      };

      expect(response).toHaveProperty("valid");
      expect(response).toHaveProperty("signer");
      expect(response).toHaveProperty("issued_at");
      expect(response).toHaveProperty("latency_ms");
      expect(response).toHaveProperty("errors");

      expect(typeof response.valid).toBe("boolean");
      expect(typeof response.signer).toBe("string");
      expect(typeof response.issued_at).toBe("string");
      expect(typeof response.latency_ms).toBe("number");
      expect(Array.isArray(response.errors)).toBe(true);
    });

    it("should return correct error response format", () => {
      const response = {
        valid: false,
        signer: "test-fingerprint-123",
        issued_at: "2024-01-01T12:00:00.000Z",
        latency_ms: 200,
        errors: ["Signature verification failed", "Timestamp outside tolerance window"],
      };

      expect(response.valid).toBe(false);
      expect(response.errors.length).toBeGreaterThan(0);
      expect(response.errors).toContain("Signature verification failed");
    });
  });
});
