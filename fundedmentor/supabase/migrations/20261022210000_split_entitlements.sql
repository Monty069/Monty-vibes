-- Split Pro entitlement by payment source so card and crypto never overwrite each other.
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
