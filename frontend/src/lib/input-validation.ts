/**
 * Comprehensive Input Validation System
 *
 * This module provides robust input validation for all API endpoints,
 * including schema validation, sanitization, and security checks.
 */

import { z } from "zod";
import { logger } from "./logger";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Common validation patterns
 */
export const commonPatterns = {
  // Proof ID format (ULID)
  proofId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, "Invalid proof ID format"),

  // Hash format (64 character hex)
  hashHex: z.string().regex(/^[a-f0-9]{64}$/, "Invalid hash format"),

  // Hash prefix format (XXXX-XXXX)
  hashPrefix: z.string().regex(/^[A-F0-9]{4}-[A-F0-9]{4}$/, "Invalid hash prefix format"),

  // Signature format (base64)
  signature: z.string().regex(/^[A-Za-z0-9+/]+=*$/, "Invalid signature format"),

  // File name (safe characters only)
  fileName: z
    .string()
    .min(1, "File name cannot be empty")
    .max(255, "File name too long")
    .regex(/^[a-zA-Z0-9._-]+$/, "File name contains invalid characters"),

  // User ID format
  userId: z.string().uuid("Invalid user ID format"),

  // Email format
  email: z.string().email("Invalid email format"),

  // URL format
  url: z.string().url("Invalid URL format"),

  // Timestamp (ISO 8601)
  timestamp: z.string().datetime("Invalid timestamp format"),

  // Positive integer
  positiveInt: z.number().int().positive("Must be a positive integer"),

  // Non-negative integer
  nonNegativeInt: z.number().int().min(0, "Must be non-negative"),

  // Safe string (no dangerous characters)
  safeString: z
    .string()
    .max(1000, "String too long")
    .refine((val) => !/[<>\"'&]/.test(val), "String contains potentially dangerous characters"),
};

/**
 * File upload validation
 */
export const fileUploadSchema = z.object({
  file: z.object({
    name: commonPatterns.fileName,
    size: z.number().max(10 * 1024 * 1024, "File too large (max 10MB)"),
    type: z
      .string()
      .regex(
        /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/,
        "Invalid file type",
      ),
  }),
  metadata: z
    .object({
      description: commonPatterns.safeString.optional(),
      tags: z.array(commonPatterns.safeString).max(10, "Too many tags").optional(),
    })
    .optional(),
});

/**
 * Proof creation validation
 */
export const createProofSchema = z.object({
  file: z.object({
    name: commonPatterns.fileName,
    size: z.number().max(10 * 1024 * 1024, "File too large (max 10MB)"),
    type: z
      .string()
      .regex(
        /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/,
        "Invalid file type",
      ),
  }),
  metadata: z
    .object({
      description: commonPatterns.safeString.optional(),
      tags: z.array(commonPatterns.safeString).max(10, "Too many tags").optional(),
    })
    .optional(),
  options: z
    .object({
      includeTimestamp: z.boolean().optional(),
      includeHash: z.boolean().optional(),
      schemaVersion: z
        .string()
        .regex(/^\d+\.\d+\.\d+$/, "Invalid schema version")
        .optional(),
    })
    .optional(),
});

/**
 * Proof verification validation
 */
export const verifyProofSchema = z.discriminatedUnion("type", [
  // Verify by ID
  z.object({
    type: z.literal("id"),
    id: commonPatterns.proofId,
  }),
  // Verify by hash and signature
  z.object({
    type: z.literal("signature"),
    hashHex: commonPatterns.hashHex,
    signatureB64: commonPatterns.signature,
  }),
  // Verify by file
  z.object({
    type: z.literal("file"),
    file: z.object({
      name: commonPatterns.fileName,
      size: z.number().max(10 * 1024 * 1024, "File too large (max 10MB)"),
      type: z
        .string()
        .regex(
          /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/,
          "Invalid file type",
        ),
    }),
  }),
]);

/**
 * Billing validation
 */
export const billingSchema = z.object({
  planId: z.string().min(1, "Plan ID required"),
  customerId: z.string().min(1, "Customer ID required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Invalid currency code"),
  metadata: z.record(z.string(), z.string()).optional(),
});

/**
 * User registration validation
 */
export const userRegistrationSchema = z.object({
  email: commonPatterns.email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  name: z
    .string()
    .min(1, "Name required")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  termsAccepted: z.boolean().refine((val) => val === true, "Terms must be accepted"),
});

/**
 * API key validation
 */
export const apiKeySchema = z.object({
  name: z
    .string()
    .min(1, "API key name required")
    .max(50, "API key name too long")
    .regex(/^[a-zA-Z0-9\s_-]+$/, "API key name contains invalid characters"),
  permissions: z
    .array(z.enum(["read", "write", "admin"]))
    .min(1, "At least one permission required"),
  expiresAt: z.string().datetime().optional(),
});

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validation result interface
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
  sanitized?: boolean;
}

