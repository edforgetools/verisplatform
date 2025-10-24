-- Create snapshot_meta table for tracking registry snapshots
CREATE TABLE IF NOT EXISTS snapshot_meta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch INTEGER NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  merkle_root TEXT NOT NULL,
  s3_url TEXT NOT NULL,
  arweave_txid TEXT,
  arweave_url TEXT,
  integrity_verified BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(batch)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_snapshot_meta_batch ON snapshot_meta(batch);
CREATE INDEX IF NOT EXISTS idx_snapshot_meta_published_at ON snapshot_meta(published_at);
CREATE INDEX IF NOT EXISTS idx_snapshot_meta_integrity_verified ON snapshot_meta(integrity_verified);

-- Enable RLS
ALTER TABLE snapshot_meta ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read access for transparency)
CREATE POLICY "Anyone can view snapshot metadata" ON snapshot_meta
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage snapshot metadata" ON snapshot_meta
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON snapshot_meta TO authenticated;
GRANT ALL ON snapshot_meta TO service_role;
