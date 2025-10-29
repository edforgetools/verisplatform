# MVP v1.8 Audit Report — Deviations Documented

**Audit Date**: 2025-01-27  
**Baseline Spec**: `docs/mvp_v1.8.md`  
**Status**: Deviations identified, fixes pending

---

## Summary

This document catalogs all deviations between the current implementation and the MVP v1.8 specification.

---

## 1. ROUTE SCOPE DEVIATIONS

### 1.1 Extra Routes (Out of Scope)

**Spec**: Only `/`, `/close`, `/check`, `/billing` are in-scope  
**Current**: Multiple additional routes exist:

❌ **`/demo`** — Explicitly out of scope (Section 2: "Out-of-scope: Marketing, multi-user features")  
❌ **`/docs`** — Out of scope  
❌ **`/docs/api`** — Out of scope  
❌ **`/docs/phase-1`** — Out of scope  
❌ **`/docs/sdk`** — Out of scope  
❌ **`/proof/[id]`** — Out of scope (not in core flow)  
❌ **`/docs/api`** — Should be removed per spec

**Impact**: Mismatch with spec Section 2: "Routes: `/`, `/close`, `/check`, `/billing`."

---

## 2. LAYOUT & SPACING DEVIATIONS

### 2.1 Top Bar Content

**Spec** (Section 4.1): Links should be "Close · Check · Billing"  
**Current** (`Layout.tsx:61-82`): Uses "Close", "Check", "Billing" (missing middle dots)

**Deviation**: Missing separator characters between navigation links.

---

### 2.2 Homepage Spacing (Minor)

**Spec** (Section 5.1): Hero block should be `mt-24` (96px) from Top Bar  
**Current** (`page.tsx:12`): Uses `marginTop: "96px"` ✅

**Status**: Correct implementation.

---

### 2.3 CTAs Alignment

**Spec** (Section 4.4): Buttons must be centered with identical classes  
**Current**: Primary CTA uses correct classes (`flex items-center justify-center h-10 md:h-11 px-5 md:px-6 text-base font-medium leading-none`) ✅

---

## 3. CONTENT & COPY DEVIATIONS

### 3.1 Homepage Hero

**Spec** (Section 5.1): Subtext should be "A verifiable record when work is complete."  
**Current** (`page.tsx:44`): Matches specification ✅

---

### 3.2 Micro FAQ Content

**Spec** (Section 5.3): Max 3 items, ≤100 words total  
**Current** (`page.tsx:192-239`):

- ✅ 3 FAQ items present
- ✅ Content matches spec exactly
- ✅ All questions and answers match spec verbatim

---

### 3.3 Check Page Subtext

**Spec** (Section 7): "Verify file integrity using file, record ID, or record.json."  
**Current** (`check/page.tsx:100`): Matches specification ✅

---

## 4. INTERACTIVE COMPONENT DEVIATIONS

### 4.1 Close Page: Success Banner

**Spec** (Section 6): "✅ Delivery Closed — record created at [timestamp]."  
**Current** (`close/page.tsx:110`): "✅ Delivery Closed — record created at {new Date().toLocaleString()}." ✅

**Status**: Correct implementation.

---

### 4.2 Check Page: aria-live

**Spec** (Section 7): `aria-live="assertive"` on result region  
**Current** (`check/page.tsx:236`): Present and correct ✅

---

### 4.3 Summary/JSON Toggle

**Spec** (Section 6): Summary shows `record_id`, `issuer`, `issued_at`, `status`  
**Current** (`close/page.tsx:180-199`): Shows exactly these fields ✅

---

## 5. CI/CD DEVIATIONS

### 5.1 Missing Viewport Tests

**Spec** (Section 11): Visual test renders each route at **1280×900** and asserts **no vertical scrollbar**  
**Current**: No viewport tests found in workflows

**Deviation**: Missing critical non-scroll enforcement.

---

### 5.2 Content Guard Checks

**Spec** (Section 11): content_guard.yml should "enforce copy, schema, button centering, banned words"  
**Current** (`.github/workflows/content_guard.yml:18-25`): Only checks for strategy docs and schema validation

**Missing Checks**:

- ❌ Copy enforcement against spec
- ❌ Button centering validation
- ❌ Banned words detection ("secure", "trusted by", "professionals", etc.)

---

### 5.3 Lighthouse Budgets

