import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  NEXT_PUBLIC_STRIPE_MODE: z.enum(["test", "live"]).optional(),
  NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

export const ENV_CLIENT = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_MODE: process.env.NEXT_PUBLIC_STRIPE_MODE,
  NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID,
  NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
