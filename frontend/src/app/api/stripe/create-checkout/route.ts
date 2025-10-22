import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { assertEntitled } from '@/lib/entitlements';

export const runtime = 'nodejs';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  return new Stripe(secretKey);
}

// Allowlist of valid price IDs
const ALLOWED_PRICE_IDS = [
  process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID ||
    'price_1SKqkE2O9l5kYbcA5hZf9ZtD',
  process.env.NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID ||
    'price_1SKqkj2O9l5kYbcAJzO0YOfB',
];

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { priceId, userId, customerEmail } = await req.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'priceId is required' },
        { status: 400 },
      );
    }

    // Validate priceId against allowlist
    if (!ALLOWED_PRICE_IDS.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid priceId' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 },
      );
    }

    // Check entitlement for creating checkout sessions
    try {
      await assertEntitled(userId, 'create_checkout');
    } catch {
      return NextResponse.json(
        { error: 'Insufficient permissions to create checkout sessions' },
        { status: 403 },
      );
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.get('origin')}/billing/success`,
      cancel_url: `${req.headers.get('origin')}/billing/cancel`,
      client_reference_id: userId,
      customer_email: customerEmail,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
