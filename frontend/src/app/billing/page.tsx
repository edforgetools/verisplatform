"use client";
import React from "react";
import { Layout } from "@/components/Layout";

export default function BillingPage() {
  return (
    <Layout>
      <main>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px" }}>
          <div className="text-center" style={{ marginBottom: "24px", marginTop: "96px" }}>
            <h1
              style={{ fontSize: "48px", fontWeight: 600, color: "#E5E7EB", marginBottom: "8px" }}
            >
              Prototype Billing Screen
            </h1>
            <p style={{ fontSize: "14px", color: "#94A3B8", marginTop: "8px" }}>
              Future pricing example.
            </p>
          </div>

          <div style={{ maxWidth: "400px", margin: "0 auto" }}>
            <div
              style={{
                backgroundColor: "#162133",
                borderRadius: "0.75rem",
                padding: "32px 24px",
                border: "1px solid #1E293B",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    marginBottom: "8px",
                    color: "#E5E7EB",
                  }}
                >
                  Example Plan
                </h2>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 600,
                    color: "#E5E7EB",
                    marginBottom: "4px",
                  }}
                >
                  $9
                </div>
                <div style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "16px" }}>
                  / month
                </div>
                <div
                  style={{
                    color: "#9CA3AF",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
