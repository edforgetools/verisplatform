/**
 * Tests for proof API DTOs and validation
 */

import { describe, it, expect } from "@jest/globals";
import { 
  validateCreateProofRequest, 
  validateCreateProofResponse, 
  CreateProofRequest, 
  CreateProofResponse,
  CreateProofRequestSchema,
  CreateProofResponseSchema,
  ProofSubjectSchema,
  ProofMetadataSchema,
  CanonicalProofV1Schema
} from "@/types/proof-api";

describe("Proof API DTOs", () => {
  describe("CreateProofRequestSchema", () => {
    it("should validate valid request", () => {
      const validRequest = {
        file: new File(["test content"], "test.txt", { type: "text/plain" }),
        user_id: "user123",
        project: "test-project",
      };

      expect(() => CreateProofRequestSchema.parse(validRequest)).not.toThrow();
    });

    it("should reject request without file", () => {
      const invalidRequest = {
        user_id: "user123",
        project: "test-project",
      };

      expect(() => CreateProofRequestSchema.parse(invalidRequest)).toThrow();
    });

    it("should reject request without user_id", () => {
      const invalidRequest = {
        file: new File(["test content"], "test.txt", { type: "text/plain" }),
        project: "test-project",
      };

      expect(() => CreateProofRequestSchema.parse(invalidRequest)).toThrow();
    });

    it("should accept request without optional project", () => {
      const validRequest = {
        file: new File(["test content"], "test.txt", { type: "text/plain" }),
        user_id: "user123",
      };

      expect(() => CreateProofRequestSchema.parse(validRequest)).not.toThrow();
    });
  });

  describe("CreateProofResponseSchema", () => {
    it("should validate valid response", () => {
      const validResponse: CreateProofResponse = {
        proof_id: "proof123",
        hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        timestamp: "2024-01-01T00:00:00.000Z",
        signature: "signature123",
        url: "https://example.com/proof/proof123",
      };

      expect(() => CreateProofResponseSchema.parse(validResponse)).not.toThrow();
    });

    it("should reject response with invalid hash format", () => {
      const invalidResponse = {
        proof_id: "proof123",
        hash: "invalid-hash",
        timestamp: "2024-01-01T00:00:00.000Z",
        signature: "signature123",
      };

      expect(() => CreateProofResponseSchema.parse(invalidResponse)).toThrow();
    });

    it("should reject response without required fields", () => {
      const invalidResponse = {
        proof_id: "proof123",
        hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        // missing timestamp and signature
      };

      expect(() => CreateProofResponseSchema.parse(invalidResponse)).toThrow();
    });

    it("should accept response without optional url", () => {
      const validResponse: CreateProofResponse = {
        proof_id: "proof123",
        hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        timestamp: "2024-01-01T00:00:00.000Z",
        signature: "signature123",
      };

      expect(() => CreateProofResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe("ProofSubjectSchema", () => {
    it("should validate valid subject", () => {
      const validSubject = {
        type: "file",
        namespace: "veris",
        id: "proof123",
      };

      expect(() => ProofSubjectSchema.parse(validSubject)).not.toThrow();
    });

    it("should reject subject without required fields", () => {
      const invalidSubject = {
        type: "file",
        // missing namespace and id
      };

      expect(() => ProofSubjectSchema.parse(invalidSubject)).toThrow();
    });
  });

  describe("ProofMetadataSchema", () => {
    it("should validate valid metadata", () => {
      const validMetadata = {
        file_name: "test.txt",
        project: "test-project",
        user_id: "user123",
        custom_field: "custom_value",
      };

      expect(() => ProofMetadataSchema.parse(validMetadata)).not.toThrow();
    });

    it("should accept empty metadata", () => {
      const emptyMetadata = {};

      expect(() => ProofMetadataSchema.parse(emptyMetadata)).not.toThrow();
    });
  });

  describe("CanonicalProofV1Schema", () => {
    it("should validate valid canonical proof", () => {
      const validProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        signed_at: "2024-01-01T00:00:00.000Z",
        signer_fingerprint: "fingerprint123",
        subject: {
          type: "file",
          namespace: "veris",
          id: "proof123",
        },
        metadata: {
          file_name: "test.txt",
          project: "test-project",
        },
        signature: "signature123",
      };

      expect(() => CanonicalProofV1Schema.parse(validProof)).not.toThrow();
    });

    it("should reject proof with invalid hash format", () => {
      const invalidProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "invalid-hash",
        signed_at: "2024-01-01T00:00:00.000Z",
        signer_fingerprint: "fingerprint123",
        subject: {
          type: "file",
          namespace: "veris",
          id: "proof123",
        },
        metadata: {},
        signature: "signature123",
      };

      expect(() => CanonicalProofV1Schema.parse(invalidProof)).toThrow();
    });

    it("should reject proof with wrong schema version", () => {
      const invalidProof = {
        schema_version: 2, // Wrong version
        hash_algo: "sha256",
        hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        signed_at: "2024-01-01T00:00:00.000Z",
        signer_fingerprint: "fingerprint123",
        subject: {
          type: "file",
          namespace: "veris",
          id: "proof123",
        },
        metadata: {},
        signature: "signature123",
      };

      expect(() => CanonicalProofV1Schema.parse(invalidProof)).toThrow();
    });
  });

  describe("Validation helper functions", () => {
    it("should validate CreateProofRequest using helper function", () => {
      const validRequest = {
        file: new File(["test content"], "test.txt", { type: "text/plain" }),
        user_id: "user123",
        project: "test-project",
      };

      expect(() => validateCreateProofRequest(validRequest)).not.toThrow();
    });

    it("should validate CreateProofResponse using helper function", () => {
      const validResponse: CreateProofResponse = {
        proof_id: "proof123",
        hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        timestamp: "2024-01-01T00:00:00.000Z",
        signature: "signature123",
      };

      expect(() => validateCreateProofResponse(validResponse)).not.toThrow();
    });
  });
});
