import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/db';
import { assertEntitled } from '@/lib/entitlements';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { event, value, meta, userId } = await req.json();

    if (!event) {
      return NextResponse.json({ error: 'event is required' }, { status: 400 });
    }

    // Check entitlement for telemetry tracking (only if userId is provided)
    if (userId) {
      try {
        await assertEntitled(userId, 'telemetry_tracking');
      } catch {
        return NextResponse.json(
          { error: 'Insufficient permissions to track telemetry' },
          { status: 403 },
        );
      }
    }

    const svc = supabaseService();
    const { error } = await svc.from('telemetry').insert({
      user_id: userId || null,
      event,
      value: value || 1,
      meta: meta || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Telemetry API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
