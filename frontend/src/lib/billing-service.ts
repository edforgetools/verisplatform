/**
 * Billing service for tracking and recording usage
 * Integrates with Stripe usage recording and pricing rules
 */

import { stripeConfig } from "./stripe";
import { shouldBill, BillingEvent } from "./pricing_rules";
import { supabaseService } from "./db";
import { logger } from "./logger";

/**
 * Record a billing event
 */
export async function recordBillingEvent(event: BillingEvent): Promise<void> {
  try {
    // Check if this event should be billed
    const shouldBillEvent = shouldBill(event);

    // Always record the event in telemetry
    await recordTelemetryEvent(event);

    // If it should be billed, record usage with Stripe
    if (shouldBillEvent) {
      await recordStripeUsage(event);
    }

    logger.info(
      {
        eventType: event.type,
        userId: event.userId,
        proofId: event.proofId,
        shouldBill: shouldBillEvent,
        success: event.success,
      },
      "Billing event recorded",
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        eventType: event.type,
        userId: event.userId,
      },
      "Failed to record billing event",
    );
    // Don't throw - billing failures shouldn't break the main flow
  }
}

/**
 * Record event in telemetry
 */
async function recordTelemetryEvent(event: BillingEvent): Promise<void> {
  const svc = supabaseService();

  await svc.from("telemetry").insert({
    user_id: event.userId,
    event: `billing.${event.type}`,
    value: shouldBill(event) ? 1 : 0,
    meta: {
      proof_id: event.proofId,
      success: event.success,
      should_bill: shouldBill(event),
      ...event.metadata,
    },
  });
}

/**
 * Record usage with Stripe
 */
async function recordStripeUsage(event: BillingEvent): Promise<void> {
  if (!event.proofId) {
    throw new Error("Proof ID required for billing");
  }

  // Get user's Stripe customer ID
  const svc = supabaseService();
  const { data: user, error } = await svc
    .from("app_users")
    .select("stripe_customer_id")
    .eq("user_id", event.userId)
    .single();

  if (error || !user?.stripe_customer_id) {
    throw new Error(`No Stripe customer found for user ${event.userId}`);
  }

  // Record usage with Stripe
  // This assumes you have a usage-based price configured in Stripe
  const priceId = stripeConfig.usagePriceId;
  if (!priceId) {
    throw new Error("STRIPE_USAGE_PRICE_ID environment variable not set");
  }

  // Note: This requires a subscription item ID, not a price ID
  // For now, we'll skip the usage recording until we have proper subscription management
  logger.warn({ priceId }, "Usage recording skipped - requires subscription item ID");
}

/**
 * Get billing metrics for a user
 */
export async function getBillingMetrics(
  userId: string,
  days: number = 30,
): Promise<{
  totalEvents: number;
  billableEvents: number;
  freeEvents: number;
  billableEventTypes: string[];
  eventsByType: Record<string, number>;
}> {
  const svc = supabaseService();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await svc
    .from("telemetry")
    .select("event, value, meta")
    .eq("user_id", userId)
    .gte("created_at", since)
    .like("event", "billing.%");

  if (error) {
    throw new Error(`Failed to fetch billing metrics: ${error.message}`);
  }

  const billingEvents: BillingEvent[] = (events || []).map((event) => ({
    type: event.event.replace("billing.", ""),
    userId,
    proofId: event.meta?.proof_id,
    success: event.meta?.success || false,
    metadata: event.meta,
  }));

  const totalEvents = billingEvents.length;
  const billableEvents = billingEvents.filter(shouldBill).length;
  const freeEvents = totalEvents - billableEvents;

  const billableEventTypes = [...new Set(billingEvents.filter(shouldBill).map((e) => e.type))];

  const eventsByType = billingEvents.reduce(
    (acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    totalEvents,
    billableEvents,
    freeEvents,
    billableEventTypes,
    eventsByType,
  };
}

/**
 * Get billing events total metric for telemetry
 */
export async function getBillingEventsTotal(): Promise<Record<string, number>> {
  const svc = supabaseService();

  const { data: events, error } = await svc
    .from("telemetry")
    .select("event, value")
    .like("event", "billing.%");

  if (error) {
    throw new Error(`Failed to fetch billing events total: ${error.message}`);
  }

  const totals = (events || []).reduce(
    (acc, event) => {
      const eventType = event.event.replace("billing.", "");
      acc[eventType] = (acc[eventType] || 0) + (event.value || 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  return totals;
}
