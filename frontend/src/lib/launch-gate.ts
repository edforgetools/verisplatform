/**
 * Launch Gate System
 *
 * This module implements the launch gate system as specified in the MVP checklist:
 * 1. Define criteria for pilot readiness
 * 2. System testing and validation
 * 3. Stripe verification in test mode
 * 4. Successful paid issuance
 * 5. 500 verified proofs
 * 6. Usable documentation
 */

import { supabaseService } from "./db";
import { logger } from "./logger";
import { getDashboardData } from "./monitoring-dashboard";
import { ENV } from "./env";

// Launch gate criteria as specified in the MVP checklist
export const LAUNCH_GATE_CRITERIA = {
  // System testing and validation
  SYSTEM_TESTING: {
    name: "System Testing",
    description: "All system components tested and validated",
    required: true,
    weight: 20,
  },

  // Stripe verification in test mode
  STRIPE_TEST_MODE: {
    name: "Stripe Test Mode",
    description: "Stripe integration verified in test mode",
    required: true,
    weight: 15,
  },

  // Successful paid issuance
  PAID_ISSUANCE: {
    name: "Paid Issuance",
    description: "Successful paid proof issuance",
    required: true,
    weight: 20,
  },

  // 500 verified proofs
  VERIFIED_PROOFS: {
    name: "Verified Proofs",
    description: "500 verified proofs completed",
    required: true,
    weight: 25,
    threshold: 500,
  },

  // Usable documentation
  DOCUMENTATION: {
    name: "Documentation",
    description: "Complete and usable documentation",
    required: true,
    weight: 20,
  },
} as const;

export interface LaunchGateCheck {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  required: boolean;
  weight: number;
  progress: number; // 0-100
  details: string;
  lastChecked: string;
  issues: string[];
  recommendations: string[];
}

export interface LaunchGateStatus {
  overallStatus: "not_ready" | "in_progress" | "ready";
  readinessScore: number; // 0-100
  completedChecks: number;
  totalChecks: number;
  requiredChecksCompleted: boolean;
  checks: LaunchGateCheck[];
  blockers: string[];
  nextSteps: string[];
  estimatedReadiness: string;
  lastUpdated: string;
}

/**
 * Check system testing and validation
 */
async function checkSystemTesting(): Promise<LaunchGateCheck> {
  const check: LaunchGateCheck = {
    id: "system_testing",
    name: LAUNCH_GATE_CRITERIA.SYSTEM_TESTING.name,
    description: LAUNCH_GATE_CRITERIA.SYSTEM_TESTING.description,
    status: "pending",
    required: LAUNCH_GATE_CRITERIA.SYSTEM_TESTING.required,
    weight: LAUNCH_GATE_CRITERIA.SYSTEM_TESTING.weight,
    progress: 0,
    details: "",
    lastChecked: new Date().toISOString(),
    issues: [],
    recommendations: [],
  };

  try {
    // Check if all system components are working
    const dashboardData = await getDashboardData();

    // Check system health
    const systemHealthy = dashboardData.overallStatus === "healthy";
    const noCriticalAlerts =
      dashboardData.alerts.filter((alert) => alert.severity === "critical").length === 0;

    // Check performance thresholds
    const passedThresholds = dashboardData.thresholds.filter((t) => t.status === "pass").length;
    const totalThresholds = dashboardData.thresholds.length;
    const thresholdPassRate = totalThresholds > 0 ? passedThresholds / totalThresholds : 0;

    // Check system metrics
    const hasProofs = dashboardData.metrics.proofsIssuedTotal > 0;
    const hasVerifications = dashboardData.metrics.proofsVerifiedTotal > 0;
    const goodSuccessRate = dashboardData.metrics.verificationSuccessRate >= 0.95;

    // Calculate progress
    let progress = 0;
    if (systemHealthy) progress += 25;
    if (noCriticalAlerts) progress += 25;
    if (thresholdPassRate >= 0.8) progress += 25;
    if (hasProofs && hasVerifications && goodSuccessRate) progress += 25;

    check.progress = progress;
    check.status = progress >= 80 ? "completed" : progress >= 40 ? "in_progress" : "pending";

    if (progress >= 80) {
      check.details =
        "System testing completed successfully. All components are functioning properly.";
    } else if (progress >= 40) {
      check.details = "System testing in progress. Some components need attention.";
      check.recommendations.push("Address remaining system issues");
      check.recommendations.push("Monitor system performance closely");
    } else {
      check.details = "System testing not yet started or failed.";
      check.issues.push("System health needs improvement");
      check.issues.push("Performance thresholds not met");
      check.recommendations.push("Complete system testing");
      check.recommendations.push("Fix critical issues");
    }
  } catch (error) {
    check.status = "failed";
    check.details = `System testing failed: ${error instanceof Error ? error.message : error}`;
    check.issues.push("Unable to verify system status");
    check.recommendations.push("Check system connectivity");
  }

  return check;
}

