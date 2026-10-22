-- Rolled-back test of migration 20261022210000_split_entitlements against a real database.
-- Safe on production: it is ONE statement that applies the migration, creates a throwaway user,
-- runs 16 entitlement checks and then raises an exception, so Postgres rolls EVERYTHING back.
-- Expected result: an ERROR reading  FM_SQL_TEST 16 checks, failures: none
-- Run in Supabase Dashboard > SQL Editor. Then apply the migration file itself.


do $t$
declare
  uid uuid := gen_random_uuid(); r timestamptz; p record; fails text := ''; n int := 0;
begin
  execute $mig$-- Split Pro entitlement by payment source so card and crypto never overwrite each other.
--   card_until   : paid Stripe period end + grace (extended by paid invoices, ended by cancel/refund)
--   crypto_until : prepaid NOWPayments time (30 days per finished payment, stacked; removed on refund)
-- plan / plan_until stay the single source the app and is_pro() read; a trigger derives them, so
-- they can no longer be open-ended (null) through any payment path. Additive only: no data removed.

alter table public.profiles add column if not exists card_until timestamptz;
alter table public.profiles add column if not exists crypto_until timestamptz;

create or replace function public.fm_derive_plan() returns trigger
language plpgsql set search_path = '' as $$
declare u timestamptz;
begin
  u := greatest(new.card_until, new.crypto_until);  -- greatest() ignores nulls
  new.plan_until := u;
  new.plan := case when u is not null and u > now() then 'pro' else 'free' end;
  return new;
end; $$;

drop trigger if exists fm_derive_plan on public.profiles;
create trigger fm_derive_plan before update of card_until, crypto_until on public.profiles
  for each row execute function public.fm_derive_plan();

-- Each helper is one atomic UPDATE and returns the resulting plan_until.
-- Card: only ever extends; older/out-of-order periods can't shorten it.
create or replace function public.fm_grant_card(uid uuid, until_ts timestamptz) returns timestamptz
language sql security definer set search_path = '' as $$
  update public.profiles set card_until = greatest(card_until, until_ts) where id = uid returning plan_until;
$$;

-- Card: end now (cancellation, refund). Never touches crypto time.
create or replace function public.fm_end_card(uid uuid) returns timestamptz
language sql security definer set search_path = '' as $$
  update public.profiles set card_until = least(card_until, now()) where id = uid returning plan_until;
$$;

-- Crypto: stack days on remaining crypto time (or start now).
create or replace function public.fm_grant_crypto(uid uuid, days integer) returns timestamptz
language sql security definer set search_path = '' as $$
  update public.profiles set crypto_until = greatest(now(), crypto_until) + make_interval(days => days) where id = uid returning plan_until;
$$;

-- Crypto: remove days for a refunded payment.
create or replace function public.fm_revoke_crypto(uid uuid, days integer) returns timestamptz
language sql security definer set search_path = '' as $$
  update public.profiles set crypto_until = crypto_until - make_interval(days => days) where id = uid and crypto_until is not null returning plan_until;
$$;

revoke execute on function public.fm_grant_card(uuid, timestamptz), public.fm_end_card(uuid),
  public.fm_grant_crypto(uuid, integer), public.fm_revoke_crypto(uuid, integer), public.fm_derive_plan()
  from public, anon, authenticated;
grant execute on function public.fm_grant_card(uuid, timestamptz), public.fm_end_card(uuid),
  public.fm_grant_crypto(uuid, integer), public.fm_revoke_crypto(uuid, integer)
  to service_role;
