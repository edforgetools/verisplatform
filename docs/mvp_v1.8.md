# Veris MVP — Proof of Closure Specification v1.8

> **Execution Directive**  
> This file (`mvp.md`) is the single authoritative specification for the Veris MVP.  
> Cursor and CI must not modify, delete, or refactor anything outside this file.  
> If implementation and this file diverge, this file prevails.

---

## 1. Purpose
Deliver a non‑scroll, single‑viewport MVP that proves verifiable closure with minimal explanation.  
All pages must be readable at a glance and consistent across routes.

---

## 2. Scope

**In‑scope**
- Core flow: Close Delivery → Record Closure → Check Delivery.  
- Routes: `/`, `/close`, `/check`, `/billing`.  
- Unified **Top Bar** (header + banner), compressed spacing, and composite **About+FAQ** card.  
- Summary/JSON toggle for records.  
- Footer with email only.

**Out‑of‑scope**
- Marketing, multi‑user features, external integrations, production billing.

---

## 3. Non‑Scroll Layout Standard

### 3.1 Desktop viewport target
- Design to fit within **≤ 900 px** viewport height at 100% zoom.  
- No vertical scrolling required on `/`, `/close`, `/check`, `/billing` at this height.

### 3.2 Responsive fallback (accessibility)
- If viewport height **< 700 px**, allow vertical scroll.  
- Never clip interactive content; avoid overflow hidden on forms.  
- Maintain min hit target 40×40 px.

### 3.3 Spacing rhythm
- Use an 8‑px scale: **8 / 16 / 24 / 32**.  
- Default body line‑height **1.6**.  
- Eliminate ad‑hoc paddings (previous 120 px top pads removed).

---

## 4. Global UI

### 4.1 Top Bar (merged header + banner)
- Height: **64 px**.  
- Structure: left = brand text “Veris”; center = small caption **“Public prototype — for evaluation only.”**; right = links **Close · Check · Billing**.  
- Divider: `border-b border-[#1E293B]`.  
- Badge “Test Mode” is optional; if present, render inline after caption.

### 4.2 Footer
- Single centered line: `support@verisplatform.com`.  
- Top divider: `border-t border-[#1E293B]`.  
- Padding: `pt-16 pb-8` (adjust with rhythm if needed).

### 4.3 Colors and type
- Background: `#0e1726 → #101828`.  
- Card: `#162133`, border `#1E293B`.  
- Accent: `#00B67A`.  
- H1 48 px, H2 28–32 px, body 18 px.

### 4.4 Buttons (centering rule)
```tsx
<Button className="flex items-center justify-center h-10 md:h-11 px-5 md:px-6 text-base font-medium leading-none">
  Close Delivery
</Button>
```
- Identical on `/close` and `/check`.  
- Hover accent +10%. Focus ring visible.

---

## 5. Homepage (`/`) — No‑scroll Composition

### 5.1 Hero block (compressed)
- Framing sentence: “When work is done, Veris records the moment of completion.” `mt-24` from Top Bar.  
- H1: **Verifiable Delivery Records** (`mt-2`).  
- Subtext: “A verifiable record when work is complete.” (`mt-3`).  
- CTAs row: primary **Close Delivery**, secondary **Check Delivery** (`mt-4`).

### 5.2 Steps row
- Three items in one row. Icon circle 48 px.  
- Spacing: `mt-24` from CTAs, `gap-24` between items.  
- Labels: Close Delivery · Record Closure · Check Delivery.

### 5.3 Composite About+FAQ card
- Single card below steps (`mt-24`).  
- Section title: **About this MVP**. One short paragraph:  
  “Veris is a public proof‑of‑concept that demonstrates verifiable closure of digital deliveries. Records here are temporary and may be purged. Checking deliveries is free and public.”
