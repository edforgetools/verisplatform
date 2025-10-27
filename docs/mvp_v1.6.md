# Veris MVP — Proof of Closure Specification v1.6

> **Execution Directive**  
> This file (`mvp.md`) is the single authoritative specification for the Veris MVP.  
> Cursor and CI must not modify, delete, or refactor anything outside this file.  
> If implementation and this file diverge, this file prevails.

---

## 1. Purpose
Demonstrate Veris as a **trust tool** that records and verifies the moment work is complete.  
This MVP validates user comprehension, closure confidence, and technical determinism.

Goals:
- Replace informal sign-off rituals with verifiable closure.  
- Present human-readable and cryptographically verifiable records.  
- Achieve psychological trust through design clarity.

---

## 2. Scope

**In-scope**
- Core flow: Close Delivery → Record Closure → Check Delivery.  
- Routes: `/`, `/close`, `/check`, `/billing`.  
- Unified layout, spacing, and accessibility.  
- Optional Summary/JSON toggle in record view.  
- Public prototype framing.

**Out-of-scope**
- Paid tiers, multi-user access, external integrations.  
- Brand identity or logo systems.

---

## 3. Homepage (`/`)

### Layout
- Add framing sentence above hero:  
  > “When work is done, Veris records the moment of completion.”
- H1: **Verifiable Delivery Records**  
- Subtext: “A verifiable record when work is complete.”  
- CTAs: **Close Delivery** (primary), **Check Delivery** (secondary).  
- Three-step explainer:  
  1. **Close Delivery** — Upload file to create a record.  
  2. **Record Closure** — Immutable ULID + timestamp.  
  3. **Check Delivery** — Verify anytime, publicly.  

### Footer
> **About this MVP**  
> Veris is a public proof-of-concept that demonstrates verifiable closure of digital deliveries.  
> Records here are temporary and may be purged. Checking deliveries is free and public.

### Layout metrics
- Max width 960 px.  
- Spacing:  
  - 24 px below hero sentence  
  - 12 px between headline and subtext  
  - 16 px between subtext and buttons  
- Contrast ≥ 4.5:1.  
- Background gradient `#0e1726 → #101828`.  

---

## 4. Sub-pages

### `/close`
- Title: **Close Delivery**  
- Subtext: “Files are hashed locally. No content leaves your browser.”  
- Card layout: file input + “Close Delivery” button inside same container.  
- After success:  
  - Fade-in banner: **“✅ Delivery Closed — record created at [timestamp].”**  
  - Below banner: dual-view component  
    - **Summary View** (default): displays key fields (ID, issuer, issued_at, status).  
    - **JSON View**: raw canonical record under disclosure element.  
  - Banner auto-dismisses after 4 s.  
- Add spinner or progress bar during hashing.  

### `/check`
- Title: **Check Delivery**  
- Three input options:
  1. Upload file + record.json  
  2. Paste record.json  
  3. Record ID lookup  
- CTA button label: **Check Delivery** (not “Verify”).  
- Button centering rule: identical styling and alignment as `/close` (`flex items-center justify-center h-11 px-6 text-base font-medium leading-none` with no inner padding or margin overrides).  
- CI lint must confirm visual centering of the main button text.  
- On success:  
  - Green card: “✅ Delivery confirmed — file matches record.”  
  - Show summary above JSON.  
- On failure:  
  - Red card: “⚠️ Record mismatch” + error list.  
- All status announcements use `aria-live="assertive"`.  

### `/billing`
- Title: **Prototype Billing Screen**  
- Text: “Billing is disabled in this MVP. Pricing shown for demonstration only.”  
- One centered card: **Example Plan — $9 / month**.  
- Card color neutral gray (#1E293B border).  
- Remove unimplemented features (PDF, support, etc.).  
- “Coming Soon” label muted gray.

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

`status` fixed to `"closed"`.  
Signature covers `sha256 + issued_at + issuer`.

---

## 6. Design Consistency

### Layout Shell
- Shared `/web/Layout.tsx`: header, “Test Mode” badge, optional banner  
  “Public prototype — for evaluation only.”  
- Container: `max-w-5xl mx-auto px-4 py-12`.  
- Nav spacing +8 px vertical padding.

### Typography
| Element | Size | Weight | Color |
|----------|------|--------|--------|
| Hero heading | 48 px | 700 | #F9FAFB |
| Section heading | 32 px | 600 | #E5E7EB |
| Body | 18 px | 400 | #CBD5E1 |
| Accent | — | — | #00B67A |
| Card bg | — | — | #162133 |

### Spacing
- Top padding = 120 px after header.  
- Section gap = 64 px.  
- Footer padding = 48 px.

### Buttons
```tsx
<Button className="flex items-center justify-center h-11 px-6 text-base font-medium leading-none">
  Close Delivery
</Button>
```
- Centered text (flex alignment).  
- `h-11` height, `leading-none`.  
- Hover accent brightens 10 %.  
- Focus ring visible and accessible.  
- `/check` button must visually match this centering exactly.

### Cards
- Background: #162133  
- Border: 1 px solid #1E293B  
- Radius: 0.75 rem  
- Shadow: `shadow-md`  
- Body text line-height 1.6  

### Mobile
- Collapse 3-step explainer vertically below 768 px.  
- Increase card radius and padding.  

---

## 7. Copy Rules
- Use “record,” “delivery record,” “close delivery,” “check delivery.”  
- Forbid: *secure, trusted by, professionals, clients, protect, join.*  
- Factual, neutral tone.  
- Replace all `proof_id` → `record_id` in code and placeholders.  

---

## 8. Backend Contracts
- `POST /api/close` — create record per schema.  
- `POST /api/check` — verify record; returns:
```json
{ "valid": true, "errors": [], "fields": { ...record } }
```
- Registry append-only.  
- Persistence: S3 + Arweave.  
- Free verification; issuance may become paid later.  

---

## 9. CI / CD

**Workflows**
1. `e2e.yml` — Close→Record→Check flow ≥99% success.  
2. `web_quality.yml` — Lighthouse + pa11y audits for `/`, `/close`, `/check`, `/billing`.  
3. `content_guard.yml` — enforce copy, schema fields, button classes, forbidden words.  
4. `release_gate.yml` — deploy only after three consecutive green runs.

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

CI fails on violations.  
Lint enforces `.flex.items-center.justify-center.h-11` on buttons and presence of Summary/JSON toggle.

---

## 10. Interaction Feedback
- Add fade-in (150 ms) for success/error cards.  
- Progress indicator during hashing.  
- Success toast: *“Record created — view below.”*  
- Keyboard focus returns to top of card on completion.

---

## 11. Pilot Metrics
| Metric | Target | Purpose |
|--------|---------|----------|
| Time to first checked delivery | < 30 s | speed parity with email handoff |
| Comprehension (“record of closure”) | ≥ 80 % | clarity validation |
| Verify API success | ≥ 99 % | system reliability |
| Unique records created | ≥ 100 | traction indicator |

---

## 12. Governance
- MVP is a **public prototype**; not a production product.  
- Doctrine files remain archived and immutable.  
- Steward approval required for schema or textual change.  
- CI blocks modifications outside `mvp.md`.

---

**Summary**  
Veris MVP v1.6 implements the field‑tested **proof of closure** concept with corrected button alignment and refined UX.  
Users close and check deliveries through a deterministic, human‑readable record.  
UI, schema, and CI enforce clarity, consistency, and accessibility.  
This document is the single executable truth for Cursor and CI.
