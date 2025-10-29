# VERIS MVP UPGRADE — CURSOR BUILD PLAN
## Field Research → Portable Dispute-Ready Proof Receipts

**Goal:** Transform Veris MVP to produce portable, dispute-ready proof receipts matching real-world user needs and payment processor requirements.

**Strategic Anchor:** Verifiable proof of delivery that survives metadata stripping, works in bank disputes, and provides clear sign-off evidence.

---

## PHASE 1: SCHEMA & DATA MODEL UPGRADES

### 1.1 Evidence Pack JSON Schema
**File:** `/frontend/src/schema/evidence_pack.schema.json` (NEW)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Veris Evidence Pack",
  "description": "Portable proof receipt for dispute resolution and delivery verification",
  "type": "object",
  "required": [
    "evidence_pack_version",
    "proof",
    "delivery",
    "acceptance",
    "verification_instructions"
  ],
  "properties": {
    "evidence_pack_version": {
      "type": "string",
      "const": "1.0.0"
    },
    "proof": {
      "type": "object",
      "required": ["proof_id", "sha256", "issued_at", "signature", "issuer"],
      "properties": {
        "proof_id": { "type": "string", "pattern": "^[0-9A-HJKMNP-TV-Z]{26}$" },
        "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
        "issued_at": { "type": "string", "format": "date-time" },
        "signature": { "type": "string", "pattern": "^ed25519:" },
        "issuer": { "type": "string" },
        "algorithm": { "type": "string", "const": "Ed25519" }
      }
    },
    "delivery": {
      "type": "object",
      "required": ["file_name", "delivered_at", "delivered_by"],
      "properties": {
        "file_name": { "type": "string" },
        "file_size_bytes": { "type": "integer", "minimum": 0 },
        "mime_type": { "type": "string" },
        "delivered_at": { "type": "string", "format": "date-time" },
        "delivered_by": { "type": "string", "format": "email" },
        "project_name": { "type": "string" },
        "version": { "type": "string" }
      }
    },
    "acceptance": {
      "type": "object",
      "required": ["status", "state_log"],
      "properties": {
        "status": {
          "type": "string",
          "enum": ["draft", "issued", "sent", "viewed_no_action", "accepted", "declined", "expired"]
        },
        "recipient_email": { "type": "string", "format": "email" },
        "accepted_at": { "type": "string", "format": "date-time" },
        "accepted_by_ip": { "type": "string" },
        "accepted_by_user_agent": { "type": "string" },
        "declined_at": { "type": "string", "format": "date-time" },
        "declined_reason": { "type": "string" },
        "state_log": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["timestamp", "from_state", "to_state"],
            "properties": {
              "timestamp": { "type": "string", "format": "date-time" },
              "from_state": { "type": "string" },
              "to_state": { "type": "string" },
              "actor_ip": { "type": "string" },
              "actor_user_agent": { "type": "string" },
              "notes": { "type": "string" }
            }
          }
        }
      }
    },
    "content_credentials": {
      "type": "object",
      "description": "Optional C2PA metadata (degrades gracefully if stripped)",
      "properties": {
        "has_c2pa_manifest": { "type": "boolean" },
        "manifest_url": { "type": "string", "format": "uri" },
        "claim_generator": { "type": "string" },
        "thumbnail_claim": { "type": "string" }
      }
    },
    "verification_instructions": {
      "type": "object",
      "required": ["verify_url", "verify_methods"],
      "properties": {
        "verify_url": { "type": "string", "format": "uri" },
        "verify_methods": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["method", "description"],
            "properties": {
              "method": { "type": "string" },
              "description": { "type": "string" },
              "endpoint": { "type": "string" }
            }
          }
        }
      }
    },
    "dispute_mapping": {
      "type": "object",
      "description": "Mappings to payment processor evidence formats",
      "properties": {
        "stripe": { "type": "object" },
        "paypal": { "type": "object" },
        "generic": { "type": "object" }
      }
    },
    "attachments": {
      "type": "array",
      "description": "Additional supporting documents",
      "items": {
        "type": "object",
        "required": ["file_name", "description"],
        "properties": {
          "file_name": { "type": "string" },
          "description": { "type": "string" },
          "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" }
        }
      }
    }
  }
}
```

**Action:**
- Create new schema file in `/frontend/src/schema/`
- Add TypeScript types in `/frontend/src/types/evidence-pack.ts`
- Export schema validation function using Zod

---

### 1.2 Payment Processor Mapping Templates
**File:** `/frontend/src/templates/mapping_stripe.json` (NEW)

```json
{
  "dispute_evidence_format": "stripe_v1",
  "mapping": {
    "product_description": "{{ delivery.file_name }} - {{ delivery.project_name }}",
    "customer_communication": "Proof of delivery issued at {{ proof.issued_at }}. Acceptance recorded at {{ acceptance.accepted_at }}.",
    "service_documentation": "SHA-256: {{ proof.sha256 }}\nSignature: {{ proof.signature }}\nIssuer: {{ proof.issuer }}",
    "receipt": "{{ proof_url }}",
    "customer_signature": "Digital acceptance recorded: {{ acceptance.accepted_by_ip }} at {{ acceptance.accepted_at }}",
    "duplicate_charge_documentation": null,
    "refund_policy": "Delivery verification available at {{ verification_instructions.verify_url }}",
    "cancellation_policy": "N/A - service delivered and accepted",
    "access_activity_log": "{{ acceptance.state_log | jsonify }}",
    "shipping_documentation": "Digital delivery - hash: {{ proof.sha256 }}"
  },
  "instructions": "Upload receipt.pdf as 'service_documentation'. Include acceptance.log.jsonl as 'customer_communication'."
}
```

**File:** `/frontend/src/templates/mapping_paypal.json` (NEW)

```json
{
  "dispute_evidence_format": "paypal_seller_response",
  "mapping": {
    "tracking_info": "Proof ID: {{ proof.proof_id }}",
    "proof_of_delivery": "Delivered at {{ delivery.delivered_at }}. Accepted at {{ acceptance.accepted_at }}. Verification: {{ verification_instructions.verify_url }}",
    "proof_of_fulfillment": "SHA-256 hash: {{ proof.sha256 }}\nEd25519 signature: {{ proof.signature }}",
    "return_policy": "Digital goods - verified delivery via cryptographic proof",
    "invoice_or_receipt": "{{ proof_url }}",
    "note_to_buyer": "Your acceptance was recorded on {{ acceptance.accepted_at }} from IP {{ acceptance.accepted_by_ip }}. Verify at any time: {{ verification_instructions.verify_url }}"
  },
  "instructions": "Upload evidence-pack.zip. Include receipt.pdf and acceptance.log.jsonl."
}
```

**File:** `/frontend/src/templates/mapping_generic.json` (NEW)

```json
{
  "dispute_evidence_format": "generic_court_submission",
  "evidence_summary": {
    "claim": "Delivery of digital asset '{{ delivery.file_name }}' on {{ delivery.delivered_at }}",
    "proof_method": "SHA-256 cryptographic hash with Ed25519 digital signature",
    "acceptance_proof": "Recipient accepted delivery on {{ acceptance.accepted_at }} from IP {{ acceptance.accepted_by_ip }}",
    "verification": "Third-party verification available at {{ verification_instructions.verify_url }}",
    "evidence_integrity": "All evidence cryptographically linked via hash {{ proof.sha256 }}"
  },
  "supporting_documents": [
    "receipt.pdf - Human-readable proof certificate",
    "receipt.json - Machine-verifiable canonical proof",
    "acceptance.log.jsonl - Complete acceptance state log",
    "verification_instructions.txt - How to independently verify"
  ],
  "instructions": "Present evidence-pack.zip as Exhibit A. Verification is independently reproducible."
}
```

**Actions:**
- Create `/frontend/src/templates/` directory
- Add all three mapping JSON files
- Create template rendering utility at `/frontend/src/lib/template-renderer.ts`
- Use Handlebars or simple string replacement for variable substitution

---

### 1.3 Database Schema Additions
**File:** `/supabase/migrations/20250129_signoff_flow.sql` (NEW)

```sql
-- Add sign-off state tracking to proofs table
ALTER TABLE proofs
  ADD COLUMN IF NOT EXISTS acceptance_status TEXT DEFAULT 'draft'
    CHECK (acceptance_status IN ('draft', 'issued', 'sent', 'viewed_no_action', 'accepted', 'declined', 'expired')),
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by_ip INET,
  ADD COLUMN IF NOT EXISTS accepted_by_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_reason TEXT,
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

