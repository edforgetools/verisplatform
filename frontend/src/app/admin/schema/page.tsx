"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Navigation } from "@/components/Navigation";
import toast, { Toaster } from "react-hot-toast";

interface SchemaVersion {
  version: string;
  isLatest: boolean;
  createdAt: string;
  path: string;
}

interface SchemaVersionInfo {
  versions: SchemaVersion[];
  latestVersion: string;
  totalVersions: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  schemaVersion: string;
}

interface MigrationResult {
  success: boolean;
  migratedProof: any;
  warnings: string[];
  errors: string[];
  fromVersion: string;
  toVersion: string;
}

export default function SchemaDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [schemaInfo, setSchemaInfo] = useState<SchemaVersionInfo | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [user, setUser] = useState<any>(null);
  const [testProof, setTestProof] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [migrationFrom, setMigrationFrom] = useState("");
  const [migrationTo, setMigrationTo] = useState("");

  useEffect(() => {
    const loadSchemaData = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient().auth.getUser();

        if (!user) {
          toast.error("Please log in to view schema data");
          return;
        }

        setUser(user);

        // Load schema version information
        const versionsResponse = await fetch("/api/schema/versions", {
          headers: {
            Authorization: `Bearer ${
              (
                await supabaseClient().auth.getSession()
              ).data.session?.access_token
            }`,
          },
        });

        if (versionsResponse.ok) {
          const versions = await versionsResponse.json();
          setSchemaInfo(versions);
          setSelectedVersion(versions.latestVersion);
          setMigrationFrom(versions.latestVersion);
          setMigrationTo(versions.latestVersion);
        }
      } catch (error) {
        console.error("Error loading schema data:", error);
        toast.error("Failed to load schema information");
      } finally {
        setLoading(false);
      }
    };

    loadSchemaData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleValidateProof = async () => {
    if (!testProof.trim()) {
      toast.error("Please enter a proof to validate");
      return;
    }

    try {
      let proof;
      try {
        proof = JSON.parse(testProof);
      } catch (error) {
        toast.error("Invalid JSON format");
        return;
      }

      const response = await fetch("/api/schema/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await supabaseClient().auth.getSession()
            ).data.session?.access_token
          }`,
        },
        body: JSON.stringify({
          proof,
          version: selectedVersion || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);

        if (result.valid) {
          toast.success("Proof validation successful!");
        } else {
          toast.error(`Proof validation failed: ${result.errors.join(", ")}`);
        }
      } else {
        toast.error("Failed to validate proof");
      }
    } catch (error) {
      console.error("Error validating proof:", error);
      toast.error("Failed to validate proof");
    }
  };

  const handleMigrateProof = async () => {
    if (!testProof.trim()) {
      toast.error("Please enter a proof to migrate");
      return;
    }

    if (!migrationFrom || !migrationTo) {
      toast.error("Please select from and to versions");
      return;
    }

    try {
      let proof;
      try {
        proof = JSON.parse(testProof);
      } catch (error) {
        toast.error("Invalid JSON format");
        return;
      }

      const response = await fetch("/api/schema/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await supabaseClient().auth.getSession()
            ).data.session?.access_token
          }`,
        },
        body: JSON.stringify({
          proof,
          fromVersion: migrationFrom,
          toVersion: migrationTo,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMigrationResult(result);

        if (result.success) {
          toast.success("Proof migration successful!");
          setTestProof(JSON.stringify(result.migratedProof, null, 2));
        } else {
          toast.error(`Proof migration failed: ${result.errors.join(", ")}`);
        }
      } else {
        toast.error("Failed to migrate proof");
      }
    } catch (error) {
      console.error("Error migrating proof:", error);
      toast.error("Failed to migrate proof");
    }
  };

  const handleRunRegressionTests = async () => {
    try {
      const response = await fetch("/api/schema/regression?action=check", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${
            (
              await supabaseClient().auth.getSession()
            ).data.session?.access_token
          }`,
        },
      });

      if (response.ok) {
        const result = await response.json();

        if (result.allPassed) {
          toast.success("All regression tests passed!");
        } else {
          toast.error(`Regression tests failed: ${result.summary.failedVersions} versions failed`);
        }
      } else {
        toast.error("Failed to run regression tests");
      }
    } catch (error) {
      console.error("Error running regression tests:", error);
      toast.error("Failed to run regression tests");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      <main className="p-6">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1f2937",
              color: "#f9fafb",
              border: "1px solid #374151",
            },
          }}
        />

        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-serif mb-2">Schema Version Control</h1>
              <p className="text-neutral-400">Manage schema versions and backward compatibility</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleRunRegressionTests}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Run Regression Tests
              </button>
            </div>
          </div>

          {/* Schema Versions */}
          {schemaInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Total Versions</div>
                <div className="text-3xl font-bold text-white">{schemaInfo.totalVersions}</div>
                <div className="text-xs text-neutral-500 mt-1">Schema versions</div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Latest Version</div>
                <div className="text-3xl font-bold text-emerald-400">
                  v{schemaInfo.latestVersion}
                </div>
                <div className="text-xs text-neutral-500 mt-1">Current schema</div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Compatibility</div>
                <div className="text-3xl font-bold text-green-400">✓</div>
                <div className="text-xs text-neutral-500 mt-1">Backward compatible</div>
              </div>
            </div>
          )}

          {/* Schema Versions List */}
          {schemaInfo && (
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Available Schema Versions</h2>
              <div className="space-y-3">
                {schemaInfo.versions.map((version) => (
                  <div
                    key={version.version}
                    className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-medium">v{version.version}</div>
                      {version.isLatest && (
                        <span className="px-2 py-1 bg-emerald-600 text-emerald-100 text-xs rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-neutral-400">{formatDate(version.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proof Validation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Proof Validation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Schema Version</label>
                  <select
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    className="w-full p-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white"
                  >
                    {schemaInfo?.versions.map((version) => (
                      <option key={version.version} value={version.version}>
                        v{version.version} {version.isLatest ? "(Latest)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Proof JSON</label>
                  <textarea
                    value={testProof}
                    onChange={(e) => setTestProof(e.target.value)}
                    placeholder="Enter proof JSON to validate..."
                    className="w-full h-32 p-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white font-mono text-sm"
                  />
                </div>
                <button
                  onClick={handleValidateProof}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Validate Proof
                </button>
              </div>
            </div>

            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Proof Migration</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">From Version</label>
                    <select
                      value={migrationFrom}
                      onChange={(e) => setMigrationFrom(e.target.value)}
                      className="w-full p-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white"
                    >
                      {schemaInfo?.versions.map((version) => (
                        <option key={version.version} value={version.version}>
                          v{version.version}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">To Version</label>
                    <select
                      value={migrationTo}
                      onChange={(e) => setMigrationTo(e.target.value)}
                      className="w-full p-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white"
                    >
                      {schemaInfo?.versions.map((version) => (
                        <option key={version.version} value={version.version}>
                          v{version.version}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleMigrateProof}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Migrate Proof
                </button>
              </div>
            </div>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Validation Results</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`text-lg font-medium ${
                      validationResult.valid ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {validationResult.valid ? "✓ Valid" : "✗ Invalid"}
                  </div>
                  <div className="text-sm text-neutral-400">
                    Schema Version: {validationResult.schemaVersion}
                  </div>
                </div>
                {validationResult.errors.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-400 mb-2">Errors:</div>
                    <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validationResult.warnings.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-yellow-400 mb-2">Warnings:</div>
                    <ul className="list-disc list-inside text-sm text-yellow-300 space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Migration Results */}
          {migrationResult && (
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Migration Results</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`text-lg font-medium ${
                      migrationResult.success ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {migrationResult.success ? "✓ Success" : "✗ Failed"}
                  </div>
                  <div className="text-sm text-neutral-400">
                    {migrationResult.fromVersion} → {migrationResult.toVersion}
                  </div>
                </div>
                {migrationResult.errors.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-400 mb-2">Errors:</div>
                    <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                      {migrationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {migrationResult.warnings.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-yellow-400 mb-2">Warnings:</div>
                    <ul className="list-disc list-inside text-sm text-yellow-300 space-y-1">
                      {migrationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
