/**
 * Veris SDK Client
 */
import { VerisConfig, CreateProofRequest, CreateProofResponse, VerifyProofRequest, VerifyProofResponse, GetProofResponse, IntegrityLatestResponse, IntegrityHealthResponse, RegistryProofResponse, BillingMetricsResponse, BillingHistoryResponse, TelemetryMetricsResponse, CapacityMetricsResponse, SnapshotsResponse, SnapshotStatusResponse, SnapshotStatisticsResponse, SchemaVersionInfo, SchemaValidationResult, SchemaMigrationResult, AvailableMigration, SchemaRegressionCheck, HealthStatus, SLOStatus, PerformanceMetrics, HealthAndSLOReport } from "./types.js";
export declare class VerisClient {
    private client;
    private config;
    constructor(config: VerisConfig);
    /**
     * Create a new proof
     */
    createProof(request: CreateProofRequest): Promise<CreateProofResponse>;
    /**
     * Get proof details by ID
     */
    getProof(id: string): Promise<GetProofResponse>;
    /**
     * Verify a proof by hash (primary method)
     */
    verifyProofByHash(hash: string): Promise<VerifyProofResponse>;
    /**
     * Verify a proof by hash (POST method)
     */
    verifyProofByHashPost(hash: string): Promise<VerifyProofResponse>;
    /**
     * Verify a proof by file upload
     */
    verifyProofByFile(file: File): Promise<VerifyProofResponse>;
    /**
     * Verify a proof (legacy method for backward compatibility)
     */
    verifyProof(request: VerifyProofRequest): Promise<VerifyProofResponse>;
    /**
     * Get latest integrity snapshot
     */
    getLatestIntegrity(): Promise<IntegrityLatestResponse>;
    /**
     * Get snapshot integrity data
     */
    getSnapshotIntegrity(batch: number): Promise<any>;
    /**
     * Get system health status
     */
    getIntegrityHealth(): Promise<IntegrityHealthResponse>;
    /**
     * Search for proofs by hash in the registry
     */
    searchProofsByHash(hash: string): Promise<RegistryProofResponse>;
    /**
     * Get proof by ID from registry
     */
    getProofFromRegistry(id: string): Promise<RegistryProofResponse>;
    /**
     * Get billing metrics for authenticated user
     */
    getBillingMetrics(days?: number): Promise<BillingMetricsResponse>;
    /**
     * Get billing event history for authenticated user
     */
    getBillingHistory(limit?: number, offset?: number): Promise<BillingHistoryResponse>;
    /**
     * Get telemetry metrics for capacity planning
     */
    getTelemetryMetrics(period?: "today" | "week" | "month"): Promise<TelemetryMetricsResponse>;
    /**
     * Get capacity planning metrics
     */
    getCapacityMetrics(): Promise<CapacityMetricsResponse>;
    /**
     * Export telemetry data
     */
    exportTelemetryData(format?: "json" | "csv", days?: number): Promise<any>;
    /**
     * Get registry snapshots
     */
    getSnapshots(limit?: number, offset?: number): Promise<SnapshotsResponse>;
    /**
     * Trigger snapshot automation
     */
    triggerSnapshotAutomation(action?: "check" | "status" | "verify" | "stats" | "cleanup", keep?: number): Promise<SnapshotStatusResponse | SnapshotStatisticsResponse | any>;
    /**
     * Get schema versions
     */
    getSchemaVersions(): Promise<SchemaVersionInfo>;
    /**
     * Validate proof against schema
     */
    validateProof(proof: any, version?: string): Promise<SchemaValidationResult>;
    /**
     * Get available migrations
     */
    getAvailableMigrations(fromVersion: string): Promise<{
        availableMigrations: AvailableMigration[];
    }>;
    /**
     * Migrate proof between schema versions
     */
    migrateProof(proof: any, fromVersion: string, toVersion: string): Promise<SchemaMigrationResult>;
    /**
     * Run schema regression tests
     */
    runSchemaRegressionTests(action?: "run" | "check"): Promise<SchemaRegressionCheck | {
        results: any[];
    }>;
    /**
     * Run recovery audit
     */
    runRecoveryAudit(action?: "check" | "run" | "status" | "history" | "results" | "cross-mirror", enhanced?: boolean, options?: {
        limit?: number;
        date?: string;
    }): Promise<any>;
    /**
     * Update the API key
     */
    setApiKey(apiKey: string): void;
    /**
     * Remove the API key
     */
    clearApiKey(): void;
    /**
     * Get system health status
     */
    getHealthStatus(detailed?: boolean, metrics?: boolean): Promise<HealthStatus>;
    /**
     * Get SLO status
     */
    getSLOStatus(definitions?: boolean, history?: boolean, window?: "1h" | "24h" | "7d" | "30d"): Promise<SLOStatus>;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(range?: "1h" | "24h" | "7d" | "30d", details?: boolean, format?: "json" | "prometheus"): Promise<PerformanceMetrics>;
    /**
     * Get comprehensive health and SLO report
     */
    getHealthAndSLOReport(): Promise<HealthAndSLOReport>;
}
