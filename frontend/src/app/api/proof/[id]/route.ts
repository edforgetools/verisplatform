import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const svc = supabaseService();
    const { data, error } = await svc.from("proofs").select("*").eq("id", id).single();
    if (error) return jsonErr("NOT_FOUND", error.message, "proof", 404);
    return jsonOk(data, "proof");
  } catch (error) {
    capture(error, { route: "/api/proof/[id]" });
    return jsonErr("INTERNAL_ERROR", "Internal server error", "proof", 500);
  }
}
