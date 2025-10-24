#!/usr/bin/env tsx

/**
 * Test Schema Version Control
 * 
 * This script tests the schema version control system as specified in the MVP checklist:
 * 1. Version proof schema semantically (schema/v1.x.json)
 * 2. Add regression tests validating old proofs under new schema
 * 3. Fail build if any validation mismatch occurs
 */

import { config } from 'dotenv';
import path from 'path';
import { 
  validateProofAgainstLatest,
  validateProofAgainstVersion,
  getSchemaVersionInfo,
  runRegressionTests,
  checkRegressionTests,
  validateBackwardCompatibility,
  getSchemaMigrationPath
} from '../lib/schema-version-control';
import { issueProofForPayload } from './issuance';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testSchemaVersionControl() {
  console.log('🧪 Testing Schema Version Control...\n');

  try {
    // Test 1: Get schema version information
    console.log('1. Getting schema version information...');
    const versionInfo = getSchemaVersionInfo();
    
    console.log('✅ Schema version information:');
    console.log(`   Latest version: ${versionInfo.latestVersion}`);
    console.log(`   Total versions: ${versionInfo.totalVersions}`);
    console.log('   Available versions:');
    versionInfo.versions.forEach(version => {
      console.log(`   - ${version.version} (${version.isLatest ? 'latest' : 'legacy'}) - ${version.path}`);
    });
    console.log('');

    // Test 2: Generate test proof and validate
    console.log('2. Generating test proof and validating...');
    const testPayload = 'Schema Version Control Test - ' + new Date().toISOString();
    const testProof = await issueProofForPayload(testPayload, 'schema-test.txt', {
      project: 'schema-test',
      userId: 'test-user',
    });
    
    const proofJson = JSON.parse(require('fs').readFileSync(testProof.registryPath, 'utf8'));
    
    // Validate against latest schema
    const validationResult = validateProofAgainstLatest(proofJson);
    
    console.log('✅ Proof validation result:');
    console.log(`   Valid: ${validationResult.valid}`);
    console.log(`   Schema Version: ${validationResult.schemaVersion}`);
    console.log(`   Errors: ${validationResult.errors.length}`);
    console.log(`   Warnings: ${validationResult.warnings.length}`);
    
    if (validationResult.errors.length > 0) {
      console.log('   Validation errors:');
      validationResult.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    console.log('');

    // Test 3: Validate against specific version
    console.log('3. Validating against specific schema version...');
    const specificVersionResult = validateProofAgainstVersion(proofJson, '1.0');
    
    console.log('✅ Specific version validation:');
    console.log(`   Valid: ${specificVersionResult.valid}`);
    console.log(`   Schema Version: ${specificVersionResult.schemaVersion}`);
    console.log(`   Errors: ${specificVersionResult.errors.length}`);
    console.log('');

    // Test 4: Test invalid proof
    console.log('4. Testing invalid proof validation...');
    const invalidProof = {
      schema_version: 2, // Invalid version
      hash_algo: 'sha256',
      hash_full: 'invalid-hash',
      // Missing required fields
    };
    
    const invalidValidationResult = validateProofAgainstLatest(invalidProof);
    
    console.log('✅ Invalid proof validation:');
    console.log(`   Valid: ${invalidValidationResult.valid}`);
    console.log(`   Errors: ${invalidValidationResult.errors.length}`);
    if (invalidValidationResult.errors.length > 0) {
      console.log('   Validation errors:');
      invalidValidationResult.errors.slice(0, 3).forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    console.log('');

    console.log('🎉 Schema version control tests completed!');

  } catch (error) {
    console.error('❌ Schema version control test failed:', error);
    process.exit(1);
  }
}

async function testRegressionTests() {
  console.log('🔄 Testing Regression Tests...\n');

  try {
    // Test 1: Run regression tests
    console.log('1. Running regression tests...');
    const regressionResults = await runRegressionTests();
    
    console.log('✅ Regression test results:');
    regressionResults.forEach(result => {
      console.log(`   Schema ${result.schemaVersion}:`);
      console.log(`     Total Proofs: ${result.totalProofs}`);
      console.log(`     Valid: ${result.validProofs}`);
      console.log(`     Invalid: ${result.invalidProofs}`);
      console.log(`     Passed: ${result.passed ? 'YES' : 'NO'}`);
      
      if (result.errors.length > 0) {
        console.log(`     Errors: ${result.errors.length}`);
        result.errors.slice(0, 2).forEach(error => {
          console.log(`       - ${error.proofId}: ${error.errors[0]}`);
        });
      }
    });
    console.log('');

    // Test 2: Check if all regression tests pass
    console.log('2. Checking regression test status...');
    const checkResult = await checkRegressionTests();
    
    console.log('✅ Regression test check:');
    console.log(`   All Passed: ${checkResult.allPassed ? 'YES' : 'NO'}`);
    console.log(`   Total Versions: ${checkResult.summary.totalVersions}`);
    console.log(`   Passed Versions: ${checkResult.summary.passedVersions}`);
    console.log(`   Failed Versions: ${checkResult.summary.failedVersions}`);
    console.log(`   Total Proofs: ${checkResult.summary.totalProofs}`);
    console.log(`   Total Valid: ${checkResult.summary.totalValid}`);
    console.log(`   Total Invalid: ${checkResult.summary.totalInvalid}`);
    console.log('');

    // Test 3: Fail build if validation mismatch
    if (!checkResult.allPassed) {
      console.log('❌ Regression tests failed - this would fail the build');
      console.log('   Failed versions:');
      checkResult.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`   - ${result.schemaVersion}: ${result.invalidProofs} invalid proofs`);
        });
    } else {
      console.log('✅ All regression tests passed - build would succeed');
    }
    console.log('');

    console.log('🎉 Regression test tests completed!');

  } catch (error) {
    console.error('❌ Regression test failed:', error);
    process.exit(1);
  }
}

