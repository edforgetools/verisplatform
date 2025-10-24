/**
 * Monitoring Dashboard Page
 * 
 * This page displays the comprehensive monitoring dashboard as specified in the MVP checklist.
 * It shows key performance indicators, system health metrics, performance thresholds,
 * and real-time alerts for the Veris system.
 */

'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

interface SystemMetrics {
  proofsIssuedTotal: number;
  proofsVerifiedTotal: number;
  verificationSuccessRate: number;
  averageIssuanceLatencyMs: number;
  averageVerificationLatencyMs: number;
  systemUptime: number;
  errorRate: number;
  apiResponseTimeMs: number;
  dailyProofIssuance: number;
  dailyVerifications: number;
  activeUsers: number;
  s3UploadSuccessRate: number;
  arweaveUploadSuccessRate: number;
  databaseResponseTimeMs: number;
  lastUpdated: string;
  dataFreshnessMs: number;
}

interface MetricThreshold {
  name: string;
  value: number;
  threshold: number;
  status: 'pass' | 'warning' | 'fail';
  unit: string;
  description: string;
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  acknowledged: boolean;
}

interface TrendData {
  metric: string;
  timeSeries: Array<{
    timestamp: string;
    value: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

interface DashboardData {
  metrics: SystemMetrics;
  thresholds: MetricThreshold[];
  overallStatus: 'healthy' | 'warning' | 'critical';
  alerts: Alert[];
  trends: TrendData[];
  lastUpdated: string;
}

export default function MonitoringPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/monitoring/dashboard?include_history=true&days=7');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'fail':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatNumber = (num: number, decimals: number = 0) => {
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Data Available</h2>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, thresholds, overallStatus, alerts, trends } = dashboardData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">System Monitoring</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Real-time system health and performance metrics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="auto-refresh" className="text-sm text-slate-600 dark:text-slate-300">
                  Auto-refresh
                </label>
              </div>
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {/* Overall Status */}
          <div className="mt-4">
            <div className={`inline-flex items-center px-4 py-2 rounded-lg ${getStatusColor(overallStatus)}`}>
              <div className="w-3 h-3 rounded-full bg-current mr-2"></div>
              <span className="font-semibold">
                System Status: {overallStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Active Alerts</h2>
            <div className="grid gap-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{alert.title}</h3>
                      <p className="text-sm mt-1">{alert.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">
                        {alert.value} {alert.metric.includes('Rate') ? '%' : alert.metric.includes('Time') ? 'ms' : ''}
                      </div>
                      <div className="text-xs opacity-75">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Key Performance Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Proofs Issued</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(metrics.proofsIssuedTotal)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Daily: {formatNumber(metrics.dailyProofIssuance)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Verifications</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(metrics.proofsVerifiedTotal)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Daily: {formatNumber(metrics.dailyVerifications)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Success Rate</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatPercentage(metrics.verificationSuccessRate)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Target: 99%
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Active Users</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(metrics.activeUsers)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Last 7 days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Thresholds */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Performance Thresholds</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {thresholds.map((threshold) => (
              <div
                key={threshold.name}
                className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{threshold.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(threshold.status)}`}>
                    {threshold.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{threshold.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {threshold.value}{threshold.unit}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Target: {threshold.threshold}{threshold.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">System Uptime</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatPercentage(metrics.systemUptime)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Error Rate</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatPercentage(metrics.errorRate)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">API Response Time</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatDuration(metrics.apiResponseTimeMs)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Data Freshness</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatDuration(metrics.dataFreshnessMs)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trends */}
        {trends.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Trends</h2>
            <div className="grid gap-6">
              {trends.map((trend) => (
                <div key={trend.metric} className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{trend.metric}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trend.trend === 'up' ? 'text-green-600 bg-green-100' :
                        trend.trend === 'down' ? 'text-red-600 bg-red-100' :
                        'text-gray-600 bg-gray-100'
                      }`}>
                        {trend.trend.toUpperCase()}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-32 flex items-end space-x-1">
                    {trend.timeSeries.map((point, index) => {
                      const maxValue = Math.max(...trend.timeSeries.map(p => p.value));
                      const height = (point.value / maxValue) * 100;
                      return (
                        <div
                          key={index}
                          className="bg-emerald-500 rounded-t flex-1 min-w-0"
                          style={{ height: `${height}%` }}
                          title={`${point.timestamp}: ${point.value}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
