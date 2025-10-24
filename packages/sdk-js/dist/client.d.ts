/**
 * Veris SDK Client
 */
import { VerisConfig, CreateProofRequest, CreateProofResponse, VerifyProofRequest, VerifyProofResponse, GetProofResponse, IntegrityLatestResponse, IntegrityHealthResponse } from "./types.js";
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
     * Update the API key
     */
    setApiKey(apiKey: string): void;
    /**
     * Remove the API key
     */
    clearApiKey(): void;
}
