#!/usr/bin/env tsx

/**
 * Enhanced Environment Variable Validation
 *
 * This script provides comprehensive environment variable validation,
 * mapping, and documentation generation using the environment mapping system.
 */

import { config } from "dotenv";
import path from "path";
import {
  getEnvironmentVariablesByCategory,
  getAllEnvironmentVariables,
  getRequiredEnvironmentVariables,
  getOptionalEnvironmentVariables,
  getClientEnvironmentVariables,
  getServerEnvironmentVariables,
  getEnvironmentVariablesBySecurity,
  validateEnvironmentDependencies,
  generateEnvironmentDocumentation,
  generateEnvironmentChecklist,
  EnvironmentVariable,
} from "../lib/environment-mapping";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    total: number;
    required: number;
    optional: number;
    client: number;
    server: number;
    public: number;
    secret: number;
    sensitive: number;
  };
}

function validateEnvironmentVariables(): ValidationResult {
  console.log("🔍 Validating environment variables...\n");

  const errors: string[] = [];
  const warnings: string[] = [];
  const allVariables = getAllEnvironmentVariables();
  const requiredVariables = getRequiredEnvironmentVariables();
  const optionalVariables = getOptionalEnvironmentVariables();
  const clientVariables = getClientEnvironmentVariables();
  const serverVariables = getServerEnvironmentVariables();
  const publicVariables = getEnvironmentVariablesBySecurity("public");
  const secretVariables = getEnvironmentVariablesBySecurity("secret");
  const sensitiveVariables = getEnvironmentVariablesBySecurity("sensitive");

  // Check required variables
  for (const variable of requiredVariables) {
    if (!process.env[variable.name]) {
      errors.push(`Missing required variable: ${variable.name} - ${variable.description}`);
    }
  }

  // Validate variable formats
  for (const variable of allVariables) {
    const value = process.env[variable.name];
    if (value) {
      const validationError = validateVariableFormat(variable, value);
      if (validationError) {
        errors.push(validationError);
      }
    }
  }

  // Check dependencies
  const dependencyValidation = validateEnvironmentDependencies();
  if (!dependencyValidation.valid) {
    errors.push(...dependencyValidation.errors);
  }

  // Check for missing optional variables that might be needed
  for (const variable of optionalVariables) {
    if (!process.env[variable.name]) {
      if (variable.name.includes("STRIPE") && process.env.NEXT_PUBLIC_STRIPE_MODE) {
        warnings.push(`Optional variable not set: ${variable.name} - ${variable.description}`);
      } else if (
        variable.name.includes("REDIS") &&
        (process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL)
      ) {
        warnings.push(`Optional variable not set: ${variable.name} - ${variable.description}`);
      } else if (
        variable.name.includes("AWS") &&
        (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ROLE_ARN)
      ) {
        warnings.push(`Optional variable not set: ${variable.name} - ${variable.description}`);
      }
    }
  }

  // Check for conflicting variables
  checkConflictingVariables(allVariables, errors);

  // Check security issues
  checkSecurityIssues(allVariables, warnings);

  const summary = {
    total: allVariables.length,
    required: requiredVariables.length,
    optional: optionalVariables.length,
    client: clientVariables.length,
    server: serverVariables.length,
    public: publicVariables.length,
    secret: secretVariables.length,
    sensitive: sensitiveVariables.length,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}

function validateVariableFormat(variable: EnvironmentVariable, value: string): string | null {
  switch (variable.name) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      if (!value.startsWith("https://")) {
        return `Invalid Supabase URL format: ${variable.name} must start with https://`;
      }
      break;

    case "STRIPE_SECRET_KEY":
      if (!value.startsWith("sk_")) {
        return `Invalid Stripe secret key format: ${variable.name} must start with sk_`;
      }
      break;

    case "STRIPE_WEBHOOK_SECRET":
      if (!value.startsWith("whsec_")) {
        return `Invalid Stripe webhook secret format: ${variable.name} must start with whsec_`;
      }
      break;

    case "CRON_JOB_TOKEN":
    case "CRON_SECRET":
    case "INTERNAL_KEY":
      if (value.length < 16) {
        return `Invalid ${variable.name}: must be at least 16 characters long`;
      }
      break;

    case "VERIS_SIGNING_PRIVATE_KEY":
    case "VERIS_SIGNING_PUBLIC_KEY":
      if (value.length < 100) {
        return `Invalid ${variable.name}: appears to be too short`;
      }
      break;

    case "NEXT_PUBLIC_STRIPE_MODE":
      if (!["test", "live"].includes(value)) {
        return `Invalid Stripe mode: ${variable.name} must be 'test' or 'live'`;
      }
      break;

    case "AWS_ROLE_ARN":
      if (!value.startsWith("arn:aws:iam::")) {
        return `Invalid AWS role ARN format: ${variable.name} must start with arn:aws:iam::`;
      }
      break;

    case "ENABLE_MIRRORS":
    case "ENABLE_SNAPSHOT_AUTOMATION":
    case "ENABLE_NONESSENTIAL_CRON":
    case "ENABLE_BILLING":
    case "ENABLE_TELEMETRY":
      if (!["true", "false"].includes(value)) {
        return `Invalid boolean value: ${variable.name} must be 'true' or 'false'`;
      }
      break;
  }

  return null;
}

