# FundedMentor tests

Test-only folder. Nothing here is loaded by the app, and `../.vercelignore` keeps it (and `../supabase`) off the public site.

## Run

```bash
cd fundedmentor/tests
npm ci          # first time only: installs jsdom + morphdom (dev-only)
npm test        # everything: smoke + server
```

Or one suite at a time:

```bash
npm run test:smoke    # web app in jsdom: every view, manual-data labels, sync "Coming soon", news guard
npm run test:server   # Supabase edge functions: MT5 kill switch, Stripe + NOWPayments webhooks, billing
```

Exit code `0` means every check passed.

Real-browser check of a deployed build (optional, needs Chromium): see the header of `browser.test.mjs`. Requires Node 22.6+ (the server suite uses Node's built-in TypeScript stripping; no Deno needed).

## What they cover

- **smoke.test.js**: loads `index.html`, `engine.js`, `firms*.js` and `app.js` into jsdom with no network. Renders all 13 views, checks equity math, Manual / Live / Example provenance labels, that MT4/MT5 sync is "Coming soon" with no credential form and no edge-function calls, that old broker snapshots are never shown as live, the flag-on path still works, and that a missing or failed news calendar shows "News guard is off" instead of "no releases".
- **server.test.mjs**: copies `../supabase/functions` to a temp dir, swaps only the Supabase client for an in-memory fake, and runs the real handlers. Checks the MT5 kill switch blocks every action before auth/DB/MetaApi unless `MT5_SYNC_ENABLED=true` and `METAAPI_TOKEN` are both set. Checks Stripe signatures (wrong, garbage, replayed), paid-only grants, dated entitlements, idempotent and out-of-order events, and cancellation. Checks NOWPayments signatures, amount/currency/order validation, and once-only grants under duplicate and concurrent IPNs. Checks the billing portal and duplicate-subscription guard, and runs static checks for leaked secrets and deploy exclusions.

To prove a check can fail, point the server suite at other function source: `FM_FN_DIR=/path/to/functions npm run test:server`.
