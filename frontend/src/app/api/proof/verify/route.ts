import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/db';
import { verifySignature } from '@/lib/crypto-server';
import { withRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

interface VerifyByIdRequest {
  id: string;
}

interface VerifyBySignatureRequest {
  hashHex: string;
  signatureB64: string;
}

function isVerifyByIdRequest(data: unknown): data is VerifyByIdRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as { id: unknown }).id === 'string' &&
    (data as { id: string }).id.length > 0
  );
}

function isVerifyBySignatureRequest(
  data: unknown,
): data is VerifyBySignatureRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'hashHex' in data &&
    'signatureB64' in data &&
    typeof (data as { hashHex: unknown }).hashHex === 'string' &&
    typeof (data as { signatureB64: unknown }).signatureB64 === 'string' &&
    (data as { hashHex: string }).hashHex.length > 0 &&
    (data as { signatureB64: string }).signatureB64.length > 0
  );
}

async function handleVerifyProof(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input format
    if (!isVerifyByIdRequest(body) && !isVerifyBySignatureRequest(body)) {
      return NextResponse.json(
        {
          error:
            'Invalid input: must provide either { id } or { hashHex, signatureB64 }',
        },
        { status: 400 },
      );
    }

    // Handle ID-based verification (preferred signature path)
    if (isVerifyByIdRequest(body)) {
      const svc = supabaseService();
      const { data: proof, error } = await svc
        .from('proofs')
        .select('hash_full, signature')
        .eq('id', body.id)
        .single();

      if (error || !proof) {
        return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
      }

      // Verify signature if available
      if (proof.signature) {
        const signatureVerified = verifySignature(
          proof.hash_full,
          proof.signature,
        );
        return NextResponse.json({
          verified: signatureVerified,
          verified_by: 'signature',
          hashHex: proof.hash_full,
          signatureB64: proof.signature,
        });
      } else {
        // Fallback to hash-only verification
        return NextResponse.json({
          verified: true,
          verified_by: 'hash',
          hashHex: proof.hash_full,
          signatureB64: null,
        });
      }
    }

    // Handle signature-based verification
    if (isVerifyBySignatureRequest(body)) {
      const signatureVerified = verifySignature(
        body.hashHex,
        body.signatureB64,
      );
      return NextResponse.json({
        verified: signatureVerified,
        verified_by: 'signature',
        hashHex: body.hashHex,
        signatureB64: body.signatureB64,
      });
    }

    // This should never be reached due to the validation above
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Malformed request body' },
      { status: 400 },
    );
  }
}

// Apply rate limiting to the POST handler
export const POST = withRateLimit(handleVerifyProof, '/api/proof/verify', {
  capacity: 20, // 20 requests
  refillRate: 2, // 2 tokens per second
  windowMs: 60000, // 1 minute window
});
