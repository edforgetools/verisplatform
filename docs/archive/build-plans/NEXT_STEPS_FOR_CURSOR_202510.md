# CURSOR: FINAL FIXES & DEPLOYMENT

Cursor has completed the implementation but there are a few remaining issues to fix before deployment.

---

## 🔴 CRITICAL: BUILD ERROR TO FIX

**File:** `/frontend/src/lib/ab-test.ts`
**Error:** `Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'`
**Cause:** Next.js 15 changed `cookies()` to return a Promise

### Fix Required:
```typescript
// Change line 3-4 from:
export function getHeadlineVariant(): "a" | "b" {
  const cookieStore = cookies();

// To:
export async function getHeadlineVariant(): Promise<"a" | "b"> {
  const cookieStore = await cookies();
```

Then update any callers of `getHeadlineVariant()` to await it.

---

## 🟡 LINT WARNINGS TO FIX (Optional but Recommended)

### 1. `/frontend/src/lib/signoff-state-machine.ts`
- Remove unused `z` import on line 1
- Replace `any` types with proper Supabase types:
  - Line 26: `db: any` → `db: SupabaseClient`
  - Line 45, 68, 80: Replace `Record<string, any>` with proper types

### 2. `/frontend/src/app/api/proof/accept/route.ts`
- Line 23: Remove unused `acceptance_confirmed` variable or prefix with `_`

### 3. `/frontend/src/app/signoff/[id]/page.tsx`
- Line 12: Replace `any` with proper Proof type
- Line 18: Add `fetchProof` to useEffect dependency array or wrap in useCallback
- Lines 26, 47, 66: Prefix unused error variables with `_err`

### 4. `/frontend/src/components/SignOffModal.tsx`
- Line 16: Prefix unused `proofId` with `_proofId` or remove

### 5. `/frontend/src/app/api/proof/[id]/export/route.ts`
- Lines 66, 119, 186: Replace `any` types with proper types

### 6. `/frontend/src/lib/template-renderer.ts`
- Lines 7, 25: Replace `any` with `Record<string, unknown>` or specific type

### 7. `/frontend/src/lib/ab-test.ts`
- Line 44: Replace `Record<string, any>` with `Record<string, unknown>`

### 8. `/frontend/src/lib/usage-telemetry.ts`
- Lines 453, 457: Replace `any` with proper types

---

## 📋 DATABASE MIGRATION INSTRUCTIONS

The migration file exists at `/supabase/migrations/20250129_signoff_flow.sql` but needs to be applied.

### Option 1: Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard/project/fxdzaspfxwvihrbxgjyh/sql
2. Click **New Query**
3. Copy entire contents from `/supabase/migrations/20250129_signoff_flow.sql`
4. Paste into SQL editor
5. Click **Run**
6. Verify success message

### Option 2: Supabase CLI
```bash
# Ensure you're linked to the project
pnpm supabase link --project-ref fxdzaspfxwvihrbxgjyh

# Apply the specific migration
pnpm supabase db push
```

### After Migration: Regenerate Types
```bash
pnpm supabase gen types typescript --project-id fxdzaspfxwvihrbxgjyh > frontend/src/lib/db-types.ts
```

---

## ✅ POST-FIX VERIFICATION

After fixing the build error and applying migration:

```bash
# 1. Build should succeed
pnpm build

# 2. Dev server should start
pnpm dev

# 3. TypeScript should be happy
pnpm tsc --noEmit

# 4. Tests should pass (after migration applied)
pnpm test:e2e
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [x] All code implemented
- [ ] Fix `ab-test.ts` async/await issue (CRITICAL)
- [ ] Apply database migration (CRITICAL)
- [ ] Regenerate TypeScript types (CRITICAL)
- [ ] Fix lint warnings (optional)
- [ ] Build succeeds locally
- [ ] Tests pass locally

### Deployment
- [ ] Push code to main branch
- [ ] Verify Vercel deployment succeeds
- [ ] Test sign-off flow in production
- [ ] Verify evidence export works

### Post-Deployment
- [ ] Configure email service (Resend/SendGrid)
- [ ] Set up A/B test tracking (PostHog)
- [ ] Monitor telemetry for sign-off events
- [ ] Update user documentation

---

## 🎯 WHAT'S BEEN DELIVERED

### 21 New Files Created
- Evidence pack schema & types
- Payment processor mapping templates (Stripe, PayPal, generic)
- Sign-off state machine
- 4 new API endpoints (issue, send, accept, decline)
- PDF receipt generator
- ZIP evidence exporter
- Template renderer
- Sign-off modal & pages
- A/B test utilities
- E2E tests

### 10 Files Modified
- Homepage with new copy & A/B variants
- Footer simplified
- Verify API with C2PA graceful degradation
- Usage telemetry with new events
- Build configuration

### New Features
1. **Portable Proof Receipts** - JSON + PDF export
2. **Sign-Off State Machine** - 7 states with audit trail
3. **Evidence Pack Export** - ZIP with all dispute-ready files
4. **Payment Processor Mappings** - Pre-formatted for Stripe/PayPal
5. **Updated Messaging** - Reflects real user pain points
6. **Objection Handling** - Chargebacks, metadata, legal clarity

---

## 🐛 KNOWN LIMITATIONS

1. **Email sending not configured** - `/api/proof/send` creates link but doesn't send email
2. **A/B testing not instrumented** - Need PostHog or similar
3. **C2PA extraction not implemented** - Graceful degradation in place (optional)

---

## 📝 QUICK FIX SCRIPT

Here's the critical fix you need to make:

**File:** `/frontend/src/lib/ab-test.ts`

Find:
```typescript
export function getHeadlineVariant(): "a" | "b" {
  const cookieStore = cookies();
```

Replace with:
```typescript
export async function getHeadlineVariant(): Promise<"a" | "b"> {
  const cookieStore = await cookies();
```

That's the only blocking issue preventing build success!

---

## 💡 SUMMARY FOR CURSOR

**Status:** Implementation 98% complete
**Blocking Issues:** 1 TypeScript error (5-minute fix)
**Migration:** SQL ready, needs manual application
**Deployment:** Ready after fix + migration

Tell Cursor to:
1. Fix the async/await issue in `ab-test.ts`
2. Optionally clean up lint warnings
3. Verify build succeeds
4. You'll manually apply the DB migration via Supabase dashboard

Then you're ready to deploy! 🚀
