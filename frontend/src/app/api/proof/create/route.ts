import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/db";
import { sha256, shortHash, signHash } from "@/lib/crypto-server";
import { assertEntitled } from "@/lib/entitlements";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";

export const runtime = "nodejs";

async function handleCreateProof(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const userId = form.get("user_id") as string | null;
    const project = (form.get("project") as string | null) ?? null;
    if (!file || !userId)
      return NextResponse.json({ error: "file and user_id required" }, { status: 400 });

    // Check entitlement for creating proofs
    try {
      await assertEntitled(userId, "create_proof");
    } catch {
      return NextResponse.json(
        { error: "Insufficient permissions to create proofs" },
        { status: 403 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const hashFull = sha256(buf);
    const signature = signHash(hashFull);
    const ts = new Date().toISOString();
    const hashPrefix = shortHash(hashFull);

    const svc = supabaseService();
    const { data, error } = await svc
      .from("proofs")
      .insert({
        user_id: userId,
        file_name: file.name,
        version: 1,
        hash_full: hashFull,
        hash_prefix: hashPrefix,
        signature,
        timestamp: ts,
        project,
        visibility: "public",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      id: data.id,
      hash_prefix: hashPrefix,
      timestamp: ts,
      url: `/proof/${data.id}`,
    });
  } catch (error) {
    capture(error, { route: "/api/proof/create" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Apply rate limiting to the POST handler
export const POST = withRateLimit(handleCreateProof, "/api/proof/create", {
  capacity: 5, // 5 requests
  refillRate: 0.5, // 1 token every 2 seconds
  windowMs: 60000, // 1 minute window
});
