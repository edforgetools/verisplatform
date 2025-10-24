-- Create snapshot_meta table for registry snapshots
-- This table tracks deterministic snapshots every 1,000 proofs

begin;

-- Create snapshot_meta table
create table if not exists public.snapshot_meta (
  id bigserial primary key,
  batch int unique not null,
  count int not null,
  merkle_root text not null,
  s3_url text not null,
  arweave_txid text null,
  created_at timestamptz default now()
);

-- Add indexes for efficient queries
create index if not exists snapshot_meta_batch_idx on public.snapshot_meta (batch);
create index if not exists snapshot_meta_created_at_idx on public.snapshot_meta (created_at);

-- Add comments
comment on table public.snapshot_meta is 'Registry snapshot metadata for every 1,000 proofs';
comment on column public.snapshot_meta.batch is 'Batch number (total_proofs / 1000)';
comment on column public.snapshot_meta.count is 'Number of proofs in this batch (should be 1000)';
comment on column public.snapshot_meta.merkle_root is 'Merkle root hash of the batch';
comment on column public.snapshot_meta.s3_url is 'S3 URL of the snapshot manifest';
comment on column public.snapshot_meta.arweave_txid is 'Arweave transaction ID (null until published)';

-- Enable RLS
alter table public.snapshot_meta enable row level security;

-- Allow public read access to snapshot metadata
create policy "snapshot_meta: public read" on public.snapshot_meta for select using (true);

-- Allow service role full access
create policy "snapshot_meta: service role full access" on public.snapshot_meta for all using (true) with check (true);

commit;
