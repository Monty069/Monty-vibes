-- Exported from the live project (supabase_migrations.schema_migrations) on 2026-10-22.
-- One row per signed-in user: their Google email and name, created automatically on first login.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set email = excluded.email, last_seen_at = now();
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Per-user app state (accounts, trades, settings) so data follows the user across devices.
create table public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "own state select" on public.user_state for select using (auth.uid() = user_id);
create policy "own state insert" on public.user_state for insert with check (auth.uid() = user_id);
create policy "own state update" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Economic news, readable by anyone, written only by the server.
create table public.news_days (
  date date primary key,
  events jsonb not null default '[]'::jsonb,
  source text,
  updated_at timestamptz not null default now()
);
alter table public.news_days enable row level security;
create policy "news readable" on public.news_days for select using (true);
