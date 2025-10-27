# Veris MVP — Executable Specification v1.1

> Sole execution source for Cursor and CI. Strategic doctrine stays outside this repo. Any deviation must be rejected by CI.

---

## 0. Summary
- Deliver one vertical slice: **Issuance → Registration → Verification → Persistence → Recognition**.
- Ship a public demo and a free Verify API.
- Enforce budgets and gates by CI only. No manual overrides.

---

## 1. Scope and Non‑Goals
### In‑scope
- Canonical proof format and end‑to‑end pipeline
- Website Trust Layer: `/`, `/demo`, `/verify`, `/billing`
- Paid issuance, free verification, public demo
- C2PA adapter with ≥95% field parity (adapter only; no authoring UI)

### Out‑of‑scope for MVP
- Multiple issuance modes beyond the primary flow
- Complex workflows, plugins, or third‑party integrations
- Multi‑tenant RBAC, team management
- Non‑critical metrics dashboards
- Chaos tests and multi‑CDN failover

---

## 2. Architecture Contracts

### 2.1 Issuance
- Inputs: file bytes or digest
- Steps:
  1) Compute `sha256` (client‑side for web issuance)
  2) Set `issued_at` as RFC3339 UTC
  3) Sign concatenation `sha256 || issued_at` with Ed25519 private key
  4) Generate `proof_id` (ULID); `issuer` is `did:web:<domain>` or `<domain>`
- Output: `proof.json` (canonical schema, below)
- Determinism: same input → same digest, signature over same tuple
- CLI: `veris issue --in path/to/file --out proof.json --issuer did:web:example.com`

### 2.2 Registry
- Persistence: append‑only, partitioned by `issued_at::date`
- Primary key: `proof_id`
- Constraints:
  - `sha256` unique across `issuer` scope
  - Signature verification succeeds on insert (server‑side check)
  - Immutable rows
- Read endpoints:
  - `GET /api/proofs/{proof_id}` → canonical JSON
  - `GET /api/proofs/by-hash/{sha256}` → list with pagination

### 2.3 Verify API
- `POST /api/verify`
- Request body: proof JSON
- Response: `{ "valid": boolean, "errors": string[], "fields": { "proof_id": "...", "sha256": "...", "issued_at": "...", "issuer": "..." } }`
- Contract: verification public and free; latency p95 ≤ 500 ms (staging and prod)
- CI target: ≥99% success across test vectors

### 2.4 Persistence Mirrors
- Write‑through to S3 multi‑region and Arweave
- Integrity job compares registry record vs mirror payload hash daily
- Retention objective: ≥10 years verifiability

### 2.5 Billing
- Stripe Checkout for issuance
- Test requirement for release: ≥1 successful paid issuance (test mode is allowed)
- Verification and demo free

### 2.6 Interop
- `adapters/c2pa/adapter.ts` maps C2PA fields → canonical fields
- Field parity target ≥95% on CI fixtures
- Clear precedence: canonical verification first, C2PA adapter is additive

---

## 3. Canonical Proof Schema

**File:** `/schema/proof.schema.json`

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Veris Proof",
  "type": "object",
  "additionalProperties": false,
  "required": ["proof_id", "sha256", "issued_at", "signature", "issuer"],
  "properties": {
    "proof_id": { "type": "string", "pattern": "^[0-9A-HJKMNP-TV-Z]{26}$" }, // ULID
    "sha256":   { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "issued_at":{ "type": "string", "format": "date-time" }, // RFC3339
    "signature":{ "type": "string", "pattern": "^ed25519:[A-Za-z0-9+/=]+$" },
    "issuer":   { "type": "string", "minLength": 3 }
  }
}
```

**Minimal example (`proof.json`):**
```json
{
  "proof_id": "01J9Y1H8N2C8ZKQ2S8E5Q5A3RJ",
  "sha256": "6c9f...b3d2",
  "issued_at": "2025-10-27T01:23:45Z",
  "signature": "ed25519:MEUCIQ...",
  "issuer": "did:web:veris.example"
}
```

---

## 4. HTTP API (OpenAPI excerpt)

```yaml
openapi: 3.0.3
info:
  title: Veris Verify API
  version: 1.0.0
