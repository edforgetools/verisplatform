# Veris Execution — Build Plan v4.5
**Class:** Execution / Procedural  
**Continuity:** Upstream = Strategy Build Plan v4.5 → Downstream = Execution Tasks v4.5

---

## 0) Assumptions
- Cursor runs in repo root.  
- Makefile provides all targets.  
- No manual dashboard edits.

## 1) Scope
Issuance → Registry → Verify API → Billing → **Website Trust Layer** → Snapshots → Dual‑mode tests.

## 2) Envs
DEPLOY_MODE: staging|prod, STRIPE_MODE: test|live, C2PA_MODE: on|off.

## 3) Secrets
`STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AWS_REGION, REGISTRY_BUCKET_STAGING, REGISTRY_BUCKET_PROD, AWS_ROLE_VERCEL_ARN, AWS_ROLE_GITHUB_ARN, ARWEAVE_WALLET_JSON, SLACK_WEBHOOK_URL, APP_BASE_URL`

## 4) Success Gates
- Verify ≥99 %  
- p95 ≤2 s  
- Billing ≥95 %  
- Automation ≤5 % manual  
- Mirrors 100 % hash match  
- C2PA ≥95 % parity  
- Dual‑mode 100 % pass  
- **Lighthouse:** Perf ≥95, A11y ≥98, SEO ≥95 on `/` and `/verify`  
- **Homepage copy present**

## 5) Phases

1) Bootstrap
```sh
set -euo pipefail
make -j1 bootstrap
cp .env.example .env
make -j1 env:sync
```
Gate: `.env` and Vercel secrets synced.

2) Backend (issuance, registry, verify)
```sh
set -euo pipefail
make -j1 proof:init
make -j1 registry:init
make -j1 api:verify:init
curl -sf "$APP_BASE_URL/api/verify?proof_id=test" | jq .
```

3) C2PA (optional)
```sh
set -euo pipefail
export C2PA_MODE=on
make -j1 c2pa:build
make -j1 e2e:c2pa
```

4) Billing
```sh
set -euo pipefail
make -j1 stripe:seed
stripe webhook endpoints create --url "$APP_BASE_URL/api/stripe/webhook" --enabled-events payment_intent.succeeded
```

5) Website Trust Layer
```sh
set -euo pipefail
make -j1 web:build
make -j1 web:deploy
curl -sf "$APP_BASE_URL" | grep -q "Verifiable Proof of Delivery"
curl -sf "$APP_BASE_URL/verify" >/dev/null
```

6) Public Demo Proof
```sh
set -euo pipefail
make -j1 proof:demo
curl -sf "$APP_BASE_URL/api/verify?proof_id=demo" | jq .
```

7) Performance + A11y
```sh
set -euo pipefail
make -j1 test:lighthouse  # runs on / and /verify
make -j1 test:pa11y       # WCAG 2.2 AA
```

8) Snapshots + Mirror
```sh
set -euo pipefail
make -j1 mirror:snapshot
make -j1 mirror:check
```

9) Dual‑mode
```sh
set -euo pipefail
make -j1 test:proof:dual-mode
```

10) Release
```sh
set -euo pipefail
make -j1 manifest:sign
gh release create v1.0-mvp --generate-notes
```

## 6) Monitoring
Daily `make ops:health` and `make ops:ui-audit`.

## 7) Compliance
PII redaction, retention, GDPR metadata only, SOC2‑aligned trails.

## 8) Freeze
`make freeze:immutable` after 3 green runs.
