// Stripe webhook. Events: checkout.session.completed, invoice.paid, customer.subscription.updated,
// customer.subscription.deleted.
// env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//
// Entitlement model: card Pro is always DATED. Each paid period grants Pro until the subscription's
// current_period_end + GRACE, so a missed cancellation webhook or failed renewal can never leave a
// user on Pro forever. Every handler is idempotent (setPro only ever extends; payments upsert on
// (provider, provider_ref)), so Stripe retries and duplicate deliveries are safe.
import { json, admin, setPro, setFree } from "../_shared/common.ts";
import { verifyStripe } from "../_shared/verify.ts";

const GRACE_S = 3 * 86400;
const ACTIVE = new Set(["active", "trialing", "past_due"]);

async function stripeGet(path: string) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}` } });
  return r.ok ? r.json() : null;
}
const periodEnd = (sub: any): number | null => sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end || null;
const until = (end: number | null) => new Date(((end || Date.now() / 1000 + 31 * 86400) + GRACE_S) * 1000);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return json({ error: "not configured" }, 503);
  const payload = await req.text();
  if (!(await verifyStripe(payload, req.headers.get("stripe-signature") || "", secret))) return json({ error: "bad signature" }, 400);
  let ev: any;
  try { ev = JSON.parse(payload); } catch { return json({ error: "bad payload" }, 400); }
  const o = ev?.data?.object || {};
  const db = admin();

  if (ev.type === "checkout.session.completed") {
    const uid = o.client_reference_id || o.metadata?.user_id;
    if (!uid) return json({ ok: true, ignored: "no user" });
    // Async payment methods complete the session before money arrives; only grant once paid.
    if (o.payment_status !== "paid" && o.payment_status !== "no_payment_required") return json({ ok: true, ignored: "unpaid" });
    if (o.customer) await db.from("profiles").update({ stripe_customer_id: o.customer }).eq("id", uid);
    const sub = o.subscription ? await stripeGet(`subscriptions/${o.subscription}`) : null;
    await setPro(uid, until(periodEnd(sub)));
    // Recorded as "checkout" so revenue is counted once, on the invoice.
    await db.from("payments").upsert({ user_id: uid, provider: "stripe", provider_ref: o.id, amount: (o.amount_total || 0) / 100, currency: o.currency, status: "checkout" }, { onConflict: "provider,provider_ref" });
  } else if (ev.type === "invoice.paid") {
    const subId = o.subscription || o.parent?.subscription_details?.subscription;
    const sub = subId ? await stripeGet(`subscriptions/${subId}`) : null;
    const uid = sub?.metadata?.user_id;
    if (uid) {
      await setPro(uid, until(periodEnd(sub)));
      await db.from("payments").upsert({ user_id: uid, provider: "stripe", provider_ref: o.id, amount: (o.amount_paid || 0) / 100, currency: o.currency, status: "paid" }, { onConflict: "provider,provider_ref" });
    }
  } else if (ev.type === "customer.subscription.updated") {
    // Only extends while the subscription is in good standing; lapses are handled by the dated
    // entitlement running out, or by .deleted below.
    const uid = o.metadata?.user_id;
    if (uid && ACTIVE.has(o.status) && o.status !== "past_due") await setPro(uid, until(periodEnd(o)));
  } else if (ev.type === "customer.subscription.deleted") {
    const uid = o.metadata?.user_id;
    if (uid) await setFree(uid);
  }
  return json({ ok: true });
});
