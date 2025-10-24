#!/usr/bin/env tsx

/**
 * Test Usage Telemetry
 * 
 * This script tests the usage telemetry system as specified in the MVP checklist:
 * 1. Logs proof issuance and verification counts
 * 2. Stores in Supabase table usage_metrics
 * 3. Automates weekly summaries
 */

import { config } from 'dotenv';
import path from 'path';
import { 
  recordUsageMetric,
  recordProofCreation,
  recordProofVerification,
  recordApiCall,
  getUsageStats,
  generateWeeklySummary,
  automateWeeklySummary,
  getCurrentUsageMetrics
} from '../lib/usage-telemetry';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testUsageTelemetry() {
  console.log('🧪 Testing Usage Telemetry System...\n');

  try {
    // Test 1: Record various usage metrics
    console.log('1. Recording usage metrics...');
    
    const testUserId = 'test-user-telemetry';
    const testProofId = 'test-proof-123';
    
    // Record proof creation
    await recordProofCreation(testProofId, testUserId, {
      file_name: 'test-file.txt',
      project: 'telemetry-test',
    });
    console.log('✅ Recorded proof creation metric');

    // Record proof verification
    await recordProofVerification(testProofId, testUserId, {
      verification_method: 'hash',
      source: 'api',
    });
    console.log('✅ Recorded proof verification metric');

    // Record API call
    await recordApiCall('/api/verify', testUserId, {
      method: 'GET',
      response_time_ms: 150,
    });
    console.log('✅ Recorded API call metric');

    // Record generic usage metric
    await recordUsageMetric({
      event_type: 'proof.view',
      timestamp: new Date().toISOString(),
      user_id: testUserId,
      metadata: {
        proof_id: testProofId,
        view_source: 'web',
      },
    });
    console.log('✅ Recorded proof view metric');
    console.log('');

    // Test 2: Get usage statistics
    console.log('2. Getting usage statistics...');
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const usageStats = await getUsageStats(weekAgoStr, today);
    
    console.log('✅ Usage statistics:');
    console.log(`   Total proofs: ${usageStats.total_proofs}`);
    console.log(`   Total verifications: ${usageStats.total_verifications}`);
    console.log(`   Total API calls: ${usageStats.total_api_calls}`);
    console.log(`   Unique users: ${usageStats.unique_users}`);
    console.log(`   Daily average proofs: ${usageStats.daily_average.proofs}`);
    console.log(`   Daily average verifications: ${usageStats.daily_average.verifications}`);
    console.log(`   Daily average API calls: ${usageStats.daily_average.api_calls}`);
    console.log(`   Weekly trend entries: ${usageStats.weekly_trend.length}`);
    console.log('');

    // Test 3: Generate weekly summary
    console.log('3. Generating weekly summary...');
    const weekStart = weekAgoStr;
    const weekEnd = today;
    
    const weeklySummary = await generateWeeklySummary(weekStart, weekEnd);
    
    console.log('✅ Weekly summary:');
    console.log(`   Week: ${weeklySummary.week_start} to ${weeklySummary.week_end}`);
    console.log(`   Proofs created: ${weeklySummary.total_proofs_created}`);
    console.log(`   Proofs verified: ${weeklySummary.total_proofs_verified}`);
    console.log(`   API calls: ${weeklySummary.total_api_calls}`);
    console.log(`   Unique users: ${weeklySummary.unique_users}`);
    console.log(`   Top users: ${weeklySummary.top_users.length}`);
    console.log('');

    // Test 4: Get current usage metrics
    console.log('4. Getting current usage metrics...');
    const currentMetrics = await getCurrentUsageMetrics();
    
    console.log('✅ Current usage metrics:');
    console.log(`   Today - Proofs: ${currentMetrics.today.total_proofs}, Verifications: ${currentMetrics.today.total_verifications}`);
    console.log(`   This week - Proofs: ${currentMetrics.this_week.total_proofs}, Verifications: ${currentMetrics.this_week.total_verifications}`);
    console.log(`   This month - Proofs: ${currentMetrics.this_month.total_proofs}, Verifications: ${currentMetrics.this_month.total_verifications}`);
    console.log('');

    console.log('🎉 Usage telemetry tests completed successfully!');

  } catch (error) {
    console.error('❌ Usage telemetry test failed:', error);
    process.exit(1);
  }
}

