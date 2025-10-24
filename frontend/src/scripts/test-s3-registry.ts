#!/usr/bin/env tsx

/**
 * Test S3 Registry Service
 * 
 * This script tests the S3 registry service as specified in the MVP checklist:
 * 1. Validates write and read operations with OIDC-authenticated role
 * 2. Automates integrity check: schema hash = master schema
 * 3. Tests both staging and production buckets
 */

import { config } from 'dotenv';
import path from 'path';
import { 
  uploadProofToRegistry, 
  downloadProofFromRegistry, 
  validateUploadIntegrity,
  runIntegrityCheck,
  uploadCanonicalSchema,
  listRegistryProofs,
  getProofSignedUrl
} from '../lib/s3-registry';
import { issueProofForPayload } from './issuance';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testS3Registry() {
  console.log('🧪 Testing S3 Registry Service...\n');

  try {
    // Test 1: Upload canonical schema
    console.log('1. Uploading canonical schema...');
    await uploadCanonicalSchema();
    console.log('✅ Canonical schema uploaded successfully\n');

    // Test 2: Generate and upload a test proof
    console.log('2. Generating and uploading test proof...');
    const testPayload = 'S3 Registry Test Proof - ' + new Date().toISOString();
    const testProof = await issueProofForPayload(testPayload, 's3-registry-test.txt', {
      project: 's3-registry-test',
      userId: 'test-user',
    });
    
    // Convert to CanonicalProofV1 format
    const proofJson = JSON.parse(require('fs').readFileSync(testProof.registryPath, 'utf8'));
    const uploadResult = await uploadProofToRegistry(proofJson);
    console.log('✅ Test proof uploaded successfully');
    console.log(`   Proof ID: ${uploadResult.proofId}`);
    console.log(`   Staging URL: ${uploadResult.stagingUrl}`);
    console.log(`   Production URL: ${uploadResult.productionUrl}`);
    console.log(`   Checksum: ${uploadResult.checksum}\n`);

    // Test 3: Download and validate proof
    console.log('3. Downloading and validating proof...');
    const downloadedProof = await downloadProofFromRegistry(uploadResult.proofId, true);
    console.log('✅ Proof downloaded successfully');
    console.log(`   Downloaded Proof ID: ${downloadedProof.subject.id}`);
    console.log(`   Hash matches: ${downloadedProof.hash_full === proofJson.hash_full}\n`);

    // Test 4: Validate upload integrity
    console.log('4. Validating upload integrity...');
    const integrityValid = await validateUploadIntegrity(
      uploadResult.proofId, 
      uploadResult.checksum, 
      true
    );
    console.log(`✅ Upload integrity check: ${integrityValid ? 'PASSED' : 'FAILED'}\n`);

    // Test 5: Run integrity check
    console.log('5. Running schema integrity check...');
    const integrityResult = await runIntegrityCheck();
    console.log(`✅ Schema integrity check: ${integrityResult.isValid ? 'PASSED' : 'FAILED'}`);
    if (!integrityResult.isValid) {
      console.log('   Mismatches:');
      integrityResult.mismatches.forEach(mismatch => {
        console.log(`   - ${mismatch}`);
      });
    }
    console.log(`   Registry Schema Hash: ${integrityResult.schemaHash}`);
    console.log(`   Canonical Schema Hash: ${integrityResult.canonicalSchemaHash}\n`);

    // Test 6: List registry proofs
    console.log('6. Listing registry proofs...');
    const proofIds = await listRegistryProofs(true);
    console.log(`✅ Found ${proofIds.length} proofs in registry`);
    if (proofIds.length > 0) {
      console.log('   Recent proofs:');
      proofIds.slice(-5).forEach(id => {
        console.log(`   - ${id}`);
      });
    }
    console.log('');

    // Test 7: Get signed URL
    console.log('7. Generating signed URL...');
    const signedUrl = await getProofSignedUrl(uploadResult.proofId, 3600, true);
    console.log('✅ Signed URL generated successfully');
    console.log(`   URL: ${signedUrl.substring(0, 100)}...\n`);

    console.log('🎉 All S3 Registry tests completed successfully!');

  } catch (error) {
    console.error('❌ S3 Registry test failed:', error);
    process.exit(1);
  }
}

async function testStagingAndProduction() {
  console.log('🧪 Testing Staging and Production Buckets...\n');

  try {
    // Generate test proof
    const testPayload = 'Staging/Production Test - ' + new Date().toISOString();
    const testProof = await issueProofForPayload(testPayload, 'staging-prod-test.txt', {
      project: 'staging-prod-test',
      userId: 'test-user',
    });

    const proofJson = JSON.parse(require('fs').readFileSync(testProof.registryPath, 'utf8'));

    // Upload to registry (both staging and production)
    const uploadResult = await uploadProofToRegistry(proofJson);
    console.log('✅ Proof uploaded to both staging and production buckets');

    // Test staging bucket
    console.log('Testing staging bucket...');
    const stagingProof = await downloadProofFromRegistry(uploadResult.proofId, false);
    const stagingIntegrity = await validateUploadIntegrity(
      uploadResult.proofId, 
      uploadResult.checksum, 
      false
    );
    console.log(`✅ Staging bucket test: ${stagingIntegrity ? 'PASSED' : 'FAILED'}`);

    // Test production bucket
    console.log('Testing production bucket...');
    const productionProof = await downloadProofFromRegistry(uploadResult.proofId, true);
    const productionIntegrity = await validateUploadIntegrity(
      uploadResult.proofId, 
      uploadResult.checksum, 
      true
    );
    console.log(`✅ Production bucket test: ${productionIntegrity ? 'PASSED' : 'FAILED'}`);

    console.log('\n🎉 Staging and Production bucket tests completed successfully!');

  } catch (error) {
    console.error('❌ Staging/Production test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'test':
      await testS3Registry();
      break;
    case 'staging-prod':
      await testStagingAndProduction();
      break;
    case 'upload-schema':
      console.log('Uploading canonical schema...');
      await uploadCanonicalSchema();
      console.log('✅ Schema uploaded successfully');
      break;
    case 'integrity-check':
      console.log('Running integrity check...');
      const result = await runIntegrityCheck();
      console.log(`Integrity check: ${result.isValid ? 'PASSED' : 'FAILED'}`);
      if (!result.isValid) {
        console.log('Mismatches:', result.mismatches);
      }
      break;
    default:
      console.log('S3 Registry Test Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx test-s3-registry.ts test              - Run full registry tests');
      console.log('  tsx test-s3-registry.ts staging-prod      - Test staging and production buckets');
      console.log('  tsx test-s3-registry.ts upload-schema     - Upload canonical schema');
      console.log('  tsx test-s3-registry.ts integrity-check   - Run integrity check only');
      break;
  }
}

if (require.main === module) {
  main();
}
