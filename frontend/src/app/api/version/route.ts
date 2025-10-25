import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export function GET() {
  try {
    return jsonOk(
      {
        sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
        branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
        stripeApiVersion: "2024-06-20",
        node: process.version,
      },
      "version",
    );
  } catch (error) {
    capture(error, { route: "/api/version" });
    return jsonErr("INTERNAL_ERROR", "Internal server error", "version", 500);
  }
}