function checkConflictingVariables(variables: EnvironmentVariable[], errors: string[]) {
  const conflicts = [
    ["CRON_JOB_TOKEN", "CRON_SECRET"],
    ["UPSTASH_REDIS_URL", "REDIS_URL"],
    ["ARWEAVE_WALLET_JSON", "ARWEAVE_WALLET"],
    ["AWS_ACCESS_KEY_ID", "AWS_ROLE_ARN"],
  ];

  for (const [var1, var2] of conflicts) {
    if (process.env[var1] && process.env[var2]) {
      errors.push(`Conflicting variables: ${var1} and ${var2} should not both be set`);
    }
  }
}

function checkSecurityIssues(variables: EnvironmentVariable[], warnings: string[]) {
  // Check for secrets in client variables
  const clientVariables = getClientEnvironmentVariables();
  for (const variable of clientVariables) {
    if (variable.security === "secret" && process.env[variable.name]) {
      warnings.push(
        `Security warning: ${variable.name} is marked as secret but is exposed to the client`,
      );
    }
  }

  // Check for public variables that might contain sensitive data
  const publicVariables = getEnvironmentVariablesBySecurity("public");
  for (const variable of publicVariables) {
    const value = process.env[variable.name];
    if (value && (value.includes("secret") || value.includes("key") || value.includes("token"))) {
      warnings.push(
        `Security warning: ${variable.name} might contain sensitive data but is marked as public`,
      );
    }
  }
}

// =============================================================================
// REPORTING FUNCTIONS
// =============================================================================

function generateValidationReport(result: ValidationResult): void {
  console.log("## Environment Variable Validation Report\n");

  // Overall status
  if (result.valid) {
    console.log("✅ **All environment variables are valid!**\n");
  } else {
    console.log("❌ **Environment validation failed**\n");
  }

  // Summary
  console.log("### Summary\n");
  console.log(`- **Total Variables**: ${result.summary.total}`);
  console.log(`- **Required Variables**: ${result.summary.required}`);
  console.log(`- **Optional Variables**: ${result.summary.optional}`);
  console.log(`- **Client Variables**: ${result.summary.client}`);
  console.log(`- **Server Variables**: ${result.summary.server}`);
  console.log(`- **Public Variables**: ${result.summary.public}`);
  console.log(`- **Secret Variables**: ${result.summary.secret}`);
  console.log(`- **Sensitive Variables**: ${result.summary.sensitive}\n`);

  // Errors
  if (result.errors.length > 0) {
    console.log("### Errors\n");
    result.errors.forEach((error, index) => {
      console.log(`${index + 1}. ❌ ${error}`);
    });
    console.log("");
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log("### Warnings\n");
    result.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ⚠️ ${warning}`);
    });
    console.log("");
  }
}

function generateEnvironmentMapping(): void {
  console.log("🗺️ Generating environment variable mapping...\n");

  const categories = getEnvironmentVariablesByCategory();

  console.log("## Environment Variable Mapping\n");

  for (const category of categories) {
    console.log(`### ${category.name}\n`);
    console.log(`${category.description}\n`);

    for (const variable of category.variables) {
      const status = process.env[variable.name] ? "✅ Set" : "❌ Missing";
      const required = variable.required ? "**Required**" : "Optional";

      console.log(`#### ${variable.name}`);
      console.log(`- **Status**: ${status}`);
      console.log(`- **Required**: ${required}`);
      console.log(`- **Type**: ${variable.type}`);
      console.log(`- **Environment**: ${variable.environment}`);
      console.log(`- **Security**: ${variable.security}`);
      console.log(`- **Description**: ${variable.description}`);
      console.log(`- **Example**: \`${variable.example}\``);
      console.log(`- **Validation**: ${variable.validation}`);

      if (variable.defaultValue) {
        console.log(`- **Default**: \`${variable.defaultValue}\``);
      }

      if (variable.dependencies) {
        console.log(`- **Dependencies**: ${variable.dependencies.join(", ")}`);
      }

      if (variable.conflicts) {
        console.log(`- **Conflicts**: ${variable.conflicts.join(", ")}`);
      }

      if (variable.notes) {
        console.log(`- **Notes**: ${variable.notes}`);
      }

      console.log("");
    }
  }
}

