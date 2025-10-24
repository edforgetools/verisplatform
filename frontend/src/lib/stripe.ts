import Stripe from "stripe";
import { getStripeConfig } from "@/lib/env";

const config = getStripeConfig();

export const stripe = new Stripe(config.secretKey, { apiVersion: "2025-09-30.clover" });

export function verifyWebhook(raw: Buffer, sig: string) {
  return stripe.webhooks.constructEvent(raw, sig, config.webhookSecret);
}

export { config as stripeConfig };
