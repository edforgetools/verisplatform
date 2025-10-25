"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Navigation } from "@/components/Navigation";
import toast, { Toaster } from "react-hot-toast";

interface BillingMetrics {
  totalEvents: number;
  billableEvents: number;
  freeEvents: number;
  billableEventTypes: string[];
  eventsByType: Record<string, number>;
}

interface BillingStatus {
  tier: string | null;
  status: string | null;
  stripe_subscription_id: string | null;
  updated_at: string | null;
}

interface User {
  id: string;
  email?: string;
}

export default function BillingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingMetrics, setBillingMetrics] = useState<BillingMetrics | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);

  useEffect(() => {
    const loadBillingData = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient().auth.getUser();

        if (!user) {
          toast.error("Please log in to view billing information");
          return;
        }

        setUser(user);

        // Load billing status
        const { data: billing, error: billingError } = await supabaseClient()
          .from("billing")
          .select("tier, status, stripe_subscription_id, updated_at")
          .eq("user_id", user.id)
          .single();

        if (billingError && billingError.code !== "PGRST116") {
          console.error("Error fetching billing status:", billingError);
        } else {
          setBillingStatus(billing);
        }

        // Load billing metrics
        const session = await supabaseClient().auth.getSession();
        const response = await fetch(`/api/billing/metrics?days=${selectedPeriod}`, {
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token || ""}`,
          },
        });

        if (response.ok) {
          const metrics = await response.json();
          setBillingMetrics(metrics);
        } else {
          console.error("Failed to fetch billing metrics");
        }
      } catch (error) {
        console.error("Error loading billing data:", error);
        toast.error("Failed to load billing information");
      } finally {
        setLoading(false);
      }
    };

    loadBillingData();
  }, [selectedPeriod]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case "active":
        return "text-green-400";
      case "trialing":
        return "text-blue-400";
      case "past_due":
        return "text-yellow-400";
      case "cancelled":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getTierColor = (tier: string | null | undefined) => {
    switch (tier) {
      case "pro":
        return "text-blue-400";
      case "team":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
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

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-serif mb-2">Billing Dashboard</h1>
              <p className="text-neutral-400">Monitor your usage and billing information</p>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setSelectedPeriod(days)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === days
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          {/* Current Subscription Status */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
            <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-neutral-400 mb-1">Plan</div>
                <div
                  className={`text-2xl font-bold capitalize ${getTierColor(billingStatus?.tier)}`}
                >
                  {billingStatus?.tier || "Free"}
                </div>
              </div>
              <div>
                <div className="text-sm text-neutral-400 mb-1">Status</div>
                <div className={`text-2xl font-bold ${getStatusColor(billingStatus?.status)}`}>
                  {billingStatus?.status === "active"
                    ? "Active"
                    : billingStatus?.status === "trialing"
                    ? "Trial"
                    : billingStatus?.status === "past_due"
                    ? "Past Due"
                    : billingStatus?.status === "cancelled"
                    ? "Cancelled"
                    : "Free"}
                </div>
              </div>
              {billingStatus?.stripe_subscription_id && (
                <div>
                  <div className="text-sm text-neutral-400 mb-1">Subscription ID</div>
                  <div className="text-sm font-mono text-neutral-300">
                    {billingStatus.stripe_subscription_id.slice(0, 20)}...
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-neutral-400 mb-1">Last Updated</div>
                <div className="text-sm text-neutral-300">
                  {formatDate(billingStatus?.updated_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Usage Metrics */}
          {billingMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Total Events</div>
                <div className="text-3xl font-bold text-white">
                  {billingMetrics.totalEvents.toLocaleString()}
                </div>
                <div className="text-xs text-neutral-500 mt-1">Last {selectedPeriod} days</div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Billable Events</div>
                <div className="text-3xl font-bold text-emerald-400">
                  {billingMetrics.billableEvents.toLocaleString()}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {billingMetrics.totalEvents > 0
                    ? Math.round((billingMetrics.billableEvents / billingMetrics.totalEvents) * 100)
                    : 0}
                  % of total
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Free Events</div>
                <div className="text-3xl font-bold text-blue-400">
                  {billingMetrics.freeEvents.toLocaleString()}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {billingMetrics.totalEvents > 0
                    ? Math.round((billingMetrics.freeEvents / billingMetrics.totalEvents) * 100)
                    : 0}
                  % of total
                </div>
              </div>
            </div>
          )}

          {/* Event Breakdown */}
          {billingMetrics && billingMetrics.eventsByType && (
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Event Breakdown</h2>
              <div className="space-y-3">
                {Object.entries(billingMetrics.eventsByType).map(([eventType, count]) => {
                  const isBillable = billingMetrics.billableEventTypes.includes(eventType);
                  return (
                    <div key={eventType} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isBillable ? "bg-emerald-400" : "bg-blue-400"
                          }`}
                        />
                        <span className="text-neutral-300 capitalize">
                          {eventType.replace(".", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{count.toLocaleString()}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            isBillable
                              ? "bg-emerald-400/20 text-emerald-400"
                              : "bg-blue-400/20 text-blue-400"
                          }`}
                        >
                          {isBillable ? "Billable" : "Free"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Billing Actions */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
            <h2 className="text-xl font-semibold mb-4">Billing Actions</h2>
            <div className="flex flex-wrap gap-4">
              <a
                href="/billing"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Manage Subscription
              </a>
              <a
                href="mailto:billing@verisplatform.com"
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
              >
                Contact Billing Support
              </a>
              <a
                href="/docs/api"
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
              >
                API Documentation
              </a>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
            <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Billing Questions</h3>
                <p className="text-sm text-neutral-400 mb-3">
                  Have questions about your subscription or billing?
                </p>
                <a
                  href="mailto:billing@verisplatform.com"
                  className="text-emerald-400 hover:underline text-sm"
                >
                  billing@verisplatform.com
                </a>
              </div>
              <div>
                <h3 className="font-medium mb-2">Technical Support</h3>
                <p className="text-sm text-neutral-400 mb-3">
                  Need help with the API or technical issues?
                </p>
                <a
                  href="mailto:support@verisplatform.com"
                  className="text-emerald-400 hover:underline text-sm"
                >
                  support@verisplatform.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
