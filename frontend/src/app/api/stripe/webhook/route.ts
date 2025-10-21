import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  try {
    // TODO: Implement Stripe webhook handling
    return NextResponse.json({ message: 'Stripe webhook endpoint' });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
