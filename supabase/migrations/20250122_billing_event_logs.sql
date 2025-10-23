-- Create billing_event_logs table for webhook idempotency
begin;

create table if not exists public.billing_event_logs (
  event_id text primary key,
  processed_at timestamptz not null default now(),
  event_type text not null,
  stripe_subscription_id text,
  user_id uuid references auth.users(id) on delete cascade
);

-- Enable RLS
alter table public.billing_event_logs enable row level security;

-- Service role has full access for webhook processing
create policy "Service role full access (billing_event_logs)"
  on public.billing_event_logs for all
  using (true) with check (true);

-- Add index for performance
create index if not exists billing_event_logs_processed_at_idx 
  on public.billing_event_logs (processed_at);

create index if not exists billing_event_logs_user_id_idx 
  on public.billing_event_logs (user_id);

commit;
