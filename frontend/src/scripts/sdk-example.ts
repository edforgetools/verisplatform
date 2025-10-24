#!/usr/bin/env tsx

/**
 * SDK Example Script
 * 
 * This script demonstrates external issuance and verification using the Veris SDK
 * as specified in the MVP checklist:
 * 1. Shows how to use the SDK for proof creation and verification
 * 2. Demonstrates third-party integration
 * 3. Validates the SDK functionality
 */

import { config } from 'dotenv';
import path from 'path';
import { VerisClient } from '../../packages/sdk-js/src/client';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function demonstrateSDKUsage() {
  console.log('🚀 Veris SDK Demonstration\n');

  // Initialize the SDK client
  const client = new VerisClient({
    baseUrl: BASE_URL,
    // In a real scenario, you would provide an API key for authenticated requests
    // apiKey: process.env.VERIS_API_KEY,
    timeout: 30000,
  });

  try {
    // Example 1: Create a proof (requires authentication in real scenario)
    console.log('1. Creating a proof...');
    const testFile = new File(['Hello, Veris SDK!'], 'sdk-test.txt', { type: 'text/plain' });
    
    try {
      const createResult = await client.createProof({
        file: testFile,
        userId: 'sdk-test-user',
        project: 'sdk-demo',
      });
      
      console.log('✅ Proof created successfully:');
      console.log(`   ID: ${createResult.id}`);
      console.log(`   Hash: ${createResult.hash_prefix}`);
      console.log(`   URL: ${createResult.url}`);
      console.log(`   Timestamp: ${createResult.timestamp}\n`);

      // Example 2: Verify the proof by hash
      console.log('2. Verifying proof by hash...');
      const verifyResult = await client.verifyProofByHash(createResult.hash_prefix);
      
      console.log('✅ Proof verification result:');
      console.log(`   Valid: ${verifyResult.valid}`);
      console.log(`   Source: ${verifyResult.source}`);
      console.log(`   Signer: ${verifyResult.signer}`);
      console.log(`   Latency: ${verifyResult.latency_ms}ms`);
      if (verifyResult.errors.length > 0) {
        console.log(`   Errors: ${verifyResult.errors.join(', ')}`);
      }
      console.log('');

      // Example 3: Get proof details
      console.log('3. Getting proof details...');
      const proofDetails = await client.getProof(createResult.id);
      
      console.log('✅ Proof details:');
      console.log(`   File: ${proofDetails.file_name}`);
      console.log(`   Project: ${proofDetails.project}`);
      console.log(`   Created: ${proofDetails.created_at}`);
      console.log('');

    } catch (error) {
      console.log('⚠️  Proof creation failed (expected without authentication)');
      console.log(`   Error: ${error instanceof Error ? error.message : error}\n`);
      
      // Continue with verification examples using a known hash
      console.log('Continuing with verification examples using a known hash...\n');
    }

    // Example 4: Verify by file upload
    console.log('4. Verifying by file upload...');
    const testFile2 = new File(['Another test file'], 'sdk-test-2.txt', { type: 'text/plain' });
    
    try {
      const fileVerifyResult = await client.verifyProofByFile(testFile2);
      
      console.log('✅ File verification result:');
      console.log(`   Valid: ${fileVerifyResult.valid}`);
      console.log(`   Source: ${fileVerifyResult.source}`);
      console.log(`   Latency: ${fileVerifyResult.latency_ms}ms`);
      if (fileVerifyResult.errors.length > 0) {
        console.log(`   Errors: ${fileVerifyResult.errors.join(', ')}`);
      }
      console.log('');
    } catch (error) {
      console.log('⚠️  File verification failed:');
      console.log(`   Error: ${error instanceof Error ? error.message : error}\n`);
    }

    // Example 5: Test with a known hash (from our test proofs)
    console.log('5. Testing with a known hash...');
    const knownHash = 'cd2894f3bbbf60bae462795dfde2fba08acdf604fb6357cda9d282eb3f1f364c';
    
    try {
      const knownHashResult = await client.verifyProofByHash(knownHash);
      
      console.log('✅ Known hash verification result:');
      console.log(`   Valid: ${knownHashResult.valid}`);
      console.log(`   Source: ${knownHashResult.source}`);
      console.log(`   Signer: ${knownHashResult.signer}`);
      console.log(`   Latency: ${knownHashResult.latency_ms}ms`);
      if (knownHashResult.errors.length > 0) {
        console.log(`   Errors: ${knownHashResult.errors.join(', ')}`);
      }
      console.log('');
    } catch (error) {
      console.log('⚠️  Known hash verification failed:');
      console.log(`   Error: ${error instanceof Error ? error.message : error}\n`);
    }

    // Example 6: Get system integrity information
    console.log('6. Getting system integrity information...');
    try {
      const integrityResult = await client.getLatestIntegrity();
      
      console.log('✅ Integrity information:');
      console.log(`   Batch: ${integrityResult.batch}`);
      console.log(`   Merkle Root: ${integrityResult.merkle_root}`);
      console.log(`   S3 URL: ${integrityResult.s3_url}`);
      console.log(`   Created: ${integrityResult.created_at}`);
      console.log('');
    } catch (error) {
      console.log('⚠️  Integrity check failed:');
      console.log(`   Error: ${error instanceof Error ? error.message : error}\n`);
    }

    // Example 7: Get system health
    console.log('7. Getting system health...');
    try {
      const healthResult = await client.getIntegrityHealth();
      
      console.log('✅ System health:');
      console.log(`   Status: ${healthResult.status}`);
      console.log(`   Total Proofs: ${healthResult.total_proofs}`);
      console.log(`   Issues: ${healthResult.issues.length > 0 ? healthResult.issues.join(', ') : 'None'}`);
      console.log('');
    } catch (error) {
      console.log('⚠️  Health check failed:');
      console.log(`   Error: ${error instanceof Error ? error.message : error}\n`);
    }

    console.log('🎉 SDK demonstration completed!');

  } catch (error) {
    console.error('❌ SDK demonstration failed:', error);
    process.exit(1);
  }
}

async function testSDKPerformance() {
  console.log('⚡ SDK Performance Test\n');

  const client = new VerisClient({
    baseUrl: BASE_URL,
    timeout: 30000,
  });

  const knownHash = 'cd2894f3bbbf60bae462795dfde2fba08acdf604fb6357cda9d282eb3f1f364c';
  const iterations = 10;

  try {
    const latencies: number[] = [];
    
    console.log(`Running ${iterations} verification requests...`);
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await client.verifyProofByHash(knownHash);
      const endTime = Date.now();
      
      const latency = endTime - startTime;
      latencies.push(latency);
      
      console.log(`Request ${i + 1}: ${latency}ms`);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    console.log('\n📊 Performance Results:');
    console.log(`   Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Min latency: ${minLatency}ms`);
    console.log(`   Max latency: ${maxLatency}ms`);
    console.log(`   Success rate: 100%`);

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'demo':
      await demonstrateSDKUsage();
      break;
    case 'performance':
      await testSDKPerformance();
      break;
    case 'all':
      await demonstrateSDKUsage();
      await testSDKPerformance();
      break;
    default:
      console.log('Veris SDK Example Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx sdk-example.ts demo        - Run SDK demonstration');
      console.log('  tsx sdk-example.ts performance - Run performance test');
      console.log('  tsx sdk-example.ts all         - Run all tests');
      break;
  }
}

if (require.main === module) {
  main();
}
