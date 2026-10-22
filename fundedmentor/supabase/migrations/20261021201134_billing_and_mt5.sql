-- Exported from the live project (supabase_migrations.schema_migrations) on 2026-10-22.
-- Users must not be able to set their own plan.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url, last_seen_at) on public.profiles to authenticated;

alter table public.profiles add column if not exists plan_until timestamptz;
alter table public.profiles add column if not exists stripe_customer_id text;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('stripe','nowpayments')),
  provider_ref text not null,
  amount numeric,
  currency text,
  status text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
alter table public.payments enable row level security;
create policy "read own payments" on public.payments for select using (auth.uid() = user_id);

create table if not exists public.mt5_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_account_id text not null,
  metaapi_account_id text not null,
  login text not null,
  server text not null,
  status text not null default 'deploying',
  snapshot jsonb,
  last_sync timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, local_account_id)
);
alter table public.mt5_links enable row level security;
create policy "read own mt5" on public.mt5_links for select using (auth.uid() = user_id);

create or replace function public.is_pro(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select plan = 'pro' and (plan_until is null or plan_until > now()) from public.profiles where id = uid), false)
$$;
revoke execute on function public.is_pro(uuid) from anon;
