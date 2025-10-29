import { z } from "zod";

// Evidence Pack Schema
export const EvidencePackSchema = z.object({
  evidence_pack_version: z.literal("1.0.0"),
  proof: z.object({
    proof_id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    issued_at: z.string().datetime(),
    signature: z.string().regex(/^ed25519:/),
    issuer: z.string(),
    algorithm: z.literal("Ed25519"),
  }),
  delivery: z.object({
    file_name: z.string(),
    file_size_bytes: z.number().int().min(0).optional(),
    mime_type: z.string().optional(),
    delivered_at: z.string().datetime(),
    delivered_by: z.string().email(),
    project_name: z.string().optional(),
    version: z.string().optional(),
  }),
  acceptance: z.object({
    status: z.enum([
      "draft",
      "issued",
      "sent",
      "viewed_no_action",
      "accepted",
      "declined",
      "expired",
    ]),
    recipient_email: z.string().email().optional(),
    accepted_at: z.string().datetime().optional(),
    accepted_by_ip: z.string().optional(),
    accepted_by_user_agent: z.string().optional(),
    declined_at: z.string().datetime().optional(),
    declined_reason: z.string().optional(),
    state_log: z.array(
      z.object({
        timestamp: z.string().datetime(),
        from_state: z.string(),
        to_state: z.string(),
        actor_ip: z.string().optional(),
        actor_user_agent: z.string().optional(),
        notes: z.string().optional(),
      }),
    ),
  }),
  content_credentials: z
    .object({
      has_c2pa_manifest: z.boolean().optional(),
      manifest_url: z.string().url().optional(),
      claim_generator: z.string().optional(),
      thumbnail_claim: z.string().optional(),
    })
    .optional(),
  verification_instructions: z.object({
    verify_url: z.string().url(),
    verify_methods: z.array(
      z.object({
        method: z.string(),
        description: z.string(),
        endpoint: z.string().optional(),
      }),
    ),
  }),
  dispute_mapping: z
    .object({
      stripe: z.record(z.string(), z.any()).optional(),
      paypal: z.record(z.string(), z.any()).optional(),
      generic: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
  attachments: z
    .array(
      z.object({
        file_name: z.string(),
        description: z.string(),
        sha256: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      }),
    )
    .optional(),
});

export type EvidencePack = z.infer<typeof EvidencePackSchema>;

// State Machine Types
export const AcceptanceState = z.enum([
  "draft",
  "issued",
  "sent",
  "viewed_no_action",
  "accepted",
  "declined",
  "expired",
]);

export type AcceptanceState = z.infer<typeof AcceptanceState>;

export const StateTransition = z.object({
  from: AcceptanceState,
  to: AcceptanceState,
  actorIp: z.string().optional(),
  actorUserAgent: z.string().optional(),
  notes: z.string().optional(),
});

export type StateTransition = z.infer<typeof StateTransition>;

// Validation function
export function validateEvidencePack(data: unknown): EvidencePack {
  return EvidencePackSchema.parse(data);
}
