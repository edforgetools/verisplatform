# Ed25519 Integration Guide

## Overview

This guide covers integrating the Ed25519 cryptographic implementation into the Veris proof creation and verification workflow.

## Current State

- ✅ Ed25519 module created: `frontend/src/lib/ed25519-crypto.ts`
- ✅ Canonical schema defined: `frontend/src/schema/proof.schema.json`
- ⚠️ Proof creation still uses RSA: `frontend/src/app/api/proof/create/route.ts`
- ⚠️ Verification still uses RSA: `frontend/src/app/api/verify/route.ts`

## Integration Steps

### Step 1: Generate Ed25519 Key Pair

```bash
# Generate Ed25519 private key
openssl genpkey -algorithm ed25519 -out ed25519_private.pem

# Extract public key
openssl pkey -in ed25519_private.pem -pubout -out ed25519_public.pem

# Convert to base64 for environment variables
# (Copy the content without newlines)
```

### Step 2: Add Environment Variables

Add to `.env.local` and Vercel:

```bash
# Ed25519 Keys (MVP §2.1)
VERIS_ED25519_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
VERIS_ED25519_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Issuer (MVP §2.1)
VERIS_ISSUER="did:web:veris.example"

# Keep existing RSA keys for backward compatibility during migration
VERIS_SIGNING_PRIVATE_KEY="..."
VERIS_SIGNING_PUBLIC_KEY="..."
```

### Step 3: Update Proof Creation Endpoint

File: `frontend/src/app/api/proof/create/route.ts`

```typescript
// Replace this import:
import { signHash } from "@/lib/crypto-server";

// With:
import { sha256, createCanonicalProof } from "@/lib/ed25519-crypto";

// In the proof creation logic, replace RSA signing with Ed25519:

// OLD (RSA):
const hashFull = sha256(fileBuffer);
const signature = signHash(hashFull);

// NEW (Ed25519):
const hashFull = sha256(fileBuffer);
const proof = createCanonicalProof(hashFull);
// proof contains: { proof_id, sha256, issued_at, signature, issuer }
```

### Step 4: Update Verification Endpoint

File: `frontend/src/app/api/verify/route.ts`

```typescript
// Replace this import:
import { verifySignature, getKeyFingerprint } from "@/lib/crypto-server";

// With:
import { verifyCanonicalProof } from "@/lib/ed25519-crypto";

// In verification logic:

// OLD (RSA):
const signatureValid = verifySignature(proof.hash_full, proof.signature);

// NEW (Ed25519):
const result = verifyCanonicalProof(proof);
// result contains: { valid, errors, fields }
```

### Step 5: Update Database Schema

The `proofs` table may need adjustments to store the canonical format:

```sql
-- Ensure columns exist for canonical format
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS proof_id VARCHAR(26);
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS issuer VARCHAR(255);
-- issued_at can reuse existing timestamp column
```

### Step 6: Update Frontend Types

File: `frontend/src/types/proof-api.ts`

Add canonical proof type:

```typescript
export interface CanonicalProof {
  proof_id: string;      // ULID format
  sha256: string;        // 64-char hex
  issued_at: string;     // RFC3339 UTC
  signature: string;     // ed25519:base64
  issuer: string;        // did:web or domain
}

export interface VerificationResponse {
  valid: boolean;
  errors: string[];
  fields: {
    proof_id: string;
    sha256: string;
    issued_at: string;
    issuer: string;
  };
}
```

## Testing

### Test Ed25519 Functions Directly

```typescript
import { sha256, signEd25519, verifyEd25519, createCanonicalProof } from '@/lib/ed25519-crypto';

// Test signing
const hash = sha256(Buffer.from("test"));
const issuedAt = new Date().toISOString();
const signature = signEd25519(hash, issuedAt);
console.log("Signature:", signature); // Should start with "ed25519:"

// Test verification
const valid = verifyEd25519(hash, issuedAt, signature);
console.log("Valid:", valid); // Should be true

// Test canonical proof creation
const proof = createCanonicalProof(hash);
console.log("Proof:", JSON.stringify(proof, null, 2));
```

### Test End-to-End

1. Create a proof via `/api/proof/create`
2. Verify the proof format matches the schema
3. Verify via `/api/verify` with the proof
4. Check that validation passes

## Migration Strategy

### Phase 1: Dual Support (Recommended)
- Support both RSA (old) and Ed25519 (new) proofs
- Validate based on signature prefix (`ed25519:` vs RSA)
- Gradually migrate to Ed25519-only

### Phase 2: Ed25519 Only
- Remove RSA signing
- Update all proofs to Ed25519 format
- Deprecate RSA verification

## Rollback Plan

If issues arise:

1. Revert environment variables to RSA keys
2. Deploy previous version of proof creation endpoint
3. Continue serving existing RSA proofs

## Success Criteria

✅ All new proofs use Ed25519 format
✅ Signature format: `ed25519:<base64>`
✅ Verification returns MVP §2.3 format
✅ Proof schema matches `proof.schema.json`
✅ No existing proofs break during migration

## References

- MVP §2.1: Issuance architecture
- MVP §2.3: Verify API contract  
- MVP §3: Canonical proof schema
- `frontend/src/lib/ed25519-crypto.ts`: Implementation
- `frontend/src/schema/proof.schema.json`: Schema definition
