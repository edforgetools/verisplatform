# Veris Execution — Build Plan v4.4 (Cursor)
**Class:** Execution / Procedural  
**Continuity:** Upstream = Veris Strategy — Build Plan v4.3 → Downstream = Veris Execution — Tasks v4.4

---

## 0) Execution Stack Integration
This Execution Stack runs in order: **Build Plan → Ops → Tasks**. Post-success, run `make freeze:immutable` to enforce Immutable Freeze.

---

## 1) Assumptions
- Cursor runs all commands in repo root.
- Makefile provides targets referenced below.
- Repo is source of truth. No dashboard edits.

---

## 2) MVP Scope (Executable)
- Issuance → Registry → Verification → Billing.
- Optional C2PA sidecar via adapter.
- Snapshots mirrored to Arweave.
- Rollback and DR scripted.
- Dual‑mode tests (Veris + C2PA).

---

## 3) Environments
- **DEPLOY_MODE:** staging | prod
- **STRIPE_MODE:** test | live
- **C2PA_MODE:** on | off

---

## 4) Required Secrets (Vercel)
`STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AWS_REGION, REGISTRY_BUCKET_STAGING, REGISTRY_BUCKET_PROD, AWS_ROLE_VERCEL_ARN, AWS_ROLE_GITHUB_ARN, ARWEAVE_WALLET_JSON, SLACK_WEBHOOK_URL, APP_BASE_URL`

---

## 5) Success Gates
- Verification success ≥ 99 %
- E2E latency ≤ 2 s
- Billing success ≥ 95 %
- Automation ≤ 5 % manual
- Mirror integrity 100 % hash match
- C2PA field parity ≥ 95 %
- Dual‑mode test 100 % pass
- Sustainability ratio (revenue/infra) ≥ 6×

---

## 6) Failure Handling & Concurrency
- All shell blocks must start with:
  ```sh
  set -euo pipefail
  ```
- Deterministic sequencing:
  ```sh
  make -j1 <target>
  ```
- On gate failure:
  ```sh
  echo "$(date -u +%FT%TZ) Gate failure: $STEP" >> logs/build_failures.txt
  exit 1
  ```

---

## 7) Build Phases
1) **Bootstrap**
```sh
set -euo pipefail
make -j1 bootstrap
cp .env.example .env
make -j1 env:sync
```
Gate: `.env` exists and Vercel secrets synced.

2) **AWS S3 + OIDC**
```sh
set -euo pipefail
make -j1 aws:bucket:init
```
Gate: buckets exist; OIDC role assumable.

3) **Database**
```sh
set -euo pipefail
supabase login --token "$SUPABASE_ACCESS_TOKEN"
supabase db push
make -j1 supabase:migrate
```
Gate: migrations applied; healthcheck OK.

4) **Issuance + Registry**
```sh
set -euo pipefail
make -j1 proof:init
make -j1 registry:init
```
Gate: first proof JSON valid; registry write confirmed.

5) **Verification API**
```sh
set -euo pipefail
make -j1 api:verify:init
curl -sf "$APP_BASE_URL/api/verify?proof_id=test" | jq .
```
Gate: CI shows ≥ 99 % success.

6) **C2PA Adapter (optional)**
```sh
set -euo pipefail
export C2PA_MODE=on
make -j1 c2pa:build
make -j1 e2e:c2pa
```
Gate: ≥ 95 % schema‑field parity.

7) **Billing**
```sh
set -euo pipefail
stripe login
export STRIPE_API_KEY=$(stripe config --list | awk '/Secret Key/{print $NF}')
make -j1 stripe:seed
stripe webhook endpoints create --url "$APP_BASE_URL/api/stripe/webhook" --enabled-events payment_intent.succeeded
```
Gate: ≥ 1 paid proof in test; switch to live on go‑signal.

8) **Snapshots + Mirror**
```sh
set -euo pipefail
make -j1 mirror:snapshot
make -j1 mirror:check
```
Gate: 100 % hash match.

9) **Compliance Tests**
```sh
set -euo pipefail
make -j1 test:compliance
```
Gate: PII redaction and retention checks pass.

10) **Dual‑Mode Validation**
```sh
set -euo pipefail
make -j1 test:proof:dual-mode
```
Gate: 100 % pass.

11) **Manifest & Release**
```sh
set -euo pipefail
make -j1 manifest:sign
# produces /registry/manifests/proof_manifest_$(date -u +%Y%m%dT%H%M%SZ).sig
gh release create v1.0-mvp --generate-notes
```
Gate: all gates green; signature stored.

---

## 8) Rollback + DR
- Rollback: `make rollback:last`
- Teardown: `make teardown`
- Restore: `make restore:last-snapshot`

---

## 9) Monitoring
- Daily: `make ops:health`
- SLO verify: `make ops:verify-slo` (uptime ≥99.9 %, p95 ≤2 s)
- Alert: Slack via `SLACK_WEBHOOK_URL`; on failure >24 h → email; if both fail, auto-create GH issue:
  ```sh
  gh issue create --title "Ops Alert Failure" --body "Both Slack and Email alerts failed in last 24h"
  ```

---

## 10) Compliance
- Proof JSON retained ≥ 10 years
- Logs 12 months
- PII redaction at ingestion
- GDPR anonymisation for metadata
- SOC2‑aligned audit trails