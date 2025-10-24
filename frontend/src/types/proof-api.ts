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

export const CanonicalProofV1Schema = z.object({
  schema_version: z.literal(1),
  hash_algo: z.literal("sha256"),
  hash_full: z.string().regex(/^[a-f0-9]{64}$/, "Invalid hash format"),
  signed_at: z.string().datetime(),
  signer_fingerprint: z.string().min(1, "Signer fingerprint is required"),
  subject: ProofSubjectSchema,
  metadata: ProofMetadataSchema,
  signature: z.string().min(1, "Signature is required"),
});

export type CanonicalProofV1 = z.infer<typeof CanonicalProofV1Schema>;

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

export function validateCanonicalProof(data: unknown): CanonicalProofV1 {
  return CanonicalProofV1Schema.parse(data);
}

export function validateErrorResponse(data: unknown): ErrorResponse {
  return ErrorResponseSchema.parse(data);
}
