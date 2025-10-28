"use client";
import React, { useState } from "react";
import { Layout } from "@/components/Layout";

interface CloseResponse {
  url: string;
  proof_json?: Record<string, unknown>;
  [key: string]: unknown;
}

export default function ClosePage() {
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<CloseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const r = await fetch("/api/close", {
        method: "POST",
        body: fd,
      });

      const data = await r.json();
      setRes(data);
      setShowBanner(true);

      // Focus management for screen readers
      setTimeout(() => {
        const successBanner = document.querySelector('[role="alert"]');
        if (successBanner instanceof HTMLElement) {
          successBanner.focus();
        }
      }, 100);

      // Auto-dismiss banner after 4s
      setTimeout(() => setShowBanner(false), 4000);
    } catch (error) {
      console.error("Error creating delivery record:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main>
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-5xl font-semibold text-gray-200 mb-2 mt-24">Close Delivery</h1>
          <p className="text-lg text-slate-300 mt-2 mb-6">
            Files are hashed locally. No content leaves your browser.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-col gap-4">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="input"
              />
              <button
                type="submit"
                disabled={loading || !file}
                className={`btn-submit ${
                  loading || !file
                    ? "bg-slate-900 cursor-not-allowed"
                    : "bg-emerald-500 cursor-pointer"
                }`}
              >
                {loading ? "Closing Delivery..." : "Close Delivery"}
              </button>
            </div>
          </form>

          {res && (
            <div className="mt-4 space-y-4">
              {showBanner && (
                <div
                  role="alert"
                  tabIndex={-1}
                  className="p-4 rounded-xl bg-slate-900 border border-emerald-500 animate-fadeIn transition-opacity duration-150"
                >
                  <p className="text-emerald-500 font-medium">
                    ✅ Delivery Closed — record created at {new Date().toLocaleString()}.
                  </p>
                </div>
              )}

              {res.proof_json && (
                <div className={showBanner ? "mt-4" : ""}>
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => setShowJson(false)}
                      className={`${
                        !showJson ? "bg-slate-900" : "bg-transparent"
                      } border border-slate-800 text-gray-200 cursor-pointer px-4 py-2 rounded-lg text-sm`}
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => setShowJson(true)}
                      className={`${
                        showJson ? "bg-slate-900" : "bg-transparent"
                      } border border-slate-800 text-gray-200 cursor-pointer px-4 py-2 rounded-lg text-sm`}
                    >
                      JSON
                    </button>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
                    {showJson ? (
                      <pre className="m-0 p-4 bg-slate-950 rounded-lg overflow-x-auto text-sm text-slate-300 font-mono leading-relaxed">
                        {JSON.stringify(res.proof_json, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-slate-300 text-base leading-relaxed">
                        <div className="mb-3">
                          <strong className="text-gray-200">Record ID:</strong>{" "}
                          {(res.proof_json.record_id as string) ||
                            (res.proof_json.proof_id as string) ||
                            "N/A"}
                        </div>
                        <div className="mb-3">
                          <strong className="text-gray-200">Issuer:</strong>{" "}
                          {(res.proof_json.issuer as string) || "N/A"}
                        </div>
                        <div className="mb-3">
                          <strong className="text-gray-200">Issued at:</strong>{" "}
                          {(res.proof_json.issued_at as string) || "N/A"}
                        </div>
                        <div>
                          <strong className="text-gray-200">Status:</strong>{" "}
                          {(res.proof_json.status as string) || "closed"}
                        </div>
                      </div>
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
