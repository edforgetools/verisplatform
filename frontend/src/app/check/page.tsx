"use client";
import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Layout } from "@/components/Layout";

interface VerificationResult {
  verified: boolean;
  verified_by: string;
  hashHex: string;
  signatureB64: string | null;
  timestamp: string | null;
  anchor_txid: string | null;
  file_name: string | null;
  created_at: string | null;
  checks: {
    hash_match: boolean | null;
    signature_valid: boolean | null;
    timestamp_within_tolerance: boolean | null;
    anchor_exists: boolean | null;
  };
}

export default function CheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [proofId, setProofId] = useState("");
  const [pastedJson, setPastedJson] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  // Extract proof ID from URL or use as-is if already an ID
  const extractProofId = (input: string): string | null => {
    if (!input.trim()) return null;

    // If it looks like a URL, try to extract ID from path
    if (input.includes("/")) {
      try {
        const url = new URL(input);
        const pathParts = url.pathname.split("/");
        const proofId = pathParts[pathParts.length - 1];
        return proofId || null;
      } catch {
        // If URL parsing fails, treat as direct ID
        return input.trim();
      }
    }

    // If it's not a URL, treat as direct ID
    return input.trim();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one input is provided
    if (!file && !proofId.trim() && !pastedJson.trim()) {
      toast.error("Please provide a file, record ID, or paste record.json");
      return;
    }

    setLoading(true);
    setElapsedMs(null);
    const startTime = performance.now();

    try {
      let res: Response;

      if (pastedJson.trim()) {
        // Pasted JSON verification
        try {
          const proofJson = JSON.parse(pastedJson);
          res = await fetch("/api/check", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(proofJson),
          });
        } catch (parseError) {
          toast.error("Invalid JSON. Please check your record.json format.");
          setLoading(false);
          return;
        }
      } else if (file) {
        // File-based verification
        const formData = new FormData();
        formData.append("file", file);

        if (proofId.trim()) {
          const extractedId = extractProofId(proofId);
          if (extractedId) {
            formData.append("proof_id", extractedId);
          }
        }

        res = await fetch("/api/check", {
          method: "POST",
          body: formData,
        });
      } else {
        // Proof ID only verification
        const extractedId = extractProofId(proofId);
        if (!extractedId) {
          toast.error("Please enter a valid record ID or URL");
          return;
        }

        res = await fetch("/api/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: extractedId }),
        });
      }

      const elapsed = Math.round(performance.now() - startTime);
      setElapsedMs(elapsed);

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }

      setResult(data);

      if (data.verified) {
        toast.success(`Verification successful! (${elapsed}ms)`);
      } else {
        toast.error(`Verification failed (${elapsed}ms)`);
      }
    } catch {
      const elapsed = Math.round(performance.now() - startTime);
      setElapsedMs(elapsed);
      toast.error(`Network error occurred (${elapsed}ms)`);
    } finally {
      setLoading(false);
    }
  };

  const getCheckIcon = (check: boolean | null) => {
    if (check === null) return "⚪"; // Not applicable
    return check ? "✅" : "❌";
  };

  const getCheckText = (check: boolean | null, label: string) => {
    if (check === null) return `${label}: Not applicable`;
    return `${label}: ${check ? "Pass" : "Fail"}`;
  };

  return (
    <Layout>
      <main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: "#1f2937",
              color: "#f9fafb",
              border: "1px solid #374151",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#f9fafb",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#f9fafb",
              },
            },
          }}
        />

        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px" }}>
          <div className="text-center" style={{ marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 600,
                color: "#E5E7EB",
                marginBottom: "8px",
                paddingTop: "120px",
              }}
            >
              Check Delivery
            </h1>
            <p style={{ fontSize: "18px", color: "#CBD5E1" }}>
              Verify file integrity using file, record ID, or record.json
            </p>
          </div>

          <form onSubmit={submit} style={{ display: "grid", gap: "24px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px",
              }}
            >
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
                  Upload file + record.json
                </label>
                <input
                  id="file-input"
                  style={{
                    display: "block",
                    width: "100%",
                    backgroundColor: "#162133",
                    padding: "12px",
                    borderRadius: "0.75rem",
                    border: "1px solid #00B67A",
                    color: "#CBD5E1",
                  }}
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  aria-describedby="file-help"
                />
                <p id="file-help" style={{ marginTop: "4px", fontSize: "12px", color: "#CBD5E1" }}>
                  Upload a file to verify
                </p>
              </div>

              {/* Proof ID Input */}
              <div>
                <label
                  htmlFor="proof-input"
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "8px",
                    color: "#E5E7EB",
                  }}
                >
                  Paste record.json
                </label>
                <textarea
                  id="json-input"
                  style={{
                    display: "block",
                    width: "100%",
                    backgroundColor: "#162133",
                    padding: "12px",
                    borderRadius: "0.75rem",
                    border: "1px solid #00B67A",
                    color: "#CBD5E1",
                    fontFamily: "monospace",
                    fontSize: "14px",
                    minHeight: "100px",
                  }}
                  rows={4}
                  placeholder='{"proof_id": "...", "sha256": "...", ...}'
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  autoComplete="off"
                  aria-describedby="json-help"
                />
                <p id="json-help" style={{ marginTop: "4px", fontSize: "12px", color: "#CBD5E1" }}>
                  Paste a complete proof.json to verify
                </p>
              </div>

              {/* Proof ID Lookup */}
              <div>
                <label
                  htmlFor="proof-input"
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "8px",
                    color: "#E5E7EB",
                  }}
                >
                  Record ID lookup
                </label>
                <input
                  id="proof-input"
                  style={{
                    display: "block",
                    width: "100%",
                    backgroundColor: "#162133",
                    padding: "12px",
                    borderRadius: "0.75rem",
                    border: "1px solid #00B67A",
                    color: "#CBD5E1",
                  }}
                  placeholder="Enter record ID or paste URL"
                  value={proofId}
                  onChange={(e) => setProofId(e.target.value)}
                  autoComplete="off"
                  aria-describedby="proof-help"
                />
                <p id="proof-help" style={{ marginTop: "4px", fontSize: "12px", color: "#CBD5E1" }}>
                  Look up by record ID or URL
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (!file && !proofId.trim() && !pastedJson.trim())}
              className="flex items-center justify-center h-11 px-6 text-base font-medium leading-none"
              style={{
                backgroundColor:
                  loading || (!file && !proofId.trim() && !pastedJson.trim())
                    ? "#162133"
                    : "#00B67A",
                color: "white",
                borderRadius: "0.75rem",
                cursor:
                  loading || (!file && !proofId.trim() && !pastedJson.trim())
                    ? "not-allowed"
                    : "pointer",
                border: "none",
                width: "100%",
              }}
              aria-describedby="submit-help"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Checking...
                </span>
              ) : (
                "Check Delivery"
              )}
            </button>
            {elapsedMs !== null && (
              <p id="submit-help" className="text-xs text-neutral-400 text-center">
                Last verification took {elapsedMs}ms
              </p>
            )}
          </form>

          {/* Results Panel */}
          {result && (
            <div
              style={{
                marginTop: "32px",
                padding: "24px",
                borderRadius: "0.75rem",
                backgroundColor: "#162133",
                border: `1px solid ${result.verified ? "#00B67A" : "#ef4444"}`,
                color: result.verified ? "#00B67A" : "#ef4444",
              }}
              role="region"
              aria-live="polite"
              aria-label="Verification result"
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}
              >
                <span style={{ fontSize: "24px" }} aria-hidden="true">
                  {result.verified ? "✅" : "❌"}
                </span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 600 }}>
                    {result.verified ? "Verification Successful" : "Verification Failed"}
                  </h2>
                  <p style={{ fontSize: "14px", opacity: 0.8 }}>
                    Verified by:{" "}
                    {result.verified_by === "signature"
                      ? "Digital Signature"
                      : result.verified_by === "hash"
                      ? "Hash Only"
                      : "None"}
                  </p>
                </div>
              </div>

              {/* Verification Checklist */}
              <div style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 500,
                    marginBottom: "12px",
                    color: "#E5E7EB",
                  }}
                >
                  Verification Checklist
                </h3>
                <div style={{ display: "grid", gap: "8px", fontSize: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>
                      {getCheckIcon(result.checks.hash_match)}
                    </span>
                    <span>{getCheckText(result.checks.hash_match, "Hash Match")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>
                      {getCheckIcon(result.checks.signature_valid)}
                    </span>
                    <span>{getCheckText(result.checks.signature_valid, "Signature Valid")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>
                      {getCheckIcon(result.checks.timestamp_within_tolerance)}
                    </span>
                    <span>
                      {getCheckText(
                        result.checks.timestamp_within_tolerance,
                        "Timestamp Within Tolerance",
                      )}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>
                      {getCheckIcon(result.checks.anchor_exists)}
                    </span>
                    <span>{getCheckText(result.checks.anchor_exists, "Anchor Exists")}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Information */}
              <div className="space-y-4 text-sm">
                {result.file_name && (
                  <div>
                    <span className="font-medium">File Name:</span> {result.file_name}
                  </div>
                )}

                <div>
                  <span className="font-medium">Proof Hash:</span>
                  <div className="font-mono text-xs break-all mt-1 p-3 bg-neutral-800 rounded">
                    {result.hashHex}
                  </div>
                </div>

                {result.signatureB64 && (
                  <div>
                    <span className="font-medium">Signature:</span>
                    <div className="font-mono text-xs break-all mt-1 p-3 bg-neutral-800 rounded">
                      {result.signatureB64}
                    </div>
                  </div>
                )}

                {result.timestamp && (
                  <div>
                    <span className="font-medium">Timestamp:</span>{" "}
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                )}

                {result.anchor_txid && (
                  <div>
                    <span className="font-medium">Anchor Transaction ID:</span>
                    <div className="font-mono text-xs break-all mt-1 p-2 bg-neutral-800 rounded">
                      {result.anchor_txid}
                    </div>
                  </div>
                )}

                {result.created_at && (
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {new Date(result.created_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
