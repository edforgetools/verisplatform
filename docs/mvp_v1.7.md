# Veris MVP — Proof of Closure Specification v1.7

> **Execution Directive**  
> This file (`mvp.md`) is the single authoritative specification for the Veris MVP.  
> Cursor and CI must not modify, delete, or refactor anything outside this file.  
> If implementation and this file diverge, this file prevails.

---

## 1. Purpose
Present Veris as a **trust tool** that records the moment of completion and allows public verification.  
This MVP validates closure comprehension and technical determinism through simple, verifiable actions.

Goals:
- Replace informal sign-off rituals with verifiable closure.  
- Provide human-readable records without requiring documentation.  
- Maintain accessibility, readability, and self-evident UX.

---

## 2. Scope

**In-scope**
- Core flow: Close Delivery → Record Closure → Check Delivery.  
- Routes: `/`, `/close`, `/check`, `/billing`.  
- Unified layout, feedback, and global footer.  
- Optional Summary/JSON toggle.  
- Public prototype framing.  
- Minimal micro-FAQ at bottom of homepage.

**Out-of-scope**
- Paid tiers, user accounts, external integrations.  
- Marketing or legal copy.

---

## 3. Homepage (`/`)

### Layout
- Banner (top): **Public prototype — for evaluation only.**  
- Framing sentence: “When work is done, Veris records the moment of completion.”  
- H1: **Verifiable Delivery Records**  
- Subtext: “A verifiable record when work is complete.”  
- CTAs: **Close Delivery** (primary, green) and **Check Delivery** (secondary, gray).  
- Three-step explainer:  
  1. Close Delivery — Upload file to create a record.  
  2. Record Closure — Immutable ULID + timestamp.  
  3. Check Delivery — Verify anytime, publicly.  

### Footer
Plain-text footer line only:  
```
support@verisplatform.com
```

### Micro FAQ
Placed below “About this MVP” card, three concise Q&As only (≤100 words total):
1. **What does Close Delivery do?** — Creates a verifiable record of completion.  
2. **Is my file uploaded?** — No, only a local hash is stored.  
3. **How long do records last?** — Seven days in this public prototype.

### Layout metrics
- Max width 960 px.  
- 16 px spacing between banner and hero.  
- 12 px spacing between hero lines.  
- 16 px between subtext and buttons.  
- Contrast ≥ 4.5:1.  
- Background gradient `#0e1726 → #101828`.  

---

## 4. Sub-pages

### `/close`
- Title: **Close Delivery**  
- Text: “Files are hashed locally. No content leaves your browser.”  
- Card: file input + **Close Delivery** button.  
- After success:  
  - Fade-in banner: **✅ Delivery Closed — record created at [timestamp].**  
  - Dual view: **Summary** (default) and **JSON** toggle.  
  - Summary shows `record_id`, `issuer`, `issued_at`, `status`.  
  - Banner auto-dismisses after 4 s.  
- Progress indicator during hashing.

### `/check`
- Title: **Check Delivery**  
- Inputs:  
  1. Upload file + record.json  
  2. Paste record.json  
  3. Record ID lookup  
- CTA: **Check Delivery** (use identical centering + style as `/close`).  
- Success: Green card — “✅ Delivery confirmed — file matches record.”  
- Failure: Red card — “⚠️ Record mismatch.”  
- aria-live feedback enabled.  
- Placeholder JSON updated to `record_id` (no `proof_id`).  

