# Entitlements System

This module provides server-side entitlement checks for subscription-based features.

## Features

- **`create_proof`**: Creating new proofs (available to all tiers)
- **`generate_certificate`**: Generating PDF certificates (pro/team only)
- **`telemetry_tracking`**: Tracking telemetry events (available to all tiers)
- **`create_checkout`**: Creating Stripe checkout sessions (available to all tiers)

## Usage

### Basic Entitlement Check

```typescript
import { isEntitled } from "@/lib/entitlements";

const canCreateProof = await isEntitled(userId, "create_proof");
if (canCreateProof) {
  // User can create proofs
}
```

### Asserting Entitlements

```typescript
import { assertEntitled } from "@/lib/entitlements";

try {
  await assertEntitled(userId, "generate_certificate");
  // User is entitled, proceed with certificate generation
} catch (error) {
  // User is not entitled, return 403 error
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
}
```

### Getting User Tier

```typescript
import { getUserTier } from "@/lib/entitlements";

const tier = await getUserTier(userId);
// Returns: 'free' | 'pro' | 'team'
```

## Protected Endpoints

The following API endpoints are protected with entitlement checks:

- `POST /api/proof/create` - Requires `create_proof` entitlement
- `GET /api/proof/[id]/certificate` - Requires `generate_certificate` entitlement
- `POST /api/telemetry` - Requires `telemetry_tracking` entitlement (only when userId is provided)
- `POST /api/stripe/create-checkout` - Requires `create_checkout` entitlement

## Tier Configuration

| Feature              | Free | Pro | Team |
| -------------------- | ---- | --- | ---- |
| create_proof         | ✅   | ✅  | ✅   |
| generate_certificate | ❌   | ✅  | ✅   |
| telemetry_tracking   | ✅   | ✅  | ✅   |
| create_checkout      | ✅   | ✅  | ✅   |

## Error Handling

- If a user has no billing record, they default to the free tier
- If a subscription is inactive (not 'active' or 'trialing'), access is denied for paid tiers
- On database errors, access is denied for security
- All entitlement checks are performed server-side using the service-role Supabase client
