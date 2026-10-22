// NOWPayments IPN. A finished payment grants 30 days of Pro (stacks on remaining time).
// env: NOWPAYMENTS_IPN_SECRET, PRO_PRICE_USD (default 29)
//
// Safety: signature checked before anything is trusted; user id must be a UUID we issued; the paid
// amount/currency must match the Pro price; and the 30 days are granted only by the request that
// atomically moves this payment to "finished", so duplicate or concurrent IPNs grant once.
// A "refunded" IPN for a finished payment removes those 30 days, also exactly once.
// Crypto time is stored in profiles.crypto_until, separate from card time.
import { json, admin, grantCrypto, revokeCrypto } from "../_shared/common.ts";
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
  if (status === "refunded") {
    // Only a payment that actually granted time (finished -> refunded) gives the time back.
    const { data: back } = await db.from("payments").update({ status: "refunded" }).eq("provider", "nowpayments").eq("provider_ref", ref).eq("status", "finished").select("id");
    if (back && back.length) await revokeCrypto(uid, DAYS);
    else await db.from("payments").update({ status: "refunded" }).eq("provider", "nowpayments").eq("provider_ref", ref).neq("status", "refunded");
    return json({ ok: true });
  }
  if (status !== "finished") {
    await db.from("payments").update({ status }).eq("provider", "nowpayments").eq("provider_ref", ref).neq("status", "finished").neq("status", "refunded");
    return json({ ok: true });
  }
  const amountOk = Number(body.price_amount) >= PRO_USD && String(body.price_currency || "").toLowerCase() === "usd";
  if (!amountOk) {
    await db.from("payments").update({ status: "amount_mismatch" }).eq("provider", "nowpayments").eq("provider_ref", ref).neq("status", "finished").neq("status", "refunded");
    return json({ ok: true, ignored: "amount mismatch" });
  }
  // Atomic transition: only one request can move this row to "finished".
  // A refunded payment can't be re-finished by a late IPN.
  const { data: moved } = await db.from("payments").update({ status: "finished" }).eq("provider", "nowpayments").eq("provider_ref", ref).neq("status", "finished").neq("status", "refunded").select("id");
  if (moved && moved.length) await grantCrypto(uid, DAYS);
  return json({ ok: true });
});
