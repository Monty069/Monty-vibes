// NOWPayments IPN. A finished payment grants 30 days of Pro (stacks on remaining time).
// env: NOWPAYMENTS_IPN_SECRET, PRO_PRICE_USD (default 29)
//
// Safety: signature checked before anything is trusted; user id must be a UUID we issued; the paid
// amount/currency must match the Pro price; and the 30 days are granted only by the request that
// atomically moves this payment to "finished", so duplicate or concurrent IPNs grant once.
import { json, admin, setPro } from "../_shared/common.ts";
import { verifyNowPayments, isUuid } from "../_shared/verify.ts";

const PRO_USD = Number(Deno.env.get("PRO_PRICE_USD") || "29");
const DAYS = 30;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const secret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
  if (!secret) return json({ error: "not configured" }, 503);
  const raw = await req.text();
  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ error: "bad payload" }, 400); }
  if (!(await verifyNowPayments(body, req.headers.get("x-nowpayments-sig") || "", secret))) return json({ error: "bad signature" }, 400);

  const uid = String(body.order_id || "").split(":")[0];
  const ref = String(body.payment_id || "");
  if (!isUuid(uid) || !ref) return json({ ok: true, ignored: "unknown order" });
  const db = admin();

  // Ensure a row exists without touching an existing one (never downgrades "finished").
  await db.from("payments").upsert({ user_id: uid, provider: "nowpayments", provider_ref: ref, amount: body.price_amount, currency: body.price_currency, status: "received" }, { onConflict: "provider,provider_ref", ignoreDuplicates: true });

  const status = String(body.payment_status || "");
  if (status !== "finished") {
    await db.from("payments").update({ status }).eq("provider", "nowpayments").eq("provider_ref", ref).neq("status", "finished");
    return json({ ok: true });
  }
  const amountOk = Number(body.price_amount) >= PRO_USD && String(body.price_currency || "").toLowerCase() === "usd";
  if (!amountOk) {
    await db.from("payments").update({ status: "amount_mismatch" }).eq("provider", "nowpayments").eq("provider_ref", ref).neq("status", "finished");
    return json({ ok: true, ignored: "amount mismatch" });
  }
  // Atomic transition: only one request can move this row to "finished".
  const { data: moved } = await db.from("payments").update({ status: "finished" }).eq("provider", "nowpayments").eq("provider_ref", ref).neq("status", "finished").select("id");
  if (moved && moved.length) {
    const { data } = await db.from("profiles").select("plan_until").eq("id", uid).maybeSingle();
    const base = data?.plan_until && new Date(data.plan_until) > new Date() ? new Date(data.plan_until) : new Date();
    await setPro(uid, new Date(base.getTime() + DAYS * 86400000));
  }
  return json({ ok: true });
});
