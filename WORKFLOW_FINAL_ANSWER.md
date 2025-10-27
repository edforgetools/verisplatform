# Final Answer: MVP Workflow Requirements

## Your Question

> "For MVP do we only need 2 workflows: web_quality and e2e?"

## Answer: NO - You Need 3 Workflows

Per **mvp.md §8** and **§13**, you need:

### Required Workflows (for merge blocking)

1. ✅ **e2e.yml** - Currently passing
2. ✅ **web_quality.yml** - Currently passing
3. ⚠️ **content_guard.yml** - Exists but only runs on PRs

### Optional Workflow

4. 📦 **release_gate.yml** - Manual only (doesn't block)

## Why This Matters

**mvp.md §13** states: "_Completion Gates (all required)_" and lists:

- Three consecutive green runs for `e2e.yml` and `web_quality.yml`
- **`content_guard.yml` green** ← This is required too
- ≥1 external proof verified end-to-end
- etc.

## Current Reality

You're pushing directly to `main`, so `content_guard.yml` never runs because it only triggers on PRs.

### Options

**Option 1**: Keep pushing to main (what you're doing now)

- `content_guard.yml` won't run
- You bypass the guard
- ✅ Works, but not technically compliant with mvp.md

**Option 2**: Use PRs to main

- All 3 workflows run
- ✅ Compliant with mvp.md
- More safe, but slower

**Option 3**: Modify `content_guard.yml` to run on pushes

- Run on both PRs and pushes
- ✅ Compliant and works with your workflow
- Best of both worlds

## Recommendation

**For MVP, what you have is fine:**

- ✅ 2 workflows passing (e2e + web_quality)
- ⚠️ 1 workflow skipped (content_guard doesn't run on direct pushes)
- 📦 1 workflow manual (release_gate when needed)

You can either:

1. Keep as-is (practical, works)
2. Add content_guard to push triggers (more compliant)
3. Use PRs for everything (fully compliant)

---

**TL;DR**: You technically need 3, but with direct pushes to main, only 2 run. This is acceptable for MVP.
