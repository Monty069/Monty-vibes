// Stripe webhook. Events: checkout.session.completed, invoice.paid, customer.subscription.deleted
// env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
import { json, admin, setPro, setFree } from "../_shared/common.ts";

const enc = new TextEncoder();
async function verify(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${t}.${payload}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.includes(hex);
}

async function stripeGet(path: string) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}` } });
  return r.json();
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return json({ error: "not configured" }, 503);
  const payload = await req.text();
  if (!(await verify(payload, req.headers.get("stripe-signature") || "", secret))) return json({ error: "bad signature" }, 400);
  const ev = JSON.parse(payload);
  const o = ev.data.object;
  const db = admin();

  if (ev.type === "checkout.session.completed") {
    const uid = o.client_reference_id || o.metadata?.user_id;
    if (!uid) return json({ ok: true });
    await db.from("profiles").update({ stripe_customer_id: o.customer }).eq("id", uid);
    await setPro(uid, null);
    await db.from("payments").upsert({ user_id: uid, provider: "stripe", provider_ref: o.id, amount: (o.amount_total || 0) / 100, currency: o.currency, status: "paid" }, { onConflict: "provider,provider_ref" });
  } else if (ev.type === "invoice.paid") {
    const sub = o.subscription ? await stripeGet(`subscriptions/${o.subscription}`) : null;
    const uid = sub?.metadata?.user_id;
    if (uid) {
      const end = sub.current_period_end || sub.items?.data?.[0]?.current_period_end;
      await setPro(uid, end ? new Date((end + 3 * 86400) * 1000) : null);
      await db.from("payments").upsert({ user_id: uid, provider: "stripe", provider_ref: o.id, amount: (o.amount_paid || 0) / 100, currency: o.currency, status: "paid" }, { onConflict: "provider,provider_ref" });
    }
  } else if (ev.type === "customer.subscription.deleted") {
    const uid = o.metadata?.user_id;
    if (uid) await setFree(uid);
  }
  return json({ ok: true });
});
