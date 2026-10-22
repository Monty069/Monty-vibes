// Server-side feature switches. Pure (no imports) so it can be unit-tested outside Deno.
//
// MT4/MT5 broker sync is OFF unless BOTH are true:
//   MT5_SYNC_ENABLED = "true"   (explicit opt-in; anything else, including unset, means off)
//   METAAPI_TOKEN    is set     (the bridge credential)
// Having the token configured is NOT enough on its own, so the integration can stay
// provisioned without being reachable. Flip MT5_SYNC_ENABLED to "true" to launch it.

export type EnvGet = (key: string) => string | undefined;

export function mt5Enabled(env: EnvGet): boolean {
  return (env("MT5_SYNC_ENABLED") || "").trim().toLowerCase() === "true" && !!env("METAAPI_TOKEN");
}

export const MT5_DISABLED_BODY = {
  error: "Automatic MT4/MT5 sync is coming soon. Track this account manually for now.",
  disabled: true,
} as const;

// Presence-only configuration report, logged once per cold boot (see common.ts) so deployed
// configuration can be checked from function logs. Never includes secret values: only whether
// each one is set, whether it has the expected prefix, and test/live mode for Stripe.
export function configReport(env: EnvGet) {
  const v = (k: string) => (env(k) || "").trim();
  const sk = v("STRIPE_SECRET_KEY");
  return {
    stripe_secret_key: !!sk,
    stripe_mode: /^(sk|rk)_live_/.test(sk) ? "live" : /^(sk|rk)_test_/.test(sk) ? "test" : sk ? "unrecognised" : "missing",
    stripe_price_pro: /^price_/.test(v("STRIPE_PRICE_PRO")),
    stripe_webhook_secret: /^whsec_/.test(v("STRIPE_WEBHOOK_SECRET")),
    nowpayments_api_key: !!v("NOWPAYMENTS_API_KEY"),
    nowpayments_ipn_secret: !!v("NOWPAYMENTS_IPN_SECRET"),
    nowpayments_sandbox: v("NOWPAYMENTS_SANDBOX") === "true",
    pro_price_usd: v("PRO_PRICE_USD") || "default:29",
    metaapi_token: !!v("METAAPI_TOKEN"),
    mt5_sync_enabled: mt5Enabled(env),
    site_url: v("SITE_URL") || "default:https://fundedmentor.com",
  };
}
