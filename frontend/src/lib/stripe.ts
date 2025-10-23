import Stripe from "stripe";
import { ENV } from "@/lib/env";

export const stripe = new Stripe(ENV.server.STRIPE_SECRET_KEY, { apiVersion: "2025-09-30.clover" });

export function verifyWebhook(raw: Buffer, sig: string) {
  return stripe.webhooks.constructEvent(raw, sig, ENV.server.STRIPE_WEBHOOK_SECRET);
}
