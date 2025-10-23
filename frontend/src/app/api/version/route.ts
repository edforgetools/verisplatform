import { capture } from "@/lib/observability";

export const runtime = "nodejs";

export function GET() {
  try {
    return Response.json({
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
      stripeApiVersion: "2024-06-20",
      node: process.version,
    });
  } catch (error) {
    capture(error, { route: "/api/version" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
