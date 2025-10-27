# Vercel Deployment Fix

## Problem

Vercel was failing because `vercel.json` referenced a non-existent build script: `./build-and-deploy.sh`

## Solution

Updated `vercel.json` to use the correct build command:

```json
"buildCommand": "cd frontend && npm run build"
```

This uses the existing `npm run build` script defined in `frontend/package.json`.

## Fix Applied

- **Commit**: 37da247 - "fix: update vercel.json to use correct build command"
- **Changed**: vercel.json buildCommand
- **Status**: Pushed to main, will trigger new deployment

## Next Steps

1. Wait for GitHub Actions to complete
2. Vercel should auto-deploy after workflows pass
3. Check https://verisplatform.com in ~5 minutes

## What to Check in UI

1. Home page shows "Verifiable Proof of Delivery"
2. Ed25519 algorithm details (collapsible)
3. /demo page has JSON preview
4. /verify accepts paste proof.json
5. Clean, professional design

---

_Fix applied: Oct 27, 2025 08:08 AEDT_
