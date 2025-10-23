/**
 * @deprecated This file is deprecated. Use crypto-server.ts for server-side functions
 * and crypto-client.ts for client-side functions to ensure proper separation of
 * server-only environment variables.
 */

// Re-export client-safe functions for backward compatibility
export { formatKeyFingerprint } from "./crypto-client";

// Re-export server functions with warning
export { sha256, shortHash, signHash, verifySignature, getKeyFingerprint } from "./crypto-server";