- Divider inside card, then **Micro FAQ (max 3 items, ≤100 words total):**  
  1) What does Close Delivery do? — Creates a verifiable record of completion.  
  2) Is my file uploaded? — No, only a local hash is stored.  
  3) How long do records last? — Seven days in this public prototype.

### 5.4 Height budget
- Top Bar 64 px + Hero 280 px + Steps 200 px + About+FAQ 220 px + Footer 40 px ≈ **804 px**.  
- CI must confirm no vertical overflow at 900 px viewport height.

---

## 6. `/close` — Non‑scroll Form

- Title: **Close Delivery** (`mt-24`).  
- Text: “Files are hashed locally. No content leaves your browser.” (`mt-2`).  
- Single card contains:
  - File input and **Close Delivery** button on one column with `gap-16`.  
  - After success:
    - Banner: **✅ Delivery Closed — record created at [timestamp].** (fade‑in 150 ms).  
    - **Summary / JSON** toggle. Summary shows `record_id`, `issuer`, `issued_at`, `status`.
- Progress indicator during hashing.  
- Page fits within 900 px height including footer.

---

## 7. `/check` — Non‑scroll Verification

- Title: **Check Delivery** (`mt-24`).  
- Subtext: “Verify file integrity using file, record ID, or record.json.” (`mt-2`).  
- Three input blocks inside one card with **24 px** vertical gaps:  
  1) **Option 1 (Recommended):** Upload file + record.json.  
  2) Paste record.json (placeholder uses `record_id`).  
  3) Record ID lookup.  
- CTA: **Check Delivery** centered under the card (same button class as `/close`).  
- Success: green card “Delivery confirmed — file matches record.” above JSON.  
- Failure: red card with error list.  
- `aria-live="assertive"` on result region.  
- Fits within 900 px including footer.

---

## 8. `/billing` — Non‑scroll Prototype

- Title: **Prototype Billing Screen** (`mt-24`).  
- Context: “Future pricing example.” (`mt-2`, muted).  
- Single centered plan card **Example Plan — $9 / month**; muted “Coming Soon”.  
- Tight vertical padding so the page remains within 900 px.

---

## 9. Canonical Record Schema (unchanged)

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

Signature covers `sha256 + issued_at + issuer`.  
`status` = "closed".

---

## 10. Backend Contracts (unchanged)
- `POST /api/close` → create record.  
- `POST /api/check` → verify record; response: `{ "valid": true, "errors": [], "fields": { ...record } }`.  
- Append‑only registry; persistence to S3 + Arweave.  
- Verification free.

---

## 11. CI / CD

**Workflows**
1. `e2e.yml` — Close→Record→Check ≥99% success.  
2. `web_quality.yml` — Lighthouse + pa11y on all routes.  
3. `content_guard.yml` — enforce copy, schema, button centering, banned words.  
4. `release_gate.yml` — deploy after 3 green runs.

**Additional viewport checks**
- Visual test renders each route at **1280×900** and asserts **no vertical scrollbar**.  
- Also render at **1280×640**; vertical scroll is allowed but content must remain readable and accessible (no clipped controls).

**Budgets**
- LCP ≤ 1.8 s · CLS ≤ 0.1 · INP ≤ 200 ms  
- Lighthouse: Perf ≥95 · A11y ≥98 · BP ≥95 · SEO ≥95

---

## 12. Copy Rules (unchanged)
- Use “record,” “close delivery,” “check delivery.”  
- Forbid: secure, trusted by, professionals, clients, protect, join.  
- Factual tone only.

---

## 13. Governance (unchanged)
- MVP is a **public prototype**; not production.  
- Doctrine files remain archived and immutable.  
- Steward approval required for schema or textual change.  
- CI blocks changes outside this file.

---

**Summary**  
v1.8 compresses the interface into a **single‑viewport, non‑scroll** layout while preserving clarity and accessibility.  
The merged top bar, spacing rhythm, and composite About+FAQ reduce dead space and keep every page fully readable at a glance.
