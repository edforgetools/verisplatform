-- Create recovery_audit_logs table for tracking recovery audit summaries
CREATE TABLE IF NOT EXISTS recovery_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_audited INTEGER NOT NULL DEFAULT 0,
  successful_recoveries INTEGER NOT NULL DEFAULT 0,
  failed_recoveries INTEGER NOT NULL DEFAULT 0,
  hash_mismatches INTEGER NOT NULL DEFAULT 0,
  signature_failures INTEGER NOT NULL DEFAULT 0,
  source_breakdown JSONB DEFAULT '{}',
  errors TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(audit_date)
);

-- Create recovery_audit_results table for tracking individual audit results
CREATE TABLE IF NOT EXISTS recovery_audit_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  proof_id TEXT NOT NULL,
  original_hash TEXT NOT NULL,
  recovered_hash TEXT NOT NULL,
  hash_match BOOLEAN NOT NULL DEFAULT false,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL CHECK (source IN ('s3', 'arweave', 'database')),
  recovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  errors TEXT[] DEFAULT '{}',
  
  -- Indexes
  CONSTRAINT recovery_audit_results_proof_id_fkey FOREIGN KEY (proof_id) REFERENCES proofs(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recovery_audit_logs_audit_date ON recovery_audit_logs(audit_date);
CREATE INDEX IF NOT EXISTS idx_recovery_audit_logs_created_at ON recovery_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_recovery_audit_results_audit_date ON recovery_audit_results(audit_date);
CREATE INDEX IF NOT EXISTS idx_recovery_audit_results_proof_id ON recovery_audit_results(proof_id);
CREATE INDEX IF NOT EXISTS idx_recovery_audit_results_hash_match ON recovery_audit_results(hash_match);
CREATE INDEX IF NOT EXISTS idx_recovery_audit_results_signature_valid ON recovery_audit_results(signature_valid);
CREATE INDEX IF NOT EXISTS idx_recovery_audit_results_source ON recovery_audit_results(source);

-- Enable RLS
ALTER TABLE recovery_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_audit_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read access for transparency)
CREATE POLICY "Anyone can view recovery audit logs" ON recovery_audit_logs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view recovery audit results" ON recovery_audit_results
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage recovery audit logs" ON recovery_audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage recovery audit results" ON recovery_audit_results
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON recovery_audit_logs TO authenticated;
GRANT ALL ON recovery_audit_logs TO service_role;
GRANT SELECT ON recovery_audit_results TO authenticated;
GRANT ALL ON recovery_audit_results TO service_role;
