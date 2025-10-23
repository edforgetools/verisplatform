import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/db';
import { capture } from '@/lib/observability';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const svc = supabaseService();
    const { data, error } = await svc
      .from('proofs')
      .select('*')
      .eq('id', id)
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    capture(error, { route: "/api/proof/[id]" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
