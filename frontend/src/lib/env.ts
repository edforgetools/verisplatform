import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  NEXT_PUBLIC_STRIPE_MODE: z.enum(["test", "live"]).optional(),
  NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

const serverSchema = z
  .object({
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    supabaseservicekey: z.string().min(10),
    CRON_JOB_TOKEN: z.string().min(16).or(z.undefined()),
    UPSTASH_REDIS_URL: z.string().url().optional(),
    REDIS_URL: z.string().url().optional(),
    VERIS_SIGNING_PRIVATE_KEY: z.string().min(100),
    VERIS_SIGNING_PUBLIC_KEY: z.string().min(100),
  })
  .refine(
    (v) => {
      // Skip CRON key validation during build time
      if (
        process.env.NODE_ENV === "production" &&
        process.env.NEXT_PHASE === "phase-production-build"
      ) {
        return true;
      }
      return !!(v.CRON_JOB_TOKEN ?? process.env.CRON_SECRET);
    },
    { message: "CRON key missing" },
  );

export const ENV = {
  client: clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_MODE: process.env.NEXT_PUBLIC_STRIPE_MODE,
    NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  }),
  server: serverSchema.parse({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    supabaseservicekey: process.env.supabaseservicekey ?? process.env.supabaseservicekey,
    CRON_JOB_TOKEN: process.env.CRON_JOB_TOKEN,
    UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
    REDIS_URL: process.env.REDIS_URL,
    VERIS_SIGNING_PRIVATE_KEY: process.env.VERIS_SIGNING_PRIVATE_KEY,
    VERIS_SIGNING_PUBLIC_KEY: process.env.VERIS_SIGNING_PUBLIC_KEY,
  }),
};

/**
 * Get the CRON key from environment variables.
 * Supports both CRON_JOB_TOKEN and CRON_SECRET for backward compatibility.
 */
export function getCronKey(): string {
  const CRON_KEY = ENV.server.CRON_JOB_TOKEN ?? process.env.CRON_SECRET ?? "";
  if (!CRON_KEY) {
    throw new Error("Missing CRON_JOB_TOKEN (or CRON_SECRET)");
  }
  return CRON_KEY;
}

/**
 * Validate CRON authentication from request headers
 */
export function validateCronAuth(request: Request): boolean {
  const CRON_KEY = getCronKey();
  return request.headers.get("x-cron-key") === CRON_KEY;
}
