import pino from "pino";

/**
 * Enhanced Pino logger with comprehensive PII redaction and request ID support
 */
export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      // Authentication and authorization
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.x-api-key",
      "*.password",
      "*.token",
      "*.secret",
      "*.key",
      "*.auth",
      "*.credential",
      "*.jwt",
      "*.bearer",

      // Stripe and payment data
      "stripe-signature",
      "stripe.*.id",
      "stripe.*.secret",
      "stripe.*.key",
      "payment.*.id",
      "payment.*.token",

      // Cryptographic data
      "signature",
      "hash_full",
      "hash_prefix",
      "signatureB64",
      "private_key",
      "public_key",
      "*.pem",

      // Personal information
      "email",
      "phone",
      "address",
      "ssn",
      "credit_card",
      "bank_account",
      "user_id",
      "customer_id",

      // Environment and configuration
      "process.env",
      "config.*.secret",
      "config.*.key",
      "config.*.password",

      // File content and metadata
      "file.content",
      "file.buffer",
      "file.data",
      "upload.*.content",

      // Database sensitive fields
      "db.*.password",
      "db.*.secret",
      "db.*.key",

      // Webhook and API secrets
      "webhook.*.secret",
      "api.*.secret",
      "api.*.key",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        "user-agent": req.headers["user-agent"],
        "content-type": req.headers["content-type"],
        "x-request-id": req.headers["x-request-id"],
        "x-correlation-id": req.headers["x-correlation-id"],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        "content-type": res.headers["content-type"],
        "x-request-id": res.headers["x-request-id"],
      },
    }),
  },
});

/**
 * Create a child logger with request context
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId: userId ? "[REDACTED]" : undefined,
  });
}

/**
 * Log levels for different types of events
 */
export const LogLevels = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

/**
 * Structured logging helpers
 */
export const loggers = {
  /**
   * Log API request
   */
  apiRequest: (requestId: string, method: string, url: string, userId?: string) => {
    const requestLogger = createRequestLogger(requestId, userId);
    requestLogger.info(
      {
        event: "api_request",
        method,
        url,
      },
      "API request received",
    );
  },

  /**
   * Log API response
   */
  apiResponse: (requestId: string, statusCode: number, duration: number, userId?: string) => {
    const requestLogger = createRequestLogger(requestId, userId);
    requestLogger.info(
      {
        event: "api_response",
        statusCode,
        duration,
      },
      "API response sent",
    );
  },

  /**
   * Log authentication event
   */
  authEvent: (requestId: string, event: string, userId?: string, success: boolean = true) => {
    const requestLogger = createRequestLogger(requestId, userId);
    requestLogger.info(
      {
        event: "auth_event",
        authEvent: event,
        success,
      },
      `Authentication event: ${event}`,
    );
  },

  /**
   * Log proof creation
   */
  proofCreated: (requestId: string, proofId: string, userId: string, fileSize: number) => {
    const requestLogger = createRequestLogger(requestId, userId);
    requestLogger.info(
      {
        event: "proof_created",
        proofId,
        fileSize,
      },
      "Proof created successfully",
    );
  },

  /**
   * Log proof verification
   */
  proofVerified: (requestId: string, proofId: string, userId: string, verified: boolean) => {
    const requestLogger = createRequestLogger(requestId, userId);
    requestLogger.info(
      {
        event: "proof_verified",
        proofId,
        verified,
      },
      `Proof verification ${verified ? "succeeded" : "failed"}`,
    );
  },

  /**
   * Log billing event
   */
  billingEvent: (requestId: string, event: string, userId: string, amount?: number) => {
    const requestLogger = createRequestLogger(requestId, userId);
    requestLogger.info(
      {
        event: "billing_event",
        billingEvent: event,
        amount,
      },
      `Billing event: ${event}`,
    );
  },

  /**
   * Log security event
   */
  securityEvent: (
    requestId: string,
    event: string,
    severity: "low" | "medium" | "high" | "critical",
    details?: Record<string, unknown>,
  ) => {
    const requestLogger = createRequestLogger(requestId);
    requestLogger.warn(
      {
        event: "security_event",
        securityEvent: event,
        severity,
        details,
      },
      `Security event: ${event}`,
    );
  },

  /**
   * Log performance metric
   */
  performanceMetric: (requestId: string, metric: string, value: number, unit: string) => {
    const requestLogger = createRequestLogger(requestId);
    requestLogger.info(
      {
        event: "performance_metric",
        metric,
        value,
        unit,
      },
      `Performance metric: ${metric}`,
    );
  },
};

export default logger;
