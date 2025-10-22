'use client';

import React, { useEffect, useState } from 'react';
import { getKeyFingerprint, formatKeyFingerprint } from '@/lib/crypto';

interface Proof {
  id: string;
  user_id: string;
  file_name: string;
  version: number | null;
  hash_full: string;
  hash_prefix: string;
  signature: string;
  timestamp: string;
  project: string | null;
  visibility: string;
  anchor_txid: string | null;
  created_at: string | null;
}

interface VerificationStatus {
  verified: boolean;
  status: 'verified' | 'invalid' | 'pending';
  proofId: string;
  verified_by?: 'signature' | 'hash';
}

interface ProofViewerProps {
  proofId: string;
}

export function ProofViewer({ proofId }: ProofViewerProps) {
  const [proof, setProof] = useState<Proof | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyFingerprint, setKeyFingerprint] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch proof data
        const proofRes = await fetch(`/api/proof/${proofId}`);
        if (!proofRes.ok) {
          throw new Error('Proof not found');
        }
        const proofData = await proofRes.json();
        setProof(proofData);

        // Fetch verification status
        const verifyRes = await fetch('/api/proof/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proofId }),
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          setVerificationStatus(verifyData);
        } else {
          setVerificationStatus({
            verified: false,
            status: 'pending',
            proofId,
          });
        }

        // Generate key fingerprint
        const fingerprint = getKeyFingerprint();
        if (fingerprint) {
          setKeyFingerprint(formatKeyFingerprint(fingerprint));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load proof');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [proofId]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-pulse">
        <div className="p-8">
          <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded w-64 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-full"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div className="text-red-500 text-lg font-medium mb-2">Error</div>
        <div className="text-slate-600 dark:text-slate-400">
          {error || 'Proof not found'}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800';
      case 'invalid':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800';
      case 'pending':
      default:
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'invalid':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'pending':
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const status = verificationStatus?.status || 'pending';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  const verificationMethod = verificationStatus?.verified_by || 'hash';
  const verificationBadgeText =
    verificationMethod === 'signature'
      ? 'Verified by signature'
      : 'Hash-match only';

  return (
    <div className="relative">
      {/* Copy Success Notification */}
      {copySuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm font-medium">Copied {copySuccess}!</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 px-8 py-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                Veris Proof Certificate
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Cryptographic proof of file integrity
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(
                  status,
                )}`}
              >
                {getStatusIcon(status)}
                <span className="font-medium">{statusText}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {verificationBadgeText}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - File Details */}
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  File Information
                </h2>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                      File Name
                    </span>
                    <span className="text-slate-900 dark:text-white font-mono text-sm bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded border">
                      {proof.file_name}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Version
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {proof.version || '1'}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Project
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {proof.project || '—'}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Visibility
                    </span>
                    <span className="text-slate-900 dark:text-white capitalize">
                      {proof.visibility}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Cryptographic Details */}
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Cryptographic Proof
                </h2>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Hash (SHA-256)
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="text-slate-900 dark:text-white font-mono text-sm bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded border break-all flex-1">
                        {proof.hash_prefix}…
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(proof.hash_full, 'Full hash')
                        }
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        title="Copy full hash"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          copyToClipboard(proof.hash_prefix, 'Short hash')
                        }
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        title="Copy short hash"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Timestamp
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 dark:text-white flex-1">
                        {new Date(proof.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZoneName: 'short',
                        })}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(proof.timestamp, 'Timestamp')
                        }
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        title="Copy timestamp"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Proof ID
                    </span>
                    <code className="text-slate-900 dark:text-white font-mono text-sm bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded border">
                      {proof.id}
                    </code>
                  </div>

                  {proof.anchor_txid && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Blockchain Anchor
                      </span>
                      <code className="text-slate-900 dark:text-white font-mono text-sm bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded border break-all">
                        {proof.anchor_txid}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Digital Signature
            </h3>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <code className="text-slate-900 dark:text-white font-mono text-sm break-all flex-1">
                  {proof.signature}
                </code>
                <button
                  onClick={() => copyToClipboard(proof.signature, 'Signature')}
                  className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors shrink-0"
                  title="Copy signature"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Key Fingerprint Section */}
          {keyFingerprint && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Signing Key Fingerprint
              </h3>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <code className="text-slate-900 dark:text-white font-mono text-sm flex-1">
                    {keyFingerprint}
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(keyFingerprint, 'Key fingerprint')
                    }
                    className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    title="Copy key fingerprint"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  SHA-256 fingerprint of the public key used for signing
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`/api/proof/${proof.id}/certificate`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download Certificate
            </a>

            <a
              href={`/verify?id=${proof.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Verify File
            </a>

            <a
              href={`/history/${proof.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              View History
            </a>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verified by Veris • Proof #{proof.id} • Generated on{' '}
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
