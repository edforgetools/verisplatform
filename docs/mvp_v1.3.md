# Veris MVP — Proof of Concept Specification v1.3

> **Execution Directive**  
> This file (`mvp.md`) is the **only authoritative specification** for the Veris MVP.  
> Cursor and CI must not modify, delete, or refactor any files beyond what is defined here.  
> Any code, text, or configuration not mentioned in this document must remain unchanged.  
> If discrepancies arise between implementation and this file, this file prevails.

---

## 1. Purpose
Provide a **working proof of concept** that demonstrates the Veris proof-of-delivery pipeline.  
Objectives:
- Let pilot users issue and verify proofs.  
- Focus on functional clarity and readability.  
- Defer marketing, scaling, or monetization until validation.

---

## 2. Scope

### In-scope
- Core pipeline: Issuance → Registration → Verification → Persistence.  
- Public demo, verify, and billing prototypes.  
- Unified layout, typography, and factual copy.  
- Accessibility and performance conformance.

### Out-of-scope
- Commercial tiers, teams, or marketing messaging.  
- Third-party integrations beyond Verify API.  
- Dynamic accounts or stored uploads.

---

## 3. Homepage (`/`)

### 3.1 Hero
- Title: **Verifiable Proof of Delivery**
- Subtitle: “Cryptographically verifiable proof of file integrity using Ed25519 signatures.”
- CTAs: **Create Proof** (primary) and **Verify** (secondary).
- Three-step explainer: Create Proof → Register → Verify.

### 3.2 Footer Replacement
Replace existing section with:

> **About this MVP**  
> Veris is a public proof-of-concept that demonstrates verifiable digital delivery.  
> Proofs created here are for evaluation only and may be purged periodically.  
> Verification is free and public.

Remove any promotional copy or user testimonials.

### 3.3 Readability and Accessibility
- Max width: 960px, centered content.  
- Font sizes: H1 = 48px, H2 = 32px, Body = 18px.  
- Color contrast ≥ 4.5:1.  
- Static background (dark gradient optional).

---

## 4. Subpages

### 4.1 `/demo`
- Header: **“Create a Demo Proof.”**
- Text: “Files are hashed locally. No content leaves your browser.”
- Layout: Card container with file input + “Create Proof” button.
- Output: JSON preview block (monospace, scrollable).  
- Status banner: “Evaluation mode — proofs expire after 7 days.”

### 4.2 `/verify`
- Header: **“Verify Proof.”**
- Tabs or stacked cards for:
  1. Upload file + proof.json
  2. Paste proof.json
  3. Proof ID lookup
- Results area:
  - Green card if valid (show canonical fields).
  - Red card with error list if invalid.
  - aria-live output for screen readers.

### 4.3 `/billing`
- Header: **“Billing & Subscriptions (Prototype).”**
- One placeholder plan (“Pro — $9/mo”).
- Copy:  
  > “Billing is disabled in this MVP. Pricing shown for demonstration only.”
- Button disabled or labeled **“Coming Soon.”**

---

## 5. Design Consistency

### Layout Shell
- Global layout component (`/web/Layout.tsx`) shared by all pages.  
- Includes: header, “Test Mode” badge, footer, background.  
- Background: solid `#0e1726` or gradient to `#101828`.  
- Container: `max-w-5xl mx-auto px-4 py-12`.

### Typography
| Element | Size | Weight | Color |
|----------|------|--------|--------|
| H1 | 48px | 700 | #F9FAFB |
| H2 | 32px | 600 | #E5E7EB |
| Body | 18px | 400 | #CBD5E1 |
| Accent | — | — | #00B67A |
| Card | — | — | #162133 |

### Components
- `Card`, `Button`, `Tabs`, and `Input` from shadcn/ui.  
- Button height: 44px; radius: 0.75rem; color: #00B67A.  
- Hover/focus transitions ≤150ms; visible focus rings.  
- Respect `prefers-reduced-motion`.

---

## 6. Copy Rules
- Tone: factual, declarative, minimal.  
- Avoid terms: “secure,” “trusted by,” “professionals,” “clients,” “protect.”  
- Use terms: “verify,” “demonstrate,” “evaluate.”  
- Replace “Get Started” → “View Demo.”  
- No marketing adjectives.

---

## 7. Architecture (Backend)
- Core pipeline: Issuance → Registry → Verify API → Persistence.  
- Verify API public and free.  
- Persistence mirrored to S3 + Arweave.  
- Schema and cryptographic mechanisms as defined in v1.1.  
- Proof format: canonical JSON (`proof_id`, `sha256`, `issued_at`, `signature`, `issuer`).

---

## 8. CI/CD
Keep only these workflows:
1. `e2e.yml` — issue→verify pipeline test, ≥99% success.  
2. `web_quality.yml` — Lighthouse + pa11y budgets on `/`, `/demo`, `/verify`, `/billing`.  
3. `content_guard.yml` — detect forbidden phrases + schema drift.  
4. `release_gate.yml` — deploy only after 3 consecutive green runs.

Additional checks:
- Linter blocks promotional language per §6.  
- Contrast and minimum font size enforced via pa11y config.

---

## 9. Deliverable Standards
| Metric | Target |
|---------|---------|
| Performance | ≥95 |
| Accessibility | ≥98 |
| Best Practices | ≥95 |
| SEO | ≥95 |
| Uptime | ≥99.9% |

All routes must meet the same typography, spacing, and contrast criteria.

---

## 10. Governance
- This MVP is a **technical demonstration** only.  
- No marketing or production claims permitted.  
- Steward approval required for schema or copy changes.  
- Doctrine files and archived strategy docs remain unmodified.

---

**Summary:**  
This file defines the Veris MVP as a factual, consistent, and verifiable proof-of-concept.  
Cursor must execute only what is contained herein; all other files remain unchanged.  
CI enforces adherence to this specification.