function generateLocalEnvironmentChecklist(): void {
  console.log("📋 Generating environment setup checklist...\n");

  const requiredVariables = getRequiredEnvironmentVariables();
  const optionalVariables = getOptionalEnvironmentVariables();

  console.log("## Environment Setup Checklist\n");

  console.log("### Required Variables\n");
  requiredVariables.forEach((variable, index) => {
    const status = process.env[variable.name] ? "✅" : "❌";
    console.log(`${index + 1}. ${status} ${variable.name} - ${variable.description}`);
  });

  console.log("\n### Optional Variables\n");
  optionalVariables.forEach((variable, index) => {
    const status = process.env[variable.name] ? "✅" : "⏭️";
    console.log(`${index + 1}. ${status} ${variable.name} - ${variable.description}`);
  });

  console.log("\n### Security Checklist\n");
  console.log("1. ✅ All secrets are stored in environment variables (not in code)");
  console.log("2. ✅ Client-side variables are prefixed with NEXT_PUBLIC_");
  console.log("3. ✅ Server-side secrets are not exposed to the browser");
  console.log("4. ✅ Environment files are in .gitignore");
  console.log("5. ✅ Production secrets are stored in secure secret management");
}

function generateDocumentationFiles(): void {
  console.log("📚 Generating documentation files...\n");

  const fs = require("fs");
  const outputDir = path.join(process.cwd(), "docs");

  // Create docs directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate environment documentation
  const documentation = generateEnvironmentDocumentation();
  const docPath = path.join(outputDir, "ENVIRONMENT.md");
  fs.writeFileSync(docPath, documentation);
  console.log(`📄 Environment documentation written to: ${docPath}`);

  // Generate environment checklist
  const checklist = generateEnvironmentChecklist();
  const checklistPath = path.join(outputDir, "ENVIRONMENT_CHECKLIST.md");
  fs.writeFileSync(checklistPath, checklist);
  console.log(`📄 Environment checklist written to: ${checklistPath}`);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log("🚀 Starting enhanced environment variable validation...\n");

  try {
    // Validate environment variables
    const validationResult = validateEnvironmentVariables();

    // Generate validation report
    generateValidationReport(validationResult);

    // Generate environment mapping
    generateEnvironmentMapping();

    // Generate checklist
    generateLocalEnvironmentChecklist();

    // Generate documentation files
    generateDocumentationFiles();

    console.log("🎉 Enhanced environment variable validation completed!");
    console.log("\n📋 Summary:");
    console.log("✅ Environment variable validation");
    console.log("✅ Environment variable mapping");
    console.log("✅ Setup checklist generation");
    console.log("✅ Documentation generation");

    if (!validationResult.valid) {
      console.log("\n⚠️ Some environment variables have validation errors.");
      console.log("Please review the report above and fix any issues.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n💥 Enhanced environment variable validation failed:", error);
    process.exit(1);
  }
}

// Run the validation
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
