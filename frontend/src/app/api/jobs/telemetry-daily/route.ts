import { NextResponse } from 'next/server';
import { runTelemetryDailyAggregation } from '@/jobs/telemetry_daily';

export async function POST(req: Request) {
  const ok =
    req.headers.get('authorization') === `Bearer ${process.env.CRON_JOB_TOKEN}`;
  if (!ok) return new NextResponse('unauthorized', { status: 401 });

  try {
    const result = await runTelemetryDailyAggregation();
    return NextResponse.json({
      status: 'ok',
      processed: result.processed,
      errors: result.errors,
      success: result.success,
    });
  } catch (error) {
    console.error('Telemetry daily job failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// optional: helps detect existence from a browser
export async function GET() {
  return new NextResponse('ok', { status: 200 });
}
