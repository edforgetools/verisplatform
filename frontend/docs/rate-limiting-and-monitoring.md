# Rate Limiting and Monitoring

This document describes the rate limiting, telemetry, and internal monitoring features implemented in Veris.

## Rate Limiting

### Overview

Rate limiting is implemented using Redis with an in-memory fallback for development environments. The system limits API requests to 60 requests per minute per IP address.

### Implementation

- **Middleware**: `src/middleware.ts` - Applies rate limiting to all `/api/*` routes
- **Redis**: Uses Upstash Redis for production rate limiting
- **Fallback**: In-memory rate limiting when Redis is unavailable
- **Bypass**: CRON jobs with valid `x-cron-key` header bypass rate limiting

### Configuration

Rate limiting is configured via environment variables:

```bash
# Redis configuration (optional - falls back to in-memory)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# CRON authentication (bypasses rate limiting)
CRON_JOB_TOKEN=your-secure-token
```

### Testing Rate Limiting

Use the provided test script to verify rate limiting works:

```bash
# Simple test
./scripts/test-rate-limit.sh

# Advanced load test (requires tsx)
npx tsx scripts/load-test-rate-limit.ts
```

## Telemetry

### Overview

Minimal telemetry tracks key metrics including proof issuance, verification success rates, and latency metrics.

### Implementation

- **Usage Tracking**: `src/lib/usage-telemetry.ts` - Records usage metrics
- **Database**: Stores metrics in Supabase `usage_metrics` table
- **Fire-and-Forget**: Telemetry failures don't break main application flow

### Metrics Tracked

- `issued_count`: Number of proofs created
- `verify_success`: Number of successful verifications
- `latency_p50/p95`: Response time percentiles
- `api.call`: General API usage tracking

### Usage

```typescript
import { recordProofCreation, recordProofVerification } from "@/lib/usage-telemetry";

// Record proof creation
await recordProofCreation(proofId, userId, { metadata });

// Record verification
await recordProofVerification(proofId, userId, { metadata });
```

## Internal Status Page

### Overview

The internal status page provides real-time system health monitoring at `/internal/status`.

### Features

- **Authentication**: Protected by `x-internal-key` header
- **Metrics Display**: Shows key performance indicators
- **System Checks**: Database, Redis, S3, and Stripe connectivity
- **Real-time Data**: Live metrics and timestamps

### Configuration

Set the internal key in your environment:

```bash
INTERNAL_KEY=your-secure-internal-key-here-min-16-chars
```

### Access

1. Navigate to `/internal/status`
2. Enter your internal key
3. View system metrics and health checks

### API Endpoint

The status page is backed by `/api/internal/status` which returns:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "response_time_ms": 150,
  "environment": "production",
  "metrics": {
    "issued_count": 1234,
    "verify_success": 1200,
    "latency_p50": 150,
    "latency_p95": 300
  },
  "last_webhook": "2024-01-01T00:00:00.000Z",
  "last_s3_write": "2024-01-01T00:00:00.000Z",
  "checks": {
    "database": "pass",
    "redis": "pass",
    "s3": "pass",
    "stripe": "pass"
  }
}
```

## Monitoring Dashboard

### Overview

The monitoring dashboard at `/monitoring` provides comprehensive system monitoring with:

- Key performance indicators
- Performance thresholds
- Real-time alerts
- Trend analysis

### Features

- **Auto-refresh**: Updates every 30 seconds
- **Threshold Monitoring**: Alerts when metrics exceed limits
- **Historical Data**: 7-day trend analysis
- **Alert System**: Categorized by severity

## Security Considerations

### Rate Limiting

- IP-based limiting prevents abuse
- CRON jobs bypass limits with authentication
- Graceful degradation when Redis unavailable

### Internal Status

- Header-based authentication
- No session management required
- Key should be rotated regularly

### Telemetry

- Fire-and-forget design prevents data loss
- No sensitive data in metrics
- Structured logging for debugging

## Troubleshooting

### Rate Limiting Issues

1. Check Redis connectivity
2. Verify CRON key configuration
3. Review middleware logs

### Telemetry Issues

1. Check Supabase connection
2. Verify `usage_metrics` table exists
3. Review application logs

### Status Page Issues

1. Verify `INTERNAL_KEY` environment variable
2. Check API endpoint accessibility
3. Review authentication logs

## Development

### Local Testing

```bash
# Start development server
npm run dev

# Test rate limiting
./scripts/test-rate-limit.sh

# Check internal status
curl -H "x-internal-key: your-key" http://localhost:3000/api/internal/status
```

### Environment Setup

Copy `env.example` to `.env.local` and configure:

- Redis settings for rate limiting
- Internal key for status page
- Supabase for telemetry storage
