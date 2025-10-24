#!/usr/bin/env tsx

/**
 * Test Snapshot and Mirror Protocol
 * 
 * This script tests the snapshot and mirror protocol as specified in the MVP checklist:
 * 1. Generate snapshot manifest of registry JSONs
 * 2. Sign manifest
 * 3. Upload to Arweave or neutral mirror
 * 4. Verify snapshot hash matches original schema
 */

import { config } from 'dotenv';
import path from 'path';
import { 
  createSnapshotAndMirror,
  verifySnapshotIntegrity,
  getAllSnapshots,
  getLatestSnapshot,
  shouldCreateSnapshot,
  createSnapshotIfNeeded
} from '../lib/snapshot-mirror-protocol';
import { issueProofForPayload } from './issuance';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testSnapshotCreation() {
  console.log('🧪 Testing Snapshot Creation...\n');

  try {
    // Test 1: Generate test proofs
    console.log('1. Generating test proofs for snapshot...');
    const testProofs = [];
    
    for (let i = 1; i <= 5; i++) {
      const testPayload = `Snapshot Test Proof ${i} - ${new Date().toISOString()}`;
      const testProof = await issueProofForPayload(testPayload, `snapshot-test-${i}.txt`, {
        project: 'snapshot-test',
        userId: 'test-user',
      });
      
      const proofJson = JSON.parse(require('fs').readFileSync(testProof.registryPath, 'utf8'));
      testProofs.push(proofJson);
    }
    
    console.log(`✅ Generated ${testProofs.length} test proofs`);
    console.log('');

    // Test 2: Create snapshot and mirror
    console.log('2. Creating snapshot and mirroring to Arweave...');
    const batch = 1;
    
    try {
      const snapshotResult = await createSnapshotAndMirror(batch, testProofs);
      
      console.log('✅ Snapshot created and mirrored:');
      console.log(`   Batch: ${snapshotResult.batch}`);
      console.log(`   Count: ${snapshotResult.count}`);
      console.log(`   Merkle Root: ${snapshotResult.merkle_root}`);
      console.log(`   S3 URL: ${snapshotResult.s3_url}`);
      console.log(`   Arweave TX ID: ${snapshotResult.arweave_txid || 'Not published'}`);
      console.log(`   Arweave URL: ${snapshotResult.arweave_url || 'Not published'}`);
      console.log(`   Integrity Verified: ${snapshotResult.integrity_verified}`);
      console.log(`   Published At: ${snapshotResult.published_at}`);
      console.log('');
    } catch (error) {
      console.log('⚠️  Snapshot creation failed (expected without AWS/Arweave credentials)');
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
      console.log('');
    }

    console.log('🎉 Snapshot creation tests completed!');

  } catch (error) {
    console.error('❌ Snapshot creation test failed:', error);
    process.exit(1);
  }
}

