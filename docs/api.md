# Veris API Documentation

## Authentication

For Q1, user authentication is handled via `x-user-id` header for simplicity. Future versions will use proper JWT tokens.

## Proof Creation

### POST /api/proof/create

Creates a cryptographic proof for an uploaded file.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Headers: `x-user-id: <uuid>`

**Form Data:**

- `file`: File to create proof for
- `user_id`: User UUID
- `project`: Optional project name

**Response:**

```json
{
  "id": "uuid",
  "hash_prefix": "ABCD-EFGH",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "url": "/proof/uuid"
}
```

**Example:**

```bash
curl -F "file=@document.pdf" \
     -F "user_id=123e4567-e89b-12d3-a456-426614174000" \
     -F "project=My Project" \
     -H "x-user-id: 123e4567-e89b-12d3-a456-426614174000" \
     http://localhost:3000/api/proof/create
```

## Proof Retrieval

### GET /api/proof/[id]

Retrieves proof data by ID.

**Response:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "file_name": "document.pdf",
  "version": 1,
  "hash_full": "sha256_hash",
  "hash_prefix": "ABCD-EFGH",
  "signature": "base64_signature",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "project": "My Project",
  "visibility": "public",
  "anchor_txid": null,
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

## File Verification

### POST /api/proof/verify

Verifies a file against a stored proof.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`

**Form Data:**

- `file`: File to verify
- `id`: Proof ID to verify against

**Response:**

```json
{
  "verified": true,
  "expected": "expected_hash",
  "got": "actual_hash",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Certificate Download

### GET /api/proof/[id]/certificate

Downloads a PDF certificate for the proof.

**Response:**

- Content-Type: `application/pdf`
- Body: PDF file

## Billing

### POST /api/stripe/create-checkout

Creates a Stripe checkout session.

**Request:**

```json
{
  "userId": "uuid",
  "priceId": "price_xxx",
  "successUrl": "https://app.veris.dev/success",
  "cancelUrl": "https://app.veris.dev/cancel"
}
```

**Response:**

```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/stripe/webhook

Handles Stripe webhook events for subscription management.

**Headers:**

- `stripe-signature`: Stripe signature header

## Telemetry

### POST /api/telemetry

Tracks usage metrics for pilot program.

**Request:**

```json
{
  "event": "proof_created",
  "value": 1,
  "meta": { "file_size": 1024 },
  "userId": "uuid"
}
```

## Error Responses

All endpoints return appropriate HTTP status codes:

- `400`: Bad Request
- `401`: Unauthorized
- `402`: Payment Required
- `404`: Not Found
- `500`: Internal Server Error

Error response format:

```json
{
  "error": "Error message"
}
```
