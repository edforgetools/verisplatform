import pino from "pino";

// Create a Pino logger instance with redactions for sensitive data
export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "process.env",
      "*.password",
      "*.token",
      "*.secret",
      "*.key",
      "*.auth",
      "*.credential",
      "stripe-signature",
      "signature",
      "hash_full",
      "hash_prefix",
      "signatureB64",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
