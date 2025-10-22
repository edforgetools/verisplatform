-- VERIS: schema + RLS + triggers (idempotent)
begin;

-- ---------- SCHEMA ----------
create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  stripe_customer_id text,
  role text default 'user',
  created_at timestamptz default now()
);

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  version int not null default 1,
  hash_full text not null,
  hash_prefix text not null,
  signature text not null,
  timestamp timestamptz not null,
  project text,
  visibility text not null default 'public', -- public | private
  anchor_txid text,
  created_at timestamptz default now()
);

create index if not exists proofs_user_id_idx   on public.proofs (user_id);
create index if not exists proofs_hash_prefix_idx on public.proofs (hash_prefix);
create index if not exists proofs_created_at_idx on public.proofs (created_at);

create table if not exists public.billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_subscription_id text,
  tier text,   -- free | pro | team
  status text,
  updated_at timestamptz default now()
);

create table if not exists public.telemetry (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  event text not null,
  value numeric,
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists public.telemetry_daily (
  id bigserial primary key,
  date date not null default current_date,
  event text not null,
  count numeric not null default 0,
  unique_users numeric not null default 0,
  meta jsonb,
  created_at timestamptz default now(),
  unique(date, event)
);

-- ---------- RLS RESET ----------
alter table public.app_users  enable row level security;
alter table public.billing    enable row level security;
alter table public.proofs     enable row level security;
alter table public.telemetry  enable row level security;
alter table public.telemetry_daily enable row level security;

-- drop any existing policies on these tables
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('app_users','billing','proofs','telemetry','telemetry_daily')
  loop
    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
  end loop;
end$$;

-- recreate final policies
-- app_users
create policy "Users can view their own record"
  on public.app_users for select
  using (auth.uid() = user_id);

create policy "Service role full access (app_users)"
  on public.app_users for all
  using (true) with check (true);

-- billing
create policy "Users can view their own billing"
  on public.billing for select
  using (auth.uid() = user_id);

create policy "Service role full access (billing)"
  on public.billing for all
  using (true) with check (true);

-- proofs
create policy "Users can manage their own proofs"
  on public.proofs for all
  using (auth.uid() = user_id);

create policy "Public can read public proofs"
  on public.proofs for select
  using (visibility = 'public');

-- telemetry
create policy "Users can manage their own telemetry"
  on public.telemetry for all
  using (auth.uid() = user_id);

create policy "Service role full access (telemetry)"
  on public.telemetry for all
  using (true) with check (true);

-- telemetry_daily
create policy "Service role full access (telemetry_daily)"
  on public.telemetry_daily for all
  using (true) with check (true);

-- ---------- TRIGGERS (auth → app_users sync) ----------
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;
drop function if exists public.handle_new_user cascade;
drop function if exists public.handle_user_updated cascade;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.app_users (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$fn$;

create function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.app_users set email = new.email where user_id = new.id;
  return new;
end;
$fn$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create trigger on_auth_user_updated
after update of email on auth.users
for each row execute procedure public.handle_user_updated();

-- Additional telemetry_daily table for job tracking
create table if not exists public.telemetry_daily_jobs (
  id bigserial primary key,
  ran_at_utc timestamptz not null default now(),
  ok boolean not null default true
);

commit;

-- ---------- VERIFY ----------
select policyname, tablename, cmd
from pg_policies
where schemaname='public'
order by tablename, policyname;
