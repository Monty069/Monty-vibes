# FundedMentor rollback plan

Every production change is reversible from git. Nothing below deletes user data.

## State as of 2026-10-22 (launch-readiness pass)

| Component | Live now | Previous (rollback target) |
|---|---|---|
| Website (Vercel prod, `main`) | `d1906a3` (unchanged) | n/a |
| Edge function `mt5` | **v2**: kill switch, `MT5_SYNC_ENABLED` gate, presence-only config log | v1 = `d1906a3:fundedmentor/supabase/functions/mt5` |
| Edge functions `billing`, `stripe-webhook`, `nowpayments-ipn` | v1 (unchanged; inert, no payment secrets set) | n/a |
| Database | unchanged (entitlement migration NOT applied) | n/a |
| Scheduled task "FundedMentor news refresh" | prompt now also upserts Supabase `news_days` | previous prompt only wrote the claude.ai artifact |

## 1. Website (after merging `fundedmentor/manual-beta` to `main`)

Fastest: Vercel → fundedmentor → Deployments → the previous production deployment
(`dpl_2YdWzD7knrBa8kYS1JCX9MJw21m9`, commit `d1906a3`) → **Instant Rollback**. Takes seconds and needs no rebuild.
Durable: `git revert -m 1 <merge-commit>` on `main` and push.
Note: rolling back the site also brings back the old news loader (feed always shows "off") and public `/supabase/` source.

## 2. Edge function `mt5`

Low risk to keep: with `METAAPI_TOKEN` unset, v1 also returned 503.
To roll back: redeploy the v1 files from git with `verify_jwt: false`:
```
git show d1906a3:fundedmentor/supabase/functions/mt5/index.ts
git show d1906a3:fundedmentor/supabase/functions/_shared/common.ts
supabase functions deploy mt5 --no-verify-jwt   # from a checkout of d1906a3
```

## 3. Payment functions (when deployed later)

They must be deployed AFTER migration `20261022210000_split_entitlements`, because they call its `fm_*` helpers.
Rollback = redeploy `d1906a3` versions as above. If the migration stays applied, the old code still works:
it writes `plan`/`plan_until` directly and ignores the new columns.

## 4. Entitlement migration (when applied later)

Additive. Test it first with `supabase/tests/entitlements_rollback_test.sql`, which rolls itself back.
To undo after applying (only if no payments have been processed with the new code):
```sql
drop trigger if exists fm_derive_plan on public.profiles;
drop function if exists public.fm_grant_card(uuid, timestamptz), public.fm_end_card(uuid),
  public.fm_grant_crypto(uuid, integer), public.fm_revoke_crypto(uuid, integer), public.fm_derive_plan();
-- Keep the card_until / crypto_until columns: dropping them would lose entitlement data.
```

## 5. News refresh scheduled task

Revert the prompt to the artifact-only version (scheduled task `trig_01SUWdafECutrrG5PNN5Yb8M`), or disable the task.
`news_days` rows are only ever upserted; nothing is deleted.

## 6. Kill switches that need no deploy

- MT5 sync: leave `MT5_SYNC_ENABLED` unset (or anything other than `true`).
- Card payments: unset `STRIPE_SECRET_KEY` or `STRIPE_PRICE_PRO` → checkout returns "not switched on".
- Crypto payments: unset `NOWPAYMENTS_API_KEY`.
