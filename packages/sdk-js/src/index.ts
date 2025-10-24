/**
 * Veris SDK - Main entry point
 */

export { VerisClient } from "./client.js";
export type {
  VerisConfig,
  CreateProofRequest,
  CreateProofResponse,
  VerifyProofRequest,
  VerifyProofResponse,
  GetProofResponse,
  IntegrityLatestResponse,
  IntegrityHealthResponse,
  VerisError,
} from "./types.js";

// Convenience function to create a client
export function createVerisClient(config: {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}): VerisClient {
  return new VerisClient(config);
}