-- Create acceptance state log table
CREATE TABLE IF NOT EXISTS acceptance_state_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  actor_ip INET,
  actor_user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acceptance_state_log_proof_id ON acceptance_state_log(proof_id);
CREATE INDEX idx_acceptance_state_log_timestamp ON acceptance_state_log(timestamp DESC);

-- Create attachments table for evidence packs
CREATE TABLE IF NOT EXISTS proof_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  description TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT,
  sha256 TEXT,
  s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proof_attachments_proof_id ON proof_attachments(proof_id);

-- Add RLS policies
ALTER TABLE acceptance_state_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own acceptance logs"
  ON acceptance_state_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proofs
      WHERE proofs.id = acceptance_state_log.proof_id
        AND proofs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own attachments"
  ON proof_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proofs
      WHERE proofs.id = proof_attachments.proof_id
        AND proofs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own attachments"
  ON proof_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proofs
      WHERE proofs.id = proof_attachments.proof_id
        AND proofs.user_id = auth.uid()
    )
  );
```

**Actions:**
- Create migration file
- Run migration: `pnpm supabase migration up`
- Regenerate TypeScript types: `pnpm supabase gen types typescript`
- Update `/frontend/src/lib/db-types.ts`

---

## PHASE 2: BACKEND API IMPLEMENTATION

### 2.1 Sign-Off State Machine
**File:** `/frontend/src/lib/signoff-state-machine.ts` (NEW)

```typescript
import { z } from 'zod';

export const AcceptanceState = z.enum([
  'draft',
  'issued',
  'sent',
  'viewed_no_action',
  'accepted',
  'declined',
  'expired',
]);

export type AcceptanceState = z.infer<typeof AcceptanceState>;

export const StateTransition = z.object({
  from: AcceptanceState,
  to: AcceptanceState,
  actorIp: z.string().ip().optional(),
  actorUserAgent: z.string().optional(),
  notes: z.string().optional(),
});

export type StateTransition = z.infer<typeof StateTransition>;

// Valid state transitions
const VALID_TRANSITIONS: Record<AcceptanceState, AcceptanceState[]> = {
  draft: ['issued'],
  issued: ['sent'],
  sent: ['viewed_no_action', 'accepted', 'declined', 'expired'],
  viewed_no_action: ['accepted', 'declined', 'expired'],
  accepted: [], // Terminal state
  declined: [], // Terminal state
  expired: [], // Terminal state
};

