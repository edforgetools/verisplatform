/**
 * Comprehensive Security Middleware System
 *
 * This module provides security middleware for API routes including:
 * - Input validation and sanitization
 * - Rate limiting
 * - Security headers
 * - Request size limits
 * - Content type validation
 * - CORS handling
 * - Authentication and authorization
 * - Security monitoring and logging
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "./logger";
import { getRequestId } from "./request-id";
import { createRequestLogger } from "./logger";
import {
  validateInput,
  validateSecurityHeaders,
  validateRequestSize,
  createValidationMiddleware,
  createSecurityValidationMiddleware,
  ValidationResult,
} from "./input-validation";
import { withEnhancedRateLimit, rateLimitConfigs, keyGenerators } from "./rate-limiting-enhanced";

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

export interface SecurityConfig {
  // Input validation
  validateInput?: boolean;
  sanitizeInput?: boolean;
  maxRequestSize?: number;

  // Rate limiting
  rateLimit?: {
    enabled: boolean;
    config: any;
  };

  // Security headers
  securityHeaders?: {
    enabled: boolean;
    strict?: boolean;
  };

  // Content type validation
  contentTypeValidation?: {
    enabled: boolean;
    allowedTypes?: readonly string[];
  };

  // CORS
  cors?: {
    enabled: boolean;
    origins?: readonly string[];
    methods?: readonly string[];
    headers?: readonly string[];
  };

  // Authentication
  authentication?: {
    required: boolean;
    methods?: readonly string[];
  };

  // Authorization
  authorization?: {
    required: boolean;
    permissions?: readonly string[];
  };

  // Monitoring
  monitoring?: {
    enabled: boolean;
    logLevel?: "debug" | "info" | "warn" | "error";
  };
}

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

/**
 * Security middleware that combines multiple security checks
 */
export function withSecurity<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  config: SecurityConfig = {},
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestId = getRequestId(request);
    const requestLogger = createRequestLogger(requestId);
    const startTime = Date.now();

    try {
      // 1. Security headers validation
      if (config.securityHeaders?.enabled) {
        const securityResult = validateSecurityHeaders(request.headers);
        if (!securityResult.success) {
          requestLogger.warn(
            {
              event: "security_headers_failed",
              errors: securityResult.errors,
            },
            "Security headers validation failed",
          );

          if (config.securityHeaders.strict) {
            return createSecurityErrorResponse(requestId, "Invalid security headers");
          }
        }
      }

      // 2. Request size validation
      if (config.maxRequestSize) {
        const contentLength = parseInt(request.headers.get("content-length") || "0");
        const sizeResult = validateRequestSize(contentLength, config.maxRequestSize);
        if (!sizeResult.success) {
          requestLogger.warn(
            {
              event: "request_size_exceeded",
              contentLength,
              maxSize: config.maxRequestSize,
            },
            "Request size exceeded",
          );

          return createSecurityErrorResponse(requestId, "Request too large");
        }
      }

      // 3. Content type validation
      if (config.contentTypeValidation?.enabled) {
        const contentType = request.headers.get("content-type");
        if (contentType && config.contentTypeValidation.allowedTypes) {
          const allowedTypes = config.contentTypeValidation.allowedTypes;
          const isValidType = allowedTypes.some((type) => contentType.startsWith(type));

          if (!isValidType) {
            requestLogger.warn(
              {
                event: "invalid_content_type",
                contentType,
                allowedTypes,
              },
              "Invalid content type",
            );

            return createSecurityErrorResponse(requestId, "Invalid content type");
          }
        }
      }

      // 4. CORS handling
      if (config.cors?.enabled) {
        const corsResponse = handleCORS(request, config.cors);
        if (corsResponse) {
          return corsResponse;
        }
      }

      // 5. Authentication check
      if (config.authentication?.required) {
        const authResult = await validateAuthentication(request, config.authentication);
        if (!authResult.success) {
          requestLogger.warn(
            {
              event: "authentication_failed",
              reason: authResult.error,
            },
            "Authentication failed",
          );

          return createAuthErrorResponse(requestId, authResult.error || "Authentication required");
        }
      }

      // 6. Authorization check
      if (config.authorization?.required) {
        const authzResult = await validateAuthorization(request, config.authorization);
        if (!authzResult.success) {
          requestLogger.warn(
            {
              event: "authorization_failed",
              reason: authzResult.error,
            },
            "Authorization failed",
          );

          return createAuthErrorResponse(
            requestId,
            authzResult.error || "Insufficient permissions",
          );
        }
      }

      // 7. Rate limiting
      if (config.rateLimit?.enabled) {
        const rateLimitHandler = withEnhancedRateLimit(
          async (req: NextRequest) => handler(req, ...args),
          config.rateLimit.config,
        );
        return rateLimitHandler(request);
      }

      // 8. Input validation (if enabled)
      if (config.validateInput) {
        const validationResult = await validateRequestInput(request, config);
        if (!validationResult.success) {
          requestLogger.warn(
            {
              event: "input_validation_failed",
              errors: validationResult.errors,
            },
            "Input validation failed",
          );

          return createValidationErrorResponse(requestId, validationResult.errors || []);
        }
      }

      // 9. Call the actual handler
      const response = await handler(request, ...args);

      // 10. Add security headers to response
      if (config.securityHeaders?.enabled) {
        addSecurityHeaders(response);
      }

      // 11. Log security event
      if (config.monitoring?.enabled) {
        const duration = Date.now() - startTime;
        requestLogger.info(
          {
            event: "security_check_passed",
            duration,
            method: request.method,
            url: request.url,
          },
          "Security checks passed",
        );
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      requestLogger.error(
        {
          event: "security_middleware_error",
          error: error instanceof Error ? error.message : String(error),
          duration,
        },
        "Security middleware error",
      );

      return createSecurityErrorResponse(requestId, "Security check failed");
    }
  };
}

