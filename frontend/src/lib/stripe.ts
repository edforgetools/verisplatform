import Stripe from "stripe";
import { getStripeConfig } from "@/lib/env";

// Lazy-load Stripe client to avoid initialization during build
let _stripe: Stripe | null = null;
let _config: ReturnType<typeof getStripeConfig> | null = null;

function getStripeClient(): Stripe {
  if (!_stripe) {
    _config = getStripeConfig();
    _stripe = new Stripe(_config.secretKey, { apiVersion: "2025-09-30.clover" });
  }
  return _stripe;
}

function getConfig() {
  if (!_config) {
    _config = getStripeConfig();
  }
  return _config;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeClient();
    const value = client[prop as keyof Stripe];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function verifyWebhook(raw: Buffer, sig: string) {
  const config = getConfig();
  const client = getStripeClient();
  return client.webhooks.constructEvent(raw, sig, config.webhookSecret);
}

export const stripeConfig = new Proxy({} as ReturnType<typeof getStripeConfig>, {
  get(_target, prop) {
    const config = getConfig();
    return config[prop as keyof ReturnType<typeof getStripeConfig>];
  },
});
