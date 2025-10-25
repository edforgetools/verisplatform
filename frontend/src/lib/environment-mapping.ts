/**
 * Environment Variable Mapping and Documentation
 *
 * This module provides comprehensive mapping, validation, and documentation
 * for all environment variables used by the Veris platform.
 */

import { z } from "zod";

// =============================================================================
// ENVIRONMENT VARIABLE DEFINITIONS
// =============================================================================

export interface EnvironmentVariable {
  name: string;
  description: string;
  required: boolean;
  type: string;
  example: string;
  validation: string;
  environment: "client" | "server" | "both";
  security: "public" | "secret" | "sensitive";
  category: string;
  dependencies?: string[];
  conflicts?: string[];
  defaultValue?: string;
  notes?: string;
}

export interface EnvironmentCategory {
  name: string;
  description: string;
  variables: EnvironmentVariable[];
}

// =============================================================================
// ENVIRONMENT VARIABLE CATEGORIES
// =============================================================================

export const environmentCategories: EnvironmentCategory[] = [
  {
    name: "Supabase Configuration",
    description: "Database and authentication configuration",
    variables: [
      {
        name: "NEXT_PUBLIC_SUPABASE_URL",
        description: "Supabase project URL for client-side access",
        required: true,
        type: "string (URL)",
        example: "https://your-project.supabase.co",
        validation: "Must be a valid HTTPS URL",
        environment: "client",
        security: "public",
        category: "Supabase Configuration",
        notes: "This URL is exposed to the browser and should not contain secrets",
      },
      {
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        description: "Supabase anonymous key for client-side database access",
        required: true,
        type: "string (JWT)",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        validation: "Minimum 10 characters, valid JWT format",
        environment: "client",
        security: "public",
        category: "Supabase Configuration",
        notes: "This key is exposed to the browser and has limited permissions",
      },
      {
        name: "supabaseservicekey",
        description: "Supabase service role key for server-side database access",
        required: true,
        type: "string (JWT)",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        validation: "Minimum 10 characters, valid JWT format",
        environment: "server",
        security: "secret",
        category: "Supabase Configuration",
        notes: "This key has elevated permissions and should never be exposed to the client",
      },
    ],
  },
  {
    name: "Stripe Configuration",
    description: "Payment processing and billing configuration",
    variables: [
      {
        name: "NEXT_PUBLIC_STRIPE_MODE",
        description: "Stripe mode (test or live) - controls which keys and price IDs are used",
        required: false,
        type: "enum",
        example: "test",
        validation: "Must be 'test' or 'live'",
        environment: "client",
        security: "public",
        category: "Stripe Configuration",
        defaultValue: "test",
        notes: "Set to 'live' for production, 'test' for development",
      },
      {
        name: "STRIPE_SECRET_KEY",
        description: "Stripe secret key for server-side payment operations",
        required: true,
        type: "string",
        example: "sk_test_1234567890abcdef",
        validation: "Must start with 'sk_'",
        environment: "server",
        security: "secret",
        category: "Stripe Configuration",
        dependencies: ["NEXT_PUBLIC_STRIPE_MODE"],
        notes: "Use test keys for development, live keys for production",
      },
      {
        name: "STRIPE_WEBHOOK_SECRET",
        description: "Stripe webhook secret for webhook signature verification",
        required: true,
        type: "string",
        example: "whsec_1234567890abcdef",
        validation: "Must start with 'whsec_'",
        environment: "server",
        security: "secret",
        category: "Stripe Configuration",
        notes: "Get this from your Stripe dashboard webhook settings",
      },
      {
        name: "NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID",
        description: "Stripe price ID for Pro monthly subscription plan",
        required: false,
        type: "string",
        example: "price_1234567890abcdef",
        validation: "Valid Stripe price ID format",
        environment: "client",
        security: "public",
        category: "Stripe Configuration",
        dependencies: ["NEXT_PUBLIC_STRIPE_MODE"],
        notes: "Create this in your Stripe dashboard under Products > Pricing",
      },
      {
        name: "NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID",
        description: "Stripe price ID for Team monthly subscription plan",
        required: false,
        type: "string",
        example: "price_0987654321fedcba",
        validation: "Valid Stripe price ID format",
        environment: "client",
        security: "public",
        category: "Stripe Configuration",
        dependencies: ["NEXT_PUBLIC_STRIPE_MODE"],
        notes: "Create this in your Stripe dashboard under Products > Pricing",
      },
      {
        name: "STRIPE_USAGE_PRICE_ID",
        description: "Stripe price ID for usage-based billing",
        required: false,
        type: "string",
        example: "price_usage_1234567890",
        validation: "Valid Stripe price ID format",
        environment: "server",
        security: "sensitive",
        category: "Stripe Configuration",
        notes: "Optional: for usage-based billing models",
      },
    ],
  },
  {
    name: "Authentication & Security",
    description: "Authentication tokens and security configuration",
    variables: [
      {
        name: "CRON_JOB_TOKEN",
        description: "Token for authenticating cron jobs and scheduled tasks",
        required: true,
        type: "string",
        example: "your-secure-cron-token-here-min-16-chars",
        validation: "Minimum 16 characters",
        environment: "server",
        security: "secret",
        category: "Authentication & Security",
        notes: "Generate a secure random string for this token",
      },
      {
        name: "CRON_SECRET",
        description: "Legacy cron secret for backward compatibility",
        required: false,
        type: "string",
        example: "your-legacy-cron-secret-here",
        validation: "Minimum 16 characters",
        environment: "server",
        security: "secret",
        category: "Authentication & Security",
        conflicts: ["CRON_JOB_TOKEN"],
        notes: "Use CRON_JOB_TOKEN instead for new deployments",
      },
      {
        name: "INTERNAL_KEY",
        description: "Key for accessing internal status and admin endpoints",
        required: false,
        type: "string",
        example: "your-secure-internal-key-here-min-16-chars",
        validation: "Minimum 16 characters",
        environment: "server",
        security: "secret",
        category: "Authentication & Security",
        notes: "Generate a secure random string for this key",
      },
    ],
  },
  {
    name: "Redis Configuration",
    description: "Redis configuration for caching and rate limiting",
    variables: [
      {
        name: "UPSTASH_REDIS_URL",
        description: "Upstash Redis connection URL",
        required: false,
        type: "string (URL)",
        example: "redis://default:password@host:port",
        validation: "Valid Redis URL format",
        environment: "server",
        security: "sensitive",
        category: "Redis Configuration",
        conflicts: ["REDIS_URL"],
        notes: "Use this for Upstash Redis connections",
      },
      {
        name: "REDIS_URL",
        description: "Standard Redis connection URL",
        required: false,
        type: "string (URL)",
        example: "redis://localhost:6379",
        validation: "Valid Redis URL format",
        environment: "server",
        security: "sensitive",
        category: "Redis Configuration",
        conflicts: ["UPSTASH_REDIS_URL"],
        notes: "Use this for standard Redis connections",
      },
      {
        name: "UPSTASH_REDIS_REST_URL",
        description: "Upstash Redis REST API URL for serverless environments",
        required: false,
        type: "string (URL)",
        example: "https://your-redis.upstash.io",
        validation: "Valid HTTPS URL",
        environment: "server",
        security: "sensitive",
        category: "Redis Configuration",
        dependencies: ["UPSTASH_REDIS_REST_TOKEN"],
        notes: "Use this for serverless Redis access",
      },
      {
        name: "UPSTASH_REDIS_REST_TOKEN",
        description: "Upstash Redis REST API token",
        required: false,
        type: "string",
        example: "your-upstash-token-here",
        validation: "Non-empty string",
        environment: "server",
        security: "secret",
        category: "Redis Configuration",
        dependencies: ["UPSTASH_REDIS_REST_URL"],
        notes: "Get this from your Upstash dashboard",
      },
    ],
  },
  {
    name: "Cryptographic Keys",
    description: "Keys for signing and verifying proofs",
    variables: [
      {
        name: "VERIS_SIGNING_PRIVATE_KEY",
        description: "Private key for signing proofs",
        required: true,
        type: "string (PEM)",
        example: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----",
        validation: "Minimum 100 characters, valid PEM format",
        environment: "server",
        security: "secret",
        category: "Cryptographic Keys",
        notes: "Generate this using the key generation script",
      },
      {
        name: "VERIS_SIGNING_PUBLIC_KEY",
        description: "Public key for verifying proofs",
        required: true,
        type: "string (PEM)",
        example: "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----",
        validation: "Minimum 100 characters, valid PEM format",
        environment: "server",
        security: "sensitive",
        category: "Cryptographic Keys",
        notes: "This key is used to verify proof signatures",
      },
    ],
  },
  {
    name: "AWS Configuration",
    description: "AWS services configuration for S3 and other services",
    variables: [
      {
        name: "AWS_REGION",
        description: "AWS region for S3 and other services",
        required: false,
        type: "string",
        example: "us-east-1",
        validation: "Valid AWS region identifier",
        environment: "server",
        security: "public",
        category: "AWS Configuration",
        defaultValue: "us-east-1",
        notes: "Choose the region closest to your users",
      },
      {
        name: "AWS_ROLE_ARN",
        description: "AWS IAM role ARN for service authentication",
        required: false,
        type: "string (ARN)",
        example: "arn:aws:iam::123456789012:role/veris-role",
        validation: "Valid AWS IAM role ARN format",
        environment: "server",
        security: "sensitive",
        category: "AWS Configuration",
        notes: "Use this for IAM role-based authentication",
      },
      {
        name: "AWS_ACCESS_KEY_ID",
        description: "AWS access key ID",
        required: false,
        type: "string",
        example: "AKIAIOSFODNN7EXAMPLE",
        validation: "Valid AWS access key format",
        environment: "server",
        security: "secret",
        category: "AWS Configuration",
        dependencies: ["AWS_SECRET_ACCESS_KEY"],
        notes: "Use this for access key-based authentication",
      },
      {
        name: "AWS_SECRET_ACCESS_KEY",
        description: "AWS secret access key",
        required: false,
        type: "string",
        example: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        validation: "Valid AWS secret key format",
        environment: "server",
        security: "secret",
        category: "AWS Configuration",
        dependencies: ["AWS_ACCESS_KEY_ID"],
        notes: "Use this for access key-based authentication",
      },
    ],
  },
  {
    name: "S3 Registry Configuration",
    description: "S3 buckets for storing registry snapshots and proofs",
    variables: [
      {
        name: "REGISTRY_S3_BUCKET",
        description: "S3 bucket for registry storage",
        required: false,
        type: "string",
        example: "veris-registry-dev",
        validation: "Valid S3 bucket name",
        environment: "server",
        security: "public",
        category: "S3 Registry Configuration",
        notes: "Create this bucket in your AWS account",
      },
      {
        name: "REGISTRY_S3_STAGING_BUCKET",
        description: "S3 bucket for staging registry",
        required: false,
        type: "string",
        example: "veris-registry-staging",
        validation: "Valid S3 bucket name",
        environment: "server",
        security: "public",
        category: "S3 Registry Configuration",
        notes: "Use this for staging environment",
      },
      {
        name: "REGISTRY_S3_PRODUCTION_BUCKET",
        description: "S3 bucket for production registry",
        required: false,
        type: "string",
        example: "veris-registry-prod",
        validation: "Valid S3 bucket name",
        environment: "server",
        security: "public",
        category: "S3 Registry Configuration",
        notes: "Use this for production environment",
      },
      {
        name: "REGISTRY_S3_PREFIX",
        description: "S3 key prefix for registry objects",
        required: false,
        type: "string",
        example: "registry/",
        validation: "Valid S3 key prefix",
        environment: "server",
        security: "public",
        category: "S3 Registry Configuration",
        defaultValue: "registry/",
        notes: "Use this to organize objects in your S3 bucket",
      },
    ],
  },
  {
    name: "Arweave Configuration",
    description: "Arweave network configuration for publishing proofs",
    variables: [
      {
        name: "ARWEAVE_GATEWAY_URL",
        description: "Arweave gateway URL for publishing",
        required: false,
        type: "string (URL)",
        example: "https://arweave.net",
        validation: "Valid HTTPS URL",
        environment: "server",
        security: "public",
        category: "Arweave Configuration",
        defaultValue: "https://arweave.net",
        notes: "Use the official Arweave gateway",
      },
      {
        name: "ARWEAVE_WALLET_JSON",
        description: "Arweave wallet JSON for publishing",
        required: false,
        type: "string (JSON)",
        example: '{"kty":"RSA","n":"..."}',
        validation: "Valid JSON string",
        environment: "server",
        security: "secret",
        category: "Arweave Configuration",
        conflicts: ["ARWEAVE_WALLET"],
        notes: "Use this for JSON wallet format",
      },
      {
        name: "ARWEAVE_WALLET",
        description: "Arweave wallet for publishing",
        required: false,
        type: "string",
        example: "your-arweave-wallet-here",
        validation: "Valid Arweave wallet",
        environment: "server",
        security: "secret",
        category: "Arweave Configuration",
        conflicts: ["ARWEAVE_WALLET_JSON"],
        notes: "Use this for wallet string format",
      },
    ],
  },
  {
    name: "Monitoring & Observability",
    description: "Monitoring and error tracking configuration",
    variables: [
      {
        name: "SENTRY_DSN",
        description: "Sentry DSN for error tracking and performance monitoring",
        required: false,
        type: "string (URL)",
        example: "https://your-sentry-dsn@sentry.io/project-id",
        validation: "Valid Sentry DSN URL",
        environment: "server",
        security: "sensitive",
        category: "Monitoring & Observability",
        notes: "Get this from your Sentry project settings",
      },
    ],
  },
  {
    name: "Site Configuration",
    description: "Site and API configuration",
    variables: [
      {
        name: "NEXT_PUBLIC_SITE_URL",
        description: "Base URL of the site",
        required: false,
        type: "string (URL)",
        example: "http://localhost:3000",
        validation: "Valid URL",
        environment: "client",
        security: "public",
        category: "Site Configuration",
        notes: "Used for redirects and webhook URLs",
      },
      {
        name: "NEXT_PUBLIC_API_BASE_URL",
        description: "Base URL for API calls",
        required: false,
        type: "string (URL)",
        example: "https://api.verisplatform.com",
        validation: "Valid URL",
        environment: "client",
        security: "public",
        category: "Site Configuration",
        notes: "Use this for custom API endpoints",
      },
      {
        name: "NEXT_PUBLIC_VERIS_API_KEY",
        description: "API key for Veris services",
        required: false,
        type: "string",
        example: "your-api-key-here",
        validation: "Non-empty string",
        environment: "client",
        security: "sensitive",
        category: "Site Configuration",
        notes: "Use this for API authentication",
      },
    ],
  },
  {
    name: "Feature Flags",
    description: "Feature flags for enabling/disabling functionality",
    variables: [
      {
        name: "ENABLE_MIRRORS",
        description: "Enable mirror functionality for registry replication",
        required: false,
        type: "boolean",
        example: "true",
        validation: "true or false",
        environment: "server",
        security: "public",
        category: "Feature Flags",
        defaultValue: "false",
        notes: "Enable this for registry mirroring",
      },
      {
        name: "ENABLE_SNAPSHOT_AUTOMATION",
        description: "Enable automated registry snapshots",
        required: false,
        type: "boolean",
        example: "true",
        validation: "true or false",
        environment: "server",
        security: "public",
        category: "Feature Flags",
        defaultValue: "false",
        notes: "Enable this for automatic snapshots",
      },
      {
        name: "ENABLE_NONESSENTIAL_CRON",
        description: "Enable non-essential cron jobs",
        required: false,
        type: "boolean",
        example: "false",
        validation: "true or false",
        environment: "server",
        security: "public",
        category: "Feature Flags",
        defaultValue: "false",
        notes: "Enable this for additional cron jobs",
      },
      {
        name: "ENABLE_BILLING",
        description: "Enable billing functionality",
        required: false,
        type: "boolean",
        example: "true",
        validation: "true or false",
        environment: "server",
        security: "public",
        category: "Feature Flags",
        defaultValue: "true",
        notes: "Enable this for payment processing",
      },
      {
        name: "ENABLE_TELEMETRY",
        description: "Enable telemetry collection",
        required: false,
        type: "boolean",
        example: "true",
        validation: "true or false",
        environment: "server",
        security: "public",
        category: "Feature Flags",
        defaultValue: "true",
        notes: "Enable this for usage analytics",
      },
    ],
  },
  {
    name: "Development & Deployment",
    description: "Development and deployment configuration",
    variables: [
      {
        name: "NODE_ENV",
        description: "Node.js environment",
        required: false,
        type: "enum",
        example: "development",
        validation: "development, test, or production",
        environment: "both",
        security: "public",
        category: "Development & Deployment",
        defaultValue: "development",
        notes: "Set by the runtime environment",
      },
      {
        name: "NEXT_PHASE",
        description: "Next.js build phase",
        required: false,
        type: "string",
        example: "phase-development-server",
        validation: "Valid Next.js phase",
        environment: "server",
        security: "public",
        category: "Development & Deployment",
        notes: "Set by Next.js during build",
      },
      {
        name: "VERCEL_GIT_COMMIT_SHA",
        description: "Vercel git commit SHA",
        required: false,
        type: "string",
        example: "abc123def456",
        validation: "Valid git SHA",
        environment: "server",
        security: "public",
        category: "Development & Deployment",
        notes: "Set by Vercel during deployment",
      },
      {
        name: "VERCEL_GIT_COMMIT_REF",
        description: "Vercel git commit reference",
        required: false,
        type: "string",
        example: "main",
        validation: "Valid git reference",
        environment: "server",
        security: "public",
        category: "Development & Deployment",
        notes: "Set by Vercel during deployment",
      },
      {
        name: "VERCEL_DEPLOYMENT_ID",
        description: "Vercel deployment ID",
        required: false,
        type: "string",
        example: "deployment-123",
        validation: "Valid deployment ID",
        environment: "server",
        security: "public",
        category: "Development & Deployment",
        notes: "Set by Vercel during deployment",
      },
    ],
  },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all environment variables by category
 */
export function getEnvironmentVariablesByCategory(): EnvironmentCategory[] {
  return environmentCategories;
}

/**
 * Get all environment variables as a flat array
 */
export function getAllEnvironmentVariables(): EnvironmentVariable[] {
  return environmentCategories.flatMap((category) => category.variables);
}

/**
 * Get required environment variables
 */
export function getRequiredEnvironmentVariables(): EnvironmentVariable[] {
  return getAllEnvironmentVariables().filter((variable) => variable.required);
}

/**
 * Get optional environment variables
 */
export function getOptionalEnvironmentVariables(): EnvironmentVariable[] {
  return getAllEnvironmentVariables().filter((variable) => !variable.required);
}

/**
 * Get client-side environment variables
 */
export function getClientEnvironmentVariables(): EnvironmentVariable[] {
  return getAllEnvironmentVariables().filter(
    (variable) => variable.environment === "client" || variable.environment === "both",
  );
}

/**
 * Get server-side environment variables
 */
export function getServerEnvironmentVariables(): EnvironmentVariable[] {
  return getAllEnvironmentVariables().filter(
    (variable) => variable.environment === "server" || variable.environment === "both",
  );
}

/**
 * Get environment variables by security level
 */
export function getEnvironmentVariablesBySecurity(
  security: "public" | "secret" | "sensitive",
): EnvironmentVariable[] {
  return getAllEnvironmentVariables().filter((variable) => variable.security === security);
}

/**
 * Get environment variable by name
 */
export function getEnvironmentVariable(name: string): EnvironmentVariable | undefined {
  return getAllEnvironmentVariables().find((variable) => variable.name === name);
}

/**
 * Validate environment variable dependencies
 */
export function validateEnvironmentDependencies(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const variables = getAllEnvironmentVariables();

  for (const variable of variables) {
    if (variable.dependencies) {
      for (const dependency of variable.dependencies) {
        const depVar = getEnvironmentVariable(dependency);
        if (!depVar) {
          errors.push(`Variable ${variable.name} depends on ${dependency} which is not defined`);
        }
      }
    }

    if (variable.conflicts) {
      for (const conflict of variable.conflicts) {
        const conflictVar = getEnvironmentVariable(conflict);
        if (conflictVar) {
          errors.push(`Variable ${variable.name} conflicts with ${conflict}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate environment variable documentation
 */
export function generateEnvironmentDocumentation(): string {
  let documentation = "# Environment Variables Documentation\n\n";
  documentation +=
    "This document provides comprehensive documentation for all environment variables used by the Veris platform.\n\n";

  for (const category of environmentCategories) {
    documentation += `## ${category.name}\n\n`;
    documentation += `${category.description}\n\n`;

    for (const variable of category.variables) {
      documentation += `### ${variable.name}\n\n`;
      documentation += `- **Description**: ${variable.description}\n`;
      documentation += `- **Required**: ${variable.required ? "Yes" : "No"}\n`;
      documentation += `- **Type**: ${variable.type}\n`;
      documentation += `- **Environment**: ${variable.environment}\n`;
      documentation += `- **Security**: ${variable.security}\n`;
      documentation += `- **Example**: \`${variable.example}\`\n`;
      documentation += `- **Validation**: ${variable.validation}\n`;

      if (variable.defaultValue) {
        documentation += `- **Default**: \`${variable.defaultValue}\`\n`;
      }

      if (variable.dependencies) {
        documentation += `- **Dependencies**: ${variable.dependencies.join(", ")}\n`;
      }

      if (variable.conflicts) {
        documentation += `- **Conflicts**: ${variable.conflicts.join(", ")}\n`;
      }

      if (variable.notes) {
        documentation += `- **Notes**: ${variable.notes}\n`;
      }

      documentation += "\n";
    }
  }

  return documentation;
}

/**
 * Generate environment variable checklist
 */
export function generateEnvironmentChecklist(): string {
  let checklist = "# Environment Setup Checklist\n\n";

  const requiredVars = getRequiredEnvironmentVariables();
  const optionalVars = getOptionalEnvironmentVariables();

  checklist += "## Required Variables\n\n";
  requiredVars.forEach((variable, index) => {
    checklist += `${index + 1}. [ ] ${variable.name} - ${variable.description}\n`;
  });

  checklist += "\n## Optional Variables\n\n";
  optionalVars.forEach((variable, index) => {
    checklist += `${index + 1}. [ ] ${variable.name} - ${variable.description}\n`;
  });

  checklist += "\n## Security Checklist\n\n";
  checklist += "- [ ] All secrets are stored in environment variables (not in code)\n";
  checklist += "- [ ] Client-side variables are prefixed with NEXT_PUBLIC_\n";
  checklist += "- [ ] Server-side secrets are not exposed to the browser\n";
  checklist += "- [ ] Environment files are in .gitignore\n";
  checklist += "- [ ] Production secrets are stored in secure secret management\n";

  return checklist;
}
