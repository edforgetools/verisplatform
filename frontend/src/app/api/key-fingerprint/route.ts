import { getKeyFingerprint } from "@/lib/crypto-server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const fingerprint = getKeyFingerprint();
    if (!fingerprint) {
      return jsonErr(
        "INTERNAL_ERROR",
        "Failed to generate key fingerprint",
        "key-fingerprint",
        500,
      );
    }
    return jsonOk({ fingerprint }, "key-fingerprint");
  } catch (error) {
    capture(error, { route: "/api/key-fingerprint" });
    return jsonErr("INTERNAL_ERROR", "Internal server error", "key-fingerprint", 500);
  }
}
