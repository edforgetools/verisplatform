"use client";
import React, { useState } from "react";
import { generateUserId } from "@/lib/ids";
import { Layout } from "@/components/Layout";

interface ProofResponse {
  url: string;
  proof_json?: Record<string, unknown>;
  [key: string]: unknown;
}

export default function DemoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<ProofResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Generate a consistent demo user ID for this session
  const demoUserId = generateUserId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("user_id", demoUserId);
      const r = await fetch("/api/proof/create", {
        method: "POST",
        body: fd,
        headers: { "x-user-id": demoUserId },
      });
      const data = await r.json();
      setRes(data);
      setShowJson(true);
    } catch (error) {
      console.error("Error creating proof:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 600, color: "#E5E7EB", marginBottom: "16px" }}>
            Create a Demo Proof
          </h1>
          <p style={{ fontSize: "18px", color: "#CBD5E1", marginBottom: "24px" }}>
            Files are hashed locally. No content leaves your browser.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{
                display: "block",
                width: "100%",
                backgroundColor: "#162133",
                padding: "12px",
                borderRadius: "0.75rem",
                border: "1px solid #00B67A",
                color: "#CBD5E1",
                marginBottom: "16px",
              }}
            />
            <button
              type="submit"
              disabled={loading || !file}
              style={{
                padding: "12px 24px",
                backgroundColor: loading || !file ? "#162133" : "#00B67A",
                color: "white",
                borderRadius: "0.75rem",
                fontWeight: 500,
                height: "44px",
                cursor: loading || !file ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {loading ? "Creating Proof..." : "Create Proof"}
            </button>
          </form>
          {res && (
            <div className="mt-6 space-y-4">
              <div
                style={{
                  padding: "16px",
                  borderRadius: "0.75rem",
                  backgroundColor: "#162133",
                  border: "1px solid #00B67A",
                }}
              >
                <p style={{ color: "#00B67A", marginBottom: "8px", fontWeight: 500 }}>
                  ✓ Proof created successfully!
                </p>
                <a href={res.url} style={{ color: "#00B67A", textDecoration: "underline" }}>
                  View proof →
                </a>
              </div>

              {res.proof_json && (
                <div>
                  <button
                    onClick={() => setShowJson(!showJson)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#E5E7EB",
                      cursor: "pointer",
                      marginBottom: "8px",
                    }}
                  >
                    {showJson ? "▼" : "▶"} View Canonical Proof JSON
                  </button>
                  {showJson && (
                    <pre
                      style={{
                        marginTop: "8px",
                        padding: "16px",
                        backgroundColor: "#0e1726",
                        borderRadius: "0.75rem",
                        border: "1px solid #162133",
                        overflowX: "auto",
                        fontSize: "14px",
                        color: "#CBD5E1",
                        fontFamily: "monospace",
                      }}
                    >
                      {JSON.stringify(res.proof_json, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: "24px",
              padding: "12px 16px",
              backgroundColor: "#162133",
              borderRadius: "0.75rem",
              border: "1px solid #00B67A",
              fontSize: "14px",
              color: "#CBD5E1",
            }}
          >
            Evaluation mode — proofs expire after 7 days.
          </div>
        </div>
      </main>
    </Layout>
  );
}
