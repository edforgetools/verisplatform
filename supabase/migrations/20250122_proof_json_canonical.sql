-- Add proof_json field to store canonical proof JSON
-- This migration adds the canonical proof JSON field to the proofs table

begin;

-- Add proof_json column to store canonical JSON
alter table public.proofs 
add column if not exists proof_json jsonb;

-- Add index for proof_json queries
create index if not exists proofs_proof_json_idx on public.proofs using gin (proof_json);

-- Add comment explaining the field
comment on column public.proofs.proof_json is 'Canonical proof JSON according to schema v1';

commit;
