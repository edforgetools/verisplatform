import crypto from 'crypto';

export function sha256(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function shortHash(hex: string) {
  return (hex.slice(0, 4) + '-' + hex.slice(4, 8)).toUpperCase();
}

export function signHash(hashHex: string) {
  const privateKey = process.env.VERIS_SIGNING_PRIVATE_KEY_PEM!;
  const sign = crypto.createSign('RSA-SHA256'); // ECDSA optional later
  sign.update(hashHex);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

export function verifySignature(hashHex: string, signature: string) {
  try {
    const publicKey = process.env.VERIS_SIGNING_PUBLIC_KEY_PEM!;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(hashHex);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  } catch {
    return false;
  }
}
