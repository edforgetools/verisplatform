import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseService } from "@/lib/db";
import { BillingInsert } from "@/lib/db-types";
import { withRateLimit } from "@/lib/rateLimit";
import { verifyWebhook } from "@/lib/stripe";
import { capture } from "@/lib/observability";

export const runtime = "nodejs";

// Allowed webhook events for security
const ALLOWED_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
]);

async function handleStripeWebhook(req: NextRequest) {
  // Verify webhook signature first
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("Missing stripe-signature header");
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Read raw body using Next 15 App Router method
  const text = await req.text();
  const buf = Buffer.from(text);

  let event: Stripe.Event;

  try {
    // Use verifyWebhook function from stripe.ts
    event = verifyWebhook(buf, sig);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown signature verification error";
    console.error("Webhook signature verification failed:", {
      error: errorMessage,
      signature: sig,
    });
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${errorMessage}` },
      { status: 400 },
    );
  }

  // Filter allowed events for security
  if (!ALLOWED_EVENTS.has(event.type)) {
    console.warn("Received disallowed webhook event:", {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ received: true });
  }

  const svc = supabaseService();

  // Check for idempotency - prevent duplicate processing
  const { data: existingEvent } = await svc
    .from("billing_event_logs")
    .select("event_id")
    .eq("event_id", event.id)
    .single();

  if (existingEvent) {
    console.log("Event already processed, skipping:", {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  try {
    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session.client_reference_id || !session.subscription) {
        console.warn("checkout.session.completed missing required fields:", {
          eventId: event.id,
          clientReferenceId: session.client_reference_id,
          subscription: session.subscription,
        });
        return NextResponse.json({ received: true });
      }

      const billingRecord: BillingInsert = {
        user_id: session.client_reference_id,
        stripe_subscription_id: session.subscription as string,
        status: "active",
        tier: "pro",
        updated_at: new Date().toISOString(),
      };

      // Idempotent upsert using event.id as dedupe key
      await svc.from("billing").upsert(billingRecord, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      });

      // Log successful event processing
      await svc.from("billing_event_logs").insert({
        event_id: event.id,
        event_type: event.type,
        stripe_subscription_id: session.subscription as string,
        user_id: session.client_reference_id,
      });

      console.log("Processed checkout.session.completed:", {
        eventId: event.id,
        userId: session.client_reference_id,
        subscriptionId: session.subscription,
      });
    }

    // Handle customer.subscription.updated
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;

      if (!subscription.id) {
        console.warn("customer.subscription.updated missing subscription id:", {
          eventId: event.id,
        });
        return NextResponse.json({ received: true });
      }

      // Update billing record by subscription ID
      const { error } = await svc
        .from("billing")
        .update({
          status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("Failed to update billing for subscription.updated:", {
          eventId: event.id,
          subscriptionId: subscription.id,
          error: error.message,
        });
        return NextResponse.json({ received: true });
      }

      // Log successful event processing
      await svc.from("billing_event_logs").insert({
        event_id: event.id,
        event_type: event.type,
        stripe_subscription_id: subscription.id,
      });

      console.log("Processed customer.subscription.updated:", {
        eventId: event.id,
        subscriptionId: subscription.id,
        status: subscription.status,
      });
    }

    // Handle customer.subscription.deleted
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      if (!subscription.id) {
        console.warn("customer.subscription.deleted missing subscription id:", {
          eventId: event.id,
        });
        return NextResponse.json({ received: true });
      }

      // Update billing record to cancelled status
      const { error } = await svc
        .from("billing")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("Failed to update billing for subscription.deleted:", {
          eventId: event.id,
          subscriptionId: subscription.id,
          error: error.message,
        });
        return NextResponse.json({ received: true });
      }

      // Log successful event processing
      await svc.from("billing_event_logs").insert({
        event_id: event.id,
        event_type: event.type,
        stripe_subscription_id: subscription.id,
      });

      console.log("Processed customer.subscription.deleted:", {
        eventId: event.id,
        subscriptionId: subscription.id,
      });
    }

    // Handle invoice.payment_failed
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;

      // For invoice.payment_failed, we need to get the subscription from the invoice
      // Access subscription property with proper type assertion
      const subscriptionId = (
        invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }
      ).subscription;

      if (!subscriptionId) {
        console.warn("invoice.payment_failed missing subscription:", {
          eventId: event.id,
        });
        return NextResponse.json({ received: true });
      }

      const subscriptionIdString =
        typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id;

      // Update billing record to indicate payment failure
      const { error } = await svc
        .from("billing")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionIdString);

      if (error) {
        console.error("Failed to update billing for invoice.payment_failed:", {
          eventId: event.id,
          subscriptionId: subscriptionIdString,
          error: error.message,
        });
        return NextResponse.json({ received: true });
      }

      // Log successful event processing
      await svc.from("billing_event_logs").insert({
        event_id: event.id,
        event_type: event.type,
        stripe_subscription_id: subscriptionIdString,
      });

      console.log("Processed invoice.payment_failed:", {
        eventId: event.id,
        subscriptionId: subscriptionIdString,
      });
    }

    // Fast 200 response for handled events
    return NextResponse.json({
      received: true,
      eventId: event.id,
      eventType: event.type,
    });
  } catch (error) {
    capture(error, { 
      route: "/api/stripe/webhook",
      eventId: event.id,
      eventType: event.type
    });

    // Return 200 to prevent Stripe retries for processing errors
    return NextResponse.json({ received: true });
  }
}

// Apply rate limiting to the POST handler
export const POST = withRateLimit(handleStripeWebhook, "/api/stripe/webhook", {
  capacity: 100, // 100 requests (Stripe can send many webhooks)
  refillRate: 10, // 10 tokens per second
  windowMs: 60000, // 1 minute window
});
