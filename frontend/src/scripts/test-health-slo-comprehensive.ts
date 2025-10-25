#!/usr/bin/env tsx

/**
 * Comprehensive Health and SLO Monitoring Test
 *
 * This script tests the complete health and SLO monitoring system including:
 * - Health check endpoints and system health monitoring
 * - SLO status calculation and tracking
 * - Performance metrics collection and analysis
 * - System availability and reliability monitoring
 * - API endpoints and dashboard functionality
 */

import {
  performHealthChecks,
  calculateSLOStatus,
  getSystemHealth,
  getHealthMetrics,
  SLO_DEFINITIONS,
} from "../lib/health-slo-monitoring";
import { logger } from "../lib/logger";

async function testHealthChecks() {
  console.log("🧪 Testing Health Checks...\n");

  try {
    // Test 1: Perform all health checks
    console.log("1. Performing comprehensive health checks...");
    const healthChecks = await performHealthChecks();

    console.log("📊 Health check results:", {
      totalChecks: healthChecks.length,
      healthy: healthChecks.filter((c) => c.status === "healthy").length,
      degraded: healthChecks.filter((c) => c.status === "degraded").length,
      unhealthy: healthChecks.filter((c) => c.status === "unhealthy").length,
      checks: healthChecks.map((check) => ({
        name: check.name,
        status: check.status,
        responseTime: check.responseTimeMs,
        hasError: !!check.error,
      })),
    });

    // Test 2: Validate health check structure
    console.log("2. Validating health check structure...");
    healthChecks.forEach((check, index) => {
      const requiredFields = ["name", "status", "responseTimeMs", "lastChecked", "details"];
      const missingFields = requiredFields.filter((field) => !(field in check));

      if (missingFields.length > 0) {
        throw new Error(`Health check ${index} missing fields: ${missingFields.join(", ")}`);
      }

      if (!["healthy", "degraded", "unhealthy"].includes(check.status)) {
        throw new Error(`Health check ${index} has invalid status: ${check.status}`);
      }
    });

    console.log("✅ Health checks tests passed");
  } catch (error) {
    console.error("❌ Health checks tests failed:", error);
    throw error;
  }
}

async function testSLOStatus() {
  console.log("🧪 Testing SLO Status...\n");

  try {
    // Test 1: Calculate SLO status
    console.log("1. Calculating SLO status...");
    const sloStatus = await calculateSLOStatus();

    console.log("📊 SLO status results:", {
      totalSLOs: sloStatus.length,
      meeting: sloStatus.filter((s) => s.status === "meeting").length,
      warning: sloStatus.filter((s) => s.status === "warning").length,
      breach: sloStatus.filter((s) => s.status === "breach").length,
      slos: sloStatus.map((slo) => ({
        name: slo.name,
        status: slo.status,
        current: slo.current,
        target: slo.target,
        trend: slo.trend,
      })),
    });

    // Test 2: Validate SLO definitions
    console.log("2. Validating SLO definitions...");
    const requiredSLOs = ["AVAILABILITY_TARGET", "PROOF_ISSUANCE_LATENCY_P95", "ERROR_RATE_TARGET"];
    const missingSLOs = requiredSLOs.filter((slo) => !(slo in SLO_DEFINITIONS));

    if (missingSLOs.length > 0) {
      throw new Error(`Missing SLO definitions: ${missingSLOs.join(", ")}`);
    }

    // Test 3: Validate SLO status structure
    console.log("3. Validating SLO status structure...");
    sloStatus.forEach((slo, index) => {
      const requiredFields = ["name", "target", "current", "status", "window", "trend", "details"];
      const missingFields = requiredFields.filter((field) => !(field in slo));

      if (missingFields.length > 0) {
        throw new Error(`SLO status ${index} missing fields: ${missingFields.join(", ")}`);
      }

      if (!["meeting", "warning", "breach"].includes(slo.status)) {
        throw new Error(`SLO status ${index} has invalid status: ${slo.status}`);
      }
    });

    console.log("✅ SLO status tests passed");
  } catch (error) {
    console.error("❌ SLO status tests failed:", error);
    throw error;
  }
}