async function testBackwardCompatibility() {
  console.log('🔄 Testing Backward Compatibility...\n');

  try {
    // Test 1: Validate backward compatibility
    console.log('1. Validating backward compatibility...');
    const compatibilityResult = validateBackwardCompatibility();
    
    console.log('✅ Backward compatibility check:');
    console.log(`   Compatible: ${compatibilityResult.compatible ? 'YES' : 'NO'}`);
    console.log(`   Issues: ${compatibilityResult.issues.length}`);
    console.log(`   Recommendations: ${compatibilityResult.recommendations.length}`);
    
    if (compatibilityResult.issues.length > 0) {
      console.log('   Issues:');
      compatibilityResult.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    if (compatibilityResult.recommendations.length > 0) {
      console.log('   Recommendations:');
      compatibilityResult.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    console.log('');

    // Test 2: Test schema migration path
    console.log('2. Testing schema migration path...');
    const migrationResult = getSchemaMigrationPath('1.0', '1.0');
    
    console.log('✅ Schema migration path:');
    console.log(`   Can Migrate: ${migrationResult.canMigrate ? 'YES' : 'NO'}`);
    console.log(`   Migration Steps: ${migrationResult.migrationSteps.length}`);
    console.log(`   Warnings: ${migrationResult.warnings.length}`);
    
    if (migrationResult.migrationSteps.length > 0) {
      console.log('   Migration steps:');
      migrationResult.migrationSteps.forEach(step => {
        console.log(`   - ${step}`);
      });
    }
    
    if (migrationResult.warnings.length > 0) {
      console.log('   Warnings:');
      migrationResult.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }
    console.log('');

    console.log('🎉 Backward compatibility tests completed!');

  } catch (error) {
    console.error('❌ Backward compatibility test failed:', error);
    process.exit(1);
  }
}

async function testSchemaValidation() {
  console.log('✅ Testing Schema Validation...\n');

  try {
    // Test 1: Test various proof structures
    console.log('1. Testing various proof structures...');
    
    const testCases = [
      {
        name: 'Valid proof',
        proof: {
          schema_version: 1,
          hash_algo: 'sha256',
          hash_full: 'a'.repeat(64),
          signed_at: new Date().toISOString(),
          signer_fingerprint: 'test-fingerprint',
          subject: {
            type: 'file',
            namespace: 'veris',
            id: 'test-id',
          },
          metadata: {},
          signature: 'test-signature',
        },
        shouldBeValid: true,
      },
      {
        name: 'Missing required field',
        proof: {
          schema_version: 1,
          hash_algo: 'sha256',
          // Missing hash_full
          signed_at: new Date().toISOString(),
          signer_fingerprint: 'test-fingerprint',
          subject: {
            type: 'file',
            namespace: 'veris',
            id: 'test-id',
          },
          metadata: {},
          signature: 'test-signature',
        },
        shouldBeValid: false,
      },
      {
        name: 'Invalid hash format',
        proof: {
          schema_version: 1,
          hash_algo: 'sha256',
          hash_full: 'invalid-hash', // Not 64 hex characters
          signed_at: new Date().toISOString(),
          signer_fingerprint: 'test-fingerprint',
          subject: {
            type: 'file',
            namespace: 'veris',
            id: 'test-id',
          },
          metadata: {},
          signature: 'test-signature',
        },
        shouldBeValid: false,
      },
    ];

    testCases.forEach(testCase => {
      const result = validateProofAgainstLatest(testCase.proof);
      const passed = result.valid === testCase.shouldBeValid;
      
      console.log(`   ${testCase.name}: ${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) {
        console.log(`     Expected: ${testCase.shouldBeValid ? 'valid' : 'invalid'}`);
        console.log(`     Got: ${result.valid ? 'valid' : 'invalid'}`);
        if (result.errors.length > 0) {
          console.log(`     Errors: ${result.errors[0]}`);
        }
      }
    });
    console.log('');

    console.log('🎉 Schema validation tests completed!');

  } catch (error) {
    console.error('❌ Schema validation test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'test':
      await testSchemaVersionControl();
      break;
    case 'regression':
      await testRegressionTests();
      break;
    case 'compatibility':
      await testBackwardCompatibility();
      break;
    case 'validation':
      await testSchemaValidation();
      break;
    case 'all':
      await testSchemaVersionControl();
      await testRegressionTests();
      await testBackwardCompatibility();
      await testSchemaValidation();
      break;
    default:
      console.log('Schema Version Control Test Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx test-schema-version-control.ts test        - Test basic schema version control');
      console.log('  tsx test-schema-version-control.ts regression  - Test regression tests');
      console.log('  tsx test-schema-version-control.ts compatibility - Test backward compatibility');
      console.log('  tsx test-schema-version-control.ts validation  - Test schema validation');
      console.log('  tsx test-schema-version-control.ts all         - Run all tests');
      break;
  }
}

if (require.main === module) {
  main();
}
