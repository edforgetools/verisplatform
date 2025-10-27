"use client";
import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Navigation } from "@/components/Navigation";

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

export default function VerifyPage() {
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
      toast.error("Please provide a file, proof ID, or paste proof.json");
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
          res = await fetch("/api/proof/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(proofJson),
          });
        } catch (parseError) {
          toast.error("Invalid JSON. Please check your proof.json format.");
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

        res = await fetch("/api/proof/verify", {
          method: "POST",
          body: formData,
        });
      } else {
        // Proof ID only verification
        const extractedId = extractProofId(proofId);
        if (!extractedId) {
          toast.error("Please enter a valid proof ID or URL");
          return;
        }

        res = await fetch("/api/proof/verify", {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      <main className="p-6">
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

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-serif mb-2">Verify Proof</h1>
            <p className="text-neutral-400">
              Verify a file against a proof or check a proof ID directly
            </p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* File Input */}
              <div>
                <label htmlFor="file-input" className="block text-sm font-medium mb-2">
                  File to Verify (Optional)
                </label>
                <input
                  id="file-input"
                  className="block w-full bg-neutral-900 p-3 rounded border border-neutral-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  aria-describedby="file-help"
                />
                <p id="file-help" className="mt-1 text-xs text-neutral-400">
                  Select a file to verify against a proof
                </p>
              </div>

              {/* Proof ID Input */}
              <div>
                <label htmlFor="proof-input" className="block text-sm font-medium mb-2">
                  Proof ID or URL (Optional)
                </label>
                <input
                  id="proof-input"
                  className="block w-full bg-neutral-900 p-3 rounded border border-neutral-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Enter proof ID or paste proof URL"
                  value={proofId}
                  onChange={(e) => setProofId(e.target.value)}
                  autoComplete="off"
                  aria-describedby="proof-help"
                />
                <p id="proof-help" className="mt-1 text-xs text-neutral-400">
                  You can paste a full proof URL or just the proof ID
                </p>
              </div>
            </div>

            {/* Paste proof.json */}
            <div>
              <label htmlFor="json-input" className="block text-sm font-medium mb-2">
                Or Paste proof.json (Optional)
              </label>
              <textarea
                id="json-input"
                className="block w-full bg-neutral-900 p-3 rounded border border-neutral-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-sm"
                rows={4}
                placeholder='{"proof_id": "...", "sha256": "...", ...}'
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                autoComplete="off"
                aria-describedby="json-help"
              />
              <p id="json-help" className="mt-1 text-xs text-neutral-400">
                Paste a complete proof.json to verify
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-neutral-400 mb-4">
                Provide a file, proof ID, or paste proof.json for verification
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || (!file && !proofId.trim() && !pastedJson.trim())}
              className="w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                  Verifying...
                </span>
              ) : (
                "Verify"
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
              className={`mt-8 p-6 rounded-lg border ${
                result.verified
                  ? "bg-emerald-900/20 border-emerald-600 text-emerald-100"
                  : "bg-red-900/20 border-red-600 text-red-100"
              }`}
              role="region"
              aria-live="polite"
              aria-label="Verification result"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl" aria-hidden="true">
                  {result.verified ? "✅" : "❌"}
                </span>
                <div>
                  <h2 className="text-xl font-semibold">
                    {result.verified ? "Verification Successful" : "Verification Failed"}
                  </h2>
                  <p className="text-sm opacity-80">
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
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Verification Checklist</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCheckIcon(result.checks.hash_match)}</span>
                    <span>{getCheckText(result.checks.hash_match, "Hash Match")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCheckIcon(result.checks.signature_valid)}</span>
                    <span>{getCheckText(result.checks.signature_valid, "Signature Valid")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getCheckIcon(result.checks.timestamp_within_tolerance)}
                    </span>
                    <span>
                      {getCheckText(
                        result.checks.timestamp_within_tolerance,
                        "Timestamp Within Tolerance",
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCheckIcon(result.checks.anchor_exists)}</span>
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
    </div>
  );
}
