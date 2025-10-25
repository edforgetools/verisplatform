"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Navigation } from "@/components/Navigation";
import toast, { Toaster } from "react-hot-toast";

interface SnapshotStatus {
  totalProofs: number;
  lastSnapshotBatch: number | null;
  proofsSinceLastSnapshot: number;
  nextSnapshotAt: number;
  isSnapshotDue: boolean;
  automationEnabled: boolean;
}

interface SnapshotStatistics {
  totalSnapshots: number;
  totalProofsSnapshotted: number;
  averageProofsPerSnapshot: number;
  lastSnapshotDate: string | null;
  firstSnapshotDate: string | null;
  snapshotFrequency: number;
}

interface SnapshotMeta {
  id: number;
  batch: number;
  count: number;
  merkle_root: string;
  s3_url: string;
  arweave_txid: string | null;
  arweave_url: string | null;
  integrity_verified: boolean;
  published_at: string;
  created_at: string;
}

export default function SnapshotsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus | null>(null);
  const [snapshotStats, setSnapshotStats] = useState<SnapshotStatistics | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadSnapshotData = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient().auth.getUser();

        if (!user) {
          toast.error("Please log in to view snapshot data");
          return;
        }

        setUser(user);

        // Load snapshot status
        const statusResponse = await fetch("/api/jobs/snapshot-automation?action=status", {
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
          setSnapshotStatus(status);
        }

        // Load snapshot statistics
        const statsResponse = await fetch("/api/jobs/snapshot-automation?action=stats", {
          headers: {
            Authorization: `Bearer ${
              (
                await supabaseClient().auth.getSession()
              ).data.session?.access_token
            }`,
          },
        });

        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setSnapshotStats(stats);
        }

        // Load snapshot list
        const snapshotsResponse = await fetch("/api/snapshots", {
          headers: {
            Authorization: `Bearer ${
              (
                await supabaseClient().auth.getSession()
              ).data.session?.access_token
            }`,
          },
        });

        if (snapshotsResponse.ok) {
          const snapshotsData = await snapshotsResponse.json();
          setSnapshots(snapshotsData);
        }
      } catch (error) {
        console.error("Error loading snapshot data:", error);
        toast.error("Failed to load snapshot information");
      } finally {
        setLoading(false);
      }
    };

    loadSnapshotData();
  }, []);

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

  const handleCreateSnapshot = async () => {
    try {
      const response = await fetch("/api/jobs/snapshot-automation?action=check", {
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
        if (result.success) {
          toast.success(
            `Snapshot created successfully! Batch ${result.batch} with ${result.count} proofs`,
          );
          // Reload data
          window.location.reload();
        } else {
          toast.error(result.error || "Failed to create snapshot");
        }
      } else {
        toast.error("Failed to create snapshot");
      }
    } catch (error) {
      console.error("Error creating snapshot:", error);
      toast.error("Failed to create snapshot");
    }
  };

  const handleVerifyIntegrity = async () => {
    try {
      const response = await fetch("/api/jobs/snapshot-automation?action=verify", {
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
          `Integrity verification completed: ${result.verifiedSnapshots}/${result.totalSnapshots} snapshots verified`,
        );
      } else {
        toast.error("Failed to verify snapshot integrity");
      }
    } catch (error) {
      console.error("Error verifying integrity:", error);
      toast.error("Failed to verify snapshot integrity");
    }
  };

  const handleCleanup = async () => {
    if (
      !confirm(
        "Are you sure you want to cleanup old snapshots? This will keep only the last 10 batches.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/jobs/snapshot-automation?action=cleanup&keep=10", {
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
        toast.success(`Cleanup completed: ${result.deletedBatches.length} batches deleted`);
        // Reload data
        window.location.reload();
      } else {
        toast.error("Failed to cleanup old snapshots");
      }
    } catch (error) {
      console.error("Error cleaning up snapshots:", error);
      toast.error("Failed to cleanup old snapshots");
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
              <h1 className="text-3xl font-serif mb-2">Snapshot Dashboard</h1>
              <p className="text-neutral-400">Monitor and manage registry snapshots</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleCreateSnapshot}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Snapshot
              </button>
              <button
                onClick={handleVerifyIntegrity}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Verify Integrity
              </button>
              <button
                onClick={handleCleanup}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
              >
                Cleanup Old
              </button>
            </div>
          </div>

          {/* Status Cards */}
          {snapshotStatus && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Total Proofs</div>
                <div className="text-3xl font-bold text-white">
                  {formatNumber(snapshotStatus.totalProofs)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">All time proofs</div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Last Snapshot</div>
                <div className="text-3xl font-bold text-blue-400">
                  {snapshotStatus.lastSnapshotBatch
                    ? `Batch ${snapshotStatus.lastSnapshotBatch}`
                    : "None"}
                </div>
                <div className="text-xs text-neutral-500 mt-1">Latest batch</div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Since Last Snapshot</div>
                <div className="text-3xl font-bold text-purple-400">
                  {formatNumber(snapshotStatus.proofsSinceLastSnapshot)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {formatNumber(1000 - snapshotStatus.proofsSinceLastSnapshot)} until next
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-sm text-neutral-400 mb-1">Automation</div>
                <div
                  className={`text-3xl font-bold ${
                    snapshotStatus.automationEnabled ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {snapshotStatus.automationEnabled ? "Enabled" : "Disabled"}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {snapshotStatus.isSnapshotDue ? "Snapshot due" : "Up to date"}
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          {snapshotStats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Snapshot Statistics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Snapshots</span>
                    <span className="text-white font-medium">
                      {formatNumber(snapshotStats.totalSnapshots)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Proofs</span>
                    <span className="text-white font-medium">
                      {formatNumber(snapshotStats.totalProofsSnapshotted)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Avg per Snapshot</span>
                    <span className="text-white font-medium">
                      {formatNumber(Math.round(snapshotStats.averageProofsPerSnapshot))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Timeline</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-neutral-400 text-sm mb-1">First Snapshot</div>
                    <div className="text-white font-medium">
                      {snapshotStats.firstSnapshotDate
                        ? formatDate(snapshotStats.firstSnapshotDate)
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-400 text-sm mb-1">Last Snapshot</div>
                    <div className="text-white font-medium">
                      {snapshotStats.lastSnapshotDate
                        ? formatDate(snapshotStats.lastSnapshotDate)
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-400 text-sm mb-1">Frequency</div>
                    <div className="text-white font-medium">
                      {snapshotStats.snapshotFrequency > 0
                        ? `${snapshotStats.snapshotFrequency.toFixed(1)} days`
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">Next Snapshot</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-neutral-400 text-sm mb-1">Progress</div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div
                        className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            (snapshotStatus?.proofsSinceLastSnapshot || 0) / 10,
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {formatNumber(snapshotStatus?.proofsSinceLastSnapshot || 0)} / 1,000 proofs
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-400 text-sm mb-1">ETA</div>
                    <div className="text-white font-medium">
                      {snapshotStatus?.isSnapshotDue ? "Ready now" : "In progress"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Snapshots Table */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-700">
            <h2 className="text-xl font-semibold mb-4">Recent Snapshots</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-3 px-4">Batch</th>
                    <th className="text-left py-3 px-4">Count</th>
                    <th className="text-left py-3 px-4">Merkle Root</th>
                    <th className="text-left py-3 px-4">Arweave</th>
                    <th className="text-left py-3 px-4">Integrity</th>
                    <th className="text-left py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.slice(0, 10).map((snapshot) => (
                    <tr key={snapshot.id} className="border-b border-neutral-800">
                      <td className="py-3 px-4 font-medium">#{snapshot.batch}</td>
                      <td className="py-3 px-4">{formatNumber(snapshot.count)}</td>
                      <td className="py-3 px-4 font-mono text-xs text-neutral-400">
                        {snapshot.merkle_root.substring(0, 16)}...
                      </td>
                      <td className="py-3 px-4">
                        {snapshot.arweave_txid ? (
                          <span className="text-emerald-400">✓ Published</span>
                        ) : (
                          <span className="text-neutral-500">Not published</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {snapshot.integrity_verified ? (
                          <span className="text-emerald-400">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-400">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        {formatDate(snapshot.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
