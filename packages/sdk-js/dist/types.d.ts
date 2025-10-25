/**
 * TypeScript types for the Veris SDK
 */
export interface VerisConfig {
    baseUrl: string;
    apiKey?: string;
    timeout?: number;
}
export interface CreateProofRequest {
    file: File;
    userId: string;
    project?: string;
}
export interface CreateProofResponse {
    id: string;
    hash_prefix: string;
    timestamp: string;
    url: string;
}
export interface VerifyProofRequest {
    id?: string;
    hashHex?: string;
    signatureB64?: string;
    file?: File;
    proofId?: string;
}
export interface VerifyProofResponse {
    schema_version: number;
    proof_hash: string;
    valid: boolean;
    verified_at: string;
    signer_fp: string | null;
    source_registry: "primary" | "s3" | "arweave";
    errors: string[];
}
export interface GetProofResponse {
    id: string;
    file_name: string;
    hash_full: string;
    hash_prefix: string;
    signature: string;
    timestamp: string;
    project: string | null;
    visibility: string;
    created_at: string;
}
export interface IntegrityLatestResponse {
    batch: number | null;
    merkle_root: string | null;
    s3_url: string | null;
    arweave_txid: string | null;
    schema_version: number;
    created_at?: string;
    message?: string;
}
export interface IntegrityHealthResponse {
    status: "healthy" | "unhealthy";
    total_proofs: number;
    checks: {
        signing_key_present: boolean;
        database_accessible: boolean;
        snapshot_exists: boolean;
        snapshot_recent: boolean;
        arweave_published: boolean;
        snapshot_count_correct: boolean;
    };
    issues: string[];
    timestamp: string;
}
export interface RegistryProofResponse {
    id: string;
    file_name: string;
    hash_full: string;
    hash_prefix: string;
    signature: string;
    timestamp: string;
    project: string | null;
    visibility: string;
    created_at: string;
    proof_json?: any;
}
export interface BillingMetricsResponse {
    totalEvents: number;
    billableEvents: number;
    freeEvents: number;
    billableEventTypes: string[];
    eventsByType: Record<string, number>;
}
export interface BillingEventLog {
    id: string;
    event_id: string;
    event_type: string;
    stripe_subscription_id: string | null;
    user_id: string | null;
    created_at: string;
}
export interface BillingHistoryResponse {
    events: BillingEventLog[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
}
export interface TelemetryMetricsResponse {
    today: {
        total_proofs: number;
        total_verifications: number;
        total_api_calls: number;
        unique_users: number;
        daily_average: {
            proofs: number;
            verifications: number;
            api_calls: number;
        };
        weekly_trend: Array<{
            date: string;
            proofs: number;
            verifications: number;
            api_calls: number;
        }>;
    };
    this_week: {
        total_proofs: number;
        total_verifications: number;
        total_api_calls: number;
        unique_users: number;
        daily_average: {
            proofs: number;
            verifications: number;
            api_calls: number;
        };
        weekly_trend: Array<{
            date: string;
            proofs: number;
            verifications: number;
            api_calls: number;
        }>;
    };
    this_month: {
        total_proofs: number;
        total_verifications: number;
        total_api_calls: number;
        unique_users: number;
        daily_average: {
            proofs: number;
            verifications: number;
            api_calls: number;
        };
        weekly_trend: Array<{
            date: string;
            proofs: number;
            verifications: number;
            api_calls: number;
        }>;
    };
}
export interface CapacityMetricsResponse {
    current_load: {
        requests_per_minute: number;
        active_users: number;
        system_health: "healthy" | "warning" | "critical";
    };
    capacity_planning: {
        projected_growth: number;
        recommended_scaling: string;
        bottleneck_analysis: string[];
    };
    performance_metrics: {
        average_response_time: number;
        error_rate: number;
        uptime_percentage: number;
    };
}
export interface SnapshotMeta {
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
export interface SnapshotsResponse {
    snapshots: SnapshotMeta[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
}
export interface SnapshotStatusResponse {
    totalProofs: number;
    lastSnapshotBatch: number | null;
    proofsSinceLastSnapshot: number;
    nextSnapshotAt: number;
    isSnapshotDue: boolean;
    automationEnabled: boolean;
}
export interface SnapshotStatisticsResponse {
    totalSnapshots: number;
    totalProofsSnapshotted: number;
    averageProofsPerSnapshot: number;
    lastSnapshotDate: string | null;
    firstSnapshotDate: string | null;
    snapshotFrequency: number;
}
export interface SchemaVersion {
    version: string;
    isLatest: boolean;
    createdAt: string;
    path: string;
}
export interface SchemaVersionInfo {
    versions: SchemaVersion[];
    latestVersion: string;
    totalVersions: number;
}
export interface SchemaValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    schemaVersion: string;
}
export interface SchemaMigrationResult {
    success: boolean;
    migratedProof: any;
    warnings: string[];
    errors: string[];
    fromVersion: string;
    toVersion: string;
}
export interface AvailableMigration {
    toVersion: string;
    description: string;
    available: boolean;
}
export interface SchemaRegressionResult {
    schemaVersion: string;
    totalProofs: number;
    validProofs: number;
    invalidProofs: number;
    errors: Array<{
        proofId: string;
        errors: string[];
    }>;
    passed: boolean;
}
export interface SchemaRegressionCheck {
    allPassed: boolean;
    results: SchemaRegressionResult[];
    summary: {
        totalVersions: number;
        passedVersions: number;
        failedVersions: number;
        totalProofs: number;
        totalValid: number;
        totalInvalid: number;
    };
}
export interface RecoveryAuditStatus {
    shouldRun: boolean;
    reason: string;
    lastAuditDate?: string;
    proofCountSinceLastAudit?: number;
}
export interface RecoveryAuditMetrics {
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
export interface RecoveryAuditHistory {
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
export interface RecoveryAuditResult {
    proof_id: string;
    original_hash: string;
    recovered_hash: string;
    hash_match: boolean;
    signature_valid: boolean;
    source: string;
    recovered_at: string;
    recovery_time_ms?: number;
    errors: string[];
    warnings?: string[];
    cross_mirror_consistent?: boolean;
    integrity_score?: number;
}
export interface CrossMirrorValidation {
    proof_id: string;
    sources: Array<{
        source: string;
        hash: string;
        signatureValid: boolean;
        recoveredAt: string;
        errors: string[];
    }>;
    consistent: boolean;
    consensus_hash: string | null;
    discrepancies: Array<{
        source1: string;
        source2: string;
        field: string;
        value1: string;
        value2: string;
    }>;
}
export interface VerisError {
    error: string;
    code?: string;
    details?: any;
}
export interface HealthCheckResult {
    name: string;
    status: "healthy" | "degraded" | "unhealthy";
    responseTimeMs: number;
    lastChecked: string;
    details?: any;
    error?: string;
}
export interface SLOReport {
    name: string;
    target: string;
    current: string;
    status: "meeting" | "warning" | "breach";
    window: string;
    trend: "improving" | "stable" | "degrading";
    details?: any;
}
export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: string;
    description?: string;
    meta?: any;
}
export interface HealthStatus {
    status: "healthy" | "degraded" | "critical";
    checks: HealthCheckResult[];
    timestamp: string;
    metrics?: {
        responseTime: number;
        checksPerformed: number;
    };
}
export interface SLOStatus {
    status: "met" | "warning" | "breach";
    reports: SLOReport[];
    timestamp: string;
    definitions?: {
        AVAILABILITY_TARGET: number;
        PROOF_ISSUANCE_LATENCY_P95: number;
        ERROR_RATE_TARGET: number;
    };
    history?: Array<{
        timestamp: string;
        status: "met" | "warning" | "breach";
        reports: SLOReport[];
    }>;
}
export interface PerformanceMetrics {
    metrics: PerformanceMetric[];
    timestamp: string;
    range: string;
    summary?: {
        totalRequests: number;
        averageLatency: number;
        errorRate: number;
        throughput: number;
    };
}
export interface HealthAndSLOReport {
    overallStatus: "healthy" | "degraded" | "critical";
    healthChecks: HealthCheckResult[];
    sloReports: SLOReport[];
    performanceMetrics: PerformanceMetric[];
    generatedAt: string;
}
