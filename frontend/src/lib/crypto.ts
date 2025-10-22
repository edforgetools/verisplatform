import crypto from 'crypto';

export function sha256(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function shortHash(hex: string) {
  return (hex.slice(0, 4) + '-' + hex.slice(4, 8)).toUpperCase();
}

export function signHash(hashHex: string) {
  const privateKey = process.env.VERIS_SIGNING_PRIVATE_KEY!;
  const sign = crypto.createSign('RSA-SHA256'); // ECDSA optional later
  sign.update(hashHex);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

export function verifySignature(hashHex: string, signatureB64: string) {
  try {
    const publicKey = process.env.VERIS_SIGNING_PUBLIC_KEY!;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(hashHex);
    verify.end();
    return verify.verify(publicKey, signatureB64, 'base64');
  } catch {
    return false;
  }
}

export function getKeyFingerprint() {
  try {
    const publicKey = process.env.VERIS_SIGNING_PUBLIC_KEY!;
    // Convert PEM to DER format
    const derKey = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s/g, '');
    const derBuffer = Buffer.from(derKey, 'base64');
    return sha256(derBuffer);
  } catch {
    return null;
  }
}

export function formatKeyFingerprint(fingerprint: string) {
  if (!fingerprint) return null;
  // Format as: AA:BB:CC:DD:EE:FF...
  return (
    fingerprint
      .toUpperCase()
      .match(/.{1,2}/g)
      ?.join(':') || null
  );
}
