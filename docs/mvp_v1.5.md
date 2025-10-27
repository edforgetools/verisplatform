# Veris MVP — Proof of Closure Specification v1.5

> **Execution Directive**  
> This file (`mvp.md`) is the **only authoritative specification** for the Veris MVP.  
> Cursor and CI must not modify, delete, or refactor anything beyond the scope of this file.  
> Any implementation drift must be corrected to match this document.  
> If code and this file conflict, **this file prevails**.

---

## 1. Purpose
Deliver a pilot‑ready **proof of closure** system that demonstrates Veris’s ability to create and verify immutable delivery records.  
The MVP exists to validate end‑to‑end flow, user comprehension, and technical integrity.

Goals:
- Replace informal “handoff” confirmations with deterministic, verifiable closure events.  
- Let users **Close Delivery** and **Check Delivery** through a minimal, consistent interface.  
- Maintain factual, readable, and accessible presentation.

---

## 2. Scope
**In‑scope**
- Core lifecycle: Issuance → Registration → Verification → Persistence.  
- Routes: `/`, `/close`, `/check`, `/billing`.  
- Unified layout, typography, factual copy, accessibility.  
- Expanded schema with `approved_by`, `acknowledged_at`, and `status`.  
- CI enforcement of design and content budgets.

**Out‑of‑scope**
- Marketing, testimonials, multi‑user management, production billing.

---

## 3. Homepage (`/`)

### Structure
- H1: **Verifiable Delivery Records**  
- Subtext: “Cryptographically verifiable closure for digital handoffs.”  
- CTAs: **Close Delivery** (primary) and **Check Delivery** (secondary).  
- Three‑step explainer: *Close Delivery → Record Closure → Check Delivery.*

### Footer
> **About this MVP**  
> Veris is a public proof‑of‑concept that demonstrates verifiable closure of digital deliveries.  
> Records created here are for evaluation only and may be purged periodically.  
> Checking deliveries is free and public.

### Layout
- Max width 960 px, centered.  
- H1 = 48 px, H2 = 32 px, body = 18 px.  
- Contrast ≥ 4.5:1.  
- Background `#0e1726 → #101828`.  
- +48 px bottom padding for balance.

---

## 4. Sub‑pages

### `/close` (formerly `/demo`)
- Title: **Close Delivery**  
- Subtext: “Files are hashed locally. No content leaves your browser.”  
- Layout: Card with file input + “Close Delivery” button.  
- Output: JSON preview labeled **Delivery Record**.  
- Banner: “Evaluation mode — records expire after 7 days.”  
- Top padding 120 px for alignment.

### `/check` (formerly `/verify`)
- Title: **Check Delivery**  
- Tabs/cards for:
  1. Upload file + record.json  
  2. Paste record.json  
  3. Record ID lookup  
- Results:
  - ✅ Green card: “Delivery confirmed — file matches record.”  
  - ❌ Red card: error list.  
  - aria‑live region for accessibility.  
- Top padding 120 px; font sizes same as homepage.

### `/billing`
- Title: **Billing & Subscriptions (Prototype)**  
- Text: “Billing is disabled in this MVP. Pricing shown for demonstration only.”  
- One placeholder plan (“Pro — $9/mo”) with **Coming Soon** button.  
- Use identical card and spacing pattern as other pages.

---

## 5. Proof Schema (Canonical)

```json
{
  "proof_id": "ulid",
  "sha256": "hex",
  "issued_at": "RFC3339",
  "issuer": "did:web or domain",
  "signature": "ed25519:base64",
  "approved_by": "string",
  "acknowledged_at": "RFC3339",
  "status": "closed"
}
```

Deterministic signature covers `sha256 + issued_at + issuer`.  
`status` is fixed to `"closed"` for all issued proofs in MVP.

---

## 6. Design Consistency

### Layout Shell
- Shared `/web/Layout.tsx` for header, “Test Mode” badge, and footer.  
- Optional banner: “Public prototype — for evaluation only.”  
- Container: `max-w-5xl mx-auto px-4 py-12`.

### Typography
| Element | Size | Weight | Color |
|----------|------|--------|--------|
| H1 | 48 px | 700 | #F9FAFB |
| H2 | 32 px | 600 | #E5E7EB |
| Body | 18 px | 400 | #CBD5E1 |
| Accent | — | — | #00B67A |
| Card | — | — | #162133 |

### Spacing
- Top padding after header = 120 px.  
- Section spacing = 64 px.  
- Footer padding = 48 px.

### Buttons
Vertically center all button text:
```tsx
<Button className="flex items-center justify-center h-11 px-6 text-base font-medium leading-none">
  Close Delivery
</Button>
```
- `flex items-center justify-center` centers label text.  
- `h-11` sets fixed 44 px height.  
- `leading-none` removes baseline offset.  
- Hover = accent brightens 10 %.  
- Visible focus ring.

### Cards
- Background: #162133  
- Border: 1 px solid #1E293B  
- Radius: 0.75 rem  
- Shadow: `shadow-md`

---

## 7. Copy Rules
- Replace all “Proof” terminology with “Delivery Record.”  
- Use “Close Delivery,” “Check Delivery,” “Delivery confirmed.”  
- Forbid terms: *secure, trusted by, professionals, clients, protect, join.*  
- Tone: factual, declarative.  
- Refer to Veris as a *tool*, not a *platform.*

---

## 8. Backend Contracts
- Issuance creates deterministic record with schema in §5.  
- Registry append‑only, immutable.  
- Verify API (`POST /api/check`) validates record and returns:
```json
{ "valid": true, "errors": [], "fields": { ...record } }
```
- Persistence mirrored to S3 + Arweave.  
- Verification free; issuance may become paid later.

---

## 9. CI / CD

**Workflows:**
1. `e2e.yml` — Close→Record→Check flow, ≥99% success.  
2. `web_quality.yml` — Lighthouse + pa11y audits on `/`, `/close`, `/check`, `/billing`.  
3. `content_guard.yml` — enforce copy rules and schema fields.  
4. `release_gate.yml` — deploy only after three consecutive green runs.

**Budgets:**
| Metric | Target |
|---------|---------|
| LCP | ≤1.8 s |
| CLS | ≤0.1 |
| INP | ≤200 ms |
| Perf | ≥95 |
| A11y | ≥98 |
| Best Practices | ≥95 |
| SEO | ≥95 |

CI fails on any violation.  
Lint forbids banned words and ensures `.flex.items-center.justify-center.h-11` in all buttons.

---

## 10. Pilot Metrics
| Metric | Target | Purpose |
|--------|---------|----------|
| Time to first checked delivery | < 30 s | match email‑like speed |
| Comprehension of “record of closure” | ≥ 80 % | verify user clarity |
| Verify API success | ≥ 99 % | backend reliability |
| Unique records created | ≥ 100 | pilot traction |

---

## 11. Governance
- MVP is a **public prototype**; not a production product.  
- Doctrine files remain archived and immutable.  
- Steward approval required for schema or copy edits.  
- CI blocks unapproved changes outside `mvp.md`.

---

**Summary:**  
Veris MVP v1.5 implements the field‑tested **proof of closure** concept.  
Users close and check deliveries through a deterministic, human‑readable record.  
UI, schema, and CI enforce clarity, consistency, and accessibility.  
This document is the single executable truth for Cursor and CI.
