import { NextResponse } from "next/server";
import { addRequestIdHeader } from "./request-id";

/**
 * Standard error response shape
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    request_id: string;
  };
}

/**
 * Standard success response shape
 */
export interface SuccessResponse<T = unknown> {
  data: T;
  meta: {
    timestamp: string;
    request_id: string;
  };
}

/**
 * Create a standardized success response
 */
export const jsonOk = <T>(data: T, requestId: string, init: ResponseInit = {}): NextResponse => {
  const response: SuccessResponse<T> = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };

  const nextResponse = NextResponse.json(response, {
    ...init,
    status: 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });

  return addRequestIdHeader(nextResponse, requestId);
};

/**
 * Create a standardized error response
 */
export const jsonErr = (
  code: string,
  message: string,
  requestId: string,
  status = 400,
  details?: Record<string, unknown>,
): NextResponse => {
  const response: ErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };

  const nextResponse = NextResponse.json(response, {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

  return addRequestIdHeader(nextResponse, requestId);
};

/**
 * Common error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  CONFLICT: "CONFLICT",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
} as const;

/**
 * Helper functions for common error responses
 */
export const createValidationError = (requestId: string, details: Record<string, unknown>) =>
  jsonErr(ErrorCodes.VALIDATION_ERROR, "Invalid request parameters", requestId, 400, details);

export const createAuthError = (requestId: string, message = "Authentication required") =>
  jsonErr(ErrorCodes.AUTHENTICATION_REQUIRED, message, requestId, 401);

export const createPermissionError = (requestId: string, message = "Insufficient permissions") =>
  jsonErr(ErrorCodes.INSUFFICIENT_PERMISSIONS, message, requestId, 403);

export const createNotFoundError = (requestId: string, message = "Resource not found") =>
  jsonErr(ErrorCodes.RESOURCE_NOT_FOUND, message, requestId, 404);

export const createRateLimitError = (requestId: string, message = "Rate limit exceeded") =>
  jsonErr(ErrorCodes.RATE_LIMIT_EXCEEDED, message, requestId, 429);

export const createInternalError = (requestId: string, message = "Internal server error") =>
  jsonErr(ErrorCodes.INTERNAL_ERROR, message, requestId, 500);

export const createServiceUnavailableError = (
  requestId: string,
  message = "Service temporarily unavailable",
) => jsonErr(ErrorCodes.SERVICE_UNAVAILABLE, message, requestId, 503);
