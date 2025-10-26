#!/usr/bin/env tsx

/**
 * Simple Pilot Readiness Validation Script
 *
 * This script performs basic validation of the Veris platform
 * to ensure it's ready for pilot deployment.
 */

import { config } from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
}

class SimplePilotReadinessValidator {
  private results: ValidationResult[] = [];

  private addResult(success: boolean, message: string, details?: any) {
    this.results.push({ success, message, details });
  }

  /**
   * Test environment configuration
   */
  async testEnvironment(): Promise<void> {
    try {
      const requiredVars = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "VERIS_SIGNING_PRIVATE_KEY",
        "VERIS_SIGNING_PUBLIC_KEY",
        "CRON_JOB_TOKEN",
      ];

      const missingVars = requiredVars.filter((varName) => !process.env[varName]);

      if (missingVars.length === 0) {
        this.addResult(true, "Environment configuration complete");
      } else {
        this.addResult(false, `Missing environment variables: ${missingVars.join(", ")}`);
      }
    } catch (error) {
      this.addResult(
        false,
        `Environment test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Test file structure
   */
  async testFileStructure(): Promise<void> {
    try {
      const requiredFiles = [
        "src/lib/env.ts",
        "src/lib/db.ts",
        "src/lib/crypto-server.ts",
        "src/lib/crypto-client.ts",
        "src/lib/proof-schema.ts",
        "src/app/api/health/route.ts",
        "src/app/api/proof/create/route.ts",
        "src/app/api/proof/verify/route.ts",
        "../.github/workflows/ci.yml",
        "../.github/workflows/deploy-staging.yml",
        "../.github/workflows/deploy-production.yml",
      ];

      const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));

      if (missingFiles.length === 0) {
        this.addResult(true, "All required files present");
      } else {
        this.addResult(false, `Missing files: ${missingFiles.join(", ")}`);
      }
    } catch (error) {
      this.addResult(
        false,
        `File structure test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Test package.json scripts
   */
  async testPackageScripts(): Promise<void> {
    try {
      const packageJsonPath = "package.json";

      if (!fs.existsSync(packageJsonPath)) {
        this.addResult(false, "Package.json not found");
        return;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const requiredScripts = [
        "build",
        "lint",
        "typecheck",
        "test",
        "validate-env",
        "validate-services",
      ];

      const missingScripts = requiredScripts.filter((script) => !packageJson.scripts[script]);

      if (missingScripts.length === 0) {
        this.addResult(true, "All required scripts present");
      } else {
        this.addResult(false, `Missing scripts: ${missingScripts.join(", ")}`);
      }
    } catch (error) {
      this.addResult(
        false,
        `Package scripts test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Test GitHub workflows
   */
  async testGitHubWorkflows(): Promise<void> {
    try {
      const workflowDir = "../.github/workflows";

      if (!fs.existsSync(workflowDir)) {
        this.addResult(false, "GitHub workflows directory not found");
        return;
      }

      const requiredWorkflows = ["ci.yml", "deploy-staging.yml", "deploy-production.yml"];

      const missingWorkflows = requiredWorkflows.filter(
        (workflow) => !fs.existsSync(path.join(workflowDir, workflow)),
      );

      if (missingWorkflows.length === 0) {
        this.addResult(true, "All required workflows present");
      } else {
        this.addResult(false, `Missing workflows: ${missingWorkflows.join(", ")}`);
      }
    } catch (error) {
      this.addResult(
        false,
        `GitHub workflows test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Test API endpoints
   */
  async testApiEndpoints(): Promise<void> {
    try {
      const apiDir = "src/app/api";

      if (!fs.existsSync(apiDir)) {
        this.addResult(false, "API directory not found");
        return;
      }

      const requiredEndpoints = [
        "health/route.ts",
        "db-health/route.ts",
        "proof/create/route.ts",
        "proof/verify/route.ts",
        "proof/[id]/route.ts",
        "billing/history/route.ts",
        "billing/metrics/route.ts",
        "stripe/webhook/route.ts",
        "stripe/create-checkout/route.ts",
      ];

      const missingEndpoints = requiredEndpoints.filter(
        (endpoint) => !fs.existsSync(path.join(apiDir, endpoint)),
      );

      if (missingEndpoints.length === 0) {
        this.addResult(true, "All required API endpoints present");
      } else {
        this.addResult(false, `Missing API endpoints: ${missingEndpoints.join(", ")}`);
      }
    } catch (error) {
      this.addResult(
        false,
        `API endpoints test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log("🚀 Starting Pilot Readiness Validation...\n");

    await this.testEnvironment();
    await this.testFileStructure();
    await this.testPackageScripts();
    await this.testGitHubWorkflows();
    await this.testApiEndpoints();

    this.printResults();
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log("\n📊 Pilot Readiness Results:\n");

    const successCount = this.results.filter((r) => r.success).length;
    const failureCount = this.results.filter((r) => !r.success).length;

    this.results.forEach((result) => {
      const icon = result.success ? "✅" : "❌";
      console.log(`${icon} ${result.message}`);

      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log();
    });

    console.log(`📈 Summary: ${successCount} passed, ${failureCount} failed`);

    if (failureCount > 0) {
      console.log("\n❌ Pilot readiness validation failed!");
      console.log("Please fix the issues above before proceeding with pilot deployment.");
      process.exit(1);
    } else {
      console.log("\n✅ Pilot readiness validation passed!");
      console.log("The platform is ready for pilot deployment.");
    }
  }
}

// CLI execution
async function main() {
  const validator = new SimplePilotReadinessValidator();
  await validator.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { SimplePilotReadinessValidator };
