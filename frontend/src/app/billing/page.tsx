"use client";
import React from "react";
import { Layout } from "@/components/Layout";

export default function BillingPage() {
  return (
    <Layout>
      <main>
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6 mt-24">
            <h1
              id="billing-heading"
              className="text-5xl font-semibold mb-2"
              style={{ color: "#E6EDF7" }}
            >
              Billing preview
            </h1>
            <p className="text-sm mt-2" style={{ color: "#98A2B3" }}>
              Indicative pricing. Billing is not enabled in this prototype.
            </p>
          </div>

          <section className="max-w-sm mx-auto" aria-labelledby="pricing-heading">
            <div className="card">
              <div className="text-center">
                <h2
                  id="pricing-heading"
                  className="text-2xl font-semibold mb-2"
                  style={{ color: "#E6EDF7" }}
                >
                  Example Plan
                </h2>
                <p
                  className="text-4xl font-semibold mb-1"
                  style={{ color: "#E6EDF7" }}
                  aria-label="Price: 9 dollars per month"
                >
                  $9
                </p>
                <p className="text-sm mb-4" style={{ color: "#E6EDF7" }}>
                  / month
                </p>
                <p className="text-sm font-medium" style={{ color: "#98A2B3" }}>
                  Indicative pricing. Billing is not enabled in this prototype.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
