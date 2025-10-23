import { ENV } from "@/lib/env";

interface HealthCheck {
  name: string;
  status: "healthy" | "unhealthy";
  responseTime?: number;
  error?: string;
  details?: any;
}

interface StatusPageProps {
  healthChecks: HealthCheck[];
  timestamp: string;
}

async function checkDbHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/db-health`,
      {
        cache: "no-store",
      },
    );
    const data = await response.json();
    const responseTime = Date.now() - startTime;

    return {
      name: "Database",
      status: response.ok && data.ok ? "healthy" : "unhealthy",
      responseTime,
      details: data,
    };
  } catch (error) {
    return {
      name: "Database",
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkVersion(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/version`,
      {
        cache: "no-store",
      },
    );
    const data = await response.json();
    const responseTime = Date.now() - startTime;

    return {
      name: "Version API",
      status: response.ok ? "healthy" : "unhealthy",
      responseTime,
      details: data,
    };
  } catch (error) {
    return {
      name: "Version API",
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkStripe(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    // Lightweight Stripe API call to check connectivity
    const response = await fetch("https://api.stripe.com/v1/account", {
      headers: {
        Authorization: `Bearer ${ENV.server.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2024-06-20",
      },
      cache: "no-store",
    });
    const responseTime = Date.now() - startTime;

    return {
      name: "Stripe API",
      status: response.ok ? "healthy" : "unhealthy",
      responseTime,
      details: response.ok ? { accountId: "connected" } : { status: response.status },
    };
  } catch (error) {
    return {
      name: "Stripe API",
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default async function StatusPage() {
  const timestamp = new Date().toISOString();

  // Run health checks in parallel
  const [dbHealth, versionHealth, stripeHealth] = await Promise.all([
    checkDbHealth(),
    checkVersion(),
    checkStripe(),
  ]);

  const healthChecks = [dbHealth, versionHealth, stripeHealth];
  const overallStatus = healthChecks.every((check) => check.status === "healthy")
    ? "healthy"
    : "unhealthy";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    overallStatus === "healthy" ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <span
                  className={`text-sm font-medium ${
                    overallStatus === "healthy" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {overallStatus === "healthy" ? "All Systems Operational" : "Issues Detected"}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Last updated: {new Date(timestamp).toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              {healthChecks.map((check, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          check.status === "healthy" ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <h3 className="text-lg font-medium text-gray-900">{check.name}</h3>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-medium ${
                          check.status === "healthy" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {check.status === "healthy" ? "Healthy" : "Unhealthy"}
                      </div>
                      {check.responseTime && (
                        <div className="text-xs text-gray-500">{check.responseTime}ms</div>
                      )}
                    </div>
                  </div>

                  {check.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      Error: {check.error}
                    </div>
                  )}

                  {check.details && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 border rounded text-xs text-gray-700 overflow-x-auto">
                        {JSON.stringify(check.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
