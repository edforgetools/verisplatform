/**
 * Minimal observability hook for error capture and logging
 */

interface CaptureContext {
  route?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Capture an error with optional context
 * Logs to console and forwards to Sentry if DSN is present
 */
export function capture(error: Error | unknown, context: CaptureContext = {}): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Always log to console
  console.error(`[${timestamp}] Error captured:`, {
    message: errorMessage,
    stack: errorStack,
    context,
  });

  // Forward to Sentry if DSN is present
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    try {
      // Dynamic import to avoid bundling Sentry in client-side code
      // This will only work if @sentry/nextjs is installed
      import('@sentry/nextjs').then(({ captureException }) => {
        captureException(error, {
          tags: {
            route: context.route,
          },
          extra: context,
        });
      }).catch((importError) => {
        console.warn('Failed to import Sentry (package may not be installed):', importError);
      });
    } catch (err) {
      console.warn('Failed to capture error with Sentry:', err);
    }
  }
}

/**
 * Wrap an API route handler with error capture
 */
export function withErrorCapture<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  routeName: string
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      capture(error, { route: routeName });
      
      // Return a generic error response
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}
