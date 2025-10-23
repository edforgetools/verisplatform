import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseService } from '@/lib/db';
import { BillingInsert } from '@/lib/db-types';
import { withRateLimit } from '@/lib/rateLimit';
import { ENV } from '@/lib/env';

export const runtime = 'nodejs';

// Pin to a stable Stripe API version for webhook reliability
const STRIPE_API_VERSION = '2025-09-30.clover' as const;

async function handleStripeWebhook(req: NextRequest) {
  // Verify webhook signature first
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await req.arrayBuffer());
  const stripe = new Stripe(ENV.server.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      ENV.server.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : 'Unknown signature verification error';
    console.error('Webhook signature verification failed:', {
      error: errorMessage,
      signature: sig,
    });
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${errorMessage}` },
      { status: 400 },
    );
  }

  const svc = supabaseService();

  try {
    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session.client_reference_id || !session.subscription) {
        console.warn('checkout.session.completed missing required fields:', {
          eventId: event.id,
          clientReferenceId: session.client_reference_id,
          subscription: session.subscription,
        });
        return NextResponse.json({ received: true });
      }

      const billingRecord: BillingInsert = {
        user_id: session.client_reference_id,
        stripe_subscription_id: session.subscription as string,
        status: 'active',
        tier: 'pro',
        updated_at: new Date().toISOString(),
      };

      // Idempotent upsert using event.id as dedupe key
      await svc.from('billing').upsert(billingRecord, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      });

      console.log('Processed checkout.session.completed:', {
        eventId: event.id,
        userId: session.client_reference_id,
        subscriptionId: session.subscription,
      });
    }

    // Handle customer.subscription.updated
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;

      if (!subscription.id) {
        console.warn('customer.subscription.updated missing subscription id:', {
          eventId: event.id,
        });
        return NextResponse.json({ received: true });
      }

      // Update billing record by subscription ID
      const { error } = await svc
        .from('billing')
        .update({
          status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        console.error('Failed to update billing for subscription.updated:', {
          eventId: event.id,
          subscriptionId: subscription.id,
          error: error.message,
        });
        return NextResponse.json({ received: true });
      }

      console.log('Processed customer.subscription.updated:', {
        eventId: event.id,
        subscriptionId: subscription.id,
        status: subscription.status,
      });
    }

    // Handle customer.subscription.deleted
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;

      if (!subscription.id) {
        console.warn('customer.subscription.deleted missing subscription id:', {
          eventId: event.id,
        });
        return NextResponse.json({ received: true });
      }

      // Update billing record to cancelled status
      const { error } = await svc
        .from('billing')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        console.error('Failed to update billing for subscription.deleted:', {
          eventId: event.id,
          subscriptionId: subscription.id,
          error: error.message,
        });
        return NextResponse.json({ received: true });
      }

      console.log('Processed customer.subscription.deleted:', {
        eventId: event.id,
        subscriptionId: subscription.id,
      });
    }

    // Fast 200 response for handled events
    return NextResponse.json({
      received: true,
      eventId: event.id,
      eventType: event.type,
    });
  } catch (error) {
    // Structured error logging
    console.error('Webhook processing error:', {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 200 to prevent Stripe retries for processing errors
    return NextResponse.json({ received: true });
  }
}

// Apply rate limiting to the POST handler
export const POST = withRateLimit(handleStripeWebhook, '/api/stripe/webhook', {
  capacity: 100, // 100 requests (Stripe can send many webhooks)
  refillRate: 10, // 10 tokens per second
  windowMs: 60000, // 1 minute window
});
