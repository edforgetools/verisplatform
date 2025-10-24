# ✅ Veris MVP Execution Checklist

Derived from *Veris Build Plan v1.1*, aligned with *North Star v1.6* and *Master Plan v1.3*.
Optimized for direct use in Cursor context.

---

## ⚙️ 1. Proof Issuance Pipeline
**Goal:** Deterministic hash, timestamp, and signature generation for each delivery.

**Tasks**
- [ ] Implement issuance script producing `proof.json` with hash, timestamp, and signature.
- [ ] Store proofs under `registry/` with versioning.
- [ ] Automate issuance test for 10 mock proofs.
- [ ] Validate reproducibility: repeated run yields identical hash for identical input.

**Cursor Prompt**
```
Implement a TypeScript/Node service named "issuance" that:
1. Takes a file or payload input.
2. Generates SHA-256 hash and ISO8601 timestamp.
3. Signs with the project private key.
4. Outputs JSON with {hash, timestamp, signature, signer}.
5. Saves to /registry/<proof-id>.json.
Include reproducibility test to confirm deterministic hashing.
```

---

## ⚙️ 2. Network Trust Registry
**Goal:** Immutable registry storing proofs and exposing verifiable history.

**Tasks**
- [ ] Create registry structure under `/registry/` with versioning.
- [ ] Implement S3 storage (staging + production).
- [ ] Validate write and read operations with OIDC-authenticated role.
- [ ] Automate integrity check: schema hash = master schema.

**Cursor Prompt**
```
Build an S3 registry service that:
1. Connects to AWS via OIDC (role VerisRegistryWriter-GitHub).
2. Uploads proof JSON to both staging and production buckets.
3. Validates upload by comparing remote checksum to local.
4. Runs integrity check comparing schema.json hash to canonical schema.
```

---

## ⚙️ 3. Verification Endpoint
**Goal:** Publicly queryable endpoint verifying proof validity.

**Tasks**
- [ ] Create `/api/verify` endpoint returning proof validity, timestamp, and signer.
- [ ] Confirm consistent results across mirrors.
- [ ] Implement 99% uptime monitoring in Vercel.

**Cursor Prompt**
```
Create a Vercel API route /api/verify that:
1. Accepts proof hash as a query parameter.
2. Fetches the corresponding proof from S3.
3. Verifies the signature using the public key.
4. Returns {valid: boolean, timestamp, signer}.
5. Logs response latency and success rate.
```

---

## ⚙️ 4. Developer Access Layer
**Goal:** Public SDK and documentation for external issuance and verification.

**Tasks**
- [ ] Create JS SDK wrapping `/api/issue` and `/api/verify`.
- [ ] Write OpenAPI specification.
- [ ] Validate by simulating third-party issuance.

**Cursor Prompt**
```
Generate OpenAPI 3.1 spec for /api/issue and /api/verify.
Then scaffold SDK with functions issueProof() and verifyProof() using Fetch API.
Add an example script showing external issuance with the SDK.
```

---

## ⚙️ 5. Billing + Stripe Integration
**Goal:** Successful test billing for proof issuance.

**Tasks**
- [ ] Integrate Stripe test keys.
- [ ] Attach billing to issuance endpoint.
- [ ] Confirm first paid proof processed and verified.
- [ ] Switch to live keys after pilot completion.

**Cursor Prompt**
```
Integrate Stripe checkout (test mode) into proof issuance:
1. Wrap /api/issue with Stripe payment requirement.
2. Record transaction ID in billing_logs table.
3. Include env STRIPE_MODE='test' or 'live'.
4. Add helper script to confirm current mode.
```

---

## ⚙️ 6. Usage Telemetry
**Goal:** Measure proof-volume metrics for capacity planning.

**Tasks**
- [ ] Log proof issuance and verification counts.
- [ ] Store in Supabase table `usage_metrics`.
- [ ] Automate weekly summaries.

**Cursor Prompt**
```
Create Supabase table usage_metrics(proof_id, event_type, timestamp).
Add middleware to record issuance and verification events.
Set up a cron job to aggregate weekly totals.
```

---

## ⚙️ 7. Snapshot + Mirror Protocol
**Goal:** Registry snapshots after every 1,000 proofs.

**Tasks**
- [ ] Generate snapshot manifest of registry JSONs.
- [ ] Sign manifest.
- [ ] Upload to Arweave or neutral mirror.
- [ ] Verify snapshot hash matches original schema.

**Cursor Prompt**
```
Add script snapshot_registry.ts that:
1. Bundles the last 1000 proof JSONs into manifest.jsonl.gz.
2. Generates manifest hash.
3. Signs and uploads to Arweave (using ARWEAVE_WALLET_JSON).
4. Confirms mirror integrity via returned transaction hash.
```

---

## ⚙️ 8. Schema Version Control
**Goal:** Maintain backward-verifiable schemas.

**Tasks**
- [ ] Version proof schema semantically (`schema/v1.x.json`).
- [ ] Add regression tests validating old proofs under new schema.

**Cursor Prompt**
```
Implement schema version manager:
1. Keep proof schemas under /schema/v1.x.json.
2. Add test verifying that all old proofs validate under the current schema.
3. Fail build if any validation mismatch occurs.
```

---

## ⚙️ 9. Recovery Audit
**Goal:** Validate registry persistence.

**Tasks**
- [ ] Schedule random proof reconstruction from Arweave every 10,000 proofs.
- [ ] Compare hashes to originals.

**Cursor Prompt**
```
Write recovery_audit.ts that:
1. Randomly selects a proof from the registry.
2. Downloads the same proof from Arweave.
3. Compares hashes and logs mismatch alerts.
```

---

## ⚙️ 10. Deployment and Governance
**Goal:** Production-grade automation and reliability.

**Tasks**
- [ ] Deploy all services via Vercel.
- [ ] Configure OIDC trust for GitHub and Vercel.
- [ ] Enable versioning and AES256 encryption on S3.
- [ ] Add environment variable rotation policy.

**Cursor Prompt**
```
Confirm deployment automation:
1. Use Vercel OIDC to assume AWS role VerisRegistryWriter-GitHub.
2. Verify S3 versioning and encryption.
3. Create rotate_keys.sh for periodic key refresh.
4. Log deployment hash and commit for traceability.
```

---

## ⚙️ 11. Metrics + Verification
**Goal:** Confirm MVP performance thresholds.

**Tasks**
- [ ] 500+ issued proofs verified publicly.
- [ ] Verification uptime ≥99%.
- [ ] Issuance latency ≤2s.
- [ ] Manual intervention ≤5%.
- [ ] Automated billing success ≥95%.

**Cursor Prompt**
```
Build monitoring dashboard displaying:
1. proof_count, verification_success_rate, issuance_latency.
2. Pull data from Supabase telemetry.
3. Highlight metrics that fail to meet thresholds.
```

---

## 🚀 12. Launch Gate
**Goal:** Pilot readiness.

**Tasks**
- [ ] All systems tested.
- [ ] Stripe verified in test mode.
- [ ] First paid issuance successful.
- [ ] 500 verified proofs completed.
- [ ] Documentation confirmed usable by third parties.

**Cursor Prompt**
```
Summarize readiness report in README:
List each system, pass/fail status, and current proof count.
Automate daily update during pilot phase.
```

---

**Completion Definition:**
Pilot-ready MVP = deterministic issuance, verifiable registry, functional billing, 500 public proofs, and reproducible verification across mirrors.

