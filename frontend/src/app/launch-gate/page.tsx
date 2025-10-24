/**
 * Launch Gate Dashboard Page
 * 
 * This page displays the launch gate status and readiness assessment as specified in the MVP checklist.
 * It shows the current status of all launch criteria, system validation, and pilot readiness.
 */

'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

interface LaunchGateCheck {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  required: boolean;
  weight: number;
  progress: number;
  details: string;
  lastChecked: string;
  issues: string[];
  recommendations: string[];
}

interface LaunchGateStatus {
  overallStatus: 'not_ready' | 'in_progress' | 'ready';
  readinessScore: number;
  completedChecks: number;
  totalChecks: number;
  requiredChecksCompleted: boolean;
  checks: LaunchGateCheck[];
  blockers: string[];
  nextSteps: string[];
  estimatedReadiness: string;
  lastUpdated: string;
}

export default function LaunchGatePage() {
  const [launchGateStatus, setLaunchGateStatus] = useState<LaunchGateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLaunchGateStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/launch-gate/status?include_history=true&days=7');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setLaunchGateStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch launch gate status');
      console.error('Launch gate status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaunchGateStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLaunchGateStatus, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'not_ready':
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'in_progress':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'not_ready':
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatProgress = (progress: number) => {
    return `${Math.round(progress)}%`;
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
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Launch Gate Status</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchLaunchGateStatus}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!launchGateStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Launch Gate Data Available</h2>
          </div>
        </div>
      </div>
    );
  }

  const { overallStatus, readinessScore, completedChecks, totalChecks, requiredChecksCompleted, checks, blockers, nextSteps, estimatedReadiness } = launchGateStatus;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Launch Gate</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Pilot readiness assessment and launch criteria validation
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
                onClick={fetchLaunchGateStatus}
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
                Launch Status: {overallStatus.toUpperCase().replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Last updated: {new Date(launchGateStatus.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Readiness Score */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Readiness Score</h2>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {readinessScore}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className={`h-4 rounded-full ${
                  readinessScore >= 80 ? 'bg-green-500' : 
                  readinessScore >= 60 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${readinessScore}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-300">Completed Checks:</span>
                <span className="font-semibold text-slate-900 dark:text-white ml-2">
                  {completedChecks}/{totalChecks}
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-300">Required Checks:</span>
                <span className={`font-semibold ml-2 ${requiredChecksCompleted ? 'text-green-600' : 'text-red-600'}`}>
                  {requiredChecksCompleted ? 'Complete' : 'Incomplete'}
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-300">Estimated Readiness:</span>
                <span className="font-semibold text-slate-900 dark:text-white ml-2">
                  {estimatedReadiness}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Launch Criteria */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Launch Criteria</h2>
          <div className="grid gap-4">
            {checks.map((check) => (
              <div
                key={check.id}
                className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {check.name}
                        {check.required && (
                          <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                            Required
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {check.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(check.status)}`}>
                      {check.status.toUpperCase().replace('_', ' ')}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {formatProgress(check.progress)}
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className={`h-2 rounded-full ${
                      check.progress >= 80 ? 'bg-green-500' : 
                      check.progress >= 40 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}
                    style={{ width: `${check.progress}%` }}
                  ></div>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  {check.details}
                </p>
                
                {/* Issues and Recommendations */}
                {(check.issues.length > 0 || check.recommendations.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {check.issues.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-red-600 mb-2">Issues</h4>
                        <ul className="text-sm text-red-600 space-y-1">
                          {check.issues.map((issue, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {check.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-blue-600 mb-2">Recommendations</h4>
                        <ul className="text-sm text-blue-600 space-y-1">
                          {check.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Blockers */}
        {blockers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Launch Blockers</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-red-800">Critical Issues</h3>
              </div>
              <ul className="space-y-2">
                {blockers.map((blocker, index) => (
                  <li key={index} className="flex items-start text-red-700">
                    <span className="mr-2">•</span>
                    <span>{blocker}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Next Steps */}
        {nextSteps.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Next Steps</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h3 className="text-lg font-semibold text-blue-800">Recommended Actions</h3>
              </div>
              <ul className="space-y-2">
                {nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start text-blue-700">
                    <span className="mr-2">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Launch Readiness Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Launch Readiness Summary</h2>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Current Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Overall Status:</span>
                    <span className={`font-semibold ${getStatusColor(overallStatus)}`}>
                      {overallStatus.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Readiness Score:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {readinessScore}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Completed Checks:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {completedChecks}/{totalChecks}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Launch Criteria</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Required Checks:</span>
                    <span className={`font-semibold ${requiredChecksCompleted ? 'text-green-600' : 'text-red-600'}`}>
                      {requiredChecksCompleted ? 'Complete' : 'Incomplete'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Blockers:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {blockers.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Next Steps:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {nextSteps.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
