/**
 * Server-only crypto utilities that access server-side environment variables
 * This file should only be imported in server-side code (API routes, server components, etc.)
 *
 * @deprecated Use keyManager from ./key-management.ts for new code
 * This file is kept for backward compatibility
 */

import crypto from "crypto";
// Key management functionality moved inline

export function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function shortHash(hex: string) {
  return (hex.slice(0, 4) + "-" + hex.slice(4, 8)).toUpperCase();
}

/**
 * @deprecated Use keyManager.signData() instead
 */
export function signHash(hashHex: string) {
  try {
    return keyManager.signData(hashHex);
  } catch (error) {
    // Fallback to old method for backward compatibility
    const privateKey = process.env.VERIS_SIGNING_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("VERIS_SIGNING_PRIVATE_KEY environment variable is required");
    }
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(hashHex);
    sign.end();
    return sign.sign(privateKey, "base64");
  }
}

/**
 * @deprecated Use keyManager.verifySignature() instead
 */
export function verifySignature(hashHex: string, signatureB64: string) {
  try {
    return keyManager.verifySignature(hashHex, signatureB64).verified;
  } catch (error) {
    // Fallback to old method for backward compatibility
    const publicKey = process.env.VERIS_SIGNING_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("VERIS_SIGNING_PUBLIC_KEY environment variable is required");
    }
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(hashHex);
    return verify.verify(publicKey, signatureB64, "base64");
  }
}

/**
 * @deprecated Use keyManager.getActiveSigningKey().fingerprint instead
 */
export function getKeyFingerprint() {
  try {
    return keyManager.getActiveSigningKey().fingerprint;
  } catch (error) {
    // Fallback to old method for backward compatibility
    try {
      const publicKey = process.env.VERIS_SIGNING_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("VERIS_SIGNING_PUBLIC_KEY environment variable is required");
      }
      // Convert PEM to DER format
      const derKey = publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/\s/g, "");
      const keyBuffer = Buffer.from(derKey, "base64");
      const hash = crypto.createHash("sha256").update(keyBuffer).digest("hex");
      return hash;
    } catch (error) {
      console.error("Error generating key fingerprint:", error);
      return null;
    }
  }
}
