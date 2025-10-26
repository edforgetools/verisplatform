# Veris Execution — Ops v4.5
**Class:** Operations / Runtime  
**Continuity:** Upstream = Execution Build Plan v4.5 → Downstream = Execution Tasks v4.5

---

## 1) Modes
| VAR | Values | Effect |
|---|---|---|
| STRIPE_MODE | test | live | Select Stripe key |
| DEPLOY_MODE | staging | prod | Vercel env target |
| C2PA_MODE | on | off | Emit C2PA sidecar |
| MIRROR_MODE | auto | manual | Snapshot cadence |
| ALERT_MODE | slack | email | none | Alert sink |

## 2) Environment Authority
`.env.example` → `.env` → `make env:sync` (Vercel). Repo canonical.

## 3) Secrets
Canonical list unchanged.

## 4) Key Rotation
Interval: 6 months or 10k proofs. Logged to `/logs/keys_YYYYMMDD.log`.

## 5) Health & SLOs
- Daily cron: `make ops:health`  
- SLO: uptime ≥99.9 %, p95 ≤2 s → `make ops:verify-slo`  
- Components: issuance, registry, verify API, Stripe webhook, mirror integrity, C2PA parity.

## 6) UI Audit (Website)
```sh
set -euo pipefail
# Copy integrity
curl -sf "$APP_BASE_URL" | grep -q "Verifiable Proof of Delivery"
# Verify path live
curl -sf "$APP_BASE_URL/verify" >/dev/null
# Demo proof JSON available
curl -sf "$APP_BASE_URL/api/verify?proof_id=demo" | jq .
# Lighthouse budgets
make -j1 test:lighthouse
# Accessibility
make -j1 test:pa11y
```
Log to `logs/ui_audit.log`.

## 7) Alerts & Escalation
Primary: Slack via `SLACK_WEBHOOK_URL`. Fallback: email.  
On two consecutive UI audit failures, send Slack alert and open GH issue.

## 8) Retention & Compliance
Proofs ≥10 years. Logs 12 months. Public demo proofs retained. GDPR: metadata only.

## 9) Stewardship & Freeze
Frontend text changes post‑freeze require steward countersign. Immutable Freeze enforced via `make freeze:immutable`.
