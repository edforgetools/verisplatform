/**
 * Ed25519 Cryptographic Functions per MVP §2.1
 *
 * Implements:
 * - SHA-256 hashing
 * - Ed25519 signing over concatenated sha256 || issued_at
 * - Base64 encoding with 'ed25519:' prefix
 * - Signature verification
 */

import crypto from "crypto";
import { generateProofId } from "./ids";

/**
 * Compute SHA-256 hash of input data
 */
export function sha256(data: Buffer | string): string {
  if (typeof data === "string") {
    data = Buffer.from(data, "utf8");
  }
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Sign data using Ed25519 per MVP §2.1
 *
 * Concatenates sha256 || issued_at and signs with Ed25519 private key
 *
 * @param sha256Hash - The SHA-256 hash as hex string
 * @param issuedAt - RFC3339 UTC timestamp
 * @returns Ed25519 signature with 'ed25519:' prefix
 */
export function signEd25519(sha256Hash: string, issuedAt: string): string {
  const privateKeyPem = process.env.VERIS_ED25519_PRIVATE_KEY;
  if (!privateKeyPem) {
    throw new Error("VERIS_ED25519_PRIVATE_KEY environment variable is required");
  }

  // Per MVP §2.1: concatenate sha256 || issued_at
  const dataToSign = sha256Hash + issuedAt;

  // Create Ed25519 signature
  const signature = crypto.sign(null, Buffer.from(dataToSign, "utf8"), {
    key: privateKeyPem,
    dsaEncoding: "ieee-p1363", // Standard Ed25519 encoding
  });

  // Encode as base64 with 'ed25519:' prefix per MVP §3
  const signatureB64 = signature.toString("base64");
  return `ed25519:${signatureB64}`;
}

/**
 * Verify Ed25519 signature per MVP §2.1
 *
 * @param sha256Hash - The SHA-256 hash as hex string
 * @param issuedAt - RFC3339 UTC timestamp
 * @param signature - Ed25519 signature with 'ed25519:' prefix
 * @returns True if signature is valid
 */
export function verifyEd25519(sha256Hash: string, issuedAt: string, signature: string): boolean {
  const publicKeyPem = process.env.VERIS_ED25519_PUBLIC_KEY;
  if (!publicKeyPem) {
    throw new Error("VERIS_ED25519_PUBLIC_KEY environment variable is required");
  }

  // Remove 'ed25519:' prefix
  const signatureB64 = signature.replace(/^ed25519:/, "");
  const signatureBuffer = Buffer.from(signatureB64, "base64");

  // Per MVP §2.1: concatenate sha256 || issued_at
  const dataToVerify = sha256Hash + issuedAt;

  try {
    return crypto.verify(null, Buffer.from(dataToVerify, "utf8"), publicKeyPem, signatureBuffer);
  } catch (error) {
    console.error("Ed25519 verification error:", error);
    return false;
  }
}

/**
 * Create issuer identifier per MVP §2.1
 * Uses did:web:<domain> or <domain> format
 */
export function getIssuer(): string {
  const issuer = process.env.VERIS_ISSUER || "did:web:veris.example";
  return issuer;
}

/**
 * Create a canonical proof per MVP §2 and §3
 *
 * @param fileHash - SHA-256 hash of the file
 * @returns Canonical proof object
 */
export function createCanonicalProof(fileHash: string) {
  const proofId = generateProofId();
  const issuedAt = new Date().toISOString(); // RFC3339 UTC
  const issuer = getIssuer();

  // Sign sha256 || issued_at with Ed25519
  const signature = signEd25519(fileHash, issuedAt);

  return {
    proof_id: proofId,
    sha256: fileHash,
    issued_at: issuedAt,
    signature: signature,
    issuer: issuer,
  };
}

/**
 * Verify a canonical proof per MVP §2.3
 *
 * @param proof - The proof object to verify
 * @returns Validation result with errors array
 */
export function verifyCanonicalProof(proof: {
  proof_id: string;
  sha256: string;
  issued_at: string;
  signature: string;
  issuer: string;
}) {
  const errors: string[] = [];

  // Validate proof_id is ULID
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(proof.proof_id)) {
    errors.push(`Invalid proof_id format: ${proof.proof_id}`);
  }

  // Validate sha256 format
  if (!/^[a-f0-9]{64}$/.test(proof.sha256)) {
    errors.push(`Invalid sha256 format: ${proof.sha256}`);
  }

  // Validate issued_at is RFC3339
  try {
    const timestamp = new Date(proof.issued_at);
    if (isNaN(timestamp.getTime())) {
      errors.push(`Invalid issued_at timestamp: ${proof.issued_at}`);
    }
  } catch {
    errors.push(`Invalid issued_at format: ${proof.issued_at}`);
  }

  // Validate signature format (ed25519:base64)
  if (!/^ed25519:[A-Za-z0-9+/=]+$/.test(proof.signature)) {
    errors.push(`Invalid signature format: ${proof.signature}`);
  }

  // Validate signature cryptographically
  const signatureValid = verifyEd25519(proof.sha256, proof.issued_at, proof.signature);
  if (!signatureValid) {
    errors.push("Signature verification failed");
  }

  // Validate issuer
  if (!proof.issuer || proof.issuer.length < 3) {
    errors.push(`Invalid issuer: ${proof.issuer}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    fields: {
      proof_id: proof.proof_id,
      sha256: proof.sha256,
      issued_at: proof.issued_at,
      issuer: proof.issuer,
    },
  };
}
