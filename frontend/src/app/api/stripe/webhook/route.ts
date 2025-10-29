import { NextRequest } from "next/server";
import Stripe from "stripe";
import { supabaseService } from "@/lib/db";
import { Database } from "@/lib/db-types";
import { withRateLimit } from "@/lib/rateLimit";
import { verifyWebhook } from "@/lib/stripe";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";

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
    logger.error("Missing stripe-signature header");
    return jsonErr("VALIDATION_ERROR", "Missing stripe-signature header", "stripe-webhook", 400);
  }

  // Read raw body using Next 15 App Router method
  const text = await req.text();
  if (!text) {
    logger.error("Empty webhook body");
    return jsonErr("VALIDATION_ERROR", "Empty webhook body", "stripe-webhook", 400);
  }

  const buf = Buffer.from(text);

  let event: Stripe.Event;

  try {
    // Use verifyWebhook function from stripe.ts
    event = verifyWebhook(buf, sig);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown signature verification error";
    logger.error(
      {
        error: errorMessage,
        signature: sig.substring(0, 20) + "...", // Log only first 20 chars for security
        bodyLength: text.length,
      },
      "Webhook signature verification failed",
    );
    return jsonErr(
      "AUTH_ERROR",
      `Webhook signature verification failed: ${errorMessage}`,
      "stripe-webhook",
      400,
    );
  }

  // Validate event structure
  if (!event.id || !event.type || !event.data) {
    logger.error(
      {
        eventId: event.id,
        eventType: event.type,
        hasData: !!event.data,
      },
      "Invalid webhook event structure",
    );
    return jsonErr("VALIDATION_ERROR", "Invalid webhook event structure", "stripe-webhook", 400);
  }

  // Filter allowed events for security
  if (!ALLOWED_EVENTS.has(event.type)) {
    logger.warn(
      {
        eventId: event.id,
        eventType: event.type,
      },
      "Received disallowed webhook event",
    );
    return jsonOk({ received: true }, "stripe-webhook");
  }

  const svc = supabaseService();

  // Check for idempotency - prevent duplicate processing
  const { data: existingEvent } = await svc
    .from("billing_event_logs")
    .select("event_id")
    .eq("event_id", event.id)
    .single();

  if (existingEvent) {
    logger.info(
      {
        eventId: event.id,
        eventType: event.type,
      },
      "Event already processed, skipping",
    );
    return jsonOk({ received: true, alreadyProcessed: true }, "stripe-webhook");
  }

  try {
    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session.client_reference_id || !session.subscription) {
        logger.warn(
          {
            eventId: event.id,
            clientReferenceId: session.client_reference_id,
            subscription: session.subscription,
          },
          "checkout.session.completed missing required fields",
        );
        return jsonOk({ received: true }, "stripe-webhook");
      }

      const billingRecord: Database["public"]["Tables"]["billing"]["Insert"] = {
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

      logger.info(
        {
          eventId: event.id,
          userId: session.client_reference_id,
          subscriptionId: session.subscription,
        },
        "Processed checkout.session.completed",
      );
    }

    // Handle customer.subscription.updated
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;

      if (!subscription.id) {
        logger.warn(
          {
            eventId: event.id,
          },
          "customer.subscription.updated missing subscription id",
        );
        return jsonOk({ received: true }, "stripe-webhook");
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
        logger.error(
          {
            eventId: event.id,
            subscriptionId: subscription.id,
            error: error.message,
          },
          "Failed to update billing for subscription.updated",
        );
        return jsonErr(
          "DB_ERROR",
          "Failed to update billing for subscription.updated",
          "stripe-webhook",
          500,
        );
      }

      // Log successful event processing
      await svc.from("billing_event_logs").insert({
        event_id: event.id,
        event_type: event.type,
        stripe_subscription_id: subscription.id,
      });

      logger.info(
        {
          eventId: event.id,
          subscriptionId: subscription.id,
          status: subscription.status,
        },
        "Processed customer.subscription.updated",
      );
    }

    // Handle customer.subscription.deleted
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      if (!subscription.id) {
        logger.warn(
          {
            eventId: event.id,
          },
          "customer.subscription.deleted missing subscription id",
        );
        return jsonOk({ received: true }, "stripe-webhook");
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
        logger.error(
          {
            eventId: event.id,
            subscriptionId: subscription.id,
            error: error.message,
          },
          "Failed to update billing for subscription.deleted",
        );
        return jsonErr(
          "DB_ERROR",
          "Failed to update billing for subscription.deleted",
          "stripe-webhook",
          500,
        );
      }

      // Log successful event processing
      await svc.from("billing_event_logs").insert({
        event_id: event.id,
        event_type: event.type,
        stripe_subscription_id: subscription.id,
      });

      logger.info(
        {
          eventId: event.id,
          subscriptionId: subscription.id,
        },
        "Processed customer.subscription.deleted",
      );
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
        logger.warn(
          {
            eventId: event.id,
          },
          "invoice.payment_failed missing subscription",
        );
        return jsonOk({ received: true }, "stripe-webhook");
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
        logger.error(
          {
            eventId: event.id,
            subscriptionId: subscriptionIdString,
            error: error.message,
          },
          "Failed to update billing for invoice.payment_failed",
        );
        return jsonErr(
          "DB_ERROR",
          "Failed to update billing for invoice.payment_failed",
          "stripe-webhook",
          500,
        );
      }

      // Log successful event processing
      await svc.from("billing_event_logs").insert({
        event_id: event.id,
        event_type: event.type,
        stripe_subscription_id: subscriptionIdString,
      });

      logger.info(
        {
          eventId: event.id,
          subscriptionId: subscriptionIdString,
        },
        "Processed invoice.payment_failed",
      );
    }

    // Fast 200 response for handled events
    return jsonOk(
      {
        received: true,
        eventId: event.id,
        eventType: event.type,
      },
      "stripe-webhook",
    );
  } catch (error) {
    capture(error, {
      route: "/api/stripe/webhook",
      eventId: event.id,
      eventType: event.type,
    });

    logger.error(
      {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Webhook processing failed",
    );

    // Return 500 to allow Stripe to retry failed webhooks
    return jsonErr("INTERNAL_ERROR", "Webhook processing failed", "stripe-webhook", 500);
  }
}

// Apply rate limiting to the POST handler
export const POST = withRateLimit(handleStripeWebhook, "/api/stripe/webhook", {
  capacity: 100, // 100 requests (Stripe can send many webhooks)
  refillRate: 10, // 10 tokens per second
  windowMs: 60000, // 1 minute window
});
