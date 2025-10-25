"use client";

import React from "react";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-700 text-center">
            <div className="text-6xl mb-6">😔</div>
            <h1 className="text-3xl font-bold mb-4">Checkout Cancelled</h1>
            <p className="text-neutral-400 mb-6">
              No worries! You can always upgrade your plan later when you're ready.
            </p>

            <div className="bg-neutral-800 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold mb-2">Stay on the Free Plan</h2>
              <div className="text-sm text-neutral-300 space-y-1">
                <div>✅ Create up to 10 proofs per month</div>
                <div>✅ Basic proof verification</div>
                <div>✅ Public registry access</div>
                <div>✅ Community support</div>
              </div>
            </div>

            <div className="space-y-4">
              <Link
                href="/billing"
                className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </Link>
              <div className="text-sm text-neutral-500">
                or{" "}
                <Link href="/" className="text-emerald-400 hover:underline">
                  return to the main app
                </Link>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-700">
              <h3 className="text-lg font-semibold mb-3">Need Help?</h3>
              <div className="text-sm text-neutral-400 space-y-2">
                <div>
                  Have questions about our plans?{" "}
                  <a
                    href="mailto:support@verisplatform.com"
                    className="text-emerald-400 hover:underline"
                  >
                    Contact our support team
                  </a>
                </div>
                <div>
                  Want to discuss custom pricing?{" "}
                  <a
                    href="mailto:sales@verisplatform.com"
                    className="text-emerald-400 hover:underline"
                  >
                    Get in touch with sales
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-neutral-500">
              <p>
                You can upgrade anytime from your{" "}
                <Link href="/billing" className="text-emerald-400 hover:underline">
                  billing page
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