$mig$;
  insert into auth.users (id, email, aud, role) values (uid, 'rollback-test-' || uid || '@example.invalid', 'authenticated', 'authenticated');
  -- 1 fresh profile
  select * into p from public.profiles where id = uid; n := n + 1;
  if p.plan <> 'free' or p.plan_until is not null then fails := fails || ' [1 fresh not free]'; end if;
  -- 2 crypto 30d
  perform public.fm_grant_crypto(uid, 30); select * into p from public.profiles where id = uid; n := n + 1;
  if p.plan <> 'pro' or abs(extract(epoch from p.plan_until - (now() + interval '30 days'))) > 1 then fails := fails || ' [2 crypto grant]'; end if;
  -- 3 card on top, longer
  perform public.fm_grant_card(uid, now() + interval '33 days'); select * into p from public.profiles where id = uid; n := n + 1;
  if p.plan_until <> now() + interval '33 days' then fails := fails || ' [3 card extends]'; end if;
  -- 4 cancel card keeps prepaid crypto time
  perform public.fm_end_card(uid); select * into p from public.profiles where id = uid; n := n + 1;
  if p.plan <> 'pro' or p.plan_until <> p.crypto_until or abs(extract(epoch from p.plan_until - (now() + interval '30 days'))) > 1 then fails := fails || ' [4 cancel kept crypto]'; end if;
  -- 5 resubscribe shorter than crypto: crypto still wins
  perform public.fm_grant_card(uid, now() + interval '10 days'); select * into p from public.profiles where id = uid; n := n + 1;
  if p.card_until <> now() + interval '10 days' or p.plan_until <> p.crypto_until then fails := fails || ' [5 resubscribe]'; end if;
  -- 6 out-of-order older period never shortens card
  perform public.fm_grant_card(uid, now() + interval '5 days'); select * into p from public.profiles where id = uid; n := n + 1;
  if p.card_until <> now() + interval '10 days' then fails := fails || ' [6 out-of-order]'; end if;
  -- 7 crypto refund removes only crypto time
  perform public.fm_revoke_crypto(uid, 30); select * into p from public.profiles where id = uid; n := n + 1;
  if p.plan <> 'pro' or p.plan_until <> now() + interval '10 days' then fails := fails || ' [7 crypto refund]'; end if;
  -- 8 card refund/cancel with no crypto left -> free
  perform public.fm_end_card(uid); select * into p from public.profiles where id = uid; n := n + 1;
  if p.plan <> 'free' then fails := fails || ' [8 ends to free]'; end if;
  n := n + 1; if public.is_pro(uid) then fails := fails || ' [9 is_pro after end]'; end if;
  -- 10 crypto stacking
  perform public.fm_grant_crypto(uid, 30); perform public.fm_grant_crypto(uid, 30); select * into p from public.profiles where id = uid; n := n + 1;
  if abs(extract(epoch from p.plan_until - (now() + interval '60 days'))) > 1 or not public.is_pro(uid) then fails := fails || ' [10 stacking]'; end if;
  -- 11 end_card on a user with no card never grants anything
  perform public.fm_end_card(uid); select * into p from public.profiles where id = uid; n := n + 1;
  if p.card_until > now() then fails := fails || ' [11 end_card no-op]'; end if;
  -- 12-15 privileges
  n := n + 1; if has_function_privilege('authenticated', 'public.fm_grant_card(uuid,timestamptz)', 'execute') then fails := fails || ' [12 authenticated can grant]'; end if;
  n := n + 1; if has_function_privilege('anon', 'public.fm_grant_crypto(uuid,integer)', 'execute') then fails := fails || ' [13 anon can grant]'; end if;
  n := n + 1; if not has_function_privilege('service_role', 'public.fm_grant_card(uuid,timestamptz)', 'execute') then fails := fails || ' [14 service_role cannot grant]'; end if;
  n := n + 1; if has_column_privilege('authenticated', 'public.profiles', 'card_until', 'UPDATE') or has_column_privilege('authenticated', 'public.profiles', 'crypto_until', 'UPDATE') or has_column_privilege('authenticated', 'public.profiles', 'plan', 'UPDATE') then fails := fails || ' [15 user can edit entitlement]'; end if;
  -- 16 unknown user: helpers affect nothing
  n := n + 1; r := public.fm_grant_card(gen_random_uuid(), now() + interval '1 day'); if r is not null then fails := fails || ' [16 unknown user]'; end if;
  raise exception 'FM_SQL_TEST % checks, failures:%', n, case when fails = '' then ' none' else fails end;
end
$t$;
