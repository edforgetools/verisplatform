/**
 * Tests for canonical proof schema v1
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Crypto module and crypto-server are mocked in jest.setup.js

import {
  createCanonicalProof,
  canonicalizeAndSign,
  validateCanonicalProof,
  verifyCanonicalProof,
  getCanonicalJsonString,
  getCanonicalHash,
} from "../lib/proof-schema";

describe("Proof Schema v1", () => {
  const mockSubject = {
    type: "file",
    namespace: "veris",
    id: "test-proof-id",
  };
  const mockMetadata = {
    fileName: "test.pdf",
    fileSize: 1024,
    mimeType: "application/pdf",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCanonicalProof", () => {
    it("should create a valid canonical proof", () => {
      const hashFull = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const proof = createCanonicalProof(hashFull, mockSubject, mockMetadata);

      expect(proof).toHaveProperty("schema_version");
      expect(proof).toHaveProperty("hash_algo");
      expect(proof).toHaveProperty("hash_full");
      expect(proof).toHaveProperty("subject");
      expect(proof).toHaveProperty("metadata");
      expect(proof).toHaveProperty("signed_at");
      expect(proof).toHaveProperty("signer_fingerprint");
      expect(proof.subject).toEqual(mockSubject);
      expect(proof.metadata).toEqual(mockMetadata);
    });

    it("should include required fields", () => {
      const hashFull = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const proof = createCanonicalProof(hashFull, mockSubject, mockMetadata);

      expect(proof.schema_version).toBe(1);
      expect(proof.hash_algo).toBe("sha256");
      expect(proof.hash_full).toBe(hashFull);
      expect(proof.subject).toEqual(mockSubject);
      expect(proof.metadata).toEqual(mockMetadata);
      expect(proof.signer_fingerprint).toBe("mock-hash-hex");
    });
  });

  describe("canonicalizeAndSign", () => {
    it("should canonicalize and sign a proof", async () => {
      const hashFull = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const proof = createCanonicalProof(hashFull, mockSubject, mockMetadata);

      const signedProof = await canonicalizeAndSign(proof);

      expect(signedProof).toHaveProperty("signature");
      expect(signedProof.signature).toBe("mock-signature-base64");
    });
  });

  describe("validateCanonicalProof", () => {
    it("should validate a correct proof", () => {
      const hashFull = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const proof = createCanonicalProof(hashFull, mockSubject, mockMetadata);
      const signedProof = { ...proof, signature: "mock-signature" };

      const isValid = validateCanonicalProof(signedProof);
      expect(isValid).toBe(true);
    });

    it("should reject invalid proof structure", () => {
      const invalidProof = {
        subject: mockSubject,
        // Missing required fields
      };

      const isValid = validateCanonicalProof(invalidProof as any);
      expect(isValid).toBe(false);
    });
  });

  describe("verifyCanonicalProof", () => {
    it("should verify a valid proof", async () => {
      const hashFull = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const proof = createCanonicalProof(hashFull, mockSubject, mockMetadata);

      const signedProof = await canonicalizeAndSign(proof);
      const isValid = await verifyCanonicalProof(signedProof);

      expect(isValid).toBe(true);
    });

    it("should reject proof with invalid signature", async () => {
      const hashFull = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const proof = createCanonicalProof(hashFull, mockSubject, mockMetadata);

      // Mock verifySignature to return false
      const { verifySignature } = await import("../lib/crypto-server");
      (verifySignature as jest.Mock).mockReturnValueOnce(false);

      const signedProof = await canonicalizeAndSign(proof);
      const isValid = await verifyCanonicalProof(signedProof);

      expect(isValid).toBe(false);
    });
  });

  describe("getCanonicalJsonString", () => {
    it("should return canonical JSON string", () => {
      const hashFull = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const proof = createCanonicalProof(hashFull, mockSubject, mockMetadata);
      const signedProof = { ...proof, signature: "mock-signature" };

      const jsonString = getCanonicalJsonString(signedProof);
      expect(typeof jsonString).toBe("string");
      expect(jsonString).toContain('"schema_version"');
      expect(jsonString).toContain('"subject"');
    });
  });

  describe("getCanonicalHash", () => {
    it("should return canonical hash", () => {
      const hashFull = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const proof = createCanonicalProof(hashFull, mockSubject, mockMetadata);
      const signedProof = { ...proof, signature: "mock-signature" };

      const hash = getCanonicalHash(signedProof);
      expect(typeof hash).toBe("string");
      expect(hash).toBe("mock-hash");
    });
  });
});
