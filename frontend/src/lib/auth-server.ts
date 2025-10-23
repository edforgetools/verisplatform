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
