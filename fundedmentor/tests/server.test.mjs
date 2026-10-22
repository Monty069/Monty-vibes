// Server tests for FundedMentor's Supabase edge functions (mt5, stripe-webhook, nowpayments-ipn, billing).
// Run from fundedmentor/tests:  npm run test:server   (Node >= 22.6, no extra dependencies)
//
// The real function source is copied to a temp dir; the only change is that common.ts gets an
// in-memory Supabase client instead of the jsr: import. Deno.serve/Deno.env and fetch are stubbed,
// so nothing touches the network, Stripe, NOWPayments, MetaApi or the production database.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.FM_FN_DIR ? path.resolve(process.env.FM_FN_DIR) : path.resolve(HERE, '../supabase/functions');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-fn-'));
fs.cpSync(SRC, TMP, { recursive: true });
const commonPath = path.join(TMP, '_shared/common.ts');
const common = fs.readFileSync(commonPath, 'utf8');
const JSR = 'import { createClient } from "jsr:@supabase/supabase-js@2";';
if (!common.includes(JSR)) throw new Error('common.ts import changed; update the harness');
fs.writeFileSync(commonPath, common.replace(JSR, 'const createClient = (globalThis as any).__h.createClient;'));

let passes = 0, fails = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL', m); } };

// ---------- in-memory Supabase ----------
const H = { db: {}, dbOps: 0, fetches: [], fetchReply: () => ({ status: 404, body: {} }), env: {}, users: { 'tok-pro': 'b1c1d1e1-0000-4000-8000-000000000001', 'tok-free': 'b1c1d1e1-0000-4000-8000-000000000002' } };
globalThis.__h = H;
class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; }
  select() { this.ret = true; return this; }
  update(v) { this.op = 'update'; this.v = v; return this; }
  upsert(v, o) { this.op = 'upsert'; this.v = v; this.o = o || {}; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(k, v) { this.f.push((r) => r[k] === v); return this; }
  neq(k, v) { this.f.push((r) => r[k] !== v); return this; }
  maybeSingle() { this.single = true; return this; }
  then(res, rej) { try { res(this.run()); } catch (e) { rej(e); } }
  run() {
    H.dbOps++;
    const rows = H.db[this.t] || (H.db[this.t] = []);
    const m = rows.filter((r) => this.f.every((f) => f(r)));
    if (this.op === 'select') return { data: this.single ? (m[0] ? { ...m[0] } : null) : m.map((r) => ({ ...r })), error: null };
    if (this.op === 'update') { m.forEach((r) => Object.assign(r, this.v)); return { data: this.ret ? m.map((r) => ({ ...r })) : null, error: null }; }
    if (this.op === 'delete') { H.db[this.t] = rows.filter((r) => !m.includes(r)); return { data: null, error: null }; }
    const keys = (this.o.onConflict || 'id').split(',');
    const ex = rows.find((r) => keys.every((k) => r[k] === this.v[k]));
    if (ex) { if (!this.o.ignoreDuplicates) Object.assign(ex, this.v); } else rows.push({ id: 'row-' + rows.length, ...this.v });
    return { data: null, error: null };
  }
}
H.createClient = () => ({
  from: (t) => new Q(t),
  rpc: async (name, args) => {
    H.dbOps++;
    const p = (H.db.profiles || []).find((r) => r.id === args.uid);
    if (name === 'is_pro') return { data: !!p && p.plan === 'pro' && (!p.plan_until || new Date(p.plan_until) > new Date()) };
    // Mirrors migration 20261022210000_split_entitlements (fm_* helpers + fm_derive_plan trigger).
    if (!p) return { data: null, error: null };
    const t = (x) => (x ? new Date(x).getTime() : null), iso = (ms) => (ms == null ? null : new Date(ms).toISOString());
    const now = Date.now(), D = 86400000;
    if (name === 'fm_grant_card') p.card_until = iso(Math.max(t(p.card_until) ?? -Infinity, t(args.until_ts)));
    else if (name === 'fm_end_card') p.card_until = p.card_until ? iso(Math.min(t(p.card_until), now)) : null;
    else if (name === 'fm_grant_crypto') p.crypto_until = iso(Math.max(now, t(p.crypto_until) ?? -Infinity) + args.days * D);
    else if (name === 'fm_revoke_crypto') { if (p.crypto_until) p.crypto_until = iso(t(p.crypto_until) - args.days * D); }
    else return { data: null, error: { message: 'unknown rpc ' + name } };
    const u = Math.max(t(p.card_until) ?? -Infinity, t(p.crypto_until) ?? -Infinity);
    p.plan_until = Number.isFinite(u) ? iso(u) : null; p.plan = Number.isFinite(u) && u > now ? 'pro' : 'free';
    return { data: p.plan_until, error: null };
  },
  auth: { getUser: async (tok) => (H.users[tok] ? { data: { user: { id: H.users[tok], email: 'u@x.com' } }, error: null } : { data: null, error: { message: 'bad' } }) },
});
globalThis.fetch = async (url, init = {}) => { H.fetches.push({ url: String(url), init }); const r = H.fetchReply(String(url), init); return new Response(JSON.stringify(r.body), { status: r.status || 200, headers: { 'content-type': 'application/json' } }); };

