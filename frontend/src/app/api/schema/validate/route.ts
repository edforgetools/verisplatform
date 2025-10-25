import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import {
  validateProofAgainstVersion,
  validateProofAgainstLatest,
} from "@/lib/schema-version-control";

export const runtime = "nodejs";

interface ValidateRequest {
  proof: any;
  version?: string;
}

async function handleValidateProof(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    // Parse request body
    const body = await req.json();
    const { proof, version }: ValidateRequest = body;

    if (!proof) {
      return jsonErr("VALIDATION_ERROR", "Proof is required", requestId, 400);
    }

    // Validate against specific version or latest
    const validationResult = version
      ? validateProofAgainstVersion(proof, version)
      : validateProofAgainstLatest(proof);

    return jsonOk(validationResult, requestId);
  } catch (error) {
    capture(error, { route: "/api/schema/validate", event: "schema_validation_error" });
    return jsonErr("INTERNAL_ERROR", "Failed to validate proof", requestId, 500);
  }
}

export const POST = withRateLimit(handleValidateProof, "/api/schema/validate", {
  capacity: 50, // 50 requests
  refillRate: 5, // 5 tokens per second
  windowMs: 60000, // 1 minute window
});
