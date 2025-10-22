import { getSupabase } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('proofs').select('id').limit(1);
    return new Response(JSON.stringify({ ok: !error }), {
      status: error ? 500 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
