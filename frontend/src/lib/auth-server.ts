/**
 * Server-only authentication utilities
 */

/**
 * Get the CRON key from environment variables.
 * Supports both CRON_JOB_TOKEN and CRON_SECRET for backward compatibility.
 */
export function getCronKey(): string {
  const CRON_KEY = process.env.CRON_JOB_TOKEN ?? process.env.CRON_SECRET ?? "";
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

/**
 * Get authenticated user ID from request headers
 * Returns null if not authenticated
 */
export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    // Create a Supabase client to verify the JWT
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return null;
    }

    const supabase = createClient(url, key);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}
