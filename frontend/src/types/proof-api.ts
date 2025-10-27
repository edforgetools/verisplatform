/**
 * Proof API DTOs and validation schemas
 */

import { z } from "zod";

// Request DTOs
export const CreateProofRequestSchema = z.object({
  file: z.instanceof(File, { message: "File is required" }),
  user_id: z.string().min(1, "User ID is required"),
  project: z.string().optional(),
});

export type CreateProofRequest = z.infer<typeof CreateProofRequestSchema>;

// Response DTOs
export const CreateProofResponseSchema = z.object({
  proof_id: z.string(),
  hash: z.string().regex(/^[a-f0-9]{64}$/, "Invalid hash format"),
  timestamp: z.string().datetime(),
  signature: z.string(),
  url: z.string().url().optional(),
});

export type CreateProofResponse = z.infer<typeof CreateProofResponseSchema>;

// Validation schemas for different proof types
export const ProofSubjectSchema = z.object({
  type: z.string().min(1, "Subject type is required"),
  namespace: z.string().min(1, "Subject namespace is required"),
  id: z.string().min(1, "Subject ID is required"),
});

export const ProofMetadataSchema = z.record(z.string(), z.unknown());

// Note: Old CanonicalProofV1Schema removed - use CanonicalProof from proof-schema.ts instead
// CanonicalProof has Ed25519 signature per MVP §2.1

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Validation helper functions
export function validateCreateProofRequest(data: unknown): CreateProofRequest {
  return CreateProofRequestSchema.parse(data);
}

export function validateCreateProofResponse(data: unknown): CreateProofResponse {
  return CreateProofResponseSchema.parse(data);
}

// Note: validateCanonicalProof removed - use verifyCanonicalProof from proof-schema.ts instead

export function validateErrorResponse(data: unknown): ErrorResponse {
  return ErrorResponseSchema.parse(data);
}
