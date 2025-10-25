import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { migrateProof, getAvailableMigrations, isMigrationAvailable } from "@/lib/schema-migration";

export const runtime = "nodejs";

interface MigrateRequest {
  proof: any;
  fromVersion: string;
  toVersion: string;
}

interface GetMigrationsRequest {
  fromVersion: string;
}

async function handleMigrateProof(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    // Parse request body
    const body = await req.json();
    const { proof, fromVersion, toVersion }: MigrateRequest = body;

    if (!proof) {
      return jsonErr("VALIDATION_ERROR", "Proof is required", requestId, 400);
    }
    if (!fromVersion) {
      return jsonErr("VALIDATION_ERROR", "From version is required", requestId, 400);
    }
    if (!toVersion) {
      return jsonErr("VALIDATION_ERROR", "To version is required", requestId, 400);
    }

    // Check if migration is available
    if (!isMigrationAvailable(fromVersion, toVersion)) {
      return jsonErr(
        "VALIDATION_ERROR",
        `No migration available from ${fromVersion} to ${toVersion}`,
        requestId,
        400,
      );
    }

    // Perform migration
    const migrationResult = migrateProof(proof, fromVersion, toVersion);

    return jsonOk(migrationResult, requestId);
  } catch (error) {
    capture(error, { route: "/api/schema/migrate", event: "schema_migration_error" });
    return jsonErr("INTERNAL_ERROR", "Failed to migrate proof", requestId, 500);
  }
}

async function handleGetMigrations(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    // Parse query parameters
    const url = new URL(req.url);
    const fromVersion = url.searchParams.get("fromVersion");

    if (!fromVersion) {
      return jsonErr("VALIDATION_ERROR", "From version is required", requestId, 400);
    }

    // Get available migrations
    const availableMigrations = getAvailableMigrations(fromVersion);

    return jsonOk({ availableMigrations }, requestId);
  } catch (error) {
    capture(error, { route: "/api/schema/migrate", event: "get_migrations_error" });
    return jsonErr("INTERNAL_ERROR", "Failed to get available migrations", requestId, 500);
  }
}

export const POST = withRateLimit(handleMigrateProof, "/api/schema/migrate", {
  capacity: 20, // 20 requests
  refillRate: 2, // 2 tokens per second
  windowMs: 60000, // 1 minute window
});

export const GET = withRateLimit(handleGetMigrations, "/api/schema/migrate", {
  capacity: 100, // 100 requests
  refillRate: 10, // 10 tokens per second
  windowMs: 60000, // 1 minute window
});
