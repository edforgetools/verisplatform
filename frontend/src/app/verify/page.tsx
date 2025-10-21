'use client';
import React, { useState } from 'react';

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [id, setId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !id) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('id', id);
      const res = await fetch('/api/proof/verify', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Verification failed', 'error');
        return;
      }

      setResult(data);

      if (data.verified) {
        showToast('File verification successful! ✅', 'success');
      } else {
        showToast(
          'File verification failed - hashes do not match! ❌',
          'error',
        );
      }
    } catch (error) {
      showToast('Network error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-lg font-bold hover:opacity-70"
          >
            ×
          </button>
        </div>
      )}

      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-serif">Verify File</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Proof ID</label>
            <input
              className="block w-full bg-neutral-900 p-3 rounded border border-neutral-700 focus:border-emerald-500 focus:outline-none"
              placeholder="Enter proof ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              File to Verify
            </label>
            <input
              className="block w-full bg-neutral-900 p-3 rounded border border-neutral-700 focus:border-emerald-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify File'}
          </button>
        </form>

        {/* Results Panel */}
        {result && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              result.verified
                ? 'bg-emerald-900/20 border-emerald-600 text-emerald-100'
                : 'bg-red-900/20 border-red-600 text-red-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{result.verified ? '✅' : '❌'}</span>
              <span className="font-semibold">
                {result.verified
                  ? 'Verification Successful'
                  : 'Verification Failed'}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Status:</span>{' '}
                {result.verified ? 'VERIFIED' : 'MISMATCH'}
              </div>
              <div>
                <span className="font-medium">Sealed:</span>{' '}
                {new Date(result.timestamp).toUTCString()}
              </div>
              <div>
                <span className="font-medium">Expected Hash:</span>
                <div className="font-mono text-xs break-all mt-1 p-2 bg-neutral-800 rounded">
                  {result.expected}
                </div>
              </div>
              <div>
                <span className="font-medium">File Hash:</span>
                <div className="font-mono text-xs break-all mt-1 p-2 bg-neutral-800 rounded">
                  {result.got}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
