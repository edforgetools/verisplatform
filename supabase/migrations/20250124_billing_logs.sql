-- Create billing_logs table for tracking proof creation payments
CREATE TABLE IF NOT EXISTS billing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  proof_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0, -- Amount in cents
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  
  -- Indexes
  CONSTRAINT billing_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(transaction_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_logs_user_id ON billing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_logs_proof_id ON billing_logs(proof_id);
CREATE INDEX IF NOT EXISTS idx_billing_logs_transaction_id ON billing_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_billing_logs_status ON billing_logs(status);
CREATE INDEX IF NOT EXISTS idx_billing_logs_created_at ON billing_logs(created_at);

-- Enable RLS
ALTER TABLE billing_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own billing logs" ON billing_logs
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own billing logs" ON billing_logs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own billing logs" ON billing_logs
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON billing_logs TO authenticated;
GRANT ALL ON billing_logs TO service_role;
