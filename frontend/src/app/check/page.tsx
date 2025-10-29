"use client";
import React, { useState } from "react";
import { Layout } from "@/components/Layout";

interface CheckResult {
  valid: boolean;
  signer: string;
  issued_at: string;
  latency_ms: number;
  errors: string[];
  record_id?: string;
  sha256?: string;
  signature?: string;
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
        } catch {
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
    } catch {
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
        <div className="max-w-4xl mx-auto px-4">
          <h1
            id="check-heading"
            className="text-5xl font-semibold mb-2 mt-24"
            style={{ color: "#E6EDF7" }}
          >
            Check Delivery
          </h1>
          <p className="text-lg mt-2 mb-6" style={{ color: "#E6EDF7" }}>
            Verify using a file with record.json, paste record.json, or look up by record ID.
          </p>

          <form onSubmit={submit} className="grid gap-6" aria-labelledby="check-heading">
            <fieldset className="grid gap-6 border-0 p-0 m-0">
              <legend className="sr-only">Verification methods</legend>

              {/* File Input */}
              <div>
                <label
                  htmlFor="file-input"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#E6EDF7" }}
                >
                  1. Upload file + record.json (Recommended)
                </label>
                <input
                  id="file-input"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="input"
                  aria-describedby="file-help-check"
                />
                <p id="file-help-check" className="sr-only">
                  Upload the original file along with its record.json to verify integrity.
                </p>
              </div>

              {/* Paste JSON */}
              <div>
                <label
                  htmlFor="json-input"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#E6EDF7" }}
                >
                  2. Paste record.json
                </label>
                <textarea
                  id="json-input"
                  rows={4}
                  placeholder='{"record_id": "..."}'
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  className="textarea"
                  aria-describedby="json-help-check"
                />
                <p id="json-help-check" className="sr-only">
                  Paste the JSON record to verify without uploading a file.
                </p>
              </div>

              {/* Record ID */}
              <div>
                <label
                  htmlFor="record-input"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#E6EDF7" }}
                >
                  3. Record ID lookup
                </label>
                <input
                  id="record-input"
                  type="text"
                  placeholder="Enter record ID"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  className="input"
                  aria-describedby="record-help-check"
                />
                <p id="record-help-check" className="sr-only">
                  Look up a delivery record using its unique identifier.
                </p>
              </div>
            </fieldset>

            <div className="mt-8 flex items-center justify-center">
              <button
                type="submit"
                disabled={loading || (!file && !recordId.trim() && !pastedJson.trim())}
                className="btn-submit"
                style={{
                  background:
                    loading || (!file && !recordId.trim() && !pastedJson.trim())
                      ? "rgba(255, 255, 255, 0.05)"
                      : "#22C55E",
                  cursor:
                    loading || (!file && !recordId.trim() && !pastedJson.trim())
                      ? "not-allowed"
                      : "pointer",
                  color:
                    loading || (!file && !recordId.trim() && !pastedJson.trim())
                      ? "#98A2B3"
                      : "#000",
                }}
                aria-label={
                  loading ? "Checking delivery in progress" : "Check delivery verification"
                }
                aria-live="polite"
                aria-busy={loading}
              >
                {loading ? "Checking..." : "Check Delivery"}
              </button>
            </div>
          </form>

          {/* Results Panel - Verified State */}
          {result && result.valid && (
            <div
              className="mt-6 rounded-xl border p-6"
              style={{
                borderColor: "rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.05)",
              }}
              role="region"
              aria-live="polite"
              aria-label="Verification result"
            >
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
                style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22C55E" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Verified</span>
              </div>
              <dl className="grid grid-cols-1 gap-3 md:grid-cols-2 font-mono text-sm">
                <div>
                  <dt style={{ color: "rgba(255, 255, 255, 0.6)" }}>record_id</dt>
                  <dd className="break-all" style={{ color: "#E6EDF7" }}>
                    {result.record_id || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt style={{ color: "rgba(255, 255, 255, 0.6)" }}>sha256</dt>
                  <dd className="break-all" style={{ color: "#E6EDF7" }}>
                    {result.sha256 || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt style={{ color: "rgba(255, 255, 255, 0.6)" }}>issued_at</dt>
                  <dd style={{ color: "#E6EDF7" }}>
                    {result.issued_at ? new Date(result.issued_at).toLocaleString() : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt style={{ color: "rgba(255, 255, 255, 0.6)" }}>signature</dt>
                  <dd className="break-all" style={{ color: "#E6EDF7" }}>
                    {result.signature || "N/A"}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Invalid state */}
          {result && !result.valid && (
            <div
              className="mt-6 p-4 rounded-xl border"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                borderColor: "#EF4444",
              }}
              role="region"
              aria-live="assertive"
              aria-atomic="true"
              aria-label="Verification result"
            >
              <div className="mt-3">
                {result.errors && result.errors.length > 0 ? (
                  <ul className="m-0 pl-5">
                    {result.errors.map((error, idx) => (
                      <li key={idx} className="text-sm mt-2" style={{ color: "#E6EDF7" }}>
                        {error}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm" style={{ color: "#EF4444" }}>
                    Verification failed.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