/**
 * Sanitize input data
 */
export function sanitizeInput(data: unknown): unknown {
  if (typeof data === "string") {
    // Remove potentially dangerous characters
    return data
      .replace(/[<>\"'&]/g, "")
      .trim()
      .substring(0, 1000); // Limit length
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (typeof data === "object" && data !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Sanitize key
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, "");
      if (cleanKey) {
        sanitized[cleanKey] = sanitizeInput(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Validate and sanitize input data
 */
export function validateInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  options: {
    sanitize?: boolean;
    logErrors?: boolean;
    context?: string;
  } = {},
): ValidationResult<T> {
  const { sanitize = true, logErrors = true, context = "validation" } = options;

  try {
    // Sanitize input if requested
    const inputData = sanitize ? sanitizeInput(data) : data;

    // Validate with schema
    const result = schema.safeParse(inputData);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        sanitized: sanitize,
      };
    } else {
      const errors = result.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);

      if (logErrors) {
        logger.warn(
          {
            event: "validation_failed",
            context,
            errors,
            inputType: typeof data,
            inputKeys: typeof data === "object" && data !== null ? Object.keys(data) : undefined,
          },
          "Input validation failed",
        );
      }

      return {
        success: false,
        errors,
        sanitized: sanitize,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown validation error";

    if (logErrors) {
      logger.error(
        {
          event: "validation_error",
          context,
          error: errorMessage,
        },
        "Input validation error",
      );
    }

    return {
      success: false,
      errors: [errorMessage],
      sanitized: sanitize,
    };
  }
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File): ValidationResult {
  const errors: string[] = [];

  // Check file size
  if (file.size > 10 * 1024 * 1024) {
    errors.push("File too large (max 10MB)");
  }

  // Check file name
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    errors.push("File name contains invalid characters");
  }

  // Check file type
  if (!/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/.test(file.type)) {
    errors.push("Invalid file type");
  }

  // Check for dangerous file types
  const dangerousTypes = [
    "application/x-executable",
    "application/x-msdownload",
    "application/x-msdos-program",
    "application/x-winexe",
    "application/x-msi",
    "application/x-ms-shortcut",
  ];

  if (dangerousTypes.includes(file.type)) {
    errors.push("File type not allowed for security reasons");
  }

  // Check file extension
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".pif",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
  ];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

  if (dangerousExtensions.includes(fileExtension)) {
    errors.push("File extension not allowed for security reasons");
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: file,
  };
}

/**
 * Validate proof ID format
 */
export function validateProofId(id: string): ValidationResult<string> {
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id)) {
    return {
      success: false,
      errors: ["Invalid proof ID format"],
    };
  }

  return {
    success: true,
    data: id,
  };
}

/**
 * Validate hash format
 */
export function validateHash(hash: string): ValidationResult<string> {
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    return {
      success: false,
      errors: ["Invalid hash format"],
    };
  }

  return {
    success: true,
    data: hash,
  };
}

/**
 * Validate signature format
 */
