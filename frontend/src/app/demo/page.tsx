'use client';
import React, { useState } from 'react';
import { generateUserId } from '@/lib/ids';

export default function DemoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<{ url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Generate a consistent demo user ID for this session
  const demoUserId = generateUserId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('user_id', demoUserId);
      const r = await fetch('/api/proof/create', {
        method: 'POST',
        body: fd,
        headers: { 'x-user-id': demoUserId },
      });
      const data = await r.json();
      setRes(data);
    } catch (error) {
      console.error('Error creating proof:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-serif">Veris Demo</h1>
        <p className="text-sm text-neutral-400">
          Evaluation only. Records may be purged after 7 days as per build plan
          Phase 2.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full bg-neutral-900 p-3 rounded border border-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            {loading ? 'Creating Proof...' : 'Create Proof'}
          </button>
        </form>
        {res && (
          <div className="mt-4 p-3 rounded bg-neutral-900">
            <p className="text-green-400 mb-2">Proof created successfully!</p>
            <a className="underline text-emerald-400" href={res.url}>
              View proof
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
