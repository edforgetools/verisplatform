#!/usr/bin/env tsx

/**
 * Manual script to run telemetry daily aggregation
 * Usage: npx tsx src/jobs/run-telemetry-daily.ts [options]
 */

import {
  runTelemetryDailyAggregation,
  runTelemetryDailyForDate,
  runTelemetryDailyForLastDays,
} from './telemetry_daily';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npx tsx src/jobs/run-telemetry-daily.ts [options]

Options:
  --date YYYY-MM-DD     Run for specific date (default: yesterday)
  --days N              Run for last N days (default: 1)
  --start YYYY-MM-DD    Start date for range
  --end YYYY-MM-DD      End date for range
  --dry-run             Preview what would be processed
  --help, -h            Show this help

Examples:
  npx tsx src/jobs/run-telemetry-daily.ts
  npx tsx src/jobs/run-telemetry-daily.ts --date 2024-01-15
  npx tsx src/jobs/run-telemetry-daily.ts --days 7
  npx tsx src/jobs/run-telemetry-daily.ts --start 2024-01-01 --end 2024-01-31
  npx tsx src/jobs/run-telemetry-daily.ts --dry-run
`);
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const dateIndex = args.indexOf('--date');
  const daysIndex = args.indexOf('--days');
  const startIndex = args.indexOf('--start');
  const endIndex = args.indexOf('--end');

  try {
    let result;

    if (dateIndex !== -1 && args[dateIndex + 1]) {
      // Single date
      const date = args[dateIndex + 1];
      console.log(
        `🔄 Running telemetry daily aggregation for date: ${date}${
          dryRun ? ' (DRY RUN)' : ''
        }`,
      );
      result = await runTelemetryDailyForDate(date, dryRun);
    } else if (daysIndex !== -1 && args[daysIndex + 1]) {
      // Last N days
      const days = parseInt(args[daysIndex + 1], 10);
      if (isNaN(days) || days < 1) {
        throw new Error('Days must be a positive number');
      }
      console.log(
        `🔄 Running telemetry daily aggregation for last ${days} days${
          dryRun ? ' (DRY RUN)' : ''
        }`,
      );
      result = await runTelemetryDailyForLastDays(days, dryRun);
    } else if (
      startIndex !== -1 &&
      endIndex !== -1 &&
      args[startIndex + 1] &&
      args[endIndex + 1]
    ) {
      // Date range
      const startDate = args[startIndex + 1];
      const endDate = args[endIndex + 1];
      console.log(
        `🔄 Running telemetry daily aggregation for range: ${startDate} to ${endDate}${
          dryRun ? ' (DRY RUN)' : ''
        }`,
      );
      result = await runTelemetryDailyAggregation({
        startDate,
        endDate,
        dryRun,
      });
    } else {
      // Default: yesterday
      console.log(
        `🔄 Running telemetry daily aggregation for yesterday${
          dryRun ? ' (DRY RUN)' : ''
        }`,
      );
      result = await runTelemetryDailyForLastDays(1, dryRun);
    }

    if (result.success) {
      console.log(`✅ Successfully processed ${result.processed} aggregations`);
      if (result.results.length > 0) {
        console.log('\n📊 Results:');
        result.results.forEach((r) => {
          console.log(
            `  ${r.date} | ${r.event} | count: ${r.count} | users: ${r.unique_users}`,
          );
        });
      }
    } else {
      console.error(`❌ Failed with ${result.errors.length} errors:`);
      result.errors.forEach((error) => console.error(`  - ${error}`));
      process.exit(1);
    }
  } catch (error) {
    console.error(
      '❌ Fatal error:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
