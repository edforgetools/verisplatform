"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const checkBillingStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient().auth.getUser();

        if (user) {
          setUser(user);

          // Wait a moment for webhook to process
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const { data: billing, error } = await supabaseClient()
            .from("billing")
            .select("tier, status, stripe_subscription_id, updated_at")
            .eq("user_id", user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            console.error("Error fetching billing status:", error);
          } else {
            setBillingStatus(billing);
          }
        }
      } catch (error) {
        console.error("Error checking billing status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkBillingStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <main className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/2 mb-6"></div>
              <div className="h-32 bg-gray-300 rounded-lg"></div>
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
        <div className="max-w-2xl mx-auto">
          <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-700 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold mb-4">Welcome to Veris Pro!</h1>
            <p className="text-neutral-400 mb-6">
              Your subscription has been successfully activated. You now have access to all Pro
              features.
            </p>

            {billingStatus && (
              <div className="bg-neutral-800 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold mb-2">Subscription Details</h2>
                <div className="text-sm text-neutral-300 space-y-1">
                  <div>
                    Plan: <span className="text-emerald-400 capitalize">{billingStatus.tier}</span>
                  </div>
                  <div>
                    Status:{" "}
                    <span className="text-emerald-400 capitalize">{billingStatus.status}</span>
                  </div>
                  {sessionId && (
                    <div>
                      Session ID:{" "}
                      <span className="text-neutral-500 font-mono text-xs">{sessionId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Link
                href="/billing/dashboard"
                className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                View Billing Dashboard
              </Link>
              <div className="text-sm text-neutral-500">
                or{" "}
                <Link href="/" className="text-emerald-400 hover:underline">
                  return to the main app
                </Link>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-700">
              <h3 className="text-lg font-semibold mb-3">What's Next?</h3>
              <div className="text-sm text-neutral-400 space-y-2">
                <div>✅ Create unlimited cryptographic proofs</div>
                <div>✅ Download PDF certificates for your proofs</div>
                <div>✅ Access private proof storage</div>
                <div>✅ Get priority email support</div>
              </div>
            </div>

            <div className="mt-6 text-xs text-neutral-500">
              <p>
                Questions? Contact us at{" "}
                <a
                  href="mailto:support@verisplatform.com"
                  className="text-emerald-400 hover:underline"
                >
                  support@verisplatform.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BillingSuccessContent />
    </Suspense>
  );
}
