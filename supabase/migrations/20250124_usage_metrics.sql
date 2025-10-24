-- Create usage_metrics table for tracking proof issuance and verification counts
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proof_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('proof.create', 'proof.verify', 'proof.view', 'api.call')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Indexes
  CONSTRAINT usage_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_metrics_event_type ON usage_metrics(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_timestamp ON usage_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_proof_id ON usage_metrics(proof_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_event_timestamp ON usage_metrics(event_type, timestamp);

-- Create weekly_summaries table for automated weekly summaries
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_proofs_created INTEGER DEFAULT 0,
  total_proofs_verified INTEGER DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  top_users JSONB DEFAULT '[]',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique weekly summaries
  UNIQUE(week_start, week_end)
);

-- Create indexes for weekly summaries
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_start ON weekly_summaries(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_end ON weekly_summaries(week_end);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_generated_at ON weekly_summaries(generated_at);

-- Enable RLS
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for usage_metrics
CREATE POLICY "Users can view their own usage metrics" ON usage_metrics
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own usage metrics" ON usage_metrics
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

-- Create RLS policies for weekly_summaries (public read)
CREATE POLICY "Anyone can view weekly summaries" ON weekly_summaries
  FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON usage_metrics TO authenticated;
GRANT ALL ON usage_metrics TO service_role;
GRANT SELECT ON weekly_summaries TO authenticated;
GRANT ALL ON weekly_summaries TO service_role;
