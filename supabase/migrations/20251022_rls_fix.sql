-- RLS
alter table public.app_users  enable row level security;
alter table public.billing    enable row level security;
alter table public.proofs     enable row level security;

drop policy if exists "app_users: select self" on public.app_users;
create policy "app_users: select self" on public.app_users for select using (auth.uid() = user_id);

drop policy if exists "billing: select self" on public.billing;
create policy "billing: select self" on public.billing for select using (auth.uid() = user_id);

drop policy if exists "proofs: select own"  on public.proofs;
drop policy if exists "proofs: insert own"  on public.proofs;
drop policy if exists "proofs: update own"  on public.proofs;
drop policy if exists "proofs: delete own"  on public.proofs;
drop policy if exists "proofs: public read" on public.proofs;

create policy "proofs: select own"  on public.proofs for select using (auth.uid() = user_id);
create policy "proofs: insert own"  on public.proofs for insert with check (auth.uid() = user_id);
create policy "proofs: update own"  on public.proofs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "proofs: delete own"  on public.proofs for delete using (auth.uid() = user_id);
create policy "proofs: public read" on public.proofs for select using (visibility = 'public');

-- constraints
alter table public.billing drop constraint if exists billing_tier_chk;
alter table public.billing add constraint billing_tier_chk check (tier in ('free','pro','team'));

create unique index if not exists proofs_unique_user_hash on public.proofs(user_id, hash_full);
