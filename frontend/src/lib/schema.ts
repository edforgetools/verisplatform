export interface DeliveryRecord {
  record_id: string;
  sha256: string;
  issued_at: string; // RFC3339
  issuer: string;
  signature: string; // ed25519:base64
  approved_by: string;
  acknowledged_at: string; // RFC3339
  status: "closed";
}

export const REQUIRED_FIELDS = [
  "record_id",
  "sha256",
  "issued_at",
  "issuer",
  "signature",
  "approved_by",
  "acknowledged_at",
  "status",
] as const;

export function validateRecord(record: unknown): record is DeliveryRecord {
  if (typeof record !== "object" || record === null) return false;

  const r = record as Record<string, unknown>;
  return REQUIRED_FIELDS.every((field) => field in r) && r.status === "closed";
}
