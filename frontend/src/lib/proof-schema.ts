/**
 * Canonical proof schema utilities
 * Server-only module for proof creation and validation
 * Updated to use Ed25519 per MVP §2.1
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { signEd25519, verifyEd25519, getIssuer } from "./ed25519-crypto";
import { generateProofId } from "./ids";

// Load the JSON schema
import proofSchema from "../schema/proof.schema.json";

const ajv = new Ajv({ strict: true });
addFormats(ajv);

// Compile the schema validator
const validateProof = ajv.compile(proofSchema);

export interface CanonicalProof {
  proof_id: string; // ULID
  sha256: string; // SHA-256 hash
  issued_at: string; // RFC3339 UTC
  signature: string; // ed25519:base64
  issuer: string; // did:web or domain
  approved_by: string; // Person or entity who approved this closure
  acknowledged_at: string; // RFC3339 UTC timestamp
  status: "closed"; // Status of the delivery record
}

/**
 * Create a canonical proof object per MVP §2.1 and §3
 */
export function createCanonicalProof(fileHash: string, approvedBy?: string): CanonicalProof {
  const proofId = generateProofId();
  const issuedAt = new Date().toISOString(); // RFC3339 UTC
  const issuer = getIssuer();
  const acknowledgedAt = new Date().toISOString(); // RFC3339 UTC

  // Sign sha256 || issued_at with Ed25519 per MVP §2.1
  const signature = signEd25519(fileHash, issuedAt);

  return {
    proof_id: proofId,
    sha256: fileHash,
    issued_at: issuedAt,
    signature: signature,
    issuer: issuer,
    approved_by: approvedBy || "veris-mvp-user",
    acknowledged_at: acknowledgedAt,
    status: "closed",
  };
}

/**
 * Verify a canonical proof per MVP §2.3
 */
export function verifyCanonicalProof(proof: CanonicalProof): boolean {
  // Validate the proof structure against schema
  if (!validateProof(proof)) {
    console.error("Proof schema validation failed:", ajv.errorsText(validateProof.errors));
    return false;
  }

  // Verify Ed25519 signature
  try {
    return verifyEd25519(proof.sha256, proof.issued_at, proof.signature);
  } catch (error) {
    console.error("Ed25519 verification error:", error);
    return false;
  }
}

/**
 * Validate a canonical proof structure
 */
export function validateCanonicalProofStructure(proof: unknown): proof is CanonicalProof {
  return validateProof(proof);
}
