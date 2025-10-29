# API Reference

## POST /api/proofs/create

Creates a new cryptographic proof for a file.

**Request Body:**

```json
{
  "file": "base64-encoded-file-content",
  "user_id": "user-identifier",
  "metadata": {
    "file_name": "example.txt",
    "project": "project-name"
  }
}
```

**Response:**

```json
{
  "success": true,
  "proof_id": "proof-hash",
  "proof_url": "/proof/proof-hash",
  "created_at": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses:**

- `400` - Invalid request body or missing required fields
- `401` - Authentication required
- `429` - Rate limit exceeded

## GET /api/verify

Verifies a cryptographic proof.

**Query Parameters:**

- `hash` - The proof hash to verify

**Response:**

```json
{
  "valid": true,
  "signer": "signer-fingerprint",
  "issued_at": "2024-01-01T12:00:00.000Z",
  "latency_ms": 150,
  "errors": []
}
```

**Error Responses:**

- `400` - Missing hash parameter
- `404` - Proof not found
- `429` - Rate limit exceeded

## POST /api/stripe/webhook

Handles Stripe webhook events for billing and subscription management.

**Headers:**

- `stripe-signature` - Stripe webhook signature for verification

**Supported Events:**

- `checkout.session.completed` - New subscription created
- `customer.subscription.updated` - Subscription status changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_failed` - Payment failed

**Response:**

```json
{
  "received": true,
  "eventId": "evt_xxx",
  "eventType": "checkout.session.completed"
}
```

**Error Responses:**

- `400` - Invalid webhook signature or malformed request
- `500` - Internal server error during processing

## GET /api/internal/status

Internal system status and health check endpoint.

**Headers:**

- `x-internal-key` - Internal authentication key

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "response_time_ms": 50,
  "environment": "production",
  "metrics": {
    "issued_count": 1250,
    "verify_success": 1198,
    "latency_p50": 120,
    "latency_p95": 450
  },
  "last_webhook": "2024-01-01T11:45:00.000Z",
  "last_s3_write": "2024-01-01T11:50:00.000Z",
  "checks": {
    "database": "pass",
    "redis": "pass",
    "s3": "pass",
    "stripe": "pass"
  }
}
```

**Error Responses:**

- `401` - Unauthorized (invalid internal key)
- `500` - Internal server error
