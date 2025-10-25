/**
 * Veris SDK Client
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import {
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
  TelemetryMetricsResponse,
  CapacityMetricsResponse,
  SnapshotsResponse,
  SnapshotStatusResponse,
  SnapshotStatisticsResponse,
  SchemaVersionInfo,
  SchemaValidationResult,
  SchemaMigrationResult,
  AvailableMigration,
  SchemaRegressionCheck,
  HealthStatus,
  SLOStatus,
  PerformanceMetrics,
  HealthAndSLOReport,
  VerisError,
} from "./types.js";

export class VerisClient {
  private client: AxiosInstance;
  private config: VerisConfig;

  constructor(config: VerisConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const verisError: VerisError = {
          error: (error.response?.data as any)?.error || error.message || "Unknown error",
          code: (error.response?.data as any)?.code,
          details: (error.response?.data as any)?.details,
        };
        throw verisError;
      },
    );
  }

  /**
   * Create a new proof
   */
  async createProof(request: CreateProofRequest): Promise<CreateProofResponse> {
    const formData = new FormData();
    formData.append("file", request.file);
    formData.append("user_id", request.userId);
    if (request.project) {
      formData.append("project", request.project);
    }

    const response = await this.client.post<CreateProofResponse>("/api/proof/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  }

  /**
   * Get proof details by ID
   */
  async getProof(id: string): Promise<GetProofResponse> {
    const response = await this.client.get<GetProofResponse>(`/api/proof/${id}`);
    return response.data;
  }

  /**
   * Verify a proof by hash (primary method)
   */
  async verifyProofByHash(hash: string): Promise<VerifyProofResponse> {
    const response = await this.client.get<VerifyProofResponse>(`/api/verify?hash=${hash}`);
    return response.data;
  }

  /**
   * Verify a proof by hash (POST method)
   */
  async verifyProofByHashPost(hash: string): Promise<VerifyProofResponse> {
    const response = await this.client.post<VerifyProofResponse>("/api/verify", { hash });
    return response.data;
  }

  /**
   * Verify a proof by file upload
   */
  async verifyProofByFile(file: File): Promise<VerifyProofResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.client.post<VerifyProofResponse>("/api/verify", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  }

  /**
   * Verify a proof (legacy method for backward compatibility)
   */
  async verifyProof(request: VerifyProofRequest): Promise<VerifyProofResponse> {
    if (request.file) {
      // File-based verification
      const formData = new FormData();
      formData.append("file", request.file);
      if (request.proofId) {
        formData.append("proof_id", request.proofId);
      }

      const response = await this.client.post<VerifyProofResponse>("/api/proof/verify", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } else {
      // JSON-based verification
      const payload: any = {};
      if (request.id) {
        payload.id = request.id;
      } else if (request.hashHex && request.signatureB64) {
        payload.hashHex = request.hashHex;
        payload.signatureB64 = request.signatureB64;
      } else {
        throw new Error("Invalid verification request: must provide id or hashHex+signatureB64");
      }

      const response = await this.client.post<VerifyProofResponse>("/api/proof/verify", payload);

      return response.data;
    }
  }

  /**
   * Get latest integrity snapshot
   */
  async getLatestIntegrity(): Promise<IntegrityLatestResponse> {
    const response = await this.client.get<IntegrityLatestResponse>("/api/integrity/latest");
    return response.data;
  }

  /**
   * Get snapshot integrity data
   */
  async getSnapshotIntegrity(batch: number): Promise<any> {
    const response = await this.client.get(`/api/integrity/snapshot/${batch}`);
    return response.data;
  }

  /**
   * Get system health status
   */
  async getIntegrityHealth(): Promise<IntegrityHealthResponse> {
    const response = await this.client.get<IntegrityHealthResponse>("/api/integrity/health");
    return response.data;
  }

  /**
   * Search for proofs by hash in the registry
   */
  async searchProofsByHash(hash: string): Promise<RegistryProofResponse> {
    const response = await this.client.get<RegistryProofResponse>(
      `/api/registry/search?hash=${hash}`,
    );
    return response.data;
  }

  /**
   * Get proof by ID from registry
   */
  async getProofFromRegistry(id: string): Promise<RegistryProofResponse> {
    const response = await this.client.get<RegistryProofResponse>(`/api/registry/${id}`);
    return response.data;
  }

  /**
   * Get billing metrics for authenticated user
   */
  async getBillingMetrics(days: number = 30): Promise<BillingMetricsResponse> {
    const response = await this.client.get<BillingMetricsResponse>(
      `/api/billing/metrics?days=${days}`,
    );
    return response.data;
  }

  /**
   * Get billing event history for authenticated user
   */
  async getBillingHistory(limit: number = 50, offset: number = 0): Promise<BillingHistoryResponse> {
    const response = await this.client.get<BillingHistoryResponse>(
      `/api/billing/history?limit=${limit}&offset=${offset}`,
    );
    return response.data;
  }

  /**
   * Get telemetry metrics for capacity planning
   */
  async getTelemetryMetrics(
    period: "today" | "week" | "month" = "today",
  ): Promise<TelemetryMetricsResponse> {
    const response = await this.client.get<TelemetryMetricsResponse>(
      `/api/telemetry/metrics?period=${period}`,
    );
    return response.data;
  }

  /**
   * Get capacity planning metrics
   */
  async getCapacityMetrics(): Promise<CapacityMetricsResponse> {
    const response = await this.client.get<CapacityMetricsResponse>("/api/telemetry/capacity");
    return response.data;
  }

  /**
   * Export telemetry data
   */
  async exportTelemetryData(format: "json" | "csv" = "json", days: number = 30): Promise<any> {
    const response = await this.client.get(`/api/telemetry/export?format=${format}&days=${days}`);
    return response.data;
  }

  /**
   * Get registry snapshots
   */
  async getSnapshots(limit: number = 50, offset: number = 0): Promise<SnapshotsResponse> {
    const response = await this.client.get<SnapshotsResponse>(
      `/api/snapshots?limit=${limit}&offset=${offset}`,
    );
    return response.data;
  }

  /**
   * Trigger snapshot automation
   */
  async triggerSnapshotAutomation(
    action: "check" | "status" | "verify" | "stats" | "cleanup" = "check",
    keep?: number,
  ): Promise<SnapshotStatusResponse | SnapshotStatisticsResponse | any> {
    const params = new URLSearchParams({ action });
    if (keep !== undefined) {
      params.append("keep", keep.toString());
    }
    const response = await this.client.post(`/api/jobs/snapshot-automation?${params.toString()}`);
    return response.data;
  }

  /**
   * Get schema versions
   */
  async getSchemaVersions(): Promise<SchemaVersionInfo> {
    const response = await this.client.get<SchemaVersionInfo>("/api/schema/versions");
    return response.data;
  }

  /**
   * Validate proof against schema
   */
  async validateProof(proof: any, version?: string): Promise<SchemaValidationResult> {
    const response = await this.client.post<SchemaValidationResult>("/api/schema/validate", {
      proof,
      version,
    });
    return response.data;
  }

  /**
   * Get available migrations
   */
  async getAvailableMigrations(
    fromVersion: string,
  ): Promise<{ availableMigrations: AvailableMigration[] }> {
    const response = await this.client.get<{ availableMigrations: AvailableMigration[] }>(
      `/api/schema/migrate?fromVersion=${fromVersion}`,
    );
    return response.data;
  }

  /**
   * Migrate proof between schema versions
   */
  async migrateProof(
    proof: any,
    fromVersion: string,
    toVersion: string,
  ): Promise<SchemaMigrationResult> {
    const response = await this.client.post<SchemaMigrationResult>("/api/schema/migrate", {
      proof,
      fromVersion,
      toVersion,
    });
    return response.data;
  }

  /**
   * Run schema regression tests
   */
  async runSchemaRegressionTests(
    action: "run" | "check" = "run",
  ): Promise<SchemaRegressionCheck | { results: any[] }> {
    const response = await this.client.post(`/api/schema/regression?action=${action}`);
    return response.data;
  }

  /**
   * Run recovery audit
   */
  async runRecoveryAudit(
    action: "check" | "run" | "status" | "history" | "results" | "cross-mirror" = "check",
    enhanced: boolean = false,
    options?: {
      limit?: number;
      date?: string;
    },
  ): Promise<any> {
    const params = new URLSearchParams({ action, enhanced: enhanced.toString() });
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    if (options?.date) {
      params.append("date", options.date);
    }
    const response = await this.client.post(`/api/jobs/recovery-audit?${params.toString()}`);
    return response.data;
  }

  /**
   * Update the API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.client.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;
  }

  /**
   * Remove the API key
   */
  clearApiKey(): void {
    delete this.config.apiKey;
    delete this.client.defaults.headers.common["Authorization"];
  }

  /**
   * Get system health status
   */
  async getHealthStatus(
    detailed: boolean = false,
    metrics: boolean = false,
  ): Promise<HealthStatus> {
    const searchParams = new URLSearchParams();
    if (detailed) searchParams.set("detailed", "true");
    if (metrics) searchParams.set("metrics", "true");

    const response = await this.client.get<HealthStatus>(`/api/health?${searchParams}`);
    return response.data;
  }

  /**
   * Get SLO status
   */
  async getSLOStatus(
    definitions: boolean = false,
    history: boolean = false,
    window: "1h" | "24h" | "7d" | "30d" = "24h",
  ): Promise<SLOStatus> {
    const searchParams = new URLSearchParams({ window });
    if (definitions) searchParams.set("definitions", "true");
    if (history) searchParams.set("history", "true");

    const response = await this.client.get<SLOStatus>(`/api/slo?${searchParams}`);
    return response.data;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    range: "1h" | "24h" | "7d" | "30d" = "24h",
    details: boolean = false,
    format: "json" | "prometheus" = "json",
  ): Promise<PerformanceMetrics> {
    const searchParams = new URLSearchParams({ range, format });
    if (details) searchParams.set("details", "true");

    const response = await this.client.get<PerformanceMetrics>(`/api/performance?${searchParams}`);
    return response.data;
  }

  /**
   * Get comprehensive health and SLO report
   */
  async getHealthAndSLOReport(): Promise<HealthAndSLOReport> {
    const [healthStatus, sloStatus, performanceMetrics] = await Promise.all([
      this.getHealthStatus(true, true),
      this.getSLOStatus(true, true),
      this.getPerformanceMetrics("24h", true),
    ]);

    return {
      overallStatus: healthStatus.status,
      healthChecks: healthStatus.checks,
      sloReports: sloStatus.reports,
      performanceMetrics: performanceMetrics.metrics,
      generatedAt: new Date().toISOString(),
    };
  }
}
