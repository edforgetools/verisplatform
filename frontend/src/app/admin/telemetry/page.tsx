"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Navigation } from "@/components/Navigation";
import toast, { Toaster } from "react-hot-toast";

interface TelemetryMetrics {
  today: {
    total_proofs: number;
    total_verifications: number;
    total_api_calls: number;
    unique_users: number;
    daily_average: {
      proofs: number;
      verifications: number;
      api_calls: number;
    };
    weekly_trend: Array<{
      date: string;
      proofs: number;
      verifications: number;
      api_calls: number;
    }>;
  };
  this_week: {
    total_proofs: number;
    total_verifications: number;
    total_api_calls: number;
    unique_users: number;
    daily_average: {
      proofs: number;
      verifications: number;
      api_calls: number;
    };
    weekly_trend: Array<{
      date: string;
      proofs: number;
      verifications: number;
      api_calls: number;
    }>;
  };
  this_month: {
    total_proofs: number;
    total_verifications: number;
    total_api_calls: number;
    unique_users: number;
    daily_average: {
      proofs: number;
      verifications: number;
      api_calls: number;
    };
    weekly_trend: Array<{
      date: string;
      proofs: number;
      verifications: number;
      api_calls: number;
    }>;
  };
}

interface CapacityMetrics {
  current_load: {
    requests_per_minute: number;
    active_users: number;
    system_health: string;
  };
  capacity_planning: {
    projected_growth: number;
    recommended_scaling: string;
    bottleneck_analysis: string[];
  };
  performance_metrics: {
    average_response_time: number;
    error_rate: number;
    uptime_percentage: number;
  };
}

