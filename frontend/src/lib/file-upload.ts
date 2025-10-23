import { createWriteStream, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createHash } from "crypto";
import { generateTempId } from "./ids";

// Allowed MIME types for proof uploads
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "application/pdf"] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Validate MIME type against allow-list
 */
export function validateMimeType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}

/**
 * Stream file to temporary location and compute SHA-256 hash
 * Returns the temporary file path and hash information
 */
export async function streamFileToTmp(file: File): Promise<{
  tmpPath: string;
  hashFull: string;
  hashPrefix: string;
}> {
  // Create temporary file path using ULID
  const tmpPath = join(tmpdir(), generateTempId("veris-upload"));

  // Validate MIME type
  if (!validateMimeType(file.type)) {
    throw new Error(
      `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    );
  }

  // Create hash and write stream
  const hash = createHash("sha256");
  const writeStream = createWriteStream(tmpPath);

  try {
    // Stream file to temporary location while computing hash
    const fileStream = file.stream().getReader();

    while (true) {
      const { done, value } = await fileStream.read();
      if (done) break;

      // Write to file
      writeStream.write(value);
      // Update hash
      hash.update(value);
    }

    // Close write stream
    writeStream.end();
    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (error) => reject(error));
    });

    // Get hash results
    const hashFull = hash.digest("hex");
    const hashPrefix = hashFull.substring(0, 12);

    return {
      tmpPath,
      hashFull,
      hashPrefix,
    };
  } catch (error) {
    // Clean up temporary file on error
    try {
      unlinkSync(tmpPath);
    } catch (cleanupError) {
      console.error("Failed to clean up temporary file:", cleanupError);
    }
    throw error;
  }
}

/**
 * Clean up temporary file
 */
export function cleanupTmpFile(tmpPath: string): void {
  try {
    unlinkSync(tmpPath);
  } catch (error) {
    console.error("Failed to clean up temporary file:", error);
  }
}