export function validateSignature(signature: string): ValidationResult<string> {
  if (!/^[A-Za-z0-9+/]+=*$/.test(signature)) {
    return {
      success: false,
      errors: ["Invalid signature format"],
    };
  }

  return {
    success: true,
    data: signature,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult<string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      success: false,
      errors: ["Invalid email format"],
    };
  }

  // Check for common email security issues
  if (email.length > 254) {
    return {
      success: false,
      errors: ["Email too long"],
    };
  }

  if (email.includes("..") || email.startsWith(".") || email.endsWith(".")) {
    return {
      success: false,
      errors: ["Invalid email format"],
    };
  }

  return {
    success: true,
    data: email.toLowerCase(),
  };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult<string> {
  try {
    const urlObj = new URL(url);

    // Check protocol
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return {
        success: false,
        errors: ["URL must use HTTP or HTTPS protocol"],
      };
    }

    // Check for dangerous protocols
    const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
    if (dangerousProtocols.some((proto) => url.toLowerCase().startsWith(proto))) {
      return {
        success: false,
        errors: ["URL protocol not allowed"],
      };
    }

    return {
      success: true,
      data: url,
    };
  } catch {
    return {
      success: false,
      errors: ["Invalid URL format"],
    };
  }
}

/**
 * Validate JSON input
 */
export function validateJsonInput(jsonString: string): ValidationResult<unknown> {
  try {
    const parsed = JSON.parse(jsonString);

    // Check for circular references
    const seen = new WeakSet();
    const checkCircular = (obj: unknown): boolean => {
      if (typeof obj === "object" && obj !== null) {
        if (seen.has(obj)) {
          return true;
        }
        seen.add(obj);

        for (const value of Object.values(obj)) {
          if (checkCircular(value)) {
            return true;
          }
        }
      }
      return false;
    };

    if (checkCircular(parsed)) {
      return {
        success: false,
        errors: ["JSON contains circular references"],
      };
    }

    return {
      success: true,
      data: parsed,
    };
  } catch {
    return {
      success: false,
      errors: ["Invalid JSON format"],
    };
  }
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(
  requests: number,
  limit: number,
  windowMs: number,
): ValidationResult<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const resetTime = now + windowMs;
  const remaining = Math.max(0, limit - requests);
  const allowed = requests < limit;

  return {
    success: true,
    data: {
      allowed,
      remaining,
      resetTime,
    },
  };
}

/**
 * Security validation for API requests
 */
export function validateSecurityHeaders(
  headers: Headers,
): ValidationResult<Record<string, string>> {
  const errors: string[] = [];
  const securityHeaders: Record<string, string> = {};

  // Check for required security headers
  const requiredHeaders = ["user-agent", "accept"];
  for (const header of requiredHeaders) {
    const value = headers.get(header);
    if (!value) {
      errors.push(`Missing required header: ${header}`);
    } else {
      securityHeaders[header] = value;
    }
  }

  // Validate User-Agent
  const userAgent = headers.get("user-agent");
  if (userAgent) {
    if (userAgent.length > 500) {
      errors.push("User-Agent header too long");
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [/script/i, /javascript/i, /vbscript/i, /onload/i, /onerror/i];

    if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
      errors.push("Suspicious User-Agent header");
    }
  }

  // Validate Content-Type for POST requests
  const contentType = headers.get("content-type");
  if (contentType) {
    if (
      !contentType.startsWith("application/json") &&
      !contentType.startsWith("multipart/form-data")
    ) {
      errors.push("Invalid Content-Type header");
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: securityHeaders,
  };
}

/**
 * Validate request size
 */
export function validateRequestSize(
  contentLength: number,
  maxSize: number = 10 * 1024 * 1024,
): ValidationResult<number> {
  if (contentLength > maxSize) {
    return {
      success: false,
      errors: [`Request too large (max ${maxSize} bytes)`],
    };
  }

  return {
    success: true,
    data: contentLength,
  };
}

// =============================================================================
// MIDDLEWARE INTEGRATION
// =============================================================================

/**
 * Create validation middleware for API routes
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  options: {
    sanitize?: boolean;
    logErrors?: boolean;
    context?: string;
  } = {},
) {
  return (data: unknown): ValidationResult<T> => {
    return validateInput(data, schema, options);
  };
}

/**
 * Create file validation middleware
 */
export function createFileValidationMiddleware() {
  return (file: File): ValidationResult => {
    return validateFileUpload(file);
  };
}

/**
 * Create security validation middleware
 */
export function createSecurityValidationMiddleware() {
  return (headers: Headers): ValidationResult<Record<string, string>> => {
    return validateSecurityHeaders(headers);
  };
}
