import { createClient } from "jsr:@supabase/supabase-js@2";

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

// Grant or extend Pro. `until` null = open-ended (subscription keeps it alive).
export async function setPro(userId: string, until: Date | null) {
  const db = admin();
  const { data } = await db.from("profiles").select("plan_until").eq("id", userId).maybeSingle();
  let next = until;
  if (until && data?.plan_until && new Date(data.plan_until) > until) next = new Date(data.plan_until);
  await db.from("profiles").update({ plan: "pro", plan_until: next ? next.toISOString() : null }).eq("id", userId);
}

export async function setFree(userId: string) {
  await admin().from("profiles").update({ plan: "free", plan_until: null }).eq("id", userId);
}

export const SITE = Deno.env.get("SITE_URL") || "https://fundedmentor.com";
