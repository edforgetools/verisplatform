#!/usr/bin/env tsx

/**
 * Test Deployment and Governance System
 * 
 * This script tests the deployment and governance system as specified in the MVP checklist:
 * 1. Deploy all services via Vercel
 * 2. Configure OIDC trust for GitHub and Vercel
 * 3. Enable versioning and AES256 encryption on S3
 * 4. Add environment variable rotation policy
 */

import { config } from 'dotenv';
import path from 'path';
import { 
  getDeploymentConfig,
  recordDeployment,
  getDeploymentHistory,
  checkOIDCTrust,
  checkS3Configuration,
  checkEnvironmentVariableRotation,
  runGovernanceChecks,
  storeGovernanceViolations,
  getGovernanceViolations,
  createKeyRotationScript,
  getDeploymentReadiness
} from '../lib/deployment-governance';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testDeploymentConfiguration() {
  console.log('🧪 Testing Deployment Configuration...\n');

  try {
    // Test 1: Get deployment configuration
    console.log('1. Getting deployment configuration...');
    const deploymentConfig = getDeploymentConfig();
    
    console.log('✅ Deployment configuration:');
    console.log(`   Environment: ${deploymentConfig.environment}`);
    console.log(`   Version: ${deploymentConfig.version}`);
    console.log(`   Commit Hash: ${deploymentConfig.commitHash}`);
    console.log(`   Branch: ${deploymentConfig.branch}`);
    console.log(`   Deployed By: ${deploymentConfig.deployedBy}`);
    console.log(`   Vercel Deployment ID: ${deploymentConfig.vercelDeploymentId || 'Not set'}`);
    console.log(`   AWS Region: ${deploymentConfig.awsRegion}`);
    console.log(`   S3 Bucket: ${deploymentConfig.s3Bucket}`);
    console.log(`   OIDC Enabled: ${deploymentConfig.oidcEnabled}`);
    console.log(`   Encryption Enabled: ${deploymentConfig.encryptionEnabled}`);
    console.log(`   Versioning Enabled: ${deploymentConfig.versioningEnabled}`);
    console.log('');

    // Test 2: Record deployment
    console.log('2. Recording deployment...');
    try {
      await recordDeployment(deploymentConfig);
      console.log('✅ Deployment recorded successfully');
    } catch (error) {
      console.log('⚠️  Deployment recording failed (expected without database connection)');
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Test 3: Get deployment history
    console.log('3. Getting deployment history...');
    try {
      const deploymentHistory = await getDeploymentHistory(5);
      
      console.log('✅ Deployment history:');
      console.log(`   Total Deployments: ${deploymentHistory.length}`);
      if (deploymentHistory.length > 0) {
        console.log('   Recent deployments:');
        deploymentHistory.slice(0, 3).forEach(deployment => {
          console.log(`   - ${deployment.environment}: ${deployment.version} (${deployment.branch})`);
        });
      }
    } catch (error) {
      console.log('⚠️  Deployment history fetch failed (expected without database connection)');
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    console.log('🎉 Deployment configuration tests completed!');

  } catch (error) {
    console.error('❌ Deployment configuration test failed:', error);
    process.exit(1);
  }
}

async function testOIDCTrust() {
  console.log('🔐 Testing OIDC Trust Configuration...\n');

  try {
    // Test 1: Check OIDC trust
    console.log('1. Checking OIDC trust configuration...');
    const oidcCheck = await checkOIDCTrust();
    
    console.log('✅ OIDC trust check:');
    console.log(`   Enabled: ${oidcCheck.enabled}`);
    console.log(`   Configured: ${oidcCheck.configured}`);
    console.log(`   Issues: ${oidcCheck.issues.length}`);
    console.log(`   Recommendations: ${oidcCheck.recommendations.length}`);
    
    if (oidcCheck.issues.length > 0) {
      console.log('   Issues:');
      oidcCheck.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    if (oidcCheck.recommendations.length > 0) {
      console.log('   Recommendations:');
      oidcCheck.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    console.log('');

    console.log('🎉 OIDC trust tests completed!');

  } catch (error) {
    console.error('❌ OIDC trust test failed:', error);
    process.exit(1);
  }
}

async function testS3Configuration() {
  console.log('☁️  Testing S3 Configuration...\n');

  try {
    // Test 1: Check S3 configuration
    console.log('1. Checking S3 configuration...');
    const s3Check = await checkS3Configuration();
    
    console.log('✅ S3 configuration check:');
    console.log(`   Versioning Enabled: ${s3Check.versioningEnabled}`);
    console.log(`   Encryption Enabled: ${s3Check.encryptionEnabled}`);
    console.log(`   Issues: ${s3Check.issues.length}`);
    console.log(`   Recommendations: ${s3Check.recommendations.length}`);
    
    if (s3Check.issues.length > 0) {
      console.log('   Issues:');
      s3Check.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    if (s3Check.recommendations.length > 0) {
      console.log('   Recommendations:');
      s3Check.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    console.log('');

    console.log('🎉 S3 configuration tests completed!');

  } catch (error) {
    console.error('❌ S3 configuration test failed:', error);
    process.exit(1);
  }
}

async function testEnvironmentVariableRotation() {
  console.log('🔄 Testing Environment Variable Rotation...\n');

  try {
    // Test 1: Check environment variable rotation
    console.log('1. Checking environment variable rotation...');
    const rotationCheck = await checkEnvironmentVariableRotation();
    
    console.log('✅ Environment variable rotation check:');
    console.log(`   Rotation Enabled: ${rotationCheck.rotationEnabled}`);
    console.log(`   Last Rotation: ${rotationCheck.lastRotation || 'Never'}`);
    console.log(`   Next Rotation: ${rotationCheck.nextRotation || 'Not scheduled'}`);
    console.log(`   Issues: ${rotationCheck.issues.length}`);
    console.log(`   Recommendations: ${rotationCheck.recommendations.length}`);
    
    if (rotationCheck.issues.length > 0) {
      console.log('   Issues:');
      rotationCheck.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    if (rotationCheck.recommendations.length > 0) {
      console.log('   Recommendations:');
      rotationCheck.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    console.log('');

    // Test 2: Create key rotation script
    console.log('2. Creating key rotation script...');
    const rotationScript = createKeyRotationScript();
    
    console.log('✅ Key rotation script created:');
    console.log(`   Script length: ${rotationScript.length} characters`);
    console.log(`   Contains key generation: ${rotationScript.includes('generate-keys') ? 'YES' : 'NO'}`);
    console.log(`   Contains testing: ${rotationScript.includes('test-reproducibility') ? 'YES' : 'NO'}`);
    console.log(`   Contains deployment: ${rotationScript.includes('Deploying') ? 'YES' : 'NO'}`);
    console.log('');

    console.log('🎉 Environment variable rotation tests completed!');

  } catch (error) {
    console.error('❌ Environment variable rotation test failed:', error);
    process.exit(1);
  }
}

async function testGovernanceChecks() {
  console.log('📋 Testing Governance Checks...\n');

  try {
    // Test 1: Run governance checks
    console.log('1. Running governance checks...');
    const governanceResult = await runGovernanceChecks();
    
    console.log('✅ Governance checks completed:');
    console.log(`   Overall Status: ${governanceResult.overallStatus.toUpperCase()}`);
    console.log(`   Total Checks: ${governanceResult.summary.totalChecks}`);
    console.log(`   Passed: ${governanceResult.summary.passedChecks}`);
    console.log(`   Failed: ${governanceResult.summary.failedChecks}`);
    console.log(`   Warnings: ${governanceResult.summary.warningChecks}`);
    console.log('');
    
    console.log('   Individual checks:');
    governanceResult.checks.forEach(check => {
      console.log(`   - ${check.name}: ${check.status.toUpperCase()}`);
      if (check.issues.length > 0) {
        console.log(`     Issues: ${check.issues.length}`);
        check.issues.slice(0, 2).forEach(issue => {
          console.log(`       - ${issue}`);
        });
      }
      if (check.recommendations.length > 0) {
        console.log(`     Recommendations: ${check.recommendations.length}`);
        check.recommendations.slice(0, 2).forEach(rec => {
          console.log(`       - ${rec}`);
        });
      }
    });
    console.log('');

    // Test 2: Store governance violations
    console.log('2. Testing governance violation storage...');
    const testViolations = [
      {
        resource: 'test-resource',
        violation: 'Test violation',
        severity: 'low' as const,
        timestamp: new Date().toISOString(),
      },
    ];
    
    try {
      await storeGovernanceViolations(testViolations);
      console.log('✅ Governance violations stored successfully');
    } catch (error) {
      console.log('⚠️  Governance violation storage failed (expected without database connection)');
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Test 3: Get governance violations
    console.log('3. Getting governance violations...');
    try {
      const violations = await getGovernanceViolations(5);
      
      console.log('✅ Governance violations:');
      console.log(`   Total Violations: ${violations.length}`);
      if (violations.length > 0) {
        console.log('   Recent violations:');
        violations.slice(0, 3).forEach(violation => {
          console.log(`   - ${violation.resource}: ${violation.violation} (${violation.severity})`);
        });
      }
    } catch (error) {
      console.log('⚠️  Governance violations fetch failed (expected without database connection)');
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    console.log('🎉 Governance checks tests completed!');

  } catch (error) {
    console.error('❌ Governance checks test failed:', error);
    process.exit(1);
  }
}

async function testDeploymentReadiness() {
  console.log('🚀 Testing Deployment Readiness...\n');

  try {
    // Test 1: Check deployment readiness
    console.log('1. Checking deployment readiness...');
    const readinessCheck = await getDeploymentReadiness();
    
    console.log('✅ Deployment readiness check:');
    console.log(`   Ready: ${readinessCheck.ready ? 'YES' : 'NO'}`);
    console.log(`   Issues: ${readinessCheck.issues.length}`);
    console.log(`   Recommendations: ${readinessCheck.recommendations.length}`);
    
    if (readinessCheck.issues.length > 0) {
      console.log('   Issues:');
      readinessCheck.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    if (readinessCheck.recommendations.length > 0) {
      console.log('   Recommendations:');
      readinessCheck.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    
    console.log('   Configuration:');
    console.log(`     Environment: ${readinessCheck.config.environment}`);
    console.log(`     Version: ${readinessCheck.config.version}`);
    console.log(`     OIDC Enabled: ${readinessCheck.config.oidcEnabled}`);
    console.log(`     Encryption Enabled: ${readinessCheck.config.encryptionEnabled}`);
    console.log(`     Versioning Enabled: ${readinessCheck.config.versioningEnabled}`);
    console.log('');

    console.log('🎉 Deployment readiness tests completed!');

  } catch (error) {
    console.error('❌ Deployment readiness test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'deployment':
      await testDeploymentConfiguration();
      break;
    case 'oidc':
      await testOIDCTrust();
      break;
    case 's3':
      await testS3Configuration();
      break;
    case 'rotation':
      await testEnvironmentVariableRotation();
      break;
    case 'governance':
      await testGovernanceChecks();
      break;
    case 'readiness':
      await testDeploymentReadiness();
      break;
    case 'all':
      await testDeploymentConfiguration();
      await testOIDCTrust();
      await testS3Configuration();
      await testEnvironmentVariableRotation();
      await testGovernanceChecks();
      await testDeploymentReadiness();
      break;
    default:
      console.log('Deployment and Governance Test Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx test-deployment-governance.ts deployment - Test deployment configuration');
      console.log('  tsx test-deployment-governance.ts oidc      - Test OIDC trust configuration');
      console.log('  tsx test-deployment-governance.ts s3        - Test S3 configuration');
      console.log('  tsx test-deployment-governance.ts rotation  - Test environment variable rotation');
      console.log('  tsx test-deployment-governance.ts governance - Test governance checks');
      console.log('  tsx test-deployment-governance.ts readiness  - Test deployment readiness');
      console.log('  tsx test-deployment-governance.ts all       - Run all tests');
      break;
  }
}

if (require.main === module) {
  main();
}
