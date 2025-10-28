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
          <h1 className="text-5xl font-semibold text-gray-200 mb-2 mt-24">Check Delivery</h1>
          <p className="text-lg text-slate-300 mt-2 mb-6">
            Verify file integrity using file, record ID, or record.json.
          </p>

          <form onSubmit={submit} className="grid gap-6">
            <div className="grid gap-6">
              {/* File Input */}
              <div>
                <label
                  htmlFor="file-input"
                  className="block text-sm font-medium mb-2 text-gray-200"
                >
                  1. Upload file + record.json (Recommended)
                </label>
                <input
                  id="file-input"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="input"
                />
              </div>

              {/* Paste JSON */}
              <div>
                <label
                  htmlFor="json-input"
                  className="block text-sm font-medium mb-2 text-gray-200"
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
                />
              </div>

              {/* Record ID */}
              <div>
                <label
                  htmlFor="record-input"
                  className="block text-sm font-medium mb-2 text-gray-200"
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
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center">
              <button
                type="submit"
                disabled={loading || (!file && !recordId.trim() && !pastedJson.trim())}
                className={`btn-submit ${
                  loading || (!file && !recordId.trim() && !pastedJson.trim())
                    ? "bg-slate-900 cursor-not-allowed"
                    : "bg-emerald-500 cursor-pointer"
                }`}
              >
                {loading ? "Checking..." : "Check Delivery"}
              </button>
            </div>
          </form>

          {/* Results Panel */}
          {result && (
            <div
              className={`mt-6 p-4 rounded-xl bg-slate-900 shadow-md ${
                result.valid ? "border-emerald-500" : "border-red-500"
              } border`}
              role="region"
              aria-live="assertive"
              aria-atomic="true"
              aria-label="Verification result"
            >
              {result.valid ? (
                <div>
                  <p className="text-base text-emerald-500 font-medium">
                    ✅ Delivery confirmed — file matches record.
                  </p>
                  {result.signer && (
                    <p className="text-sm text-slate-300">Verified by: {result.signer}</p>
                  )}
                  {result.issued_at && (
                    <p className="text-sm text-slate-300">
                      Issued at: {new Date(result.issued_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mt-3">
                    {result.errors && result.errors.length > 0 ? (
                      <ul className="m-0 pl-5">
                        {result.errors.map((error, idx) => (
                          <li key={idx} className="text-sm text-slate-300 mt-2">
                            {error}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-red-500">Verification failed.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
