"use client";
import React, { useState, useEffect } from "react";
import { generateUserId } from "@/lib/ids";
import { Layout } from "@/components/Layout";

interface DeliveryRecordResponse {
  url: string;
  proof_json?: Record<string, unknown>;
  [key: string]: unknown;
}

export default function ClosePage() {
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<DeliveryRecordResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

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
      setShowBanner(true);
      // Auto-dismiss banner after 4s
      setTimeout(() => setShowBanner(false), 4000);
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
          <h1 style={{ fontSize: "32px", fontWeight: 600, color: "#E5E7EB", marginBottom: "16px", paddingTop: "120px" }}>
            Close Delivery
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
              className="flex items-center justify-center h-11 px-6 text-base font-medium"
              style={{
                backgroundColor: loading || !file ? "#162133" : "#00B67A",
                color: "white",
                borderRadius: "0.75rem",
                cursor: loading || !file ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {loading ? "Closing Delivery..." : "Close Delivery"}
            </button>
          </form>
          {res && (
            <div className="mt-6 space-y-4">
              {showBanner && (
                <div
                  className="fade-in"
                  style={{
                    padding: "16px",
                    borderRadius: "0.75rem",
                    backgroundColor: "#162133",
                    border: "1px solid #00B67A",
                    animation: "fadeIn 0.15s ease-in",
                  }}
                >
                  <p style={{ color: "#00B67A", fontWeight: 500 }}>
                    ✅ Delivery Closed — record created at {new Date().toLocaleString()}.
                  </p>
                </div>
              )}

              {res.proof_json && (
                <div style={{ marginTop: showBanner ? "16px" : "0" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <button
                      onClick={() => setShowJson(false)}
                      style={{
                        background: showJson ? "transparent" : "#162133",
                        border: "1px solid #1E293B",
                        color: "#E5E7EB",
                        cursor: "pointer",
                        padding: "8px 16px",
                        borderRadius: "0.5rem",
                        fontSize: "14px",
                      }}
                    >
                      Summary View
                    </button>
                    <button
                      onClick={() => setShowJson(true)}
                      style={{
                        background: showJson ? "#162133" : "transparent",
                        border: "1px solid #1E293B",
                        color: "#E5E7EB",
                        cursor: "pointer",
                        padding: "8px 16px",
                        borderRadius: "0.5rem",
                        fontSize: "14px",
                      }}
                    >
                      JSON View
                    </button>
                  </div>

                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#162133",
                      border: "1px solid #1E293B",
                      borderRadius: "0.75rem",
                    }}
                  >
                    {showJson ? (
                      <pre
                        style={{
                          margin: 0,
                          padding: "16px",
                          backgroundColor: "#0e1726",
                          borderRadius: "0.5rem",
                          overflowX: "auto",
                          fontSize: "14px",
                          color: "#CBD5E1",
                          fontFamily: "monospace",
                        }}
                      >
                        {JSON.stringify(res.proof_json, null, 2)}
                      </pre>
                    ) : (
                      <div style={{ color: "#CBD5E1", fontSize: "16px", lineHeight: "1.6" }}>
                        <div style={{ marginBottom: "12px" }}>
                          <strong style={{ color: "#E5E7EB" }}>ID:</strong>{" "}
                          {(res.proof_json.record_id as string) || (res.proof_json.proof_id as string) || "N/A"}
                        </div>
                        <div style={{ marginBottom: "12px" }}>
                          <strong style={{ color: "#E5E7EB" }}>Issuer:</strong>{" "}
                          {(res.proof_json.issuer as string) || "N/A"}
                        </div>
                        <div style={{ marginBottom: "12px" }}>
                          <strong style={{ color: "#E5E7EB" }}>Issued at:</strong>{" "}
                          {(res.proof_json.issued_at as string) || "N/A"}
                        </div>
                        <div>
                          <strong style={{ color: "#E5E7EB" }}>Status:</strong>{" "}
                          {(res.proof_json.status as string) || "closed"}
                        </div>
                      </div>
                    )}
                  </div>
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
            Evaluation mode — records expire after 7 days.
          </div>
        </div>
      </main>
    </Layout>
  );
}
