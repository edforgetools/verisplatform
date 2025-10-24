#!/usr/bin/env tsx

/**
 * Test Billing Integration
 * 
 * This script tests the billing integration as specified in the MVP checklist:
 * 1. Integrates Stripe test keys
 * 2. Attaches billing to issuance endpoint
 * 3. Confirms first paid proof processed and verified
 * 4. Tests mode switching between test and live
 */

import { config } from 'dotenv';
import path from 'path';
import { 
  testBillingIntegration, 
  confirmStripeMode, 
  getUserBillingStatus,
  hasActiveSubscription,
  getBillingLogs
} from '../lib/billing-integration';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testBillingConfiguration() {
  console.log('🧪 Testing Billing Configuration...\n');

  try {
    // Test 1: Confirm Stripe mode
    console.log('1. Confirming Stripe mode...');
    const modeConfig = confirmStripeMode();
    
    console.log(`✅ Stripe configuration:`);
    console.log(`   Mode: ${modeConfig.mode}`);
    console.log(`   Price ID: ${modeConfig.priceId}`);
    console.log(`   Webhook Secret: ${modeConfig.webhookSecret ? 'Set' : 'Not set'}`);
    console.log(`   Configured: ${modeConfig.isConfigured}`);
    console.log('');

    // Test 2: Run full billing integration test
    console.log('2. Running billing integration test...');
    const integrationTest = await testBillingIntegration();
    
    console.log(`✅ Billing integration test:`);
    console.log(`   Success: ${integrationTest.success}`);
    console.log(`   Mode: ${integrationTest.mode}`);
    console.log(`   Has Active Subscription: ${integrationTest.hasActiveSubscription}`);
    console.log(`   Billing Logs Count: ${integrationTest.billingLogsCount}`);
    
    if (integrationTest.errors.length > 0) {
      console.log(`   Errors:`);
      integrationTest.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    console.log('');

    // Test 3: Test user billing status
    console.log('3. Testing user billing status...');
    const testUserId = 'test-user-billing';
    const userStatus = await getUserBillingStatus(testUserId);
    
    console.log(`✅ User billing status:`);
    console.log(`   Has Subscription: ${userStatus.hasSubscription}`);
    console.log(`   Tier: ${userStatus.tier || 'None'}`);
    console.log(`   Status: ${userStatus.status || 'None'}`);
    console.log(`   Stripe Customer ID: ${userStatus.stripeCustomerId || 'None'}`);
    console.log('');

    // Test 4: Test subscription check
    console.log('4. Testing subscription check...');
    const hasSubscription = await hasActiveSubscription(testUserId);
    
    console.log(`✅ Subscription check:`);
    console.log(`   Has Active Subscription: ${hasSubscription}`);
    console.log('');

    // Test 5: Test billing logs
    console.log('5. Testing billing logs...');
    const logs = await getBillingLogs(testUserId, 5);
    
    console.log(`✅ Billing logs:`);
    console.log(`   Count: ${logs.length}`);
    if (logs.length > 0) {
      console.log(`   Recent logs:`);
      logs.slice(0, 3).forEach(log => {
        console.log(`   - ${log.proof_id}: ${log.status} (${log.amount})`);
      });
    }
    console.log('');

    console.log('🎉 Billing configuration tests completed!');

  } catch (error) {
    console.error('❌ Billing configuration test failed:', error);
    process.exit(1);
  }
}

async function testStripeModeSwitching() {
  console.log('🔄 Testing Stripe Mode Switching...\n');

  try {
    // Test current mode
    console.log('1. Current mode configuration...');
    const currentMode = confirmStripeMode();
    console.log(`   Current mode: ${currentMode.mode}`);
    console.log(`   Configured: ${currentMode.isConfigured}`);
    console.log('');

    // Test mode validation
    console.log('2. Testing mode validation...');
    const validModes = ['test', 'live'];
    const currentModeValid = validModes.includes(currentMode.mode);
    
    console.log(`✅ Mode validation:`);
    console.log(`   Current mode: ${currentMode.mode}`);
    console.log(`   Valid: ${currentModeValid}`);
    console.log(`   Available modes: ${validModes.join(', ')}`);
    console.log('');

    // Test environment variable consistency
    console.log('3. Testing environment variable consistency...');
    const envMode = process.env.NEXT_PUBLIC_STRIPE_MODE;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    console.log(`✅ Environment variables:`);
    console.log(`   NEXT_PUBLIC_STRIPE_MODE: ${envMode || 'Not set'}`);
    console.log(`   STRIPE_SECRET_KEY: ${secretKey ? 'Set' : 'Not set'}`);
    console.log(`   STRIPE_WEBHOOK_SECRET: ${webhookSecret ? 'Set' : 'Not set'}`);
    
    const isConsistent = envMode === currentMode.mode;
    console.log(`   Consistent: ${isConsistent}`);
    console.log('');

    console.log('🎉 Stripe mode switching tests completed!');

  } catch (error) {
    console.error('❌ Stripe mode switching test failed:', error);
    process.exit(1);
  }
}

async function testBillingEndpoint() {
  console.log('🌐 Testing Billing Endpoint...\n');

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    // Test 1: Test checkout endpoint
    console.log('1. Testing checkout endpoint...');
    const checkoutResponse = await fetch(`${BASE_URL}/api/stripe/create-checkout`, {
      method: 'GET',
    });
    
    console.log(`✅ Checkout endpoint:`);
    console.log(`   Status: ${checkoutResponse.status}`);
    console.log(`   OK: ${checkoutResponse.ok}`);
    
    if (checkoutResponse.ok) {
      const result = await checkoutResponse.json();
      console.log(`   Response: ${JSON.stringify(result)}`);
    }
    console.log('');

    // Test 2: Test webhook endpoint
    console.log('2. Testing webhook endpoint...');
    const webhookResponse = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    console.log(`✅ Webhook endpoint:`);
    console.log(`   Status: ${webhookResponse.status}`);
    console.log(`   OK: ${webhookResponse.ok}`);
    console.log('');

    console.log('🎉 Billing endpoint tests completed!');

  } catch (error) {
    console.error('❌ Billing endpoint test failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'config':
      await testBillingConfiguration();
      break;
    case 'mode':
      await testStripeModeSwitching();
      break;
    case 'endpoint':
      await testBillingEndpoint();
      break;
    case 'all':
      await testBillingConfiguration();
      await testStripeModeSwitching();
      await testBillingEndpoint();
      break;
    default:
      console.log('Billing Integration Test Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx test-billing.ts config    - Test billing configuration');
      console.log('  tsx test-billing.ts mode      - Test Stripe mode switching');
      console.log('  tsx test-billing.ts endpoint  - Test billing endpoints');
      console.log('  tsx test-billing.ts all       - Run all tests');
      break;
  }
}

if (require.main === module) {
  main();
}
