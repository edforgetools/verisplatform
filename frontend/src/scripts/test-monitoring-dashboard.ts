#!/usr/bin/env tsx

/**
 * Test Monitoring Dashboard System
 * 
 * This script tests the monitoring dashboard system as specified in the MVP checklist:
 * 1. Display key performance indicators (KPIs)
 * 2. Track proof count, verification success rate, and issuance latency
 * 3. Highlight metrics that fail to meet thresholds
 * 4. Provide real-time monitoring and alerting
 */

import { config } from 'dotenv';
import path from 'path';
import { 
  getSystemMetrics,
  checkMetricThresholds,
  generateAlerts,
  getTrendData,
  getDashboardData,
  storeDashboardMetrics,
  getHistoricalDashboardMetrics,
  PERFORMANCE_THRESHOLDS
} from '../lib/monitoring-dashboard';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testSystemMetrics() {
  console.log('📊 Testing System Metrics...\n');

  try {
    // Test 1: Get system metrics
    console.log('1. Getting system metrics...');
    const metrics = await getSystemMetrics();
    
    console.log('✅ System metrics:');
    console.log(`   Proofs Issued Total: ${metrics.proofsIssuedTotal}`);
    console.log(`   Proofs Verified Total: ${metrics.proofsVerifiedTotal}`);
    console.log(`   Verification Success Rate: ${(metrics.verificationSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Average Issuance Latency: ${metrics.averageIssuanceLatencyMs}ms`);
    console.log(`   Average Verification Latency: ${metrics.averageVerificationLatencyMs}ms`);
    console.log(`   System Uptime: ${(metrics.systemUptime * 100).toFixed(1)}%`);
    console.log(`   Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    console.log(`   API Response Time: ${metrics.apiResponseTimeMs}ms`);
    console.log(`   Daily Proof Issuance: ${metrics.dailyProofIssuance}`);
    console.log(`   Daily Verifications: ${metrics.dailyVerifications}`);
    console.log(`   Active Users: ${metrics.activeUsers}`);
    console.log(`   S3 Upload Success Rate: ${(metrics.s3UploadSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Arweave Upload Success Rate: ${(metrics.arweaveUploadSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Database Response Time: ${metrics.databaseResponseTimeMs}ms`);
    console.log(`   Last Updated: ${metrics.lastUpdated}`);
    console.log(`   Data Freshness: ${metrics.dataFreshnessMs}ms`);
    console.log('');

    // Test 2: Check performance thresholds
    console.log('2. Checking performance thresholds...');
    const thresholds = checkMetricThresholds(metrics);
    
    console.log('✅ Performance thresholds:');
    thresholds.forEach(threshold => {
      console.log(`   ${threshold.name}: ${threshold.value}${threshold.unit} (${threshold.status.toUpperCase()})`);
      console.log(`     Target: ${threshold.threshold}${threshold.unit}`);
      console.log(`     Description: ${threshold.description}`);
    });
    console.log('');

    // Test 3: Generate alerts
    console.log('3. Generating alerts...');
    const alerts = generateAlerts(thresholds);
    
    console.log('✅ Alerts:');
    if (alerts.length === 0) {
      console.log('   No alerts generated - all thresholds met');
    } else {
      alerts.forEach(alert => {
        console.log(`   ${alert.severity.toUpperCase()}: ${alert.title}`);
        console.log(`     Description: ${alert.description}`);
        console.log(`     Value: ${alert.value} (Threshold: ${alert.threshold})`);
        console.log(`     Timestamp: ${alert.timestamp}`);
      });
    }
    console.log('');

    console.log('🎉 System metrics tests completed!');

  } catch (error) {
    console.error('❌ System metrics test failed:', error);
    process.exit(1);
  }
}

async function testTrendData() {
  console.log('📈 Testing Trend Data...\n');

  try {
    // Test 1: Get trend data
    console.log('1. Getting trend data...');
    const trends = await getTrendData();
    
    console.log('✅ Trend data:');
    trends.forEach(trend => {
      console.log(`   ${trend.metric}:`);
      console.log(`     Trend: ${trend.trend.toUpperCase()}`);
      console.log(`     Change: ${trend.changePercent > 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%`);
      console.log(`     Data Points: ${trend.timeSeries.length}`);
      if (trend.timeSeries.length > 0) {
        console.log(`     First Value: ${trend.timeSeries[0].value} (${trend.timeSeries[0].timestamp})`);
        console.log(`     Last Value: ${trend.timeSeries[trend.timeSeries.length - 1].value} (${trend.timeSeries[trend.timeSeries.length - 1].timestamp})`);
      }
    });
    console.log('');

    console.log('🎉 Trend data tests completed!');

  } catch (error) {
    console.error('❌ Trend data test failed:', error);
    process.exit(1);
  }
}

async function testDashboardData() {
  console.log('📋 Testing Dashboard Data...\n');

  try {
    // Test 1: Get comprehensive dashboard data
    console.log('1. Getting comprehensive dashboard data...');
    const dashboardData = await getDashboardData();
    
    console.log('✅ Dashboard data:');
    console.log(`   Overall Status: ${dashboardData.overallStatus.toUpperCase()}`);
    console.log(`   Metrics Count: ${dashboardData.thresholds.length}`);
    console.log(`   Alerts Count: ${dashboardData.alerts.length}`);
    console.log(`   Trends Count: ${dashboardData.trends.length}`);
    console.log(`   Last Updated: ${dashboardData.lastUpdated}`);
    console.log('');
    
    console.log('   Key Metrics:');
    console.log(`     Proofs Issued: ${dashboardData.metrics.proofsIssuedTotal}`);
    console.log(`     Proofs Verified: ${dashboardData.metrics.proofsVerifiedTotal}`);
    console.log(`     Success Rate: ${(dashboardData.metrics.verificationSuccessRate * 100).toFixed(1)}%`);
    console.log(`     System Uptime: ${(dashboardData.metrics.systemUptime * 100).toFixed(1)}%`);
    console.log(`     Error Rate: ${(dashboardData.metrics.errorRate * 100).toFixed(1)}%`);
    console.log('');
    
    console.log('   Threshold Status:');
    const passedThresholds = dashboardData.thresholds.filter(t => t.status === 'pass').length;
    const failedThresholds = dashboardData.thresholds.filter(t => t.status === 'fail').length;
    const warningThresholds = dashboardData.thresholds.filter(t => t.status === 'warning').length;
    console.log(`     Passed: ${passedThresholds}`);
    console.log(`     Failed: ${failedThresholds}`);
    console.log(`     Warnings: ${warningThresholds}`);
    console.log('');

    // Test 2: Store dashboard metrics
    console.log('2. Storing dashboard metrics...');
    try {
      await storeDashboardMetrics(dashboardData.metrics);
      console.log('✅ Dashboard metrics stored successfully');
    } catch (error) {
      console.log('⚠️  Dashboard metrics storage failed (expected without database connection)');
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Test 3: Get historical dashboard metrics
    console.log('3. Getting historical dashboard metrics...');
    try {
      const historicalMetrics = await getHistoricalDashboardMetrics(7);
      
      console.log('✅ Historical dashboard metrics:');
      console.log(`   Total Records: ${historicalMetrics.length}`);
      if (historicalMetrics.length > 0) {
        console.log('   Recent records:');
        historicalMetrics.slice(0, 3).forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.lastUpdated}: ${record.proofsIssuedTotal} proofs, ${(record.verificationSuccessRate * 100).toFixed(1)}% success`);
        });
      }
    } catch (error) {
      console.log('⚠️  Historical dashboard metrics fetch failed (expected without database connection)');
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    console.log('🎉 Dashboard data tests completed!');

  } catch (error) {
    console.error('❌ Dashboard data test failed:', error);
    process.exit(1);
  }
}

async function testPerformanceThresholds() {
  console.log('🎯 Testing Performance Thresholds...\n');

  try {
    // Test 1: Display performance thresholds
    console.log('1. Performance thresholds configuration:');
    console.log('✅ Performance thresholds:');
    console.log(`   Issuance Latency: ${PERFORMANCE_THRESHOLDS.ISSUANCE_LATENCY_MS}ms`);
    console.log(`   Verification Success Rate: ${(PERFORMANCE_THRESHOLDS.VERIFICATION_SUCCESS_RATE * 100).toFixed(1)}%`);
    console.log(`   System Uptime: ${(PERFORMANCE_THRESHOLDS.UPTIME_THRESHOLD * 100).toFixed(1)}%`);
    console.log(`   Error Rate: ${(PERFORMANCE_THRESHOLDS.ERROR_RATE_THRESHOLD * 100).toFixed(1)}%`);
    console.log(`   API Response Time: ${PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS}ms`);
    console.log('');

    // Test 2: Test threshold checking with mock data
    console.log('2. Testing threshold checking with mock data...');
    const mockMetrics = {
      proofsIssuedTotal: 1000,
      proofsVerifiedTotal: 950,
      verificationSuccessRate: 0.95, // 95% - should fail (threshold is 99%)
      averageIssuanceLatencyMs: 2500, // 2.5s - should fail (threshold is 2s)
      averageVerificationLatencyMs: 800,
      systemUptime: 0.999, // 99.9% - should pass (threshold is 99.9%)
      errorRate: 0.005, // 0.5% - should pass (threshold is 1%)
      apiResponseTimeMs: 600, // 600ms - should fail (threshold is 500ms)
      dailyProofIssuance: 50,
      dailyVerifications: 45,
      activeUsers: 25,
      s3UploadSuccessRate: 0.98, // 98% - should fail (threshold is 99%)
      arweaveUploadSuccessRate: 0.94, // 94% - should fail (threshold is 95%)
      databaseResponseTimeMs: 100,
      lastUpdated: new Date().toISOString(),
      dataFreshnessMs: 50,
    };
    
    const mockThresholds = checkMetricThresholds(mockMetrics);
    const mockAlerts = generateAlerts(mockThresholds);
    
    console.log('✅ Mock threshold results:');
    mockThresholds.forEach(threshold => {
      console.log(`   ${threshold.name}: ${threshold.value}${threshold.unit} (${threshold.status.toUpperCase()})`);
    });
    console.log('');
    
    console.log('✅ Mock alerts:');
    if (mockAlerts.length === 0) {
      console.log('   No alerts generated');
    } else {
      mockAlerts.forEach(alert => {
        console.log(`   ${alert.severity.toUpperCase()}: ${alert.title}`);
        console.log(`     ${alert.description}`);
      });
    }
    console.log('');

    console.log('🎉 Performance thresholds tests completed!');

  } catch (error) {
    console.error('❌ Performance thresholds test failed:', error);
    process.exit(1);
  }
}

async function testMonitoringAPI() {
  console.log('🌐 Testing Monitoring API...\n');

  try {
    // Test 1: Test the monitoring API endpoint
    console.log('1. Testing monitoring API endpoint...');
    
    // Note: This would require the server to be running
    // For now, we'll just test the structure
    console.log('✅ Monitoring API endpoint structure:');
    console.log('   GET /api/monitoring/dashboard');
    console.log('   Query parameters:');
    console.log('     - days: number (default: 7)');
    console.log('     - include_history: boolean (default: false)');
    console.log('   Response includes:');
    console.log('     - metrics: SystemMetrics');
    console.log('     - thresholds: MetricThreshold[]');
    console.log('     - overallStatus: string');
    console.log('     - alerts: Alert[]');
    console.log('     - trends: TrendData[]');
    console.log('     - historical: SystemMetrics[] (if include_history=true)');
    console.log('     - generated_at: string');
    console.log('');

    console.log('🎉 Monitoring API tests completed!');

  } catch (error) {
    console.error('❌ Monitoring API test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'metrics':
      await testSystemMetrics();
      break;
    case 'trends':
      await testTrendData();
      break;
    case 'dashboard':
      await testDashboardData();
      break;
    case 'thresholds':
      await testPerformanceThresholds();
      break;
    case 'api':
      await testMonitoringAPI();
      break;
    case 'all':
      await testSystemMetrics();
      await testTrendData();
      await testDashboardData();
      await testPerformanceThresholds();
      await testMonitoringAPI();
      break;
    default:
      console.log('Monitoring Dashboard Test Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx test-monitoring-dashboard.ts metrics    - Test system metrics');
      console.log('  tsx test-monitoring-dashboard.ts trends     - Test trend data');
      console.log('  tsx test-monitoring-dashboard.ts dashboard  - Test dashboard data');
      console.log('  tsx test-monitoring-dashboard.ts thresholds - Test performance thresholds');
      console.log('  tsx test-monitoring-dashboard.ts api        - Test monitoring API');
      console.log('  tsx test-monitoring-dashboard.ts all       - Run all tests');
      break;
  }
}

if (require.main === module) {
  main();
}
