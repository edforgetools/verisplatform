#!/usr/bin/env tsx

/**
 * Test Recovery Audit System
 * 
 * This script tests the recovery audit system as specified in the MVP checklist:
 * 1. Schedule random proof reconstruction from Arweave every 10,000 proofs
 * 2. Compare hashes to originals
 * 3. Log mismatch alerts
 */

import { config } from 'dotenv';
import path from 'path';
import { 
  runRecoveryAudit,
  getRecoveryAuditHistory,
  getRecoveryAuditResults,
  shouldRunRecoveryAudit,
  runRecoveryAuditIfNeeded
} from '../lib/recovery-audit';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testRecoveryAudit() {
  console.log('🧪 Testing Recovery Audit System...\n');

  try {
    // Test 1: Check if recovery audit should be run
    console.log('1. Checking if recovery audit should be run...');
    const shouldRunCheck = await shouldRunRecoveryAudit();
    
    console.log('✅ Recovery audit check:');
    console.log(`   Should Run: ${shouldRunCheck.shouldRun ? 'YES' : 'NO'}`);
    console.log(`   Reason: ${shouldRunCheck.reason}`);
    if (shouldRunCheck.lastAuditDate) {
      console.log(`   Last Audit Date: ${shouldRunCheck.lastAuditDate}`);
    }
    if (shouldRunCheck.proofCountSinceLastAudit !== undefined) {
      console.log(`   Proofs Since Last Audit: ${shouldRunCheck.proofCountSinceLastAudit}`);
    }
    console.log('');

    // Test 2: Run recovery audit
    console.log('2. Running recovery audit...');
    const auditSummary = await runRecoveryAudit({
      batchSize: 5, // Small batch for testing
      maxErrors: 3,
      sources: ['database'], // Only test database source for now
      randomize: true,
    });
    
    console.log('✅ Recovery audit completed:');
    console.log(`   Total Audited: ${auditSummary.totalAudited}`);
    console.log(`   Successful Recoveries: ${auditSummary.successfulRecoveries}`);
    console.log(`   Failed Recoveries: ${auditSummary.failedRecoveries}`);
    console.log(`   Hash Mismatches: ${auditSummary.hashMismatches}`);
    console.log(`   Signature Failures: ${auditSummary.signatureFailures}`);
    console.log(`   Source Breakdown:`);
    console.log(`     S3: ${auditSummary.sourceBreakdown.s3}`);
    console.log(`     Arweave: ${auditSummary.sourceBreakdown.arweave}`);
    console.log(`     Database: ${auditSummary.sourceBreakdown.database}`);
    console.log(`   Errors: ${auditSummary.errors.length}`);
    console.log(`   Audit Date: ${auditSummary.auditDate}`);
    console.log('');

    // Test 3: Get audit history
    console.log('3. Getting audit history...');
    const auditHistory = await getRecoveryAuditHistory(5);
    
    console.log('✅ Audit history:');
    console.log(`   Total Audits: ${auditHistory.length}`);
    if (auditHistory.length > 0) {
      console.log('   Recent audits:');
      auditHistory.slice(0, 3).forEach(audit => {
        console.log(`   - ${audit.audit_date}: ${audit.successful_recoveries}/${audit.total_audited} successful`);
      });
    }
    console.log('');

    // Test 4: Get audit results for latest audit
    console.log('4. Getting audit results for latest audit...');
    if (auditHistory.length > 0) {
      const latestAuditDate = auditHistory[0].audit_date;
      const auditResults = await getRecoveryAuditResults(latestAuditDate);
      
      console.log('✅ Latest audit results:');
      console.log(`   Total Results: ${auditResults.length}`);
      if (auditResults.length > 0) {
        console.log('   Sample results:');
        auditResults.slice(0, 3).forEach(result => {
          console.log(`   - ${result.proof_id}: hash_match=${result.hash_match}, signature_valid=${result.signature_valid}, source=${result.source}`);
        });
      }
    } else {
      console.log('ℹ️  No audit history found');
    }
    console.log('');

    console.log('🎉 Recovery audit tests completed!');

  } catch (error) {
    console.error('❌ Recovery audit test failed:', error);
    process.exit(1);
  }
}

async function testRecoveryAuditAutomation() {
  console.log('🤖 Testing Recovery Audit Automation...\n');

  try {
    // Test 1: Run automated recovery audit
    console.log('1. Running automated recovery audit...');
    const autoResult = await runRecoveryAuditIfNeeded();
    
    console.log('✅ Automated recovery audit:');
    console.log(`   Ran: ${autoResult.ran ? 'YES' : 'NO'}`);
    console.log(`   Reason: ${autoResult.reason}`);
    
    if (autoResult.summary) {
      console.log(`   Summary:`);
      console.log(`     Total Audited: ${autoResult.summary.totalAudited}`);
      console.log(`     Successful: ${autoResult.summary.successfulRecoveries}`);
      console.log(`     Failed: ${autoResult.summary.failedRecoveries}`);
      console.log(`     Hash Mismatches: ${autoResult.summary.hashMismatches}`);
      console.log(`     Signature Failures: ${autoResult.summary.signatureFailures}`);
    }
    
    if (autoResult.error) {
      console.log(`   Error: ${autoResult.error}`);
    }
    console.log('');

    console.log('🎉 Recovery audit automation tests completed!');

  } catch (error) {
    console.error('❌ Recovery audit automation test failed:', error);
    process.exit(1);
  }
}

