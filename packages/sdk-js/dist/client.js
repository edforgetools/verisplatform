/**
 * Veris SDK Client
 */
import axios from "axios";
export class VerisClient {
    constructor(config) {
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
        this.client.interceptors.response.use((response) => response, (error) => {
            const verisError = {
                error: error.response?.data?.error || error.message || "Unknown error",
                code: error.response?.data?.code,
                details: error.response?.data?.details,
            };
            throw verisError;
        });
    }
    /**
     * Create a new proof
     */
    async createProof(request) {
        const formData = new FormData();
        formData.append("file", request.file);
        formData.append("user_id", request.userId);
        if (request.project) {
            formData.append("project", request.project);
        }
        const response = await this.client.post("/api/proof/create", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    }
    /**
     * Get proof details by ID
     */
    async getProof(id) {
        const response = await this.client.get(`/api/proof/${id}`);
        return response.data;
    }
    /**
     * Verify a proof by hash (primary method)
     */
    async verifyProofByHash(hash) {
        const response = await this.client.get(`/api/verify?hash=${hash}`);
        return response.data;
    }
    /**
     * Verify a proof by hash (POST method)
     */
    async verifyProofByHashPost(hash) {
        const response = await this.client.post("/api/verify", { hash });
        return response.data;
    }
    /**
     * Verify a proof by file upload
     */
    async verifyProofByFile(file) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await this.client.post("/api/verify", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    }
    /**
     * Verify a proof (legacy method for backward compatibility)
     */
    async verifyProof(request) {
        if (request.file) {
            // File-based verification
            const formData = new FormData();
            formData.append("file", request.file);
            if (request.proofId) {
                formData.append("proof_id", request.proofId);
            }
            const response = await this.client.post("/api/proof/verify", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            return response.data;
        }
        else {
            // JSON-based verification
            const payload = {};
            if (request.id) {
                payload.id = request.id;
            }
            else if (request.hashHex && request.signatureB64) {
                payload.hashHex = request.hashHex;
                payload.signatureB64 = request.signatureB64;
            }
            else {
                throw new Error("Invalid verification request: must provide id or hashHex+signatureB64");
            }
            const response = await this.client.post("/api/proof/verify", payload);
            return response.data;
        }
    }
    /**
     * Get latest integrity snapshot
     */
    async getLatestIntegrity() {
        const response = await this.client.get("/api/integrity/latest");
        return response.data;
    }
    /**
     * Get snapshot integrity data
     */
    async getSnapshotIntegrity(batch) {
        const response = await this.client.get(`/api/integrity/snapshot/${batch}`);
        return response.data;
    }
    /**
     * Get system health status
     */
    async getIntegrityHealth() {
        const response = await this.client.get("/api/integrity/health");
        return response.data;
    }
    /**
     * Search for proofs by hash in the registry
     */
    async searchProofsByHash(hash) {
        const response = await this.client.get(`/api/registry/search?hash=${hash}`);
        return response.data;
    }
    /**
     * Get proof by ID from registry
     */
    async getProofFromRegistry(id) {
        const response = await this.client.get(`/api/registry/${id}`);
        return response.data;
    }
    /**
     * Get billing metrics for authenticated user
     */
    async getBillingMetrics(days = 30) {
        const response = await this.client.get(`/api/billing/metrics?days=${days}`);
        return response.data;
    }
    /**
     * Get billing event history for authenticated user
     */
    async getBillingHistory(limit = 50, offset = 0) {
        const response = await this.client.get(`/api/billing/history?limit=${limit}&offset=${offset}`);
        return response.data;
    }
    /**
     * Get telemetry metrics for capacity planning
     */
    async getTelemetryMetrics(period = "today") {
        const response = await this.client.get(`/api/telemetry/metrics?period=${period}`);
        return response.data;
    }
    /**
     * Get capacity planning metrics
     */
    async getCapacityMetrics() {
        const response = await this.client.get("/api/telemetry/capacity");
        return response.data;
    }
    /**
     * Export telemetry data
     */
    async exportTelemetryData(format = "json", days = 30) {
        const response = await this.client.get(`/api/telemetry/export?format=${format}&days=${days}`);
        return response.data;
    }
    /**
     * Get registry snapshots
     */
    async getSnapshots(limit = 50, offset = 0) {
        const response = await this.client.get(`/api/snapshots?limit=${limit}&offset=${offset}`);
        return response.data;
    }
    /**
     * Trigger snapshot automation
     */
    async triggerSnapshotAutomation(action = "check", keep) {
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
    async getSchemaVersions() {
        const response = await this.client.get("/api/schema/versions");
        return response.data;
    }
    /**
     * Validate proof against schema
     */
    async validateProof(proof, version) {
        const response = await this.client.post("/api/schema/validate", {
            proof,
            version,
        });
        return response.data;
    }
    /**
     * Get available migrations
     */
    async getAvailableMigrations(fromVersion) {
        const response = await this.client.get(`/api/schema/migrate?fromVersion=${fromVersion}`);
        return response.data;
    }
    /**
     * Migrate proof between schema versions
     */
    async migrateProof(proof, fromVersion, toVersion) {
        const response = await this.client.post("/api/schema/migrate", {
            proof,
            fromVersion,
            toVersion,
        });
        return response.data;
    }
    /**
     * Run schema regression tests
     */
    async runSchemaRegressionTests(action = "run") {
        const response = await this.client.post(`/api/schema/regression?action=${action}`);
        return response.data;
    }
    /**
     * Run recovery audit
     */
    async runRecoveryAudit(action = "check", enhanced = false, options) {
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
    setApiKey(apiKey) {
        this.config.apiKey = apiKey;
        this.client.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;
    }
    /**
     * Remove the API key
     */
    clearApiKey() {
        delete this.config.apiKey;
        delete this.client.defaults.headers.common["Authorization"];
    }
    /**
     * Get system health status
     */
    async getHealthStatus(detailed = false, metrics = false) {
        const searchParams = new URLSearchParams();
        if (detailed)
            searchParams.set("detailed", "true");
        if (metrics)
            searchParams.set("metrics", "true");
        const response = await this.client.get(`/api/health?${searchParams}`);
        return response.data;
    }
    /**
     * Get SLO status
     */
    async getSLOStatus(definitions = false, history = false, window = "24h") {
        const searchParams = new URLSearchParams({ window });
        if (definitions)
            searchParams.set("definitions", "true");
        if (history)
            searchParams.set("history", "true");
        const response = await this.client.get(`/api/slo?${searchParams}`);
        return response.data;
    }
    /**
     * Get performance metrics
     */
    async getPerformanceMetrics(range = "24h", details = false, format = "json") {
        const searchParams = new URLSearchParams({ range, format });
        if (details)
            searchParams.set("details", "true");
        const response = await this.client.get(`/api/performance?${searchParams}`);
        return response.data;
    }
    /**
     * Get comprehensive health and SLO report
     */
    async getHealthAndSLOReport() {
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
