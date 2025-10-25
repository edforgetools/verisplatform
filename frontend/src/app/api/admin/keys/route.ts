/**
 * Key Management API Endpoint
 *
 * Provides endpoints for monitoring key status and managing key rotation.
 * Requires admin authentication.
 */

import { NextRequest } from "next/server";
import { keyManager } from "@/lib/key-management";
import { withApiMiddleware } from "@/lib/api-middleware";
import { jsonOk, jsonErr, createAuthError, createInternalError, ErrorCodes } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { createRequestLogger, loggers } from "@/lib/logger";

/**
 * Get key management status
 */
async function handleGetStatus(req: NextRequest) {
  const requestId = getRequestId(req);
  const requestLogger = createRequestLogger(requestId);

  try {
    // Initialize key manager
    await keyManager.initialize();

    // Get status information
    const status = keyManager.getRotationStatus();
    const fingerprints = keyManager.getKeyFingerprints();
    const health = keyManager.healthCheck();

    const response = {
      status: {
        isRotating: status.isRotating,
        canRemoveSecondary: status.canRemoveSecondary,
        cutoffDate: status.cutoffDate?.toISOString(),
      },
      keys: {
        primary: {
          fingerprint: fingerprints.primary,
          createdAt: status.primaryKey.createdAt.toISOString(),
          isActive: status.primaryKey.isActive,
        },
        secondary: status.secondaryKey
          ? {
              fingerprint: fingerprints.secondary,
              createdAt: status.secondaryKey.createdAt.toISOString(),
              isActive: status.secondaryKey.isActive,
            }
          : null,
      },
      health: {
        healthy: health.healthy,
        details: health.details,
      },
    };

    requestLogger.info(
      {
        event: "key_status_retrieved",
        isRotating: status.isRotating,
        healthy: health.healthy,
      },
      "Key status retrieved successfully",
    );

    return jsonOk(response, requestId);
  } catch (error) {
    requestLogger.error(
      {
        event: "key_status_error",
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to retrieve key status",
    );

    return createInternalError(requestId);
  }
}

/**
 * Start key rotation
 */
async function handleStartRotation(req: NextRequest) {
  const requestId = getRequestId(req);
  const requestLogger = createRequestLogger(requestId);

  try {
    const body = await req.json();
    const { newPrivateKey, newPublicKey, cutoffHours = 24 } = body;

    if (!newPrivateKey || !newPublicKey) {
      return jsonErr(
        "VALIDATION_ERROR",
        "newPrivateKey and newPublicKey are required",
        requestId,
        400,
      );
    }

    // Initialize key manager
    await keyManager.initialize();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() + cutoffHours);

    // Start rotation
    await keyManager.startRotation(newPrivateKey, newPublicKey, cutoffDate);

    const response = {
      message: "Key rotation started successfully",
      cutoffDate: cutoffDate.toISOString(),
      cutoffHours,
    };

    requestLogger.info(
      {
        event: "key_rotation_started",
        cutoffDate: cutoffDate.toISOString(),
        cutoffHours,
      },
      "Key rotation started via API",
    );

    return jsonOk(response, requestId);
  } catch (error) {
    requestLogger.error(
      {
        event: "key_rotation_start_error",
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to start key rotation",
    );

    if (error instanceof Error && error.message.includes("already in progress")) {
      return jsonErr("VALIDATION_ERROR", "Key rotation already in progress", requestId, 409);
    }

    return createInternalError(requestId);
  }
}

/**
 * Complete key rotation
 */
async function handleCompleteRotation(req: NextRequest) {
  const requestId = getRequestId(req);
  const requestLogger = createRequestLogger(requestId);

  try {
    // Initialize key manager
    await keyManager.initialize();

    // Complete rotation
    await keyManager.completeRotation();

    const response = {
      message: "Key rotation completed successfully",
      completedAt: new Date().toISOString(),
    };

    requestLogger.info(
      {
        event: "key_rotation_completed",
      },
      "Key rotation completed via API",
    );

    return jsonOk(response, requestId);
  } catch (error) {
    requestLogger.error(
      {
        event: "key_rotation_completion_error",
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to complete key rotation",
    );

    if (error instanceof Error && error.message.includes("No rotation in progress")) {
      return jsonErr("VALIDATION_ERROR", "No rotation in progress", requestId, 400);
    }

    return createInternalError(requestId);
  }
}

/**
 * Test key operations
 */
async function handleTestKeys(req: NextRequest) {
  const requestId = getRequestId(req);
  const requestLogger = createRequestLogger(requestId);

  try {
    // Initialize key manager
    await keyManager.initialize();

    // Test data
    const testData = "API test data";

    // Test signing
    const signature = keyManager.signData(testData);

    // Test verification
    const verification = keyManager.verifySignature(testData, signature);

    // Test with wrong data
    const wrongVerification = keyManager.verifySignature("Wrong data", signature);

    const response = {
      testResults: {
        signing: {
          success: true,
          signature: signature.substring(0, 20) + "...",
        },
        verification: {
          success: verification.verified,
          keyFingerprint: verification.keyFingerprint,
        },
        wrongDataRejection: {
          success: !wrongVerification.verified,
        },
      },
      timestamp: new Date().toISOString(),
    };

    requestLogger.info(
      {
        event: "key_test_completed",
        allTestsPassed: verification.verified && !wrongVerification.verified,
      },
      "Key operations test completed",
    );

    return jsonOk(response, requestId);
  } catch (error) {
    requestLogger.error(
      {
        event: "key_test_error",
        error: error instanceof Error ? error.message : String(error),
      },
      "Key operations test failed",
    );

    return createInternalError(requestId);
  }
}

/**
 * GET /api/admin/keys - Get key status
 */
export const GET = withApiMiddleware(handleGetStatus, "/api/admin/keys");

/**
 * POST /api/admin/keys/rotate - Start key rotation
 */
export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const requestLogger = createRequestLogger(requestId);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "start":
        return await handleStartRotation(req);
      case "complete":
        return await handleCompleteRotation(req);
      case "test":
        return await handleTestKeys(req);
      default:
        return jsonErr(
          "VALIDATION_ERROR",
          "Invalid action. Must be 'start', 'complete', or 'test'",
          requestId,
          400,
        );
    }
  } catch (error) {
    requestLogger.error(
      {
        event: "key_admin_error",
        error: error instanceof Error ? error.message : String(error),
      },
      "Key admin operation failed",
    );

    return createInternalError(requestId);
  }
}
