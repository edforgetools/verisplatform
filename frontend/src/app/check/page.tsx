"use client";
import React, { useState } from "react";
import { Layout } from "@/components/Layout";

interface CheckResult {
  valid: boolean;
  signer: string;
  issued_at: string;
  latency_ms: number;
  errors: string[];
}

export default function CheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [recordId, setRecordId] = useState("");
  const [pastedJson, setPastedJson] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file && !recordId.trim() && !pastedJson.trim()) {
      return;
    }

    setLoading(true);

    try {
      let res: Response;

      if (pastedJson.trim()) {
        try {
          const proofJson = JSON.parse(pastedJson);
          res = await fetch("/api/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proofJson),
          });
        } catch (parseError) {
          setResult({
            valid: false,
            signer: "",
            issued_at: "",
            latency_ms: 0,
            errors: ["Invalid JSON format"],
          });
          setLoading(false);
          return;
        }
      } else if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (recordId.trim()) {
          formData.append("id", recordId.trim());
        }
        res = await fetch("/api/check", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: recordId.trim() }),
        });
      }

      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        valid: false,
        signer: "",
        issued_at: "",
        latency_ms: 0,
        errors: ["Network error occurred"],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 600,
              color: "#E5E7EB",
              marginBottom: "16px",
              paddingTop: "120px",
            }}
          >
            Check Delivery
          </h1>
          <p style={{ fontSize: "18px", color: "#CBD5E1", marginBottom: "24px" }}>
            Verify file integrity using file, record ID, or record.json
          </p>

          <form onSubmit={submit} style={{ display: "grid", gap: "24px" }}>
            <div style={{ display: "grid", gap: "16px" }}>
              {/* File Input */}
              <div>
                <label
                  htmlFor="file-input"
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "8px",
                    color: "#E5E7EB",
                  }}
                >
                  1. Upload file + record.json
                </label>
                <input
                  id="file-input"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{
                    display: "block",
                    width: "100%",
                    backgroundColor: "#162133",
                    padding: "12px",
                    borderRadius: "0.75rem",
                    border: "1px solid #1E293B",
                    color: "#CBD5E1",
                  }}
                />
              </div>

              {/* Paste JSON */}
              <div>
                <label
                  htmlFor="json-input"
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "8px",
                    color: "#E5E7EB",
                  }}
                >
                  2. Paste record.json
                </label>
                <textarea
                  id="json-input"
                  rows={4}
                  placeholder='{"record_id": "...", "sha256": "...", ...}'
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    backgroundColor: "#162133",
                    padding: "12px",
                    borderRadius: "0.75rem",
                    border: "1px solid #1E293B",
                    color: "#CBD5E1",
                    fontFamily: "monospace",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Record ID */}
              <div>
                <label
                  htmlFor="record-input"
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "8px",
                    color: "#E5E7EB",
                  }}
                >
                  3. Record ID lookup
                </label>
                <input
                  id="record-input"
                  type="text"
                  placeholder="Enter record ID"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    backgroundColor: "#162133",
                    padding: "12px",
                    borderRadius: "0.75rem",
                    border: "1px solid #1E293B",
                    color: "#CBD5E1",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (!file && !recordId.trim() && !pastedJson.trim())}
              className="flex items-center justify-center h-11 px-6 text-base font-medium leading-none"
              style={{
                backgroundColor:
                  loading || (!file && !recordId.trim() && !pastedJson.trim())
                    ? "#162133"
                    : "#00B67A",
                color: "white",
                borderRadius: "0.75rem",
                cursor:
                  loading || (!file && !recordId.trim() && !pastedJson.trim())
                    ? "not-allowed"
                    : "pointer",
                border: "none",
              }}
            >
              {loading ? "Checking..." : "Check Delivery"}
            </button>
          </form>

          {/* Results Panel */}
          {result && (
            <div
              style={{
                marginTop: "32px",
                padding: "24px",
                borderRadius: "0.75rem",
                backgroundColor: "#162133",
                border: result.valid ? "1px solid #00B67A" : "1px solid #ef4444",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              role="region"
              aria-live="polite"
              aria-label="Verification result"
            >
              {result.valid ? (
                <div>
                  <p
                    style={{
                      fontSize: "18px",
                      color: "#00B67A",
                      fontWeight: 500,
                      marginBottom: "8px",
                    }}
                  >
                    ✅ Delivery confirmed — file matches record.
                  </p>
                  {result.signer && (
                    <p style={{ fontSize: "14px", color: "#CBD5E1" }}>
                      Verified by: {result.signer}
                    </p>
                  )}
                  {result.issued_at && (
                    <p style={{ fontSize: "14px", color: "#CBD5E1" }}>
                      Issued at: {new Date(result.issued_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p
                    style={{
                      fontSize: "18px",
                      color: "#ef4444",
                      fontWeight: 500,
                      marginBottom: "8px",
                    }}
                  >
                    ⚠️ Record mismatch.
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <div style={{ marginTop: "12px" }}>
                      {result.errors.map((error, idx) => (
                        <p key={idx} style={{ fontSize: "14px", color: "#CBD5E1" }}>
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
