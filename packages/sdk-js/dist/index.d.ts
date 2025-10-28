/**
 * Veris SDK - Main entry point
 */
export { VerisClient } from "./client.js";
export type {
  VerisConfig,
  CreateProofRequest,
  CreateProofResponse,
  VerifyProofRequest,
  VerifyProofResponse,
  GetProofResponse,
  IntegrityLatestResponse,
  IntegrityHealthResponse,
  RegistryProofResponse,
  BillingMetricsResponse,
  BillingHistoryResponse,
  BillingEventLog,
  TelemetryMetricsResponse,
  CapacityMetricsResponse,
  SnapshotMeta,
  SnapshotsResponse,
  SnapshotStatusResponse,
  SnapshotStatisticsResponse,
  SchemaVersion,
  SchemaVersionInfo,
  SchemaValidationResult,
  SchemaMigrationResult,
  AvailableMigration,
  SchemaRegressionResult,
  SchemaRegressionCheck,
  RecoveryAuditStatus,
  RecoveryAuditMetrics,
  RecoveryAuditHistory,
  RecoveryAuditResult,
  CrossMirrorValidation,
  HealthCheckResult,
  SLOReport,
  PerformanceMetric,
  HealthStatus,
  SLOStatus,
  PerformanceMetrics,
  HealthAndSLOReport,
  VerisError,
} from "./types.js";
import { VerisClient } from "./client.js";
export declare function createVerisClient(config: {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}): VerisClient;
