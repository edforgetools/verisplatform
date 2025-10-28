/**
 * API middleware utilities for request handling, logging, and error management
 */

import { NextRequest } from "next/server";
import { getRequestId, createRequestContext } from "./request-id";
import { createRequestLogger, loggers } from "./logger";
import { capture } from "./observability";
import { createInternalError } from "./http";

/**
 * Middleware wrapper for API routes with request ID, logging, and error handling
 */
export function withApiMiddleware<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
  routeName: string,
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const startTime = Date.now();
    const requestId = getRequestId(request);
    const requestContext = createRequestContext(request, requestId);
    const requestLogger = createRequestLogger(requestId);

    // Log incoming request
    loggers.apiRequest(
      requestId,
      request.method,
      request.url,
      requestContext.userAgent || undefined, // We'll get actual user ID from auth later
    );

    try {
      // Add request ID to request headers for downstream use
      request.headers.set("x-request-id", requestId);

      // Call the actual handler
      const response = await handler(request, ...args);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Log response
      loggers.apiResponse(requestId, response.status, duration);

      // Add request ID to response headers
      response.headers.set("x-request-id", requestId);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      requestLogger.error(
        {
          event: "api_error",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          duration,
          route: routeName,
        },
        "API request failed",
      );

      // Capture error for monitoring
      capture(error, {
        route: routeName,
        duration,
        ...requestContext,
      });

      // Return standardized error response
      return createInternalError(requestId);
    }
  };
}

/**
 * Middleware for authentication-required routes
 */
export function withAuth<T extends unknown[]>(
  handler: (request: NextRequest, userId: string, ...args: T) => Promise<Response>,
  routeName: string,
) {
  return withApiMiddleware(async (request: NextRequest, ...args: T): Promise<Response> => {
    const requestId = getRequestId(request);
    const requestLogger = createRequestLogger(requestId);

    // Extract user ID from request (this would come from your auth system)
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      requestLogger.warn(
        {
          event: "auth_required",
          route: routeName,
        },
        "Authentication required but not provided",
      );

      return new Response(
        JSON.stringify({
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication required",
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "x-request-id": requestId,
          },
        },
      );
    }

    // Log authentication success
    loggers.authEvent(requestId, "authenticated", userId, true);

    return handler(request, userId, ...args);
  }, routeName);
}

/**
 * Middleware for rate-limited routes
 */
export function withRateLimit<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
  routeName: string,
  limit: number = 100,
  windowMs: number = 60 * 1000, // 1 minute
) {
  return withApiMiddleware(async (request: NextRequest, ...args: T): Promise<Response> => {
    const requestId = getRequestId(request);
    const requestLogger = createRequestLogger(requestId);

    // TODO: Implement actual rate limiting logic with Redis
    // For now, this is a placeholder
    const _clientId = request.headers.get("x-forwarded-for") || "unknown";

    requestLogger.debug(
      {
        event: "rate_limit_check",
        limit,
        windowMs,
      },
      "Rate limit check",
    );

    // Call the actual handler
    return handler(request, ...args);
  }, routeName);
}

/**
 * Middleware for request validation
 */
export function withValidation<T extends unknown[]>(
  handler: (request: NextRequest, validatedData: unknown, ...args: T) => Promise<Response>,
  validator: (data: unknown) => { valid: boolean; data?: unknown; errors?: string[] },
  routeName: string,
) {
  return withApiMiddleware(async (request: NextRequest, ...args: T): Promise<Response> => {
    const requestId = getRequestId(request);
    const requestLogger = createRequestLogger(requestId);

    try {
      // Parse request body
      const body = await request.json();

      // Validate data
      const validation = validator(body);

      if (!validation.valid) {
        requestLogger.warn(
          {
            event: "validation_failed",
            errors: validation.errors,
            route: routeName,
          },
          "Request validation failed",
        );

        return new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request parameters",
              details: {
                errors: validation.errors,
              },
            },
            meta: {
              timestamp: new Date().toISOString(),
              request_id: requestId,
            },
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "x-request-id": requestId,
            },
          },
        );
      }

      return handler(request, validation.data, ...args);
    } catch (error) {
      requestLogger.error(
        {
          event: "validation_error",
          error: error instanceof Error ? error.message : String(error),
          route: routeName,
        },
        "Request validation error",
      );

      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request format",
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "x-request-id": requestId,
          },
        },
      );
    }
  }, routeName);
}

/**
 * Performance monitoring middleware
 */
export function withPerformanceMonitoring<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
  routeName: string,
) {
  return withApiMiddleware(async (request: NextRequest, ...args: T): Promise<Response> => {
    const startTime = Date.now();
    const requestId = getRequestId(request);

    try {
      const response = await handler(request, ...args);
      const duration = Date.now() - startTime;

      // Log performance metrics
      loggers.performanceMetric(requestId, "request_duration", duration, "ms");
      loggers.performanceMetric(
        requestId,
        "response_size",
        response.headers.get("content-length")
          ? parseInt(response.headers.get("content-length")!)
          : 0,
        "bytes",
      );

      // Add performance headers
      response.headers.set("x-response-time", duration.toString());
      response.headers.set("x-request-id", requestId);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error performance
      loggers.performanceMetric(requestId, "error_duration", duration, "ms");

      throw error; // Re-throw to be handled by parent middleware
    }
  }, routeName);
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware<T extends unknown[]>(
  ...middlewares: Array<
    (
      handler: (request: NextRequest, ...args: T) => Promise<Response>,
    ) => (request: NextRequest, ...args: T) => Promise<Response>
  >
) {
  return (handler: (request: NextRequest, ...args: T) => Promise<Response>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