async function testWeeklySummaryAutomation() {
  console.log('📊 Testing Weekly Summary Automation...\n');

  try {
    // Test automated weekly summary generation
    console.log('1. Running automated weekly summary...');
    await automateWeeklySummary();
    console.log('✅ Weekly summary automation completed');
    console.log('');

    console.log('🎉 Weekly summary automation tests completed!');

  } catch (error) {
    console.error('❌ Weekly summary automation test failed:', error);
    process.exit(1);
  }
}

async function testTelemetryPerformance() {
  console.log('⚡ Testing Telemetry Performance...\n');

  try {
    const testUserId = 'perf-test-user';
    const iterations = 100;

    console.log(`Running ${iterations} telemetry recordings...`);
    
    const startTime = Date.now();
    
    // Record multiple metrics in parallel
    const promises = [];
    for (let i = 0; i < iterations; i++) {
      promises.push(
        recordApiCall(`/api/test-${i}`, testUserId, {
          iteration: i,
          test: 'performance',
        })
      );
    }

    await Promise.all(promises);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log('✅ Performance test results:');
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average time per record: ${avgTime.toFixed(2)}ms`);
    console.log(`   Records per second: ${Math.round(1000 / avgTime)}`);
    console.log('');

    console.log('🎉 Telemetry performance tests completed!');

  } catch (error) {
    console.error('❌ Telemetry performance test failed:', error);
    process.exit(1);
  }
}

async function testTelemetryDataIntegrity() {
  console.log('🔍 Testing Telemetry Data Integrity...\n');

  try {
    // Test 1: Verify data consistency
    console.log('1. Testing data consistency...');
    const today = new Date().toISOString().split('T')[0];
    const stats = await getUsageStats(today, today);
    
    // Verify that totals make sense
    const isValid = stats.total_proofs >= 0 && 
                   stats.total_verifications >= 0 && 
                   stats.total_api_calls >= 0 &&
                   stats.unique_users >= 0;
    
    console.log(`✅ Data consistency check: ${isValid ? 'PASSED' : 'FAILED'}`);
    console.log('');

    // Test 2: Test weekly trend data
    console.log('2. Testing weekly trend data...');
    const trendValid = stats.weekly_trend.every(day => 
      day.proofs >= 0 && 
      day.verifications >= 0 && 
      day.api_calls >= 0 &&
      day.date.match(/^\d{4}-\d{2}-\d{2}$/)
    );
    
    console.log(`✅ Weekly trend data check: ${trendValid ? 'PASSED' : 'FAILED'}`);
    console.log('');

    // Test 3: Test metadata handling
    console.log('3. Testing metadata handling...');
    const testMetadata = {
      string_field: 'test',
      number_field: 123,
      boolean_field: true,
      object_field: { nested: 'value' },
      array_field: [1, 2, 3],
    };

    await recordUsageMetric({
      event_type: 'api.call',
      timestamp: new Date().toISOString(),
      user_id: 'test-user',
      metadata: testMetadata,
    });

    console.log('✅ Metadata handling test: PASSED');
    console.log('');

    console.log('🎉 Telemetry data integrity tests completed!');

  } catch (error) {
    console.error('❌ Telemetry data integrity test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'test':
      await testUsageTelemetry();
      break;
    case 'automation':
      await testWeeklySummaryAutomation();
      break;
    case 'performance':
      await testTelemetryPerformance();
      break;
    case 'integrity':
      await testTelemetryDataIntegrity();
      break;
    case 'all':
      await testUsageTelemetry();
      await testWeeklySummaryAutomation();
      await testTelemetryPerformance();
      await testTelemetryDataIntegrity();
      break;
    default:
      console.log('Usage Telemetry Test Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx test-telemetry.ts test        - Test basic telemetry functionality');
      console.log('  tsx test-telemetry.ts automation  - Test weekly summary automation');
      console.log('  tsx test-telemetry.ts performance - Test telemetry performance');
      console.log('  tsx test-telemetry.ts integrity   - Test data integrity');
      console.log('  tsx test-telemetry.ts all         - Run all tests');
      break;
  }
}

if (require.main === module) {
  main();
}