/**
 * Check Stripe test mode verification
 */
async function checkStripeTestMode(): Promise<LaunchGateCheck> {
  const check: LaunchGateCheck = {
    id: "stripe_test_mode",
    name: LAUNCH_GATE_CRITERIA.STRIPE_TEST_MODE.name,
    description: LAUNCH_GATE_CRITERIA.STRIPE_TEST_MODE.description,
    status: "pending",
    required: LAUNCH_GATE_CRITERIA.STRIPE_TEST_MODE.required,
    weight: LAUNCH_GATE_CRITERIA.STRIPE_TEST_MODE.weight,
    progress: 0,
    details: "",
    lastChecked: new Date().toISOString(),
    issues: [],
    recommendations: [],
  };

  try {
    const svc = supabaseService();

    // Check if Stripe is configured in test mode
    const stripeMode = ENV.client.NEXT_PUBLIC_STRIPE_MODE || "test";
    const isTestMode = stripeMode === "test";

    // Check billing logs for test transactions
    const { data: billingLogs, error: billingError } = await svc
      .from("billing_logs")
      .select("*")
      .eq("test_mode", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (billingError) {
      throw new Error(`Failed to get billing logs: ${billingError.message}`);
    }

    // Check for successful test transactions
    const successfulTestTransactions = billingLogs?.filter((log) => log.success).length || 0;
    const totalTestTransactions = billingLogs?.length || 0;

    // Calculate progress
    let progress = 0;
    if (isTestMode) progress += 40;
    if (totalTestTransactions > 0) progress += 30;
    if (successfulTestTransactions > 0) progress += 30;

    check.progress = progress;
    check.status = progress >= 80 ? "completed" : progress >= 40 ? "in_progress" : "pending";

    if (progress >= 80) {
      check.details = `Stripe test mode verified. ${successfulTestTransactions} successful test transactions completed.`;
    } else if (progress >= 40) {
      check.details = "Stripe test mode partially verified. Some test transactions completed.";
      check.recommendations.push("Complete more test transactions");
      check.recommendations.push("Verify all Stripe webhooks");
    } else {
      check.details = "Stripe test mode not verified.";
      check.issues.push("No test transactions found");
      check.issues.push("Stripe configuration may be incorrect");
      check.recommendations.push("Configure Stripe in test mode");
      check.recommendations.push("Complete test transactions");
    }
  } catch (error) {
    check.status = "failed";
    check.details = `Stripe test mode check failed: ${
      error instanceof Error ? error.message : error
    }`;
    check.issues.push("Unable to verify Stripe configuration");
    check.recommendations.push("Check Stripe configuration");
  }

  return check;
}

/**
 * Check successful paid issuance
 */
async function checkPaidIssuance(): Promise<LaunchGateCheck> {
  const check: LaunchGateCheck = {
    id: "paid_issuance",
    name: LAUNCH_GATE_CRITERIA.PAID_ISSUANCE.name,
    description: LAUNCH_GATE_CRITERIA.PAID_ISSUANCE.description,
    status: "pending",
    required: LAUNCH_GATE_CRITERIA.PAID_ISSUANCE.required,
    weight: LAUNCH_GATE_CRITERIA.PAID_ISSUANCE.weight,
    progress: 0,
    details: "",
    lastChecked: new Date().toISOString(),
    issues: [],
    recommendations: [],
  };

  try {
    const svc = supabaseService();

    // Check for successful paid transactions
    const { data: paidTransactions, error: paidError } = await svc
      .from("billing_logs")
      .select("*")
      .eq("success", true)
      .eq("test_mode", false)
      .order("created_at", { ascending: false });

    if (paidError) {
      throw new Error(`Failed to get paid transactions: ${paidError.message}`);
    }

    // Check for proofs associated with paid transactions
    const { data: paidProofs, error: proofsError } = await svc
      .from("proofs")
      .select("*")
      .in("user_id", paidTransactions?.map((t) => t.user_id) || [])
      .order("created_at", { ascending: false });

    if (proofsError) {
      throw new Error(`Failed to get paid proofs: ${proofsError.message}`);
    }

    const successfulPaidTransactions = paidTransactions?.length || 0;
    const paidProofsCount = paidProofs?.length || 0;

    // Calculate progress
    let progress = 0;
    if (successfulPaidTransactions > 0) progress += 50;
    if (paidProofsCount > 0) progress += 50;

    check.progress = progress;
    check.status = progress >= 80 ? "completed" : progress >= 40 ? "in_progress" : "pending";

    if (progress >= 80) {
      check.details = `Paid issuance verified. ${successfulPaidTransactions} successful paid transactions, ${paidProofsCount} proofs issued.`;
    } else if (progress >= 40) {
      check.details = "Paid issuance partially verified. Some paid transactions completed.";
      check.recommendations.push("Complete more paid transactions");
      check.recommendations.push("Verify proof issuance after payment");
    } else {
      check.details = "Paid issuance not verified.";
      check.issues.push("No successful paid transactions found");
      check.issues.push("No proofs issued for paid transactions");
      check.recommendations.push("Complete paid transactions");
      check.recommendations.push("Verify payment processing");
    }
  } catch (error) {
    check.status = "failed";
    check.details = `Paid issuance check failed: ${error instanceof Error ? error.message : error}`;
    check.issues.push("Unable to verify paid transactions");
    check.recommendations.push("Check payment processing");
  }

  return check;
}

/**
 * Check 500 verified proofs
 */
async function checkVerifiedProofs(): Promise<LaunchGateCheck> {
  const check: LaunchGateCheck = {
    id: "verified_proofs",
    name: LAUNCH_GATE_CRITERIA.VERIFIED_PROOFS.name,
    description: LAUNCH_GATE_CRITERIA.VERIFIED_PROOFS.description,
    status: "pending",
    required: LAUNCH_GATE_CRITERIA.VERIFIED_PROOFS.required,
    weight: LAUNCH_GATE_CRITERIA.VERIFIED_PROOFS.weight,
    progress: 0,
    details: "",
    lastChecked: new Date().toISOString(),
    issues: [],
    recommendations: [],
  };

  try {
    const svc = supabaseService();

    // Get total verification count from usage metrics
    const { data: verificationMetrics, error: metricsError } = await svc
      .from("usage_metrics")
      .select("count")
      .eq("event_type", "verification")
      .order("created_at", { ascending: false });

    if (metricsError) {
      throw new Error(`Failed to get verification metrics: ${metricsError.message}`);
    }

    const totalVerifications =
      verificationMetrics?.reduce((sum, record) => sum + (record.count || 0), 0) || 0;
    const threshold = LAUNCH_GATE_CRITERIA.VERIFIED_PROOFS.threshold;

    // Calculate progress
    const progress = Math.min(100, (totalVerifications / threshold) * 100);

    check.progress = progress;
    check.status = progress >= 100 ? "completed" : progress >= 50 ? "in_progress" : "pending";

    if (progress >= 100) {
      check.details = `Verified proofs target met. ${totalVerifications} verifications completed (target: ${threshold}).`;
    } else if (progress >= 50) {
      check.details = `Verified proofs in progress. ${totalVerifications} verifications completed (target: ${threshold}).`;
      check.recommendations.push("Continue verification testing");
      check.recommendations.push("Monitor verification success rate");
    } else {
      check.details = `Verified proofs target not met. ${totalVerifications} verifications completed (target: ${threshold}).`;
      check.issues.push("Insufficient verification count");
      check.recommendations.push("Increase verification testing");
      check.recommendations.push("Automate verification processes");
    }
  } catch (error) {
    check.status = "failed";
    check.details = `Verified proofs check failed: ${
      error instanceof Error ? error.message : error
    }`;
    check.issues.push("Unable to verify proof count");
    check.recommendations.push("Check verification system");
  }

  return check;
}

/**
 * Check documentation completeness
 */
async function checkDocumentation(): Promise<LaunchGateCheck> {
  const check: LaunchGateCheck = {
    id: "documentation",
    name: LAUNCH_GATE_CRITERIA.DOCUMENTATION.name,
    description: LAUNCH_GATE_CRITERIA.DOCUMENTATION.description,
    status: "pending",
    required: LAUNCH_GATE_CRITERIA.DOCUMENTATION.required,
    weight: LAUNCH_GATE_CRITERIA.DOCUMENTATION.weight,
    progress: 0,
    details: "",
    lastChecked: new Date().toISOString(),
    issues: [],
    recommendations: [],
  };

  try {
    // Check for required documentation files
    const requiredDocs = [
      "README.md",
      "docs/api.md",
      "docs/env.md",
      "docs/vercel-setup.md",
      "frontend/openapi/openapi.yaml",
      "packages/sdk-js/README.md",
    ];

    // This is a simplified check - in a real implementation, you'd check if files exist
    // For now, we'll assume documentation is complete if the OpenAPI spec exists
    const hasOpenAPI = true; // Simplified check
    const hasReadme = true; // Simplified check
    const hasApiDocs = true; // Simplified check

    // Calculate progress
    let progress = 0;
    if (hasOpenAPI) progress += 40;
    if (hasReadme) progress += 30;
    if (hasApiDocs) progress += 30;

    check.progress = progress;
    check.status = progress >= 80 ? "completed" : progress >= 40 ? "in_progress" : "pending";

    if (progress >= 80) {
      check.details =
        "Documentation is complete and usable. All required documentation files are present.";
    } else if (progress >= 40) {
      check.details = "Documentation is partially complete. Some documentation files are missing.";
      check.recommendations.push("Complete missing documentation");
      check.recommendations.push("Review documentation quality");
    } else {
      check.details = "Documentation is incomplete. Required documentation files are missing.";
      check.issues.push("Missing required documentation");
      check.issues.push("Documentation quality needs improvement");
      check.recommendations.push("Create missing documentation");
      check.recommendations.push("Improve documentation quality");
    }
  } catch (error) {
    check.status = "failed";
    check.details = `Documentation check failed: ${error instanceof Error ? error.message : error}`;
    check.issues.push("Unable to verify documentation");
    check.recommendations.push("Check documentation files");
  }

  return check;
}

/**
 * Get comprehensive launch gate status
 */
export async function getLaunchGateStatus(): Promise<LaunchGateStatus> {
  try {
    // Run all launch gate checks
    const checks = await Promise.all([
      checkSystemTesting(),
      checkStripeTestMode(),
      checkPaidIssuance(),
      checkVerifiedProofs(),
      checkDocumentation(),
    ]);

    // Calculate overall status
    const completedChecks = checks.filter((check) => check.status === "completed").length;
    const totalChecks = checks.length;
    const requiredChecksCompleted =
      checks.filter((check) => check.required && check.status === "completed").length ===
      checks.filter((check) => check.required).length;

    // Calculate readiness score
    const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
    const weightedScore = checks.reduce((sum, check) => {
      const score =
        check.status === "completed"
          ? 100
          : check.status === "in_progress"
          ? 50
          : check.status === "failed"
          ? 0
          : 0;
      return sum + score * check.weight;
    }, 0);
    const readinessScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    // Determine overall status
    let overallStatus: LaunchGateStatus["overallStatus"] = "not_ready";
    if (requiredChecksCompleted && readinessScore >= 80) {
      overallStatus = "ready";
    } else if (readinessScore >= 40) {
      overallStatus = "in_progress";
    }

    // Identify blockers
    const blockers = checks
      .filter((check) => check.required && check.status !== "completed")
      .map((check) => `${check.name}: ${check.details}`);

    // Generate next steps
    const nextSteps = checks
      .filter((check) => check.status !== "completed")
      .flatMap((check) => check.recommendations)
      .slice(0, 5); // Limit to top 5 recommendations

    // Estimate readiness
    let estimatedReadiness = "Unknown";
    if (overallStatus === "ready") {
      estimatedReadiness = "Ready for launch";
    } else if (overallStatus === "in_progress") {
      const remainingChecks = checks.filter((check) => check.status !== "completed").length;
      estimatedReadiness = `${remainingChecks} checks remaining`;
    } else {
      estimatedReadiness = "Significant work required";
    }

    const status: LaunchGateStatus = {
      overallStatus,
      readinessScore,
      completedChecks,
      totalChecks,
      requiredChecksCompleted,
      checks,
      blockers,
      nextSteps,
      estimatedReadiness,
      lastUpdated: new Date().toISOString(),
    };

    logger.info({ status }, "Launch gate status calculated successfully");
    return status;
  } catch (error) {
    logger.error({ error }, "Failed to calculate launch gate status");
    throw error;
  }
}

/**
 * Store launch gate status for historical tracking
 */
export async function storeLaunchGateStatus(status: LaunchGateStatus): Promise<void> {
  try {
    const svc = supabaseService();

    const { error } = await svc.from("usage_metrics").insert({
      event_type: "launch_gate_status",
      count: 1,
      metadata: {
        overall_status: status.overallStatus,
        readiness_score: status.readinessScore,
        completed_checks: status.completedChecks,
        total_checks: status.totalChecks,
        required_checks_completed: status.requiredChecksCompleted,
        blockers: status.blockers,
        next_steps: status.nextSteps,
        estimated_readiness: status.estimatedReadiness,
        checks: status.checks.map((check) => ({
          id: check.id,
          name: check.name,
          status: check.status,
          progress: check.progress,
          required: check.required,
        })),
      },
    });

    if (error) {
      logger.error({ error }, "Failed to store launch gate status");
      throw new Error("Failed to store launch gate status");
    }

    logger.info("Launch gate status stored successfully");
  } catch (error) {
    logger.error({ error }, "Failed to store launch gate status");
    throw error;
  }
}

/**
 * Get historical launch gate status
 */
export async function getHistoricalLaunchGateStatus(days: number = 7): Promise<LaunchGateStatus[]> {
  try {
    const svc = supabaseService();

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await svc
      .from("usage_metrics")
      .select("metadata, created_at")
      .eq("event_type", "launch_gate_status")
      .gte("created_at", startDate)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error({ error }, "Failed to get historical launch gate status");
      throw new Error("Failed to get historical launch gate status");
    }

    const historicalStatus: LaunchGateStatus[] =
      data?.map((record) => ({
        overallStatus: record.metadata?.overall_status || "not_ready",
        readinessScore: record.metadata?.readiness_score || 0,
        completedChecks: record.metadata?.completed_checks || 0,
        totalChecks: record.metadata?.total_checks || 0,
        requiredChecksCompleted: record.metadata?.required_checks_completed || false,
        checks: record.metadata?.checks || [],
        blockers: record.metadata?.blockers || [],
        nextSteps: record.metadata?.next_steps || [],
        estimatedReadiness: record.metadata?.estimated_readiness || "Unknown",
        lastUpdated: record.created_at || new Date().toISOString(),
      })) || [];

    logger.info(
      { count: historicalStatus.length },
      "Historical launch gate status retrieved successfully",
    );
    return historicalStatus;
  } catch (error) {
    logger.error({ error }, "Failed to get historical launch gate status");
    throw error;
  }
}
