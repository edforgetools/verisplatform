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
}
