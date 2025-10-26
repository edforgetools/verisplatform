# Veris Execution — Tasks v4.5
**Class:** Automation Sequence  
**Continuity:** Upstream = Execution Ops v4.5

---

> All shell blocks begin with `set -euo pipefail`.

## 0) Preflight
```sh
set -euo pipefail
make bootstrap
cp .env.example .env
make env:sync
```

## 1) Backend bring‑up
```sh
set -euo pipefail
make proof:init
make registry:init
make api:verify:init
```

## 2) Web deploy
```sh
set -euo pipefail
make web:build
make web:deploy
curl -sf "$APP_BASE_URL" | grep -q "Verifiable Proof of Delivery"
```

## 3) Demo proof
```sh
set -euo pipefail
make proof:demo
curl -sf "$APP_BASE_URL/api/verify?proof_id=demo" | jq .
```

## 4) Lighthouse + A11y
```sh
set -euo pipefail
make test:lighthouse
make test:pa11y
```

## 5) Dual‑mode + C2PA
```sh
set -euo pipefail
export C2PA_MODE=on
make e2e:c2pa
make test:proof:dual-mode
```

## 6) Mirrors
```sh
set -euo pipefail
make mirror:snapshot
make mirror:check
```

## 7) Post‑deploy validation
```sh
set -euo pipefail
curl -sf "$APP_BASE_URL/api/verify?proof_id=test" | jq .
```

## 8) Monitoring kickoff
```sh
set -euo pipefail
make ops:health
make ops:ui-audit
make ops:verify-slo
```

## 9) Tag + Freeze
```sh
set -euo pipefail
gh release create v1.0-mvp --generate-notes
make freeze:immutable
```
