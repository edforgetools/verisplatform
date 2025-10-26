# Veris Execution — Ops v4.4 (Cursor)
**Class:** Operations / Runtime  
**Continuity:** Upstream = Veris Execution — Build Plan v4.4 → Downstream = Veris Execution — Tasks v4.4

---

## 1) Modes
| VAR | Values | Effect |
|-----|--------|--------|
| STRIPE_MODE | test | live | Select Stripe key |
| DEPLOY_MODE | staging | prod | Vercel env target |
| C2PA_MODE | on | off | Emit C2PA sidecar |
| MIRROR_MODE | auto | manual | Snapshot cadence |
| ALERT_MODE | slack | email | none | Alert sink |

---

## 2) Environment Authority
- `.env.example` → `.env` → `make env:sync` (Vercel).  
- Repo canonical. No manual dashboard edits.

---

## 3) Secrets (canonical list)
`STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AWS_REGION, REGISTRY_BUCKET_STAGING, REGISTRY_BUCKET_PROD, AWS_ROLE_VERCEL_ARN, AWS_ROLE_GITHUB_ARN, ARWEAVE_WALLET_JSON, SLACK_WEBHOOK_URL, APP_BASE_URL`

---

## 4) Key Rotation
Interval: 6 months or 10 000 proofs (whichever first)
```sh
set -euo pipefail
make -j1 rotate:keys
vercel secrets rm STRIPE_SECRET_KEY
vercel secrets add STRIPE_SECRET_KEY "$NEW_KEY"
make -j1 test:keys   # validates new credentials work
```
Record rotation in `/logs/keys_$(date -u +%Y%m%d).log`.

---

## 5) Health & SLOs
- Daily cron: `make ops:health`
- SLO verification:
```sh
set -euo pipefail
make -j1 ops:verify-slo   # uptime ≥99.9 %, p95 ≤2 s
```
- Components: issuance, registry, verify API, Stripe webhook, mirror integrity, C2PA parity (if on).

---

## 6) Alerts & Escalation
Primary: Slack via `SLACK_WEBHOOK_URL`.  
Fallback: email (configured in repo).  
If both fail for >24 h, auto-create a GitHub issue:
```sh
set -euo pipefail
gh issue create --title "Ops Alert Failure" --body "Both Slack and Email alerts failed for 24h window"
```

---

## 7) Retention & Compliance
- Proofs: ≥ 10 years.  
- Logs: 12 months.  
- PII redaction: enforced at ingestion.  
- GDPR anonymisation: metadata only.  
- Annual registry integrity audit (signed snapshot).

---

## 8) Stewardship & Freeze
- Immutable Freeze after MVP completion.  
- Post‑freeze changes require new schema signature and steward countersign.