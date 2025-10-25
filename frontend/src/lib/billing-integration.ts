/**
 * Billing Integration for Proof Issuance
 *
 * Implements the billing integration as specified in the MVP checklist:
 * 1. Wraps /api/issue with Stripe payment requirement
 * 2. Records transaction ID in billing_logs table
 * 3. Includes env STRIPE_MODE='test' or 'live'
 * 4. Adds helper script to confirm current mode
 */

import { stripe } from "./stripe";
import { supabaseService } from "./db";
import { logger } from "./logger";
import { recordBillingEvent } from "./billing-service";
import { BillingEvent } from "./pricing_rules";

export interface BillingConfig {
  mode: "test" | "live";
  priceId: string;
  webhookSecret: string;
  usagePriceId?: string;
}

export interface ProofBillingRequest {
  userId: string;
  file: File;
  project?: string;
  customerEmail?: string;
}

export interface ProofBillingResponse {
  proofId: string;
  hash: string;
  timestamp: string;
  url: string;
  billingStatus: "free" | "paid" | "pending";
  transactionId?: string;
  checkoutUrl?: string;
}

/**
 * Get billing configuration from environment
 */
export function getBillingConfig(): BillingConfig {
  const mode = (process.env.NEXT_PUBLIC_STRIPE_MODE || "test") as "test" | "live";
  const priceId = process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const usagePriceId = process.env.STRIPE_USAGE_PRICE_ID;

  if (!priceId || !webhookSecret) {
    throw new Error("Missing required Stripe configuration");
  }

  return {
    mode,
    priceId,
    webhookSecret,
    usagePriceId,
  };
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const svc = supabaseService();

  const { data: billing, error } = await svc
    .from("billing")
    .select("status, stripe_subscription_id")
    .eq("user_id", userId)
    .single();

  if (error || !billing) {
    return false;
  }

  // Check if subscription is active
  return billing.status === "active" && !!billing.stripe_subscription_id;
}

/**
 * Get user's billing status
 */
export async function getUserBillingStatus(userId: string): Promise<{
  hasSubscription: boolean;
  tier: string | null;
  status: string | null;
  stripeCustomerId: string | null;
}> {
  const svc = supabaseService();

  const { data: user, error: userError } = await svc
    .from("app_users")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  const { data: billing, error: billingError } = await svc
    .from("billing")
    .select("tier, status")
    .eq("user_id", userId)
    .single();

  return {
    hasSubscription: !billingError && billing?.status === "active",
    tier: billing?.tier || null,
    status: billing?.status || null,
    stripeCustomerId: user?.stripe_customer_id || null,
  };
}

/**
 * Create proof with billing integration
 */
export async function createProofWithBilling(
  request: ProofBillingRequest,
): Promise<ProofBillingResponse> {
  const { userId, file, project, customerEmail } = request;
  const config = getBillingConfig();

  // Check if user has active subscription
  const billingStatus = await getUserBillingStatus(userId);

  if (billingStatus.hasSubscription) {
    // User has active subscription, create proof directly
    return await createPaidProof(userId, file, project);
  } else {
    // User needs to pay, create checkout session
    return await createCheckoutForProof(userId, file, project, customerEmail);
  }
}

/**
 * Create proof for paid user
 */
