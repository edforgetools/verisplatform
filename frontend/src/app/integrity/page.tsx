/**
 * Integrity page - displays registry integrity and transparency information
 */

"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";

interface LatestIntegrity {
  batch: number | null;
  merkle_root: string | null;
  s3_url: string | null;
  arweave_txid: string | null;
  schema_version: number;
  created_at?: string;
  message?: string;
}

interface IntegrityHealth {
  status: string;
  total_proofs: number;
  checks: Record<string, boolean>;
  issues: string[];
  timestamp: string;
}

export default function IntegrityPage() {
  const [latestIntegrity, setLatestIntegrity] = useState<LatestIntegrity | null>(null);
  const [health, setHealth] = useState<IntegrityHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIntegrityData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch latest integrity and health data in parallel
        const [latestResponse, healthResponse] = await Promise.all([
          fetch("/api/integrity/latest"),
          fetch("/api/integrity/health"),
        ]);

        if (!latestResponse.ok || !healthResponse.ok) {
          throw new Error("Failed to fetch integrity data");
        }

        const [latestData, healthData] = await Promise.all([
          latestResponse.json(),
          healthResponse.json(),
        ]);

        setLatestIntegrity(latestData);
        setHealth(healthData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchIntegrityData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "unhealthy":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const getCheckIcon = (check: boolean) => {
    return check ? "✅" : "❌";
  };

  const generateVerifySnippet = () => {
    if (!latestIntegrity?.merkle_root || !latestIntegrity?.s3_url) {
      return null;
    }

    return `# Verify registry integrity
# Download and verify manifest
curl -s "${latestIntegrity.s3_url}" > manifest.json

# Verify signature (requires Veris public key)
openssl dgst -sha256 -verify veris-public.pem -signature manifest.json.sig manifest.json

# Verify Merkle root
echo "Expected Merkle root: ${latestIntegrity.merkle_root}"
echo "Schema version: ${latestIntegrity.schema_version}"`;
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Registry Integrity</h1>
          <p className="text-gray-600">
            Cryptographic transparency and integrity verification for the Veris registry
          </p>
        </div>

        {/* Health Status */}
        {health && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">System Health</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  health.status,
                )}`}
              >
                {health.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Total Proofs:</span>
                <span className="ml-2 text-gray-900">{health.total_proofs.toLocaleString()}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-700">Last Check:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(health.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-gray-700">Health Checks:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {Object.entries(health.checks).map(([check, status]) => (
                  <div key={check} className="flex items-center">
                    <span className="mr-2">{getCheckIcon(status)}</span>
                    <span className="text-gray-700">
                      {check.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {health.issues.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-medium text-yellow-800 mb-2">Issues:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {health.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Latest Snapshot */}
        {latestIntegrity && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Snapshot</h2>

            {latestIntegrity.batch ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Batch:</span>
                    <span className="ml-2 text-gray-900">#{latestIntegrity.batch}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Schema Version:</span>
                    <span className="ml-2 text-gray-900">v{latestIntegrity.schema_version}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Merkle Root:</span>
                    <span className="ml-2 font-mono text-sm text-gray-900 break-all">
                      {latestIntegrity.merkle_root}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {latestIntegrity.created_at
                        ? new Date(latestIntegrity.created_at).toLocaleString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700">Links:</h3>
                  <div className="space-y-1">
                    {latestIntegrity.s3_url && (
                      <div>
                        <a
                          href={latestIntegrity.s3_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          📄 S3 Manifest
                        </a>
                      </div>
                    )}
                    {latestIntegrity.arweave_txid && (
                      <div>
                        <a
                          href={`https://arweave.net/${latestIntegrity.arweave_txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          🔗 Arweave Transaction
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Snippet */}
                {generateVerifySnippet() && (
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-700 mb-2">Verification Commands:</h3>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                      <code>{generateVerifySnippet()}</code>
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-600">
                <p>{latestIntegrity.message || "No snapshots available yet"}</p>
                <p className="text-sm mt-2">
                  Snapshots are created automatically every 1,000 proofs.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Legal Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Transparency Notice</h2>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              Veris publishes cryptographic snapshots of issued proofs for transparency. Snapshots
              and manifests are provided &quot;as is&quot; without warranties or guarantees of completeness.
              Verification results are informational and not legal advice. Use of this site and API
              is subject to our Terms and Privacy Policy.
            </p>
            <p>
              For questions about registry integrity or to report issues, please contact{" "}
              <a href="mailto:support@verisplatform.com" className="underline">
                support@verisplatform.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
