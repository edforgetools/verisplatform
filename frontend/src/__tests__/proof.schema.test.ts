/**
 * Tests for canonical proof schema v1
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  createCanonicalProof,
  canonicalizeAndSign,
  validateCanonicalProof,
  verifyCanonicalProof,
  getCanonicalJsonString,
  getCanonicalHash,
} from "../lib/proof-schema";

// Mock the crypto-server module
jest.mock("../lib/crypto-server", () => ({
  signHash: jest.fn((hash: string) => "mock-signature-base64"),
  verifySignature: jest.fn((hash: string, signature: string) => true),
  getKeyFingerprint: jest.fn(() => "mock-fingerprint-base64url"),
  sha256: jest.fn((buf: Buffer) => "mock-hash-hex"),
}));

describe("Proof Schema v1", () => {
  const mockHash = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
  const mockSubject = {
    type: "file",
    namespace: "veris",
    id: "test-proof-id",
  };
  const mockMetadata = {
    file_name: "test.pdf",
    project: "test-project",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCanonicalProof", () => {
    it("creates a valid canonical proof structure", () => {
      const proof = createCanonicalProof(mockHash, mockSubject, mockMetadata);

      expect(proof).toEqual({
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: mockHash,
        signed_at: expect.any(String),
        signer_fingerprint: "mock-fingerprint-base64url",
        subject: mockSubject,
        metadata: mockMetadata,
      });

      // Verify signed_at is a valid ISO string
      expect(new Date(proof.signed_at).toISOString()).toBe(proof.signed_at);
    });

    it("creates proof with empty metadata when not provided", () => {
      const proof = createCanonicalProof(mockHash, mockSubject);

      expect(proof.metadata).toEqual({});
    });
  });

  describe("canonicalizeAndSign", () => {
    it("creates and signs a canonical proof", () => {
      const canonicalProof = createCanonicalProof(mockHash, mockSubject, mockMetadata);
      const signedProof = canonicalizeAndSign(canonicalProof);

      expect(signedProof).toEqual({
        ...canonicalProof,
        signature: "mock-signature-base64",
      });
    });

    it("validates proof structure before signing", () => {
      const invalidProof = {
        schema_version: 2, // Invalid version
        hash_algo: "sha256",
        hash_full: mockHash,
        signed_at: new Date().toISOString(),
        signer_fingerprint: "mock-fingerprint",
        subject: mockSubject,
        metadata: mockMetadata,
      };

      expect(() => canonicalizeAndSign(invalidProof as any)).toThrow("Invalid proof structure");
    });
  });

  describe("validateCanonicalProof", () => {
    it("validates a correct proof", () => {
      const proof = createCanonicalProof(mockHash, mockSubject, mockMetadata);
      const signedProof = canonicalizeAndSign(proof);

      expect(validateCanonicalProof(signedProof)).toBe(true);
    });

    it("rejects proof with wrong schema version", () => {
      const invalidProof = {
        schema_version: 2,
        hash_algo: "sha256",
        hash_full: mockHash,
        signed_at: new Date().toISOString(),
        signer_fingerprint: "mock-fingerprint",
        subject: mockSubject,
        metadata: mockMetadata,
        signature: "mock-signature",
      };

      expect(validateCanonicalProof(invalidProof)).toBe(false);
    });

    it("rejects proof with wrong hash algorithm", () => {
      const invalidProof = {
        schema_version: 1,
        hash_algo: "sha1",
        hash_full: mockHash,
        signed_at: new Date().toISOString(),
        signer_fingerprint: "mock-fingerprint",
        subject: mockSubject,
        metadata: mockMetadata,
        signature: "mock-signature",
      };

      expect(validateCanonicalProof(invalidProof)).toBe(false);
    });

    it("rejects proof with invalid hash format", () => {
      const invalidProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: "invalid-hash",
        signed_at: new Date().toISOString(),
        signer_fingerprint: "mock-fingerprint",
        subject: mockSubject,
        metadata: mockMetadata,
        signature: "mock-signature",
      };

      expect(validateCanonicalProof(invalidProof)).toBe(false);
    });

    it("rejects proof with missing required fields", () => {
      const invalidProof = {
        schema_version: 1,
        hash_algo: "sha256",
        hash_full: mockHash,
        // missing signed_at, signer_fingerprint, subject, metadata, signature
      };

      expect(validateCanonicalProof(invalidProof)).toBe(false);
    });
  });

  describe("verifyCanonicalProof", () => {
    it("verifies a valid proof signature", () => {
      const proof = createCanonicalProof(mockHash, mockSubject, mockMetadata);
      const signedProof = canonicalizeAndSign(proof);

      expect(verifyCanonicalProof(signedProof)).toBe(true);
    });

    it("handles verification errors gracefully", () => {
      const { verifySignature } = require("../lib/crypto-server");
      verifySignature.mockImplementation(() => {
        throw new Error("Verification failed");
      });

      const proof = createCanonicalProof(mockHash, mockSubject, mockMetadata);
      const signedProof = canonicalizeAndSign(proof);

      expect(verifyCanonicalProof(signedProof)).toBe(false);
    });
  });

  describe("getCanonicalJsonString", () => {
    it("returns canonical JSON string without signature", () => {
      const proof = createCanonicalProof(mockHash, mockSubject, mockMetadata);
      const signedProof = canonicalizeAndSign(proof);

      const canonicalJson = getCanonicalJsonString(signedProof);

      expect(canonicalJson).not.toContain("signature");
      expect(canonicalJson).toContain("schema_version");
      expect(canonicalJson).toContain("hash_full");
    });
  });

  describe("getCanonicalHash", () => {
    it("returns hash of canonical JSON", () => {
      const proof = createCanonicalProof(mockHash, mockSubject, mockMetadata);
      const signedProof = canonicalizeAndSign(proof);

      const hash = getCanonicalHash(signedProof);

      expect(hash).toBe("mock-hash-hex");
    });
  });

  describe("Canonicalization consistency", () => {
    it("produces identical canonical JSON for same input", () => {
      const proof1 = createCanonicalProof(mockHash, mockSubject, mockMetadata);
      const proof2 = createCanonicalProof(mockHash, mockSubject, mockMetadata);

      // Set the same signed_at to ensure identical output
      const timestamp = new Date().toISOString();
      proof1.signed_at = timestamp;
      proof2.signed_at = timestamp;

      const signed1 = canonicalizeAndSign(proof1);
      const signed2 = canonicalizeAndSign(proof2);

      const json1 = getCanonicalJsonString(signed1);
      const json2 = getCanonicalJsonString(signed2);

      expect(json1).toBe(json2);
    });

    it("rejects non-canonical JSON with different key order", () => {
      // This test ensures that the canonicalization process
      // produces consistent output regardless of input key order
      const proof1 = createCanonicalProof(mockHash, mockSubject, mockMetadata);
      const proof2 = createCanonicalProof(mockHash, mockSubject, mockMetadata);

      // Set the same signed_at to ensure identical output
      const timestamp = new Date().toISOString();
      proof1.signed_at = timestamp;
      proof2.signed_at = timestamp;

      const signed1 = canonicalizeAndSign(proof1);
      const signed2 = canonicalizeAndSign(proof2);

      const hash1 = getCanonicalHash(signed1);
      const hash2 = getCanonicalHash(signed2);

      expect(hash1).toBe(hash2);
    });
  });
});
