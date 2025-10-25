"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Navigation } from "@/components/Navigation";
import toast, { Toaster } from "react-hot-toast";

interface RecoveryAuditStatus {
  shouldRun: boolean;
  reason: string;
  lastAuditDate?: string;
  proofCountSinceLastAudit?: number;
}

interface RecoveryAuditMetrics {
  totalAudited: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  hashMismatches: number;
  signatureFailures: number;
  crossMirrorInconsistencies?: number;
  averageRecoveryTimeMs?: number;
  integrityScore?: number;
  sourceBreakdown: {
    s3: number;
    arweave: number;
    database: number;
    local?: number;
  };
  performanceMetrics?: {
    fastestRecoveryMs: number;
    slowestRecoveryMs: number;
    medianRecoveryMs: number;
  };
  errors: string[];
  warnings: string[];
  auditDate: string;
}

interface RecoveryAuditHistory {
  audit_date: string;
  total_audited: number;
  successful_recoveries: number;
  failed_recoveries: number;
  hash_mismatches: number;
  signature_failures: number;
  cross_mirror_inconsistencies?: number;
  average_recovery_time_ms?: number;
  integrity_score?: number;
  source_breakdown: any;
  performance_metrics?: any;
  errors: string[];
  warnings: string[];
}

export default function RecoveryAuditDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [auditStatus, setAuditStatus] = useState<RecoveryAuditStatus | null>(null);
  const [auditHistory, setAuditHistory] = useState<RecoveryAuditHistory[]>([]);
  const [user, setUser] = useState<any>(null);
  const [enhancedMode, setEnhancedMode] = useState(false);

  useEffect(() => {
    const loadRecoveryData = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient().auth.getUser();

        if (!user) {
          toast.error("Please log in to view recovery audit data");
          return;
        }

        setUser(user);

        // Load recovery audit status
        const statusResponse = await fetch("/api/jobs/recovery-audit?action=status", {
          headers: {
            Authorization: `Bearer ${
              (
                await supabaseClient().auth.getSession()
              ).data.session?.access_token
            }`,
          },
        });

        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setAuditStatus(status);
        }

        // Load recovery audit history
        const historyResponse = await fetch(
          `/api/jobs/recovery-audit?action=history&enhanced=${enhancedMode}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${
                (
                  await supabaseClient().auth.getSession()
                ).data.session?.access_token
              }`,
            },
          },
        );

        if (historyResponse.ok) {
          const history = await historyResponse.json();
          setAuditHistory(history.history || []);
        }
      } catch (error) {
        console.error("Error loading recovery audit data:", error);
        toast.error("Failed to load recovery audit information");
      } finally {
        setLoading(false);
      }
    };

    loadRecoveryData();
  }, [enhancedMode]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const handleRunAudit = async () => {
    try {
      const response = await fetch(`/api/jobs/recovery-audit?action=run&enhanced=${enhancedMode}`, {
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
        toast.success(
          `Recovery audit completed! ${result.successfulRecoveries}/${result.totalAudited} successful`,
        );
        // Reload data
        window.location.reload();
      } else {
        toast.error("Failed to run recovery audit");
      }
    } catch (error) {
      console.error("Error running recovery audit:", error);
      toast.error("Failed to run recovery audit");
    }
  };

  const handleCheckAndRun = async () => {
    try {
      const response = await fetch(
        `/api/jobs/recovery-audit?action=check&enhanced=${enhancedMode}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${
              (
                await supabaseClient().auth.getSession()
              ).data.session?.access_token
            }`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        if (result.ran) {
          toast.success(
            `Recovery audit ran automatically! ${result.result.successfulRecoveries}/${result.result.totalAudited} successful`,
          );
        } else {
          toast(`Recovery audit not needed: ${result.reason}`, {
            icon: "ℹ️",
          });
        }
        // Reload data
        window.location.reload();
      } else {
        toast.error("Failed to check and run recovery audit");
      }
    } catch (error) {
      console.error("Error checking and running recovery audit:", error);
      toast.error("Failed to check and run recovery audit");
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
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
              <h1 className="text-3xl font-serif mb-2">Recovery Audit Dashboard</h1>
              <p className="text-neutral-400">Monitor and manage recovery audit operations</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-400">Enhanced Mode</label>
                <input
                  type="checkbox"
                  checked={enhancedMode}
                  onChange={(e) => setEnhancedMode(e.target.checked)}
                  className="rounded"
                />
              </div>
              <button
                onClick={handleCheckAndRun}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Check & Run
              </button>
              <button
                onClick={handleRunAudit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Run Audit
              </button>
            </div>
          </div>

          {/* Status Cards */}
          {auditStatus && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Audit Status</div>
                <div
                  className={`text-3xl font-bold ${
                    auditStatus.shouldRun ? "text-yellow-400" : "text-green-400"
                  }`}
                >
                  {auditStatus.shouldRun ? "Due" : "Current"}
                </div>
                <div className="text-xs text-neutral-500 mt-1">{auditStatus.reason}</div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Last Audit</div>
                <div className="text-3xl font-bold text-blue-400">
                  {auditStatus.lastAuditDate ? formatDate(auditStatus.lastAuditDate) : "Never"}
                </div>
                <div className="text-xs text-neutral-500 mt-1">Previous audit</div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Since Last Audit</div>
                <div className="text-3xl font-bold text-purple-400">
                  {formatNumber(auditStatus.proofCountSinceLastAudit || 0)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {formatNumber(10000 - (auditStatus.proofCountSinceLastAudit || 0))} until next
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Mode</div>
                <div
                  className={`text-3xl font-bold ${
                    enhancedMode ? "text-emerald-400" : "text-blue-400"
                  }`}
                >
                  {enhancedMode ? "Enhanced" : "Standard"}
                </div>
                <div className="text-xs text-neutral-500 mt-1">Audit mode</div>
              </div>
            </div>
          )}

          {/* Audit History */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
            <h2 className="text-xl font-semibold mb-4">Recent Audit History</h2>
            {auditHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Total</th>
                      <th className="text-left py-3 px-4">Success</th>
                      <th className="text-left py-3 px-4">Failed</th>
                      <th className="text-left py-3 px-4">Hash Mismatches</th>
                      <th className="text-left py-3 px-4">Signature Failures</th>
                      {enhancedMode && (
                        <>
                          <th className="text-left py-3 px-4">Cross-Mirror Issues</th>
                          <th className="text-left py-3 px-4">Avg Time</th>
                          <th className="text-left py-3 px-4">Integrity Score</th>
                        </>
                      )}
                      <th className="text-left py-3 px-4">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditHistory.map((audit, index) => (
                      <tr key={index} className="border-b border-neutral-800">
                        <td className="py-3 px-4 font-medium">{formatDate(audit.audit_date)}</td>
                        <td className="py-3 px-4">{formatNumber(audit.total_audited)}</td>
                        <td className="py-3 px-4 text-emerald-400">
                          {formatNumber(audit.successful_recoveries)}
                        </td>
                        <td className="py-3 px-4 text-red-400">
                          {formatNumber(audit.failed_recoveries)}
                        </td>
                        <td className="py-3 px-4 text-yellow-400">
                          {formatNumber(audit.hash_mismatches)}
                        </td>
                        <td className="py-3 px-4 text-orange-400">
                          {formatNumber(audit.signature_failures)}
                        </td>
                        {enhancedMode && (
                          <>
                            <td className="py-3 px-4 text-purple-400">
                              {audit.cross_mirror_inconsistencies
                                ? formatNumber(audit.cross_mirror_inconsistencies)
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4 text-blue-400">
                              {audit.average_recovery_time_ms
                                ? formatDuration(audit.average_recovery_time_ms)
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4 text-green-400">
                              {audit.integrity_score
                                ? `${audit.integrity_score.toFixed(1)}%`
                                : "N/A"}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-red-400">{audit.errors.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">No audit history found</div>
            )}
          </div>

          {/* Enhanced Mode Features */}
          {enhancedMode && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Enhanced Features</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-sm">Cross-mirror consistency validation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-sm">Performance monitoring</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-sm">Integrity scoring</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-sm">Advanced error analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-sm">Recovery time tracking</span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Audit Configuration</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Batch Size</span>
                    <span className="text-white font-medium">20 proofs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Max Errors</span>
                    <span className="text-white font-medium">10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Sources</span>
                    <span className="text-white font-medium">Database, S3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Performance Threshold</span>
                    <span className="text-white font-medium">5,000ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Integrity Threshold</span>
                    <span className="text-white font-medium">95%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {auditStatus && (
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Next Audit Progress</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-neutral-400 text-sm mb-1">Progress to Next Audit</div>
                  <div className="w-full bg-neutral-700 rounded-full h-2">
                    <div
                      className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          ((auditStatus.proofCountSinceLastAudit || 0) / 10000) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {formatNumber(auditStatus.proofCountSinceLastAudit || 0)} / 10,000 proofs
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400 text-sm mb-1">ETA</div>
                  <div className="text-white font-medium">
                    {auditStatus.shouldRun ? "Ready now" : "In progress"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
