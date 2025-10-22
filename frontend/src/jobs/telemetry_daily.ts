import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface TelemetryDailyJobOptions {
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
  dryRun?: boolean; // If true, only log what would be done
}

export interface TelemetryDailyResult {
  date: string;
  event: string;
  count: number;
  unique_users: number;
  meta?: any;
}

/**
 * Aggregates telemetry data into daily rollups
 * Idempotent: running multiple times with same date range yields identical results
 */
export async function runTelemetryDailyAggregation(
  options: TelemetryDailyJobOptions = {},
): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
  results: TelemetryDailyResult[];
}> {
  const { startDate, endDate, dryRun = false } = options;

  // Default to yesterday if no dates provided
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() - 1);

  const start =
    startDate ||
    new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
  const end = endDate || defaultEndDate.toISOString().split('T')[0];

  console.log(
    `[TelemetryDaily] Processing date range: ${start} to ${end}${
      dryRun ? ' (DRY RUN)' : ''
    }`,
  );

  const errors: string[] = [];
  const results: TelemetryDailyResult[] = [];
  let processed = 0;

  try {
    // Get all unique events in the date range
    const { data: eventsData, error: eventsError } = await supabaseAdmin
      .from('telemetry')
      .select('event')
      .gte('created_at', `${start}T00:00:00.000Z`)
      .lte('created_at', `${end}T23:59:59.999Z`)
      .not('event', 'is', null);

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    const uniqueEvents = [
      ...new Set(eventsData?.map((row) => row.event) || []),
    ];
    console.log(
      `[TelemetryDaily] Found ${
        uniqueEvents.length
      } unique events: ${uniqueEvents.join(', ')}`,
    );

    // Process each event for each day in the range
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    for (
      let currentDate = new Date(startDateObj);
      currentDate <= endDateObj;
      currentDate.setDate(currentDate.getDate() + 1)
    ) {
      const dateStr = currentDate.toISOString().split('T')[0];

      for (const event of uniqueEvents) {
        try {
          // Get aggregated data for this event on this date
          const { data: aggData, error: aggError } = await supabaseAdmin
            .from('telemetry')
            .select('user_id, value, meta')
            .eq('event', event)
            .gte('created_at', `${dateStr}T00:00:00.000Z`)
            .lte('created_at', `${dateStr}T23:59:59.999Z`);

          if (aggError) {
            throw new Error(
              `Failed to aggregate data for ${event} on ${dateStr}: ${aggError.message}`,
            );
          }

          if (!aggData || aggData.length === 0) {
            continue; // No data for this event on this date
          }

          // Calculate aggregations
          const count = aggData.reduce((sum, row) => sum + (row.value || 1), 0);
          const uniqueUsers = new Set(
            aggData.filter((row) => row.user_id).map((row) => row.user_id),
          ).size;

          // Aggregate metadata (merge all meta objects)
          const meta = aggData
            .filter((row) => row.meta)
            .reduce((acc, row) => {
              if (typeof row.meta === 'object' && row.meta !== null) {
                return { ...acc, ...row.meta };
              }
              return acc;
            }, {});

          const result: TelemetryDailyResult = {
            date: dateStr,
            event,
            count,
            unique_users: uniqueUsers,
            meta: Object.keys(meta).length > 0 ? meta : undefined,
          };

          results.push(result);
          processed++;

          if (dryRun) {
            console.log(
              `[TelemetryDaily] Would upsert: ${dateStr} | ${event} | count: ${count} | users: ${uniqueUsers}`,
            );
          } else {
            // Upsert into telemetry_daily table
            const { error: upsertError } = await supabaseAdmin
              .from('telemetry_daily')
              .upsert(
                {
                  date: dateStr,
                  event,
                  count,
                  unique_users: uniqueUsers,
                  meta: Object.keys(meta).length > 0 ? meta : null,
                },
                {
                  onConflict: 'date,event',
                },
              );

            if (upsertError) {
              throw new Error(
                `Failed to upsert ${event} on ${dateStr}: ${upsertError.message}`,
              );
            }

            console.log(
              `[TelemetryDaily] Upserted: ${dateStr} | ${event} | count: ${count} | users: ${uniqueUsers}`,
            );
          }
        } catch (error) {
          const errorMsg = `Error processing ${event} on ${dateStr}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          console.error(`[TelemetryDaily] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }

    console.log(
      `[TelemetryDaily] Completed: processed ${processed} aggregations, ${errors.length} errors`,
    );

    return {
      success: errors.length === 0,
      processed,
      errors,
      results,
    };
  } catch (error) {
    const errorMsg = `Fatal error in telemetry daily aggregation: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(`[TelemetryDaily] ${errorMsg}`);
    errors.push(errorMsg);

    return {
      success: false,
      processed,
      errors,
      results,
    };
  }
}

/**
 * Convenience function to run aggregation for a specific date
 */
export async function runTelemetryDailyForDate(date: string, dryRun = false) {
  return runTelemetryDailyAggregation({
    startDate: date,
    endDate: date,
    dryRun,
  });
}

/**
 * Convenience function to run aggregation for the last N days
 */
export async function runTelemetryDailyForLastDays(
  days: number,
  dryRun = false,
) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Yesterday

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  return runTelemetryDailyAggregation({
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    dryRun,
  });
}
