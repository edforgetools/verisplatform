# Veris Cursor Tasks — v4.0
**Document Class:** Automation Sequence  
**Continuity Chain:** Upstream = [veris_cursor_ops_v4.md](./veris_cursor_ops_v4.md)

---

## 1. Bootstrap
```sh
make bootstrap
cp .env.example .env
make env:sync
```

## 2. AWS S3 + OIDC
```sh
make aws:bucket:init
```

## 3. Database Migration
```sh
supabase login --token "$SUPABASE_ACCESS_TOKEN"
supabase db push
make supabase:migrate
```

## 4. Stripe (Test → Live)
```sh
stripe login
export STRIPE_API_KEY=$(stripe config --list | awk '/Secret Key/{print $NF}')
make stripe:seed
stripe webhook endpoints create --url "$APP_BASE_URL/api/stripe/webhook" --enabled-events payment_intent.succeeded
```

## 5. E2E Issuance→Registry→Verification
```sh
make e2e
```

## 6. Deploy
```sh
vercel link --yes
make deploy
```

## 7. Post-Deploy Validation
```sh
curl -s "$APP_BASE_URL/api/verify?proof_id=test" | jq
```

## 8. Mirror Snapshot
```sh
make mirror:snapshot
```

## 9. Cleanup (Optional)
```sh
make teardown
```

## 10. Auto-Merge & Tag
```sh
gh label create automerge -d "Merge when CI green" || true
gh pr create --title "MVP Cut" --body "Automated by Cursor" --label automerge
gh release create v1.0-mvp --generate-notes
```

## 11. Monitoring Kickoff
```sh
make ops:health
```

## 12. Manifest Integrity Check
```sh
sha256sum veris_*_v4.md > veris_manifest.yaml
```
Used by CI to confirm doc integrity before merge.

---

## Cursor Directives
- Run sequentially; parallelise AWS + Stripe setup.  
- Halt on non-zero exit.  
- Log to `/logs/mvp_run_$(date +%Y%m%d).txt`.  
- Append “MVP completed” to `STATUS.md`.  
- Auto-merge PR on validation pass.

---

## Validation Summary
✓ Deterministic, auditable pipeline  
✓ Includes manifest integrity step  
✓ Complete automation to compliance grade
