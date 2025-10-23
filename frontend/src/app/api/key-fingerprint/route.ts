import { NextResponse } from 'next/server';
import { getKeyFingerprint } from '@/lib/crypto-server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const fingerprint = getKeyFingerprint();
    if (!fingerprint) {
      return NextResponse.json({ error: 'Failed to generate key fingerprint' }, { status: 500 });
    }
    return NextResponse.json({ fingerprint });
  } catch (error) {
    console.error('Error getting key fingerprint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
