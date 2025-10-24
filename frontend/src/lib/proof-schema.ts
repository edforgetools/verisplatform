/**
 * Canonical proof schema utilities
 * Server-only module for proof creation and validation
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import canonicalJson from "canonical-json";
import { signHash, verifySignature, getKeyFingerprint } from "./crypto-server";
import { sha256 } from "./crypto-server";

// Load the JSON schema
import proofSchemaV1 from "../schema/proof.v1.json";

const ajv = new Ajv({ strict: true });
addFormats(ajv);

// Compile the schema validator
const validateProofV1 = ajv.compile(proofSchemaV1);

export interface ProofSubject {
  type: string;
  namespace: string;
  id: string;
}

export interface ProofMetadata {
  [key: string]: unknown;
}

export interface CanonicalProofV1 {
  schema_version: 1;
  hash_algo: "sha256";
  hash_full: string;
  signed_at: string;
  signer_fingerprint: string;
  subject: ProofSubject;
  metadata: ProofMetadata;
  signature: string;
}

/**
 * Create a canonical proof object
 */
export function createCanonicalProof(
  hashFull: string,
  subject: ProofSubject,
  metadata: ProofMetadata = {},
): Omit<CanonicalProofV1, "signature"> {
  const signerFingerprint = getKeyFingerprint();
  if (!signerFingerprint) {
    throw new Error("Unable to generate signer fingerprint");
  }

  return {
    schema_version: 1,
    hash_algo: "sha256",
    hash_full: hashFull,
    signed_at: new Date().toISOString(),
    signer_fingerprint: signerFingerprint,
    subject,
    metadata,
  };
}

/**
 * Canonicalize and sign a proof object
 */
export function canonicalizeAndSign(proof: Omit<CanonicalProofV1, "signature">): CanonicalProofV1 {
  // Validate the proof structure
  if (!validateProofV1({ ...proof, signature: "placeholder" })) {
    throw new Error(`Invalid proof structure: ${ajv.errorsText(validateProofV1.errors)}`);
  }

  // Create canonical JSON
  const canonicalJsonString = canonicalJson(proof);

  // Sign the canonical bytes
  const signature = signHash(sha256(Buffer.from(canonicalJsonString, "utf8")));

  return {
    ...proof,
    signature,
  };
}

/**
 * Validate a canonical proof
 */
export function validateCanonicalProof(proof: unknown): proof is CanonicalProofV1 {
  return validateProofV1(proof);
}

/**
 * Verify a canonical proof signature
 */
export function verifyCanonicalProof(proof: CanonicalProofV1): boolean {
  try {
    // Recreate the canonical JSON (without signature)
    const { signature, ...proofWithoutSignature } = proof;
    const canonicalJsonString = canonicalJson(proofWithoutSignature);

    // Verify the signature against the canonical bytes hash
    const hashOfCanonical = sha256(Buffer.from(canonicalJsonString, "utf8"));
    return verifySignature(hashOfCanonical, signature);
  } catch (error) {
    console.error("Error verifying canonical proof:", error);
    return false;
  }
}

/**
 * Get the canonical JSON string for a proof
 */
export function getCanonicalJsonString(proof: CanonicalProofV1): string {
  const { signature, ...proofWithoutSignature } = proof;
  return canonicalJson(proofWithoutSignature);
}

/**
 * Get the hash of canonical JSON for a proof
 */
export function getCanonicalHash(proof: CanonicalProofV1): string {
  const canonicalJsonString = getCanonicalJsonString(proof);
  return sha256(Buffer.from(canonicalJsonString, "utf8"));
}
