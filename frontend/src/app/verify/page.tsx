'use client';
import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    verified: boolean;
    verified_by: string;
    hashHex: string;
    signatureB64: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  // Extract proof ID from URL or use as-is if already an ID
  const extractProofId = (input: string): string | null => {
    if (!input.trim()) return null;

    // If it looks like a URL, try to extract ID from path
    if (input.includes('/')) {
      try {
        const url = new URL(input);
        const pathParts = url.pathname.split('/');
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

    const proofId = extractProofId(input);
    if (!proofId) {
      toast.error('Please enter a valid proof ID or URL');
      return;
    }

    if (!file) {
      toast.error('Please select a file to verify');
      return;
    }

    setLoading(true);
    setElapsedMs(null);
    const startTime = performance.now();

    try {
      const res = await fetch('/api/proof/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: proofId }),
      });

      const elapsed = Math.round(performance.now() - startTime);
      setElapsedMs(elapsed);

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Verification failed');
        return;
      }

      setResult(data);

      if (data.verified) {
        toast.success(`Verification successful! (${elapsed}ms)`);
      } else {
        toast.error(
          `Verification failed - ${
            data.verified_by === 'signature'
              ? 'signature invalid'
              : 'hash mismatch'
          } (${elapsed}ms)`,
        );
      }
    } catch (error) {
      const elapsed = Math.round(performance.now() - startTime);
      setElapsedMs(elapsed);
      toast.error(`Network error occurred (${elapsed}ms)`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f9fafb',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f9fafb',
            },
          },
        }}
      />

      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-serif">Verify File</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="proof-input"
              className="block text-sm font-medium mb-2"
            >
              Proof ID or URL
            </label>
            <input
              id="proof-input"
              className="block w-full bg-neutral-900 p-3 rounded border border-neutral-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Enter proof ID or paste proof URL"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
              autoComplete="off"
              aria-describedby="proof-help"
            />
            <p id="proof-help" className="mt-1 text-xs text-neutral-400">
              You can paste a full proof URL or just the proof ID
            </p>
          </div>

          <div>
            <label
              htmlFor="file-input"
              className="block text-sm font-medium mb-2"
            >
              File to Verify
            </label>
            <input
              id="file-input"
              className="block w-full bg-neutral-900 p-3 rounded border border-neutral-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              aria-describedby="file-help"
            />
            <p id="file-help" className="mt-1 text-xs text-neutral-400">
              Select the file you want to verify against the proof
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            aria-describedby="submit-help"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
              'Verify File'
            )}
          </button>
          {elapsedMs !== null && (
            <p
              id="submit-help"
              className="text-xs text-neutral-400 text-center"
            >
              Last verification took {elapsedMs}ms
            </p>
          )}
        </form>

        {/* Results Panel */}
        {result && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              result.verified
                ? 'bg-emerald-900/20 border-emerald-600 text-emerald-100'
                : 'bg-red-900/20 border-red-600 text-red-100'
            }`}
            role="region"
            aria-live="polite"
            aria-label="Verification result"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg" aria-hidden="true">
                {result.verified ? '✅' : '❌'}
              </span>
              <span className="font-semibold">
                {result.verified
                  ? 'Verification Successful'
                  : 'Verification Failed'}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Status:</span>{' '}
                {result.verified ? 'VERIFIED' : 'FAILED'}
              </div>
              <div>
                <span className="font-medium">Verified by:</span>{' '}
                {result.verified_by === 'signature'
                  ? 'Digital Signature'
                  : 'Hash Only'}
              </div>
              <div>
                <span className="font-medium">Proof Hash:</span>
                <div className="font-mono text-xs break-all mt-1 p-2 bg-neutral-800 rounded">
                  {result.hashHex}
                </div>
              </div>
              {result.signatureB64 && (
                <div>
                  <span className="font-medium">Signature:</span>
                  <div className="font-mono text-xs break-all mt-1 p-2 bg-neutral-800 rounded">
                    {result.signatureB64}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
