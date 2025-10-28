"use client";
import React from "react";
import { Layout } from "@/components/Layout";

export default function BillingPage() {
  return (
    <Layout>
      <main>
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6 mt-24">
            <h1 className="text-5xl font-semibold text-gray-200 mb-2">Prototype Billing Screen</h1>
            <p className="text-sm text-slate-500 mt-2">Future pricing example.</p>
          </div>

          <div className="max-w-sm mx-auto">
            <div className="card">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2 text-gray-200">Example Plan</h2>
                <div className="text-4xl font-semibold text-gray-200 mb-1">$9</div>
                <div className="text-slate-300 text-sm mb-4">/ month</div>
                <div className="text-slate-400 text-sm font-medium">Coming Soon</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
