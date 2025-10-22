# Jobs

This directory contains background jobs and scheduled tasks for the Veris application.

## Telemetry Daily Aggregation

### Overview

The `telemetry_daily.ts` job aggregates raw telemetry data into daily rollups for better performance and analytics.

### Features

- **Idempotent**: Running multiple times with the same date range yields identical results
- **Flexible date ranges**: Process specific dates or date ranges
- **Dry run mode**: Preview what would be processed without making changes
- **Error handling**: Continues processing even if individual events fail
- **Metadata aggregation**: Merges metadata from multiple events

### Usage

#### Programmatic Usage

```typescript
import { runTelemetryDailyAggregation } from '@/jobs/telemetry_daily';

// Run for yesterday (default)
await runTelemetryDailyAggregation();

// Run for specific date range
await runTelemetryDailyAggregation({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});

// Dry run to preview
await runTelemetryDailyAggregation({
  startDate: '2024-01-15',
  endDate: '2024-01-15',
  dryRun: true,
});
```

#### API Usage

The job is exposed as a protected API endpoint:

```bash
# Run for yesterday
curl -X GET "https://your-domain.com/api/jobs/telemetry-daily" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Run for specific date range
curl -X POST "https://your-domain.com/api/jobs/telemetry-daily" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-01", "endDate": "2024-01-31"}'

# Dry run
curl -X GET "https://your-domain.com/api/jobs/telemetry-daily?dryRun=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Environment Variables

- `CRON_SECRET`: Required for API authentication (set this in your deployment)

### Database Schema

The job populates the `telemetry_daily` table with:

- `date`: The date being aggregated
- `event`: The event type
- `count`: Total count of events
- `unique_users`: Number of unique users who triggered the event
- `meta`: Aggregated metadata from all events

### Testing

Run the idempotency test:

```bash
cd frontend
npx tsx src/jobs/__tests__/telemetry_daily.test.ts
```

### CRON Setup

To run this job daily, set up a CRON job that calls the API endpoint:

```bash
# Run daily at 2 AM UTC
0 2 * * * curl -X GET "https://your-domain.com/api/jobs/telemetry-daily" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use a service like Vercel Cron Jobs, GitHub Actions, or similar.
