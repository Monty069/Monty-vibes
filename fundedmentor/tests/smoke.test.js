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
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL', msg); } };
const DAY = 86400000;

function boot({ state, liveSync = false, news = { days: [] } } = {}) {
  const html = read('index.html').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { url: 'https://fundedmentor.com/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; w.scrollTo = () => {}; const calls = []; const errors = [];
  w.fetch = async (u) => { calls.push(String(u)); return { ok: true, json: async () => news }; };
  w.addEventListener('error', (e) => errors.push(e.message));
  w.console.error = (...a) => errors.push(a.join(' '));
  if (state) w.localStorage.setItem('passrate.v1', JSON.stringify(state));
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
const VIEWS = ['overview', 'calendar', 'finder', 'accounts', 'plan', 'calc', 'check', 'consistency', 'payout', 'rules', 'trades', 'reports', 'settings'];

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

console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
