import { NextResponse } from "next/server";
import { runTelemetryDailyForLastDays } from "@/jobs/telemetry_daily";

export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_JOB_TOKEN}`)
    return new NextResponse("unauthorized", { status: 401 });

  const result = await runTelemetryDailyForLastDays(7, false);
  return NextResponse.json(result);
}

// optional: helps detect existence from a browser
export async function GET() {
  return new NextResponse('ok', { status: 200 });
}