/**
 * Validate authentication
 */
async function validateAuthentication(
  request: NextRequest,
  config: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check for authentication methods
    const authHeader = request.headers.get("authorization");
    const apiKey = request.headers.get("x-api-key");
    const userToken = request.headers.get("x-user-token");

    if (config.methods?.includes("bearer") && authHeader?.startsWith("Bearer ")) {
      // Validate bearer token
      const token = authHeader.substring(7);
      if (await validateBearerToken(token)) {
        return { success: true };
      }
    }

    if (config.methods?.includes("api-key") && apiKey) {
      // Validate API key
      if (await validateApiKey(apiKey)) {
        return { success: true };
      }
    }

    if (config.methods?.includes("user-token") && userToken) {
      // Validate user token
      if (await validateUserToken(userToken)) {
        return { success: true };
      }
    }

    return { success: false, error: "No valid authentication method found" };
  } catch (error) {
    return { success: false, error: "Authentication validation error" };
  }
}

/**
 * Validate authorization
 */
async function validateAuthorization(
  request: NextRequest,
  config: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user permissions from request
    const userPermissions = request.headers.get("x-user-permissions");
    if (!userPermissions) {
      return { success: false, error: "User permissions not found" };
    }

    const permissions = userPermissions.split(",");
    const requiredPermissions = config.permissions || [];

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission: string) =>
      permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      return {
        success: false,
        error: `Missing required permissions: ${requiredPermissions.join(", ")}`,
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "Authorization validation error" };
  }
}

/**
 * Validate request input
 */
async function validateRequestInput(
  request: NextRequest,
  config: SecurityConfig,
): Promise<ValidationResult> {
  try {
    if (request.method === "GET") {
      // Validate query parameters
      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams);
      return validateInput(queryParams, z.object({}), {
        sanitize: config.sanitizeInput,
        context: "query_params",
      });
    } else {
      // Validate request body
      const contentType = request.headers.get("content-type");
      if (contentType?.startsWith("application/json")) {
        const body = await request.json();
        return validateInput(body, z.object({}), {
          sanitize: config.sanitizeInput,
          context: "request_body",
        });
      } else if (contentType?.startsWith("multipart/form-data")) {
        // For multipart data, we'll validate individual fields
        return { success: true };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: ["Failed to validate request input"],
    };
  }
}

/**
 * Handle CORS
 */
function handleCORS(request: NextRequest, config: any): NextResponse | null {
  const origin = request.headers.get("origin");
  const method = request.headers.get("access-control-request-method");
  const headers = request.headers.get("access-control-request-headers");

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 200 });

    if (origin && config.origins?.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    if (method && config.methods?.includes(method)) {
      response.headers.set("Access-Control-Allow-Methods", config.methods.join(", "));
    }

    if (headers && config.headers) {
      response.headers.set("Access-Control-Allow-Headers", config.headers.join(", "));
    }

    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.set("Access-Control-Allow-Credentials", "true");

    return response;
  }

  return null;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Strict Transport Security (only for HTTPS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

// =============================================================================
// AUTHENTICATION VALIDATORS
// =============================================================================

async function validateBearerToken(token: string): Promise<boolean> {
  try {
    // Implement your bearer token validation logic here
    // This could involve JWT validation, database lookup, etc.
    return token.length > 10; // Placeholder validation
  } catch (error) {
    return false;
  }
}

async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    // Implement your API key validation logic here
    // This could involve database lookup, key format validation, etc.
    return apiKey.length > 20; // Placeholder validation
  } catch (error) {
    return false;
  }
}