export function isValidTransition(from: AcceptanceState, to: AcceptanceState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateTransition(transition: StateTransition): void {
  if (!isValidTransition(transition.from, transition.to)) {
    throw new Error(
      `Invalid state transition: ${transition.from} -> ${transition.to}`
    );
  }
}

export async function recordStateTransition(
  db: any, // Supabase client
  proofId: string,
  transition: StateTransition
): Promise<void> {
  validateTransition(transition);

  // Insert into state log
  const { error: logError } = await db
    .from('acceptance_state_log')
    .insert({
      proof_id: proofId,
      from_state: transition.from,
      to_state: transition.to,
      actor_ip: transition.actorIp,
      actor_user_agent: transition.actorUserAgent,
      notes: transition.notes,
    });

  if (logError) throw logError;

  // Update proof status
  const updateData: Record<string, any> = {
    acceptance_status: transition.to,
  };

  if (transition.to === 'sent') updateData.sent_at = new Date().toISOString();
  if (transition.to === 'viewed_no_action') updateData.viewed_at = new Date().toISOString();
  if (transition.to === 'accepted') {
    updateData.accepted_at = new Date().toISOString();
    updateData.accepted_by_ip = transition.actorIp;
    updateData.accepted_by_user_agent = transition.actorUserAgent;
  }
  if (transition.to === 'declined') {
    updateData.declined_at = new Date().toISOString();
    updateData.declined_reason = transition.notes;
  }
  if (transition.to === 'expired') updateData.expired_at = new Date().toISOString();

  const { error: updateError } = await db
    .from('proofs')
    .update(updateData)
    .eq('id', proofId);

  if (updateError) throw updateError;
}
```

**Actions:**
- Create state machine module
- Add comprehensive JSDoc comments
- Export state validation utilities
- Write unit tests at `/frontend/src/__tests__/signoff-state-machine.test.ts`

---

### 2.2 Sign-Off Endpoints

#### 2.2.1 Issue Proof (Transition: draft → issued)
**File:** `/frontend/src/app/api/proof/issue/route.ts` (NEW)

```typescript
import { NextRequest } from 'next/server';
import { jsonOk, jsonErr } from '@/lib/http';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { recordStateTransition } from '@/lib/signoff-state-machine';
import { withAuth } from '@/lib/auth-server';
import { z } from 'zod';

const IssueProofSchema = z.object({
  proof_id: z.string().length(26), // ULID
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (userId) => {
    const body = await req.json();
    const { proof_id } = IssueProofSchema.parse(body);

    const db = getSupabaseAdmin();

    // Verify proof belongs to user
    const { data: proof, error: fetchError } = await db
      .from('proofs')
      .select('id, acceptance_status, user_id')
      .eq('id', proof_id)
      .single();

    if (fetchError || !proof) {
      return jsonErr('Proof not found', 404);
    }

    if (proof.user_id !== userId) {
      return jsonErr('Unauthorized', 403);
    }

    if (proof.acceptance_status !== 'draft') {
      return jsonErr('Proof already issued', 400);
    }

    // Record state transition
    await recordStateTransition(db, proof_id, {
      from: 'draft',
      to: 'issued',
      notes: 'Proof issued by creator',
    });

    return jsonOk({ proof_id, status: 'issued' });
  });
}
```

#### 2.2.2 Send Sign-Off Request (Transition: issued → sent)
**File:** `/frontend/src/app/api/proof/send/route.ts` (NEW)

```typescript
import { NextRequest } from 'next/server';
import { jsonOk, jsonErr } from '@/lib/http';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { recordStateTransition } from '@/lib/signoff-state-machine';
import { withAuth } from '@/lib/auth-server';
import { z } from 'zod';

const SendProofSchema = z.object({
  proof_id: z.string().length(26),
  recipient_email: z.string().email(),
  message: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (userId) => {
    const body = await req.json();
    const { proof_id, recipient_email, message } = SendProofSchema.parse(body);

    const db = getSupabaseAdmin();

    // Verify proof ownership and status
    const { data: proof, error: fetchError } = await db
      .from('proofs')
      .select('*')
      .eq('id', proof_id)
      .single();

    if (fetchError || !proof) {
      return jsonErr('Proof not found', 404);
    }

    if (proof.user_id !== userId) {
      return jsonErr('Unauthorized', 403);
    }

    if (proof.acceptance_status !== 'issued') {
      return jsonErr('Proof must be issued before sending', 400);
    }

    // Update recipient email
    await db
      .from('proofs')
      .update({ recipient_email })
      .eq('id', proof_id);

    // Record state transition
    await recordStateTransition(db, proof_id, {
      from: 'issued',
      to: 'sent',
      notes: message || 'Sign-off request sent',
    });

    // TODO: Send email via service (Resend, SendGrid, etc.)
    // await sendSignOffEmail(recipient_email, proof_id, message);

    return jsonOk({
      proof_id,
      status: 'sent',
      recipient_email,
      sign_off_url: `${process.env.NEXT_PUBLIC_SITE_URL}/signoff/${proof_id}`,
    });
  });
}
```

#### 2.2.3 Accept Delivery (Transition: sent/viewed → accepted)
**File:** `/frontend/src/app/api/proof/accept/route.ts` (NEW)

```typescript
import { NextRequest } from 'next/server';
import { jsonOk, jsonErr } from '@/lib/http';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { recordStateTransition } from '@/lib/signoff-state-machine';
import { z } from 'zod';

const AcceptProofSchema = z.object({
  proof_id: z.string().length(26),
  acceptance_confirmed: z.boolean().refine((v) => v === true, {
    message: 'Must explicitly confirm acceptance',
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { proof_id, acceptance_confirmed } = AcceptProofSchema.parse(body);

  const db = getSupabaseAdmin();

  // Fetch proof
  const { data: proof, error: fetchError } = await db
    .from('proofs')
    .select('*')
    .eq('id', proof_id)
    .single();

  if (fetchError || !proof) {
    return jsonErr('Proof not found', 404);
  }

  const validStatuses = ['sent', 'viewed_no_action'];
  if (!validStatuses.includes(proof.acceptance_status)) {
    return jsonErr('Proof not available for acceptance', 400);
  }

  // Get client info
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                    req.headers.get('x-real-ip') ||
                    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Record acceptance
  await recordStateTransition(db, proof_id, {
    from: proof.acceptance_status,
    to: 'accepted',
    actorIp: clientIp,
    actorUserAgent: userAgent,
    notes: 'Recipient accepted delivery',
  });

  return jsonOk({
    proof_id,
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  });
}
```

#### 2.2.4 Decline Delivery (Transition: sent/viewed → declined)
**File:** `/frontend/src/app/api/proof/decline/route.ts` (NEW)

```typescript
import { NextRequest } from 'next/server';
import { jsonOk, jsonErr } from '@/lib/http';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { recordStateTransition } from '@/lib/signoff-state-machine';
import { z } from 'zod';

const DeclineProofSchema = z.object({
  proof_id: z.string().length(26),
  reason: z.string().min(10).max(500),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { proof_id, reason } = DeclineProofSchema.parse(body);

  const db = getSupabaseAdmin();

  const { data: proof, error: fetchError } = await db
    .from('proofs')
    .select('*')
    .eq('id', proof_id)
    .single();

  if (fetchError || !proof) {
    return jsonErr('Proof not found', 404);
  }

  const validStatuses = ['sent', 'viewed_no_action'];
  if (!validStatuses.includes(proof.acceptance_status)) {
    return jsonErr('Proof not available for decline', 400);
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                    req.headers.get('x-real-ip') ||
                    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  await recordStateTransition(db, proof_id, {
    from: proof.acceptance_status,
    to: 'declined',
    actorIp: clientIp,
    actorUserAgent: userAgent,
    notes: reason,
  });

  return jsonOk({
    proof_id,
    status: 'declined',
    declined_at: new Date().toISOString(),
    reason,
  });
}
```

**Actions:**
- Create all four route handlers
- Add rate limiting (10 req/min for send, 50 req/min for accept/decline)
- Add comprehensive error handling
- Update API documentation

---

### 2.3 PDF Receipt Generator
**File:** `/frontend/src/lib/pdf-generator.ts` (NEW)

```typescript
import { createHash } from 'crypto';
import type { CanonicalProof } from '@/lib/proof-schema';

// Use jsPDF or PDFKit for server-side PDF generation
import { jsPDF } from 'jspdf';

export interface ReceiptData {
  proof: CanonicalProof;
  delivery: {
    file_name: string;
    file_size_bytes?: number;
    delivered_at: string;
    delivered_by: string;
    project_name?: string;
  };
  acceptance?: {
    status: string;
    accepted_at?: string;
    accepted_by_ip?: string;
  };
}

export function generateProofReceiptPDF(data: ReceiptData): Buffer {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('PROOF OF DELIVERY', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text('Verifiable Receipt — Veris Platform', 105, 30, { align: 'center' });

  // Proof Details
  doc.setFontSize(14);
  doc.text('Cryptographic Proof', 20, 50);

  doc.setFontSize(10);
  doc.text(`Proof ID: ${data.proof.proof_id}`, 20, 60);
  doc.text(`SHA-256 Hash: ${data.proof.sha256}`, 20, 67);
  doc.text(`Issued At: ${data.proof.issued_at}`, 20, 74);
  doc.text(`Issuer: ${data.proof.issuer}`, 20, 81);

  // Signature (split for readability)
  doc.text('Digital Signature:', 20, 88);
  const sigLines = splitText(data.proof.signature, 60);
  sigLines.forEach((line, i) => {
    doc.setFont('courier');
    doc.text(line, 25, 95 + i * 7);
  });
  doc.setFont('helvetica');

  // Delivery Details
  doc.setFontSize(14);
  doc.text('Delivery Details', 20, 120);

  doc.setFontSize(10);
  doc.text(`File Name: ${data.delivery.file_name}`, 20, 130);
  if (data.delivery.file_size_bytes) {
    doc.text(`File Size: ${formatBytes(data.delivery.file_size_bytes)}`, 20, 137);
  }
  doc.text(`Delivered By: ${data.delivery.delivered_by}`, 20, 144);
  doc.text(`Delivered At: ${data.delivery.delivered_at}`, 20, 151);
  if (data.delivery.project_name) {
    doc.text(`Project: ${data.delivery.project_name}`, 20, 158);
  }

  // Acceptance Details
  if (data.acceptance?.status === 'accepted') {
    doc.setFontSize(14);
    doc.text('Acceptance Record', 20, 175);

    doc.setFontSize(10);
    doc.text(`Status: ${data.acceptance.status.toUpperCase()}`, 20, 185);
    if (data.acceptance.accepted_at) {
      doc.text(`Accepted At: ${data.acceptance.accepted_at}`, 20, 192);
    }
    if (data.acceptance.accepted_by_ip) {
      doc.text(`Accepted From IP: ${data.acceptance.accepted_by_ip}`, 20, 199);
    }
  }

  // Verification Instructions
  doc.setFontSize(14);
  doc.text('Verification', 20, 220);

  doc.setFontSize(10);
  doc.text('To independently verify this proof:', 20, 230);
  doc.text(`1. Visit: ${process.env.NEXT_PUBLIC_SITE_URL}/check`, 20, 237);
  doc.text('2. Upload the original file or paste this receipt JSON', 20, 244);
  doc.text('3. System will verify hash and signature cryptographically', 20, 251);

  // Footer
  doc.setFontSize(8);
  doc.text('Generated by Veris — Verifiable Proof of Delivery', 105, 280, {
    align: 'center',
  });
  doc.text(`Generated: ${new Date().toISOString()}`, 105, 285, {
    align: 'center',
  });

  return Buffer.from(doc.output('arraybuffer'));
}

function splitText(text: string, maxLength: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < text.length; i += maxLength) {
    result.push(text.slice(i, i + maxLength));
  }
  return result;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
```

**Dependencies to add:**
```bash
pnpm add jspdf
pnpm add -D @types/jspdf
```

**Actions:**
- Create PDF generator module
- Add font embedding for better rendering
- Create endpoint at `/api/proof/[id]/receipt.pdf`
- Test PDF generation with sample data

---

### 2.4 Evidence Pack Export Endpoint
**File:** `/frontend/src/app/api/proof/[id]/export/route.ts` (NEW)

```typescript
import { NextRequest } from 'next/server';
import { jsonErr } from '@/lib/http';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/auth-server';
import { generateProofReceiptPDF } from '@/lib/pdf-generator';
import { renderTemplate } from '@/lib/template-renderer';
import JSZip from 'jszip';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(req, async (userId) => {
    const proofId = params.id;
    const db = getSupabaseAdmin();

    // Fetch proof with all related data
    const { data: proof, error } = await db
      .from('proofs')
      .select('*, acceptance_state_log(*), proof_attachments(*)')
      .eq('id', proofId)
      .single();

    if (error || !proof) {
      return jsonErr('Proof not found', 404);
    }

    if (proof.user_id !== userId) {
      return jsonErr('Unauthorized', 403);
    }

    // Build evidence pack
    const evidencePack = {
      evidence_pack_version: '1.0.0',
      proof: {
        proof_id: proof.proof_id,
        sha256: proof.hash_full,
        issued_at: proof.timestamp,
        signature: proof.signature,
        issuer: process.env.VERIS_ISSUER,
        algorithm: 'Ed25519',
      },
      delivery: {
        file_name: proof.file_name,
        delivered_at: proof.timestamp,
        delivered_by: proof.user_id, // TODO: get user email
        project_name: proof.project,
      },
      acceptance: {
        status: proof.acceptance_status,
        recipient_email: proof.recipient_email,
        accepted_at: proof.accepted_at,
        accepted_by_ip: proof.accepted_by_ip,
        accepted_by_user_agent: proof.accepted_by_user_agent,
        declined_at: proof.declined_at,
        declined_reason: proof.declined_reason,
        state_log: proof.acceptance_state_log.map((log: any) => ({
          timestamp: log.timestamp,
          from_state: log.from_state,
          to_state: log.to_state,
          actor_ip: log.actor_ip,
          actor_user_agent: log.actor_user_agent,
          notes: log.notes,
        })),
      },
      verification_instructions: {
        verify_url: `${process.env.NEXT_PUBLIC_SITE_URL}/check`,
        verify_methods: [
          {
            method: 'file_upload',
            description: 'Upload original file to verify hash',
            endpoint: `${process.env.NEXT_PUBLIC_SITE_URL}/api/verify`,
          },
          {
            method: 'json_paste',
            description: 'Paste receipt JSON for verification',
          },
          {
            method: 'proof_id',
            description: 'Enter proof ID for lookup',
          },
        ],
      },
    };

    // Generate ZIP
    const zip = new JSZip();

    // Add receipt.json
    zip.file('receipt.json', JSON.stringify(evidencePack, null, 2));

    // Add receipt.pdf
    const pdfBuffer = generateProofReceiptPDF({
      proof: proof.proof_json,
      delivery: evidencePack.delivery,
      acceptance: evidencePack.acceptance,
    });
    zip.file('receipt.pdf', pdfBuffer);

    // Add acceptance.log.jsonl
    const logLines = evidencePack.acceptance.state_log
      .map((log) => JSON.stringify(log))
      .join('\n');
    zip.file('acceptance.log.jsonl', logLines);

    // Add mapping templates
    const stripeTemplate = readFileSync(
      join(process.cwd(), 'src/templates/mapping_stripe.json'),
      'utf-8'
    );
    const paypalTemplate = readFileSync(
      join(process.cwd(), 'src/templates/mapping_paypal.json'),
      'utf-8'
    );
    const genericTemplate = readFileSync(
      join(process.cwd(), 'src/templates/mapping_generic.json'),
      'utf-8'
    );

    zip.file(
      'mapping/stripe.json',
      renderTemplate(stripeTemplate, evidencePack)
    );
    zip.file(
      'mapping/paypal.json',
      renderTemplate(paypalTemplate, evidencePack)
    );
    zip.file(
      'mapping/generic.json',
      renderTemplate(genericTemplate, evidencePack)
    );

    // Add verification instructions
    zip.file(
      'VERIFICATION_INSTRUCTIONS.txt',
      `VERIS PROOF VERIFICATION INSTRUCTIONS

This evidence pack contains cryptographically verifiable proof of delivery.

QUICK VERIFICATION:
1. Visit ${process.env.NEXT_PUBLIC_SITE_URL}/check
2. Upload the original file OR paste receipt.json
3. System will verify the SHA-256 hash and Ed25519 signature

EVIDENCE FILES:
- receipt.json: Machine-readable canonical proof
- receipt.pdf: Human-readable proof certificate
- acceptance.log.jsonl: Complete acceptance state history
- mapping/*.json: Payment processor evidence format mappings

HASH VERIFICATION (Manual):
SHA-256: ${evidencePack.proof.sha256}

To manually verify:
  sha256sum [original-file]

The output must exactly match the hash above.

SIGNATURE VERIFICATION:
Ed25519 Signature: ${evidencePack.proof.signature}
Issuer: ${evidencePack.proof.issuer}

This signature proves the hash and timestamp were issued by Veris.

ACCEPTANCE RECORD:
Status: ${evidencePack.acceptance.status}
${evidencePack.acceptance.accepted_at ? `Accepted: ${evidencePack.acceptance.accepted_at}` : ''}
${evidencePack.acceptance.accepted_by_ip ? `From IP: ${evidencePack.acceptance.accepted_by_ip}` : ''}

DISPUTE USE:
See mapping/*.json for payment processor-specific evidence formatting.

Questions? support@verisplatform.com
`
    );

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Return ZIP file
    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="veris-evidence-pack-${proofId}.zip"`,
      },
    });
  });
}
```

**Dependencies to add:**
```bash
pnpm add jszip
pnpm add -D @types/jszip
```

**Actions:**
- Create export endpoint
- Create template renderer at `/frontend/src/lib/template-renderer.ts`
- Add download button to proof detail page
- Test ZIP generation with all files

---

### 2.5 Update Verify API (C2PA Graceful Degradation)
**File:** `/frontend/src/app/api/verify/route.ts` (EDIT)

Add C2PA metadata checking with graceful fallback:

```typescript
// Add after existing verification logic

// Check for C2PA manifest (optional)
let c2paInfo = null;
try {
  // Attempt to extract C2PA manifest
  const c2pa = await import('c2pa-node'); // If available
  const manifest = await c2pa.read(fileBuffer);
  c2paInfo = {
    has_manifest: true,
    claim_generator: manifest.claim_generator,
    thumbnail: manifest.thumbnail,
  };
} catch (err) {
  // C2PA not available or file has no manifest - this is OK
  c2paInfo = {
    has_manifest: false,
    note: 'No Content Credentials found; hash verification still valid',
  };
}

return jsonOk({
  valid: isValid,
  signer: proof.issuer,
  issued_at: proof.issued_at,
  verification_method: 'sha256_ed25519',
  c2pa: c2paInfo,
  latency_ms: Date.now() - startTime,
});
```

**Actions:**
- Add optional C2PA checking
- Ensure verification succeeds without C2PA
- Update response schema to include `c2pa` field
- Document that C2PA is enhancement, not requirement

---

## PHASE 3: FRONTEND UI IMPLEMENTATION

### 3.1 Sign-Off Modal Component
**File:** `/frontend/src/components/SignOffModal.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SignOffModalProps {
  proofId: string;
  fileName: string;
  hash: string;
  onAccept: () => void;
  onDecline: (reason: string) => void;
  onClose: () => void;
}

export function SignOffModal({
  proofId,
  fileName,
  hash,
  onAccept,
  onDecline,
  onClose,
}: SignOffModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      alert('Please confirm acceptance by checking the box');
      return;
    }
    onAccept();
  };

  const handleDecline = async () => {
    if (declineReason.trim().length < 10) {
      alert('Please provide a reason (minimum 10 characters)');
      return;
    }
    onDecline(declineReason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">
          Delivery Sign-Off Request
        </h2>

        <div className="mb-6">
          <p className="mb-2">
            <strong>File:</strong> {fileName}
          </p>
          <p className="mb-2">
            <strong>SHA-256 Hash:</strong>
          </p>
          <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs break-all">
            {hash}
          </code>
        </div>

        {!showDecline ? (
          <>
            <div className="mb-6 border border-gray-300 dark:border-gray-600 rounded p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  I accept delivery of the asset named above at this exact hash
                  (SHA-256: <code className="text-xs">{hash.slice(0, 16)}...</code>).
                  By accepting, I confirm that I have received and verified the
                  delivered asset. This acceptance will be recorded with
                  timestamp, IP address, and user agent for dispute resolution
                  purposes.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAccept}
                disabled={!accepted}
                className="btn-primary flex-1"
              >
                Accept and Record
              </Button>
              <Button
                onClick={() => setShowDecline(true)}
                className="btn-secondary flex-1"
              >
                Decline with Reason
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">
                Reason for declining (minimum 10 characters):
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="textarea w-full h-32"
                placeholder="Please explain why you are declining this delivery..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDecline}
                className="btn-secondary flex-1"
              >
                Submit Decline
              </Button>
              <Button
                onClick={() => setShowDecline(false)}
                className="btn-secondary flex-1"
              >
                Back to Accept
              </Button>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

**Actions:**
- Create modal component
- Add ARIA labels for accessibility
- Style according to design system
- Add keyboard navigation (Escape to close)

---

### 3.2 Sign-Off Page (Recipient View)
**File:** `/frontend/src/app/signoff/[id]/page.tsx` (NEW)

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SignOffModal } from '@/components/SignOffModal';

export default function SignOffPage() {
  const params = useParams();
  const router = useRouter();
  const proofId = params.id as string;

  const [proof, setProof] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProof();
  }, [proofId]);

  async function fetchProof() {
    try {
      const res = await fetch(`/api/proof/${proofId}`);
      if (!res.ok) throw new Error('Proof not found');
      const data = await res.json();
      setProof(data);
    } catch (err) {
      setError('Failed to load proof');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    try {
      const res = await fetch('/api/proof/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof_id: proofId,
          acceptance_confirmed: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to accept');

      router.push(`/signoff/${proofId}/accepted`);
    } catch (err) {
      alert('Failed to record acceptance. Please try again.');
    }
  }

  async function handleDecline(reason: string) {
    try {
      const res = await fetch('/api/proof/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof_id: proofId,
          reason,
        }),
      });

      if (!res.ok) throw new Error('Failed to decline');

      router.push(`/signoff/${proofId}/declined`);
    } catch (err) {
      alert('Failed to record decline. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || 'Proof not found'}</p>
      </div>
    );
  }

  return (
    <SignOffModal
      proofId={proofId}
      fileName={proof.file_name}
      hash={proof.hash_full}
      onAccept={handleAccept}
      onDecline={handleDecline}
      onClose={() => router.push('/')}
    />
  );
}
```

**Create confirmation pages:**
- `/frontend/src/app/signoff/[id]/accepted/page.tsx`
- `/frontend/src/app/signoff/[id]/declined/page.tsx`

**Actions:**
- Create sign-off page
- Create confirmation pages
- Add OG meta tags for social sharing
- Test full sign-off flow

---

### 3.3 Update Homepage Copy
**File:** `/frontend/src/app/page.tsx` (EDIT)

Replace hero section with A/B test variants:

```typescript
// Add at top of file
const HEADLINE_VARIANTS = {
  a: {
    h1: 'Proof of Delivery, verifiable.',
    subtitle: 'Hash, timestamp, and sign every delivery. Capture acceptance. Export evidence for banks and platforms.',
  },
  b: {
    h1: 'Verifiable proof you delivered, exactly.',
    subtitle: 'Hash, timestamp, and sign every delivery. Capture acceptance. Export evidence for banks and platforms.',
  },
};

// In component, select variant (can use A/B test cookie or randomize)
const variant = HEADLINE_VARIANTS.a; // or .b

return (
  <main>
    <section className="hero">
      <h1 className="text-5xl font-bold mb-4">{variant.h1}</h1>
      <p className="text-xl mb-8">{variant.subtitle}</p>

      {/* Trust Explainer Bullets */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div>
          <h3 className="font-semibold mb-2">Hash the file</h3>
          <p className="text-sm">SHA-256 creates unique fingerprint</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Timestamp the proof</h3>
          <p className="text-sm">Cryptographically signed with Ed25519</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Link to exact version</h3>
          <p className="text-sm">No ambiguity about what was delivered</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Record acceptance</h3>
          <p className="text-sm">Capture recipient sign-off with IP and timestamp</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Verify anywhere</h3>
          <p className="text-sm">Works even if metadata is stripped</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Optional Content Credentials</h3>
          <p className="text-sm">Always verifiable by hash</p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex gap-4 justify-center">
        <a href="/close" className="btn-primary">
          Create proof + request sign-off
        </a>
        <a href="/check" className="btn-secondary">
          Verify a file
        </a>
      </div>
    </section>

    {/* Objection Handling Section */}
    <section className="mt-16 bg-gray-50 dark:bg-gray-900 p-8 rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Common Questions</h2>

      <div className="space-y-4">
        <details className="cursor-pointer">
          <summary className="font-semibold">
            Will this help with chargebacks?
          </summary>
          <p className="mt-2 text-sm">
            Yes. Evidence packs export in formats aligned to card-network
            guidelines (Stripe, PayPal). Shows clear proof of delivery and
            acceptance.
          </p>
        </details>

        <details className="cursor-pointer">
          <summary className="font-semibold">
            What if metadata is stripped?
          </summary>
          <p className="mt-2 text-sm">
            Hash verification works even without metadata. We use SHA-256
            content hashing, not file metadata. Your proof remains verifiable
            regardless of file transformations.
          </p>
        </details>

        <details className="cursor-pointer">
          <summary className="font-semibold">
            Is acceptance legally clear?
          </summary>
          <p className="mt-2 text-sm">
            Yes. Recipient explicitly accepts the exact file hash and timestamp.
            We record IP address, user agent, and exact acceptance time for
            dispute evidence.
          </p>
        </details>

        <details className="cursor-pointer">
          <summary className="font-semibold">
            How is this different from Content Credentials?
          </summary>
          <p className="mt-2 text-sm">
            Content Credentials (C2PA) are optional enhancement. Our core
            verification uses SHA-256 + Ed25519, which works even if C2PA
            metadata is stripped. We support both approaches.
          </p>
        </details>
      </div>
    </section>
  </main>
);
```

**Actions:**
- Update homepage with new copy
- Add objection handling section
- Consider A/B test framework (PostHog, Vercel Edge Config)
- Test readability and WCAG compliance

---

### 3.4 Update Footer
**File:** `/frontend/src/components/footer.tsx` (EDIT)

Simplify footer to only show support email:

```typescript
export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 py-6 mt-12">
      <div className="container mx-auto text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Questions or issues?{' '}
          <a
            href="mailto:support@verisplatform.com"
            className="underline hover:text-gray-900 dark:hover:text-gray-100"
          >
            support@verisplatform.com
          </a>
        </p>
      </div>
    </footer>
  );
}
```

---

## PHASE 4: TESTING & VALIDATION

### 4.1 E2E Tests for Sign-Off Flow
**File:** `/frontend/e2e/signoff-flow.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sign-off flow', () => {
  test('complete sign-off acceptance', async ({ page }) => {
    // 1. Create proof
    await page.goto('/close');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-fixtures/sample.pdf');

    await page.click('button:has-text("Create Proof")');

    // Wait for proof creation
    await page.waitForSelector('text=/Proof ID:/');
    const proofId = await page.locator('[data-testid="proof-id"]').textContent();

    // 2. Issue proof
    await page.click('button:has-text("Issue Proof")');
    await expect(page.locator('text=/Status: issued/')).toBeVisible();

    // 3. Send sign-off request
    await page.click('button:has-text("Send Sign-Off Request")');
    await page.fill('input[name="recipient_email"]', 'recipient@example.com');
    await page.click('button:has-text("Send")');

    const signOffUrl = await page.locator('[data-testid="signoff-url"]').textContent();

    // 4. Recipient accepts (simulate in new context)
    await page.goto(signOffUrl!);

    await expect(page.locator('h2:has-text("Delivery Sign-Off Request")')).toBeVisible();

    // Check acceptance box
    await page.check('input[type="checkbox"]');

    // Accept
    await page.click('button:has-text("Accept and Record")');

    // Verify confirmation page
    await expect(page.locator('text=/accepted/i')).toBeVisible();
  });

  test('decline with reason', async ({ page }) => {
    // ... similar flow, but click "Decline with Reason"
    await page.click('button:has-text("Decline with Reason")');
    await page.fill('textarea', 'This file does not match what we agreed upon.');
    await page.click('button:has-text("Submit Decline")');

    await expect(page.locator('text=/declined/i')).toBeVisible();
  });
});
```

**Actions:**
- Create E2E tests for full sign-off flow
- Add test fixtures (sample files)
- Test both acceptance and decline paths
- Add to CI pipeline

---

### 4.2 Export Evidence Pack Test
**File:** `/frontend/e2e/evidence-export.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test.describe('Evidence pack export', () => {
  test('export contains all required files', async ({ page }) => {
    // Create and accept proof (reuse helpers)
    const proofId = await createAndAcceptProof(page);

    // Navigate to proof detail
    await page.goto(`/proof/${proofId}`);

    // Download evidence pack
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export Evidence Pack")');
    const download = await downloadPromise;

    // Verify ZIP contents
    const buffer = await download.createReadStream();
    const zip = await JSZip.loadAsync(buffer);

    // Check required files
    expect(zip.file('receipt.json')).toBeTruthy();
    expect(zip.file('receipt.pdf')).toBeTruthy();
    expect(zip.file('acceptance.log.jsonl')).toBeTruthy();
    expect(zip.file('mapping/stripe.json')).toBeTruthy();
    expect(zip.file('mapping/paypal.json')).toBeTruthy();
    expect(zip.file('mapping/generic.json')).toBeTruthy();
    expect(zip.file('VERIFICATION_INSTRUCTIONS.txt')).toBeTruthy();

    // Validate receipt.json structure
    const receiptJson = await zip.file('receipt.json')!.async('string');
    const receipt = JSON.parse(receiptJson);

    expect(receipt.evidence_pack_version).toBe('1.0.0');
    expect(receipt.proof).toBeDefined();
    expect(receipt.delivery).toBeDefined();
    expect(receipt.acceptance).toBeDefined();
    expect(receipt.verification_instructions).toBeDefined();
  });
});
```

---

### 4.3 Accessibility Tests
**File:** `/frontend/src/__tests__/a11y-signoff.test.ts` (NEW)

Run pa11y on sign-off pages:

```typescript
import { test } from '@jest/globals';
import pa11y from 'pa11y';

test('sign-off modal meets WCAG 2.2 AA', async () => {
  const results = await pa11y('http://localhost:3000/signoff/test-id', {
    standard: 'WCAG2AA',
    runners: ['axe'],
  });

  expect(results.issues.filter((i) => i.type === 'error')).toHaveLength(0);
});
```

**Actions:**
- Add pa11y tests for new pages
- Verify keyboard navigation
- Test screen reader compatibility
- Run axe-core accessibility checks

---

### 4.4 Lighthouse Performance Tests
**File:** `/.github/workflows/web_quality.yml` (EDIT)

Add sign-off page to Lighthouse audits:

```yaml
- name: Run Lighthouse on sign-off page
  run: |
    npx lighthouse http://localhost:3000/signoff/demo \
      --output=json \
      --output-path=./lighthouse-signoff.json \
      --chrome-flags="--headless --no-sandbox"

    # Check scores
    node scripts/check-lighthouse-scores.js lighthouse-signoff.json
```

---

## PHASE 5: DEPLOYMENT & DOCUMENTATION

### 5.1 Environment Variables
**File:** `/frontend/.env.example` (EDIT)

Add new environment variables:

```bash
# Email service (for sign-off notifications)
RESEND_API_KEY=re_***
SENDGRID_API_KEY=SG.***

# Feature flags
ENABLE_SIGNOFF_FLOW=true
ENABLE_EVIDENCE_EXPORT=true
ENABLE_C2PA_CHECK=false
```

---

### 5.2 API Documentation
**File:** `/frontend/public/api-docs.yaml` (EDIT)

Add new endpoints to OpenAPI spec:

```yaml
/api/proof/issue:
  post:
    summary: Issue proof (draft → issued)
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [proof_id]
            properties:
              proof_id:
                type: string
                example: '01H8XXXXXXXXXXXXXXXXXX'
    responses:
      200:
        description: Proof issued successfully

/api/proof/send:
  post:
    summary: Send sign-off request (issued → sent)
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [proof_id, recipient_email]
            properties:
              proof_id: { type: string }
              recipient_email: { type: string, format: email }
              message: { type: string, maxLength: 500 }

/api/proof/accept:
  post:
    summary: Accept delivery (sent → accepted)
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [proof_id, acceptance_confirmed]
            properties:
              proof_id: { type: string }
              acceptance_confirmed: { type: boolean }

/api/proof/decline:
  post:
    summary: Decline delivery (sent → declined)
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [proof_id, reason]
            properties:
              proof_id: { type: string }
              reason: { type: string, minLength: 10, maxLength: 500 }

/api/proof/{id}/export:
  get:
    summary: Export evidence pack as ZIP
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string }
    responses:
      200:
        description: ZIP file download
        content:
          application/zip:
            schema:
              type: string
              format: binary
```

---

### 5.3 SDK Updates
**File:** `/packages/sdk-js/src/client.ts` (EDIT)

Add new SDK methods:

```typescript
export class VerisClient {
  // ... existing methods

  async issueProof(proofId: string): Promise<{ proof_id: string; status: string }> {
    const res = await this.http.post('/api/proof/issue', { proof_id: proofId });
    return res.data;
  }

  async sendSignOffRequest(
    proofId: string,
    recipientEmail: string,
    message?: string
  ): Promise<{ sign_off_url: string }> {
    const res = await this.http.post('/api/proof/send', {
      proof_id: proofId,
      recipient_email: recipientEmail,
      message,
    });
    return res.data;
  }

  async acceptProof(proofId: string): Promise<{ accepted_at: string }> {
    const res = await this.http.post('/api/proof/accept', {
      proof_id: proofId,
      acceptance_confirmed: true,
    });
    return res.data;
  }

  async declineProof(proofId: string, reason: string): Promise<{ declined_at: string }> {
    const res = await this.http.post('/api/proof/decline', {
      proof_id: proofId,
      reason,
    });
    return res.data;
  }

  async exportEvidencePack(proofId: string): Promise<Blob> {
    const res = await this.http.get(`/api/proof/${proofId}/export`, {
      responseType: 'blob',
    });
    return res.data;
  }
}
```

**Actions:**
- Update SDK client
- Add TypeScript types for new methods
- Update SDK documentation
- Publish new SDK version

---

## PHASE 6: MONITORING & ITERATION

### 6.1 Telemetry Events
**File:** `/frontend/src/lib/usage-telemetry.ts` (EDIT)

Add new telemetry events:

```typescript
export async function recordSignOffEvent(
  event: 'issued' | 'sent' | 'accepted' | 'declined',
  proofId: string,
  metadata?: Record<string, any>
) {
  await recordTelemetry('signoff_event', {
    proof_id: proofId,
    event,
    ...metadata,
  });
}

export async function recordEvidenceExport(proofId: string) {
  await recordTelemetry('evidence_pack_export', {
    proof_id: proofId,
  });
}
```

**Actions:**
- Add telemetry tracking to all new endpoints
- Create dashboard to monitor sign-off completion rates
- Track evidence pack downloads
- Monitor decline reasons (aggregate for insights)

---

### 6.2 A/B Test Configuration
**File:** `/frontend/src/lib/ab-test.ts` (NEW)

```typescript
import { cookies } from 'next/headers';

export function getHeadlineVariant(): 'a' | 'b' {
  const cookieStore = cookies();
  const variant = cookieStore.get('headline_variant');

  if (variant) {
    return variant.value as 'a' | 'b';
  }

  // Random assignment (50/50)
  const newVariant = Math.random() < 0.5 ? 'a' : 'b';
  cookieStore.set('headline_variant', newVariant, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return newVariant;
}
```

**Actions:**
- Implement A/B test for homepage headlines
- Track conversion rates (proof creation, sign-off completion)
- Run for 2 weeks or 1000 users minimum
- Analyze results with PostHog or similar

---

## SUMMARY: CURSOR EXECUTION CHECKLIST

### Files to Create (21 new files)
- [ ] `/frontend/src/schema/evidence_pack.schema.json`
- [ ] `/frontend/src/types/evidence-pack.ts`
- [ ] `/frontend/src/templates/mapping_stripe.json`
- [ ] `/frontend/src/templates/mapping_paypal.json`
- [ ] `/frontend/src/templates/mapping_generic.json`
- [ ] `/supabase/migrations/20250129_signoff_flow.sql`
- [ ] `/frontend/src/lib/signoff-state-machine.ts`
- [ ] `/frontend/src/app/api/proof/issue/route.ts`
- [ ] `/frontend/src/app/api/proof/send/route.ts`
- [ ] `/frontend/src/app/api/proof/accept/route.ts`
- [ ] `/frontend/src/app/api/proof/decline/route.ts`
- [ ] `/frontend/src/lib/pdf-generator.ts`
- [ ] `/frontend/src/app/api/proof/[id]/export/route.ts`
- [ ] `/frontend/src/lib/template-renderer.ts`
- [ ] `/frontend/src/components/SignOffModal.tsx`
- [ ] `/frontend/src/app/signoff/[id]/page.tsx`
- [ ] `/frontend/src/app/signoff/[id]/accepted/page.tsx`
- [ ] `/frontend/src/app/signoff/[id]/declined/page.tsx`
- [ ] `/frontend/e2e/signoff-flow.spec.ts`
- [ ] `/frontend/e2e/evidence-export.spec.ts`
- [ ] `/frontend/src/lib/ab-test.ts`

### Files to Edit (10 existing files)
- [ ] `/frontend/src/app/api/verify/route.ts` (add C2PA graceful degradation)
- [ ] `/frontend/src/app/page.tsx` (update homepage copy and A/B variants)
- [ ] `/frontend/src/components/footer.tsx` (simplify footer)
- [ ] `/frontend/src/lib/db-types.ts` (regenerate after migration)
- [ ] `/frontend/.env.example` (add new env vars)
- [ ] `/frontend/public/api-docs.yaml` (add new endpoints)
- [ ] `/packages/sdk-js/src/client.ts` (add new SDK methods)
- [ ] `/packages/sdk-js/src/types.ts` (add new types)
- [ ] `/frontend/src/lib/usage-telemetry.ts` (add new events)
- [ ] `/.github/workflows/web_quality.yml` (add sign-off page audit)

### Dependencies to Install
```bash
pnpm add jspdf jszip
pnpm add -D @types/jspdf @types/jszip
```

### Commands to Run
```bash
# Run database migration
pnpm supabase migration up

# Regenerate TypeScript types
pnpm supabase gen types typescript --project-id <project-id> > frontend/src/lib/db-types.ts

# Run all tests
pnpm test
pnpm test:e2e

# Run accessibility audits
pnpm test:a11y

# Build and verify
pnpm build
pnpm start
```

### Expected Outcomes
1. **Portable Proof Receipts:** Users can export evidence packs as ZIP files with JSON, PDF, and processor mappings
2. **Sign-Off Flow:** Complete state machine for tracking delivery acceptance/decline
3. **Dispute-Ready Evidence:** Formatted for Stripe, PayPal, and generic court submissions
4. **C2PA Graceful Degradation:** Verification works with or without Content Credentials
5. **Updated Messaging:** Homepage reflects user research insights
6. **Performance Maintained:** Lighthouse scores remain 95+
7. **Accessibility Preserved:** WCAG 2.2 AA compliance verified

---

## INTEGRATION NOTES

**Critical Path Dependencies:**
1. Database migration MUST run before API endpoints are deployed
2. PDF generator requires font assets (include in build)
3. Template renderer needs mapping JSON files to exist
4. Sign-off flow requires email service configuration (Resend or SendGrid)

**Backward Compatibility:**
- All existing proof creation and verification flows remain unchanged
- New sign-off fields are optional (nullable in database)
- Existing proofs default to 'draft' status

**Rollout Strategy:**
1. Deploy database migration + backend APIs first
2. Enable sign-off UI behind feature flag
3. A/B test homepage copy changes
4. Monitor telemetry for 2 weeks
5. Iterate based on user feedback

---

This build plan translates every field research insight into concrete, executable Cursor instructions that integrate cleanly with the existing Veris MVP architecture. Each file path, function signature, and database column is specified for immediate implementation.
