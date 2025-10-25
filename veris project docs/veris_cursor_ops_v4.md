# Veris Ops — Cursor v4.0
**Document Class:** Operational Parameters  
**Continuity Chain:**  
Upstream = [veris_build_plan_cursor_v4.md](./veris_build_plan_cursor_v4.md)  
Downstream = [veris_cursor_tasks_v4.md](./veris_cursor_tasks_v4.md)

---

## 1. Purpose
Specify runtime configuration, key rotation, monitoring, retention, and compliance.

---

## 2. Modes
| Variable | Values | Function |
|-----------|---------|-----------|
| STRIPE_MODE | test / live | Select Stripe key |
| DEPLOY_MODE | staging / prod | Vercel deploy target |
| MIRROR_MODE | auto / manual | Arweave snapshot control |
| ALERT_MODE | slack / email / none | Notification channel |

---

## 3. Environment Authority
`.env.example` → `make env:sync` → Vercel.  
Repo canonical; no dashboard edits permitted.

---

## 4. Required Keys
`STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AWS_REGION, REGISTRY_BUCKET_STAGING, REGISTRY_BUCKET_PROD, AWS_ROLE_VERCEL_ARN, AWS_ROLE_GITHUB_ARN, ARWEAVE_WALLET_JSON, SLACK_WEBHOOK_URL`

---

## 5. Key Rotation
Rotate every 6 months or 10 000 proofs.  
Cursor pipeline:
```sh
make rotate:keys
vercel secrets rm STRIPE_SECRET_KEY
vercel secrets add STRIPE_SECRET_KEY "$NEW_KEY"
```

---

## 6. Monitoring and Alerts
Daily CI cron:  
```sh
make ops:health
```
If any check fails → POST Slack alert via `SLACK_WEBHOOK_URL`.  
Persistent failure > 24 h → escalate via email fallback.

---

## 7. Data Retention and Compliance
- Proof JSON retained ≥10 years.  
- Logs retained 12 months.  
- PII redaction enforced at ingestion.  
- GDPR-compliant anonymisation for metadata.  
- SOC2-aligned audit trails.  

---

## 8. Validation Summary
✓ Complete key + retention policy  
✓ Alert redundancy via Slack/email  
✓ Meets Durability and Compliance standards