export default function TelemetryDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [telemetryMetrics, setTelemetryMetrics] = useState<TelemetryMetrics | null>(null);
  const [capacityMetrics, setCapacityMetrics] = useState<CapacityMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadTelemetryData = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient().auth.getUser();
        
        if (!user) {
          toast.error("Please log in to view telemetry data");
          return;
        }

        setUser(user);

        // Load telemetry metrics
        const response = await fetch("/api/telemetry/metrics", {
          headers: {
            Authorization: `Bearer ${(await supabaseClient().auth.getSession()).data.session?.access_token}`,
          },
        });

        if (response.ok) {
          const metrics = await response.json();
          setTelemetryMetrics(metrics);
        } else {
          console.error("Failed to fetch telemetry metrics");
        }

        // Load capacity metrics
        const capacityResponse = await fetch("/api/telemetry/capacity", {
          headers: {
            Authorization: `Bearer ${(await supabaseClient().auth.getSession()).data.session?.access_token}`,
          },
        });

        if (capacityResponse.ok) {
          const capacity = await capacityResponse.json();
          setCapacityMetrics(capacity);
        } else {
          console.error("Failed to fetch capacity metrics");
        }
      } catch (error) {
        console.error("Error loading telemetry data:", error);
        toast.error("Failed to load telemetry information");
      } finally {
        setLoading(false);
      }
    };

    loadTelemetryData();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case "healthy":
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      case "critical":
        return "text-red-400";
      default:
        return "text-gray-400";
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

  const currentMetrics = telemetryMetrics?.[selectedPeriod === "today" ? "today" : selectedPeriod === "week" ? "this_week" : "this_month"];

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
              <h1 className="text-3xl font-serif mb-2">Telemetry Dashboard</h1>
              <p className="text-neutral-400">Monitor system usage and capacity planning metrics</p>
            </div>
            
            {/* Period Selector */}
            <div className="flex gap-2">
              {[
                { key: "today", label: "Today" },
                { key: "week", label: "This Week" },
                { key: "month", label: "This Month" },
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key as any)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === period.key
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          {currentMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Proofs Created</div>
                <div className="text-3xl font-bold text-white">
                  {formatNumber(currentMetrics.total_proofs)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Avg: {formatNumber(currentMetrics.daily_average.proofs)}/day
                </div>
              </div>
              
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Verifications</div>
                <div className="text-3xl font-bold text-blue-400">
                  {formatNumber(currentMetrics.total_verifications)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Avg: {formatNumber(currentMetrics.daily_average.verifications)}/day
                </div>
              </div>
              
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">API Calls</div>
                <div className="text-3xl font-bold text-purple-400">
                  {formatNumber(currentMetrics.total_api_calls)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Avg: {formatNumber(currentMetrics.daily_average.api_calls)}/day
                </div>
              </div>
              
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Unique Users</div>
                <div className="text-3xl font-bold text-emerald-400">
                  {formatNumber(currentMetrics.unique_users)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Active users
                </div>
              </div>
            </div>
          )}

          {/* Capacity Planning */}
          {capacityMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Current Load</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Requests/min</span>
                    <span className="text-white font-medium">
                      {formatNumber(capacityMetrics.current_load.requests_per_minute)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Active Users</span>
                    <span className="text-white font-medium">
                      {formatNumber(capacityMetrics.current_load.active_users)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">System Health</span>
                    <span className={`font-medium ${getHealthColor(capacityMetrics.current_load.system_health)}`}>
                      {capacityMetrics.current_load.system_health}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Performance</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Avg Response Time</span>
                    <span className="text-white font-medium">
                      {capacityMetrics.performance_metrics.average_response_time}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Error Rate</span>
                    <span className="text-white font-medium">
                      {capacityMetrics.performance_metrics.error_rate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Uptime</span>
                    <span className="text-white font-medium">
                      {capacityMetrics.performance_metrics.uptime_percentage}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Capacity Planning</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-neutral-400 text-sm mb-1">Projected Growth</div>
                    <div className="text-white font-medium">
                      +{capacityMetrics.capacity_planning.projected_growth}% this month
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-400 text-sm mb-1">Scaling Recommendation</div>
                    <div className="text-emerald-400 font-medium">
                      {capacityMetrics.capacity_planning.recommended_scaling}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-400 text-sm mb-1">Bottlenecks</div>
                    <div className="text-xs text-neutral-300">
                      {capacityMetrics.capacity_planning.bottleneck_analysis.length > 0
                        ? capacityMetrics.capacity_planning.bottleneck_analysis.join(", ")
                        : "None identified"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Usage Trends Chart */}
          {currentMetrics && currentMetrics.weekly_trend && (
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Usage Trends</h2>
              <div className="space-y-4">
                {currentMetrics.weekly_trend.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="text-sm text-neutral-300 w-20">
                      {new Date(day.date).toLocaleDateString("en-US", { 
                        month: "short", 
                        day: "numeric" 
                      })}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="flex gap-2">
                        <div 
                          className="h-4 bg-emerald-400 rounded"
                          style={{ 
                            width: `${Math.max(2, (day.proofs / Math.max(...currentMetrics.weekly_trend.map(d => d.proofs))) * 100)}%` 
                          }}
                        />
                        <div 
                          className="h-4 bg-blue-400 rounded"
                          style={{ 
                            width: `${Math.max(2, (day.verifications / Math.max(...currentMetrics.weekly_trend.map(d => d.verifications))) * 100)}%` 
                          }}
                        />
                        <div 
                          className="h-4 bg-purple-400 rounded"
                          style={{ 
                            width: `${Math.max(2, (day.api_calls / Math.max(...currentMetrics.weekly_trend.map(d => d.api_calls))) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400 w-32 text-right">
                      {formatNumber(day.proofs)} / {formatNumber(day.verifications)} / {formatNumber(day.api_calls)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-400 rounded"></div>
                  Proofs Created
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded"></div>
                  Verifications
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded"></div>
                  API Calls
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
            <h2 className="text-xl font-semibold mb-4">Telemetry Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Refresh Data
              </button>
              <button
                onClick={() => fetch("/api/jobs/telemetry-daily", { method: "POST" })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Run Daily Aggregation
              </button>
              <a
                href="/api/telemetry/export"
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
              >
                Export Data
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