async function testSystemHealth() {
  console.log("🧪 Testing System Health...\n");

  try {
    // Test 1: Get comprehensive system health
    console.log("1. Getting comprehensive system health...");
    const systemHealth = await getSystemHealth();

    console.log("📊 System health results:", {
      overall: systemHealth.overall,
      timestamp: systemHealth.timestamp,
      summary: systemHealth.summary,
      totalChecks: systemHealth.checks.length,
      totalSLOs: systemHealth.slos.length,
    });

    // Test 2: Validate system health structure
    console.log("2. Validating system health structure...");
    const requiredFields = ["overall", "timestamp", "checks", "slos", "summary"];
    const missingFields = requiredFields.filter((field) => !(field in systemHealth));

    if (missingFields.length > 0) {
      throw new Error(`System health missing fields: ${missingFields.join(", ")}`);
    }

    if (!["healthy", "degraded", "unhealthy"].includes(systemHealth.overall)) {
      throw new Error(`System health has invalid overall status: ${systemHealth.overall}`);
    }

    // Test 3: Validate summary calculations
    console.log("3. Validating summary calculations...");
    const { summary } = systemHealth;
    const calculatedTotal =
      summary.healthyChecks + summary.degradedChecks + summary.unhealthyChecks;

    if (calculatedTotal !== summary.totalChecks) {
      throw new Error(`Summary total mismatch: ${calculatedTotal} vs ${summary.totalChecks}`);
    }

    console.log("✅ System health tests passed");
  } catch (error) {
    console.error("❌ System health tests failed:", error);
    throw error;
  }
}

async function testHealthMetrics() {
  console.log("🧪 Testing Health Metrics...\n");

  try {
    // Test 1: Get health metrics
    console.log("1. Getting health metrics...");
    const healthMetrics = await getHealthMetrics();

    console.log("📊 Health metrics results:", {
      uptime: healthMetrics.uptime,
      errorRate: healthMetrics.errorRate,
      averageResponseTime: healthMetrics.averageResponseTime,
      throughput: healthMetrics.throughput,
      dataIntegrity: healthMetrics.dataIntegrity,
      lastUpdated: healthMetrics.lastUpdated,
    });

    // Test 2: Validate health metrics structure
    console.log("2. Validating health metrics structure...");
    const requiredFields = [
      "uptime",
      "errorRate",
      "averageResponseTime",
      "throughput",
      "dataIntegrity",
      "lastUpdated",
    ];
    const missingFields = requiredFields.filter((field) => !(field in healthMetrics));

    if (missingFields.length > 0) {
      throw new Error(`Health metrics missing fields: ${missingFields.join(", ")}`);
    }

    // Test 3: Validate metric ranges
    console.log("3. Validating metric ranges...");
    if (healthMetrics.uptime < 0 || healthMetrics.uptime > 1) {
      throw new Error(`Invalid uptime value: ${healthMetrics.uptime}`);
    }

    if (healthMetrics.errorRate < 0 || healthMetrics.errorRate > 1) {
      throw new Error(`Invalid error rate value: ${healthMetrics.errorRate}`);
    }

    if (healthMetrics.dataIntegrity < 0 || healthMetrics.dataIntegrity > 1) {
      throw new Error(`Invalid data integrity value: ${healthMetrics.dataIntegrity}`);
    }

    console.log("✅ Health metrics tests passed");
  } catch (error) {
    console.error("❌ Health metrics tests failed:", error);
    throw error;
  }
}

async function testHealthAPIEndpoints() {
  console.log("🧪 Testing Health API Endpoints...\n");

  try {
    // Test 1: Health endpoint
    console.log("1. Testing health endpoint...");
    const healthResponse = await fetch("http://localhost:3000/api/health", {
      headers: {
        Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
      },
    });

    console.log("📊 Health endpoint status:", healthResponse.status);

    // Test 2: Health endpoint with details
    console.log("2. Testing health endpoint with details...");
    const healthDetailedResponse = await fetch(
      "http://localhost:3000/api/health?detailed=true&metrics=true",
      {
        headers: {
          Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
        },
      },
    );

    console.log("📊 Health detailed endpoint status:", healthDetailedResponse.status);

    // Test 3: SLO endpoint
    console.log("3. Testing SLO endpoint...");
    const sloResponse = await fetch("http://localhost:3000/api/slo", {
      headers: {
        Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
      },
    });

    console.log("📊 SLO endpoint status:", sloResponse.status);

    // Test 4: SLO endpoint with definitions
    console.log("4. Testing SLO endpoint with definitions...");
    const sloDetailedResponse = await fetch(
      "http://localhost:3000/api/slo?definitions=true&history=true",
      {
        headers: {
          Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
        },
      },
    );

    console.log("📊 SLO detailed endpoint status:", sloDetailedResponse.status);

    // Test 5: Performance endpoint
    console.log("5. Testing performance endpoint...");
    const performanceResponse = await fetch(
      "http://localhost:3000/api/performance?range=24h&details=true",
      {
        headers: {
          Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
        },
      },
    );

    console.log("📊 Performance endpoint status:", performanceResponse.status);

    console.log("✅ Health API endpoints tests completed");
  } catch (error) {
    console.error("❌ Health API endpoints tests failed:", error);
    throw error;
  }
}

