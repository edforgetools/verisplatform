# MVP Workflow Requirements per mvp.md

## Required Workflows (per mvp.md §8 & §13)

### 1. ✅ e2e.yml — Vertical Slice Gate

- **Triggers**: PR to `main`, push to `main`
- **Status**: Currently passing
- **Purpose**: Test issue → register → verify flow
- **Branch protection**: Required

### 2. ✅ web_quality.yml — A11y + Lighthouse + Core Web Vitals

- **Triggers**: PR to `main`, push to `main`
- **Status**: Currently passing
- **Purpose**: Accessibility, performance, SEO
- **Branch protection**: Required

### 3. ⚠️ content_guard.yml — Copy Drift + Schema + Headers

- **Triggers**: PR to `main` (only)
- **Status**: Need to check if it exists
- **Purpose**:
  - Ensure homepage contains "Verifiable Proof of Delivery"
  - Reject strategy docs outside `mvp.md`
  - Validate `schema/proof.schema.json` compatibility
  - Compare runtime headers to golden snapshot
- **Branch protection**: Required

### 4. 📦 release_gate.yml — Safe Ship

- **Triggers**: Manual `workflow_dispatch`
- **Purpose**: Final release validation
- **Not blocking**: Only runs on demand

## Current Status

You currently have 4 workflows:

1. ✅ `e2e.yml` - Passing
2. ✅ `web_quality.yml` - Passing
3. ⚠️ `content_guard.yml` - Need to check
4. 📦 `release_gate.yml` - Manual only

## Answer to Your Question

**For MVP, you need 3 workflows, not 2:**

1. ✅ `e2e.yml` (already passing)
2. ✅ `web_quality.yml` (already passing)
3. ⚠️ `content_guard.yml` (need to implement)

The `content_guard.yml` is important because it ensures:

- Your homepage text is correct
- No extra docs files are added
- Schema stays compatible
- Security headers are correct

You should either:

1. Implement `content_guard.yml` as per mvp.md
2. Or disable it if it's causing issues (out of scope)

---

_According to mvp.md §13: "Completion Gates (all required)" - this includes content_guard.yml_
