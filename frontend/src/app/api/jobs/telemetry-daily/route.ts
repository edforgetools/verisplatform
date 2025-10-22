import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const ok =
    req.headers.get('authorization') === `Bearer ${process.env.CRON_JOB_TOKEN}`;
  if (!ok) return new NextResponse('unauthorized', { status: 401 });
  // TODO: run telemetry work here
  return NextResponse.json({ status: 'ok' });
}

// optional: helps detect existence from a browser
export async function GET() {
  return new NextResponse('ok', { status: 200 });
}
