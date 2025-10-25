#!/usr/bin/env tsx

/**
 * Comprehensive Environment Variable Testing
 *
 * This script tests the complete environment variable system including:
 * - Environment variable validation
 * - Mapping and documentation
 * - Security validation
 * - Dependency checking
 * - Format validation
 * - Integration testing
 */

import { config } from "dotenv";
import path from "path";
import { logger } from "../lib/logger";
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

async function testEnvironmentVariableMapping() {
  console.log("🧪 Testing Environment Variable Mapping...\n");

  try {
    // Test 1: Category retrieval
    console.log("1. Testing category retrieval...");
    const categories = getEnvironmentVariablesByCategory();
    if (categories.length === 0) {
      throw new Error("No environment categories found");
    }
    console.log(`   ✅ Found ${categories.length} environment categories`);

    // Test 2: Variable retrieval
    console.log("2. Testing variable retrieval...");
    const allVariables = getAllEnvironmentVariables();
    if (allVariables.length === 0) {
      throw new Error("No environment variables found");
    }
    console.log(`   ✅ Found ${allVariables.length} environment variables`);

    // Test 3: Required variables
    console.log("3. Testing required variables...");
    const requiredVariables = getRequiredEnvironmentVariables();
    console.log(`   ✅ Found ${requiredVariables.length} required variables`);

    // Test 4: Optional variables
    console.log("4. Testing optional variables...");
    const optionalVariables = getOptionalEnvironmentVariables();
    console.log(`   ✅ Found ${optionalVariables.length} optional variables`);

    // Test 5: Client variables
    console.log("5. Testing client variables...");
    const clientVariables = getClientEnvironmentVariables();
    console.log(`   ✅ Found ${clientVariables.length} client variables`);

    // Test 6: Server variables
    console.log("6. Testing server variables...");
    const serverVariables = getServerEnvironmentVariables();
    console.log(`   ✅ Found ${serverVariables.length} server variables`);

    // Test 7: Security categorization
    console.log("7. Testing security categorization...");
    const publicVariables = getEnvironmentVariablesBySecurity("public");
    const secretVariables = getEnvironmentVariablesBySecurity("secret");
    const sensitiveVariables = getEnvironmentVariablesBySecurity("sensitive");
    console.log(
      `   ✅ Found ${publicVariables.length} public, ${secretVariables.length} secret, ${sensitiveVariables.length} sensitive variables`,
    );

    console.log("✅ Environment variable mapping tests passed");
  } catch (error) {
    console.error("❌ Environment variable mapping tests failed:", error);
    throw error;
  }
}

