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
export interface VerisError {
    error: string;
    code?: string;
    details?: any;
}
