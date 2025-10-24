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
     * Verify a proof
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
}
