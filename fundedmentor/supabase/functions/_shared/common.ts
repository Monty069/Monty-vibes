import { createClient } from "jsr:@supabase/supabase-js@2";
import { configReport } from "./flags.ts";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

export const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

// Resolve the signed-in user from the request's bearer token.
export async function userFrom(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error ? null : data.user;
}

// Entitlement changes go through atomic SQL helpers (migration 20261022210000_split_entitlements).
// Card and crypto time are stored separately; plan/plan_until are derived by a trigger.
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await admin().rpc(name, args);
  if (error) throw new Error(`${name} failed: ${error.message}`);
  return data as string | null;
}
export const grantCard = (uid: string, until: Date) => rpc("fm_grant_card", { uid, until_ts: until.toISOString() });
export const endCard = (uid: string) => rpc("fm_end_card", { uid });
export const grantCrypto = (uid: string, days: number) => rpc("fm_grant_crypto", { uid, days });
export const revokeCrypto = (uid: string, days: number) => rpc("fm_revoke_crypto", { uid, days });

export const SITE = Deno.env.get("SITE_URL") || "https://fundedmentor.com";

// One presence-only config line per cold boot (no secret values). See flags.ts.
console.log("fm-config " + JSON.stringify(configReport((k) => Deno.env.get(k))));
