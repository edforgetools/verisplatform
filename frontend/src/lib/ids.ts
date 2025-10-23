/**
 * ID generation utilities using ULID (Universally Unique Lexicographically Sortable Identifier)
 *
 * ULIDs are:
 * - 26 characters long (vs UUID's 36)
 * - Lexicographically sortable (timestamp-based)
 * - URL-safe (no special characters)
 * - Case-insensitive
 * - Monotonic (can be generated in sequence)
 */

import { ulid } from "ulidx";

/**
 * Generate a new ULID
 * @returns A 26-character ULID string
 */
export function generateId(): string {
  return ulid();
}

/**
 * Generate a ULID with a custom timestamp
 * @param timestamp - Unix timestamp in milliseconds
 * @returns A 26-character ULID string
 */
export function generateIdWithTimestamp(timestamp: number): string {
  return ulid(timestamp);
}

/**
 * Generate a ULID for a temporary file
 * @param prefix - Optional prefix for the filename
 * @returns A filename-safe ULID string
 */
export function generateTempId(prefix: string = "temp"): string {
  return `${prefix}-${ulid()}`;
}

/**
 * Generate a ULID for a proof ID
 * @returns A ULID string suitable for proof IDs
 */
export function generateProofId(): string {
  return ulid();
}

/**
 * Generate a ULID for a user ID (if needed for non-auth users)
 * @returns A ULID string suitable for user IDs
 */
export function generateUserId(): string {
  return ulid();
}

/**
 * Parse timestamp from a ULID
 * @param ulidString - The ULID string to parse
 * @returns Unix timestamp in milliseconds
 */
export function parseTimestamp(ulidString: string): number {
  // ULID timestamp is the first 10 characters (48 bits)
  const timestampPart = ulidString.substring(0, 10);
  return parseInt(timestampPart, 32);
}

/**
 * Check if a string is a valid ULID
 * @param str - String to validate
 * @returns True if the string is a valid ULID
 */
export function isValidUlid(str: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(str);
}
