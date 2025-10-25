/**
 * Request ID utilities for tracking requests across the application
 */

import { NextRequest, NextResponse } from "next/server";
import { ulid } from "ulidx";

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${ulid()}`;
}

/**
 * Extract request ID from headers or generate a new one
 */
export function getRequestId(request: NextRequest): string {
  // Check for existing request ID in headers
  const existingId = request.headers.get("x-request-id");
  if (existingId) {
    return existingId;
  }

  // Check for correlation ID (common in microservices)
  const correlationId = request.headers.get("x-correlation-id");
  if (correlationId) {
    return correlationId;
  }

  // Generate new request ID
  return generateRequestId();
}

/**
 * Add request ID to response headers
 */
export function addRequestIdHeader(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("x-request-id", requestId);
  return response;
}

/**
 * Create a request context object for logging
 */
export function createRequestContext(request: NextRequest, requestId: string) {
  return {
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    timestamp: new Date().toISOString(),
  };
}
