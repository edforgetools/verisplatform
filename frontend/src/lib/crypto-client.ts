/**
 * Client-safe crypto utilities that don't access server-side environment variables
 */

export function formatKeyFingerprint(fingerprint: string) {
  if (!fingerprint) return null;
  // Format as: AA:BB:CC:DD:EE:FF...
  return (
    fingerprint
      .toUpperCase()
      .match(/.{1,2}/g)
      ?.join(":") || null
  );
}