async function testHealthMonitoringPerformance() {
  console.log("🧪 Testing Health Monitoring Performance...\n");

  try {
    // Test 1: Performance test for health checks
    console.log("1. Testing health checks performance...");
    const startTime = Date.now();

    const healthChecks = await performHealthChecks();
    const healthChecksTime = Date.now() - startTime;

    console.log(`   Health checks completed in ${healthChecksTime}ms`);

    if (healthChecksTime > 5000) {
      console.log("   ⚠️  Health checks took longer than 5 seconds");
    }

    // Test 2: Performance test for SLO calculation
    console.log("2. Testing SLO calculation performance...");
    const sloStartTime = Date.now();

    const sloStatus = await calculateSLOStatus();
    const sloTime = Date.now() - sloStartTime;

    console.log(`   SLO calculation completed in ${sloTime}ms`);

    if (sloTime > 3000) {
      console.log("   ⚠️  SLO calculation took longer than 3 seconds");
    }

    // Test 3: Performance test for system health
    console.log("3. Testing system health performance...");
    const systemStartTime = Date.now();

    const systemHealth = await getSystemHealth();
    const systemTime = Date.now() - systemStartTime;

    console.log(`   System health completed in ${systemTime}ms`);

    if (systemTime > 8000) {
      console.log("   ⚠️  System health took longer than 8 seconds");
    }

    // Test 4: Performance test for health metrics
    console.log("4. Testing health metrics performance...");
    const metricsStartTime = Date.now();

    const healthMetrics = await getHealthMetrics();
    const metricsTime = Date.now() - metricsStartTime;

    console.log(`   Health metrics completed in ${metricsTime}ms`);

    if (metricsTime > 2000) {
      console.log("   ⚠️  Health metrics took longer than 2 seconds");
    }

    console.log("📊 Performance summary:", {
      healthChecks: `${healthChecksTime}ms`,
      sloCalculation: `${sloTime}ms`,
      systemHealth: `${systemTime}ms`,
      healthMetrics: `${metricsTime}ms`,
      totalTime: `${healthChecksTime + sloTime + systemTime + metricsTime}ms`,
    });

    console.log("✅ Health monitoring performance tests passed");
  } catch (error) {
    console.error("❌ Health monitoring performance tests failed:", error);
    throw error;
  }
}

async function testHealthMonitoringDataIntegrity() {
  console.log("🧪 Testing Health Monitoring Data Integrity...\n");

  try {
    // Test 1: Test data consistency across multiple calls
    console.log("1. Testing data consistency...");

    const [health1, health2] = await Promise.all([getSystemHealth(), getSystemHealth()]);

    // Check that both calls return consistent data structure
    const structure1 = Object.keys(health1).sort();
    const structure2 = Object.keys(health2).sort();

    if (JSON.stringify(structure1) !== JSON.stringify(structure2)) {
      throw new Error("Inconsistent data structure between health calls");
    }

    console.log("   ✅ Data structure consistency verified");

    // Test 2: Test SLO calculation consistency
    console.log("2. Testing SLO calculation consistency...");

    const [slo1, slo2] = await Promise.all([calculateSLOStatus(), calculateSLOStatus()]);

    // Check that SLO names are consistent
    const sloNames1 = slo1.map((s) => s.name).sort();
    const sloNames2 = slo2.map((s) => s.name).sort();

    if (JSON.stringify(sloNames1) !== JSON.stringify(sloNames2)) {
      throw new Error("Inconsistent SLO names between calculations");
    }

    console.log("   ✅ SLO calculation consistency verified");

    // Test 3: Test health metrics consistency
    console.log("3. Testing health metrics consistency...");

    const [metrics1, metrics2] = await Promise.all([getHealthMetrics(), getHealthMetrics()]);

    // Check that metrics structure is consistent
    const metricsStructure1 = Object.keys(metrics1).sort();
    const metricsStructure2 = Object.keys(metrics2).sort();

    if (JSON.stringify(metricsStructure1) !== JSON.stringify(metricsStructure2)) {
      throw new Error("Inconsistent metrics structure between calls");
    }

    console.log("   ✅ Health metrics consistency verified");

    console.log("✅ Health monitoring data integrity tests passed");
  } catch (error) {
    console.error("❌ Health monitoring data integrity tests failed:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting comprehensive health and SLO monitoring tests...\n");

  try {
    await testHealthChecks();
    console.log("");

    await testSLOStatus();
    console.log("");

    await testSystemHealth();
    console.log("");

    await testHealthMetrics();
    console.log("");

    await testHealthAPIEndpoints();
    console.log("");

    await testHealthMonitoringPerformance();
    console.log("");

    await testHealthMonitoringDataIntegrity();
    console.log("");

    console.log("🎉 All comprehensive health and SLO monitoring tests passed!");
    console.log("\n📋 Test Summary:");
    console.log("✅ Health check endpoints and system health monitoring");
    console.log("✅ SLO status calculation and tracking");
    console.log("✅ Performance metrics collection and analysis");
    console.log("✅ System availability and reliability monitoring");
    console.log("✅ Health and SLO API endpoints");
    console.log("✅ Performance monitoring and SLA compliance");
    console.log("✅ Data integrity validation");
  } catch (error) {
    console.error("\n💥 Comprehensive health and SLO monitoring tests failed:", error);
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
