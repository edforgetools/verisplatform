import { NextRequest } from "next/server";
import Stripe from "stripe";
import { assertEntitled } from "@/lib/entitlements";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { getStripeConfig } from "@/lib/env";

export const runtime = "nodejs";

function getStripe() {
  const config = getStripeConfig();
  return new Stripe(config.secretKey);
}

function getValidPriceIds(): Set<string> {
  const config = getStripeConfig();
  const priceIds = new Set<string>();

  if (config.proPriceId) {
    priceIds.add(config.proPriceId);
  }
  if (config.teamPriceId) {
    priceIds.add(config.teamPriceId);
  }

  return priceIds;
}

export async function POST(req: NextRequest) {
  try {
    const origin =
      req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { priceId, userId, customerEmail } = await req.json();

    if (!priceId) {
      return jsonErr("VALIDATION_ERROR", "priceId is required", "stripe-create-checkout", 400);
    }

    // Validate priceId against allowlist
    const validPriceIds = getValidPriceIds();
    if (!validPriceIds.has(priceId)) {
      return jsonErr("VALIDATION_ERROR", "Invalid priceId", "stripe-create-checkout", 400);
    }

    if (!userId) {
      return jsonErr("VALIDATION_ERROR", "userId is required", "stripe-create-checkout", 400);
    }

    // Check entitlement for creating checkout sessions
    try {
      await assertEntitled(userId, "create_checkout");
    } catch {
      return jsonErr(
        "AUTH_ERROR",
        "Insufficient permissions to create checkout sessions",
        "stripe-create-checkout",
        403,
      );
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

    return jsonOk({ url: session.url }, "stripe-create-checkout");
  } catch (error) {
    capture(error, { route: "/api/stripe/create-checkout" });
    return jsonErr(
      "INTERNAL_ERROR",
      "Failed to create checkout session",
      "stripe-create-checkout",
      500,
    );
  }
}

export function GET() {
  return jsonOk({ ok: true }, "stripe-create-checkout");
}
