import { NextResponse } from "next/server";
import { getKeyFingerprint } from "@/lib/crypto-server";
import { capture } from "@/lib/observability";

export const runtime = "nodejs";

export async function GET() {
  try {
    const fingerprint = getKeyFingerprint();
    if (!fingerprint) {
      return NextResponse.json({ error: "Failed to generate key fingerprint" }, { status: 500 });
    }
    return NextResponse.json({ fingerprint });
  } catch (error) {
    capture(error, { route: "/api/key-fingerprint" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
