import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabaseAdmin';

export async function GET() {
  return new NextResponse('ok', { status: 200 });
}

export async function POST(req: Request) {
  const ok =
    req.headers.get('authorization') === `Bearer ${process.env.CRON_JOB_TOKEN}`;
  if (!ok) return new NextResponse('unauthorized', { status: 401 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from('telemetry_daily').insert({
    ran_at_utc: new Date().toISOString(),
    ok: true,
  });
  if (error) return new NextResponse('db error', { status: 500 });
  return NextResponse.json({ status: 'ok' });
}
