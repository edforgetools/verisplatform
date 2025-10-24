"use client";

import { useState, useEffect } from "react";

interface StatusData {
  status: string;
  timestamp: string;
  response_time_ms: number;
  environment: string;
  metrics: {
    issued_count: number;
    verify_success: number;
    latency_p50: number;
    latency_p95: number;
  };
  last_webhook: string | null;
  last_s3_write: string | null;
  checks: {
    database: string;
    redis: string;
    s3: string;
    stripe: string;
  };
}

export default function InternalStatusPage() {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalKey, setInternalKey] = useState("");

  const fetchStatus = async () => {
    if (!internalKey) {
      setError("Internal key is required");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/internal/status", {
        headers: {
          "x-internal-key": internalKey,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Invalid internal key");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStatusData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
      console.error("Status fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchStatus();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pass":
      case "healthy":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "fail":
      case "critical":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  if (!statusData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              Internal Status
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="internal-key"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Internal Key
                </label>
                <input
                  type="password"
                  id="internal-key"
                  value={internalKey}
                  onChange={(e) => setInternalKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white"
                  placeholder="Enter internal key"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Loading..." : "Check Status"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Internal Status</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                System health and performance metrics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchStatus}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Overall Status */}
          <div className="mt-4">
            <div
              className={`inline-flex items-center px-4 py-2 rounded-lg ${getStatusColor(
                statusData.status,
              )}`}
            >
              <div className="w-3 h-3 rounded-full bg-current mr-2"></div>
              <span className="font-semibold">
                System Status: {statusData.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Last updated: {new Date(statusData.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Issued Count</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statusData.metrics.issued_count.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Verify Success</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statusData.metrics.verify_success.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Latency P50</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statusData.metrics.latency_p50}ms
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Latency P95</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statusData.metrics.latency_p95}ms
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Checks */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            System Checks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(statusData.checks).map(([service, status]) => (
              <div key={service} className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white capitalize">
                    {service}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(status)}`}
                  >
                    {status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      status === "pass" ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            System Information
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Environment</h3>
                <p className="text-slate-600 dark:text-slate-300">{statusData.environment}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Response Time</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {statusData.response_time_ms}ms
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Last Webhook</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {formatTimestamp(statusData.last_webhook)}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Last S3 Write</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {formatTimestamp(statusData.last_s3_write)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
