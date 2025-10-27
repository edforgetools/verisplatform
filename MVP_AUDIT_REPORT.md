# MVP Alignment Summary

## Completed Actions

### 1. Documentation Restructure ✅
- Created docs/archive/ with 23 archived documents
- Created docs/README.md with tombstone note
- Created frontend/src/schema/proof.schema.json (canonical schema)
- Cleaned Makefile to MVP targets only
- Updated README.md to MVP-focused content

### 2. Homepage Compliance ✅
- Changed H1 to 'Verifiable Proof of Delivery' (MVP §5.1)
- Added three-step explainer: Create Proof → Register → Verify
- Updated CTAs to 'Create Proof' and 'Verify'
- Updated features to highlight Ed25519, ULID, Free Verification

### 3. CI/CD Compliance ✅
- Created .github/workflows/content_guard.yml (MVP §8.3)
- Validates strategy docs, schema, archive immutability

### 4. Technical Foundation ✅
- ULID generation implemented (frontend/src/lib/ids.ts)
- Schema file created with MVP format
- /api/verify endpoint exists

## Critical Remaining Work

### 1. Ed25519 Signature Implementation
- Current: RSA signatures
- Required: Ed25519 signatures
- Action: Update crypto-server to use Ed25519

### 2. Schema Implementation
- Current: Code references old proof.v1.json
- Required: Use proof.schema.json with Ed25519 format
- Action: Update proof-schema.ts to match MVP format

### 3. Missing CI Workflows (MVP §8)
- Need: e2e.yml
- Need: web_quality.yml  
- Need: release_gate.yml

### 4. /demo Page (MVP §5.1)
- Status: Not yet verified/compliant
- Required: Client-side hashing, demo proof, JSON preview

## Compliance Score

- Documentation: ✅ 100%
- Homepage Content: ✅ 100%
- Schema Definition: ✅ 100%
- Schema Implementation: ⚠️ 50% (file exists, code needs update)
- CI/CD: ⚠️ 25% (content guard done, 3 workflows needed)
- Crypto Implementation: ❌ 0% (RSA vs Ed25519)
- ULID Support: ✅ 100%
- API Endpoints: ⚠️ 75% (exist but need Ed25519)

**Overall MVP Compliance: ~70%**

