// Stripe webhook. Subscribe the endpoint to:
//   checkout.session.completed, invoice.paid, invoice.payment_failed,
//   customer.subscription.updated, customer.subscription.deleted, charge.refunded
// env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//
// Entitlement model (see migration 20261022210000_split_entitlements):
// - Card Pro lives in profiles.card_until, separate from crypto time, and is always DATED:
//   each paid period grants until current_period_end + GRACE. Nothing is open-ended.
// - Grants only extend (fm_grant_card uses greatest), so duplicate and out-of-order events are safe.
// - Before granting, the subscription is read LIVE from Stripe; a stale event for a subscription
//   that is now canceled/unpaid grants nothing.
// - Cancellation and full refunds end card time now (fm_end_card) without touching crypto time.
// - Failed renewals change nothing: the dated grant simply runs out after the grace period.
import { json, admin, grantCard, endCard } from "../_shared/common.ts";
import { verifyStripe, isUuid } from "../_shared/verify.ts";

const GRACE_S = 3 * 86400;
const GOOD = new Set(["active", "trialing"]);
const DEAD = new Set(["canceled", "unpaid", "incomplete_expired"]);

async function stripeGet(path: string) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}` } });
  return r.ok ? r.json() : null;
}
const periodEnd = (sub: any): number | null => sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end || null;
const untilOf = (sub: any) => { const e = periodEnd(sub); return e ? new Date((e + GRACE_S) * 1000) : null; };
const subIdOf = (o: any) => o.subscription || o.parent?.subscription_details?.subscription || null;

// Grant card time from the live subscription; returns false when nothing was granted.
async function grantFromSub(subId: string | null, fallbackUid?: string) {
  if (!subId) return false;
  const sub = await stripeGet(`subscriptions/${subId}`);
  const uid = sub?.metadata?.user_id || fallbackUid;
  const until = untilOf(sub);
  if (!uid || !isUuid(uid) || !sub || !GOOD.has(sub.status) || !until) return false;
  await grantCard(uid, until);
  return true;
}

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
  const record = (uid: string, ref: string, amount: number, currency: string, status: string) =>
    db.from("payments").upsert({ user_id: uid, provider: "stripe", provider_ref: ref, amount, currency, status }, { onConflict: "provider,provider_ref" });

  switch (ev.type) {
    case "checkout.session.completed": {
      const uid = o.client_reference_id || o.metadata?.user_id;
      if (!uid || !isUuid(uid)) return json({ ok: true, ignored: "no user" });
      // Async payment methods complete the session before money arrives; only grant once paid.
      if (o.payment_status !== "paid" && o.payment_status !== "no_payment_required") return json({ ok: true, ignored: "unpaid" });
      if (o.customer) await db.from("profiles").update({ stripe_customer_id: o.customer }).eq("id", uid);
      await grantFromSub(o.subscription, uid);
      await record(uid, o.id, (o.amount_total || 0) / 100, o.currency, "checkout"); // revenue is counted on invoices
      break;
    }
    case "invoice.paid": {
      const { data: prior } = await db.from("payments").select("status").eq("provider", "stripe").eq("provider_ref", o.id).maybeSingle();
      if (prior?.status === "refunded") return json({ ok: true, ignored: "refunded invoice" });
      const subId = subIdOf(o);
      const sub = subId ? await stripeGet(`subscriptions/${subId}`) : null;
      const uid = sub?.metadata?.user_id;
      if (uid && isUuid(uid)) {
        if (GOOD.has(sub.status) && untilOf(sub)) await grantCard(uid, untilOf(sub)!);
        await record(uid, o.id, (o.amount_paid || 0) / 100, o.currency, "paid");
      }
      break;
    }
    case "invoice.payment_failed": {
      const subId = subIdOf(o);
      const sub = subId ? await stripeGet(`subscriptions/${subId}`) : null;
      const uid = sub?.metadata?.user_id;
      if (uid && isUuid(uid)) await record(uid, o.id, (o.amount_due || 0) / 100, o.currency, "failed");
      break; // no entitlement change: the dated grant lapses after the grace period
    }
    case "customer.subscription.updated": {
      const uid = o.metadata?.user_id;
      if (!uid || !isUuid(uid)) break;
      if (DEAD.has(o.status)) await endCard(uid);
      else await grantFromSub(o.id, uid); // re-read live so a stale "active" event can't revive it
      break;
    }
    case "customer.subscription.deleted": {
      const uid = o.metadata?.user_id;
      if (uid && isUuid(uid)) await endCard(uid);
      break;
    }
    case "charge.refunded": {
      const full = (o.amount_refunded || 0) >= (o.amount || 0) && (o.amount || 0) > 0;
      if (!full || !o.customer) break; // partial refunds keep access
      const { data: prof } = await db.from("profiles").select("id").eq("stripe_customer_id", o.customer).maybeSingle();
      if (!prof) break;
      await endCard(prof.id);
      const inv = typeof o.invoice === "string" ? o.invoice : o.invoice?.id;
      if (inv) await db.from("payments").update({ status: "refunded" }).eq("provider", "stripe").eq("provider_ref", inv);
      await record(prof.id, o.id, -(o.amount_refunded || 0) / 100, o.currency, "refunded");
      break;
    }
  }
  return json({ ok: true });
});
