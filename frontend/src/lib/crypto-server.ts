/**
 * Server-only crypto utilities that access server-side environment variables
 * This file should only be imported in server-side code (API routes, server components, etc.)
 */

import crypto from "crypto";

export function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function shortHash(hex: string) {
  return (hex.slice(0, 4) + "-" + hex.slice(4, 8)).toUpperCase();
}

export function signHash(hashHex: string) {
  const privateKey = process.env.VERIS_SIGNING_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("VERIS_SIGNING_PRIVATE_KEY environment variable is required");
  }
  const sign = crypto.createSign("RSA-SHA256"); // ECDSA optional later
  sign.update(hashHex);
  sign.end();
  return sign.sign(privateKey, "base64");
}

export function verifySignature(hashHex: string, signatureB64: string) {
  const publicKey = process.env.VERIS_SIGNING_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("VERIS_SIGNING_PUBLIC_KEY environment variable is required");
  }
  const verify = crypto.createVerify("RSA-SHA256");
  verify.update(hashHex);
  return verify.verify(publicKey, signatureB64, "base64");
}

export function getKeyFingerprint() {
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
