"use client";
import React, { useState } from "react";
import { generateUserId } from "@/lib/ids";
import { Navigation } from "@/components/Navigation";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      <main className="p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-2xl font-serif">Veris Demo</h1>
          <p className="text-sm text-neutral-400">
            Evaluation only. Records may be purged after 7 days as per build plan Phase 2.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full bg-neutral-900 p-3 rounded border border-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-neutral-800"
            />
            <button
              type="submit"
              disabled={loading || !file}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
            >
              {loading ? "Creating Proof..." : "Create Proof"}
            </button>
          </form>
          {res && (
            <div className="mt-6 space-y-4">
              <div className="p-4 rounded bg-emerald-900/20 border border-emerald-600">
                <p className="text-green-400 mb-2 font-medium">✓ Proof created successfully!</p>
                <a
                  href={res.url}
                  className="text-emerald-400 hover:text-emerald-300 underline focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                >
                  View proof →
                </a>
              </div>

              {res.proof_json && (
                <div>
                  <button
                    onClick={() => setShowJson(!showJson)}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                  >
                    <span>{showJson ? "▼" : "▶"}</span>
                    <span>View Canonical Proof JSON</span>
                  </button>
                  {showJson && (
                    <pre className="mt-2 p-4 bg-neutral-900 rounded border border-neutral-700 overflow-x-auto text-xs text-neutral-300 font-mono">
                      {JSON.stringify(res.proof_json, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
