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
