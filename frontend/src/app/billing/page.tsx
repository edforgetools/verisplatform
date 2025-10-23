"use client";
import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { ENV_CLIENT } from "@/lib/env-client";
import toast, { Toaster } from "react-hot-toast";
import { Navigation } from "@/components/Navigation";

interface BillingStatus {
  tier: string | null;
  status: string | null;
  stripe_subscription_id: string | null;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  const checkout = async (priceId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          userId: user?.id,
          customerEmail: user?.email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout process");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkBillingStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient().auth.getUser();
        if (user) {
          setUser(user);

          const { data: billing, error } = await supabaseClient()
            .from("billing")
            .select("tier, status, stripe_subscription_id")
            .eq("user_id", user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            // PGRST116 = no rows returned
            console.error("Error fetching billing status:", error);
          } else {
            setBillingStatus(billing);
          }
        }
      } catch (error) {
        console.error("Error checking billing status:", error);
      }
    };

    checkBillingStatus();
  }, []);

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
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-serif mb-4">Billing & Subscriptions</h1>
          <p className="text-neutral-400">Choose the plan that works for your studio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pro Plan */}
          <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-700">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Pro</h2>
              <div className="text-4xl font-bold text-emerald-400 mb-2">$9</div>
              <div className="text-neutral-400">per month</div>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Unlimited proof creation
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                PDF certificate downloads
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Private proof storage
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Email support
              </li>
            </ul>

            <button
              onClick={() =>
                checkout(
                  ENV_CLIENT.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID || "price_1SKqkE2O9l5kYbcA5hZf9ZtD",
                )
              }
              disabled={loading}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {loading ? "Processing..." : "Start Pro Trial"}
            </button>
          </div>

          {/* Team Plan */}
          <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-700 relative">
            <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Popular
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Team</h2>
              <div className="text-4xl font-bold text-emerald-400 mb-2">$39</div>
              <div className="text-neutral-400">per month</div>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Everything in Pro
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Up to 10 team members
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Shared project workspaces
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Priority support
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                API access
              </li>
            </ul>

            <button
              onClick={() =>
                checkout(
                  ENV_CLIENT.NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID || "price_1SKqkj2O9l5kYbcAJzO0YOfB",
                )
              }
              disabled={loading}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {loading ? "Processing..." : "Start Team Trial"}
            </button>
          </div>
        </div>

        {/* Current Status */}
        {billingStatus && billingStatus.tier !== null && (
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold mb-4">Current Subscription</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium capitalize">{billingStatus.tier}</div>
                <div className="text-sm text-neutral-400">
                  Status: {billingStatus.status || "Unknown"}
                </div>
                {billingStatus.stripe_subscription_id && (
                  <div className="text-xs text-neutral-500 mt-1">
                    ID: {billingStatus.stripe_subscription_id.slice(0, 20)}...
                  </div>
                )}
              </div>
              <div
                className={`font-medium ${
                  billingStatus.status === "active"
                    ? "text-emerald-400"
                    : billingStatus.status === "past_due"
                    ? "text-yellow-400"
                    : billingStatus.status === "cancelled"
                    ? "text-red-400"
                    : "text-neutral-400"
                }`}
              >
                {billingStatus.status === "active"
                  ? "Active"
                  : billingStatus.status === "past_due"
                  ? "Past Due"
                  : billingStatus.status === "cancelled"
                  ? "Cancelled"
                  : billingStatus.status || "Unknown"}
              </div>
            </div>
          </div>
        )}

        {/* Free Tier Status */}
        {(!billingStatus || !billingStatus.tier) && user && (
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold mb-4">Current Subscription</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Free</div>
                <div className="text-sm text-neutral-400">Limited proof creation and storage</div>
              </div>
              <div className="text-neutral-400 font-medium">Active</div>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-neutral-500">
          <p>All plans include a 14-day free trial. Cancel anytime.</p>
          <p className="mt-2">
            Questions? Contact us at{" "}
            <a href="mailto:support@verisplatform.com" className="text-emerald-400 hover:underline">
              support@verisplatform.com
            </a>
            {" • "}
            <a href="mailto:billing@verisplatform.com" className="text-emerald-400 hover:underline">
              billing@verisplatform.com
            </a>
          </p>
        </div>
        </div>
      </main>
    </div>
  );
}
