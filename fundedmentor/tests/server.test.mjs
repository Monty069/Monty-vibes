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
  rpc: async (name, { uid }) => { H.dbOps++; const p = (H.db.profiles || []).find((r) => r.id === uid); return { data: name === 'is_pro' && !!p && p.plan === 'pro' && (!p.plan_until || new Date(p.plan_until) > new Date()) }; },
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
const sign = (payload, t = Math.floor(Date.now() / 1000), secret = WHS) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;
const stripeCall = (event, sig) => { const p = JSON.stringify(event); return call(stripeHook, 'POST', p, { 'stripe-signature': sig ?? sign(p) }); };
const END = Math.floor(Date.now() / 1000) + 30 * 86400;
const subReply = (meta = { user_id: H.users['tok-free'] }, end = END) => (u) => (u.includes('/subscriptions/') ? { status: 200, body: { id: 'sub_1', status: 'active', current_period_end: end, metadata: meta } } : { status: 404, body: {} });
const completed = (extra = {}) => ({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1', client_reference_id: H.users['tok-free'], customer: 'cus_1', subscription: 'sub_1', payment_status: 'paid', amount_total: 2900, currency: 'usd', ...extra } } });
const approx = (iso, sec) => Math.abs(new Date(iso).getTime() / 1000 - sec) < 5;

reset();
ok((await stripeCall(completed())).status === 503, 'stripe: rejects when webhook secret not configured');
reset({ STRIPE_WEBHOOK_SECRET: WHS, STRIPE_SECRET_KEY: 'sk_test_x' }); H.fetchReply = subReply();
ok((await stripeCall(completed(), sign(JSON.stringify(completed()), undefined, 'whsec_wrong'))).status === 400 && prof('tok-free').plan === 'free', 'stripe: wrong signature rejected, no entitlement');
ok((await stripeCall(completed(), 't=1,v1=00')).status === 400, 'stripe: garbage signature rejected');
ok((await stripeCall(completed(), sign(JSON.stringify(completed()), Math.floor(Date.now() / 1000) - 3600))).status === 400 && prof('tok-free').plan === 'free', 'stripe: replayed (1h old) signature rejected');
ok((await call(stripeHook, 'GET')).status === 405, 'stripe: non-POST rejected');
ok((await stripeCall(completed({ payment_status: 'unpaid' }))).status === 200 && prof('tok-free').plan === 'free', 'stripe: unpaid checkout grants nothing');
await stripeCall(completed());
ok(prof('tok-free').plan === 'pro' && approx(prof('tok-free').plan_until, END + 3 * 86400), 'stripe: paid checkout grants Pro until period end + 3d grace (dated, never open-ended)');
ok(prof('tok-free').stripe_customer_id === 'cus_1', 'stripe: customer id stored for portal');
const until1 = prof('tok-free').plan_until;
await stripeCall(completed()); await stripeCall(completed());
ok(prof('tok-free').plan_until === until1 && H.db.payments.length === 1, 'stripe: duplicate deliveries are idempotent');
H.fetchReply = subReply(undefined, END + 30 * 86400);
const inv = { id: 'evt_2', type: 'invoice.paid', data: { object: { id: 'in_2', subscription: 'sub_1', amount_paid: 2900, currency: 'usd' } } };
await stripeCall(inv);
ok(approx(prof('tok-free').plan_until, END + 33 * 86400), 'stripe: renewal invoice extends Pro');
H.fetchReply = subReply(undefined, END); await stripeCall({ ...inv, data: { object: { ...inv.data.object, id: 'in_1' } } });
ok(approx(prof('tok-free').plan_until, END + 33 * 86400), 'stripe: late/out-of-order older invoice never shortens Pro');
ok(H.db.payments.filter((p) => p.status === 'paid').length === 2, 'stripe: revenue recorded once per invoice');
await stripeCall({ id: 'evt_3', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', metadata: { user_id: H.users['tok-free'] } } } });
ok(prof('tok-free').plan === 'free' && prof('tok-free').plan_until === null, 'stripe: cancellation ends Pro');
ok((await stripeCall({ id: 'e', type: 'invoice.paid', data: { object: { id: 'in_x' } } })).status === 200, 'stripe: event without subscription is ignored safely');
ok((await call(stripeHook, 'POST', 'not json', { 'stripe-signature': sign('not json') })).status === 400, 'stripe: signed but malformed payload rejected');

// ======================= NOWPayments IPN =======================
const ipn = await load('nowpayments-ipn');
const IPS = 'ipn_test';
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
const npSig = (b, s = IPS) => createHmac('sha512', s).update(JSON.stringify(sortKeys(b))).digest('hex');
const np = (extra = {}) => ({ payment_id: 5001, order_id: `${H.users['tok-free']}:1700000000000`, payment_status: 'finished', price_amount: 29, price_currency: 'usd', pay_amount: 0.0004, ...extra });
const npCall = (b, sig) => call(ipn, 'POST', b, { 'x-nowpayments-sig': sig ?? npSig(b) });
const days = (who) => (new Date(prof(who).plan_until) - Date.now()) / 86400000;

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
ok(prof('tok-free').plan === 'pro' && Math.abs(days('tok-free') - 30) < 0.01, 'nowpayments: finished payment grants 30 days');
await npCall(np()); await npCall(np({ payment_status: 'confirmed' }));
ok(Math.abs(days('tok-free') - 30) < 0.01 && H.db.payments[0].status === 'finished', 'nowpayments: duplicate IPN grants once; status never downgraded');
reset({ NOWPAYMENTS_IPN_SECRET: IPS });
await Promise.all([npCall(np({ payment_id: 6001 })), npCall(np({ payment_id: 6001 })), npCall(np({ payment_id: 6001 }))]);
ok(Math.abs(days('tok-free') - 30) < 0.01, 'nowpayments: concurrent duplicate IPNs grant once');
await npCall(np({ payment_id: 6002 }));
ok(Math.abs(days('tok-free') - 60) < 0.01, 'nowpayments: a second real payment stacks to 60 days');
reset({ NOWPAYMENTS_IPN_SECRET: IPS });
await npCall(np({ price_amount: 5 }));
ok(prof('tok-free').plan === 'free', 'nowpayments: underpriced invoice grants nothing');
await npCall(np({ payment_id: 7001, price_currency: 'eur' }));
ok(prof('tok-free').plan === 'free', 'nowpayments: wrong currency grants nothing');
await npCall(np({ payment_id: 7002, order_id: 'not-a-user:1' }));
ok(H.db.profiles.every((p) => p.id !== 'not-a-user') && prof('tok-free').plan === 'free', 'nowpayments: unknown order id ignored');

// ======================= Billing =======================
const billing = await load('billing');
reset({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_PRO: 'price_1', NOWPAYMENTS_API_KEY: 'np' });
ok((await call(billing, 'POST', { method: 'card' })).status === 401, 'billing: unauthenticated rejected');
H.fetchReply = (u) => (u.includes('checkout/sessions') ? { status: 200, body: { url: 'https://checkout.stripe.com/c/1' } } : { status: 404, body: {} });
const co = await call(billing, 'POST', { method: 'card' }, { authorization: 'Bearer tok-free' });
const coForm = new URLSearchParams(H.fetches[0].init.body.toString());
ok(co.body.url && coForm.get('client_reference_id') === H.users['tok-free'] && coForm.get('subscription_data[metadata][user_id]') === H.users['tok-free'], 'billing: checkout carries user id for the webhook');
const port = await call(billing, 'POST', { method: 'portal' }, { authorization: 'Bearer tok-free' });
ok(port.status === 404 && /nothing to cancel/.test(port.body.error), 'billing: portal without card subscription explains');
prof('tok-free').stripe_customer_id = 'cus_1';
H.fetchReply = (u) => (u.includes('billing_portal') ? { status: 200, body: { url: 'https://billing.stripe.com/p/1' } } : u.includes('subscriptions?') ? { status: 200, body: { data: [{ status: 'active' }] } } : u.includes('checkout/sessions') ? { status: 200, body: { url: 'https://checkout.stripe.com/c/2' } } : { status: 404, body: {} });
const port2 = await call(billing, 'POST', { method: 'portal' }, { authorization: 'Bearer tok-free' });
ok(port2.body.url === 'https://billing.stripe.com/p/1', 'billing: Manage billing opens the Stripe portal (cancel path)');
H.fetches = [];
const dup = await call(billing, 'POST', { method: 'card' }, { authorization: 'Bearer tok-free' });
ok(dup.body.existing === true && !H.fetches.some((f) => f.url.includes('checkout/sessions')), 'billing: existing subscriber is sent to portal, no second subscription');
reset({});
ok((await call(billing, 'POST', { method: 'card' }, { authorization: 'Bearer tok-free' })).status === 503, 'billing: card off when keys missing');
ok((await call(billing, 'POST', { method: 'crypto' }, { authorization: 'Bearer tok-free' })).status === 503, 'billing: crypto off when key missing');

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
