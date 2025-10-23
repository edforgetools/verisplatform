#!/usr/bin/env tsx

/**
 * Stripe Test Environment Seeding Script
 * 
 * This script creates the required Stripe products and prices in the test environment.
 * It's safe to run multiple times - it will skip existing products/prices.
 * 
 * Usage:
 *   pnpm run seed:stripe
 *   or
 *   tsx scripts/seed.stripe.ts
 */

import Stripe from "stripe";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.join(__dirname, "../frontend/.env.local") });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not found in environment variables");
  process.exit(1);
}

if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("❌ This script should only be run with Stripe TEST keys");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
});

interface ProductConfig {
  id: string;
  name: string;
  description: string;
  metadata: {
    veris_product: string;
  };
}

interface PriceConfig {
  productId: string;
  nickname: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: "month" | "year";
  };
  metadata: {
    veris_price: string;
  };
}

const PRODUCTS: ProductConfig[] = [
  {
    id: "prod_veris_pro",
    name: "Veris Pro",
    description: "Professional cryptographic proof of file integrity with blockchain anchoring",
    metadata: {
      veris_product: "pro",
    },
  },
  {
    id: "prod_veris_team",
    name: "Veris Team",
    description: "Team collaboration features with advanced cryptographic proof capabilities",
    metadata: {
      veris_product: "team",
    },
  },
];

const PRICES: PriceConfig[] = [
  {
    productId: "prod_veris_pro",
    nickname: "Pro Monthly",
    unit_amount: 2900, // $29.00
    currency: "usd",
    recurring: {
      interval: "month",
    },
    metadata: {
      veris_price: "pro_monthly",
    },
  },
  {
    productId: "prod_veris_team",
    nickname: "Team Monthly",
    unit_amount: 9900, // $99.00
    currency: "usd",
    recurring: {
      interval: "month",
    },
    metadata: {
      veris_price: "team_monthly",
    },
  },
];

async function createOrGetProduct(product: ProductConfig): Promise<Stripe.Product> {
  try {
    // Try to retrieve existing product
    const existing = await stripe.products.retrieve(product.id);
    console.log(`✅ Product "${product.name}" already exists: ${existing.id}`);
    return existing;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") {
      // Product doesn't exist, create it
      const created = await stripe.products.create({
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
      });
      console.log(`✅ Created product "${product.name}": ${created.id}`);
      return created;
    }
    throw error;
  }
}

async function createOrGetPrice(price: PriceConfig): Promise<Stripe.Price> {
  try {
    // Search for existing price with same metadata
    const existingPrices = await stripe.prices.list({
      product: price.productId,
      active: true,
    });

    const existing = existingPrices.data.find(
      (p) => p.metadata.veris_price === price.metadata.veris_price
    );

    if (existing) {
      console.log(`✅ Price "${price.nickname}" already exists: ${existing.id}`);
      return existing;
    }

    // Create new price
    const created = await stripe.prices.create({
      product: price.productId,
      nickname: price.nickname,
      unit_amount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring,
      metadata: price.metadata,
    });
    console.log(`✅ Created price "${price.nickname}": ${created.id}`);
    return created;
  } catch (error) {
    console.error(`❌ Failed to create price "${price.nickname}":`, error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting Stripe test environment seeding...");
  console.log(`📍 Using Stripe account: ${process.env.STRIPE_SECRET_KEY.slice(0, 20)}...`);

  try {
    // Create products first
    const products: Record<string, Stripe.Product> = {};
    for (const product of PRODUCTS) {
      products[product.id] = await createOrGetProduct(product);
    }

    // Then create prices
    const prices: Record<string, Stripe.Price> = {};
    for (const price of PRICES) {
      prices[price.metadata.veris_price] = await createOrGetPrice(price);
    }

    console.log("\n📋 Summary:");
    console.log("Products:");
    Object.values(products).forEach((product) => {
      console.log(`  - ${product.name}: ${product.id}`);
    });

    console.log("\nPrices:");
    Object.entries(prices).forEach(([key, price]) => {
      console.log(`  - ${price.nickname}: ${price.id} (${(price.unit_amount! / 100).toFixed(2)} ${price.currency.toUpperCase()})`);
    });

    console.log("\n✅ Stripe seeding completed successfully!");
    console.log("\n💡 Next steps:");
    console.log("1. Update your environment variables with the price IDs:");
    Object.entries(prices).forEach(([key, price]) => {
      const envVar = key === "pro_monthly" ? "NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID" : "NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID";
      console.log(`   ${envVar}=${price.id}`);
    });
    console.log("2. Test your integration with these price IDs");

  } catch (error) {
    console.error("❌ Stripe seeding failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
}