**Spec** (Section 11): "Perf ≥95 · A11y ≥98 · BP ≥95 · SEO ≥95"  
**Current** (`web_quality.yml:69-75`): Budgets mentioned but not enforced with assertions

**Deviation**: No automated assertions for Lighthouse scores.

---

## 6. API ENDPOINT DEVIATIONS

### 6.1 Extra API Routes

**Current**: Multiple API routes beyond spec:

- ❌ `/api/billing/history`
- ❌ `/api/billing/metrics`
- ❌ `/api/db-health`
- ❌ `/api/health`
- ❌ `/api/proof/[id]`
- ❌ `/api/proof/create`
- ❌ `/api/proof/[id]/certificate`
- ❌ `/api/registry/[id]`
- ❌ `/api/registry/search`
- ❌ `/api/stripe/*`
- ❌ `/api/verify`

**Spec** (Section 10): Only `/api/close` and `/api/check` are in scope

**Impact**: Significant deviation from scope.

---

## 7. COLOR & TYPOGRAPHY COMPLIANCE

### 7.1 Background Gradient

**Spec** (Section 4.3): Background: `#0e1726 → #101828`  
**Current** (`Layout.tsx:11`): ✅ Correct

---

### 7.2 Card Colors

**Spec**: Card: `#162133`, border `#1E293B`  
**Current**: ✅ Correct across all pages

---

### 7.3 Type Sizes

**Spec**: H1 48 px, H2 28–32 px, body 18 px  
**Current**:

- Homepage H1: ✅ 48px (`page.tsx:27`)
- Close/Check H1: ✅ 48px
- Body: ✅ 18px throughout

---

## 8. HEIGHT BUDGET COMPLIANCE

### 8.1 Homepage Height Budget

**Spec** (Section 5.4): Total height ≈ 804 px including:

- Top Bar 64 px
- Hero 280 px
- Steps 200 px
- About+FAQ 220 px
- Footer 40 px

**Current**: Implementation appears within budget, but:

- ❌ No automated visual tests to verify ≤900px viewport
- ❌ No assertion that page fits in 1280×900

**Deviation**: Cannot verify compliance without automated tests.

---

### 8.2 Other Pages

**Spec**: `/close`, `/check`, `/billing` must fit within 900px  
**Current**: No viewport tests to verify

**Deviation**: Cannot verify compliance.

---

## 9. ADDITIONAL DEVIATIONS

### 9.1 Billing Page Title

**Spec** (Section 8): Title "Prototype Billing Screen"  
**Current** (`billing/page.tsx:14`): ✅ Matches

---

### 9.2 Billing Page Subtext

**Spec**: "Future pricing example."  
**Current**: ✅ Matches

---

### 9.3 Footer Content

**Spec** (Section 4.2): Single centered line with email only  
**Current** (`Layout.tsx:101`): `support@verisplatform.com` ✅

---

## 10. CRITICAL FINDINGS

### High Priority

1. ❌ **Extra routes exist** (`/demo`, `/docs/*`, `/proof/*`) — violates scope
2. ❌ **Missing viewport tests** — cannot verify non-scroll requirement
3. ❌ **Extra API routes** — violates backend contract scope
4. ❌ **Incomplete content guard** — missing copy/schema/button enforcement

### Medium Priority

5. ⚠️ **Missing navigation dots** in Top Bar (minor)
6. ⚠️ **No Lighthouse score assertions** in CI
7. ⚠️ **Height budgets not verified** automatically

### Low Priority / Correct

8. ✅ Homepage layout matches spec
9. ✅ Content copy matches spec
10. ✅ Colors and typography match spec
11. ✅ Interactive components (banners, toggles) match spec

---

## 11. RECOMMENDED FIXES

### Immediate Actions

1. Remove or disable extra routes (`/demo`, `/docs/*`, `/proof/*`)
2. Add viewport visual regression tests
3. Implement content guard for banned words and copy enforcement
4. Add Lighthouse score assertions to CI
5. Add Top Bar separator dots

### API Cleanup

6. Document which API routes are intentional vs. out-of-scope
7. Ensure `/api/close` and `/api/check` match spec exactly

---

## 12. VERIFICATION METHOD

This audit compared:

- ✅ Spec: `docs/mvp_v1.8.md` (all sections)
- ✅ Implementation: `frontend/src/app/*`
- ✅ Components: `frontend/src/components/Layout.tsx`
- ✅ CI/CD: `.github/workflows/*`

**Next Step**: Implement fixes, then re-audit for compliance.
