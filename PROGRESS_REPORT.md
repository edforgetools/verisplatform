# Progress Report: Ed25519 Migration & CI/CD Fixes

## ✅ Completed
1. GitHub secrets reduced from 31 to 8
2. Updated `s3-registry.ts` for CanonicalProof
3. Updated `issuance.ts` for Ed25519
4. Updated `mint-mock-proofs.ts` for Ed25519  
5. Updated `test-mock-proofs.ts` for Ed25519
6. Disabled old tests temporarily
7. Updated `proof-api.ts` type definitions
8. Added TODO.md with checklist

## ❌ Remaining Issues
**Files still referencing old schema properties:**
- `frontend/src/app/api/proof/verify/route.ts`
- `frontend/src/app/api/proof/[id]/certificate/route.ts`
- `frontend/src/app/api/registry/search/route.ts`
- `frontend/src/lib/registry-snapshot.ts`
- `frontend/src/lib/arweave-publisher.ts`

**These need updating:**
- `.subject.` → `.proof_id` or `.issuer`
- `.hash_full` → `.sha256`
- `.schema_version` → remove (not in Ed25519 schema)
- `.metadata` → remove (not in Ed25519 schema)
- `.signed_at` → `.issued_at`
- `.signer_fingerprint` → `.issuer`

## Current Status
- Last workflow: FAILED (web_quality)
- Error: Property 'subject' does not exist on type 'CanonicalProof'
- E2E workflow: Still running (likely will timeout)

## Next Steps
1. Fix all remaining files above
2. Re-run workflows
3. Fix E2E timeout issue
4. Remove non-MVP workflows
5. Get everything green

