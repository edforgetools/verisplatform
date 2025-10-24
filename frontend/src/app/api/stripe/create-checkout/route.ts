import { NextRequest } from "next/server";
import Stripe from "stripe";
import { assertEntitled } from "@/lib/entitlements";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }
  return new Stripe(secretKey);
}

// Allowlist of valid price IDs
const PRICE_IDS = new Set([
  process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID!,
  process.env.NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID!,
]);

export async function POST(req: NextRequest) {
  try {
    const origin =
      req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { priceId, userId, customerEmail } = await req.json();

    if (!priceId) {
      return jsonErr("priceId is required", 400);
    }

    // Validate priceId against allowlist
    if (!PRICE_IDS.has(priceId)) {
      return jsonErr("Invalid priceId", 400);
    }

    if (!userId) {
      return jsonErr("userId is required", 400);
    }

    // Check entitlement for creating checkout sessions
    try {
      await assertEntitled(userId, "create_checkout");
    } catch {
      return jsonErr("Insufficient permissions to create checkout sessions", 403);
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing/success`,
      cancel_url: `${origin}/billing/cancel`,
      client_reference_id: userId,
      customer_email: customerEmail,
      metadata: { user_id: userId },
    });

    return jsonOk({ url: session.url });
  } catch (error) {
    capture(error, { route: "/api/stripe/create-checkout" });
    return jsonErr("Failed to create checkout session", 500);
  }
}

export function GET() {
  return jsonOk({ ok: true });
}
