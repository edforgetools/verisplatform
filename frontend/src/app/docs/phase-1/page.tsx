/**
 * Phase-1 completion documentation page
 */

"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";

interface Phase1Metrics {
  proofs_issued_total: number;
  verifications_total: number;
  verification_success_ratio_1k: number;
  automation_efficiency: number;
}

interface Phase1Gates {
  issued_gate: boolean;
  success_ratio_gate: boolean;
  overall_phase1_ready: boolean;
}

interface IntegrityData {
  batch: number | null;
  merkle_root: string | null;
  s3_url: string | null;
  arweave_txid: string | null;
  schema_version: number;
  created_at?: string;
}

export default function Phase1DocsPage() {
  const [metrics, setMetrics] = useState<Phase1Metrics | null>(null);
  const [gates, setGates] = useState<Phase1Gates | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPhase1Data() {
      try {
        setLoading(true);
        setError(null);

        // Fetch Phase-1 metrics, integrity data in parallel
        const [metricsResponse, integrityResponse] = await Promise.all([
          fetch("/api/metrics/phase1"),
          fetch("/api/integrity/latest"),
        ]);

        if (!metricsResponse.ok || !integrityResponse.ok) {
          throw new Error("Failed to fetch Phase-1 data");
        }

        const [metricsData, integrityData] = await Promise.all([
          metricsResponse.json(),
          integrityResponse.json(),
        ]);

        setMetrics(metricsData.metrics);
        setGates(metricsData.gates);
        setIntegrity(integrityData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchPhase1Data();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchPhase1Data, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: boolean) => {
    return status ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100";
  };

  const getStatusIcon = (status: boolean) => {
    return status ? "✅" : "❌";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-800 mb-2">Error</h1>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Phase-1 Completion</h1>
          <p className="text-gray-600">
            Veris Phase-1 implementation status, metrics, and service level objectives
          </p>
        </div>

        {/* Phase-1 Status */}
        {gates && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Phase-1 Status</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  gates.overall_phase1_ready,
                )}`}
              >
                {gates.overall_phase1_ready ? "READY" : "IN PROGRESS"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Proofs Issued Gate (≥500)</span>
                <span className="flex items-center">
                  <span className="mr-2">{getStatusIcon(gates.issued_gate)}</span>
                  <span className={getStatusColor(gates.issued_gate)}>
                    {gates.issued_gate ? "PASSED" : "PENDING"}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-700">Success Ratio Gate (≥99%)</span>
                <span className="flex items-center">
                  <span className="mr-2">{getStatusIcon(gates.success_ratio_gate)}</span>
                  <span className={getStatusColor(gates.success_ratio_gate)}>
                    {gates.success_ratio_gate ? "PASSED" : "PENDING"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Live Metrics */}
        {metrics && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Metrics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {metrics.proofs_issued_total.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Proofs Issued</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {metrics.verifications_total.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Verifications (Last 1K)</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {(metrics.verification_success_ratio_1k * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Success Ratio</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {(metrics.automation_efficiency * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Automation Efficiency</div>
              </div>
            </div>
          </div>
        )}

        {/* Service Level Objectives */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Level Objectives</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">Proof Creation Availability</span>
              <span className="text-green-600 font-semibold">99.9%</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">Verification Response Time</span>
              <span className="text-green-600 font-semibold">&lt; 500ms</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">Registry Snapshot Frequency</span>
              <span className="text-green-600 font-semibold">Every 1,000 proofs</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">Arweave Publishing</span>
              <span className="text-green-600 font-semibold">Within 1 hour</span>
            </div>
          </div>
        </div>

        {/* Latest Snapshot */}
        {integrity && integrity.batch && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Registry Snapshot</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Batch:</span>
                <span className="ml-2 text-gray-900">#{integrity.batch}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Schema Version:</span>
                <span className="ml-2 text-gray-900">v{integrity.schema_version}</span>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700">Merkle Root:</span>
                <span className="ml-2 font-mono text-sm text-gray-900 break-all">
                  {integrity.merkle_root}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-900">
                  {integrity.created_at
                    ? new Date(integrity.created_at).toLocaleString()
                    : "Unknown"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Arweave Published:</span>
                <span className="ml-2 text-gray-900">
                  {integrity.arweave_txid ? "✅ Yes" : "⏳ Pending"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SDK and Documentation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Developer Resources</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium text-gray-700">JavaScript SDK</div>
                <div className="text-sm text-gray-600">@veris/sdk - ESM TypeScript package</div>
              </div>
              <a href="/docs" className="text-blue-600 hover:text-blue-800 underline">
                View Docs →
              </a>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium text-gray-700">OpenAPI Specification</div>
                <div className="text-sm text-gray-600">Complete API documentation</div>
              </div>
              <a href="/docs" className="text-blue-600 hover:text-blue-800 underline">
                View API →
              </a>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium text-gray-700">Registry Integrity</div>
                <div className="text-sm text-gray-600">Transparency and verification</div>
              </div>
              <a href="/integrity" className="text-blue-600 hover:text-blue-800 underline">
                View Integrity →
              </a>
            </div>
          </div>
        </div>

        {/* Implementation Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Implementation Status</h2>

          <div className="space-y-3">
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">Canonical Proof Schema v1</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">Registry Snapshots (S3 + Arweave)</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">Integrity Endpoints & UI</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">Verification API v1</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">OpenAPI Spec & SDK</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">
                Billing Rules (Issuance Paid, Verification Free)
              </span>
            </div>
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">Phase-1 Telemetry & Gates</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">Rate Limiting & Security Headers</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">Idempotency System</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3">✅</span>
              <span className="text-gray-700">CI/CD Workflows</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
