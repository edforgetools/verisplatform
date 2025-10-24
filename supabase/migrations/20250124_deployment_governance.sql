-- Create deployment_logs table for tracking deployments
CREATE TABLE IF NOT EXISTS deployment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  version TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  branch TEXT NOT NULL,
  deployed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deployed_by TEXT NOT NULL,
  vercel_deployment_id TEXT,
  aws_region TEXT NOT NULL,
  s3_bucket TEXT NOT NULL,
  oidc_enabled BOOLEAN NOT NULL DEFAULT false,
  encryption_enabled BOOLEAN NOT NULL DEFAULT false,
  versioning_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(environment, version, deployed_at)
);

-- Create governance_violations table for tracking governance policy violations
CREATE TABLE IF NOT EXISTS governance_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource TEXT NOT NULL,
  violation TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_governance_violations_severity ON governance_violations(severity),
  INDEX idx_governance_violations_timestamp ON governance_violations(timestamp),
  INDEX idx_governance_violations_resource ON governance_violations(resource)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deployment_logs_environment ON deployment_logs(environment);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployed_at ON deployment_logs(deployed_at);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_version ON deployment_logs(version);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_branch ON deployment_logs(branch);

-- Enable RLS
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read access for transparency)
CREATE POLICY "Anyone can view deployment logs" ON deployment_logs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view governance violations" ON governance_violations
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage deployment logs" ON deployment_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage governance violations" ON governance_violations
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON deployment_logs TO authenticated;
GRANT ALL ON deployment_logs TO service_role;
GRANT SELECT ON governance_violations TO authenticated;
GRANT ALL ON governance_violations TO service_role;