paths:
  /api/verify:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Proof'
      responses:
        '200':
          description: Verification result
          content:
            application/json:
              schema:
                type: object
                required: [valid, errors, fields]
                properties:
                  valid: { type: boolean }
                  errors: { type: array, items: { type: string } }
                  fields:
                    type: object
                    properties:
                      proof_id: { type: string }
                      sha256:   { type: string }
                      issued_at:{ type: string }
                      issuer:   { type: string }
components:
  schemas:
    Proof:
      $ref: './schema/proof.schema.json'
```

---

## 5. Website Trust Layer

### 5.1 Routes
- `/`:
  - H1: “Verifiable Proof of Delivery”
  - Three‑step explainer: **Create Proof → Register → Verify**
  - CTAs: Primary **Create Proof**, Secondary **Verify**
- `/demo`:
  - Client‑side hashing, issue demo proof, show JSON preview
- `/verify`:
  - Paste or upload `proof.json`, aria‑live validation
- `/billing`:
  - Pricing and rationale

### 5.2 Accessibility and Performance
- Keyboard‑complete flow
- Visible focus; color contrast ≥ 4.5:1
- Respect `prefers-reduced-motion`
- Budgets:
  - LCP ≤ 1.8 s, CLS ≤ 0.1, INP ≤ 200 ms
  - Lighthouse: Perf ≥95, A11y ≥98, BP ≥95, SEO ≥95

### 5.3 Security Headers
- CSP strict (no `unsafe-inline`), hashed/nonce scripts
- SRI on external assets
- `Referrer-Policy: strict-origin-when-cross-origin`
- Minimal `Permissions-Policy`

**Golden headers snapshot (`/web/security-headers.json`):**
```json
{
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; script-src 'self' 'nonce-{{RANDOM}}'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "X-Content-Type-Options": "nosniff"
}
```

### 5.4 SEO
- canonical, OpenGraph, Twitter cards
- JSON‑LD `SoftwareApplication`
- sitemap.xml and robots.txt

### 5.5 Analytics
- Events: `proof_created`, `proof_verified`, `billing_started`, `billing_paid`
- Privacy‑preserving only; no PII

---

## 6. Environments

| Env    | Purpose                  | Notes |
|--------|--------------------------|-------|
| dev    | local stack              | stub billing, local Supabase |
| staging| public demo and smoke    | auto‑issue demo proof on deploy |
| prod   | paid issuance + verify   | Verify API read‑only public, issuance behind billing |

**Staging hook:** post‑deploy job must generate a fresh demo proof and publish it to `/demo` JSON preview.

---

## 7. Repository Layout

```
/
├── schema/proof.schema.json
├── services/
│   ├── issuance/
│   ├── registry/
│   ├── verify/
│   ├── persistence/
│   └── billing/
├── adapters/c2pa/
├── web/                      # /, /demo, /verify, /billing
├── infra/                    # IaC: Supabase, S3, Arweave, monitors
├── docs/
│   ├── archive/              # deprecated execution docs (read‑only)
│   └── README.md             # tombstone note
├── .github/workflows/
│   ├── e2e.yml
│   ├── web_quality.yml
│   ├── content_guard.yml
│   └── release_gate.yml
└── mvp.md
```

**Decrufting & Redundancy rules**
1) Only `mvp.md` governs execution.  
2) Any new strategy/plan files outside `docs/archive/` fail CI.  
3) Remove unused abstractions. Single issuance path, one Verify API, one billing flow.  
4) Cursor may scaffold but must not add layers not needed by contracts.  
5) `docs/archive/` is immutable; changes fail CI.

---

## 8. High‑Leverage CI (GitHub Actions)

> Bottleneck exists in CI capacity. Keep only the workflows that block risk.

### 8.1 `e2e.yml` — Vertical Slice Gate
- Triggers: PR to `main`, push to `main`
- Steps:
  - Build stack with test keys
  - Run end‑to‑end: **issue → register → verify → JSON preview**
  - Assert ≥99% verify success
  - Upload demo proof JSON artifact
  - If branch == `main`: publish demo proof to staging
- Fail → block merge

### 8.2 `web_quality.yml` — A11y + Lighthouse + Core Web Vitals
- Triggers: PR to `main`, push to `main`
- Steps:
  - Start preview server
  - `axe` + `pa11y` on `/` and `/verify`
  - Lighthouse on `/` and `/verify` with budgets
  - Headless vitals probe for LCP/CLS/INP
- Fail → block merge

### 8.3 `content_guard.yml` — Copy Drift + Schema + Headers
- Triggers: PR to `main`
- Steps:
  - Ensure homepage contains “Verifiable Proof of Delivery”
  - Reject strategy docs outside `mvp.md`
  - Validate `schema/proof.schema.json` compatibility (semver policy: breaking changes banned)
  - Compare runtime headers to golden snapshot
- Fail → block merge

### 8.4 `release_gate.yml` — Safe Ship
- Trigger: manual `workflow_dispatch`
- Preconditions validated in workflow:
  - Last 3 `e2e.yml` runs on `main` are green
  - Last 3 `web_quality.yml` runs on `main` are green
  - ≥1 paid issuance in last 7 days (Stripe test mode OK)
  - Staging demo proof live and verifiable
- Actions:
  - Tag release
  - Deploy site + Verify API
  - Post‑deploy smoke on `/api/verify` and headers
  - Write release summary artifact

**Branch protection:** require checks from 8.1, 8.2, 8.3.

---

## 9. Make Targets and Scripts

```
make bootstrap     # install deps, set up env
make schema:lint   # validate schema file
make issue         # CLI issuance against sample file, writes proof.json
make verify        # calls POST /api/verify on proof.json
make demo          # issues public demo proof for staging
make test          # unit + e2e orchestration
make lh            # run Lighthouse budgets locally
make a11y          # run axe+pa11y locally
make release       # runs release_gate preflight locally
```

---

## 10. Config, Secrets, and Keys

- `VERIS_ISSUER` (did:web or domain)
- `VERIS_ED25519_PRIV` (base64)
- `VERIS_DB_URL` (Supabase)
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `ARWEAVE_KEYFILE` (if required)
- `STRIPE_SECRET` (test/prod)
- `CSP_NONCE_SECRET` (runtime)

GitHub Actions: define environments `staging` and `prod` with protected secrets.

---

## 11. Observability and SLOs

**SLOs**
- Verify API availability ≥99.9%
- Verify API p95 latency ≤500 ms
- Web Vitals budgets maintained

**Synthetic monitors**
- `/api/verify` health JSON returns `{ "ok": true }`
- GET `/` validates headers snapshot
- Daily integrity: compare registry vs mirrors

Alerting: page on two consecutive failures or breach of SLO for 15 minutes.

---

## 12. Test Vectors

- Valid proof end‑to‑end
- Modified `sha256` → invalid signature
- Clock skew ±5 min → still valid; beyond → invalid
- Wrong issuer key → invalid
- Duplicate `sha256` for issuer → rejected by registry
- Corrupted mirror data → integrity alarm

---

## 13. Completion Gates (all required)

- Three consecutive green runs for `e2e.yml` and `web_quality.yml`
- `content_guard.yml` green
- ≥1 external proof verified end‑to‑end
- Public demo proof live and linked from `/demo`
- ≥1 paid issuance succeeded
- Budgets met: LCP/CLS/INP and Lighthouse
- Accessibility checks pass
- Security headers match golden snapshot
- Uptime target documented and monitors active

---

## 14. Migration: Execution Docs Removed

- The prior execution docs are archived under `/docs/archive/` with a tombstone in `/docs/README.md` stating:  
  “Execution is governed solely by `mvp.md`. Strategic doctrine lives outside this repo.”
- CI (`content_guard.yml`) fails if files under `/docs/archive/` change.

---

## 15. Change Control

- PR template must include: “Does this alter contracts in §2 or schema in §3? If yes, reject or obtain steward countersign before merge.”
- Any change to schema is **breaking by default** and must not pass `content_guard.yml` unless versioned and approved after MVP.

---

## 16. Appendix — Sample GitHub Actions Stubs

**.github/workflows/e2e.yml**
```yaml
name: e2e
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: make bootstrap
      - run: make test # runs issue→register→verify→preview with ≥99% success assert
```

**.github/workflows/web_quality.yml**
```yaml
name: web_quality
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make bootstrap
      - run: make a11y
      - run: make lh
      - run: node scripts/vitals_probe.js # asserts LCP/CLS/INP budgets
```

**.github/workflows/content_guard.yml**
```yaml
name: content_guard
on: [pull_request]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/content_guard.js
```

**.github/workflows/release_gate.yml**
```yaml
name: release_gate
on:
  workflow_dispatch: {}
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/release_preflight.js
      - run: make release
```

---

**This file is normative. If code and this spec disagree, this spec wins and CI must enforce it.**