// ---------- Deno stub + loader ----------
const handlers = {}; let loading = null;
globalThis.Deno = { env: { get: (k) => H.env[k] }, serve: (h) => { handlers[loading] = h; } };
async function load(name) { loading = name; await import(pathToFileURL(path.join(TMP, name, 'index.ts')).href); return handlers[name]; }
const reset = (env = {}) => {
  H.db = { profiles: [{ id: H.users['tok-pro'], plan: 'pro', plan_until: null }, { id: H.users['tok-free'], plan: 'free', plan_until: null }], payments: [], mt5_links: [] };
  H.dbOps = 0; H.fetches = []; H.fetchReply = () => ({ status: 404, body: {} });
  H.env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', ...env };
};
const req = (method, body, headers = {}) => new Request('https://x.supabase.co/functions/v1/f', { method, headers: { 'content-type': 'application/json', ...headers }, body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body ?? {}) });
const call = async (h, ...a) => { let r; try { r = await h(req(...a)); } catch (e) { return { status: 500, body: { thrown: String(e) } }; } return { status: r.status, body: await r.json().catch(() => null) }; };
const prof = (who) => H.db.profiles.find((p) => p.id === H.users[who]);
reset();

// ======================= MT5 kill switch =======================
const { mt5Enabled } = await import(pathToFileURL(path.join(TMP, '_shared/flags.ts')).href);
ok(!mt5Enabled(() => undefined), 'flags: off when nothing set');
ok(!mt5Enabled((k) => ({ METAAPI_TOKEN: 't' })[k]), 'flags: token alone does NOT enable sync');
ok(!mt5Enabled((k) => ({ MT5_SYNC_ENABLED: 'true' })[k]), 'flags: flag without token stays off');
ok(!mt5Enabled((k) => ({ MT5_SYNC_ENABLED: 'yes', METAAPI_TOKEN: 't' })[k]), 'flags: only the literal "true" enables');
ok(mt5Enabled((k) => ({ MT5_SYNC_ENABLED: ' TRUE ', METAAPI_TOKEN: 't' })[k]), 'flags: "true" + token enables');

const mt5 = await load('mt5');
for (const env of [{}, { METAAPI_TOKEN: 'tok' }, { METAAPI_TOKEN: 'tok', MT5_SYNC_ENABLED: 'false' }, { MT5_SYNC_ENABLED: 'true' }]) {
  for (const action of ['link', 'sync', 'unlink', 'anything']) {
    reset(env);
    const r = await call(mt5, 'POST', { action, localId: 'a1', login: '123', password: 'p', server: 's' }, { authorization: 'Bearer tok-pro' });
    ok(r.status === 503 && r.body && r.body.disabled === true, `mt5 ${action} rejected with env ${JSON.stringify(env)} (got ${r.status})`);
    ok(H.fetches.length === 0 && H.dbOps === 0, `mt5 ${action}: no MetaApi call and no DB access while disabled`);
  }
}
reset({ METAAPI_TOKEN: 'tok' });
ok((await call(mt5, 'GET')).status === 503, 'mt5 GET rejected while disabled');
ok((await mt5(req('OPTIONS'))).status === 200, 'mt5 CORS preflight still answers');
reset({ METAAPI_TOKEN: 'tok', MT5_SYNC_ENABLED: 'true' });
ok((await call(mt5, 'POST', { action: 'sync', localId: 'a1' })).status === 401, 'mt5 enabled: unauthenticated still rejected');
ok((await call(mt5, 'POST', { action: 'sync', localId: 'a1' }, { authorization: 'Bearer tok-free' })).status === 402, 'mt5 enabled: free user rejected');
H.fetchReply = (u) => (u.includes('agiliumtrade') ? { status: 201, body: { id: 'meta-1', state: 'DEPLOYED' } } : { status: 404, body: {} });
const linked = await call(mt5, 'POST', { action: 'link', localId: 'a1', login: '123', password: 'p', server: 'FTMO-Demo' }, { authorization: 'Bearer tok-pro' });
ok(linked.status === 200 && H.fetches.some((f) => f.url.includes('mt-provisioning-api')) && H.db.mt5_links.length === 1, 'mt5 enabled: original link flow preserved');