async function createPaidProof(
  userId: string,
  file: File,
  project?: string,
): Promise<ProofBillingResponse> {
  // Create the proof using the existing API
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  if (project) {
    formData.append("project", project);
  }

  const response = await fetch("/api/proof/create", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to create proof: ${response.statusText}`);
  }

  const result = await response.json();

  // Record billing event
  await recordBillingEvent({
    type: "proof.create",
    userId,
    proofId: result.id,
    success: true,
    metadata: {
      file_name: file.name,
      project,
      billing_status: "paid",
    },
  });

  return {
    proofId: result.id,
    hash: result.hash_prefix,
    timestamp: result.timestamp,
    url: result.url,
    billingStatus: "paid",
  };
}

/**
 * Create checkout session for proof creation
 */
async function createCheckoutForProof(
  userId: string,
  file: File,
  project?: string,
  customerEmail?: string,
): Promise<ProofBillingResponse> {
  const config = getBillingConfig();

  // Create checkout session
  const checkoutResponse = await fetch("/api/stripe/create-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      priceId: config.priceId,
      userId,
      customerEmail,
    }),
  });

  if (!checkoutResponse.ok) {
    throw new Error(`Failed to create checkout session: ${checkoutResponse.statusText}`);
  }

  const checkoutResult = await checkoutResponse.json();

  // Store pending proof information
  const pendingProofId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const svc = supabaseService();
  await svc.from("billing_logs").insert({
    user_id: userId,
    proof_id: pendingProofId,
    transaction_id: checkoutResult.session_id,
    amount: 0, // Will be updated after payment
    status: "pending",
    metadata: {
      file_name: file.name,
      project,
      checkout_url: checkoutResult.url,
    },
  });

  return {
    proofId: pendingProofId,
    hash: "pending",
    timestamp: new Date().toISOString(),
    url: `/proof/${pendingProofId}`,
    billingStatus: "pending",
    transactionId: checkoutResult.session_id,
    checkoutUrl: checkoutResult.url,
  };
}

/**
 * Handle successful payment and create proof
 */
export async function handlePaymentSuccess(sessionId: string, userId: string): Promise<void> {
  const config = getBillingConfig();
  const stripe = new (await import("stripe")).default(config.webhookSecret);

  try {
    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Update billing status
    const svc = supabaseService();
    await svc.from("billing").upsert({
      user_id: userId,
      stripe_subscription_id: session.subscription as string,
      tier: "pro",
      status: "active",
      updated_at: new Date().toISOString(),
    });

    // Update billing logs
    await svc
      .from("billing_logs")
      .update({
        status: "completed",
        amount: session.amount_total || 0,
        completed_at: new Date().toISOString(),
      })
      .eq("transaction_id", sessionId);

    logger.info(
      {
        userId,
        sessionId,
        amount: session.amount_total,
      },
      "Payment processed successfully",
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        sessionId,
        userId,
      },
      "Failed to process payment success",
    );
    throw error;
  }
}

/**
 * Get billing logs for a user
 */
export async function getBillingLogs(
  userId: string,
  limit: number = 50,
): Promise<
  Array<{
    id: string;
    proof_id: string;
    transaction_id: string;
    amount: number;
    status: string;
    created_at: string;
    completed_at: string | null;
    metadata: any;
  }>
> {
  const svc = supabaseService();

  const { data: logs, error } = await svc
    .from("billing_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch billing logs: ${error.message}`);
  }

  return logs || [];
}

/**
 * Confirm current Stripe mode
 */
export function confirmStripeMode(): {
  mode: "test" | "live";
  priceId: string;
  webhookSecret: string;
  isConfigured: boolean;
} {
  try {
    const config = getBillingConfig();
    return {
      ...config,
      isConfigured: true,
    };
  } catch (error) {
    return {
      mode: "test",
      priceId: "",
      webhookSecret: "",
      isConfigured: false,
    };
  }
}

/**
 * Test billing integration
 */
export async function testBillingIntegration(): Promise<{
  success: boolean;
  mode: string;
  hasActiveSubscription: boolean;
  billingLogsCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let userHasActiveSubscription = false;
  let billingLogsCount = 0;

  try {
    // Test configuration
    const config = confirmStripeMode();
    if (!config.isConfigured) {
      errors.push("Billing configuration incomplete");
    }

    // Test database connection
    const svc = supabaseService();
    const { error: dbError } = await svc.from("billing_logs").select("count").limit(1);
    if (dbError) {
      errors.push(`Database error: ${dbError.message}`);
    }

    // Test Stripe connection
    try {
      const stripe = new (await import("stripe")).default(config.webhookSecret);
      await stripe.prices.retrieve(config.priceId);
    } catch (stripeError) {
      errors.push(
        `Stripe error: ${stripeError instanceof Error ? stripeError.message : stripeError}`,
      );
    }

    // Test with a dummy user
    const testUserId = "test-user-billing";
    userHasActiveSubscription = await hasActiveSubscription(testUserId);

    const logs = await getBillingLogs(testUserId, 1);
    billingLogsCount = logs.length;
  } catch (error) {
    errors.push(`Test error: ${error instanceof Error ? error.message : error}`);
  }

  return {
    success: errors.length === 0,
    mode: confirmStripeMode().mode,
    hasActiveSubscription: userHasActiveSubscription,
    billingLogsCount,
    errors,
  };
}
