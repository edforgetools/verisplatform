"use client";
import React from "react";
import { Layout } from "@/components/Layout";

export default function BillingPage() {
  return (
    <Layout>
      <main>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px" }}>
          <div className="text-center" style={{ marginBottom: "32px" }}>
            <h1
              style={{ fontSize: "32px", fontWeight: 600, color: "#E5E7EB", marginBottom: "16px" }}
            >
              Billing & Subscriptions (Prototype)
            </h1>
            <p style={{ fontSize: "18px", color: "#CBD5E1" }}>
              Billing is disabled in this MVP. Pricing shown for demonstration only.
            </p>
          </div>

          <div style={{ maxWidth: "400px", margin: "0 auto" }}>
            <div
              style={{
                backgroundColor: "#162133",
                borderRadius: "0.75rem",
                padding: "32px",
                border: "1px solid #00B67A",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    marginBottom: "8px",
                    color: "#E5E7EB",
                  }}
                >
                  Pro
                </h2>
                <div
                  style={{
                    fontSize: "48px",
                    fontWeight: 600,
                    color: "#00B67A",
                    marginBottom: "8px",
                  }}
                >
                  $9
                </div>
                <div style={{ color: "#CBD5E1" }}>per month</div>
              </div>

              <ul
                style={{
                  listStyle: "none",
                  marginBottom: "32px",
                  fontSize: "14px",
                  color: "#CBD5E1",
                  textAlign: "left",
                }}
              >
                <li
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#00B67A" }}>✓</span>
                  Unlimited proof creation
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#00B67A" }}>✓</span>
                  PDF certificate downloads
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#00B67A" }}>✓</span>
                  Private proof storage
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#00B67A" }}>✓</span>
                  Email support
                </li>
              </ul>

              <button
                disabled={true}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  backgroundColor: "#162133",
                  color: "#CBD5E1",
                  borderRadius: "0.75rem",
                  fontWeight: 500,
                  height: "44px",
                  cursor: "not-allowed",
                  border: "none",
                }}
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