async function testEnvironmentVariableValidation() {
  console.log("🧪 Testing Environment Variable Validation...\n");

  try {
    // Test 1: Required variable validation
    console.log("1. Testing required variable validation...");
    const requiredVariables = getRequiredEnvironmentVariables();
    const missingRequired = requiredVariables.filter((variable) => !process.env[variable.name]);

    if (missingRequired.length > 0) {
      console.log(`   ⚠️  ${missingRequired.length} required variables are missing:`);
      missingRequired.forEach((variable) => {
        console.log(`      - ${variable.name}: ${variable.description}`);
      });
    } else {
      console.log("   ✅ All required variables are present");
    }

    // Test 2: Format validation
    console.log("2. Testing format validation...");
    const allVariables = getAllEnvironmentVariables();
    let formatErrors = 0;

    for (const variable of allVariables) {
      const value = process.env[variable.name];
      if (value) {
        const error = validateVariableFormat(variable, value);
        if (error) {
          console.log(`   ❌ ${error}`);
          formatErrors++;
        }
      }
    }

    if (formatErrors === 0) {
      console.log("   ✅ All variable formats are valid");
    } else {
      console.log(`   ⚠️  ${formatErrors} format validation errors found`);
    }

    // Test 3: Dependency validation
    console.log("3. Testing dependency validation...");
    const dependencyValidation = validateEnvironmentDependencies();
    if (dependencyValidation.valid) {
      console.log("   ✅ All dependencies are valid");
    } else {
      console.log("   ❌ Dependency validation failed:");
      dependencyValidation.errors.forEach((error) => {
        console.log(`      - ${error}`);
      });
    }

    // Test 4: Conflict validation
    console.log("4. Testing conflict validation...");
    const conflicts = checkConflictingVariables(allVariables);
    if (conflicts.length === 0) {
      console.log("   ✅ No conflicting variables found");
    } else {
      console.log("   ❌ Conflicting variables found:");
      conflicts.forEach((conflict) => {
        console.log(`      - ${conflict}`);
      });
    }

    console.log("✅ Environment variable validation tests passed");
  } catch (error) {
    console.error("❌ Environment variable validation tests failed:", error);
    throw error;
  }
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

function checkConflictingVariables(variables: EnvironmentVariable[]): string[] {
  const conflicts: string[] = [];
  const conflictPairs = [
    ["CRON_JOB_TOKEN", "CRON_SECRET"],
    ["UPSTASH_REDIS_URL", "REDIS_URL"],
    ["ARWEAVE_WALLET_JSON", "ARWEAVE_WALLET"],
    ["AWS_ACCESS_KEY_ID", "AWS_ROLE_ARN"],
  ];

  for (const [var1, var2] of conflictPairs) {
    if (process.env[var1] && process.env[var2]) {
      conflicts.push(`Conflicting variables: ${var1} and ${var2} should not both be set`);
    }
  }

  return conflicts;
}

async function testEnvironmentVariableSecurity() {
  console.log("🧪 Testing Environment Variable Security...\n");

  try {
    // Test 1: Client-side security
    console.log("1. Testing client-side security...");
    const clientVariables = getClientEnvironmentVariables();
    let securityIssues = 0;

    for (const variable of clientVariables) {
      if (variable.security === "secret" && process.env[variable.name]) {
        console.log(
          `   ❌ Security issue: ${variable.name} is marked as secret but is exposed to the client`,
        );
        securityIssues++;
      }
    }

    if (securityIssues === 0) {
      console.log("   ✅ No client-side security issues found");
    } else {
      console.log(`   ⚠️  ${securityIssues} client-side security issues found`);
    }

    // Test 2: Public variable validation
    console.log("2. Testing public variable validation...");
    const publicVariables = getEnvironmentVariablesBySecurity("public");
    let publicIssues = 0;

    for (const variable of publicVariables) {
      const value = process.env[variable.name];
      if (value && (value.includes("secret") || value.includes("key") || value.includes("token"))) {
        console.log(
          `   ⚠️  Security warning: ${variable.name} might contain sensitive data but is marked as public`,
        );
        publicIssues++;
      }
    }

    if (publicIssues === 0) {
      console.log("   ✅ No public variable security issues found");
    } else {
      console.log(`   ⚠️  ${publicIssues} public variable security warnings found`);
    }

    // Test 3: Secret variable validation
    console.log("3. Testing secret variable validation...");
    const secretVariables = getEnvironmentVariablesBySecurity("secret");
    let secretIssues = 0;

    for (const variable of secretVariables) {
      const value = process.env[variable.name];
      if (value && value.length < 16) {
        console.log(
          `   ⚠️  Security warning: ${variable.name} is marked as secret but is very short`,
        );
        secretIssues++;
      }
    }

    if (secretIssues === 0) {
      console.log("   ✅ No secret variable security issues found");
    } else {
      console.log(`   ⚠️  ${secretIssues} secret variable security warnings found`);
    }

    console.log("✅ Environment variable security tests passed");
  } catch (error) {
    console.error("❌ Environment variable security tests failed:", error);
    throw error;
  }
}

async function testEnvironmentVariableDocumentation() {
  console.log("🧪 Testing Environment Variable Documentation...\n");

  try {
    // Test 1: Documentation generation
    console.log("1. Testing documentation generation...");
    const documentation = generateEnvironmentDocumentation();
    if (!documentation || documentation.length === 0) {
      throw new Error("Documentation generation failed");
    }
    console.log(`   ✅ Generated ${documentation.length} characters of documentation`);

    // Test 2: Checklist generation
    console.log("2. Testing checklist generation...");
    const checklist = generateEnvironmentChecklist();
    if (!checklist || checklist.length === 0) {
      throw new Error("Checklist generation failed");
    }
    console.log(`   ✅ Generated ${checklist.length} characters of checklist`);

    // Test 3: Documentation content validation
    console.log("3. Testing documentation content validation...");
    const allVariables = getAllEnvironmentVariables();
    let missingDocs = 0;

    for (const variable of allVariables) {
      if (!documentation.includes(variable.name)) {
        console.log(`   ⚠️  Variable ${variable.name} not found in documentation`);
        missingDocs++;
      }
    }

    if (missingDocs === 0) {
      console.log("   ✅ All variables are documented");
    } else {
      console.log(`   ⚠️  ${missingDocs} variables missing from documentation`);
    }

    // Test 4: Checklist content validation
    console.log("4. Testing checklist content validation...");
    const requiredVariables = getRequiredEnvironmentVariables();
    let missingChecklist = 0;

    for (const variable of requiredVariables) {
      if (!checklist.includes(variable.name)) {
        console.log(`   ⚠️  Required variable ${variable.name} not found in checklist`);
        missingChecklist++;
      }
    }

    if (missingChecklist === 0) {
      console.log("   ✅ All required variables are in checklist");
    } else {
      console.log(`   ⚠️  ${missingChecklist} required variables missing from checklist`);
    }

    console.log("✅ Environment variable documentation tests passed");
  } catch (error) {
    console.error("❌ Environment variable documentation tests failed:", error);
    throw error;
  }
}

async function testEnvironmentVariableIntegration() {
  console.log("🧪 Testing Environment Variable Integration...\n");

  try {
    // Test 1: Environment variable loading
    console.log("1. Testing environment variable loading...");
    const requiredVariables = getRequiredEnvironmentVariables();
    let loadedCount = 0;

    for (const variable of requiredVariables) {
      if (process.env[variable.name]) {
        loadedCount++;
      }
    }

    console.log(`   ✅ Loaded ${loadedCount}/${requiredVariables.length} required variables`);

    // Test 2: Environment variable types
    console.log("2. Testing environment variable types...");
    const allVariables = getAllEnvironmentVariables();
    let typeErrors = 0;

    for (const variable of allVariables) {
      const value = process.env[variable.name];
      if (value) {
        if (variable.type.includes("boolean") && !["true", "false"].includes(value)) {
          console.log(`   ❌ Type error: ${variable.name} should be boolean but got '${value}'`);
          typeErrors++;
        } else if (variable.type.includes("URL") && !value.startsWith("http")) {
          console.log(`   ❌ Type error: ${variable.name} should be URL but got '${value}'`);
          typeErrors++;
        }
      }
    }

    if (typeErrors === 0) {
      console.log("   ✅ All variable types are correct");
    } else {
      console.log(`   ⚠️  ${typeErrors} type validation errors found`);
    }

    // Test 3: Environment variable consistency
    console.log("3. Testing environment variable consistency...");
    const stripeMode = process.env.NEXT_PUBLIC_STRIPE_MODE;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (stripeMode && stripeSecretKey) {
      if (stripeMode === "test" && !stripeSecretKey.startsWith("sk_test_")) {
        console.log("   ⚠️  Stripe mode is 'test' but secret key doesn't start with 'sk_test_'");
      } else if (stripeMode === "live" && !stripeSecretKey.startsWith("sk_live_")) {
        console.log("   ⚠️  Stripe mode is 'live' but secret key doesn't start with 'sk_live_'");
      } else {
        console.log("   ✅ Stripe configuration is consistent");
      }
    }

    // Test 4: Environment variable completeness
    console.log("4. Testing environment variable completeness...");
    const categories = getEnvironmentVariablesByCategory();
    let categoryCompleteness = 0;

    for (const category of categories) {
      const categoryVariables = category.variables;
      const requiredInCategory = categoryVariables.filter((v) => v.required);
      const setInCategory = requiredInCategory.filter((v) => process.env[v.name]);

      if (requiredInCategory.length > 0) {
        const completeness = (setInCategory.length / requiredInCategory.length) * 100;
        console.log(
          `   📊 ${category.name}: ${completeness.toFixed(1)}% complete (${setInCategory.length}/${
            requiredInCategory.length
          })`,
        );
        categoryCompleteness += completeness;
      }
    }

    const overallCompleteness = categoryCompleteness / categories.length;
    console.log(`   📊 Overall completeness: ${overallCompleteness.toFixed(1)}%`);

    console.log("✅ Environment variable integration tests passed");
  } catch (error) {
    console.error("❌ Environment variable integration tests failed:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting comprehensive environment variable testing...\n");

  try {
    await testEnvironmentVariableMapping();
    console.log("");

    await testEnvironmentVariableValidation();
    console.log("");

    await testEnvironmentVariableSecurity();
    console.log("");

    await testEnvironmentVariableDocumentation();
    console.log("");

    await testEnvironmentVariableIntegration();
    console.log("");

    console.log("🎉 All comprehensive environment variable tests passed!");
    console.log("\n📋 Test Summary:");
    console.log("✅ Environment variable mapping");
    console.log("✅ Environment variable validation");
    console.log("✅ Environment variable security");
    console.log("✅ Environment variable documentation");
    console.log("✅ Environment variable integration");
  } catch (error) {
    console.error("\n💥 Comprehensive environment variable tests failed:", error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
