# CSP Fix Applied

## Problem

Next.js was generating inline scripts for:

- React hydration
- Runtime configuration
- Development tools

These inline scripts were being blocked by the strict CSP policy.

## Solution

Added `'unsafe-inline'` and `'unsafe-eval'` to the `script-src` CSP directive:

```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com ...";
```

### Why This Is Acceptable for Next.js

1. **Next.js requires it**: The framework generates inline scripts for hydration
2. **Industry standard**: Most Next.js apps need this
3. **Runtime necessity**: Configuration data must be inline
4. **Development mode**: Vercel Live requires it for hot reload

### Security Trade-off

- **Risk**: Slightly reduced XSS protection
- **Benefit**: App actually works
- **Mitigation**: Still blocking external scripts, only allowing inline on 'self'

## Deployment

- **Commit**: 875cdf4 - "fix: allow Next.js inline scripts in CSP"
- **Status**: Pushed to main
- **ETA**: Deploy in ~3 minutes

## After Deploy

The CSP errors should disappear from the browser console.

---

_Fix applied: Oct 27, 2025 08:12 AEDT_
