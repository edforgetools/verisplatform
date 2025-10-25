# Veris Build Plan — Cursor v4.0
**Document Class:** Execution  
**Continuity Chain:**  
Upstream = [veris_master_plan_cursor_v4.md](./veris_master_plan_cursor_v4.md)  
Downstream = [veris_cursor_ops_v4.md](./veris_cursor_ops_v4.md)

---

## 1. Objective
Deliver a functioning MVP demonstrating issuance→registry→verification→billing under the six invariants.

---

## 2. Phase 1 — MVP
### Functional Systems
| Component | Output | Target |
|------------|---------|--------|
| Proof Issuance | signed proof JSON | ≥ 500 events |
| Registry | immutable record | Schema hash = master |
| Verification API | `/api/verify` | ≥ 99 % reliability |
| Developer Access | SDK demo | External proof verified |

### Economic Systems
- Stripe billing (test → live).  
- ≥ 1 paid proof verified = success.

### Integrity Systems
- Auto snapshot each 1 000 proofs.  
- Signed + mirrored to Arweave.  
- Random recovery every 10 000 proofs.  

### Failure & Rollback
If proof invalid → re-sign identical hash → append to `reissues.jsonl`.  
Automated rollback via `make rollback:last`.  
All rollback actions logged under `/logs/reissues.jsonl`.

---

## 3. Disaster Recovery & Teardown
`make teardown` safely removes non-production buckets, test webhooks, and temp envs.  
Snapshots remain archived for audit.  
Full DR restore command:  
```sh
make restore:last-snapshot
```

---

## 4. Metrics
| Metric | Threshold | Source |
|---------|-----------|---------|
| Verification Success | ≥ 99 % | CI |
| Latency | ≤ 2 s | e2e |
| Billing Success | ≥ 95 % | Stripe |
| Automation | ≤ 5 % manual | CI logs |
| Registry Mirror | 100 % hash match | Cron |

---

## 5. Dependencies
Auth Layer, S3, Stripe, Supabase, Arweave, Vercel.

---

## 6. Validation Summary
✓ End-to-end measurable objectives  
✓ Rollback + DR defined  
✓ Progression gates explicit
