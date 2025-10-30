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
