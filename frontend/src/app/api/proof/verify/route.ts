import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/db';
import { sha256 } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const id = form.get('id') as string | null;
  if (!file || !id)
    return NextResponse.json(
      { error: 'file and id required' },
      { status: 400 },
    );

  const svc = supabaseService();
  const { data: proof } = await svc
    .from('proofs')
    .select('hash_full,timestamp')
    .eq('id', id)
    .single();

  const buf = Buffer.from(await file.arrayBuffer());
  const localHash = sha256(buf);
  const ok = localHash === proof?.hash_full;
  return NextResponse.json({
    verified: ok,
    expected: proof?.hash_full,
    got: localHash,
    timestamp: proof?.timestamp,
  });
}