async function validateUserToken(userToken: string): Promise<boolean> {
  try {
    // Implement your user token validation logic here
    // This could involve session validation, database lookup, etc.
    return userToken.length > 10; // Placeholder validation
  } catch (error) {
    return false;
  }
}

// =============================================================================
// ERROR RESPONSE CREATORS
// =============================================================================

function createSecurityErrorResponse(requestId: string, message: string): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "SECURITY_ERROR",
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    },
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
      },
    },
  );
}

function createAuthErrorResponse(requestId: string, message: string): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "AUTHENTICATION_ERROR",
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    },
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
      },
    },
  );
}

function createValidationErrorResponse(requestId: string, errors: string[]): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Input validation failed",
        details: { errors },
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    },
    {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
      },
    },
  );
}

// =============================================================================
// PREDEFINED SECURITY CONFIGURATIONS
// =============================================================================

export const securityConfigs = {
  // Strict security for sensitive endpoints
  strict: {
    validateInput: true,
    sanitizeInput: true,
    maxRequestSize: 1024 * 1024, // 1MB
    rateLimit: {
      enabled: true,
      config: rateLimitConfigs.strict,
    },
    securityHeaders: {
      enabled: true,
      strict: true,
    },
    contentTypeValidation: {
      enabled: true,
      allowedTypes: ["application/json"],
    },
    authentication: {
      required: true,
      methods: ["bearer", "api-key"],
    },
    authorization: {
      required: true,
      permissions: ["read", "write"],
    },
    monitoring: {
      enabled: true,
      logLevel: "warn",
    },
  },

  // Standard security for API endpoints
  standard: {
    validateInput: true,
    sanitizeInput: true,
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    rateLimit: {
      enabled: true,
      config: rateLimitConfigs.standard,
    },
    securityHeaders: {
      enabled: true,
      strict: false,
    },
    contentTypeValidation: {
      enabled: true,
      allowedTypes: ["application/json", "multipart/form-data"],
    },
    authentication: {
      required: true,
      methods: ["bearer", "api-key", "user-token"],
    },
    monitoring: {
      enabled: true,
      logLevel: "info",
    },
  },

  // Relaxed security for public endpoints
  public: {
    validateInput: true,
    sanitizeInput: true,
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    rateLimit: {
      enabled: true,
      config: rateLimitConfigs.relaxed,
    },
    securityHeaders: {
      enabled: true,
      strict: false,
    },
    contentTypeValidation: {
      enabled: true,
      allowedTypes: ["application/json", "multipart/form-data", "text/plain"],
    },
    cors: {
      enabled: true,
      origins: ["*"],
      methods: ["GET", "POST", "OPTIONS"],
      headers: ["Content-Type", "Authorization"],
    },
    monitoring: {
      enabled: true,
      logLevel: "info",
    },
  },

  // File upload security
  fileUpload: {
    validateInput: true,
    sanitizeInput: true,
    maxRequestSize: 100 * 1024 * 1024, // 100MB
    rateLimit: {
      enabled: true,
      config: rateLimitConfigs.fileUpload,
    },
    securityHeaders: {
      enabled: true,
      strict: false,
    },
    contentTypeValidation: {
      enabled: true,
      allowedTypes: ["multipart/form-data"],
    },
    authentication: {
      required: true,
      methods: ["bearer", "api-key"],
    },
    monitoring: {
      enabled: true,
      logLevel: "warn",
    },
  },

  // Authentication endpoint security
  auth: {
    validateInput: true,
    sanitizeInput: true,
    maxRequestSize: 1024 * 1024, // 1MB
    rateLimit: {
      enabled: true,
      config: rateLimitConfigs.auth,
    },
    securityHeaders: {
      enabled: true,
      strict: true,
    },
    contentTypeValidation: {
      enabled: true,
      allowedTypes: ["application/json"],
    },
    monitoring: {
      enabled: true,
      logLevel: "warn",
    },
  },
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create security middleware with predefined configuration
 */
export function withSecurityConfig(
  handler: (request: NextRequest) => Promise<NextResponse>,
  configName: keyof typeof securityConfigs,
) {
  return withSecurity(handler, securityConfigs[configName]);
}

/**
 * Create custom security middleware
 */
export function createSecurityMiddleware(config: SecurityConfig) {
  return (handler: (request: NextRequest) => Promise<NextResponse>) => {
    return withSecurity(handler, config);
  };
}
