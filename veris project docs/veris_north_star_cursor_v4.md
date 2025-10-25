# Veris North Star — Cursor v4.0
**Document Class:** Doctrine  
**Continuity Chain:** None upstream → feeds [veris_master_plan_cursor_v4.md](./veris_master_plan_cursor_v4.md)

---

## 1. Purpose
Define *why* Veris exists and what must remain constant regardless of implementation.

---

## 2. Mission
Make the **Veris Seal** the global standard for verifiable creative delivery.

**Example Scenario**
A designer finalises `final.psd` and delivers it to a client.  
Veris hashes the file, timestamps it, signs the hash, and issues a proof JSON.  
Anyone can verify authenticity via a public endpoint without trusting either party.

---

## 3. Problem
Digital hand-offs lack cryptographic authenticity.  
Version drift, rework, and disputes arise because there is no mathematical proof of delivery.

---

## 4. Principle
Trust must be proven by computation, not reputation.

---

## 5. Core Invariants
| Invariant | Description | Proof Mechanism |
|------------|--------------|----------------|
| Determinism | Same input → same proof | SHA-256 hash + RFC3339 timestamp |
| Clarity | One schema | Canonical JSON |
| Trust by Math | Verification > authority | Signature verification |
| Durability | Survive time & systems | Multi-mirror snapshots |
| Automation | CI-first | End-to-end scripting |
| Simplicity | Minimal surface | Unified Seal UX |

---

## 6. Strategic Vectors
1. Proof Experience Design  
2. Workflow Embedding  
3. Developer Access Layer  
4. Network Trust Registry  
5. Adoption Dynamics  
6. Value Symmetry  
7. Governance Continuity  

---

## 7. Success Metrics
- ≥100 000 verified deliveries by Year 2  
- ≥85 % automation margin  
- Proofs verifiable ≥10 years after issuance  
- Registry uptime ≥99.9 %  

---

## 8. Governance Addendum (Legal Neutral Foundation Clause)
If Veris ceases operation, stewardship transfers to a neutral, non-profit entity registered under Swiss or Singapore jurisdiction to preserve global neutrality.  
Proof ownership always remains with originator.  Custodianship = technical continuity only.

---

## 9. Validation Summary
✓ Doctrine clear and measurable  
✓ Invariants fully mapped  
✓ Neutral foundation clause ensures legal continuity
