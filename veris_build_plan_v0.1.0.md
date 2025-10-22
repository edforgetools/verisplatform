# Veris Build Plan v0.1.0 — Pilot Build (Derived from Master Plan)

**Half‑life:** 90 days  
Implements MP‑3 (Product Architecture) and MP‑8 (Roadmap v0.1.0).  
Scope: Seal Generator · Seal Viewer · Billing MVP.

---

## Phase 1 — Core Infrastructure (Days 1–30)
**Pain:** Studios waste hours resending incorrect files and lose trust in final delivery.  
**Principle:** Each file must have one verifiable seal representing the final version.  
**Proof:** Deploy infrastructure that ensures deterministic proof generation.

**Deliverables**
- Monorepo (`frontend` / `backend`) initialised.  
- Supabase tables (`users`, `proofs`, `subscriptions`) created.  
- `/api/proof/create` endpoint operational.  
- Stripe webhook integrated with Supabase billing.  
- `.env.local` verified against production configuration.

---

## Phase 2 — Proof and Viewer (Days 31–60)
**Pain:** Clients cannot confirm authenticity or timestamp of delivered files.  
**Principle:** Proof visibility establishes trust.  
**Proof:** Public `/proof/[id]` viewer displays hash validity and timestamp.

**Deliverables**
- Complete upload → hash → sign → store flow.  
- Viewer rendering verified/pending/invalid states.  
- `/demo` deployment with 7‑day retention.  
- Billing entitlements applied.  
- Audit logging active in Supabase.

---

## Phase 3 — Stability and Telemetry (Days 61–90)
**Pain:** Lack of system integrity checks and behavioural data.  
**Principle:** Reliability underpins proof credibility.  
**Proof:** Telemetry and integrity cron jobs maintain operational trust.

**Deliverables**
- `telemetry_daily` table implemented.  
- Nightly proof integrity job scheduled.  
- QA and error monitoring completed.  
- Support endpoints live (`support@verisplatform.com`, `billing@verisplatform.com`).

---

## Version Roadmap Alignment
| Version | Focus | Key Deliverables |
|----------|--------|------------------|
| v0.1.0 | Pilot Build | Proof creation + viewer + billing MVP |
| v0.2.0 | Telemetry + Stability | Logging + cron jobs |
| v0.3.0 | Paid Tier Rollout | Dashboard + marketing launch |
| v0.4.0 | Glacier + Arweave Storage | Immutable archive integration |
| v0.5.0 | Public API + SDK | Developer documentation + SDK tools |

---

## Environment Summary (Active)
```
NEXT_PUBLIC_SITE_URL=https://verisplatform.com
NEXT_PUBLIC_SUPABASE_URL=https://fxdzaspfxwvihrbxgjyh.supabase.co
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=***
STRIPE_SECRET_KEY=***
STRIPE_WEBHOOK_SECRET=***
NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID=price_1SKqkE2O9l5kYbcA5hZf9ZtD
NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID=price_1SKqkj2O9l5kYbcAJzO0YOfB
VERIS_SIGNING_PRIVATE_KEY=***
VERIS_SIGNING_PUBLIC_KEY=***
ARWEAVE_KEY=
GLACIER_VAULT=
```

---

## Continuity Clause
This build plan expires after 90 days or upon completion of v0.1.0 objectives.  
Unresolved items transition into v0.2.0 planning.