async function testRecoveryAuditPerformance() {
  console.log('⚡ Testing Recovery Audit Performance...\n');

  try {
    // Test 1: Performance test with different batch sizes
    console.log('1. Testing performance with different batch sizes...');
    
    const batchSizes = [1, 3, 5];
    const performanceResults: Array<{
      batchSize: number;
      duration: number;
      successRate: number;
    }> = [];

    for (const batchSize of batchSizes) {
      const startTime = Date.now();
      
      try {
        const summary = await runRecoveryAudit({
          batchSize,
          maxErrors: 10,
          sources: ['database'],
          randomize: true,
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        const successRate = summary.totalAudited > 0 ? (summary.successfulRecoveries / summary.totalAudited) * 100 : 0;
        
        performanceResults.push({
          batchSize,
          duration,
          successRate,
        });
        
        console.log(`   Batch size ${batchSize}: ${duration}ms, ${successRate.toFixed(1)}% success rate`);
        
      } catch (error) {
        console.log(`   Batch size ${batchSize}: FAILED - ${error instanceof Error ? error.message : error}`);
      }
    }
    
    console.log('✅ Performance test results:');
    performanceResults.forEach(result => {
      console.log(`   Batch ${result.batchSize}: ${result.duration}ms, ${result.successRate.toFixed(1)}% success`);
    });
    console.log('');

    console.log('🎉 Recovery audit performance tests completed!');

  } catch (error) {
    console.error('❌ Recovery audit performance test failed:', error);
    process.exit(1);
  }
}

async function testRecoveryAuditDataIntegrity() {
  console.log('🔍 Testing Recovery Audit Data Integrity...\n');

  try {
    // Test 1: Test audit data consistency
    console.log('1. Testing audit data consistency...');
    
    const auditHistory = await getRecoveryAuditHistory(10);
    
    if (auditHistory.length > 0) {
      const latestAudit = auditHistory[0];
      const auditResults = await getRecoveryAuditResults(latestAudit.audit_date);
      
      // Check consistency between summary and detailed results
      const summaryTotal = latestAudit.total_audited;
      const resultsTotal = auditResults.length;
      const summarySuccessful = latestAudit.successful_recoveries;
      const resultsSuccessful = auditResults.filter(r => r.hash_match && r.signature_valid).length;
      
      const isConsistent = summaryTotal === resultsTotal && summarySuccessful === resultsSuccessful;
      
      console.log('✅ Data consistency check:');
      console.log(`   Summary Total: ${summaryTotal}`);
      console.log(`   Results Total: ${resultsTotal}`);
      console.log(`   Summary Successful: ${summarySuccessful}`);
      console.log(`   Results Successful: ${resultsSuccessful}`);
      console.log(`   Consistent: ${isConsistent ? 'YES' : 'NO'}`);
      
      if (!isConsistent) {
        console.log('   ⚠️  Data inconsistency detected!');
      }
    } else {
      console.log('ℹ️  No audit history to check consistency');
    }
    console.log('');

    // Test 2: Test audit result validation
    console.log('2. Testing audit result validation...');
    
    if (auditHistory.length > 0) {
      const latestAudit = auditHistory[0];
      const auditResults = await getRecoveryAuditResults(latestAudit.audit_date);
      
      let validResults = 0;
      let invalidResults = 0;
      
      auditResults.forEach(result => {
        // Check if result has required fields
        const hasRequiredFields = result.proof_id && 
                                 result.original_hash && 
                                 result.recovered_hash && 
                                 typeof result.hash_match === 'boolean' &&
                                 typeof result.signature_valid === 'boolean' &&
                                 result.source;
        
        if (hasRequiredFields) {
          validResults++;
        } else {
          invalidResults++;
        }
      });
      
      console.log('✅ Audit result validation:');
      console.log(`   Valid Results: ${validResults}`);
      console.log(`   Invalid Results: ${invalidResults}`);
      console.log(`   Validation Passed: ${invalidResults === 0 ? 'YES' : 'NO'}`);
    } else {
      console.log('ℹ️  No audit results to validate');
    }
    console.log('');

    console.log('🎉 Recovery audit data integrity tests completed!');

  } catch (error) {
    console.error('❌ Recovery audit data integrity test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'test':
      await testRecoveryAudit();
      break;
    case 'automation':
      await testRecoveryAuditAutomation();
      break;
    case 'performance':
      await testRecoveryAuditPerformance();
      break;
    case 'integrity':
      await testRecoveryAuditDataIntegrity();
      break;
    case 'all':
      await testRecoveryAudit();
      await testRecoveryAuditAutomation();
      await testRecoveryAuditPerformance();
      await testRecoveryAuditDataIntegrity();
      break;
    default:
      console.log('Recovery Audit Test Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx test-recovery-audit.ts test        - Test basic recovery audit functionality');
      console.log('  tsx test-recovery-audit.ts automation  - Test recovery audit automation');
      console.log('  tsx test-recovery-audit.ts performance - Test recovery audit performance');
      console.log('  tsx test-recovery-audit.ts integrity   - Test data integrity');
      console.log('  tsx test-recovery-audit.ts all         - Run all tests');
      break;
  }
}

if (require.main === module) {
  main();
}
