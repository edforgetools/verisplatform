"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Navigation } from "@/components/Navigation";
import toast, { Toaster } from "react-hot-toast";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTimeMs: number;
  lastChecked: string;
  details: Record<string, any>;
  error?: string;
}

interface SLOStatus {
  name: string;
  target: number;
  current: number;
  status: "meeting" | "warning" | "breach";
  window: string;
  trend: "improving" | "stable" | "degrading";
  lastBreach?: string;
  details: Record<string, any>;
}

interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: HealthCheck[];
  slos: SLOStatus[];
  summary: {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    unhealthyChecks: number;
    slosMeeting: number;
    slosWarning: number;
    slosBreach: number;
    responseTimeMs: number;
  };
}

interface PerformanceMetrics {
  timestamp: string;
  timeRange: string;
  responseTimeMs: number;
  throughput: {
    requestsPerMinute: number;
    totalRequests: number;
    timeRangeMinutes: number;
  };
  proofs: {
    total: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  verifications: {
    total: number;
    successRate: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  latency: {
    average: number;
    p95: number;
    p99: number;
    unit: string;
  };
  system: {
    uptime: number;
    errorRate: number;
    dataIntegrity: number;
  };
  capacity: {
    dailyThroughput: number;
    utilization: number;
    activeUsers: number;
  };
}

export default function HealthDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [user, setUser] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  useEffect(() => {
    const loadHealthData = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient().auth.getUser();

        if (!user) {
          toast.error("Please log in to view health data");
          return;
        }

        setUser(user);

        // Load system health
        const healthResponse = await fetch("/api/health?detailed=true&metrics=true", {
          headers: {
            Authorization: `Bearer ${
              (
                await supabaseClient().auth.getSession()
              ).data.session?.access_token
            }`,
          },
        });

        if (healthResponse.ok) {
          const health = await healthResponse.json();
          setSystemHealth(health);
        }

        // Load performance metrics
        const performanceResponse = await fetch("/api/performance?range=24h&details=true", {
          headers: {
            Authorization: `Bearer ${
              (
                await supabaseClient().auth.getSession()
              ).data.session?.access_token
            }`,
          },
        });

        if (performanceResponse.ok) {
          const performance = await performanceResponse.json();
          setPerformanceMetrics(performance);
        }
      } catch (error) {
        console.error("Error loading health data:", error);
        toast.error("Failed to load health information");
      } finally {
        setLoading(false);
      }
    };

    loadHealthData();

    // Set up auto-refresh if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadHealthData, refreshInterval * 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(2)}%`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "meeting":
        return "text-emerald-400";
      case "degraded":
      case "warning":
        return "text-yellow-400";
      case "unhealthy":
      case "breach":
        return "text-red-400";
      default:
        return "text-neutral-400";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "meeting":
        return "bg-emerald-400";
      case "degraded":
      case "warning":
        return "bg-yellow-400";
      case "unhealthy":
      case "breach":
        return "bg-red-400";
      default:
        return "bg-neutral-400";
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Reload data
      window.location.reload();
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      <main className="p-6">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1f2937",
              color: "#f9fafb",
              border: "1px solid #374151",
            },
          }}
        />

        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-serif mb-2">Health & SLO Dashboard</h1>
              <p className="text-neutral-400">
                System health monitoring and Service Level Objectives
              </p>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-400">Auto-refresh</label>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
                disabled={!autoRefresh}
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Overall Status Cards */}
          {systemHealth && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Overall Status</div>
                <div className={`text-3xl font-bold ${getStatusColor(systemHealth.overall)}`}>
                  {systemHealth.overall.toUpperCase()}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {formatDuration(systemHealth.summary.responseTimeMs)} response time
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Health Checks</div>
                <div className="text-3xl font-bold text-blue-400">
                  {systemHealth.summary.healthyChecks}/{systemHealth.summary.totalChecks}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {systemHealth.summary.degradedChecks} degraded,{" "}
                  {systemHealth.summary.unhealthyChecks} unhealthy
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">SLO Status</div>
                <div className="text-3xl font-bold text-purple-400">
                  {systemHealth.summary.slosMeeting}/
                  {systemHealth.summary.slosMeeting +
                    systemHealth.summary.slosWarning +
                    systemHealth.summary.slosBreach}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {systemHealth.summary.slosWarning} warning, {systemHealth.summary.slosBreach}{" "}
                  breach
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Last Updated</div>
                <div className="text-3xl font-bold text-green-400">
                  {new Date(systemHealth.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {autoRefresh ? `Auto-refresh ${refreshInterval}s` : "Manual refresh"}
                </div>
              </div>
            </div>
          )}

          {/* Health Checks */}
          {systemHealth && (
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Health Checks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemHealth.checks.map((check, index) => (
                  <div
                    key={index}
                    className="bg-neutral-800 p-4 rounded-lg border border-neutral-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white capitalize">
                        {check.name.replace("_", " ")}
                      </h3>
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusBgColor(check.status)}`}
                      ></div>
                    </div>
                    <div className="text-sm text-neutral-400">
                      <div>
                        Status: <span className={getStatusColor(check.status)}>{check.status}</span>
                      </div>
                      <div>Response: {formatDuration(check.responseTimeMs)}</div>
                      <div>Checked: {new Date(check.lastChecked).toLocaleTimeString()}</div>
                    </div>
                    {check.error && (
                      <div className="mt-2 text-xs text-red-400">Error: {check.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLO Status */}
          {systemHealth && (
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Service Level Objectives</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemHealth.slos.map((slo, index) => (
                  <div
                    key={index}
                    className="bg-neutral-800 p-4 rounded-lg border border-neutral-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white">{slo.name}</h3>
                      <div className={`w-3 h-3 rounded-full ${getStatusBgColor(slo.status)}`}></div>
                    </div>
                    <div className="text-sm text-neutral-400">
                      <div>
                        Current: <span className="text-white font-medium">{slo.current}</span>
                      </div>
                      <div>
                        Target: <span className="text-white font-medium">{slo.target}</span>
                      </div>
                      <div>
                        Status: <span className={getStatusColor(slo.status)}>{slo.status}</span>
                      </div>
                      <div>Window: {slo.window}</div>
                      <div>
                        Trend: <span className="text-white">{slo.trend}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {performanceMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Throughput</span>
                    <span className="text-white font-medium">
                      {formatNumber(performanceMetrics.throughput.requestsPerMinute)} req/min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Avg Latency</span>
                    <span className="text-white font-medium">
                      {formatDuration(performanceMetrics.latency.average)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">P95 Latency</span>
                    <span className="text-white font-medium">
                      {formatDuration(performanceMetrics.latency.p95)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">P99 Latency</span>
                    <span className="text-white font-medium">
                      {formatDuration(performanceMetrics.latency.p99)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Uptime</span>
                    <span className="text-white font-medium">
                      {formatPercentage(performanceMetrics.system.uptime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Error Rate</span>
                    <span className="text-white font-medium">
                      {formatPercentage(performanceMetrics.system.errorRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Data Integrity</span>
                    <span className="text-white font-medium">
                      {formatPercentage(performanceMetrics.system.dataIntegrity)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Capacity Utilization</span>
                    <span className="text-white font-medium">
                      {formatPercentage(performanceMetrics.capacity.utilization / 100)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Proof & Verification Stats */}
          {performanceMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Proof Statistics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Proofs</span>
                    <span className="text-white font-medium">
                      {formatNumber(performanceMetrics.proofs.total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Daily</span>
                    <span className="text-white font-medium">
                      {formatNumber(performanceMetrics.proofs.daily)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Weekly</span>
                    <span className="text-white font-medium">
                      {formatNumber(performanceMetrics.proofs.weekly)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Monthly</span>
                    <span className="text-white font-medium">
                      {formatNumber(performanceMetrics.proofs.monthly)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Verification Statistics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Verifications</span>
                    <span className="text-white font-medium">
                      {formatNumber(performanceMetrics.verifications.total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Success Rate</span>
                    <span className="text-white font-medium">
                      {formatPercentage(performanceMetrics.verifications.successRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Daily</span>
                    <span className="text-white font-medium">
                      {formatNumber(performanceMetrics.verifications.daily)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Weekly</span>
                    <span className="text-white font-medium">
                      {formatNumber(performanceMetrics.verifications.weekly)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
