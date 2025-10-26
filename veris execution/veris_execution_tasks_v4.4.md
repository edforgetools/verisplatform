# Veris Execution — Tasks v4.4 (Cursor)
**Class:** Automation Sequence  
**Continuity:** Upstream = Veris Execution — Ops v4.4

---

> All shell blocks must begin with `set -euo pipefail`.

## 0) Preflight
```sh
set -euo pipefail
make bootstrap
cp .env.example .env
make env:sync
```

## 1) AWS S3 + OIDC
```sh
set -euo pipefail
make aws:bucket:init
```

## 2) Database
```sh
set -euo pipefail
supabase login --token "$SUPABASE_ACCESS_TOKEN"
supabase db push
make supabase:migrate
```

## 3) Issuance → Registry
```sh
set -euo pipefail
make proof:init
make registry:init
```

## 4) Verification API
```sh
set -euo pipefail
make api:verify:init
curl -sf "$APP_BASE_URL/api/verify?proof_id=test" | jq .
```

## 5) Stripe (Test → Live)
```sh
set -euo pipefail
stripe login
export STRIPE_API_KEY=$(stripe config --list | awk '/Secret Key/{print $NF}')
make stripe:seed
stripe webhook endpoints create --url "$APP_BASE_URL/api/stripe/webhook" --enabled-events payment_intent.succeeded
```

## 6) C2PA Adapter (Optional)
```sh
set -euo pipefail
export C2PA_MODE=on
make c2pa:build
make e2e:c2pa
```

## 7) E2E + Dual‑Mode
```sh
set -euo pipefail
make e2e
make test:proof:dual-mode
```

## 8) Deploy
```sh
set -euo pipefail
vercel link --yes
make deploy
```

## 9) Mirror Snapshot
```sh
set -euo pipefail
make mirror:snapshot
```

## 10) Post‑Deploy Validation
```sh
set -euo pipefail
curl -sf "$APP_BASE_URL/api/verify?proof_id=test" | jq .
curl -sf "$APP_BASE_URL/api/billing/status" | jq .
```

## 11) Cleanup (Optional) + Verification
```sh
set -euo pipefail
make teardown
aws s3 ls "$REGISTRY_BUCKET_STAGING" >/dev/null 2>&1 || echo "Staging bucket removed"
```

## 12) Auto‑Merge & Tag
```sh
set -euo pipefail
gh label create automerge -d "Merge when CI green" || true
gh pr create --title "MVP Cut" --body "Automated by Cursor" --label automerge
gh release create v1.0-mvp --generate-notes
```

## 13) Monitoring Kickoff
```sh
set -euo pipefail
make ops:health
make ops:verify-slo
```

## 14) Manifest Integrity Check
```sh
set -euo pipefail
sha256sum veris_strategy_*_v4.3.md veris_execution_*_v4.4.md > veris_manifest.sha256
```

## 15) Immutable Freeze
```sh
set -euo pipefail
make freeze:immutable
```