### `/billing`
- Title: **Prototype Billing Screen**  
- Text: “Billing is disabled in this MVP. Pricing shown for demonstration only.”  
- Single card: **Example Plan — $9 / month** (neutral gray border).  
- Context line above card: “Future pricing example.”  
- “Coming Soon” label in muted gray (#9CA3AF).

---

## 5. Proof Schema (Canonical)

```json
{
  "record_id": "ulid",
  "sha256": "hex",
  "issued_at": "RFC3339",
  "issuer": "did:web or domain",
  "signature": "ed25519:base64",
  "approved_by": "string",
  "acknowledged_at": "RFC3339",
  "status": "closed"
}
```

`status` = "closed".  
Signature covers `sha256 + issued_at + issuer`.

---

## 6. Design Consistency

### Layout Shell
- Shared `/web/Layout.tsx` for header, banner, and footer.  
- Footer contains **only** `support@verisplatform.com`.  
- Container: `max-w-5xl mx-auto px-4 py-12`.  
- Nav spacing: +8 px vertical padding.

### Typography
| Element | Size | Weight | Color |
|----------|------|--------|--------|
| Hero heading | 48 px | 700 | #F9FAFB |
| Section heading | 32 px | 600 | #E5E7EB |
| Body | 18 px | 400 | #CBD5E1 |
| Accent | — | — | #00B67A |
| Card background | — | — | #162133 |

### Spacing
- Top padding: 120 px after header.  
- Section gap: 64 px.  
- Footer padding: 48 px.

### Buttons
```tsx
<Button className="flex items-center justify-center h-11 px-6 text-base font-medium leading-none">
  Close Delivery
</Button>
```
- Text perfectly centered.  
- Identical styling for `/close` and `/check`.  
- Hover accent +10 % brightness.  
- Visible focus ring.

### Cards
- Background #162133, border #1E293B, radius 0.75 rem, `shadow-md`.  
- Body text line-height 1.6.  

### Mobile
- Stack explainer steps vertically under 768 px.  
- Increase card padding.  

---

## 7. Copy Rules
- Use: “record,” “delivery record,” “close delivery,” “check delivery.”  
- Forbid: *secure, trusted by, professionals, clients, protect, join.*  
- Plain declarative tone.  
- All internal strings follow same language.  

---

## 8. Backend Contracts
- `POST /api/close` → creates record.  
- `POST /api/check` → verifies record.  
Response:
```json
{ "valid": true, "errors": [], "fields": { ...record } }
```
- Append-only registry.  
- Persistence via S3 + Arweave.  
- Verification always free.

---

## 9. CI / CD

**Workflows**
1. `e2e.yml` — Close→Record→Check ≥99 % success.  
2. `web_quality.yml` — Lighthouse + pa11y for `/`, `/close`, `/check`, `/billing`.  
3. `content_guard.yml` — enforce copy, schema, button alignment, forbidden words.  
4. `release_gate.yml` — deploy only after 3 consecutive green runs.

**Budgets**
| Metric | Target |
|---------|---------|
| LCP | ≤ 1.8 s |
| CLS | ≤ 0.1 |
| INP | ≤ 200 ms |
| Perf | ≥ 95 |
| A11y | ≥ 98 |
| Best Practices | ≥ 95 |
| SEO | ≥ 95 |

CI fails on any violation.  
Lint verifies button class and footer presence.

---

## 10. Interaction Feedback
- Fade-in/out (150 ms) for banners and cards.  
- Spinner during hashing and verification.  
- Success toast: “Record created — view below.”  
- Keyboard focus resets to top of success card.  

---

## 11. Pilot Metrics
| Metric | Target | Purpose |
|--------|---------|----------|
| Time to first checked delivery | < 30 s | speed parity with email handoff |
| Comprehension (“record of closure”) | ≥ 80 % | clarity validation |
| Verify API success | ≥ 99 % | backend reliability |
| Unique records created | ≥ 100 | pilot traction |

---

## 12. Governance
- MVP is a **public prototype**, not production.  
- Doctrine files remain archived and immutable.  
- Steward approval required for schema or copy edits.  
- CI blocks modifications outside this file.

---

**Summary**  
Veris MVP v1.7 finalizes the **proof of closure** interface with unified centering, footer email, and micro-FAQ.  
The system communicates trust and finality through clarity, not explanation.  
This file is the single executable truth for Cursor and CI.
