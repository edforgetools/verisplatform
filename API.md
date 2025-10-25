# Veris API Documentation

This document provides comprehensive documentation for all Veris API endpoints, including request/response formats, authentication, and error handling.

## Table of Contents

- [Authentication](#authentication)
- [Base URL and Versioning](#base-url-and-versioning)
- [Common Response Formats](#common-response-formats)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Proof Management](#proof-management)
  - [Authentication](#authentication-endpoints)
  - [Billing](#billing)
  - [Utilities](#utilities)
  - [Jobs](#jobs)
- [Webhooks](#webhooks)
- [SDK Usage](#sdk-usage)

## Authentication

Veris uses Supabase Auth for authentication. All protected endpoints require a valid JWT token in the Authorization header.

### Authentication Methods

1. **Magic Link Authentication**

   ```bash
   POST /api/auth/magic-link
   ```

2. **JWT Token Usage**
   ```bash
   Authorization: Bearer <jwt_token>
   ```

### Token Refresh

Tokens expire after 1 hour. Use the refresh token to obtain a new access token:

```bash
POST /api/auth/refresh
```

## Base URL and Versioning

- **Production**: `https://verisplatform.com/api`
- **Staging**: `https://staging.verisplatform.com/api`
- **Development**: `http://localhost:3000/api`

API versioning is handled through URL paths. Current version is v1 (implicit).

## Common Response Formats

### Success Response

```json
{
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_1234567890abcdef"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "file",
      "reason": "File is required"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_1234567890abcdef"
  }
}
```

## Error Handling

### HTTP Status Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 422  | Unprocessable Entity  |
| 429  | Too Many Requests     |
| 500  | Internal Server Error |
| 503  | Service Unavailable   |

### Error Codes

| Code                       | Description                     |
| -------------------------- | ------------------------------- |
| `VALIDATION_ERROR`         | Request validation failed       |
| `AUTHENTICATION_REQUIRED`  | Valid authentication required   |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RESOURCE_NOT_FOUND`       | Requested resource not found    |
| `RATE_LIMIT_EXCEEDED`      | Rate limit exceeded             |
| `QUOTA_EXCEEDED`           | User quota exceeded             |
| `INTERNAL_ERROR`           | Internal server error           |
| `SERVICE_UNAVAILABLE`      | Service temporarily unavailable |

## Rate Limiting

Rate limits are applied per user and endpoint:

- **Proof Creation**: 100 requests/hour
- **Proof Verification**: 1000 requests/hour
- **General API**: 1000 requests/hour

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## API Endpoints

### Proof Management

#### Create Proof

Creates a cryptographic proof for an uploaded file.

```http
POST /api/proof/create
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body:**

- `file` (File, required): The file to create a proof for
- `user_id` (string, required): User ID
- `project` (string, optional): Project name

**Response:**

```json
{
  "data": {
    "id": "proof_1234567890abcdef",
    "user_id": "user_1234567890abcdef",
    "file_name": "document.pdf",
    "hash_full": "sha256:abc123...",
    "hash_prefix": "ABC1-2345",
    "signature": "base64_signature...",
    "timestamp": "2024-01-15T10:30:00Z",
    "project": "My Project",
    "visibility": "private",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Proof

Retrieves proof data by ID.

```http
GET /api/proof/{id}
Authorization: Bearer <token>
```

**Response:**

```json
{
  "data": {
    "id": "proof_1234567890abcdef",
    "user_id": "user_1234567890abcdef",
    "file_name": "document.pdf",
    "hash_full": "sha256:abc123...",
    "hash_prefix": "ABC1-2345",
    "signature": "base64_signature...",
    "timestamp": "2024-01-15T10:30:00Z",
    "project": "My Project",
    "visibility": "private",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Verify Proof

Verifies a file against a stored proof.

```http
POST /api/proof/verify
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body (by ID):**

```json
{
  "id": "proof_1234567890abcdef",
  "file": "<file_data>"
}
```

**Request Body (by signature):**

```json
{
  "hashHex": "abc123...",
  "signatureB64": "base64_signature..."
}
```

**Response:**

```json
{
  "data": {
    "verified": true,
    "proof_id": "proof_1234567890abcdef",
    "verification_timestamp": "2024-01-15T10:30:00Z",
    "details": {
      "hash_match": true,
      "signature_valid": true,
      "timestamp_valid": true
    }
  }
}
```

#### Download Certificate

Downloads a PDF certificate for a proof.

```http
GET /api/proof/{id}/certificate
Authorization: Bearer <token>
```

**Response:** PDF file download

### Authentication Endpoints

#### Magic Link Authentication

Sends a magic link for authentication.

```http
POST /api/auth/magic-link
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "redirect_to": "https://app.verisplatform.com/dashboard"
}
```

**Response:**

```json
{
  "data": {
    "message": "Magic link sent to your email",
    "expires_at": "2024-01-15T11:30:00Z"
  }
}
```

#### Refresh Token

Refreshes an expired access token.

```http
POST /api/auth/refresh
Content-Type: application/json
```

**Request Body:**

```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response:**

```json
{
  "data": {
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token",
    "expires_at": "2024-01-15T11:30:00Z"
  }
}
```

### Billing

#### Create Checkout Session

Creates a Stripe checkout session for subscription.

```http
POST /api/stripe/create-checkout
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "price_id": "price_1234567890abcdef",
  "success_url": "https://app.verisplatform.com/success",
  "cancel_url": "https://app.verisplatform.com/cancel"
}
```

**Response:**

```json
{
  "data": {
    "checkout_url": "https://checkout.stripe.com/...",
    "session_id": "cs_1234567890abcdef"
  }
}
```

#### Stripe Webhook

Handles Stripe webhook events (internal use).

```http
POST /api/stripe/webhook
Content-Type: application/json
Stripe-Signature: <signature>
```

### Utilities

#### Database Health Check

Checks database connectivity and health.

```http
GET /api/db-health
```

**Response:**

```json
{
  "data": {
    "status": "healthy",
    "database": "connected",
    "redis": "connected",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Telemetry

Records usage metrics and events.

```http
POST /api/telemetry
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "event": "proof_created",
  "value": 1,
  "meta": {
    "file_size": 1024,
    "file_type": "pdf"
  }
}
```

**Response:**

```json
{
  "data": {
    "recorded": true,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Integrity Check

Performs integrity verification of stored proofs.

```http
POST /api/integrity-check
Content-Type: application/json
X-Cron-Key: <cron_secret>
```

**Response:**

```json
{
  "data": {
    "checked": 1000,
    "verified": 999,
    "errors": 1,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Jobs

#### Proof Cleanup

Cleans up old demo proofs (internal use).

```http
POST /api/jobs/proof-gc
Content-Type: application/json
X-Cron-Key: <cron_secret>
```

**Response:**

```json
{
  "data": {
    "deleted": 50,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Daily Telemetry

Collects daily usage metrics (internal use).

```http
POST /api/jobs/telemetry-daily
Content-Type: application/json
X-Cron-Key: <cron_secret>
```

**Response:**

```json
{
  "data": {
    "processed": 1000,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Webhooks

### Stripe Webhooks

Veris receives webhooks from Stripe for payment events:

#### Supported Events

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

#### Webhook Security

All webhooks are verified using Stripe's signature verification:

```javascript
const signature = request.headers["stripe-signature"];
const isValid = stripe.webhooks.constructEvent(
  request.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET,
);
```

## SDK Usage

### JavaScript SDK

```javascript
import { VerisClient } from "@veris/sdk-js";

const client = new VerisClient({
  apiKey: "your_api_key",
  baseUrl: "https://verisplatform.com/api",
});

// Create a proof
const proof = await client.createProof({
  file: fileData,
  project: "My Project",
});

// Verify a proof
const verification = await client.verifyProof({
  id: proof.id,
  file: fileData,
});
```

### cURL Examples

#### Create Proof

```bash
curl -X POST https://verisplatform.com/api/proof/create \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "user_id=user_123" \
  -F "project=My Project"
```

#### Verify Proof

```bash
curl -X POST https://verisplatform.com/api/proof/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "proof_1234567890abcdef",
    "file": "<base64_file_data>"
  }'
```

## Best Practices

### Request Optimization

1. **Use appropriate content types**
2. **Include request IDs for tracing**
3. **Implement proper error handling**
4. **Respect rate limits**
5. **Use pagination for large datasets**

### Security

1. **Always use HTTPS**
2. **Validate all inputs**
3. **Implement proper authentication**
4. **Use request signing where appropriate**
5. **Monitor for suspicious activity**

### Performance

1. **Cache responses when appropriate**
2. **Use compression for large payloads**
3. **Implement connection pooling**
4. **Monitor response times**
5. **Use async operations where possible**

## Changelog

### v1.0.0 (2024-01-15)

- Initial API release
- Proof creation and verification
- Authentication with magic links
- Stripe integration
- Basic monitoring endpoints

---

_Last updated: 2024-01-15_
_API Version: v1.0.0_
