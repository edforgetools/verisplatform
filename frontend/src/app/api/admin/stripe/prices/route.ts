import { NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe, stripeConfig } from "@/lib/stripe";
import { isAdminUser } from "@/lib/auth-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface StripeProductWithPrices {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string>;
  prices: Stripe.Price[];
}

/**
 * GET /api/admin/stripe/prices
 *
 * Lists all active Stripe products and their prices.
 * Requires admin authentication.
 */
async function handleGetStripePrices(req: NextRequest) {
  try {
    // Check admin authentication
    const isAdmin = await isAdminUser(req);
    if (!isAdmin) {
      logger.warn("Non-admin user attempted to access Stripe prices endpoint");
      return jsonErr("Admin access required", 403);
    }

    // Fetch all active products from Stripe
    const products = await stripe.products.list({
      active: true,
      limit: 100, // Adjust if you have more than 100 products
    });

    // For each product, fetch its active prices
    const productsWithPrices: StripeProductWithPrices[] = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 100, // Adjust if you have more than 100 prices per product
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
          prices: prices.data,
        };
      }),
    );

    // Format the response
    const response = {
      mode: stripeConfig.mode,
      account_id: await getStripeAccountId(),
      products: productsWithPrices.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        prices: product.prices.map((price) => ({
          id: price.id,
          nickname: price.nickname,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          active: price.active,
          metadata: price.metadata,
          created: price.created,
        })),
      })),
      summary: {
        total_products: productsWithPrices.length,
        total_prices: productsWithPrices.reduce((sum, product) => sum + product.prices.length, 0),
        active_products: productsWithPrices.filter((p) => p.active).length,
      },
    };

    logger.info(
      {
        admin_action: "stripe_prices_list",
        product_count: response.summary.total_products,
        price_count: response.summary.total_prices,
      },
      "Admin accessed Stripe prices list",
    );

    return jsonOk(response);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        admin_action: "stripe_prices_list",
      },
      "Failed to fetch Stripe prices",
    );

    capture(error, { route: "/api/admin/stripe/prices" });
    return jsonErr("Failed to fetch Stripe prices", 500);
  }
}

export const GET = withRateLimit(handleGetStripePrices, "/api/admin/stripe/prices", {
  capacity: 10,
  refillRate: 10 / 60, // 10 tokens per minute
  windowMs: 60 * 1000,
});

/**
 * Get Stripe account ID for verification
 */
async function getStripeAccountId(): Promise<string | null> {
  try {
    const account = await stripe.accounts.retrieve();
    return account.id;
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to retrieve Stripe account ID",
    );
    return null;
  }
}
