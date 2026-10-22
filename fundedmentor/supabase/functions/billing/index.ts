// Starts a Pro checkout or opens billing management. Body: { method: "card" | "crypto" | "portal" }
// Card   -> Stripe Checkout subscription (env STRIPE_SECRET_KEY, STRIPE_PRICE_PRO)
// Crypto -> NOWPayments invoice for one month (env NOWPAYMENTS_API_KEY)
// Portal -> Stripe Billing Portal (cancel, change card, invoices). Needs the portal configured in Stripe.
import { CORS, json, userFrom, admin, SITE } from "../_shared/common.ts";

const PRO_USD = Number(Deno.env.get("PRO_PRICE_USD") || "29");

async function stripe(path: string, key: string, form?: URLSearchParams) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: form ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: form,
  });
  return { ok: r.ok, body: await r.json().catch(() => ({})) };
}
async function portalUrl(key: string, customer: string) {
  const r = await stripe("billing_portal/sessions", key, new URLSearchParams({ customer, return_url: `${SITE}/` }));
  return r.ok ? r.body.url as string : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const user = await userFrom(req);
  if (!user) return json({ error: "Sign in first." }, 401);
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const { method } = await req.json().catch(() => ({}));

  if (method === "portal") {
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) return json({ error: "Card billing is not switched on yet." }, 503);
    const { data: prof } = await admin().from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    if (!prof?.stripe_customer_id) return json({ error: "No card subscription on this account. Crypto plans don't renew, so there is nothing to cancel." }, 404);
    const url = await portalUrl(key, prof.stripe_customer_id);
    return url ? json({ url }) : json({ error: "Could not open billing. Try again or contact support." }, 502);
  }

  if (method === "card") {
    const key = Deno.env.get("STRIPE_SECRET_KEY"), price = Deno.env.get("STRIPE_PRICE_PRO");
    if (!key || !price) return json({ error: "Card payments are not switched on yet." }, 503);
    const db = admin();
    const { data: prof } = await db.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    const form = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      success_url: `${SITE}/?pro=success`,
      cancel_url: `${SITE}/?pro=cancel`,
      client_reference_id: user.id,
      "subscription_data[metadata][user_id]": user.id,
      "metadata[user_id]": user.id,
      allow_promotion_codes: "true",
    });
    // One subscription per user: an existing live subscription goes to the portal instead of a second checkout.
    if (prof?.stripe_customer_id) {
      const subs = await stripe(`subscriptions?customer=${encodeURIComponent(prof.stripe_customer_id)}&status=all&limit=10`, key);
      if (subs.ok && (subs.body.data || []).some((x: any) => ["active", "trialing", "past_due", "incomplete"].includes(x.status))) {
        const url = await portalUrl(key, prof.stripe_customer_id);
        return json({ url, existing: true, error: url ? undefined : "You already have a subscription." });
      }
    }
    if (prof?.stripe_customer_id) form.set("customer", prof.stripe_customer_id);
    else if (user.email) form.set("customer_email", user.email);
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const s = await r.json();
    if (!r.ok) return json({ error: s.error?.message || "Stripe refused the checkout." }, 502);
    return json({ url: s.url });
  }

  if (method === "crypto") {
    const key = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!key) return json({ error: "Crypto payments are not switched on yet." }, 503);
    const fnBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
    const r = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: PRO_USD,
        price_currency: "usd",
        order_id: `${user.id}:${Date.now()}`,
        order_description: "FundedMentor Pro, 30 days",
        ipn_callback_url: `${fnBase}/nowpayments-ipn`,
        success_url: `${SITE}/?pro=success`,
        cancel_url: `${SITE}/?pro=cancel`,
      }),
    });
    const inv = await r.json();
    if (!r.ok || !inv.invoice_url) return json({ error: inv.message || "Crypto checkout failed." }, 502);
    return json({ url: inv.invoice_url });
  }

  return json({ error: "Pick card or crypto." }, 400);
});