// ======================= Stripe webhook =======================
const stripeHook = await load('stripe-webhook');
const WHS = 'whsec_test';
const FREE = H.users['tok-free'];
const sign = (payload, t = Math.floor(Date.now() / 1000), secret = WHS) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;
const stripeCall = (event, sig) => { const p = JSON.stringify(event); return call(stripeHook, 'POST', p, { 'stripe-signature': sig ?? sign(p) }); };
const NOW = () => Math.floor(Date.now() / 1000);
const END = NOW() + 30 * 86400;
// Live subscription as Stripe would return it from GET /subscriptions/:id
let SUB = null;
const stripeApi = (u) => (u.includes('/subscriptions/') && SUB ? { status: 200, body: SUB } : { status: 404, body: {} });
const setSub = (o = {}) => { SUB = { id: 'sub_1', status: 'active', current_period_end: END, metadata: { user_id: FREE }, ...o }; H.fetchReply = stripeApi; };
const completed = (extra = {}) => ({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1', client_reference_id: FREE, customer: 'cus_1', subscription: 'sub_1', payment_status: 'paid', amount_total: 2900, currency: 'usd', ...extra } } });
const invoice = (id, extra = {}) => ({ id: 'evt_' + id, type: 'invoice.paid', data: { object: { id, subscription: 'sub_1', amount_paid: 2900, currency: 'usd', ...extra } } });
const subEvent = (type, extra = {}) => ({ id: 'evt_s', type, data: { object: { id: 'sub_1', status: 'active', current_period_end: END, metadata: { user_id: FREE }, ...extra } } });
const approx = (iso, sec) => !!iso && Math.abs(new Date(iso).getTime() / 1000 - sec) < 5;
const GRACE = 3 * 86400;

reset();
ok((await stripeCall(completed())).status === 503, 'stripe: rejects when webhook secret not configured');
reset({ STRIPE_WEBHOOK_SECRET: WHS, STRIPE_SECRET_KEY: 'sk_test_x' }); setSub();
ok((await stripeCall(completed(), sign(JSON.stringify(completed()), undefined, 'whsec_wrong'))).status === 400 && prof('tok-free').plan === 'free', 'stripe: wrong signature rejected, no entitlement');
ok((await stripeCall(completed(), 't=1,v1=00')).status === 400, 'stripe: garbage signature rejected');
ok((await stripeCall(completed(), sign(JSON.stringify(completed()), NOW() - 3600))).status === 400 && prof('tok-free').plan === 'free', 'stripe: replayed (1h old) signature rejected');
ok((await call(stripeHook, 'GET')).status === 405, 'stripe: non-POST rejected');
ok((await call(stripeHook, 'POST', 'not json', { 'stripe-signature': sign('not json') })).status === 400, 'stripe: signed but malformed payload rejected');
ok((await stripeCall(completed({ payment_status: 'unpaid' }))).status === 200 && prof('tok-free').plan === 'free', 'stripe: unpaid checkout grants nothing');
await stripeCall(completed());
ok(prof('tok-free').plan === 'pro' && approx(prof('tok-free').plan_until, END + GRACE), 'stripe activation: paid checkout grants Pro to period end + 3d grace (dated)');
ok(prof('tok-free').stripe_customer_id === 'cus_1', 'stripe activation: customer id stored for the portal');
const until1 = prof('tok-free').plan_until;
await stripeCall(completed()); await stripeCall(completed());
ok(prof('tok-free').plan_until === until1 && H.db.payments.length === 1, 'stripe: duplicate deliveries are idempotent');
// Renewal
setSub({ current_period_end: END + 30 * 86400 }); await stripeCall(invoice('in_2'));
ok(approx(prof('tok-free').plan_until, END + 30 * 86400 + GRACE), 'stripe renewal: paid invoice extends Pro');
setSub({ current_period_end: END }); await stripeCall(invoice('in_1'));
ok(approx(prof('tok-free').plan_until, END + 30 * 86400 + GRACE), 'stripe out-of-order: older invoice never shortens Pro');
ok(H.db.payments.filter((p) => p.status === 'paid').length === 2, 'stripe: revenue recorded once per invoice');
// Failed renewal: recorded, no extension
const beforeFail = prof('tok-free').plan_until;
setSub({ status: 'past_due', current_period_end: END + 60 * 86400 });
await stripeCall({ id: 'evt_f', type: 'invoice.payment_failed', data: { object: { id: 'in_3', subscription: 'sub_1', amount_due: 2900, currency: 'usd' } } });
ok(prof('tok-free').plan_until === beforeFail && H.db.payments.some((p) => p.provider_ref === 'in_3' && p.status === 'failed'), 'stripe failed renewal: recorded, no extension (grace runs out)');
await stripeCall(subEvent('customer.subscription.updated', { status: 'past_due', current_period_end: END + 60 * 86400 }));
ok(prof('tok-free').plan_until === beforeFail, 'stripe failed renewal: past_due update does not extend');
await stripeCall(subEvent('customer.subscription.updated', { status: 'unpaid' }));
ok(prof('tok-free').plan === 'free', 'stripe failed renewal: subscription marked unpaid ends Pro');
// Stale events after the subscription died must not revive it
setSub({ status: 'canceled', current_period_end: END + 90 * 86400 });
await stripeCall(invoice('in_4')); await stripeCall(subEvent('customer.subscription.updated', { status: 'active', current_period_end: END + 90 * 86400 }));
ok(prof('tok-free').plan === 'free', 'stripe out-of-order: stale "paid"/"active" events for a now-canceled subscription grant nothing');
// Cancellation
reset({ STRIPE_WEBHOOK_SECRET: WHS, STRIPE_SECRET_KEY: 'sk_test_x' }); setSub();
await stripeCall(completed());
await stripeCall(subEvent('customer.subscription.deleted', { status: 'canceled' }));
ok(prof('tok-free').plan === 'free', 'stripe cancellation: subscription deleted ends Pro');
// Refunds
reset({ STRIPE_WEBHOOK_SECRET: WHS, STRIPE_SECRET_KEY: 'sk_test_x' }); setSub();
await stripeCall(completed()); await stripeCall(invoice('in_9'));
await stripeCall({ id: 'evt_r1', type: 'charge.refunded', data: { object: { id: 'ch_1', customer: 'cus_1', amount: 2900, amount_refunded: 1000, currency: 'usd', invoice: 'in_9' } } });
ok(prof('tok-free').plan === 'pro', 'stripe refund: partial refund keeps access');
await stripeCall({ id: 'evt_r2', type: 'charge.refunded', data: { object: { id: 'ch_1', customer: 'cus_1', amount: 2900, amount_refunded: 2900, currency: 'usd', invoice: 'in_9' } } });
ok(prof('tok-free').plan === 'free' && H.db.payments.find((p) => p.provider_ref === 'in_9').status === 'refunded', 'stripe refund: full refund ends card Pro and marks the invoice');
await stripeCall(invoice('in_9'));
ok(prof('tok-free').plan === 'free', 'stripe refund: a replayed invoice.paid for the refunded invoice grants nothing');
ok((await stripeCall({ id: 'e', type: 'invoice.paid', data: { object: { id: 'in_x' } } })).status === 200, 'stripe: event without subscription is ignored safely');

// ======================= NOWPayments IPN =======================
const ipn = await load('nowpayments-ipn');
const IPS = 'ipn_test';
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
const npSig = (b, s = IPS) => createHmac('sha512', s).update(JSON.stringify(sortKeys(b))).digest('hex');
const np = (extra = {}) => ({ payment_id: 5001, order_id: `${FREE}:1700000000000`, payment_status: 'finished', price_amount: 29, price_currency: 'usd', pay_amount: 0.0004, ...extra });
const npCall = (b, sig) => call(ipn, 'POST', b, { 'x-nowpayments-sig': sig ?? npSig(b) });
const days = (who) => (new Date(prof(who).plan_until) - Date.now()) / 86400000;
const near = (a, b) => Math.abs(a - b) < 0.01;

reset();
ok((await npCall(np())).status === 503, 'nowpayments: rejects when IPN secret not configured');
reset({ NOWPAYMENTS_IPN_SECRET: IPS });
ok((await npCall(np(), npSig(np(), 'wrong'))).status === 400 && prof('tok-free').plan === 'free', 'nowpayments: wrong signature rejected');
ok((await npCall(np(), '')).status === 400, 'nowpayments: missing signature rejected');
ok((await npCall({ ...np(), price_amount: 1 }, npSig(np()))).status === 400, 'nowpayments: tampered body rejected');
ok((await call(ipn, 'POST', '{bad', { 'x-nowpayments-sig': 'x' })).status === 400, 'nowpayments: malformed payload rejected');
await npCall(np({ payment_status: 'waiting' }));
ok(prof('tok-free').plan === 'free' && H.db.payments[0].status === 'waiting', 'nowpayments: waiting payment grants nothing');
await npCall(np());
ok(prof('tok-free').plan === 'pro' && near(days('tok-free'), 30), 'nowpayments activation: finished payment grants 30 days');
await npCall(np()); await npCall(np({ payment_status: 'confirmed' }));
ok(near(days('tok-free'), 30) && H.db.payments[0].status === 'finished', 'nowpayments: duplicate IPN grants once; status never downgraded');
reset({ NOWPAYMENTS_IPN_SECRET: IPS });
await Promise.all([npCall(np({ payment_id: 6001 })), npCall(np({ payment_id: 6001 })), npCall(np({ payment_id: 6001 }))]);
ok(near(days('tok-free'), 30), 'nowpayments: concurrent duplicate IPNs grant once');
await npCall(np({ payment_id: 6002 }));
ok(near(days('tok-free'), 60), 'nowpayments: a second real payment stacks to 60 days');
await npCall(np({ payment_id: 6002, payment_status: 'refunded' }));
ok(near(days('tok-free'), 30), 'nowpayments refund: refunded payment removes its 30 days');
await npCall(np({ payment_id: 6002, payment_status: 'refunded' })); await npCall(np({ payment_id: 6002 }));
ok(near(days('tok-free'), 30), 'nowpayments refund: duplicate refund and a late "finished" after refund change nothing');
await npCall(np({ payment_id: 6999, payment_status: 'refunded' }));
ok(near(days('tok-free'), 30), 'nowpayments refund: refund for a payment that never finished removes nothing');
reset({ NOWPAYMENTS_IPN_SECRET: IPS });
await npCall(np({ price_amount: 5 }));
ok(prof('tok-free').plan === 'free', 'nowpayments: underpriced invoice grants nothing');
await npCall(np({ payment_id: 7001, price_currency: 'eur' }));
ok(prof('tok-free').plan === 'free', 'nowpayments: wrong currency grants nothing');
await npCall(np({ payment_id: 7002, order_id: 'not-a-user:1' }));
ok(prof('tok-free').plan === 'free', 'nowpayments: unknown order id ignored');

// ======================= Overlapping card + crypto =======================
reset({ STRIPE_WEBHOOK_SECRET: WHS, STRIPE_SECRET_KEY: 'sk_test_x', NOWPAYMENTS_IPN_SECRET: IPS }); setSub();
await npCall(np({ payment_id: 8001 }));
await stripeCall(completed());
ok(approx(prof('tok-free').plan_until, END + GRACE), 'overlap: card period beyond crypto time sets plan end');
await stripeCall(subEvent('customer.subscription.deleted', { status: 'canceled' }));
ok(prof('tok-free').plan === 'pro' && near(days('tok-free'), 30), 'overlap: cancelling the card keeps prepaid crypto days');
await stripeCall({ id: 'evt_r3', type: 'charge.refunded', data: { object: { id: 'ch_2', customer: 'cus_1', amount: 2900, amount_refunded: 2900, currency: 'usd' } } });
ok(prof('tok-free').plan === 'pro' && near(days('tok-free'), 30), 'overlap: a card refund never removes crypto time');
await npCall(np({ payment_id: 8001, payment_status: 'refunded' }));
ok(prof('tok-free').plan === 'free', 'overlap: refunding the crypto payment too ends Pro');

// ======================= Billing =======================
const billing = await load('billing');
const bill = (method) => call(billing, 'POST', { method }, { authorization: 'Bearer tok-free' });
reset({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_PRO: 'price_1', NOWPAYMENTS_API_KEY: 'np' });
ok((await call(billing, 'POST', { method: 'card' })).status === 401, 'billing: unauthenticated rejected');
H.fetchReply = (u) => (u.includes('checkout/sessions') ? { status: 200, body: { url: 'https://checkout.stripe.com/c/1' } } : u.includes('nowpayments') ? { status: 200, body: { invoice_url: 'https://nowpayments.io/i/1' } } : { status: 404, body: {} });
const co = await bill('card');
const coForm = new URLSearchParams(H.fetches[0].init.body.toString());
ok(co.body.url && coForm.get('client_reference_id') === FREE && coForm.get('subscription_data[metadata][user_id]') === FREE && !coForm.get('subscription_data[trial_end]'), 'billing checkout: carries user id; no trial without crypto time');
H.fetches = []; await bill('crypto');
const npBody = JSON.parse(H.fetches[0].init.body);
ok(H.fetches[0].url.startsWith('https://api.nowpayments.io/') && npBody.price_amount === 29 && npBody.order_id.startsWith(FREE + ':'), 'billing crypto: $29 invoice tied to the user, live API by default');
H.env.NOWPAYMENTS_SANDBOX = 'true'; H.fetches = []; await bill('crypto');
ok(H.fetches[0].url.startsWith('https://api-sandbox.nowpayments.io/'), 'billing crypto: NOWPAYMENTS_SANDBOX=true uses the sandbox API');
delete H.env.NOWPAYMENTS_SANDBOX;
// Overlap guards
prof('tok-free').crypto_until = new Date(Date.now() + 20 * 86400000).toISOString(); H.fetches = [];
await bill('card');
const trial = Number(new URLSearchParams(H.fetches[0].init.body.toString()).get('subscription_data[trial_end]'));
ok(Math.abs(trial - Math.floor(Date.parse(prof('tok-free').crypto_until) / 1000)) <= 1, 'billing overlap: card bought during crypto time starts billing when crypto ends');
prof('tok-free').card_until = new Date(Date.now() + 10 * 86400000).toISOString(); H.fetches = [];
const blocked = await bill('crypto');
ok(blocked.status === 409 && H.fetches.length === 0, 'billing overlap: crypto purchase blocked while card Pro is running');
// Portal + duplicate subscription
reset({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_PRO: 'price_1' });
const port = await bill('portal');
ok(port.status === 404 && /nothing to cancel/.test(port.body.error), 'billing portal: no card subscription explains');
prof('tok-free').stripe_customer_id = 'cus_1';
H.fetchReply = (u) => (u.includes('billing_portal') ? { status: 200, body: { url: 'https://billing.stripe.com/p/1' } } : u.includes('subscriptions?') ? { status: 200, body: { data: [{ status: 'active' }] } } : u.includes('checkout/sessions') ? { status: 200, body: { url: 'https://checkout.stripe.com/c/2' } } : { status: 404, body: {} });
ok((await bill('portal')).body.url === 'https://billing.stripe.com/p/1', 'billing portal: Manage billing opens the Stripe portal (cancel path)');
H.fetches = [];
const dup = await bill('card');
ok(dup.body.existing === true && !H.fetches.some((f) => f.url.includes('checkout/sessions')), 'billing: existing subscriber is sent to portal, no second subscription');
reset({});
ok((await bill('card')).status === 503, 'billing: card off when keys missing');
ok((await bill('crypto')).status === 503, 'billing: crypto off when key missing');

// ======================= Static security checks =======================
const APP = path.resolve(HERE, '..');
const ignore = fs.readFileSync(path.join(APP, '.vercelignore'), 'utf8');
ok(/^tests$/m.test(ignore) && /^supabase$/m.test(ignore), 'deploy: tests/ and supabase/ excluded from the public site');
const shipped = ['app.js', 'engine.js', 'firms.js', 'index.html', 'privacy.html', 'terms.html'].map((f) => fs.readFileSync(path.join(APP, f), 'utf8')).join('\n');
ok(!/sk_(live|test)_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,}|service_role|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(shipped), 'secrets: no Stripe/Supabase secret keys in shipped files');
for (const fn of ['billing', 'mt5']) ok(/await userFrom\(req\)/.test(fs.readFileSync(path.join(SRC, fn, 'index.ts'), 'utf8')), `auth: ${fn} verifies the user itself (functions run with verify_jwt off)`);
const mt5Src = fs.readFileSync(path.join(SRC, 'mt5/index.ts'), 'utf8');
ok(mt5Src.indexOf('mt5Enabled(') > 0 && mt5Src.indexOf('mt5Enabled(') < Math.min(mt5Src.indexOf('userFrom(req)'), mt5Src.indexOf('req.json()'), mt5Src.indexOf('await api(')), 'mt5: kill switch runs before auth, body parsing and any broker call');

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
