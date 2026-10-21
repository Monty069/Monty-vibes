// NOWPayments IPN. A finished payment grants 30 days of Pro (stacks on remaining time).
// env: NOWPAYMENTS_IPN_SECRET
import { json, admin, setPro } from "../_shared/common.ts";

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
  return v;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
  if (!secret) return json({ error: "not configured" }, 503);
  const raw = await req.text();
  const body = JSON.parse(raw);
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(JSON.stringify(sortKeys(body)))));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== (req.headers.get("x-nowpayments-sig") || "").toLowerCase()) return json({ error: "bad signature" }, 400);

  const uid = String(body.order_id || "").split(":")[0];
  if (!uid) return json({ ok: true });
  const db = admin();
  const ref = String(body.payment_id);
  const { data: seen } = await db.from("payments").select("status").eq("provider", "nowpayments").eq("provider_ref", ref).maybeSingle();
  await db.from("payments").upsert({ user_id: uid, provider: "nowpayments", provider_ref: ref, amount: body.price_amount, currency: body.price_currency, status: body.payment_status }, { onConflict: "provider,provider_ref" });
  if (body.payment_status === "finished" && seen?.status !== "finished") {
    const { data } = await db.from("profiles").select("plan_until").eq("id", uid).maybeSingle();
    const base = data?.plan_until && new Date(data.plan_until) > new Date() ? new Date(data.plan_until) : new Date();
    await setPro(uid, new Date(base.getTime() + 30 * 86400000));
  }
  return json({ ok: true });
});
