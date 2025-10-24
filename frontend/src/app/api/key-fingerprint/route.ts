import { getKeyFingerprint } from "@/lib/crypto-server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const fingerprint = getKeyFingerprint();
    if (!fingerprint) {
      return jsonErr("Failed to generate key fingerprint", 500);
    }
    return jsonOk({ fingerprint });
  } catch (error) {
    capture(error, { route: "/api/key-fingerprint" });
    return jsonErr("Internal server error", 500);
  }
}
