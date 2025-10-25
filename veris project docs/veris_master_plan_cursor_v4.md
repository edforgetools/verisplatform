# Veris Master Plan — Cursor v4.0
**Document Class:** Architecture  
**Continuity Chain:**  
Upstream = [veris_north_star_cursor_v4.md](./veris_north_star_cursor_v4.md)  
Downstream = [veris_build_plan_cursor_v4.md](./veris_build_plan_cursor_v4.md)

---

## 1. Purpose
Define *how* Veris realises its mission through permanent architecture, economics, and governance.

---

## 2. Proof Lifecycle
1. Issuance → deterministic hash + timestamp + signature  
2. Registration → write to Network Trust Registry  
3. Verification → public endpoint check  
4. Persistence → mirrored snapshot  
5. Recognition → visible Veris Seal hyperlink

**Example**  
Designer delivers `final.psd`; registry stores proof JSON; verifier calls `/api/verify?id=<proof>` → `{valid:true}`.

---

## 3. Invariant Mapping
| Invariant | Domain | Implementation |
|------------|---------|----------------|
| Determinism | Issuance | Stable hash algorithm |
| Clarity | Schema | JSON Schema v1 |
| Trust by Math | Registry | Ed25519 signature verify |
| Durability | Storage | AWS S3 + Arweave mirrors |
| Automation | CI/CD | GitHub Actions + Vercel |
| Simplicity | Governance | Single schema authority key |

---

## 4. Proof Schema (v1.0.0)
```json
{
  "$schema": "https://veris.io/schema/v1.json",
  "id": "uuid",
  "hash": "sha256",
  "timestamp": "2025-10-25T00:00:00Z",
  "signature": "ed25519...",
  "schema_version": "1.0.0"
}
```

Validation rule:
`sha256(file) == proof.hash` → verify(signature, hash, public_key) == true.

---

## 5. Economics
| Action | Cost | Purpose |
|---------|------|----------|
| Proof Issuance | Paid (Stripe) | Margin ≥85 % |
| Verification | Free | Growth |
| Snapshot | Internal | Integrity check |

---

## 6. Governance Transfer
Custodianship transfers when a new steward signs previous schema with a newer valid key recorded on-chain.  
Verification CLI:  
```sh
veris verify-steward --schema v1.0.0 --signature newkey.sig
```

---

## 7. Security & Scaling Annex
- Keys stored via AWS KMS + Vercel Secrets (AES256).  
- Timestamps validated via NTP + blockchain anchor (optional).  
- Replay prevention: nonce bound to proof ID.  
- Scaling: registry supports 10M proofs/year using partitioned Supabase tables + CDN cache.  
- Latency budget <2 s end-to-end verified via CI.  

---

## 8. Validation Summary
✓ Complete architecture  
✓ Security + scaling addressed  
✓ Economic + governance flows explicit