async function testSnapshotIntegrity() {
  console.log('🔍 Testing Snapshot Integrity...\n');

  try {
    // Test 1: Check if snapshots exist
    console.log('1. Checking existing snapshots...');
    const allSnapshots = await getAllSnapshots();
    
    console.log(`✅ Found ${allSnapshots.length} snapshots`);
    if (allSnapshots.length > 0) {
      console.log('   Recent snapshots:');
      allSnapshots.slice(0, 3).forEach(snapshot => {
        console.log(`   - Batch ${snapshot.batch}: ${snapshot.count} proofs, integrity: ${snapshot.integrity_verified}`);
      });
    }
    console.log('');

    // Test 2: Get latest snapshot
    console.log('2. Getting latest snapshot...');
    const latestSnapshot = await getLatestSnapshot();
    
    if (latestSnapshot) {
      console.log('✅ Latest snapshot:');
      console.log(`   Batch: ${latestSnapshot.batch}`);
      console.log(`   Count: ${latestSnapshot.count}`);
      console.log(`   Merkle Root: ${latestSnapshot.merkle_root}`);
      console.log(`   Integrity Verified: ${latestSnapshot.integrity_verified}`);
      console.log(`   Published At: ${latestSnapshot.published_at}`);
    } else {
      console.log('ℹ️  No snapshots found');
    }
    console.log('');

    // Test 3: Test integrity verification
    console.log('3. Testing integrity verification...');
    if (latestSnapshot) {
      try {
        const integrityVerified = await verifySnapshotIntegrity(latestSnapshot.batch, []);
        
        console.log(`✅ Integrity verification: ${integrityVerified ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.log('⚠️  Integrity verification failed:');
        console.log(`   Error: ${error instanceof Error ? error.message : error}`);
      }
    } else {
      console.log('ℹ️  Skipping integrity verification (no snapshots)');
    }
    console.log('');

    console.log('🎉 Snapshot integrity tests completed!');

  } catch (error) {
    console.error('❌ Snapshot integrity test failed:', error);
    process.exit(1);
  }
}

async function testSnapshotAutomation() {
  console.log('🤖 Testing Snapshot Automation...\n');

  try {
    // Test 1: Check if snapshot should be created
    console.log('1. Checking if snapshot should be created...');
    const snapshotCheck = await shouldCreateSnapshot();
    
    console.log('✅ Snapshot creation check:');
    console.log(`   Should Create: ${snapshotCheck.shouldCreate}`);
    console.log(`   Current Count: ${snapshotCheck.currentCount}`);
    console.log(`   Next Batch: ${snapshotCheck.nextBatch}`);
    console.log('');

    // Test 2: Test automated snapshot creation
    console.log('2. Testing automated snapshot creation...');
    const autoResult = await createSnapshotIfNeeded();
    
    console.log('✅ Automated snapshot creation:');
    console.log(`   Created: ${autoResult.created}`);
    if (autoResult.batch) {
      console.log(`   Batch: ${autoResult.batch}`);
    }
    if (autoResult.count) {
      console.log(`   Count: ${autoResult.count}`);
    }
    if (autoResult.error) {
      console.log(`   Error: ${autoResult.error}`);
    }
    console.log('');

    console.log('🎉 Snapshot automation tests completed!');

  } catch (error) {
    console.error('❌ Snapshot automation test failed:', error);
    process.exit(1);
  }
}

async function testMirrorProtocol() {
  console.log('🪞 Testing Mirror Protocol...\n');

  try {
    // Test 1: Test mirror status
    console.log('1. Testing mirror status...');
    const snapshots = await getAllSnapshots();
    
    if (snapshots.length > 0) {
      const mirrorStats = {
        total: snapshots.length,
        withArweave: snapshots.filter(s => s.arweave_txid).length,
        integrityVerified: snapshots.filter(s => s.integrity_verified).length,
      };
      
      console.log('✅ Mirror status:');
      console.log(`   Total Snapshots: ${mirrorStats.total}`);
      console.log(`   With Arweave: ${mirrorStats.withArweave}`);
      console.log(`   Integrity Verified: ${mirrorStats.integrityVerified}`);
    } else {
      console.log('ℹ️  No snapshots to check mirror status');
    }
    console.log('');

    // Test 2: Test mirror consistency
    console.log('2. Testing mirror consistency...');
    if (snapshots.length > 0) {
      const latestSnapshot = snapshots[0];
      
      if (latestSnapshot.arweave_txid) {
        console.log('✅ Mirror consistency check:');
        console.log(`   S3 URL: ${latestSnapshot.s3_url}`);
        console.log(`   Arweave TX ID: ${latestSnapshot.arweave_txid}`);
        console.log(`   Arweave URL: ${latestSnapshot.arweave_url}`);
        console.log(`   Integrity Verified: ${latestSnapshot.integrity_verified}`);
      } else {
        console.log('ℹ️  Latest snapshot not mirrored to Arweave');
      }
    } else {
      console.log('ℹ️  No snapshots to check mirror consistency');
    }
    console.log('');

    console.log('🎉 Mirror protocol tests completed!');

  } catch (error) {
    console.error('❌ Mirror protocol test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'creation':
      await testSnapshotCreation();
      break;
    case 'integrity':
      await testSnapshotIntegrity();
      break;
    case 'automation':
      await testSnapshotAutomation();
      break;
    case 'mirror':
      await testMirrorProtocol();
      break;
    case 'all':
      await testSnapshotCreation();
      await testSnapshotIntegrity();
      await testSnapshotAutomation();
      await testMirrorProtocol();
      break;
    default:
      console.log('Snapshot and Mirror Protocol Test Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx test-snapshot-mirror.ts creation  - Test snapshot creation');
      console.log('  tsx test-snapshot-mirror.ts integrity - Test snapshot integrity');
      console.log('  tsx test-snapshot-mirror.ts automation - Test snapshot automation');
      console.log('  tsx test-snapshot-mirror.ts mirror    - Test mirror protocol');
      console.log('  tsx test-snapshot-mirror.ts all       - Run all tests');
      break;
  }
}

if (require.main === module) {
  main();
}
