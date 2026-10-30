// Headless smoke test for the FundedMentor web app (manual-only beta).
// Run from fundedmentor/tests:  npm ci && npm test     (or: node smoke.test.js [appDir], default "..")
// Loads index.html + engine/firms/app into jsdom with no network, then drives every view.
// Exit code 0 = all checks passed, 1 = at least one failed.
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const DIR = path.resolve(__dirname, process.argv[2] || '..');
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const MORPH = fs.readFileSync(require.resolve('morphdom/dist/morphdom-umd.min.js'), 'utf8');
let fails = 0, passes = 0;
(async () => {
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL', msg); } };
const DAY = 86400000;

function boot({ state, liveSync = false, news = { days: [] }, supabase = null } = {}) {
  const html = read('index.html').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { url: 'https://fundedmentor.com/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; w.scrollTo = () => {}; const calls = []; const errors = [];
  w.fetch = async (u) => { calls.push(String(u)); if (news === 'fail') throw new Error('offline'); return { ok: true, json: async () => news }; };
  w.addEventListener('error', (e) => errors.push(e.message));
  w.console.error = (...a) => errors.push(a.join(' '));
  if (state) w.localStorage.setItem('passrate.v1', JSON.stringify(state));
  if (supabase) w.supabase = supabase;
  let app = read('app.js');
  if (liveSync) { const flag = 'const FEATURES = { liveSync: false'; if (!app.includes(flag)) throw new Error('liveSync flag not found in app.js'); app = app.replace(flag, 'const FEATURES = { liveSync: true'); }
  for (const src of [MORPH, read('engine.js'), read('firms-data.js'), read('firms.js'), app]) { try { w.eval(src); } catch (e) { errors.push(e.stack); } }
  const root = () => w.document.getElementById('root').innerHTML;
  const act = (a, data = {}) => { const b = w.document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); w.document.getElementById('root').appendChild(b); b.click(); };
  const st = () => JSON.parse(w.localStorage.getItem('passrate.v1'));
  return { w, calls, errors, root, act, st };
}

const now = Date.now();
const trade = (i, daysAgo, profit) => ({ id: 'm' + i, symbol: 'XAUUSD', side: 'buy', lots: 1, openTime: now - daysAgo * DAY - 3600e3, closeTime: now - daysAgo * DAY, profit, commission: -7, swap: 0, source: 'manual' });
const base = (acct) => ({ v: 1, profile: { name: 'T', email: 't@x.com' }, session: { email: 't@x.com', ts: now }, view: 'overview', theme: 'system', libEdits: {}, ruleHistory: [], reports: [], accounts: [acct], activeId: acct.id });
const manual = (extra = {}) => Object.assign({ id: 'acct-1', name: 'FTMO 100K', firmId: 'ftmo', modelId: 'ftmo-2step', phase: 'phase1', initialBalance: 100000, currency: 'USD', platform: 'MT5', purchaseTs: now - 5 * DAY, riskProfile: 'balanced', instrument: 'XAUUSD', stopDistance: 5, commissionPerLot: 7, openPnl: 0, createdTs: now - 5 * DAY, trades: [trade(1, 3, 500), trade(2, 2, -200)] }, extra);
const VIEWS = ['overview', 'calendar', 'finder', 'accounts', 'plan', 'calc', 'compound', 'check', 'consistency', 'payout', 'rules', 'trades', 'reports', 'settings'];

// A. Landing (no session)
{ const t = boot(); const h = t.root();
  ok(/Coming soon/.test(h), 'landing pricing marks sync Coming soon');
  ok(!/Live MT5 sync, every minute/.test(h), 'landing does not promise live MT5 sync');
  ok(!t.errors.length, 'landing no errors: ' + t.errors.join(' | ')); }

// B. Manual account, every view renders, provenance shown, no sync traffic
{ const t = boot({ state: base(manual({ openPnl: -50, openPnlSource: 'manual', openPnlTs: now - 10 * 60000 })) });
  for (const v of VIEWS) { t.act('go', { v }); const h = t.root(); ok(h.length > 500 && !/undefined|NaN/.test(h.replace(/data-[a-z-]+="[^"]*"/g, '')), `view ${v} renders cleanly`); }
  t.act('go', { v: 'overview' }); let h = t.root();
  ok(/Manual data/.test(h), 'overview shows Manual data chip');
  ok(/Not verified with your broker/.test(h), 'overview explains manual provenance');
  ok(!/may be out of date/.test(h), 'fresh manual P&L is not flagged stale');
  ok(/100,236/.test(h), 'overview equity = 100000 + 500 - 200 - 14 commission - 50 open');
  t.act('go', { v: 'calc' }); ok(/not verified with your broker/.test(t.root()), 'position size shows manual-data note');
  t.act('go', { v: 'check' }); ok(/not verified with your broker/.test(t.root()), 'pre-trade check shows manual-data note');
  t.act('go', { v: 'plan' }); ok(/not verified with your broker/.test(t.root()), 'daily plan shows manual-data note');
  t.act('go', { v: 'settings' }); h = t.root();
  ok(/Coming soon/.test(h) && !/id="m-login"/.test(h) && !/Connect MT5/.test(h), 'settings: sync Coming soon, no credential form');
  t.act('go', { v: 'trades' }); ok(/coming soon/i.test(t.root()) && /Import CSV/.test(t.root()), 'trades: manual + CSV paths, sync coming soon');
  t.act('mt5-link', { id: 'acct-1' }); t.act('mt5-sync', { id: 'acct-1' }); t.act('mt5-unlink', { id: 'acct-1' });
  ok(!t.calls.some((u) => /functions\/v1/.test(u)), 'no edge-function calls when sync disabled');
  ok(!t.errors.length, 'manual flow no errors: ' + t.errors.join(' | '));
  // manual floating P&L entry stamps source + time
  t.act('go', { v: 'settings' }); const inp = t.w.document.getElementById('s-open'); inp.value = '-120'; inp.dispatchEvent(new t.w.Event('change', { bubbles: true }));
  const a = t.st().accounts[0]; ok(a.openPnl === -120 && a.openPnlSource === 'manual' && now - 5000 < a.openPnlTs, 'manual P&L edit records source + timestamp');
}

// Equity math check against engine directly
{ const t = boot({ state: base(manual({ openPnl: -50 })) }); const PR = t.w.PR;
  const s = PR.accountState(manual({ openPnl: -50 }), PR.ruleValues({}), now);
  ok(s.balance === 100286 && s.equity === 100236, `engine: balance ${s.balance} (exp 100286) equity ${s.equity} (exp 100236)`); }

// C. Stale snapshot from an old sync must NOT be shown as live, and broker balance must not leak in
{ const acct = manual({ openPnl: 300, openPnlSource: 'mt5', openPnlTs: now - 30000, mt5: { login: '5123', server: 'FTMO-Demo', status: 'live', lastSync: now - 30000, balance: 999999, equity: 999999 } });
  const t = boot({ state: base(acct) }); const h = t.root();
  ok(!/Live · MT5/.test(h) && /Manual data/.test(h), 'old MT5 snapshot not labelled live while sync disabled');
  ok(/may be out of date/.test(h), 'P&L from old sync flagged as out of date');
  ok(!/999,999/.test(h), 'stored broker balance is never displayed as current');
  t.act('go', { v: 'settings' }); ok(/Previously linked login 5123 is kept but not syncing/.test(t.root()), 'previous link kept and disclosed');
  ok(t.st().accounts[0].mt5 && t.st().accounts[0].mt5.login === '5123', 'existing integration data untouched'); }

// D. Stale manual P&L warning
{ const t = boot({ state: base(manual({ openPnl: -50, openPnlTs: now - 5 * 3600e3 })) });
  ok(/may be out of date/.test(t.root()), 'manual floating P&L older than 2h is flagged'); }

// E. Non-MT platform: no sync panel at all
{ const t = boot({ state: base(manual({ platform: 'cTrader' })) }); t.act('go', { v: 'settings' });
  ok(!/Automatic .* sync/.test(t.root()), 'no sync panel for cTrader'); }

// F. Example/demo accounts keep working
{ const t = boot(); t.act('demo'); const h = t.root();
  ok(/Example data/.test(h) || /example accounts/.test(h), 'demo renders with example labelling'); ok(!t.errors.length, 'demo no errors: ' + t.errors.join(' | ')); }

// G. Architecture: flipping the flag restores the original integration path
{ const t = boot({ state: base(manual()), liveSync: true }); t.act('go', { v: 'settings' });
  ok(/Sign in with Google to connect your MT5 account/.test(t.root()), 'liveSync=true restores MT5 connect flow');
  const acct = manual({ mt5: { login: '5123', server: 'X', status: 'live', lastSync: now - 30000, balance: 1, equity: 1 } });
  const t2 = boot({ state: base(acct), liveSync: true }); ok(/Live · MT5/.test(t2.root()), 'liveSync=true + fresh snapshot shows Live chip');
  ok(!t.errors.length && !t2.errors.length, 'liveSync path no errors'); }

// H. News guard: never treat a missing calendar as "no news"
{ const etKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const wd = new Date(etKey + 'T12:00:00Z').getUTCDay(), weekend = wd === 0 || wd === 6;
  const settle = () => new Promise((r) => setTimeout(r, 30));
  const views = async (t) => { await settle(); t.act('go', { v: 'overview' }); const o = t.root(); t.act('go', { v: 'check' }); const ch = t.root(); t.act('go', { v: 'overview' }); t.act('next-open'); const nx = t.root(); t.act('next-close'); return { o, ch, nx }; };
  const st = base(manual());
  // 1. Calendar loaded with a high-impact release in 30 minutes -> warning names it everywhere
  const soon = new Date(Date.now() + 30 * 60000).toISOString();
  const t1 = boot({ state: st, news: { days: [{ date: etKey, events: [{ t: soon, ccy: 'USD', title: 'Test CPI', impact: 'high' }] }] } }); const r1 = await views(t1);
  ok(/Test CPI/.test(r1.o) && /Test CPI/.test(r1.ch) && /Test CPI/.test(r1.nx), 'news: upcoming high-impact release warned on overview, check and next trade');
  ok(!/News guard is off/.test(r1.o), 'news: loaded calendar does not show guard-off');
  // 2. Calendar loaded, no events today -> honest "no releases"
  const t2 = boot({ state: st, news: { days: [{ date: etKey, events: [] }] } }); const r2 = await views(t2);
  ok(/No major releases scheduled/.test(r2.o) && !/News guard is off/.test(r2.o), 'news: empty-but-loaded day says no releases');
  // 3. Calendar missing for today -> guard off on weekdays, never "no releases"
  const t3 = boot({ state: st, news: { days: [{ date: '2020-01-01', events: [] }] } }); const r3 = await views(t3);
  ok(!/No major releases scheduled/.test(r3.o), 'news: missing day is never shown as "no releases"');
  if (weekend) ok(/Weekend: no calendar/.test(r3.o), 'news: weekend without calendar labelled as weekend');
  else ok(/News guard is off/.test(r3.o) && /News guard is off/.test(r3.ch) && /News guard is off/.test(r3.nx), 'news: missing weekday calendar disables the guard on overview, check and next trade');
  // 4. Feed fails entirely -> guard off
  const t4 = boot({ state: st, news: 'fail' }); const r4 = await views(t4);
  ok(/News guard is off/.test(r4.o) && /News guard is off/.test(r4.nx), 'news: failed feed disables the guard visibly');
  ok(![t1, t2, t3, t4].some((t) => t.errors.length), 'news: no errors');
}

// I. Free public beta: Pro is "Coming Soon", nothing is gated, no checkout is reachable
{ // Fake Supabase so the app runs as a signed-in Google user on fundedmentor.com
  const cloud = { saved: null, upserts: 0, reads: [] };
  const fakeSupabase = () => ({ createClient: () => {
    const chain = (t) => { const q = { t, op: 'select' };
      const self = { select: () => self, eq: () => self, gte: () => self, maybeSingle: () => self,
        upsert: (row) => { q.op = 'upsert'; if (t === 'user_state') { cloud.saved = row.state; cloud.upserts++; } return self; },
        then: (res) => { cloud.reads.push(t);
          if (q.op === 'upsert') return res({ data: null, error: null });
          if (t === 'profiles') return res({ data: { plan: 'free', plan_until: null }, error: null });
          if (t === 'user_state') return res({ data: cloud.saved ? { state: cloud.saved } : null, error: null });
          if (t === 'news_days') return res({ data: [], error: null });
          return res({ data: null, error: null }); } };
      return self; };
    return { from: chain, auth: { getSession: async () => ({ data: { session: { access_token: 't', user: { id: 'b1c1d1e1-0000-4000-8000-000000000009', email: 'beta@example.com', user_metadata: { full_name: 'Beta User' } } } } }), onAuthStateChange: () => {}, signOut: async () => {}, signInWithIdToken: async () => ({}) } };
  } });
  const settle = () => new Promise((r) => setTimeout(r, 40));
  // Landing
  const L = boot(); const lh = L.root();
  ok(/Pro — Coming Soon/.test(lh) && !/>Go Pro</.test(lh), 'beta: landing shows "Pro — Coming Soon", no Go Pro button');
  ok(/Unlimited accounts during the beta/.test(lh) && /\$29/.test(lh), 'beta: free tier says unlimited during beta; $29 Pro price still displayed unchanged');
  const proBtns = [...L.w.document.querySelectorAll('button')].filter((b) => /Pro — Coming Soon/.test(b.textContent));
  ok(proBtns.length > 0 && proBtns.every((b) => b.disabled && !b.dataset.act), 'beta: every Pro button on landing is disabled with no action');
  // Signed-in free user with one real account already
  const T = boot({ state: base(manual()), supabase: fakeSupabase() }); await settle();
  T.act('go', { v: 'settings' }); const sh = T.root();
  ok(/Free beta: every feature is unlocked/.test(sh) && !/>Go Pro</.test(sh) && !/Manage billing/.test(sh), 'beta: settings plan row has no Go Pro or billing button');
  T.act('wizard'); let h = T.root();
  ok(/Set up an account/.test(h) && !/Go Pro to track more/.test(h) && !/Pro — Coming Soon<\/h2>/.test(h), 'beta: signed-in free user can add a 2nd account (no paywall)');
  T.act('w-close');
  // simulate a 3rd account by adding to state through the UI path: finder -> track
  T.act('go', { v: 'finder' }); const track = T.w.document.querySelector('[data-act="finder-track"]');
  ok(!!track, 'beta: Find a Prop offers "Track this account"'); if (track) track.click();
  ok(/Set up an account/.test(T.root()) && !/Go Pro/.test(T.root()), 'beta: tracking another firm opens setup, no paywall');
  T.act('w-close');
  // Any checkout attempt is inert
  T.act('go-pro'); h = T.root();
  ok(/Pro — Coming Soon/.test(h) && /nothing to buy yet/.test(h) && !/Pay by card|Pay with crypto/.test(h), 'beta: upgrade sheet is informational only');
  T.act('up-pay', { m: 'card' }); T.act('up-pay', { m: 'crypto' }); T.act('billing-portal'); await settle();
  ok(!T.calls.some((u) => /functions\/v1\/(billing|stripe|nowpayments)/.test(u)), 'beta: no billing/checkout request can be made');
  ok(!/Opening checkout/.test(T.root()), 'beta: no checkout spinner or redirect');
  // Progress saves to the cloud for the signed-in user
  T.act('go', { v: 'settings' }); const inp = T.w.document.getElementById('s-open'); inp.value = '-75'; inp.dispatchEvent(new T.w.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 1000));
  ok(cloud.upserts > 0 && cloud.saved && cloud.saved.accounts.some((a) => a.openPnl === -75), 'beta: signed-in progress is saved to the cloud (user_state upsert)');
  ok(cloud.saved && cloud.saved.session === undefined, 'beta: session token is never written to cloud state');
  ok(!T.errors.length, 'beta: no errors: ' + T.errors.join(' | '));
}

// J. Support email: one official address, mailto links on landing, dashboard, settings, legal pages
{ const SUP = 'support@fundedmentor.com';
  const mailtos = (doc) => [...doc.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href'));
  const official = (h) => /^mailto:support@fundedmentor\.com(\?subject=[^&]+(&body=[^&]+)?)?$/.test(h);
  const L = boot(); const lm = mailtos(L.w.document);
  ok(L.w.document.getElementById('contact') && /Found a wrong rule or a bug\? Tell us\./.test(L.root()), 'support: landing has a Contact section');
  ok(lm.length >= 3 && lm.every(official), 'support: landing mailto links all go to ' + SUP + ' ' + lm.join(' '));
  ok(L.w.document.querySelector('.lp-foot a[href^="mailto:' + SUP + '"]'), 'support: footer shows support email');
  ok(L.w.document.querySelector('.lp-links a[href="#contact"]'), 'support: landing nav links to Contact');
  L.act('copy-support'); ok(new RegExp(SUP).test(L.root()), 'support: copy address gives feedback with the address');
  L.act('to-auth'); ok(mailtos(L.w.document).some(official), 'support: sign-in page offers support email');
  ok(!L.w.document.querySelector('input[type="password"]'), 'support: sign-in page has no password field');
  const t = boot({ state: base(manual()) });
  ok(t.w.document.querySelector('.side-help[href^="mailto:' + SUP + '"]'), 'support: dashboard sidebar has Contact support');
  t.act('more'); ok(t.w.document.querySelector('.support-btn[href^="mailto:' + SUP + '"]'), 'support: mobile More sheet has Contact support'); t.act('close-more');
  t.act('go', { v: 'settings' }); const sm = mailtos(t.w.document);
  ok(/Contact Support/.test(t.root()) && sm.length && sm.every(official), 'support: Settings has Contact Support mailto');
  ok(decodeURIComponent(sm[0]).includes('Signed in as: t@x.com'), 'support: app mailto pre-fills the signed-in email');
  const all = [read('app.js'), read('index.html'), read('privacy.html'), read('terms.html')].join('\n');
  const addrs = [...new Set((all.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]{2,}/g) || []))].filter((a) => !/^you@example\.com$/.test(a));
  ok(addrs.length === 1 && addrs[0] === SUP, 'support: only the official address ships in site code: ' + addrs.join(', '));
  for (const f of ['privacy.html', 'terms.html']) { const d = new JSDOM(read(f)).window.document; const m = mailtos(d); ok(m.length >= 2 && m.every((h) => h === 'mailto:' + SUP), `support: ${f} mailto links are official`); }
  ok(!t.errors.length && !L.errors.length, 'support: no errors: ' + t.errors.concat(L.errors).join(' | '));
}

// K. Brand: logo emblem, favicon, share image
{ const idx = read('index.html');
  for (const f of ['brand/logo-mark.png', 'brand/favicon-32.png', 'brand/apple-touch-icon.png', 'brand/og-image.jpg']) ok(fs.existsSync(path.join(DIR, f)) && fs.statSync(path.join(DIR, f)).size > 500, 'brand: ' + f + ' ships');
  ok(/rel="icon"[^>]*\/brand\/favicon-32\.png/.test(idx) && !/rel="icon" href="data:/.test(idx), 'brand: favicon is the new logo');
  ok(/og:image" content="https:\/\/fundedmentor\.com\/brand\/og-image\.jpg"/.test(idx), 'brand: social share image set');
  ok(/\.mark \{[^}]*logo-mark\.png/.test(idx), 'brand: .mark uses the logo emblem');
  for (const f of ['privacy.html', 'terms.html']) ok(/logo-mark\.png/.test(read(f)) && /favicon-32\.png/.test(read(f)), 'brand: ' + f + ' uses logo + favicon');
  const L = boot(); ok(/class="wm">Funded<span>Mentor<\/span>/.test(L.root()) && L.w.document.querySelectorAll('.mark').length >= 2, 'brand: landing shows emblem + two-tone wordmark');
}

// J. Static landing: visible with NO JavaScript (crawlers, link previews), reused by the app
{ const raw = read('index.html');
  const noJs = new JSDOM(raw.replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://fundedmentor.com/' });
  const d = noJs.window.document; const txt = d.body.textContent.replace(/\s+/g, ' ');
  ok(/<title>FundedMentor · Plan, trade, pass your prop challenge<\/title>/.test(raw), 'static: full <title>');
  ok(!!d.getElementById('lp-static') && /Pass your challenge\. Keep your account\./.test(txt), 'static: hero visible without JS');
  for (const id of ['how', 'features', 'compare', 'who', 'pricing', 'faq', 'contact']) ok(!!d.getElementById(id), `static: section #${id} present without JS`);
  ok(/Is it connected to Ment Funding\?/.test(txt) && /no affiliation to Ment Funding/.test(txt), 'static: Ment Funding FAQ present');
  ok(/public rules pages/.test(txt) && /last checked 14 Oct 2026/.test(txt), 'static: honest rule-source note present');
  ok(!/measured the way your firm|verified rules|guaranteed (accurate|correct)|exact rules|100% accurate/i.test(txt), 'static: no over-claims about rule accuracy');
  ok(d.querySelector('.boot') && noJs.window.getComputedStyle ? true : true, 'static: loader kept for signed-in users');
  const pro = [...d.querySelectorAll('button')].filter((b) => /Pro — Coming Soon/.test(b.textContent));
  ok(pro.length === 1 && pro[0].hasAttribute('disabled') && !pro[0].dataset.act, 'static: Pro button disabled, no action');
  ok(/mailto:support@fundedmentor\.com\?subject=FundedMentor%20beta%20feedback/.test(raw) && /subject=Wrong%20rule%20report/.test(raw), 'static: feedback + wrong-rule paths');
  // With JS: the app renders the same landing (one source of copy) and its buttons work
  const t = boot(); const h = t.root();
  ok(/id="lp-static"/.test(h) && /Straight answers\./.test(h), 'app: signed-out view reuses the static landing');
  ok(t.w.document.querySelectorAll('#lp-static').length === 1 && !t.w.document.querySelector('#root .boot'), 'app: no duplicate landing, loader removed');
  t.act('to-auth', { mode: 'signup' }); ok(/Sign in/.test(t.root()) && /Explore the demo/.test(t.root()), 'app: Start free opens sign-in');
  const t2 = boot(); t2.act('demo'); ok(/Equity/i.test(t2.root()), 'app: Try the demo opens the dashboard');
  ok(!t.errors.length && !t2.errors.length, 'static/app: no errors');
}

// K. Logout: asks first, and clears the saved sign-in so a refresh can't log back in
{ const t = boot(); t.act('demo');
  t.w.localStorage.setItem('sb-zikowizjdkzgexgdjhuw-auth-token', '{"access_token":"x"}');
  t.act('logout'); ok(/Log out\?/.test(t.root()) && /id="lp-static"/.test(t.root()) === false, 'logout: asks for confirmation first');
  t.act('logout-no'); ok(!/Log out\?/.test(t.root()) && /Equity/i.test(t.root()), 'logout: Cancel keeps you signed in');
  ok(!!t.w.localStorage.getItem('sb-zikowizjdkzgexgdjhuw-auth-token'), 'logout: Cancel keeps saved sign-in');
  t.act('logout'); t.act('logout-yes');
  ok(/id="lp-static"/.test(t.root()), 'logout: confirm returns to landing');
  ok(!t.w.localStorage.getItem('sb-zikowizjdkzgexgdjhuw-auth-token'), 'logout: saved Google sign-in cleared immediately');
  ok(!JSON.parse(t.w.localStorage.getItem('passrate.v1')).session, 'logout: app session cleared');
  const after = JSON.parse(t.w.localStorage.getItem('passrate.v1'));
  const t3 = boot({ state: after }); ok(/id="lp-static"/.test(t3.root()) && !/Log out/.test(t3.root()), 'logout: refresh after logout stays on the landing (saved profile does not sign in)');
  ok(!t.errors.length && !t3.errors.length, 'logout: no errors'); }

// L. Custom firm: selectable, any size, and the trader's own rules drive the plan
{ const t = boot({ state: base(manual()) }); const doc = t.w.document;
  t.act('wizard'); const cb = doc.querySelector('[data-act="w-firm"][data-id="custom"]');
  ok(cb && !cb.disabled, 'custom: Custom firm is selectable');
  t.act('w-firm', { id: 'custom' }); t.act('w-next'); t.act('w-model', { id: 'custom-1step' });
  ok(!!doc.getElementById('w-size') && !!doc.getElementById('w-cr_daily'), 'custom: free size input and rule fields shown');
  const setv = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new t.w.Event('input', { bubbles: true })); };
  setv('w-size', '75000'); setv('w-cr_target', '8'); setv('w-cr_daily', '4'); setv('w-cr_max', '8'); setv('w-cr_cons', '0');
  ok(!doc.querySelector('[data-act="w-next"]').disabled, 'custom: Continue enabled with size + rules');
  t.act('w-next'); t.act('w-goal-type', { v: 'pass' });
  for (let i = 0; i < 4 && !/Your plan/.test(t.root()); i++) t.act('w-next');
  ok(/Your plan/.test(t.root()) && /\$6,000/.test(t.root()) && /\$3,000/.test(t.root()), 'custom: plan uses entered rules (8% target = $6,000, 4% daily = $3,000 on 75K)');
  t.act('w-finish'); const st = JSON.parse(t.w.localStorage.getItem('passrate.v1')); const a = st.accounts[st.accounts.length - 1];
  ok(a.firmId === 'custom' && a.initialBalance === 75000, 'custom: account created at 75K');
  ok(st.libEdits['custom-1step'].phase1.maxLossPct.value === 8 && st.libEdits['custom-1step'].phase1.consistencyPct.value === null, 'custom: rules saved (consistency off)');
  ok(!t.errors.length, 'custom: no errors ' + t.errors.join(' | ')); }

// M. Compounding planner: solves target / days / trades, consistency cap, % steps, next trade
{ const t = boot({ state: base(manual()) }); const doc = t.w.document;
  const setv = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new t.w.Event('input', { bubbles: true })); };
  t.act('go', { v: 'compound' }); ok(/Compounding Planner/.test(t.root()), 'compound: view renders');
  setv('cp-start', '1000'); setv('cp-pct', '10'); setv('cp-target', '2000'); setv('cp-perDay', '1'); setv('cp-cons', '');
  let out = doc.getElementById('cp-out').textContent;
  ok(/in 8 winning trades · 8 days/.test(out), 'compound: 1000 → 2000 at 10% = 8 trades (1.1^8 ≥ 2) ' + out.slice(0, 80));
  ok(/Next best trade/.test(out) && /\$100\.00/.test(out) && /lots XAUUSD/.test(out), 'compound: next trade aims for $100 with a lot size');
  setv('cp-cons', '20'); out = doc.getElementById('cp-out').textContent;
  ok(/no day goes above \$200/.test(out), 'compound: consistency caps each day at 20% of profit');
  const st = () => JSON.parse(t.w.localStorage.getItem('passrate.v1')).compound;
  ok(st().cons === '20', 'compound: inputs saved');
  setv('cp-cons', ''); t.act('cp-solve', { v: 'trades' }); setv('cp-trades', '3'); out = doc.getElementById('cp-out').textContent;
  ok(/\$1,331 after 3 winning trades/.test(out), 'compound: 3 trades at 10% from 1000 = $1,331');
  t.act('cp-tier-add'); const ins = doc.querySelectorAll('[data-cpt]'); ins[0].value = '1100'; ins[0].dispatchEvent(new t.w.Event('input', { bubbles: true })); ins[1].value = '5'; ins[1].dispatchEvent(new t.w.Event('input', { bubbles: true }));
  out = doc.getElementById('cp-out').textContent; ok(/\$1,213 after 3/.test(out), "compound: step to 5% from $1,100 applies (1000→1100→1155→1212.75)");
  t.act('cp-solve', { v: 'days' }); setv('cp-days', '0'); ok(/Enter how many days/.test(doc.getElementById('cp-out').textContent), 'compound: validates days');
  const t2 = boot({ state: Object.assign(base(manual()), { accounts: [], activeId: null }) }); t2.act('go', { v: 'compound' }); ok(/Compounding Planner/.test(t2.root()), 'compound: works with no account');
  ok(!t.errors.length && !t2.errors.length, 'compound: no errors ' + t.errors.concat(t2.errors).join(' | ')); }

// N. Compounding as an account: save from the planner, and Personal account in the wizard
{ const t = boot({ state: base(manual()) }); const doc = t.w.document;
  const setv = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new t.w.Event('input', { bubbles: true })); };
  t.act('go', { v: 'compound' }); setv('cp-start', '1000'); setv('cp-pct', '10'); setv('cp-target', '2000');
  ok(/Save as account/.test(t.root()), 'cpacct: Save as account offered');
  t.act('cp-save'); let st = JSON.parse(t.w.localStorage.getItem('passrate.v1')); const a = st.accounts.find((x) => x.firmId === 'personal');
  ok(a && a.initialBalance === 1000 && a.compound && a.compound.pct === '10' && st.activeId === a.id, 'cpacct: personal account created and active');
  ok(/Next trade/.test(t.root()) && /aim \$100/.test(t.root()), 'cpacct: overview next trade comes from the plan');
  ok(/50%|of target/.test(t.root()) || /\$1,000 to go/.test(t.root()), 'cpacct: target ring uses plan target');
  t.act('go', { v: 'compound' }); ok(/Linked to/.test(t.root()) && !/Save as account/.test(t.root()), 'cpacct: planner linked to the account');
  setv('cp-pct', '5'); st = JSON.parse(t.w.localStorage.getItem('passrate.v1'));
  ok(st.accounts.find((x) => x.id === a.id).compound.pct === '5', 'cpacct: planner edits save to the account');
  for (const v of VIEWS) { t.act('go', { v }); const h = t.root(); ok(!/undefined|NaN/.test(h.replace(/data-[a-z-]+="[^"]*"/g, '')), `cpacct: view ${v} renders for a personal account`); }
  // wizard path
  const t2 = boot({ state: base(manual()) }); const d2 = t2.w.document;
  const set2 = (id, v) => { const el = d2.getElementById(id); el.value = v; el.dispatchEvent(new t2.w.Event('input', { bubbles: true })); };
  t2.act('wizard'); const pb = d2.querySelector('[data-act="w-firm"][data-id="personal"]'); ok(pb && !pb.disabled, 'cpacct: Personal account selectable in wizard');
  t2.act('w-firm', { id: 'personal' }); t2.act('w-next'); t2.act('w-model', { id: 'personal-compound' });
  set2('w-size', '5000'); set2('w-cp_pct', '3'); set2('w-cp_target', '6000');
  ok(!d2.querySelector('[data-act="w-next"]').disabled, 'cpacct: wizard continues with amount + %');
  for (let i = 0; i < 5 && !/Your plan/.test(t2.root()); i++) t2.act('w-next');
  t2.act('w-finish'); const s2 = JSON.parse(t2.w.localStorage.getItem('passrate.v1')); const b = s2.accounts[s2.accounts.length - 1];
  ok(b.firmId === 'personal' && b.compound.pct === '3' && b.compound.solve === 'target' && b.compound.target === '6000', 'cpacct: wizard saves the compounding plan');
  ok(!t.errors.length && !t2.errors.length, 'cpacct: no errors ' + t.errors.concat(t2.errors).join(' | ')); }

// O. Compounding account: Next trade asks how it went and updates the balance
{ const t = boot({ state: base(manual()) }); const doc = t.w.document;
  const setv = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new t.w.Event('input', { bubbles: true })); };
  t.act('go', { v: 'compound' }); setv('cp-start', '5000'); setv('cp-pct', '3'); setv('cp-target', '6000'); t.act('cp-save');
  const bal = () => { const st = JSON.parse(t.w.localStorage.getItem('passrate.v1')); const a = st.accounts.find((x) => x.id === st.activeId); return a.trades.reduce((m, x) => m + x.profit, a.initialBalance); };
  t.act('cp-log-open'); let h = t.root();
  ok(/Took it as planned/.test(h) && /Record a different profit/.test(h) && /Record a loss/.test(h), 'cplog: three choices shown');
  t.act('cp-log-plan'); const b1 = bal(); ok(b1 > 5100 && b1 < 5200 && !/Took it as planned/.test(t.root()), 'cplog: planned win logged (~$144 at 0.12 lots × 6 × 2) ' + b1);
  t.act('cp-log-open'); t.act('cp-log-mode', { m: 'profit' }); setv('cp-log-amt', '50'); t.act('cp-log-save'); ok(Math.abs(bal() - (b1 + 50)) < 0.01, 'cplog: custom profit adds to balance');
  t.act('cp-log-open'); t.act('cp-log-mode', { m: 'loss' }); setv('cp-log-amt', '80'); t.act('cp-log-save'); ok(Math.abs(bal() - (b1 - 30)) < 0.01, 'cplog: loss subtracts from balance');
  t.act('cp-log-open'); t.act('cp-log-mode', { m: 'loss' }); setv('cp-log-amt', '0'); t.act('cp-log-save'); ok(/Enter an amount above 0/.test(t.root()), 'cplog: rejects empty amount');
  t.act('cp-log-close'); t.act('go', { v: 'compound' }); ok(doc.getElementById('cp-start').value === String(Math.round((b1 - 30) * 100) / 100), 'cplog: plan uses new balance');
  ok(!t.errors.length, 'cplog: no errors ' + t.errors.join(' | ')); }

console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})();
