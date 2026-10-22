/* FUNDEDMENTOR — application layer. Rendering + state. All numbers come from engine.js (window.PR). */
(function () {
  'use strict';
  const PR = window.PR, FIRMS = window.FIRMS, META = window.RULE_META;
  const STORE = 'passrate.v1';
  const DAY = 86400000;

  // ---------- utils ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const fmt$ = (v, d = 2) => (v == null || Number.isNaN(Number(v)) ? '—' : (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const sgn$ = (v, d = 2) => (v == null ? '—' : (v > 0 ? '+' : '') + fmt$(v, d));
  const pct = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d) + '%');
  const cls = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');
  const uid = () => Math.random().toString(36).slice(2, 10);
  const dateStr = (ts) => (ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
  const dtStr = (ts) => (ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const dayLabel = (k) => new Date(k + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const toLocalInput = (ts) => { const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------- icons ----------
  const P = {
    overview: 'M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z',
    accounts: 'M3 7h18v13H3zM3 7l2-4h14l2 4M8 12h8',
    plan: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5',
    calc: 'M5 3h14v18H5zM8 7h8M8 12h2M14 12h2M8 16h2M14 16h2',
    check: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM8.5 12l2.5 2.5 4.5-5',
    consistency: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    payout: 'M12 3v18M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H6',
    rules: 'M4 5h16M4 10h16M4 15h10M4 20h7',
    trades: 'M3 6h18M3 12h18M3 18h18',
    reports: 'M4 20l5-6 4 3 7-9M20 8V4h-4',
    settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-2.7-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H3a2 2 0 110-4h.1a1.6 1.6 0 001.1-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 002.7-1.1V3a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1.3z',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2',
    finder: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M8 11h6M11 8v6',
    spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
    warn: 'M12 3l10 18H2zM12 10v5M12 18h.01',
    info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 11v6M12 7h.01',
    ok: 'M20 6L9 17l-5-5',
    x: 'M18 6L6 18M6 6l12 12',
    plus: 'M12 5v14M5 12h14',
    chev: 'M6 9l6 6 6-6',
    ext: 'M14 3h7v7M21 3l-9 9M10 5H5v14h14v-5',
  };
  const icon = (k, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}><path d="${P[k]}"/></svg>`;

  const NAV = [
    ['overview', 'Overview'], ['calendar', 'Performance'], ['finder', 'Find a Prop'], ['accounts', 'My Accounts'], ['plan', 'Daily Plan'], ['calc', 'Position Size'], ['check', 'Pre-Trade Check'],
    ['consistency', 'Consistency'], ['payout', 'Payout Center'], ['rules', 'Firm Rules'], ['trades', 'Trade History'], ['reports', 'Reports'], ['settings', 'Settings'],
  ];
  const TABS = [['overview', 'Home'], ['calendar', 'Calendar'], ['check', 'Check'], ['calc', 'Size'], ['more', 'More']];

  // ---------- state ----------
  let state = load() || seed();
  if (!state.session && state.profile) state.session = { email: state.profile.email || '', ts: Date.now() };
  // Economic news lives in the artifact's shared store (news/<YYYY-MM-DD> docs, refreshed daily).
  let NEWS = {}; let newsState = 'loading';
  (async () => {
    try {
      const db = window.claude && window.claude.use ? await window.claude.use('db') : null;
      if (!db) {
        // Hosted site (fundedmentor.com): read the daily news file published next to the app.
        try { if (sb) { const { data, error } = await sb.from('news_days').select('date,events').gte('date', new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10)); if (error) throw error; for (const d of data || []) NEWS[d.date] = (d.events || []).slice().sort((p, q) => String(p.t).localeCompare(String(q.t))); newsState = 'ready'; render(); return; } const r = await fetch('news.json', { cache: 'no-store' }); if (!r.ok) throw 0; const j = await r.json(); for (const d of j.days || []) NEWS[d.date] = (d.events || []).slice().sort((p, q) => String(p.t).localeCompare(String(q.t))); newsState = 'ready'; }
        catch (e) { newsState = 'off'; }
        render(); return;
      }
      db.collection('news').onSnapshot((snap) => {
        const next = {};
        for (const d of snap.docs) { if (!d.exists) continue; const x = d.data(); if (x && x.date) next[x.date] = (x.events || []).slice().sort((p, q) => String(p.t).localeCompare(String(q.t))); }
        NEWS = next; newsState = 'ready'; render();
      }, () => { newsState = 'off'; render(); });
    } catch (e) { newsState = 'off'; render(); }
  })();
  const ui = { route: 'landing', authMode: 'signup', authErr: null, menu: false, more: false, wizard: null, copilot: false, chat: [], toast: null, ruleSearch: '', ruleFirm: 'ftmo', edit: null, confirm: null, csv: null, consWhatIf: '', calc: null, check: null };

  function load() { try { const s = JSON.parse(localStorage.getItem(STORE)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
  // Cloud: Supabase handles Google sign-in and keeps each user's data in sync across devices (fundedmentor.com only).
  const SB_URL = 'https://zikowizjdkzgexgdjhuw.supabase.co', SB_KEY = 'sb_publishable_QjqBW1ApA4GGKW9kP7tuIQ_92MDDAnM';
  const onSite = !/claude|claudeusercontent/.test(location.hostname) && location.protocol === 'https:';
  const sb = onSite && window.supabase && window.supabase.createClient ? window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
  let cloudUser = null, cloudTimer = null;
  function pushCloud() {
    if (!sb || !cloudUser) return;
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => { const body = Object.assign({}, state, { session: undefined }); sb.from('user_state').upsert({ user_id: cloudUser.id, state: body, updated_at: new Date().toISOString() }).then(() => {}, () => {}); }, 800);
  }
  // ---------- integrations ----------
  // Automatic MT4/MT5 sync is built (supabase/functions/mt5 via MetaApi + the client below) but not launched.
  // Every sync entry point checks FEATURES.liveSync, so flipping it to true is the only switch needed once
  // the bridge is production-ready. Until then the app runs entirely on manually entered data.
  const FEATURES = { liveSync: false };
  const SYNC_PLATFORMS = ['MT5']; // MT4 planned with the same bridge
  const LIVE_FRESH_MS = 5 * 60000; // a live snapshot older than this is treated as not live
  const OPEN_PNL_STALE_MS = 2 * 3600000;
  const canSync = (a) => FEATURES.liveSync && !!a && !a.example && SYNC_PLATFORMS.includes(a.platform);

  // Where the account's numbers come from. Only a fresh broker snapshot counts as verified live data;
  // everything else is what the trader entered (starting balance + recorded/imported trades + floating P&L).
  function dataSource(a, now = Date.now()) {
    if (a.example) return { kind: 'example', label: 'Example data', detail: 'Sample trades for the demo account. Not a real account.' };
    const m = a.mt5;
    if (canSync(a) && m && m.status === 'live' && m.lastSync && now - m.lastSync < LIVE_FRESH_MS)
      return { kind: 'live', label: 'Live · ' + a.platform, detail: `Balance, equity and trades verified from your broker at ${new Date(m.lastSync).toLocaleTimeString()}.`, asOf: m.lastSync };
    const open = Number(a.openPnl) || 0;
    const fromOldSync = a.openPnlSource === 'mt5';
    const stale = open !== 0 && (fromOldSync || !a.openPnlTs || now - a.openPnlTs > OPEN_PNL_STALE_MS);
    const openTxt = open === 0 ? 'no floating P&L entered' : fromOldSync ? 'floating P&L from an earlier broker sync, no longer updating' : a.openPnlTs ? `floating P&L entered ${dtStr(a.openPnlTs)}` : 'floating P&L entered manually';
    return { kind: 'manual', label: 'Manual data', detail: `Starting balance plus the trades you recorded; ${openTxt}. Not verified with your broker.`, stale, asOf: a.openPnlTs || null };
  }
  function srcChip(src) {
    if (!src) return '';
    const tone = src.kind === 'live' ? 'ok' : src.kind === 'example' ? '' : src.stale ? 'warn' : 'info';
    return `<span class="chip ${tone}" title="${esc(src.detail)}">${esc(src.label)}</span>`;
  }
  // One-line provenance note for any screen that sizes risk from equity.
  function srcNote(c) {
    if (!c || !c.src || c.src.kind === 'live') return c && c.src ? `<p class="hint src-note">${icon('ok', 'width="12" height="12"')} ${esc(c.src.detail)}</p>` : '';
    if (c.src.kind === 'example') return '';
    return `<p class="hint src-note">Equity ${fmt$(c.s.equity)} is calculated from manually entered data, not verified with your broker.${c.src.stale ? ' Floating P&L may be out of date: <button class="btn ghost sm" style="padding:0 4px;height:auto" data-act="go" data-v="settings">update it</button>.' : ''}</p>`;
  }

  // ---------- plan, payments, live MT5 ----------
  async function fn(name, body) {
    if (!sb || !cloudUser) return { error: 'Sign in with Google first.' };
    const { data } = await sb.auth.getSession(); const tok = data && data.session ? data.session.access_token : '';
    try {
      const r = await fetch(SB_URL + '/functions/v1/' + name, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: SB_KEY }, body: JSON.stringify(body || {}) });
      const j = await r.json().catch(() => ({})); if (!r.ok) return Object.assign({ error: j.error || 'Something went wrong. Try again.' }, j); return j;
    } catch (e) { return { error: 'No connection. Try again.' }; }
  }
  async function loadPlan() {
    if (!sb || !cloudUser) return;
    try { const { data } = await sb.from('profiles').select('plan, plan_until').eq('id', cloudUser.id).maybeSingle();
      ui.plan = data && data.plan === 'pro' && (!data.plan_until || Date.parse(data.plan_until) > Date.now()) ? 'pro' : 'free'; ui.planUntil = data ? data.plan_until : null; render(); } catch (e) { /* keep last known plan */ }
  }
  const isPro = () => ui.plan === 'pro';
  const realAccounts = () => state.accounts.filter((x) => !x.example).length;
  function applySync(id, res) {
    const a = state.accounts.find((x) => x.id === id); if (!a) return;
    a.mt5 = Object.assign({}, a.mt5 || {}, { status: res.status || (a.mt5 || {}).status, lastSync: res.snapshot ? res.snapshot.ts : (a.mt5 || {}).lastSync, err: res.error || null });
    if (res.snapshot) { a.openPnl = Math.round((res.snapshot.openPnl || 0) * 100) / 100; a.openPnlSource = 'mt5'; a.openPnlTs = res.snapshot.ts; a.mt5.balance = res.snapshot.balance; a.mt5.equity = res.snapshot.equity; a.mt5.positions = res.snapshot.openPositions; }
    if (Array.isArray(res.trades) && res.trades.length) { const have = new Set(a.trades.map((t) => t.id)); res.trades.filter((t) => t.closeTime >= (a.mt5.since || 0) && !have.has(t.id)).forEach((t) => a.trades.push(t)); }
    save();
  }
  async function syncMt5(id, quiet) {
    const a = state.accounts.find((x) => x.id === id); if (!a || !a.mt5 || !canSync(a)) return;
    ui.mt5Busy = id; if (!quiet) render();
    const res = await fn('mt5', { action: 'sync', localId: id, since: a.mt5.since || a.purchaseTs || a.createdTs });
    ui.mt5Busy = null; applySync(id, res); if (!quiet && !res.error && res.status === 'live') toast('MT5 synced'); else render();
  }
  if (FEATURES.liveSync) setInterval(() => { const a = active(); if (a && a.mt5 && canSync(a) && cloudUser && isPro() && document.visibilityState === 'visible' && ui.mt5Busy !== a.id) syncMt5(a.id, true); }, 60000);

  async function adoptUser(user) {
    cloudUser = user; const meta = user.user_metadata || {};
    state.profile = Object.assign({}, state.profile || {}, { name: meta.full_name || meta.name || (user.email || '').split('@')[0], email: user.email, avatar: meta.avatar_url || null });
    state.session = { email: user.email, google: true, ts: Date.now() };
    try {
      const { data } = await sb.from('user_state').select('state').eq('user_id', user.id).maybeSingle();
      if (data && data.state && Array.isArray(data.state.accounts)) { const keep = { session: state.session, profile: state.profile }; state = Object.assign({}, data.state, keep); }
      else { state.accounts = state.accounts.filter((a) => !a.example); state.activeId = state.accounts[0] ? state.accounts[0].id : null; pushCloud(); }
    } catch (e) { /* offline: keep local copy */ }
    if (ui.route === 'auth') ui.route = 'landing';
    save(); render(); loadPlan();
    if (/[?&]pro=success/.test(location.search)) { history.replaceState(null, '', location.pathname); toast('Payment received. Pro unlocks as soon as it confirms.'); setTimeout(loadPlan, 4000); setTimeout(loadPlan, 15000); }
  }
  if (sb) {
    sb.auth.getSession().then(({ data }) => { if (data && data.session) adoptUser(data.session.user); });
    sb.auth.onAuthStateChange((ev, session) => { if (ev === 'SIGNED_IN' && session && (!cloudUser || cloudUser.id !== session.user.id)) adoptUser(session.user); if (ev === 'SIGNED_OUT') { cloudUser = null; } });
  }
  // Google's own button (Google Identity Services): the popup names fundedmentor.com, then Supabase verifies the token.
  const GOOGLE_CLIENT_ID = '852273401682-h0n9vdraeet99lk9iqdtgk6f79f6r857.apps.googleusercontent.com';
  let gisReady = null;
  function setupGIS() {
    if (gisReady || !sb) return gisReady;
    gisReady = new Promise((resolve) => {
      let tries = 0;
      const wait = () => { if (window.google && google.accounts && google.accounts.id) go(); else if (++tries < 40) setTimeout(wait, 150); else resolve(false); };
      const go = async () => {
        try {
          const raw = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
          const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), (b) => b.toString(16).padStart(2, '0')).join('');
          google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, nonce: hash, ux_mode: 'popup', auto_select: false, itp_support: true, use_fedcm_for_button: true,
            callback: async (resp) => {
              ui.authBusy = true; ui.authErr = null; render();
              const { data, error } = await sb.auth.signInWithIdToken({ provider: 'google', token: resp.credential, nonce: raw });
              ui.authBusy = false;
              if (error) { ui.authErr = error.message; render(); return; }
              if (data && data.user) adoptUser(data.user);
            } });
          resolve(true);
        } catch (e) { resolve(false); }
      };
      wait();
    });
    return gisReady;
  }
  function mountGoogleButton() {
    const host = document.getElementById('gbtn'); if (!host || host.dataset.mounted) return;
    setupGIS() && gisReady.then((ok) => {
      const h = document.getElementById('gbtn'); if (!ok || !h || h.dataset.mounted) return;
      h.dataset.mounted = '1'; h.classList.add('on');
      google.accounts.id.renderButton(h, { type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'left', width: Math.min(400, h.clientWidth || 320) });
    });
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* storage unavailable: app still works for this session */ } pushCloud(); }

  function demoTrades(rows, now) {
    return rows.map(([daysAgo, hoursAgo, symbol, side, lots, profit, commission], i) => {
      const close = now - daysAgo * DAY - hoursAgo * 3600000;
      return { id: 'demo-' + i, symbol, side, lots, openTime: close - 40 * 60000, closeTime: close, profit, commission, swap: 0, source: 'example' };
    });
  }
  function seed() {
    const now = Date.now();
    return {
      v: 1, profile: null, view: 'overview', theme: 'system', libEdits: {}, ruleHistory: [], reports: [],
      accounts: [
        { id: 'demo-a', example: true, name: 'FTMO 100K · Challenge', firmId: 'ftmo', modelId: 'ftmo-2step', phase: 'phase1', initialBalance: 100000, currency: 'USD', platform: 'MT5', purchaseTs: now - 11 * DAY, riskProfile: 'balanced', instrument: 'XAUUSD', stopDistance: 6, commissionPerLot: 7, openPnl: -120, createdTs: now - 11 * DAY,
          trades: demoTrades([[9, 6, 'XAUUSD', 'buy', 1, 820, -7], [9, 3, 'EURUSD', 'sell', 2, -310, -14], [8, 4, 'XAUUSD', 'sell', 0.8, -400, -5.6], [7, 6, 'XAUUSD', 'buy', 1.2, 1460, -8.4], [7, 2, 'GBPUSD', 'buy', 1.5, 280, -10.5], [6, 4, 'XAUUSD', 'buy', 1, -520, -7], [3, 5, 'XAUUSD', 'sell', 1, 950, -7], [2, 4, 'EURUSD', 'buy', 2, 410, -14], [1, 5, 'XAUUSD', 'buy', 1, -380, -7], [0, 1, 'XAUUSD', 'sell', 0.8, -290, -5.6]], now) },
        { id: 'demo-b', example: true, name: 'Custom 50K · Funded', firmId: 'custom', modelId: 'custom-1step', phase: 'funded', initialBalance: 50000, currency: 'USD', platform: 'MT5', purchaseTs: now - 40 * DAY, fundedTs: now - 12 * DAY, riskProfile: 'conservative', instrument: 'XAUUSD', stopDistance: 5, commissionPerLot: 7, openPnl: 0, createdTs: now - 40 * DAY,
          trades: demoTrades([[11, 3, 'XAUUSD', 'buy', 1, 2400, -7], [9, 3, 'XAUUSD', 'sell', 0.5, 600, -3.5], [8, 3, 'EURUSD', 'buy', 1, -300, -7], [5, 3, 'XAUUSD', 'buy', 0.6, 700, -4.2], [2, 3, 'XAUUSD', 'sell', 0.5, 500, -3.5]], now) },
      ],
      activeId: 'demo-a',
    };
  }

  // ---------- library ----------
  function findModel(modelId) { for (const f of FIRMS) for (const m of f.models) if (m.id === modelId) return { firm: f, model: m }; return null; }
  // Size-specific limits (futures dollar rules) are layered under any admin edits.
  function sizeRecords(fm, phaseKey, size) {
    const sr = size != null && fm.model.sizeRules ? fm.model.sizeRules[size] : null;
    if (!sr) return {};
    const src = (fm.firm.sources && fm.firm.sources[0]) || {};
    const out = {};
    for (const k in sr) {
      if (sr[k] == null) continue;
      if (k === 'profitTargetAmount' && phaseKey === 'funded') continue;
      out[k] = { value: sr[k], status: 'needs_verification', source: src.url || null, checkedAt: fm.firm.checkedAt, verifiedAt: null, version: 1, notes: `Size-specific value for $${Number(size).toLocaleString()}.` };
    }
    return out;
  }
  function phaseRecords(modelId, phaseKey, size) {
    const fm = findModel(modelId); if (!fm) return {};
    const base = (fm.model.phases[phaseKey] || {}).rules || {};
    const ed = ((state.libEdits[modelId] || {})[phaseKey]) || {};
    const edSize = size != null ? ((state.libEdits[modelId] || {})[phaseKey + '@' + size]) || {} : {};
    return Object.assign({}, base, sizeRecords(fm, phaseKey, size), ed, edSize);
  }
  // Edits to size-specific values are stored per size; everything else per phase.
  function editBucket(modelId, phaseKey, key) {
    const fm = findModel(modelId); const size = (ui.ruleSize || {})[modelId] || (fm && fm.model.sizes[0]);
    const isSizeKey = fm && fm.model.sizeRules && fm.model.sizeRules[size] && key in fm.model.sizeRules[size];
    const bucket = isSizeKey ? phaseKey + '@' + size : phaseKey;
    return ((state.libEdits[modelId] = state.libEdits[modelId] || {})[bucket] = state.libEdits[modelId][bucket] || {});
  }
  function curSize(modelId) { const fm = findModel(modelId); return fm && Object.keys(fm.model.sizeRules || {}).length ? Number((ui.ruleSize || {})[modelId] || fm.model.sizes[0]) : null; }
  const isFut = (spec) => spec && spec.type === 'future';
  const qty = (n, spec) => isFut(spec) ? `${n.toFixed(0)} contract${n === 1 ? '' : 's'}` : `${n.toFixed(2)} lots`;
  const qtyNum = (n, spec) => isFut(spec) ? n.toFixed(0) : n.toFixed(2);
  const qtyUnit = (spec) => isFut(spec) ? ' contracts' : ' lots';
  function priceFor(m, size) { return m.prices && m.prices[size] != null ? m.prices[size] : null; }
  function buyLink(firm) { return (state.affiliates || {})[firm.id] || firm.site || null; }
  function specFor(sym, acct) { const base = PR.INSTRUMENTS[sym]; if (!base) return null; return Object.assign({}, base, ((acct && acct.specOverrides) || {})[sym] || {}); }
  const active = () => state.accounts.find((a) => a.id === state.activeId) || state.accounts[0] || null;

  function compute(acct, now = Date.now()) {
    const fm = findModel(acct.modelId); if (!fm) return null;
    const { firm, model } = fm;
    const records = phaseRecords(acct.modelId, acct.phase, acct.initialBalance);
    const rv = Object.assign(PR.ruleValues(records), { timezone: firm.timezone, resetHour: firm.resetHour, currency: acct.currency });
    const s = PR.accountState(acct, rv, now);
    const peaks = acct.peakEquity ? [acct.peakEquity] : [];
    const dl = PR.dailyLoss(rv, s);
    const dd = PR.maxDrawdown(rv, s, { equityPeaks: peaks });
    const td = PR.tradingDays(rv, s);
    const cons = PR.consistency(rv, s.dailyPnl);
    const payPhase = model.phases.funded ? 'funded' : acct.phase;
    const payRecs = phaseRecords(acct.modelId, payPhase, acct.initialBalance);
    const prv = Object.assign(PR.ruleValues(payRecs), { minTradingDays: payPhase === acct.phase ? rv.minTradingDays : undefined });
    const payCons = prv.consistencyPct ? PR.consistency(prv, s.dailyPnl) : null;
    const pay = PR.payout(prv, s, { now, fundedTs: acct.fundedTs, consistency: payCons });
    const spec = specFor(acct.instrument, acct);
    const plan = PR.plan(rv, s, acct.riskProfile || 'balanced', { spec, stopDistance: acct.stopDistance, commissionPerLot: acct.commissionPerLot, conversionRate: acct.conversionRate });
    const ver = PR.verification(records);
    const targetHit = plan.target != null && plan.remainingTarget === 0;
    const breached = (dl.applicable && dl.status === 'breached') || (dd.applicable && dd.status === 'breached');
    const status = breached ? 'breached' : targetHit && td.met ? 'passed' : 'active';
    return { firm, model, records, rv, s, dl, dd, td, cons, pay, payPhase, payVer: PR.verification(payRecs), plan, ver, spec, status, phase: model.phases[acct.phase], src: dataSource(acct, now) };
  }

  function alertsFor(c) {
    const out = [];
    if (c.src && c.src.kind === 'manual' && c.src.stale) out.push(['warn', 'Your floating P&L may be out of date, so equity and limits below may be off. Update it in Settings before sizing a trade.']);
    if (c.status === 'breached') out.push(['bad', 'A loss limit has been reached on these numbers. Stop trading and confirm the account status with the firm.']);
    for (const [r, name] of [[c.dl, 'daily loss'], [c.dd, 'maximum drawdown']]) {
      if (!r.applicable || r.status === 'breached') continue;
      if (r.status === 'critical') out.push(['bad', `${pct(r.usedPct, 0)} of your ${name} allowance is used. ${fmt$(r.remaining)} left.`]);
      else if (r.status === 'warning') out.push(['warn', `Half of your ${name} allowance is used. ${fmt$(r.remaining)} left.`]);
    }
    if (c.cons.applicable && c.cons.pass === false) out.push(['warn', `Consistency: best day is ${pct(c.cons.share)} of profit (limit ${c.cons.limitPct}%). About ${fmt$(c.cons.additional)} more profit is needed, spread over other days.`]);
    if (c.status === 'passed') out.push(['ok', 'Profit target and minimum trading days are met on these numbers. Confirm with the firm before treating the phase as passed.']);
    if (c.dd.estimate) out.push(['info', 'Intraday trailing drawdown is estimated from closed balances. Enter your peak equity in Settings for an exact floor.']);
    if (!c.ver.confirmed) out.push(['info', `${c.ver.unverified.length} rule${c.ver.unverified.length > 1 ? 's are' : ' is'} not verified for this model, so compliance results are unconfirmed.`]);
    return out;
  }

  // ---------- render shell ----------
  // Patch the live DOM instead of rebuilding it: only changed nodes are touched, so taps don't
  // re-layout the whole app, focus and scroll survive, and entry animations play once.
  function paint(html) {
    const root = $('#root');
    const shell = html.trimStart().slice(0, 40).match(/class="(\w[\w-]*)/);
    const cur = root.firstElementChild;
    if (!window.morphdom || !cur || !shell || !cur.classList.contains(shell[1])) { root.innerHTML = html; return; }
    const next = document.createElement('div'); next.id = 'root'; next.innerHTML = html;
    window.morphdom(root, next, {
      childrenOnly: true,
      onBeforeElUpdated(from, to) {
        if (from.isEqualNode(to)) return false;
        if (from.id === 'gbtn' && from.dataset.mounted) return false;
        if (from.type === 'file') return false;
        if (from === document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(from.tagName)) {
          for (const { name, value } of to.attributes) if (name !== 'value' && from.getAttribute(name) !== value) from.setAttribute(name, value);
          return false;
        }
        return true;
      },
    });
  }
  function render() {
    applyTheme();
    if (!state.session) { paint(ui.route === 'auth' ? authPage() : landing()); if (ui.route === 'auth') mountGoogleButton(); return; }
    const acct = active();
    const c = acct ? compute(acct) : null;
    const v = state.view;
    const body = !acct && !['rules', 'settings', 'accounts', 'finder'].includes(v) ? viewEmpty() : VIEWS[v] ? VIEWS[v](acct, c) : viewEmpty();
    paint(`
      <div class="app">
        <aside class="side">
          <div class="brand"><div class="mark" aria-hidden="true">FM</div><div><b>FundedMentor</b><small>Prop challenge copilot</small></div></div>
          <nav class="nav" aria-label="Main">${NAV.map(([k, l], i) => `${i === 9 ? '<div class="sep"></div>' : ''}<button data-act="go" data-v="${k}" ${v === k ? 'aria-current="page"' : ''}>${icon(k)}${l}</button>`).join('')}</nav>
          <div class="side-foot"><span class="acct-pill-ic">${esc(((state.profile && state.profile.name) || 'U').slice(0, 1).toUpperCase())}</span><span class="grow"><b>${esc((state.profile && state.profile.name) || 'Trader')}</b><small>${esc((state.profile && state.profile.email) || 'Signed in')}</small></span><button class="btn ghost sm" data-act="logout">Log out</button></div>
        </aside>
        <main class="main">
          <div class="top">
            <div class="mark top-mark" aria-hidden="true">FM</div><div class="grow">${acct ? acctPill(acct, c) : '<b>FundedMentor</b>'}</div>
            ${state.session && state.session.demo ? `<span class="chip info nodot demo-chip">Demo</span><button class="btn sm primary" data-act="to-auth" data-mode="signup">Sign in</button>` : ''}
            ${acct ? `<button class="btn sm top-cal" data-act="go" data-v="calendar" ${v === 'calendar' ? 'aria-current="page"' : ''} aria-label="Performance calendar">${icon('calendar', 'width="16" height="16"')}<span class="hide-sm">Performance</span></button>` : ''}
            <button class="btn sm hide-sm" data-act="wizard">${icon('plus', 'width="14" height="14"')}Add account</button>
          </div>
          ${state.accounts.some((a) => a.example) && !(state.session && state.session.demo) ? `<div class="banner"><span>You are looking at example accounts with sample trades. ${state.profile ? '' : 'Create your profile and add the account you bought.'}</span><span class="row"><button class="btn sm primary" data-act="wizard">Set up my account</button><button class="btn sm ghost" data-act="clear-examples">Remove examples</button></span></div>` : ''}
          ${body}
          <p class="disclaimer">FundedMentor is a planning and risk-management tool. It does not execute trades, guarantee that you pass an evaluation, or guarantee a payout. Rules marked “Needs verification” are sample values; always confirm with your firm’s official rules.</p>
        </main>
      </div>
      <nav class="tabbar" aria-label="Main">${TABS.map(([k, l]) => `<button data-act="${k === 'more' ? 'more' : 'go'}" data-v="${k}" ${v === k || (k === 'more' && !TABS.some((t) => t[0] === v)) ? 'aria-current="page"' : ''}>${icon(k)}${l}</button>`).join('')}</nav>
      ${acct ? `<button class="fab" data-act="copilot">${icon('spark')}Copilot</button>` : ''}
      ${ui.menu ? acctMenu() : ''}
      ${ui.more ? moreSheet() : ''}
      ${ui.wizard ? wizard() : ''}
      ${ui.next && acct && c ? nextSheet(acct, c) : ''}
      ${ui.copilot && acct ? copilot(acct, c) : ''}
      ${ui.upgrade ? upgradeSheet() : ''}
      ${ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : ''}`);
    if (ui.copilot) { const m = $('.msgs'); if (m) m.scrollTop = m.scrollHeight; }
  }

  function applyTheme() { const r = document.documentElement; if (state.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', state.theme); }
  function phaseLabel(c) { return c && c.phase ? c.phase.label : '—'; }
  function statusChip(st) { return st === 'breached' ? '<span class="chip bad">Limit reached</span>' : st === 'passed' ? '<span class="chip ok">Target met</span>' : '<span class="chip info">Active</span>'; }
  function verChip(ver) { return ver.confirmed ? '<span class="chip ok">Rules verified</span>' : '<span class="chip warn">Rules unverified</span>'; }
  function limitChip(r) { if (!r.applicable) return '<span class="chip">Not set</span>'; return { ok: '<span class="chip ok">Within limit</span>', warning: '<span class="chip warn">Approaching</span>', critical: '<span class="chip bad">Near limit</span>', breached: '<span class="chip bad">Breached</span>' }[r.status]; }
  function barClass(used) { return used >= 75 ? 'neg' : used >= 50 ? 'warn' : 'pos'; }
  function initials(a) { return (a.name.match(/\b\w/g) || ['A']).slice(0, 2).join('').toUpperCase(); }

  function acctPill(a, c) {
    return `<div style="position:relative;display:inline-block;max-width:100%"><button class="acct-pill" data-act="menu" aria-haspopup="true" aria-expanded="${ui.menu}">
      <span class="ic">${initials(a)}</span><span class="t"><b>${esc(a.name)}</b><small>${c ? esc(c.firm.name) + ' · ' + esc(phaseLabel(c)) : 'Model missing'}</small></span>${icon('chev', 'width="14" height="14" style="color:var(--muted);flex:none"')}</button></div>`;
  }
  function acctMenu() {
    return `<div class="overlay" data-act="close-menu" style="background:transparent;place-items:start"><div class="menu" style="top:calc(58px + env(safe-area-inset-top,0px));left:16px" data-stop>
      ${state.accounts.map((a) => { const c = compute(a); return `<button data-act="switch" data-id="${a.id}"><span class="acct-pill" style="border:0;padding:0;background:none"><span class="ic">${initials(a)}</span></span><span style="flex:1;min-width:0"><b style="display:block">${esc(a.name)}</b><small class="muted">${c ? esc(c.firm.name) + ' · ' + esc(phaseLabel(c)) + ' · ' + fmt$(c.s.balance, 0) : ''}</small></span>${a.id === state.activeId ? icon('ok', 'width="14" height="14"') : ''}</button>`; }).join('')}
      <div style="height:1px;background:var(--line);margin:6px 0"></div>
      <button data-act="wizard">${icon('plus', 'width="16" height="16"')}Add an account</button>
      <button data-act="go" data-v="accounts">${icon('accounts', 'width="16" height="16"')}Manage accounts</button></div></div>`;
  }
  function moreSheet() {
    return `<div class="overlay" data-act="close-more"><div class="sheet" data-stop><div class="sheet-h"><h2>All sections</h2><button class="btn ghost sm" data-act="close-more" aria-label="Close">${icon('x', 'width="16" height="16"')}</button></div>
      <div class="sheet-b"><div class="pick">${NAV.map(([k, l]) => `<button data-act="go" data-v="${k}" ${state.view === k ? 'aria-pressed="true"' : ''}><span class="row">${icon(k, 'width="16" height="16"')}<b>${l}</b></span></button>`).join('')}</div>
      <div class="row between"><button class="btn" data-act="wizard">${icon('plus', 'width="14" height="14"')}Add account</button><button class="btn ghost" data-act="logout">Log out</button></div></div></div></div>`;
  }

  function pageHead(title, sub, right = '') { return `<div class="page-h"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right ? `<div class="row">${right}</div>` : ''}</div>`; }
  function viewEmpty() {
    return `<div class="panel empty"><h2>No account yet</h2><p>Tell us which prop firm account you bought. We’ll turn its rules into a plan you can follow every day.</p><button class="btn primary" data-act="wizard">Set up my account</button></div>`;
  }

  // ---------- charts ----------
  function balanceChart(c) {
    const pts = c.s.balSeries.map((p) => p.balance); pts.push(c.s.equity);
    const lines = [];
    if (c.dd.applicable) lines.push({ v: c.dd.floor, label: 'Max loss floor', color: 'var(--neg)' });
    if (c.plan.target != null) lines.push({ v: c.s.initialBalance + c.plan.target, label: 'Target', color: 'var(--pos)' });
    const all = pts.concat(lines.map((l) => l.v), [c.s.initialBalance]);
    const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.08 || 100;
    const W = 640, H = 220, L = 8, R = 92, T = 10, B = 18;
    const y = (v) => T + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - T - B);
    const x = (i) => L + (pts.length > 1 ? (i / (pts.length - 1)) * (W - L - R) : 0);
    const path = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const area = `${path}L${x(pts.length - 1).toFixed(1)},${H - B}L${L},${H - B}Z`;
    const up = c.s.equity >= c.s.initialBalance;
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Balance history with floor and target lines">
      <defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${up ? 'var(--pos)' : 'var(--neg)'}" stop-opacity=".18"/><stop offset="1" stop-color="${up ? 'var(--pos)' : 'var(--neg)'}" stop-opacity="0"/></linearGradient></defs>
      <line x1="${L}" x2="${W - R}" y1="${y(c.s.initialBalance)}" y2="${y(c.s.initialBalance)}" stroke="var(--line-2)" stroke-dasharray="2 4"/>
      <text x="${W - R + 6}" y="${y(c.s.initialBalance) + 3}">Start ${fmt$(c.s.initialBalance, 0)}</text>
      ${lines.map((l) => `<line x1="${L}" x2="${W - R}" y1="${y(l.v)}" y2="${y(l.v)}" stroke="${l.color}" stroke-opacity=".7" stroke-dasharray="5 4"/><text x="${W - R + 6}" y="${y(l.v) + 3}" style="fill:${l.color}">${l.label}</text>`).join('')}
      <path d="${area}" fill="url(#ga)"/>
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(pts.length - 1)}" cy="${y(c.s.equity)}" r="7" fill="var(--accent)" fill-opacity=".18"/><circle cx="${x(pts.length - 1)}" cy="${y(c.s.equity)}" r="3.5" fill="var(--accent)"/>
    </svg></div>`;
  }
  function dailyBars(days, cap) {
    if (!days.length) return '<p class="muted">No closed trades yet.</p>';
    const W = 640, H = 180, T = 10, B = 22, L = 4, R = 4;
    const vals = days.map((d) => d.pnl).concat(cap ? [cap] : [], [0]);
    const hi = Math.max(...vals), lo = Math.min(...vals), span = hi - lo || 1;
    const y = (v) => T + (1 - (v - lo) / span) * (H - T - B);
    const bw = Math.min(36, (W - L - R) / days.length - 6);
    const step = (W - L - R) / days.length;
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily profit and loss">
      <line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line-2)"/>
      ${cap ? `<line x1="${L}" x2="${W - R}" y1="${y(cap)}" y2="${y(cap)}" stroke="var(--warn)" stroke-dasharray="5 4"/><text x="${W - R}" y="${y(cap) - 4}" text-anchor="end" style="fill:var(--warn)">Consistency cap ${fmt$(cap, 0)}</text>` : ''}
      ${days.map((d, i) => { const x = L + i * step + (step - bw) / 2; const y0 = y(Math.max(d.pnl, 0)), h = Math.max(1, Math.abs(y(d.pnl) - y(0))); return `<rect x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${d.pnl >= 0 ? 'var(--pos)' : 'var(--neg)'}"><title>${dayLabel(d.day)}: ${sgn$(d.pnl)}</title></rect>${days.length <= 14 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${dayLabel(d.day)}</text>` : ''}`; }).join('')}
    </svg></div>`;
  }

  // ---------- views ----------
  const VIEWS = {};

  VIEWS.overview = (a, c) => {
    if (!c) return viewEmpty();
    const al = alertsFor(c);
    const p = c.plan;
    const tgt = p.target != null;
    return `${pageHead(esc(a.name), `${esc(c.firm.name)} · ${esc(c.model.name)} · ${esc(phaseLabel(c))} · ${fmt$(a.initialBalance, 0)} account`, `${srcChip(c.src)}${statusChip(c.status)}${verChip(c.ver)}`)}
      ${al.length ? `<div class="stack" style="gap:8px;margin-bottom:16px">${al.map(([k, t]) => `<div class="alert ${k}">${icon(k === 'ok' ? 'ok' : k === 'info' ? 'info' : 'warn')}<span>${t}</span></div>`).join('')}</div>` : ''}
      <section class="hero">
        <div class="hero-main">
          <span class="label">Equity</span>
          <div class="hero-num">${fmt$(c.s.equity).replace(/(\.\d\d)$/, '<span class="cents">$1</span>')}</div>
          <div class="hero-sub"><span class="${cls(c.s.realized)}">${sgn$(c.s.realized)}</span> closed · today <span class="${cls(c.s.todayPnl)}">${sgn$(c.s.todayPnl)}</span></div>
          <div class="hero-stats">
            <div><span>Balance</span><b class="num">${fmt$(c.s.balance, 0)}</b></div>
            <div><span>Trading days</span><b class="num">${c.td.count}${c.td.min ? `<small> of ${c.td.min} min</small>` : ''}</b></div>
            <div><span>Consistency</span><b class="${c.cons.applicable ? (c.cons.pass === false ? 'warnc' : 'pos') : 'faint'}">${c.cons.applicable ? (c.cons.pass === false ? 'At risk' : c.cons.pass ? 'Pass' : '—') : 'No rule'}</b></div>
          </div>
          ${c.src.kind === 'example' ? '' : `<p class="hint src-note">${esc(c.src.detail)}</p>`}
        </div>
        <div class="hero-dial">${bezel(c, 228)}${nextBtn(a, c)}</div>
      </section>
      <div class="grid g2" style="margin-bottom:16px">
        <section class="panel limits">
          <div class="lim"><div class="row between"><span>Daily loss left</span><b class="num">${c.dl.applicable ? fmt$(c.dl.remaining, 0) : '—'}</b></div>${c.dl.applicable ? `<div class="thread"><i class="${barClass(c.dl.usedPct)}" style="width:${Math.max(0, 100 - c.dl.usedPct)}%"></i></div><span class="hint">${pct(Math.max(0, 100 - c.dl.usedPct), 0)} of ${fmt$(c.dl.limit, 0)} · resets ${c.firm.resetHour != null ? String(c.firm.resetHour).padStart(2, '0') + ':00 ' + esc(c.firm.timezone === 'UTC' ? 'UTC' : 'firm time') : 'daily'}</span>` : '<span class="hint">No daily limit in this phase</span>'}</div>
          <div class="lim"><div class="row between"><span>Drawdown left</span><b class="num ${c.dd.status === 'ok' ? '' : 'warnc'}">${c.dd.applicable ? fmt$(c.dd.remaining, 0) : '—'}</b></div>${c.dd.applicable ? `<div class="thread"><i class="${barClass(c.dd.usedPct)}" style="width:${Math.max(0, 100 - c.dd.usedPct)}%"></i></div><span class="hint">${pct(Math.max(0, 100 - c.dd.usedPct), 0)} left · floor ${fmt$(c.dd.floor, 0)}${c.dd.type !== 'static' ? ' · trailing' : ''}</span>` : '<span class="hint">Not set</span>'}</div>
        </section>
        ${newsPanel(c)}
      </div>
      <div class="grid g3" style="margin-bottom:16px">
        <section class="panel span2"><div class="panel-h"><h2>Balance</h2><span class="muted">${c.s.tradeCount} trades · ${c.td.count} trading days</span></div>${balanceChart(c)}</section>
        <section class="panel"><div class="panel-h"><h2>Rule status</h2><button class="btn ghost sm" data-act="go" data-v="rules">Rules</button></div>${ruleStatus(c)}</section>
      </div>
      <div class="grid g3">
        <section class="panel"><div class="panel-h"><h2>Today’s plan</h2><span class="chip nodot">${esc(p.profile.label)}</span></div>
          <dl class="kv"><dt>Risk per trade</dt><dd>${fmt$(p.riskPerTrade)}</dd><dt>Daily risk budget</dt><dd>${fmt$(p.dailyBudget)}</dd><dt>Max trades</dt><dd>${p.maxTrades}</dd>
          ${p.example && p.example.ok ? `<dt>${esc(a.instrument)} · ${a.stopDistance} ${esc(c.spec.distUnit)} stop</dt><dd>${qty(p.example.lots, c.spec)}</dd>` : ''}</dl>
          <p class="quote" style="margin-top:14px;font-size:13px">If the market does not present a suitable setup, not trading is a valid plan.</p>
          <button class="btn sm" style="margin-top:12px" data-act="go" data-v="plan">Open daily plan</button></section>
        <section class="panel"><div class="panel-h"><h2>Latest trades</h2><button class="btn ghost sm" data-act="go" data-v="trades">All</button></div>${latestTrades(a)}</section>
        <section class="panel"><div class="panel-h"><h2>Payout milestones</h2><button class="btn ghost sm" data-act="go" data-v="payout">Details</button></div>${payChecklist(c, true)}</section>
      </div>`;
  };

  // ---------- news ----------
  const etDate = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
  const newsFor = (key) => NEWS[key] || [];
  const tLocal = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  function newsSoon(now = Date.now(), withinMin = 60) {
    for (const e of newsFor(etDate(now))) { const t = Date.parse(e.t); if (e.impact === 'high' && t - now <= withinMin * 60000 && t - now > -15 * 60000) return e; }
    return null;
  }
  function newsList(events, now = Date.now(), key) {
    if (key && !(key in NEWS)) return '<p class="muted news-empty">The news calendar for this day isn’t loaded yet. Check your broker’s calendar before trading.</p>';
    if (!events.length) return '<p class="muted news-empty">No major releases scheduled.</p>';
    return `<ul class="news">${events.map((e) => { const t = Date.parse(e.t); const past = t < now - 15 * 60000; const live = !past && t - now < 60 * 60000 && t >= now - 15 * 60000;
      return `<li class="${past ? 'past' : ''}${live ? ' live' : ''}"><span class="news-t num">${tLocal(e.t)}</span><span class="news-c">${esc(e.ccy || 'USD')}</span><span class="news-n"><b>${esc(e.title)}</b>${e.forecast || e.previous ? `<small>${e.forecast ? 'Forecast ' + esc(e.forecast) : ''}${e.forecast && e.previous ? ' · ' : ''}${e.previous ? 'Prev ' + esc(e.previous) : ''}${e.actual ? ' · Actual ' + esc(e.actual) : ''}</small>` : ''}</span><span class="imp ${e.impact === 'high' ? 'hi' : 'md'}" title="${e.impact === 'high' ? 'High impact' : 'Medium impact'}">${e.impact === 'high' ? 'High' : 'Med'}</span></li>`; }).join('')}</ul>`;
  }
  function newsPanel(c) {
    const today = etDate(Date.now()); const ev = newsFor(today); const soon = newsSoon();
    const body = newsState === 'off' ? '<p class="muted news-empty">The news feed appears in the live app.</p>' : newsState === 'loading' ? '<p class="muted news-empty">Loading today’s calendar…</p>' : newsList(ev, Date.now(), today);
    return `<section class="panel"><div class="panel-h"><h2>Today’s news</h2><span class="muted">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · your time</span></div>
      ${soon ? `<div class="alert warn" style="margin-bottom:12px">${icon('warn')}<span><b>${esc(soon.title)}</b> at ${tLocal(soon.t)}. Avoid new entries 15 minutes either side${c && c.rv.newsRestricted ? '; this account restricts news trading' : ''}.</span></div>` : ''}${body}</section>`;
  }

  // ---------- bezel dial (target progress) ----------
  function bezel(c, size) {
    const p = c.plan; const has = p.target != null; const v = has ? p.progressPct : 0;
    const R = 72 * size / 228, C = 2 * Math.PI * R;
    return `<div class="bezel" style="--bz:${size}px" role="img" aria-label="${has ? `${v.toFixed(0)} percent of profit target reached, ${fmt$(p.remainingTarget, 0)} to go` : 'No profit target in this phase'}">
      <i class="bz-rim"></i><i class="bz-flute"></i><i class="bz-face"></i><i class="bz-min"></i><i class="bz-hr"></i>
      <svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><linearGradient id="bzarc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF0D0"/><stop offset=".55" stop-color="#DCBE7D"/><stop offset="1" stop-color="#9C7A3B"/></linearGradient></defs>
        <circle cx="${size / 2}" cy="${size / 2}" r="${R.toFixed(1)}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="3"/>
        ${has ? `<circle class="bz-arc" cx="${size / 2}" cy="${size / 2}" r="${R.toFixed(1)}" fill="none" stroke="url(#bzarc)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - v / 100)).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}</svg>
      <div class="bz-mid">${has ? `<b>${v.toFixed(0)}<small>%</small></b><span>of target</span><em>${p.remainingTarget === 0 ? 'Target reached' : fmt$(p.remainingTarget, 0) + ' to go'}</em>` : `<b>—</b><span>no target</span>`}</div><i class="bz-gloss"></i></div>`;
  }

  // ---------- next trade planner ----------
  const NT_MODES = [['pace', 'Target pace'], ['compound', 'Compound'], ['consistency', 'Consistency']];
  function nextTrade(a, c, mode) {
    const p = c.plan; const g = goalOf(a); const rr = Number(g.rr) > 0 ? Number(g.rr) : 2;
    const spec = c.spec; const stop = Number(a.stopDistance) || 0;
    const eq = c.s.equity; const remT = p.remainingTarget; const prof = p.profile;
    const tradesToday = c.s.balSeries.filter((b) => b.dayKey === c.s.todayKey).length;
    const caps = [p.dailyBudget, eq * Math.min(1, prof.riskPct * 2) / 100];
    if (c.dl.applicable) caps.push(c.dl.remaining * 0.5);
    if (c.dd.applicable) caps.push(c.dd.remaining * 0.25);
    const cap = Math.max(0, Math.min(...caps));
    const daysLeft = c.rv.maxTradingDays ? Math.max(1, c.rv.maxTradingDays - c.td.count) : Math.max(c.td.remaining || 0, 10);
    let raw = 0, why = '', after = '';
    if (mode === 'pace') {
      const perDay = remT != null ? remT / daysLeft : eq * prof.riskPct / 100 * rr;
      raw = perDay / rr;
      why = remT != null ? `${fmt$(remT, 0)} left over ${daysLeft} trading days is about ${fmt$(perDay, 0)} a day. One win at 1:${rr} covers it.` : `No target in this phase, so this keeps a steady ${prof.label.toLowerCase()} pace.`;
    } else if (mode === 'compound') {
      raw = eq * prof.riskPct / 100;
      why = `Risk a fixed ${prof.riskPct}% of current equity. Size grows after wins and shrinks after losses automatically.`;
      after = `After a win, next risk ≈ ${fmt$((eq + Math.min(raw, cap) * rr) * prof.riskPct / 100, 0)}. After a loss ≈ ${fmt$((eq - Math.min(raw, cap)) * prof.riskPct / 100, 0)}.`;
    } else {
      const pctRule = c.rv.consistencyPct; const target = p.target;
      const dayCap = pctRule && target ? target * pctRule / 100 : remT != null ? remT * 0.3 : eq * 0.01;
      const room = Math.max(0, dayCap - Math.max(0, c.s.todayPnl));
      raw = room / rr;
      why = pctRule ? `Your firm caps your best day at ${pctRule}% of profit. Keep today’s win under ${fmt$(dayCap, 0)}; ${fmt$(room, 0)} of room is left today. This is your ceiling, not a target.` : `No consistency rule here, so this keeps any single day under 30% of the remaining target (${fmt$(dayCap, 0)}) to stay safe for payouts. This is your ceiling, not a target.`;
    }
    const risk = Math.max(0, Math.min(raw, cap));
    const out = { mode, rr, risk, raw, cap, why, after, tradesToday, maxTrades: p.maxTrades, spec, stop };
    if (c.status === 'breached') return Object.assign(out, { stopReason: 'A loss limit has been reached. No more trades on this account.' });
    if (remT === 0) return Object.assign(out, { stopReason: 'Profit target reached. No trade needed; meet the minimum days with tiny size or wait.' });
    if (tradesToday >= p.maxTrades) return Object.assign(out, { stopReason: `You have taken ${tradesToday} trades today, your plan’s maximum. Done for today.` });
    if (risk <= 0) return Object.assign(out, { stopReason: mode === 'consistency' ? 'Today’s profit already reached the consistency room. Stop for today.' : 'No risk budget left today.' });
    if (!spec || !stop) return Object.assign(out, { stopReason: 'Set your instrument and usual stop in Settings to get a size.' });
    const r = PR.positionSize({ spec, stopDistance: stop, risk, riskMode: 'amount', equity: eq, accountCcy: a.currency, conversionRate: a.conversionRate, commissionPerLot: a.commissionPerLot });
    if (!r.ok || !r.lots) return Object.assign(out, { stopReason: r.reason || (r.warnings && r.warnings[0]) || 'Risk is too small for the minimum size.' });
    const actual = r.actualRisk; const win = actual * rr;
    return Object.assign(out, { lots: r.lots, actual, win, pctEq: actual / eq * 100, dlAfter: c.dl.applicable ? c.dl.remaining - actual : null, ddAfter: c.dd.applicable ? c.dd.remaining - actual : null, warnings: r.warnings || [] });
  }
  function bestMode(a, c) {
    const opts = NT_MODES.map(([k]) => nextTrade(a, c, k)).filter((x) => !x.stopReason);
    if (!opts.length) return 'pace';
    return opts.reduce((m, x) => (x.actual < m.actual ? x : m)).mode;
  }
  function nextBtn(a, c) {
    const rec = bestMode(a, c); const t = nextTrade(a, c, rec);
    return `<button class="next-btn" data-act="next-open"><span class="next-l">Next trade</span><span class="next-v">${t.stopReason ? 'No trade · tap for why' : `${qty(t.lots, t.spec)} ${esc(a.instrument)} · risk ${fmt$(t.actual, 0)}`}</span>${icon('chev', 'width="14" height="14" style="transform:rotate(-90deg)"')}</button>`;
  }
  function upgradeSheet() {
    const u = ui.upgrade || {};
    return `<div class="overlay" data-act="up-close"><div class="sheet" data-stop role="dialog" aria-label="Go Pro">
      <div class="sheet-h"><div><h2>FundedMentor Pro</h2><small class="muted">$29 a month · cancel any time</small></div><button class="btn ghost sm" data-act="up-close" aria-label="Close">${icon('x', 'width="16" height="16"')}</button></div>
      <div class="sheet-b"><div class="stack" style="gap:14px">
        ${u.reason ? `<div class="alert warn">${icon('warn')}<span>${esc(u.reason)}</span></div>` : ''}
        <ul class="stack" style="gap:8px;margin:0;padding-left:18px"><li>Unlimited accounts across every firm</li><li>Next trade planner and payout tracking on every account</li>${FEATURES.liveSync ? '<li>Live MT5 sync: balance, equity, open P&amp;L and closed trades every minute</li>' : '<li class="muted">Automatic MT4/MT5 sync · Coming soon</li>'}</ul>
        ${cloudUser ? `<div class="grid g2" style="gap:10px"><button class="btn primary lg" data-act="up-pay" data-m="card" ${u.busy ? 'disabled' : ''}>${u.busy === 'card' ? 'Opening checkout…' : 'Pay by card'}</button><button class="btn lg" data-act="up-pay" data-m="crypto" ${u.busy ? 'disabled' : ''}>${u.busy === 'crypto' ? 'Opening checkout…' : 'Pay with crypto'}</button></div>
        <p class="hint">Card renews monthly through Stripe. Crypto buys 30 days at a time and stacks if you pay early.</p>` : `<button class="btn primary lg" data-act="to-auth" data-mode="signup">Sign in with Google to upgrade</button>`}
        ${u.err ? `<div class="alert bad">${icon('warn')}<span>${esc(u.err)}</span></div>` : ''}
      </div></div></div></div>`;
  }
  function nextSheet(a, c) {
    const rec = bestMode(a, c); const mode = ui.ntMode || rec; const t = nextTrade(a, c, mode); const soon = newsSoon(Date.now(), 120);
    return `<div class="overlay" data-act="next-close"><div class="sheet nt" data-stop role="dialog" aria-label="Your next trade">
      <div class="sheet-h"><div><h2>Your next trade</h2><small class="muted">${esc(a.instrument)} · ${t.stop} ${esc((t.spec || {}).distUnit || '')} stop · 1:${t.rr} target</small></div><button class="btn ghost sm" data-act="next-close" aria-label="Close">${icon('x', 'width="16" height="16"')}</button></div>
      <div class="sheet-b">
        ${srcNote(c)}
        <div class="seg nt-seg" role="group" aria-label="Planning mode">${NT_MODES.map(([k, l]) => `<button data-act="nt-mode" data-k="${k}" aria-pressed="${mode === k}">${l}${k === rec ? '<i class="rec" title="Recommended: safest of the three"></i>' : ''}</button>`).join('')}</div>
        ${soon ? `<div class="alert warn">${icon('warn')}<span><b>${esc(soon.title)}</b> at ${tLocal(soon.t)}. Wait until 15 minutes after the release before entering.</span></div>` : ''}
        ${t.stopReason ? `<div class="nt-stop"><b>No trade</b><p>${esc(t.stopReason)}</p></div>` : `
        <div class="nt-hero"><span class="label">Size</span><div class="nt-lots">${qtyNum(t.lots, t.spec)}<small>${qtyUnit(t.spec)}</small></div><span class="muted">Buy or sell, on your own setup. ${mode === rec ? 'Recommended for today.' : ''}</span></div>
        <dl class="kv nt-kv">
          <dt>Risk if stopped</dt><dd>${fmt$(t.actual)} <span class="faint">· ${t.pctEq.toFixed(2)}%</span></dd>
          <dt>Stop-loss</dt><dd>${t.stop} ${esc(t.spec.distUnit)}</dd>
          <dt>Take-profit</dt><dd>${+(t.stop * t.rr).toFixed(2)} ${esc(t.spec.distUnit)} <span class="faint">· 1:${t.rr}</span></dd>
          <dt>Potential win</dt><dd class="pos">${sgn$(t.win)}</dd>
          ${t.dlAfter != null ? `<dt>Daily loss left if stopped</dt><dd>${fmt$(t.dlAfter, 0)}</dd>` : ''}
          ${t.ddAfter != null ? `<dt>Drawdown left if stopped</dt><dd>${fmt$(t.ddAfter, 0)}</dd>` : ''}
          <dt>Trades left today</dt><dd>${Math.max(0, t.maxTrades - t.tradesToday)} of ${t.maxTrades}</dd>
        </dl>`}
        <p class="nt-why">${esc(t.why)}</p>${t.after ? `<p class="nt-why">${esc(t.after)}</p>` : ''}
        ${!t.stopReason && t.raw > t.cap ? `<p class="hint">This mode wanted ${fmt$(t.raw, 0)} of risk; it is capped at ${fmt$(t.cap, 0)} by your daily and drawdown limits.</p>` : ''}
        <div class="row" style="gap:10px"><button class="btn primary lg" style="flex:1" data-act="next-check">Check this trade</button><button class="btn lg" data-act="go" data-v="settings">Change setup</button></div>
      </div></div></div>`;
  }

  // P&L calendar: one cell per firm trading day, green for a gain, red for a loss.
  const short$ = (v) => { const a = Math.abs(v); const t = a >= 10000 ? (a / 1000).toFixed(1) + 'k' : a >= 1000 ? (a / 1000).toFixed(2) + 'k' : a.toFixed(0); return (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + t; };
  function pnlCalendar(c) {
    const pnl = {}; for (const d of c.s.dailyPnl) pnl[d.day] = d.pnl;
    const cnt = {}; for (const b of c.s.balSeries) if (b.dayKey) cnt[b.dayKey] = (cnt[b.dayKey] || 0) + 1;
    const today = c.s.todayKey;
    const ym = ui.calMonth || today.slice(0, 7);
    const [Y, M] = ym.split('-').map(Number);
    const first = new Date(Date.UTC(Y, M - 1, 1));
    const days = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    const keys = Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
    const inMonth = keys.filter((k) => k in pnl);
    const total = inMonth.reduce((t, k) => t + pnl[k], 0);
    const wins = inMonth.filter((k) => pnl[k] > 0).length, losses = inMonth.filter((k) => pnl[k] < 0).length;
    const best = inMonth.length ? Math.max(...inMonth.map((k) => Math.abs(pnl[k]))) : 1;
    const shift = (n) => { const d = new Date(Date.UTC(Y, M - 1 + n, 1)); return d.toISOString().slice(0, 7); };
    const label = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="cal-c empty" aria-hidden="true"></div>');
    keys.forEach((k, i) => {
      const has = k in pnl; const v = pnl[k] || 0; const tone = !has ? '' : v > 0 ? 'win' : v < 0 ? 'loss' : 'flat';
      const a = has ? Math.max(0.28, Math.min(1, Math.abs(v) / best)).toFixed(2) : 0;
      const wd = (lead + i) % 7; const wk = wd >= 5;
      const nv = newsFor(k); const hi = nv.some((e) => e.impact === 'high');
      cells.push(`<button class="cal-c ${tone}${k === today ? ' today' : ''}${wk ? ' wkend' : ''}${ui.calDay === k ? ' sel' : ''}" style="--a:${a}" data-act="cal-day" data-k="${k}" title="${dayLabel(k)}${has ? ': ' + sgn$(v) + ' · ' + (cnt[k] || 0) + ' trade' + ((cnt[k] || 0) === 1 ? '' : 's') : ': no trades'}${nv.length ? ' · ' + nv.length + ' news' : ''}">
        <span class="cal-d">${i + 1}${nv.length ? `<i class="nd ${hi ? 'hi' : ''}" aria-hidden="true"></i>` : ''}</span>${has ? `<b class="num">${short$(v)}</b><small>${cnt[k] || 0}t</small>` : ''}</button>`);
    });
    return `<section class="panel cal" aria-label="Profit and loss calendar">
      <div class="cal-h">
        <div class="row" style="gap:6px"><button class="btn ghost sm" data-act="cal" data-m="${shift(-1)}" aria-label="Previous month">${icon('chev', 'width="16" height="16" style="transform:rotate(90deg)"')}</button><h2>${label}</h2><button class="btn ghost sm" data-act="cal" data-m="${shift(1)}" aria-label="Next month">${icon('chev', 'width="16" height="16" style="transform:rotate(-90deg)"')}</button></div>
        <div class="cal-sum"><span class="num ${cls(total)}">${sgn$(total, 0)}</span><span class="chip ok nodot">${wins} green</span><span class="chip bad nodot">${losses} red</span></div>
      </div>
      <div class="cal-g">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<span class="cal-w">${d}</span>`).join('')}${cells.join('')}</div>
      <div class="cal-legend"><span><i class="nd hi"></i>High-impact news</span><span><i class="nd"></i>Medium</span></div>
      ${(() => { const k = ui.calDay || today; const ev = newsFor(k); const pk = pnl[k];
        return `<div class="cal-day"><div class="row between"><h3>${new Date(k + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}</h3>${pk != null ? `<span class="num ${cls(pk)}">${sgn$(pk)} · ${cnt[k] || 0} trade${(cnt[k] || 0) === 1 ? '' : 's'}</span>` : '<span class="muted">No trades</span>'}</div>
          ${newsState === 'off' ? '<p class="muted news-empty">The news feed appears in the live app.</p>' : newsList(ev, Date.now(), k)}</div>`; })()}
    </section>`;
  }
  // Ring gauge: how much of a loss allowance is still unused.
  function gauge(label, r) {
    const C = 2 * Math.PI * 44;
    if (!r.applicable) return `<div class="gauge off"><svg viewBox="0 0 104 104" aria-hidden="true"><circle cx="52" cy="52" r="44" class="ring-bg"/></svg><div class="g-mid"><b class="num">—</b><small>not set</small></div><span class="g-lab">${label}</span></div>`;
    const left = Math.max(0, Math.min(100, 100 - r.usedPct));
    const tone = r.status === 'ok' ? 'pos' : r.status === 'warning' ? 'warn' : 'neg';
    return `<div class="gauge ${tone}" role="img" aria-label="${label}: ${left.toFixed(0)} percent left, ${fmt$(r.remaining)}">
      <svg viewBox="0 0 104 104" aria-hidden="true"><circle cx="52" cy="52" r="44" class="ring-bg"/><circle cx="52" cy="52" r="44" class="ring-fg" stroke-dasharray="${C.toFixed(1)}" style="stroke-dashoffset:${(C * (1 - left / 100)).toFixed(1)}"/></svg>
      <div class="g-mid"><b class="num">${left.toFixed(0)}%</b><small>left</small></div>
      <span class="g-lab">${label}</span><span class="g-val num">${fmt$(r.remaining, 0)}</span></div>`;
  }
  function ruleStatus(c) {
    const rows = [];
    rows.push(['Daily loss', limitChip(c.dl), c.dl.applicable ? `${fmt$(c.dl.remaining)} left of ${fmt$(c.dl.limit)}` : 'No daily limit in this phase']);
    rows.push(['Maximum loss', limitChip(c.dd), c.dd.applicable ? `${fmt$(c.dd.remaining)} above the ${fmt$(c.dd.floor, 0)} floor` : 'Not set']);
    if (c.plan.target != null) rows.push(['Profit target', c.plan.remainingTarget === 0 ? '<span class="chip ok">Reached</span>' : '<span class="chip info">In progress</span>', `${sgn$(c.plan.progress)} of ${fmt$(c.plan.target, 0)}`]);
    if (c.td.min) rows.push(['Trading days', c.td.met ? '<span class="chip ok">Met</span>' : '<span class="chip info">' + c.td.remaining + ' to go</span>', `${c.td.count} of ${c.td.min} minimum`]);
    if (c.cons.applicable) rows.push(['Consistency', c.cons.pass === true ? '<span class="chip ok">Pass</span>' : c.cons.pass === false ? '<span class="chip warn">Not met</span>' : '<span class="chip">No profit yet</span>', c.cons.share != null ? `Best day ${pct(c.cons.share)} · limit ${c.cons.limitPct}%` : '']);
    if (c.rv.newsRestricted) rows.push(['News trading', '<span class="chip warn">Restricted</span>', 'Check the economic calendar before entries']);
    return `<div class="rules-list">${rows.map(([n, chip, d]) => `<div class="rl"><b>${n}</b>${chip}<span class="d">${d}</span></div>`).join('')}</div>`;
  }
  function latestTrades(a) {
    const t = [...a.trades].sort((x, y) => y.closeTime - x.closeTime).slice(0, 5);
    if (!t.length) return `<div class="empty" style="padding:16px"><p>No trades recorded.</p><button class="btn sm" data-act="go" data-v="trades">Record a trade</button></div>`;
    return `<div class="rules-list">${t.map((x) => { const net = x.profit + (x.commission || 0) + (x.swap || 0); return `<div class="rl"><span><b>${esc(x.symbol)}</b> <span class="muted">${x.side} ${x.lots ?? ''}</span></span><span class="num ${cls(net)}">${sgn$(net)}</span><span class="d">${dtStr(x.closeTime)}</span></div>`; }).join('')}</div>`;
  }
  function payChecklist(c, compact) {
    const reqs = compact ? c.pay.reqs.filter((r) => r.key !== 'kyc') : c.pay.reqs;
    const ic = (s) => s === 'met' ? `<span class="pos">${icon('ok', 'width="16" height="16"')}</span>` : s === 'unmet' ? `<span class="faint">${icon('x', 'width="16" height="16"')}</span>` : `<span class="warnc">${icon('info', 'width="16" height="16"')}</span>`;
    return `<div class="rules-list">${reqs.map((r) => `<div class="rl" style="grid-template-columns:auto minmax(0,1fr) auto"><span>${ic(r.status)}</span><b style="font-weight:500">${esc(r.label)}</b><span class="muted" style="font-size:12px;text-align:right">${esc(r.detail)}</span></div>`).join('')}</div>
      ${c.payPhase !== c.phase.key ? `<p class="hint" style="margin-top:10px">Shown with ${esc(c.model.phases[c.payPhase].label)}-phase rules. Payouts start after the evaluation.</p>` : ''}`;
  }

  // Accounts
  VIEWS.calendar = (a, c) => {
    if (!c) return viewEmpty();
    const T = a.trades.map((t) => t.profit + (t.commission || 0) + (t.swap || 0));
    const wins = T.filter((x) => x > 0), losses = T.filter((x) => x < 0);
    const sum = (xs) => xs.reduce((t, x) => t + x, 0);
    const days = c.s.dailyPnl; const gd = days.filter((d) => d.pnl > 0), rd = days.filter((d) => d.pnl < 0);
    const best = days.length ? days.reduce((m, d) => (d.pnl > m.pnl ? d : m)) : null;
    const worst = days.length ? days.reduce((m, d) => (d.pnl < m.pnl ? d : m)) : null;
    const pf = losses.length ? sum(wins) / Math.abs(sum(losses)) : null;
    const tile = (l, v, s, k = '') => `<div class="kpi"><span class="label">${l}</span><span class="v ${k}">${v}</span><span class="s">${s}</span></div>`;
    return `${pageHead('Performance', `${esc(a.name)} · every trading day, measured on your firm’s day reset`)}
      ${pnlCalendar(c)}
      <div class="kpis" style="margin-bottom:16px">
        ${tile('Net P&amp;L', sgn$(c.s.realized, 0), `${c.s.tradeCount} trades · ${days.length} days`, cls(c.s.realized))}
        ${tile('Win rate', T.length ? pct((wins.length / T.length) * 100, 0) : '—', `${wins.length} wins · ${losses.length} losses`)}
        ${tile('Green days', days.length ? `${gd.length}/${days.length}` : '—', `${rd.length} red day${rd.length === 1 ? '' : 's'}`)}
        ${tile('Profit factor', pf == null ? '—' : pf.toFixed(2), pf == null ? 'No losing trades yet' : pf >= 1.5 ? 'Healthy' : pf >= 1 ? 'Thin edge' : 'Losing more than winning', pf != null && pf < 1 ? 'neg' : '')}
      </div>
      <div class="grid g3" style="margin-bottom:16px">
        <section class="panel span2"><div class="panel-h"><h2>Balance curve</h2><span class="muted">Floor and target marked</span></div>${balanceChart(c)}</section>
        <section class="panel"><div class="panel-h"><h2>Day stats</h2></div>
          <dl class="kv">
            <dt>Best day</dt><dd class="pos">${best ? sgn$(best.pnl) : '—'}</dd><dt></dt><dd class="hint">${best ? dayLabel(best.day) : ''}</dd>
            <dt>Worst day</dt><dd class="neg">${worst ? sgn$(worst.pnl) : '—'}</dd><dt></dt><dd class="hint">${worst ? dayLabel(worst.day) : ''}</dd>
            <dt>Average green day</dt><dd>${gd.length ? sgn$(sum(gd.map((d) => d.pnl)) / gd.length) : '—'}</dd>
            <dt>Average red day</dt><dd>${rd.length ? sgn$(sum(rd.map((d) => d.pnl)) / rd.length) : '—'}</dd>
            <dt>Average win</dt><dd>${wins.length ? sgn$(sum(wins) / wins.length) : '—'}</dd>
            <dt>Average loss</dt><dd>${losses.length ? sgn$(sum(losses) / losses.length) : '—'}</dd>
            <dt>Best day share</dt><dd>${c.cons.share != null ? pct(c.cons.share) : '—'}</dd>
          </dl></section>
      </div>
      <section class="panel"><div class="panel-h"><h2>Daily P&amp;L</h2>${c.cons.applicable && c.cons.maxDayAtCurrentTotal ? '<span class="muted">Dashed line = consistency cap</span>' : ''}</div>${dailyBars(days, c.cons.applicable ? c.cons.maxDayAtCurrentTotal || null : null)}</section>`;
  };

  VIEWS.accounts = () => {
    const rows = state.accounts.map((a) => ({ a, c: compute(a) }));
    const tot = rows.reduce((t, { c }) => (c ? { bal: t.bal + c.s.balance, pnl: t.pnl + c.s.realized, start: t.start + c.s.initialBalance } : t), { bal: 0, pnl: 0, start: 0 });
    return `${pageHead('My Accounts', 'Each account keeps its own rules, trades, alerts and payout status.', `<button class="btn primary" data-act="wizard">${icon('plus', 'width="14" height="14"')}Add account</button>`)}
      <div class="kpis" style="margin-bottom:16px;grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="kpi"><span class="label">Accounts</span><span class="v">${rows.length}</span><span class="s">${rows.filter((r) => r.c && r.c.status === 'breached').length} at a limit</span></div>
        <div class="kpi"><span class="label">Combined balance</span><span class="v">${fmt$(tot.bal, 0)}</span><span class="s">of ${fmt$(tot.start, 0)} starting</span></div>
        <div class="kpi"><span class="label">Combined P&amp;L</span><span class="v ${cls(tot.pnl)}">${sgn$(tot.pnl, 0)}</span><span class="s">Closed trades</span></div>
      </div>
      <section class="panel" style="padding:0">${rows.length ? rows.map(({ a, c }) => `<div class="list-card">
        <div style="min-width:0"><div class="row"><b>${esc(a.name)}</b>${c ? statusChip(c.status) : '<span class="chip bad">Model missing</span>'}${a.example ? '<span class="chip nodot">Example</span>' : ''}</div>
        <div class="muted" style="font-size:13px;margin-top:2px">${c ? `${esc(c.firm.name)} · ${esc(c.model.name)} · ${esc(phaseLabel(c))}` : ''}</div>
        ${c ? `<div class="row" style="margin-top:8px;gap:16px;font-size:13px"><span>Balance <b class="num">${fmt$(c.s.balance)}</b></span><span>P&amp;L <b class="num ${cls(c.s.realized)}">${sgn$(c.s.realized)}</b></span>${c.dl.applicable ? `<span>Daily left <b class="num">${fmt$(c.dl.remaining, 0)}</b></span>` : ''}${c.dd.applicable ? `<span>DD left <b class="num">${fmt$(c.dd.remaining, 0)}</b></span>` : ''}</div>` : ''}</div>
        <div class="row" style="justify-content:flex-end">${ui.confirm === 'del-' + a.id ? `<span class="muted" style="font-size:12px">Delete account and its trades?</span><button class="btn sm danger" data-act="del-acct" data-id="${a.id}">Delete</button><button class="btn sm ghost" data-act="cancel-confirm">Cancel</button>` : `<button class="btn sm" data-act="switch" data-id="${a.id}">Open</button><button class="btn sm ghost danger" data-act="confirm" data-k="del-${a.id}">Delete</button>`}</div>
      </div>`).join('') : `<div class="empty"><p>No accounts yet.</p><button class="btn primary" data-act="wizard">Add your first account</button></div>`}</section>`;
  };

  // Daily plan
  VIEWS.plan = (a, c) => {
    if (!c) return viewEmpty();
    const p = c.plan;
    const seg = Object.entries(PR.PROFILES).map(([k, v]) => `<button data-act="profile" data-k="${k}" aria-pressed="${(a.riskProfile || 'balanced') === k}">${v.label}</button>`).join('');
    const instOpts = Object.keys(PR.INSTRUMENTS).map((s) => `<option ${s === a.instrument ? 'selected' : ''}>${s}</option>`).join('');
    return `${pageHead('Daily Plan', `Built from ${esc(c.model.name)} · ${esc(phaseLabel(c))} rules and your current numbers. Profiles change risk and assumptions, not your odds.`, `<div class="seg" role="group" aria-label="Risk profile">${seg}</div>`)}${srcNote(c)}
      ${!c.ver.confirmed ? `<div class="alert info" style="margin-bottom:16px">${icon('info')}<span>This plan uses rules that are not verified. Treat limits as unconfirmed until you check them in Firm Rules.</span></div>` : ''}
      ${p.notes.map((n) => `<div class="alert bad" style="margin-bottom:12px">${icon('warn')}<span>${esc(n)}</span></div>`).join('')}
      <div class="grid g3" style="margin-bottom:16px">
        <section class="panel"><div class="panel-h"><h2>Today</h2><span class="chip nodot">Calculated</span></div>
          <div class="label">Risk per trade</div><div class="big" style="margin:4px 0 12px">${fmt$(p.riskPerTrade)}</div>
          <dl class="kv"><dt>Daily risk budget</dt><dd>${fmt$(p.dailyBudget)}</dd><dt>Max trades today</dt><dd>${p.maxTrades}</dd>
            <dt>Daily loss left</dt><dd>${c.dl.applicable ? fmt$(c.dl.remaining) : '—'}</dd><dt>Max drawdown left</dt><dd>${c.dd.applicable ? fmt$(c.dd.remaining) : '—'}</dd>
            ${p.dayCap != null ? `<dt>Consistency day cap</dt><dd>${fmt$(p.dayCap)}</dd>` : ''}</dl></section>
        <section class="panel"><div class="panel-h"><h2>Where you stand</h2><span class="chip nodot">History</span></div>
          <dl class="kv"><dt>Profit so far</dt><dd class="${cls(p.progress)}">${sgn$(p.progress)}</dd><dt>Target remaining</dt><dd>${p.remainingTarget != null ? fmt$(p.remainingTarget) : '—'}</dd>
            <dt>Trading days</dt><dd>${c.td.count}${c.td.min ? ' / ' + c.td.min + ' min' : ''}</dd><dt>Days still required</dt><dd>${c.td.remaining}</dd>
            ${c.td.maxDays ? `<dt>Max days</dt><dd>${c.td.maxDays}</dd>` : ''}<dt>Best day</dt><dd>${c.s.bestDay ? fmt$(c.s.bestDay.pnl) : '—'}</dd></dl>
          ${p.progressPct != null ? `<div class="bar acc" style="margin-top:14px"><i style="width:${p.progressPct}%"></i></div><p class="hint" style="margin-top:6px">${pct(p.progressPct)} of the target</p>` : ''}</section>
        <section class="panel"><div class="panel-h"><h2>Example size</h2><span class="chip nodot">Calculated</span></div>
          <div class="grid g2" style="gap:10px;margin-bottom:12px"><label class="field"><span>Instrument</span><select class="input" id="plan-inst" data-acct="instrument">${instOpts}</select></label>
          <label class="field"><span>Stop (${esc(c.spec ? c.spec.distUnit : '')})</span><input class="input num" id="plan-stop" type="number" inputmode="decimal" step="any" min="0" data-acct="stopDistance" value="${a.stopDistance ?? ''}"></label></div>
          ${p.example ? p.example.ok ? `<div class="big">${qtyNum(p.example.lots, c.spec)}<small style="font-size:14px" class="muted">${qtyUnit(c.spec)}</small></div><p class="hint" style="margin-top:4px">Risks ${fmt$(p.example.actualRisk)} incl. commission${p.example.estimate ? ' · estimate' : ''}</p>${p.example.warnings.map((w) => `<p class="hint warnc">${esc(w)}</p>`).join('')}` : `<p class="warnc">${esc(p.example.reason)}</p>` : '<p class="muted">Pick an instrument.</p>'}</section>
      </div>
      <section class="panel" style="margin-bottom:16px"><div class="panel-h"><h2>Your goal &amp; pairs</h2><button class="btn ghost sm" data-act="goal-edit">${ui.goalEdit ? 'Done' : 'Change goal'}</button></div>
        ${ui.goalEdit ? `<div style="margin-bottom:18px">${goalForm(goalOf(a), legsOf(a), 'a', futuresModel(c.firm, c.model))}</div>` : ''}
        ${renderPlaybook(a, c, false)}</section>
      <section class="panel" style="margin-bottom:16px"><div class="panel-h"><h2>Scenario planner</h2><span class="hint">Arithmetic projections from assumed averages. Future results are unknown.</span></div>
        ${p.scenarios.length ? `<div class="tw"><table><thead><tr><th>Assumed avg. profit day</th><th class="r">Amount</th><th class="r">Profit days needed</th><th class="r">Trading days</th><th>Assessment</th></tr></thead><tbody>
        ${p.scenarios.map((s) => `<tr><td>${s.avgPct}% of start</td><td class="r num">${fmt$(s.avgAmount, 0)}</td><td class="r num">${s.daysNeeded}</td><td class="r num">${s.totalDays}</td><td style="white-space:normal">${s.realistic ? '<span class="chip ok">Fits the rules</span>' : `<span class="chip warn">Conflicts</span> <span class="hint">${esc(s.issues.join(' '))}</span>`}</td></tr>`).join('')}
        </tbody></table></div><p class="hint" style="margin-top:10px">Average days include losing and flat days. The planner never asks for a fixed profit every day, and it never suggests bigger size to meet a deadline.</p>` : '<p class="muted">This phase has no profit target. Focus on protecting drawdown and meeting payout conditions.</p>'}
      </section>
      <div class="grid g2">
        <section class="panel"><h2 style="margin-bottom:12px">Stop trading for the day if</h2><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">${p.stopIf.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
          <p class="quote" style="margin-top:16px">If the market does not present a suitable setup, not trading is a valid plan.</p></section>
        <section class="panel"><h2 style="margin-bottom:12px">This plan is no longer valid if</h2><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">
          <li>The firm changes its rules or you move to a new phase.</li><li>Your balance moves by more than today’s risk budget. Recheck the plan.</li><li>You change instrument, stop size or broker contract specs.</li><li>Any rule above is still unverified and turns out to differ.</li></ul></section>
      </div>`;
  };

  // Position size calculator
  function calcDefaults(a) { return { inst: a.instrument || 'XAUUSD', mode: 'pct', risk: '0.5', stopBy: 'distance', dist: String(a.stopDistance || ''), entry: '', stop: '', tp: '', comm: String(a.commissionPerLot ?? ''), rate: '', cs: '' }; }
  VIEWS.calc = (a, c) => {
    if (!c) return viewEmpty();
    const f = ui.calc || (ui.calc = calcDefaults(a));
    const spec = specFor(f.inst, a);
    const needRate = spec && spec.quote !== a.currency && spec.base !== a.currency;
    return `${pageHead('Position Size Calculator', 'Instrument-specific contract sizes and conversions. Lots are rounded down to the lot step.')}${srcNote(c)}
      <div class="grid g2">
        <section class="panel"><div class="stack" style="gap:14px">
          <div class="grid g2" style="gap:12px">
            <label class="field"><span>Instrument</span><select class="input" id="c-inst" data-calc="inst" data-full="1">${Object.keys(PR.INSTRUMENTS).map((s) => `<option ${s === f.inst ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
            <div class="field"><span>Risk in</span><div class="seg" role="group"><button data-act="calc-set" data-k="mode" data-val="pct" aria-pressed="${f.mode === 'pct'}">% of equity</button><button data-act="calc-set" data-k="mode" data-val="amount" aria-pressed="${f.mode === 'amount'}">$ amount</button></div></div>
          </div>
          <label class="field"><span>Risk ${f.mode === 'pct' ? '(% of equity ' + fmt$(c.s.equity, 0) + ')' : '($)'}</span><input class="input num" id="c-risk" type="number" inputmode="decimal" step="any" min="0" data-calc="risk" value="${esc(f.risk)}"></label>
          <div class="field"><span>Stop-loss by</span><div class="seg" role="group"><button data-act="calc-set" data-k="stopBy" data-val="distance" aria-pressed="${f.stopBy === 'distance'}">Distance</button><button data-act="calc-set" data-k="stopBy" data-val="price" aria-pressed="${f.stopBy === 'price'}">Prices</button></div></div>
          ${f.stopBy === 'distance' ? `<label class="field"><span>Stop distance (${esc(spec.distUnit)}${spec.distUnit === 'price' ? ', e.g. 5 = $5 move' : ''})</span><input class="input num" id="c-dist" type="number" inputmode="decimal" step="any" min="0" data-calc="dist" value="${esc(f.dist)}"></label>`
            : `<div class="grid g3" style="gap:12px"><label class="field"><span>Entry</span><input class="input num" id="c-entry" type="number" inputmode="decimal" step="any" data-calc="entry" value="${esc(f.entry)}" placeholder="${spec.sample}"></label><label class="field"><span>Stop-loss</span><input class="input num" id="c-stop" type="number" inputmode="decimal" step="any" data-calc="stop" value="${esc(f.stop)}"></label><label class="field"><span>Take-profit</span><input class="input num" id="c-tp" type="number" inputmode="decimal" step="any" data-calc="tp" value="${esc(f.tp)}"></label></div>`}
          <div class="grid g2" style="gap:12px">
            <label class="field"><span>Commission per lot, round trip ($)</span><input class="input num" id="c-comm" type="number" inputmode="decimal" step="any" min="0" data-calc="comm" value="${esc(f.comm)}"></label>
            <label class="field"><span>Contract size per lot</span><input class="input num" id="c-cs" type="number" inputmode="decimal" step="any" min="0" data-calc="cs" value="${esc(f.cs)}" placeholder="${spec.contractSize}"></label>
          </div>
          ${needRate ? `<label class="field"><span>${spec.quote} → ${esc(a.currency)} rate (1 ${spec.quote} = ? ${esc(a.currency)})</span><input class="input num" id="c-rate" type="number" inputmode="decimal" step="any" min="0" data-calc="rate" value="${esc(f.rate)}"></label>` : ''}
          <p class="hint">${spec.specStatus === 'broker_dependent' ? `${spec.symbol} contract size differs between brokers. Default is ${spec.contractSize}; enter yours above.` : `Standard spec: ${spec.contractSize.toLocaleString()} units per lot, pip ${spec.pip}.`}</p>
        </div></section>
        <section class="panel" id="calc-out">${calcOut(a, c)}</section>
      </div>`;
  };
  function calcOut(a, c) {
    const f = ui.calc; const spec = Object.assign({}, specFor(f.inst, a));
    if (f.cs !== '' && Number(f.cs) > 0) { spec.contractSize = Number(f.cs); spec.specStatus = 'standard'; }
    const byPrice = f.stopBy === 'price';
    let r;
    try {
      r = PR.positionSize({ spec, risk: f.risk || 0, riskMode: f.mode, equity: c.s.equity, accountCcy: a.currency, conversionRate: f.rate || null, commissionPerLot: f.comm || 0,
        entry: byPrice && f.entry !== '' ? f.entry : null, stop: byPrice && f.stop !== '' ? f.stop : null, tp: byPrice && f.tp !== '' ? f.tp : null, stopDistance: !byPrice && f.dist !== '' ? f.dist : null });
    } catch (e) { r = { ok: false, reason: 'Check your inputs: ' + e.message }; }
    if (!r.ok) return `<div class="label">Position size</div><div class="big faint" style="margin:6px 0 12px">—</div><div class="alert warn">${icon('info')}<span>${esc(r.reason)}</span></div>`;
    const over = [];
    if (c.dl.applicable && r.actualRisk >= c.dl.remaining) over.push('A stop-out would breach today’s loss limit.');
    else if (c.dl.applicable && r.actualRisk >= c.dl.remaining * 0.5) over.push(`Uses ${pct((r.actualRisk / c.dl.remaining) * 100, 0)} of today’s remaining loss allowance.`);
    if (c.dd.applicable && r.actualRisk >= c.dd.remaining) over.push('A stop-out would breach the maximum drawdown.');
    if (r.actualRisk > c.plan.riskPerTrade + 0.005) over.push(`Above your ${c.plan.profile.label.toLowerCase()} plan risk of ${fmt$(c.plan.riskPerTrade)}.`);
    return `<div class="row between"><span class="label">Position size</span>${r.estimate ? '<span class="chip warn">Estimate</span>' : '<span class="chip ok">Calculated</span>'}</div>
      <div class="big" style="margin:6px 0 2px">${qtyNum(r.lots, spec)}<small style="font-size:16px" class="muted">${qtyUnit(spec)}</small></div>
      <p class="hint" style="margin-bottom:16px">Raw ${r.rawLots.toFixed(4)} → rounded down to ${specFor(ui.calc.inst, a).lotStep} step</p>
      <dl class="kv"><dt>Target risk</dt><dd>${fmt$(r.riskAmount)}</dd><dt>Loss at stop (incl. commission)</dt><dd class="neg">${fmt$(r.actualRisk)}</dd><dt>Risk of equity</dt><dd>${pct(r.riskPctOfEquity, 2)}</dd>
        <dt>Value of 1.00 price move / lot</dt><dd>${fmt$(r.valuePerPriceUnit)}</dd><dt>Stop distance (price)</dt><dd>${r.priceDistance}</dd><dt>Commission</dt><dd>${fmt$(r.commission)}</dd>
        ${r.profitAtTP != null ? `<dt>Profit at take-profit</dt><dd class="pos">${fmt$(r.profitAtTP)}</dd><dt>Reward : risk</dt><dd>${r.rr.toFixed(2)}</dd>` : ''}
        <dt>Daily loss left after a stop-out</dt><dd>${c.dl.applicable ? fmt$(c.dl.remaining - r.actualRisk) : '—'}</dd><dt>Max drawdown left after a stop-out</dt><dd>${c.dd.applicable ? fmt$(c.dd.remaining - r.actualRisk) : '—'}</dd>
        <dt>Conversion</dt><dd style="font-family:var(--f-body)">${esc(r.conversion)}</dd></dl>
      ${over.concat(r.warnings).length ? `<div class="stack" style="gap:8px;margin-top:14px">${over.map((w) => `<div class="alert bad">${icon('warn')}<span>${esc(w)}</span></div>`).join('')}${r.warnings.map((w) => `<div class="alert warn">${icon('info')}<span>${esc(w)}</span></div>`).join('')}</div>` : ''}`;
  }

  // Pre-trade check
  function checkDefaults(a) { const s = PR.INSTRUMENTS[a.instrument] || PR.INSTRUMENTS.XAUUSD; return { inst: s.symbol, dir: 'buy', entry: String(s.sample), stop: '', tp: '', lots: '', comm: String(a.commissionPerLot ?? ''), rate: '' }; }
  VIEWS.check = (a, c) => {
    if (!c) return viewEmpty();
    const f = ui.check || (ui.check = checkDefaults(a));
    const spec = specFor(f.inst, a);
    const needRate = spec.quote !== a.currency && spec.base !== a.currency;
    return `${pageHead('Can I take this trade?', 'Checks a proposed trade against this account’s limits before you place it. It is a calculation, not permission from the firm.')}${srcNote(c)}
      <div class="grid g2">
        <section class="panel"><div class="stack" style="gap:14px">
          <div class="grid g2" style="gap:12px"><label class="field"><span>Instrument</span><select class="input" id="k-inst" data-check="inst" data-full="1">${Object.keys(PR.INSTRUMENTS).map((s) => `<option ${s === f.inst ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <div class="field"><span>Direction</span><div class="seg" role="group"><button data-act="check-set" data-k="dir" data-val="buy" aria-pressed="${f.dir === 'buy'}">Buy</button><button data-act="check-set" data-k="dir" data-val="sell" aria-pressed="${f.dir === 'sell'}">Sell</button></div></div></div>
          <div class="grid g3" style="gap:12px"><label class="field"><span>Entry</span><input class="input num" id="k-entry" type="number" inputmode="decimal" step="any" data-check="entry" value="${esc(f.entry)}"></label>
          <label class="field"><span>Stop-loss</span><input class="input num" id="k-stop" type="number" inputmode="decimal" step="any" data-check="stop" value="${esc(f.stop)}"></label>
          <label class="field"><span>Take-profit</span><input class="input num" id="k-tp" type="number" inputmode="decimal" step="any" data-check="tp" value="${esc(f.tp)}"></label></div>
          <div class="grid g2" style="gap:12px"><label class="field"><span>Lot size</span><input class="input num" id="k-lots" type="number" inputmode="decimal" step="${spec.lotStep}" min="0" data-check="lots" value="${esc(f.lots)}"></label>
          <label class="field"><span>Commission / lot ($)</span><input class="input num" id="k-comm" type="number" inputmode="decimal" step="any" min="0" data-check="comm" value="${esc(f.comm)}"></label></div>
          ${needRate ? `<label class="field"><span>${spec.quote} → ${esc(a.currency)} rate</span><input class="input num" id="k-rate" type="number" inputmode="decimal" step="any" data-check="rate" value="${esc(f.rate)}"></label>` : ''}
          <button class="btn" data-act="check-fill">Use plan size (${fmt$(c.plan.riskPerTrade)} risk)</button>
        </div></section>
        <section id="check-out">${checkOut(a, c)}</section>
      </div>`;
  };
  function checkOut(a, c) {
    const f = ui.check; const spec = specFor(f.inst, a);
    let r; try { r = PR.preTrade({ rv: c.rv, s: c.s, spec, direction: f.dir, entry: f.entry, stop: f.stop, tp: f.tp, lots: f.lots, commissionPerLot: f.comm || 0, conversionRate: f.rate || null, plannedRisk: c.plan.riskPerTrade, verificationInfo: c.ver }); } catch (e) { r = { status: 'unknown', reasons: ['Check your inputs: ' + e.message] }; }
    const head = { within: ['Within configured limits', 'within'], warning: ['Warning: approaching a limit', 'warning'], exceeds: ['Exceeds configured risk limits', 'exceeds'], unknown: ['Cannot determine', ''] }[r.status];
    return `<div class="verdict ${head[1]}"><span class="label">${r.unconfirmed && r.status !== 'unknown' ? 'Result · rules unverified' : 'Result'}</span><h2>${head[0]}</h2>
      ${r.status === 'unknown' ? '<p class="muted">Missing or unverified information.</p>' : `<p class="muted">Stop-out loss <b class="num">${fmt$(r.loss)}</b> · ${pct(r.riskPct, 2)} of equity</p>`}</div>
      ${r.status !== 'unknown' ? `<div class="panel" style="margin-top:12px"><dl class="kv"><dt>Estimated loss at stop</dt><dd class="neg">${fmt$(r.loss)}</dd><dt>Profit at target</dt><dd class="pos">${r.profit != null ? fmt$(r.profit) : '—'}</dd><dt>Reward : risk</dt><dd>${r.rr != null ? r.rr.toFixed(2) : '—'}</dd>
        <dt>Daily loss left after stop-out</dt><dd class="${r.dailyAfter != null && r.dailyAfter <= 0 ? 'neg' : ''}">${r.dailyAfter != null ? fmt$(r.dailyAfter) : '—'}</dd><dt>Max drawdown left after stop-out</dt><dd class="${r.ddAfter != null && r.ddAfter <= 0 ? 'neg' : ''}">${r.ddAfter != null ? fmt$(r.ddAfter) : '—'}</dd></dl></div>` : ''}
      ${r.reasons.length ? `<div class="stack" style="gap:8px;margin-top:12px">${r.reasons.map((t) => `<div class="alert ${r.status === 'exceeds' ? 'bad' : 'warn'}">${icon('info')}<span>${esc(t)}</span></div>`).join('')}</div>` : ''}
      ${r.unconfirmed ? `<div class="alert info" style="margin-top:12px">${icon('info')}<span>Some rules for this account are unverified. This result can’t be treated as confirmed.</span></div>` : ''}
      <p class="hint" style="margin-top:12px">Slippage, gaps and spread widening can make real losses larger than the stop distance suggests.</p>`;
  }

  // Consistency
  VIEWS.consistency = (a, c) => {
    if (!c) return viewEmpty();
    const has = c.cons.applicable;
    const testPct = has ? c.rv.consistencyPct : Number(ui.consPct || 40);
    const rule = { consistencyPct: testPct, consistencyDenominator: has ? c.rv.consistencyDenominator : 'total_profit' };
    const cur = PR.consistency(rule, c.s.dailyPnl);
    const add = Number(ui.consWhatIf);
    let sim = null;
    if (add) sim = PR.consistency(rule, c.s.dailyPnl.concat([{ day: 'new', pnl: add }]));
    const target = c.plan.target;
    return `${pageHead('Consistency Calculator', has ? `This phase limits your best day to ${testPct}% of ${rule.consistencyDenominator === 'positive_days' ? 'the sum of profitable days' : 'total net profit'}.` : 'This phase has no consistency rule loaded. Test one below to see how it would apply.')}
      ${!has ? `<div class="panel" style="margin-bottom:16px"><label class="field" style="max-width:220px"><span>Test a best-day limit (%)</span><input class="input num" id="cons-pct" type="number" min="1" max="100" step="1" data-ui="consPct" value="${testPct}"></label></div>` : ''}
      <div class="grid g3" style="margin-bottom:16px">
        <section class="panel"><span class="label">Best day share</span><div class="big ${cur.pass === false ? 'warnc' : ''}" style="margin:6px 0">${cur.share != null ? pct(cur.share) : '—'}</div><p class="muted">Limit ${testPct}% · ${cur.pass === true ? '<span class="pos">passing</span>' : cur.pass === false ? '<span class="warnc">not met</span>' : 'no profit yet'}</p></section>
        <section class="panel"><span class="label">Profit still needed</span><div class="big" style="margin:6px 0">${cur.additional != null ? fmt$(cur.additional, 0) : '—'}</div><p class="muted">Total must reach ${cur.requiredTotal != null ? fmt$(cur.requiredTotal, 0) : '—'}</p></section>
        <section class="panel"><span class="label">Best day</span><div class="big" style="margin:6px 0">${cur.bestDay ? fmt$(cur.bestDay.pnl, 0) : '—'}</div><p class="muted">${cur.bestDay ? dayLabel(cur.bestDay.day) + ' · total ' + fmt$(cur.denominator, 0) : 'No profitable days yet'}</p></section>
      </div>
      <div class="grid g3">
        <section class="panel span2"><div class="panel-h"><h2>Daily P&amp;L</h2><span class="hint">Dashed line: largest day that keeps you within the limit at your current total</span></div>${dailyBars(c.s.dailyPnl, cur.maxDayAtCurrentTotal || (target ? target * testPct / 100 : null))}</section>
        <section class="panel"><h2 style="margin-bottom:12px">What if I make…</h2>
          <label class="field"><span>Profit on a new day ($)</span><input class="input num" id="cons-what" type="number" inputmode="decimal" step="any" data-ui="consWhatIf" value="${esc(ui.consWhatIf)}" placeholder="500"></label>
          <div id="cons-sim" style="margin-top:12px">${sim ? `<dl class="kv"><dt>New best-day share</dt><dd class="${sim.pass ? 'pos' : 'warnc'}">${pct(sim.share)}</dd><dt>Status</dt><dd>${sim.pass ? 'Passing' : 'Not met'}</dd><dt>Still needed</dt><dd>${fmt$(sim.additional)}</dd></dl>` : '<p class="hint">Enter an amount to simulate one more trading day.</p>'}</div>
          <p class="hint" style="margin-top:14px">Math: required total = best day ÷ ${testPct}%. Valid only when the firm uses exactly this rule and denominator, and assumes no future day beats your current best day.</p></section>
      </div>`;
  };

  // Payout
  VIEWS.payout = (a, c) => {
    if (!c) return viewEmpty();
    const p = c.pay;
    return `${pageHead('Payout Center', 'Each requirement is calculated separately. A full checklist does not mean the firm has approved a payout.', c.payVer.confirmed ? '' : '<span class="chip warn">Payout rules unverified</span>')}${srcNote(c)}
      <div class="grid g3" style="margin-bottom:16px">
        <section class="panel"><span class="label">Profit above start</span><div class="big ${cls(p.profit)}" style="margin:6px 0">${sgn$(p.profit, 0)}</div><p class="muted">Closed trades only</p></section>
        <section class="panel"><span class="label">Your share${p.splitPct != null ? ' · ' + p.splitPct + '% split' : ''}</span><div class="big" style="margin:6px 0">${p.traderShare != null ? fmt$(p.traderShare, 0) : '—'}</div><p class="muted">${p.capped ? 'Capped at ' + fmt$(p.payable, 0) : p.splitPct == null ? 'Split not set for this model' : 'Before firm fees, if any'}</p></section>
        <section class="panel"><span class="label">Calculated status</span><div style="margin:12px 0 6px">${p.calculatedEligible ? '<span class="chip ok">All calculable requirements met</span>' : '<span class="chip warn">Requirements outstanding</span>'}</div><p class="muted">Final eligibility is decided by the firm.</p></section>
      </div>
      <div class="grid g2">
        <section class="panel"><div class="panel-h"><h2>Checklist</h2><span class="hint">${esc(c.model.phases[c.payPhase].label)} rules</span></div>${payChecklist(c, false)}</section>
        <section class="panel"><h2 style="margin-bottom:12px">Funded details</h2>
          <label class="field"><span>Date the account was funded (starts the waiting period)</span><input class="input" type="date" id="fund-date" data-acct="fundedTs" value="${a.fundedTs ? new Date(a.fundedTs).toISOString().slice(0, 10) : ''}"></label>
          <p class="hint" style="margin-top:8px">Without a funded date, the waiting period counts from your first recorded trade.</p>
          ${c.payPhase !== a.phase ? `<div class="alert info" style="margin-top:14px">${icon('info')}<span>This account is in ${esc(phaseLabel(c))}. Payout requirements apply once it is funded.</span></div>` : ''}</section>
      </div>`;
  };

  // Firm rules library + admin
  VIEWS.rules = (a) => {
    const q = ui.ruleSearch.toLowerCase();
    const firms = FIRMS.filter((f) => !q || f.name.toLowerCase().includes(q) || f.models.some((m) => m.name.toLowerCase().includes(q)));
    const firm = FIRMS.find((f) => f.id === ui.ruleFirm) || FIRMS[0];
    return `${pageHead('Firm Rules', 'Every rule shows its source, version and verification status. Edits keep the previous version for audit.')}
      <div class="grid" style="grid-template-columns:minmax(0,260px) minmax(0,1fr);align-items:start" id="rules-grid">
        <section class="panel" style="padding:12px"><input class="input" id="rule-search" type="search" placeholder="Search firms" data-ui="ruleSearch" value="${esc(ui.ruleSearch)}" aria-label="Search firms">
          <div class="nav" style="margin-top:10px">${firms.map((f) => `<button data-act="rule-firm" data-id="${f.id}" ${f.id === firm.id ? 'aria-current="page"' : ''}><span style="flex:1">${esc(f.name)}</span><span class="faint" style="font-size:11px">${f.models.length ? f.models.length + ' model' : f.market}</span></button>`).join('') || '<p class="hint" style="padding:8px">No firm matches.</p>'}</div></section>
        <div class="stack">${firmPanel(firm)}${firm.models.length ? firm.models.map((m) => modelRules(firm, m)).join('') : `<section class="panel empty"><h2>${esc(firm.name)}</h2><p>${esc(firm.note || 'No models loaded yet.')}</p></section>`}
          ${historyPanel()}</div>
      </div>
      <style>@media (max-width:860px){#rules-grid{grid-template-columns:minmax(0,1fr)!important}}</style>`;
  };
  function ruleCell(m, phaseKey, key, rec) {
    const meta = META[key] || { label: key, unit: '' };
    const ed = ui.edit && ui.edit.m === m.id && ui.edit.p === phaseKey && ui.edit.k === key;
    if (ed) {
      let input;
      if (meta.unit === 'enum') input = `<select class="input" id="edit-val">${Object.entries(meta.options).map(([k, l]) => `<option value="${k}" ${rec && rec.value === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      else if (meta.unit === 'bool') input = `<select class="input" id="edit-val"><option value="true" ${rec && rec.value === true ? 'selected' : ''}>Yes</option><option value="false" ${rec && rec.value === false ? 'selected' : ''}>No</option></select>`;
      else input = `<input class="input num" id="edit-val" type="number" step="any" value="${rec ? esc(rec.value) : ''}">`;
      return `<div class="stack" style="gap:6px;min-width:150px">${input}<div class="row" style="gap:4px"><button class="btn sm primary" data-act="edit-save">Save</button><button class="btn sm ghost" data-act="edit-cancel">Cancel</button></div></div>`;
    }
    if (!rec) return `<button class="btn ghost sm faint" data-act="edit" data-m="${m.id}" data-p="${phaseKey}" data-k="${key}">—</button>`;
    let v = rec.value;
    if (meta.unit === 'enum') v = meta.options[v] || v; else if (meta.unit === 'bool') v = v ? 'Yes' : 'No'; else if (meta.unit === '%') v = v + '%'; else if (meta.unit === '$') v = fmt$(v, 0); else v = v + (meta.unit && meta.unit !== 'enum' ? ' ' + meta.unit.replace('% of start', '% of start') : '');
    const st = rec.status === 'verified' ? 'ok' : rec.status === 'user_configured' ? 'info' : rec.status === 'outdated' ? 'bad' : 'warn';
    const stl = { verified: 'Verified', user_configured: 'User-configured', outdated: 'Outdated', needs_verification: 'Sourced · confirm' }[rec.status];
    return `<div class="stack" style="gap:3px"><button class="btn ghost sm" style="justify-content:flex-start;padding:0 4px;height:auto;color:var(--fg)" data-act="edit" data-m="${m.id}" data-p="${phaseKey}" data-k="${key}" title="Edit">${esc(v)}</button><span class="chip ${st}" style="height:18px;font-size:11px" title="v${rec.version}${rec.verifiedAt ? ' · verified ' + rec.verifiedAt : ''}">${stl} · v${rec.version}</span></div>`;
  }
  const kTxt = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  function detailList(obj) {
    if (!obj) return '';
    const rows = Object.entries(obj).filter(([, v]) => v != null && v !== '');
    if (!rows.length) return '';
    return `<dl class="kv" style="grid-template-columns:minmax(90px,max-content) minmax(0,1fr)">${rows.map(([k, v]) => `<dt>${esc(kTxt(k))}</dt><dd style="text-align:left;font-family:var(--f-body);white-space:normal">${esc(typeof v === 'object' ? JSON.stringify(v) : String(v))}</dd>`).join('')}</dl>`;
  }
  function firmPanel(firm) {
    if (firm.custom) return '';
    const aff = (state.affiliates || {})[firm.id] || '';
    return `<section class="panel"><div class="panel-h"><div><h2>${esc(firm.name)}</h2><p class="muted" style="font-size:13px">${esc(firm.market)} · ${firm.platforms.length ? esc(firm.platforms.join(', ')) : 'Platforms not listed'} · data checked ${esc(firm.checkedAt || '—')}</p></div>
      <div class="row">${firm.status !== 'active' ? '<span class="chip bad">Status uncertain</span>' : ''}${firm.dataConfidence === 'low' ? '<span class="chip warn">Low-confidence data</span>' : ''}${firm.site ? `<a class="btn sm" href="${esc(firm.site)}" target="_blank" rel="noopener">${icon('ext', 'width="14" height="14"')}Official site</a>` : ''}</div></div>
      ${firm.riskFlag ? `<div class="alert bad" style="margin-bottom:12px">${icon('warn')}<span>${esc(firm.riskFlag)}</span></div>` : ''}
      ${firm.tzNote ? `<p class="hint" style="margin-bottom:10px">Daily reset: ${esc(firm.tzNote)}. Using UTC midnight until confirmed.</p>` : ''}
      <div class="grid g2" style="gap:16px">
        <div class="stack" style="gap:10px">${firm.hardBreaches.length ? `<div><div class="label" style="margin-bottom:6px">Hard breaches (account ends)</div><ul style="margin:0;padding-left:18px">${firm.hardBreaches.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>` : ''}
          ${firm.softBreaches.length ? `<div><div class="label" style="margin-bottom:6px">Soft breaches (profit removed, paused or flagged)</div><ul style="margin:0;padding-left:18px">${firm.softBreaches.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>` : ''}</div>
        <div class="stack" style="gap:10px">${firm.restrictions ? `<div><div class="label" style="margin-bottom:6px">Trading rules</div>${detailList(firm.restrictions)}</div>` : ''}${firm.payout ? `<div><div class="label" style="margin-bottom:6px">Payouts</div>${detailList(firm.payout)}</div>` : ''}${firm.other ? `<div><div class="label" style="margin-bottom:6px">Other</div>${detailList(firm.other)}</div>` : ''}${firm.drawdownLock ? `<p class="hint">${esc(firm.drawdownLock)}</p>` : ''}</div>
      </div>
      <div style="margin-top:14px"><div class="label" style="margin-bottom:6px">Sources</div><ul style="margin:0;padding-left:18px;font-size:13px">${firm.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(new URL(s.url).hostname)}</a> <span class="muted">· ${esc(s.type)}${s.note ? ' · ' + esc(s.note) : ''}</span></li>`).join('')}</ul></div>
      <div class="row" style="margin-top:14px;align-items:flex-end"><label class="field" style="flex:1;min-width:220px"><span>Your affiliate link for ${esc(firm.name)}</span><input class="input" id="aff-${firm.id}" type="url" data-aff="${firm.id}" value="${esc(aff)}" placeholder="https://… (used by Find a Prop buy buttons)"></label></div>
    </section>`;
  }
  function modelRules(firm, m) {
    const phs = Object.values(m.phases);
    const sizeSel = Object.keys(m.sizeRules || {}).length ? Number((ui.ruleSize || {})[m.id] || m.sizes[0]) : null;
    const recs = (p) => phaseRecords(m.id, p.key, sizeSel);
    const keys = Object.keys(META).filter((k) => phs.some((p) => recs(p)[k]));
    const groups = [...new Set(keys.map((k) => META[k].group))];
    const allRecs = phs.flatMap((p) => Object.values(recs(p)));
    const verified = allRecs.filter((r) => r.status === 'verified').length;
    const prices = m.sizes.length ? m.sizes.map((s) => `$${s >= 1000 ? s / 1000 + 'K' : s}${priceFor(m, s) != null ? ` <b class="num">${m.priceCcy === 'EUR' ? '€' : '$'}${priceFor(m, s)}</b>` : ''}`).join(' · ') : 'Sizes not published';
    return `<section class="panel"><div class="panel-h"><div><h2>${esc(m.name)}</h2><p class="muted" style="font-size:13px">${esc(m.structure)}${m.invitationOnly ? ' · invitation only' : ''} · day resets ${String(firm.resetHour).padStart(2, '0')}:00 ${esc(firm.timezone)}</p></div>
      <div class="row">${m.rulesComplete ? '' : '<span class="chip bad">Rules incomplete</span>'}<span class="chip ${verified === allRecs.length && allRecs.length ? 'ok' : 'warn'}">${verified}/${allRecs.length} verified</span></div></div>
      <p style="font-size:13px;margin-bottom:6px"><span class="label">Prices</span> ${prices}</p>
      ${m.priceNote || m.priceConfidence ? `<p class="hint" style="margin-bottom:10px">${esc([m.priceNote, m.priceConfidence].filter(Boolean).join(' · '))}</p>` : ''}
      ${sizeSel ? `<div class="seg" role="group" aria-label="Account size" style="margin-bottom:10px">${m.sizes.filter((s) => m.sizeRules[s]).map((s) => `<button data-act="rule-size" data-m="${m.id}" data-v="${s}" aria-pressed="${s === sizeSel}">$${s / 1000}K</button>`).join('')}</div>` : ''}
      ${allRecs.length ? `<div class="tw"><table><thead><tr><th>Rule</th>${phs.map((p) => `<th>${esc(p.label)}</th>`).join('')}</tr></thead><tbody>
      ${groups.map((g) => `<tr><td colspan="${phs.length + 1}" class="label" style="padding-top:14px">${g}</td></tr>` + keys.filter((k) => META[k].group === g).map((k) => `<tr><td>${META[k].label}</td>${phs.map((p) => `<td style="vertical-align:top">${ruleCell(m, p.key, k, recs(p)[k])}</td>`).join('')}</tr>`).join('')).join('')}
      </tbody></table></div>` : '<p class="muted">No rule values published in the sources checked.</p>'}
      ${(m.notes || []).length ? `<ul style="margin:12px 0 0;padding-left:18px;font-size:13px" class="muted">${m.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      ${m.payout || m.funded ? `<div style="margin-top:12px">${detailList(Object.assign({}, m.payout || {}, m.funded || {}))}</div>` : ''}
      <div class="row" style="margin-top:14px">${phs.map((p) => `<button class="btn sm" data-act="verify-phase" data-m="${m.id}" data-p="${p.key}">Mark ${esc(p.label)} verified</button>`).join('')}<button class="btn sm ghost" data-act="report" data-m="${m.id}">Report an incorrect rule</button></div>
      ${ui.confirm === 'report-' + m.id ? `<div class="stack" style="gap:8px;margin-top:12px"><textarea class="input" id="report-text" rows="3" placeholder="Which rule looks wrong, and what does the firm’s page say?"></textarea><div class="row"><button class="btn sm primary" data-act="report-save" data-m="${m.id}">Save report</button><button class="btn sm ghost" data-act="cancel-confirm">Cancel</button></div></div>` : ''}
      <p class="hint" style="margin-top:10px">Only mark a rule verified after checking it on the firm’s official page. Click any value to edit it; edits become a new version marked User-configured.</p></section>`;
  }
  function historyPanel() {
    const h = state.ruleHistory.slice(-12).reverse();
    const rep = state.reports.slice(-5).reverse();
    if (!h.length && !rep.length) return '';
    return `<section class="panel"><h2 style="margin-bottom:12px">Audit trail</h2><div class="rules-list">
      ${h.map((x) => `<div class="rl"><span><b>${esc((META[x.key] || {}).label || x.key)}</b> <span class="muted">· ${esc(x.modelId)} · ${esc(x.phase)}</span></span><span class="muted num" style="font-size:12px">v${x.from} → v${x.to}</span><span class="d">${esc(x.action)}: ${esc(String(x.old))} → ${esc(String(x.new))} · ${dtStr(x.ts)}</span></div>`).join('')}
      ${rep.map((r) => `<div class="rl"><span><b>Report</b> <span class="muted">· ${esc(r.modelId)}</span></span><span class="chip warn">Open</span><span class="d">${esc(r.text)} · ${dtStr(r.ts)}</span></div>`).join('')}</div>
      <p class="hint" style="margin-top:10px">Changes apply to every account on that model the next time it is calculated.</p></section>`;
  }

  // Trades
  VIEWS.trades = (a, c) => {
    if (!c) return viewEmpty();
    const t = [...a.trades].sort((x, y) => y.closeTime - x.closeTime);
    const nf = ui.newTrade || (ui.newTrade = { symbol: a.instrument || 'XAUUSD', side: 'buy', lots: '', open: toLocalInput(Date.now() - 3600000), close: toLocalInput(Date.now()), entry: '', exit: '', profit: '', comm: String(a.commissionPerLot ? -a.commissionPerLot : ''), swap: '' });
    return `${pageHead('Trade History', `${t.length} trades on ${esc(a.name)}. Recording or importing a trade recalculates every limit immediately.`)}
      <div class="grid g2" style="margin-bottom:16px">
        <section class="panel"><h2 style="margin-bottom:12px">Record a trade</h2><div class="stack" style="gap:12px">
          <div class="grid g3" style="gap:10px"><label class="field"><span>Symbol</span><select class="input" id="t-sym" data-nt="symbol">${Object.keys(PR.INSTRUMENTS).map((s) => `<option ${s === nf.symbol ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <label class="field"><span>Side</span><select class="input" id="t-side" data-nt="side"><option value="buy" ${nf.side === 'buy' ? 'selected' : ''}>Buy</option><option value="sell" ${nf.side === 'sell' ? 'selected' : ''}>Sell</option></select></label>
          <label class="field"><span>Lots</span><input class="input num" id="t-lots" type="number" step="any" min="0" data-nt="lots" value="${esc(nf.lots)}"></label></div>
          <div class="grid g2" style="gap:10px"><label class="field"><span>Opened</span><input class="input" id="t-open" type="datetime-local" data-nt="open" value="${esc(nf.open)}"></label><label class="field"><span>Closed</span><input class="input" id="t-close" type="datetime-local" data-nt="close" value="${esc(nf.close)}"></label></div>
          <div class="grid g3" style="gap:10px"><label class="field"><span>Entry</span><input class="input num" id="t-entry" type="number" step="any" data-nt="entry" value="${esc(nf.entry)}"></label><label class="field"><span>Exit</span><input class="input num" id="t-exit" type="number" step="any" data-nt="exit" value="${esc(nf.exit)}"></label><label class="field"><span>Profit ($)</span><input class="input num" id="t-profit" type="number" step="any" data-nt="profit" value="${esc(nf.profit)}" placeholder="from prices"></label></div>
          <div class="grid g2" style="gap:10px"><label class="field"><span>Commission ($, negative)</span><input class="input num" id="t-comm" type="number" step="any" data-nt="comm" value="${esc(nf.comm)}"></label><label class="field"><span>Swap ($)</span><input class="input num" id="t-swap" type="number" step="any" data-nt="swap" value="${esc(nf.swap)}"></label></div>
          <p class="hint">Leave profit empty to calculate it from entry, exit and lots using the instrument spec.</p>
          <div class="row"><button class="btn primary" data-act="add-trade">Add trade</button>${ui.tradeErr ? `<span class="neg" style="font-size:13px">${esc(ui.tradeErr)}</span>` : ''}</div></div></section>
        <section class="panel"><h2 style="margin-bottom:6px">Import CSV</h2><p class="muted" style="font-size:13px;margin-bottom:12px">Columns: ticket, symbol, type, volume, open_time, close_time, open_price, close_price, profit, commission, swap. Duplicate tickets are skipped.</p>
          <div class="stack" style="gap:10px"><input class="input" type="file" id="csv-file" accept=".csv,text/csv" style="padding-top:6px">
          <textarea class="input" id="csv-text" rows="5" placeholder="…or paste CSV here">${esc(ui.csvText || '')}</textarea>
          <div class="row"><button class="btn" data-act="csv-preview">Check file</button>${ui.csv ? `<button class="btn primary" data-act="csv-import" ${ui.csv.trades.length ? '' : 'disabled'}>Import ${ui.csv.trades.length} trades</button>` : ''}</div>
          ${ui.csv ? `<div class="alert ${ui.csv.errors.length ? 'warn' : 'ok'}">${icon(ui.csv.errors.length ? 'warn' : 'ok')}<span>${ui.csv.trades.length} new · ${ui.csv.duplicates} duplicates skipped · ${ui.csv.errors.length} errors${ui.csv.errors.length ? '<br>' + ui.csv.errors.slice(0, 6).map((e) => `Line ${e.line}: ${esc(e.msg)}`).join('<br>') : ''}</span></div>` : ''}
          <div class="alert info">${icon('info')}<span><b>Automatic MT4/MT5 sync is coming soon.</b> For now, record trades here or import your platform’s history as CSV. Every limit recalculates from what you enter.</span></div></div></section>
      </div>
      <section class="panel"><div class="tw"><table><thead><tr><th>Closed</th><th>Symbol</th><th>Side</th><th class="r">Lots</th><th class="r">Entry</th><th class="r">Exit</th><th class="r">Net</th><th>Source</th><th></th></tr></thead><tbody>
        ${t.length ? t.map((x) => { const net = x.profit + (x.commission || 0) + (x.swap || 0); return `<tr><td>${dtStr(x.closeTime)}</td><td><b>${esc(x.symbol)}</b></td><td>${x.side}</td><td class="r num">${x.lots ?? '—'}</td><td class="r num">${x.entry ?? '—'}</td><td class="r num">${x.exit ?? '—'}</td><td class="r num ${cls(net)}">${sgn$(net)}</td><td class="muted">${esc(x.source || 'manual')}</td><td class="r"><button class="btn ghost sm" data-act="del-trade" data-id="${esc(x.id)}" aria-label="Delete trade">${icon('x', 'width="14" height="14"')}</button></td></tr>`; }).join('') : '<tr><td colspan="9" class="muted" style="text-align:center;padding:24px">No trades yet.</td></tr>'}
      </tbody></table></div></section>`;
  };

  // Reports
  VIEWS.reports = (a, c) => {
    if (!c) return viewEmpty();
    const nets = a.trades.map((t) => t.profit + (t.commission || 0) + (t.swap || 0));
    const wins = nets.filter((n) => n > 0), losses = nets.filter((n) => n < 0);
    const gw = wins.reduce((s, n) => s + n, 0), gl = Math.abs(losses.reduce((s, n) => s + n, 0));
    const days = c.s.dailyPnl; const worst = days.reduce((m, d) => (!m || d.pnl < m.pnl ? d : m), null);
    const bySym = {}; a.trades.forEach((t, i) => { bySym[t.symbol] = (bySym[t.symbol] || 0) + nets[i]; });
    return `${pageHead('Reports', 'Based on recorded trades. Past results describe history, not what will happen next.')}
      <div class="kpis" style="margin-bottom:16px"><div class="kpi"><span class="label">Win rate</span><span class="v">${nets.length ? pct((wins.length / nets.length) * 100, 0) : '—'}</span><span class="s">${wins.length}W · ${losses.length}L</span></div>
        <div class="kpi"><span class="label">Profit factor</span><span class="v">${gl ? (gw / gl).toFixed(2) : '—'}</span><span class="s">Gross ${fmt$(gw, 0)} / ${fmt$(gl, 0)}</span></div>
        <div class="kpi"><span class="label">Avg win / loss</span><span class="v">${wins.length ? fmt$(gw / wins.length, 0) : '—'}</span><span class="s">Avg loss ${losses.length ? fmt$(-gl / losses.length, 0) : '—'}</span></div>
        <div class="kpi"><span class="label">Best / worst day</span><span class="v pos">${c.s.bestDay ? fmt$(c.s.bestDay.pnl, 0) : '—'}</span><span class="s">Worst <span class="neg">${worst ? fmt$(worst.pnl, 0) : '—'}</span></span></div></div>
      <div class="grid g3" style="margin-bottom:16px"><section class="panel span2"><h2 style="margin-bottom:12px">Daily P&amp;L</h2>${dailyBars(days, null)}</section>
        <section class="panel"><h2 style="margin-bottom:12px">By instrument</h2><div class="rules-list">${Object.entries(bySym).sort((x, y) => y[1] - x[1]).map(([s, v]) => `<div class="rl"><b>${esc(s)}</b><span class="num ${cls(v)}">${sgn$(v)}</span></div>`).join('') || '<p class="muted">No trades.</p>'}</div></section></div>
      <section class="panel"><h2 style="margin-bottom:6px">Backup</h2><p class="muted" style="font-size:13px;margin-bottom:12px">Data is saved in this browser. Copy a backup to move it to another device, then paste it there.</p>
        <div class="row" style="margin-bottom:10px"><button class="btn" data-act="export">Copy backup</button><button class="btn" data-act="import">Restore from pasted backup</button></div>
        <textarea class="input" id="backup" rows="4" placeholder="Paste a backup here to restore"></textarea></section>`;
  };

  // ---------- Find a Prop (MCQ → ranked programs) ----------
  const FQ = [
    { k: 'market', q: 'What do you trade?', opts: [['forex', 'Forex / gold / CFDs'], ['futures', 'Futures'], ['crypto', 'Crypto'], ['any', 'Not sure']] },
    { k: 'size', q: 'What account size do you want?', opts: [['25000', '$25K or less'], ['50000', '$50K'], ['100000', '$100K'], ['200000', '$200K+']] },
    { k: 'budget', q: 'Budget for the challenge fee?', opts: [['100', 'Under $100'], ['300', '$100–$300'], ['600', '$300–$600'], ['any', 'Any']] },
    { k: 'path', q: 'Which path?', opts: [['eval', 'Evaluation (cheaper)'], ['instant', 'Instant funding (skip the test)'], ['any', 'Either']] },
    { k: 'style', q: 'How do you trade?', opts: [['day', 'Day trading / scalping'], ['swing', 'Hold overnight & weekends'], ['news', 'Trade the news'], ['ea', 'EA / bot']] },
    { k: 'pain', q: 'Which rule usually hurts you?', opts: [['daily', 'Daily loss limit'], ['trailing', 'Trailing drawdown'], ['consistency', 'Consistency rules'], ['none', 'None in particular']] },
  ];
  const marketOf = (f, m) => (/futures/.test(m.type) || (f.futures && !/forex|cfd/i.test(f.market)) ? 'futures' : /crypto/i.test(f.market) && !/forex/i.test(f.market) ? 'crypto' : 'forex');
  const txt = (o) => (o ? Object.values(o).filter((v) => typeof v === 'string').join(' ').toLowerCase() : '');
  function finderResults(a) {
    const want = Number(a.size || 100000);
    const out = [];
    for (const f of FIRMS) {
      if (f.custom || f.status !== 'active') continue;
      for (const m of f.models) {
        if (!m.rulesComplete || m.invitationOnly || !m.sizes.length) continue;
        const mk = marketOf(f, m);
        if (a.market && a.market !== 'any' && mk !== a.market) continue;
        const instant = /instant/.test(m.type);
        if (a.path === 'eval' && instant) continue;
        if (a.path === 'instant' && !instant) continue;
        const size = m.sizes.reduce((b, s) => (Math.abs(s - want) < Math.abs(b - want) ? s : b), m.sizes[0]);
        if (Math.abs(size - want) / want > 0.5) continue;
        const price = priceFor(m, size);
        if (a.budget && a.budget !== 'any' && (price == null || price > Number(a.budget))) continue;
        const first = Object.keys(m.phases)[0];
        const r1 = PR.ruleValues(phaseRecords(m.id, first, size));
        const rf = m.phases.funded ? PR.ruleValues(phaseRecords(m.id, 'funded', size)) : r1;
        const restr = (txt(f.restrictions) + ' ' + txt(m.restrictions)).toLowerCase();
        const pros = [], cons = [];
        let score = 100;
        const hasDaily = r1.dailyLossPct != null || r1.dailyLossAmount != null;
        const trailing = (r1.ddType || 'static') !== 'static';
        const cons1 = r1.consistencyPct || rf.consistencyPct;
        if (!hasDaily) pros.push('No daily loss limit'); 
        if (!trailing) pros.push('Static max drawdown'); else cons.push((r1.ddType || '').includes('eod') ? 'End-of-day trailing drawdown' : 'Intraday trailing drawdown');
        if (!cons1) pros.push('No consistency rule'); else cons.push(`${cons1}% consistency rule`);
        if (a.pain === 'daily' && hasDaily) score -= 20;
        if (a.pain === 'trailing' && trailing) score -= 25;
        if (a.pain === 'consistency' && cons1) score -= 20;
        const notesTxt = (m.notes || []).join(' ').toLowerCase();
        const rjson = JSON.stringify(f.restrictions || {}).toLowerCase();
        const allowNote = /overnight and weekend holding allowed/.test(notesTxt);
        const noWeekend = !allowNote && (rf.weekendHolding === false || /"overnight":"(not allowed|flat|intraday only)|flat by|flat before|close before weekend|auto-closed|intraday only/.test(rjson) || /overnight not allowed|intraday only|flat by/.test(notesTxt));
        const yesWeekend = allowNote || rf.weekendHolding === true || /"(overnight|weekend)":"allowed/.test(rjson);
        if (a.style === 'swing') { if (noWeekend) { score -= 30; cons.push('No overnight/weekend holding on funded'); } else if (yesWeekend) pros.push('Overnight & weekend holding allowed'); else { score -= 10; cons.push('Overnight rule not confirmed'); } }
        if (a.style === 'news') { if (newsBad) { score -= 25; cons.push('News trading restricted on funded'); } else pros.push('No funded news restriction'); }
        if (a.style === 'ea') { if (eaBad) { score -= 40; cons.push('Bots/EAs prohibited'); } }
        if (f.riskFlag) { score -= 30; cons.push('Trust warning (see Firm Rules)'); }
        if (f.dataConfidence === 'low') { score -= 15; cons.push('Low-confidence data'); }
        if (price == null) { score -= 10; cons.push('Price not published'); }
        if (m.priceConfidence) score -= 3;
        const split = rf.profitSplitPct;
        if (split >= 90) score += 5;
        if (price != null) score -= Math.min(10, price / 100);
        out.push({ f, m, size, price, split, score, pros, cons, instant, r1, rf, mk });
      }
    }
    return out.sort((x, y) => y.score - x.score).slice(0, 8);
  }
  VIEWS.finder = () => {
    const a = (state.finder = state.finder || { market: 'forex', size: '100000', budget: 'any', path: 'any', style: 'day', pain: 'none' });
    const res = finderResults(a);
    const fmtRule = (r, size) => {
      const t = [];
      if (r.profitTargetAmount) t.push(`Target ${fmt$(r.profitTargetAmount, 0)}`); else if (r.profitTargetPct) t.push(`Target ${r.profitTargetPct}%`);
      if (r.dailyLossAmount) t.push(`Daily ${fmt$(r.dailyLossAmount, 0)}`); else if (r.dailyLossPct) t.push(`Daily ${r.dailyLossPct}%`);
      if (r.maxLossAmount) t.push(`Max ${fmt$(r.maxLossAmount, 0)}`); else if (r.maxLossPct) t.push(`Max ${r.maxLossPct}%`);
      if (r.minTradingDays) t.push(`${r.minTradingDays} min days`);
      return t.join(' · ');
    };
    return `${pageHead('Find a Prop', 'Answer six questions. Programs are ranked on the rules loaded in FundedMentor, checked ' + esc((FIRMS.find((f) => f.checkedAt) || {}).checkedAt || '') + '. Always confirm price and rules on the firm’s site before you pay.')}
      <section class="panel" style="margin-bottom:16px"><div class="grid g2" style="gap:18px">
        ${FQ.map((q) => `<div class="field"><span style="font-size:13px;color:var(--fg)">${q.q}</span><div class="seg" role="group" aria-label="${esc(q.q)}">${q.opts.map(([v, l]) => `<button data-act="fq" data-k="${q.k}" data-v="${v}" aria-pressed="${a[q.k] === v}">${l}</button>`).join('')}</div></div>`).join('')}
      </div></section>
      ${res.length ? `<div class="stack">${res.map((x, i) => `<section class="panel"><div class="list-card" style="padding:0;border:0;align-items:start">
        <div style="min-width:0"><div class="row"><span class="label">#${i + 1}</span><b style="font-size:15px">${esc(x.f.name)}</b><span class="muted">${esc(x.m.name)}</span>${x.instant ? '<span class="chip info">Instant</span>' : ''}</div>
          <p style="margin-top:6px;font-size:13px"><b class="num">$${(x.size / 1000).toLocaleString()}K</b> · ${x.price != null ? `<b class="num">${x.m.priceCcy === 'EUR' ? '€' : '$'}${x.price}</b>${/month|monthly/i.test(x.m.priceNote || '') ? '/mo' : ''}` : 'price not published'}${x.split ? ` · ${x.split}% split` : ''} · ${esc(fmtRule(x.r1))}</p>
          <div class="row" style="margin-top:8px;gap:6px">${x.pros.map((p) => `<span class="chip ok">${esc(p)}</span>`).join('')}${x.cons.map((p) => `<span class="chip warn">${esc(p)}</span>`).join('')}</div>
          ${x.m.priceNote || x.m.priceConfidence ? `<p class="hint" style="margin-top:8px">${esc([x.m.priceNote, x.m.priceConfidence].filter(Boolean).join(' · '))}</p>` : ''}</div>
        <div class="stack" style="gap:6px;align-items:stretch;min-width:150px">${buyLink(x.f) ? `<a class="btn primary" href="${esc(buyLink(x.f))}" target="_blank" rel="noopener sponsored">${(state.affiliates || {})[x.f.id] ? 'Buy via partner link' : 'Buy on ' + esc(x.f.name)}</a>` : ''}
          <button class="btn" data-act="finder-track" data-f="${x.f.id}" data-m="${x.m.id}" data-s="${x.size}">Track this account</button>
          <button class="btn ghost sm" data-act="finder-rules" data-f="${x.f.id}">Full rules</button></div></div></section>`).join('')}</div>`
        : `<div class="panel empty"><p>No program matches all six answers. Loosen the budget or path.</p></div>`}
      <p class="hint" style="margin-top:14px">Disclosure: FundedMentor may earn a commission when you buy through a partner link. Ranking uses rules only and is not affected by commissions. Prices and rules change often and many values come from secondary sources.</p>`;
  };

  // Settings
  VIEWS.settings = (a, c) => {
    return `${pageHead('Settings')}
      <div class="grid g2">
        ${a && c ? `<section class="panel"><h2 style="margin-bottom:12px">Account · ${esc(a.name)}</h2><div class="stack" style="gap:12px">
          <label class="field"><span>Account name</span><input class="input" id="s-name" data-acct="name" value="${esc(a.name)}"></label>
          <div class="grid g2" style="gap:10px"><label class="field"><span>Phase</span><select class="input" id="s-phase" data-acct="phase">${Object.values(c.model.phases).map((p) => `<option value="${p.key}" ${p.key === a.phase ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></label>
          <label class="field"><span>Starting balance</span><input class="input num" id="s-init" type="number" step="any" data-acct="initialBalance" value="${a.initialBalance}"></label></div>
          <div class="grid g2" style="gap:10px"><label class="field"><span>Floating P&amp;L now ($) <span class="faint">· manual${a.openPnlTs ? ', ' + esc(dtStr(a.openPnlTs)) : ''}</span></span><input class="input num" id="s-open" type="number" step="any" data-acct="openPnl" value="${a.openPnl ?? 0}"></label>
          <label class="field"><span>Peak equity (intraday trailing)</span><input class="input num" id="s-peak" type="number" step="any" data-acct="peakEquity" value="${a.peakEquity ?? ''}" placeholder="optional"></label></div>
          <div class="grid g2" style="gap:10px"><label class="field"><span>Day-start equity override</span><input class="input num" id="s-dse" type="number" step="any" data-acct="dayStartEquity" value="${a.dayStartEquity ?? ''}" placeholder="optional"></label>
          <label class="field"><span>Platform</span><select class="input" id="s-plat" data-acct="platform">${['MT5', 'MT4', 'cTrader', 'DXtrade', 'Match-Trader', 'TradeLocker', 'Tradovate', 'NinjaTrader', 'Rithmic', 'TopstepX', 'TradingView', 'Other'].map((p) => `<option ${p === a.platform ? 'selected' : ''}>${p}</option>`).join('')}</select></label></div>
          <label class="field"><span>${esc(a.instrument)} contract size on your broker</span><input class="input num" id="s-cs" type="number" step="any" data-spec="contractSize" value="${esc(((a.specOverrides || {})[a.instrument] || {}).contractSize ?? '')}" placeholder="${PR.INSTRUMENTS[a.instrument] ? PR.INSTRUMENTS[a.instrument].contractSize : ''}"></label>
          ${mt5Panel(a)}
          ${c.status === 'passed' && nextPhase(c, a) ? `<div class="alert ok">${icon('ok')}<span>Target and minimum days met. When the firm confirms, start ${esc(c.model.phases[nextPhase(c, a)].label)}. Current trades are archived.</span></div><button class="btn primary" data-act="next-phase">Start ${esc(c.model.phases[nextPhase(c, a)].label)}</button>` : ''}
        </div></section>` : ''}
        <section class="panel"><h2 style="margin-bottom:12px">Profile &amp; appearance</h2><div class="stack" style="gap:12px">
          <label class="field"><span>Name</span><input class="input" id="p-name" data-profile="name" value="${esc(state.profile ? state.profile.name : '')}" placeholder="Your name"></label>
          <label class="field"><span>Email</span><input class="input" id="p-email" type="email" data-profile="email" value="${esc(state.profile ? state.profile.email : '')}" placeholder="you@example.com"></label></div>
          <h2 style="margin:22px 0 12px">Connections</h2><div class="rules-list">
            <div class="rl"><b>Cloud sync</b>${cloudUser ? '<span class="chip ok">On</span>' : '<span class="chip">Off</span>'}<span class="d">${cloudUser ? `Signed in as ${esc(cloudUser.email || '')}. Your accounts follow you to any device.` : 'Sign in with Google to keep your accounts on every device.'}</span></div>
            <div class="rl"><b>Plan</b>${isPro() ? '<span class="chip ok">Pro</span>' : '<span class="chip">Free</span>'}<span class="d">${isPro() ? (ui.planUntil ? `Paid through ${new Date(ui.planUntil).toLocaleDateString()}.` : 'Renews monthly.') : `One account, manual trades. <button class="btn sm primary" data-act="go-pro" style="margin-left:6px">Go Pro</button>`}</span></div>
            <div class="rl"><b>Copilot</b><span class="chip ok">Active</span><span class="d">Answers come from the rules engine and your account data. It does not invent rules.</span></div></div>
          <h2 style="margin:22px 0 12px">Data</h2><div class="row">${ui.confirm === 'reset' ? '<span class="muted" style="font-size:13px">Erase all accounts and edits?</span><button class="btn sm danger" data-act="reset">Erase everything</button><button class="btn sm ghost" data-act="cancel-confirm">Cancel</button>' : '<button class="btn sm" data-act="restore-examples">Reload example accounts</button><button class="btn sm danger" data-act="confirm" data-k="reset">Erase all data</button>'}</div></section>
      </div>`;
  };
  function mt5Panel(a) {
    if (a.example) return '';
    if (!FEATURES.liveSync) {
      if (!/^MT[45]$/.test(a.platform)) return '';
      return `<div class="rl" style="padding:0"><b>Automatic ${esc(a.platform)} sync</b><span class="chip info nodot">Coming soon</span>
        <span class="d">Balance, equity and trades will sync from your broker with a read-only investor password. Until then this account runs on what you enter: starting balance, recorded or imported trades, and floating P&amp;L above.${a.mt5 && a.mt5.login ? ` Previously linked login ${esc(a.mt5.login)} is kept but not syncing.` : ''}</span></div>`;
    }
    if (a.platform !== 'MT5') return '';
    const m = a.mt5, busy = ui.mt5Busy === a.id;
    const head = `<h3 style="margin:8px 0 0;font-size:15px">Live MT5 sync</h3>`;
    if (!cloudUser) return `${head}<p class="hint">Sign in with Google to connect your MT5 account.</p>`;
    if (!isPro()) return `${head}<p class="hint">Balance, equity, open P&amp;L and closed trades pulled from MT5 every minute. Pro feature.</p><button class="btn sm primary" data-act="go-pro" data-r="Live MT5 sync is part of Pro.">Go Pro</button>`;
    if (!m) return `${head}<p class="hint">Read-only. Use your <b>investor</b> password: FundedMentor can see trades but can never place, change or close one.</p>
      <div class="grid g2" style="gap:10px"><label class="field"><span>MT5 login</span><input class="input num" id="m-login" inputmode="numeric" autocomplete="off" placeholder="e.g. 51234567"></label>
      <label class="field"><span>Server</span><input class="input" id="m-server" autocomplete="off" placeholder="e.g. FTMO-Demo"></label></div>
      <label class="field"><span>Investor password</span><input class="input" id="m-pass" type="password" autocomplete="off"></label>
      ${ui.mt5Err ? `<div class="alert bad">${icon('warn')}<span>${esc(ui.mt5Err)}</span></div>` : ''}
      <button class="btn primary" data-act="mt5-link" data-id="${a.id}" ${busy ? 'disabled' : ''}>${busy ? 'Connecting…' : 'Connect MT5'}</button>`;
    const live = m.status === 'live';
    return `${head}<div class="rl" style="padding:0"><b>${esc(m.login)} · ${esc(m.server)}</b><span class="chip ${live ? 'ok' : 'info'}">${live ? 'Live' : m.status === 'connecting' ? 'Connecting' : 'Setting up'}</span>
      <span class="d">${live ? `Balance <b class="num">${fmt$(m.balance)}</b> · Equity <b class="num">${fmt$(m.equity)}</b> · ${m.positions || 0} open · synced ${m.lastSync ? new Date(m.lastSync).toLocaleTimeString() : '—'}` : 'Your broker connection is starting. This takes 1 to 3 minutes the first time.'}${m.err ? ` <span class="warnc">${esc(m.err)}</span>` : ''}</span></div>
      <div class="row">${ui.confirm === 'mt5-' + a.id ? `<span class="muted" style="font-size:13px">Disconnect MT5? Synced trades stay.</span><button class="btn sm danger" data-act="mt5-unlink" data-id="${a.id}">Disconnect</button><button class="btn sm ghost" data-act="cancel-confirm">Cancel</button>` : `<button class="btn sm" data-act="mt5-sync" data-id="${a.id}" ${busy ? 'disabled' : ''}>${busy ? 'Syncing…' : 'Sync now'}</button><button class="btn sm ghost danger" data-act="confirm" data-k="mt5-${a.id}">Disconnect</button>`}</div>`;
  }
  function nextPhase(c, a) { const ks = Object.keys(c.model.phases); const i = ks.indexOf(a.phase); return i >= 0 && i < ks.length - 1 ? ks[i + 1] : null; }

  // ---------- Goal & instrument playbook ----------
  // Times are US Eastern. Stops are typical day-trade ranges, used as defaults the trader can change.
  const GUIDE = {
    XAUUSD: { stop: 5, range: '$3–$10', window: 'London open 3–5 AM ET and New York 8–11 AM ET', news: 'US CPI, NFP, FOMC, PPI, jobless claims', tip: 'Gold pays $100 per $1 move on 1 lot, so size is small. Gold often moves against the dollar. On CPI/NFP/FOMC days, cut size in half or wait until 15 minutes after the release.' },
    EURUSD: { stop: 12, range: '10–20 pips', window: 'London 3–11 AM ET, best in the 8–11 AM London/NY overlap', news: 'ECB decisions, euro-area CPI, US CPI, NFP, FOMC', tip: 'Tightest spreads of the list, which makes it the easiest pair to hold a challenge risk plan on.' },
    GBPUSD: { stop: 18, range: '15–30 pips', window: 'London 3–11 AM ET', news: 'BoE decisions, UK CPI and jobs, plus US CPI, NFP, FOMC', tip: 'Moves about 1.3× EURUSD, so it needs a wider stop and gets a smaller size for the same risk.' },
    USDJPY: { stop: 15, range: '12–25 pips', window: 'Tokyo 7 PM–2 AM ET and New York 8–11 AM ET', news: 'BoJ decisions, US CPI, NFP, FOMC, US 10-year yields', tip: 'Can spike on intervention headlines from Japan. Keep a hard stop on every trade.' },
    AUDUSD: { stop: 12, range: '10–20 pips', window: 'Sydney/Tokyo 7 PM–2 AM ET', news: 'RBA decisions, Australian jobs and CPI, China data', tip: 'Quieter during New York. Best traded in the Asian session.' },
    USDCAD: { stop: 15, range: '12–25 pips', window: 'New York 8 AM–12 PM ET', news: 'BoC decisions, Canada jobs, US data, EIA oil inventories (Wed 10:30 AM ET)', tip: 'Follows oil prices. Expect moves around the Wednesday oil report.' },
    GBPJPY: { stop: 30, range: '25–50 pips', window: 'London 3–11 AM ET', news: 'BoE and BoJ decisions, UK CPI', tip: 'One of the most volatile pairs. Wide stop means small size. Not a beginner pair for a challenge.' },
    US30: { stop: 40, range: '30–80 points', window: 'New York cash open 9:30–11:30 AM ET', news: 'US CPI, FOMC, NFP, big earnings', tip: 'Contract size varies by broker. Confirm $ per point on your server before sizing.' },
    NAS100: { stop: 30, range: '20–60 points', window: 'New York cash open 9:30–11:30 AM ET', news: 'US CPI, FOMC, NFP, big-tech earnings', tip: 'Contract size varies by broker. Confirm $ per point on your server before sizing.' },
    GER40: { stop: 25, range: '20–50 points', window: 'Frankfurt open 3–5 AM ET', news: 'ECB, German CPI and PMI', tip: 'Most of the day’s range comes in the first two hours.' },
    ES: { stop: 6, range: '4–10 points', window: 'NY open 9:30–11:30 AM ET', news: 'CPI, FOMC, NFP', tip: '$50 per point. One contract on a 6-point stop risks $300.' },
    MES: { stop: 6, range: '4–10 points', window: 'NY open 9:30–11:30 AM ET', news: 'CPI, FOMC, NFP', tip: '$5 per point. Use micros to size precisely on small accounts.' },
    NQ: { stop: 20, range: '15–40 points', window: 'NY open 9:30–11:30 AM ET', news: 'CPI, FOMC, NFP, big-tech earnings', tip: '$20 per point. Fast market, so slippage on stops is common.' },
    MNQ: { stop: 20, range: '15–40 points', window: 'NY open 9:30–11:30 AM ET', news: 'CPI, FOMC, NFP, big-tech earnings', tip: '$2 per point. The most common contract for prop futures accounts.' },
    YM: { stop: 40, range: '30–70 points', window: 'NY open 9:30–11:30 AM ET', news: 'CPI, FOMC, NFP', tip: '$5 per point.' },
    MYM: { stop: 40, range: '30–70 points', window: 'NY open 9:30–11:30 AM ET', news: 'CPI, FOMC, NFP', tip: '$0.50 per point.' },
    GC: { stop: 5, range: '$3–$10', window: 'NY 8–11 AM ET', news: 'CPI, NFP, FOMC', tip: '$100 per $1. Some firms have blocked metals (Apex, TradeDay). Check before trading.' },
    MGC: { stop: 5, range: '$3–$10', window: 'NY 8–11 AM ET', news: 'CPI, NFP, FOMC', tip: '$10 per $1.' },
    CL: { stop: 0.25, range: '$0.15–$0.40', window: 'NY 9 AM–12 PM ET', news: 'EIA inventories Wed 10:30 AM ET, OPEC', tip: '$1,000 per $1. Very fast around the Wednesday report.' },
    MCL: { stop: 0.25, range: '$0.15–$0.40', window: 'NY 9 AM–12 PM ET', news: 'EIA inventories Wed 10:30 AM ET, OPEC', tip: '$100 per $1.' },
  };
  const FX_PICKS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'GBPJPY', 'US30', 'NAS100', 'GER40'];
  const FUT_PICKS = ['MNQ', 'NQ', 'MES', 'ES', 'MYM', 'YM', 'MGC', 'GC', 'MCL', 'CL'];
  const USD_BLOCK = ['EURUSD', 'GBPUSD', 'AUDUSD'];
  const defaultGoal = () => ({ type: 'payout', amount: 2500, winRate: 50, rr: 2 });
  const goalOf = (a) => a.goal || defaultGoal();
  const legsOf = (a) => (a.legs && a.legs.length ? a.legs : [{ symbol: a.instrument || 'XAUUSD', stop: a.stopDistance || (GUIDE[a.instrument] || {}).stop || 5 }]);
  const futuresModel = (firm, model) => !!(firm && (firm.futures || (model && /futures/.test(model.type))));

  const distTxt = (v, u) => (u === 'price' ? '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' move' : `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${u}`);
  function goalForm(g, legs, scope, fut) {
    const chip = (k, v, label, on) => `<button data-act="goal" data-scope="${scope}" data-k="${k}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
    const picks = fut ? FUT_PICKS : FX_PICKS;
    const amounts = [500, 1000, 2500, 5000, 10000];
    const custom = g.amount && !amounts.includes(Number(g.amount));
    return `<div class="stack" style="gap:18px">
      <div class="field"><span style="font-size:14px;color:var(--fg);font-weight:500">What do you want from this account?</span><div class="seg">${chip('type', 'pass', 'Just pass the challenge', g.type === 'pass')}${chip('type', 'payout', 'Get my first payout', g.type === 'payout')}${chip('type', 'monthly', 'A payout every month', g.type === 'monthly')}</div></div>
      ${g.type !== 'pass' ? `<div class="field"><span style="font-size:14px;color:var(--fg);font-weight:500">How much do you want to take out${g.type === 'monthly' ? ' each month' : ''}?</span><div class="seg">${amounts.map((x) => chip('amount', x, '$' + x.toLocaleString(), Number(g.amount) === x)).join('')}</div>
        <input class="input num" style="max-width:200px;margin-top:6px" id="goal-amt-${scope}" type="number" min="1" step="50" inputmode="decimal" data-goalamt="${scope}" value="${custom ? esc(g.amount) : ''}" placeholder="Other amount ($)"></div>` : ''}
      <div class="field"><span style="font-size:14px;color:var(--fg);font-weight:500">What do you trade most? <span class="muted" style="font-weight:400">Pick one or more</span></span>
        <div class="seg">${picks.map((s) => `<button data-act="leg" data-scope="${scope}" data-v="${s}" aria-pressed="${legs.some((l) => l.symbol === s)}">${s}</button>`).join('')}</div></div>
      ${legs.length ? `<div class="grid g3" style="gap:10px">${legs.map((l) => { const sp = PR.INSTRUMENTS[l.symbol] || {}; const gd = GUIDE[l.symbol] || {}; return `<label class="field"><span>${l.symbol} usual stop (${sp.distUnit === 'price' ? '$ move' : esc(sp.distUnit || '')}) · typical ${esc(gd.range || '')}</span><input class="input num" id="leg-${scope}-${l.symbol}" type="number" min="0" step="any" inputmode="decimal" data-leg="${l.symbol}" data-scope="${scope}" value="${esc(l.stop)}"></label>`; }).join('')}</div>` : ''}
      <div class="grid g2" style="gap:14px">
        <div class="field"><span style="font-size:14px;color:var(--fg);font-weight:500">Your honest win rate</span><div class="seg">${[40, 50, 60].map((x) => chip('winRate', x, x + '%', Number(g.winRate) === x)).join('')}</div></div>
        <div class="field"><span style="font-size:14px;color:var(--fg);font-weight:500">Your usual reward : risk</span><div class="seg">${[1.5, 2, 3].map((x) => chip('rr', x, '1:' + x, Number(g.rr) === x)).join('')}</div></div>
      </div></div>`;
  }

  function fundedRules(a, c) {
    if (!c.model.phases.funded) return {};
    return PR.ruleValues(phaseRecords(a.modelId, 'funded', a.initialBalance));
  }
  function renderPlaybook(a, c, compact) {
    const g = goalOf(a), legs = legsOf(a);
    const fr = fundedRules(a, c);
    const isFunded = a.phase === 'funded' || !c.model.phases.funded;
    const pb = PR.playbook({ rv: c.rv, s: c.s, profileKey: a.riskProfile, isFunded, fundedSplitPct: fr.profitSplitPct ?? null, fundedConsistencyPct: fr.consistencyPct || null, goal: g,
      legs: legs.map((l) => ({ spec: specFor(l.symbol, a), stopDistance: l.stop, commissionPerLot: a.commissionPerLot || 0 })), accountCcy: a.currency });
    const restr = Object.assign({}, c.firm.restrictions || {});
    const payTxt = Object.entries(Object.assign({}, c.firm.payout || {}, c.model.payout || {}, c.model.funded || {})).filter(([k, v]) => /cap|max|min/i.test(k) && typeof v !== 'object').map(([k, v]) => `${kTxt(k)}: ${v}`);
    const stageLine = pb.stages.map((s) => `<span class="chip ${s.key === 'pass' ? 'info' : 'ok'} nodot" style="height:auto;padding:4px 10px;white-space:normal">${esc(s.label)}: <b class="num">${fmt$(s.need, 0)}</b>${s.gross != null ? ` profit (${fmt$(g.amount, 0)} at ${pb.splitPct}% split${pb.splitAssumed ? ', assumed' : ''})` : ' left'}</span>`).join('');
    const corr = legs.filter((l) => USD_BLOCK.includes(l.symbol));
    const head = `<div class="row" style="gap:8px;margin-bottom:12px">${stageLine || '<span class="muted">Pick a goal to see what it takes.</span>'}</div>
      <p class="muted" style="font-size:13px;margin-bottom:14px">Risk ${fmt$(pb.riskPerTrade)} per trade, up to ${pb.maxTrades} trades a day. The math below assumes a ${pb.winRate}% win rate at 1:${pb.rr}. It is arithmetic, not a forecast.</p>`;
    const cards = pb.legs.map((l) => {
      const gd = GUIDE[l.symbol] || {}; const sp = specFor(l.symbol, a);
      if (!l.ok) return `<div class="panel" style="background:var(--surface-2)"><b>${esc(l.symbol)}</b><p class="warnc" style="margin-top:6px">${esc(l.reason)}</p></div>`;
      const rows = l.stages.map((s) => `<tr><td>${esc(s.label)}</td><td class="r num">${fmt$(s.need, 0)}</td><td class="r num">${s.perfectWins}</td><td class="r num">${s.trades ?? '—'}</td><td class="r num">${s.minDays ?? '—'}${s.consDays && s.consDays === s.minDays ? '*' : ''}</td></tr>`).join('');
      return `<div class="panel" style="background:var(--surface-2)">
        <div class="row between" style="margin-bottom:10px"><b style="font-size:16px;font-family:var(--f-display)">${esc(l.symbol)}</b><span class="chip ${l.edge ? 'ok' : 'bad'}">${l.edge ? 'Positive expectancy' : 'No edge at these numbers'}</span></div>
        <p style="font-size:14px;margin-bottom:10px"><b class="num">${qty(l.lots, sp)}</b> · stop ${distTxt(l.stopDistance, l.distUnit)} · target ${distTxt(l.tpDistance, l.distUnit)} → win <b class="num pos">${fmt$(l.win)}</b>, loss <b class="num neg">${fmt$(l.loss)}</b>${l.estimate ? ' · <span class="warnc">estimate</span>' : ''}</p>
        ${!l.edge ? `<div class="alert bad" style="margin-bottom:10px">${icon('warn')}<span>At ${pb.winRate}% and 1:${pb.rr} you lose ${fmt$(-l.expectancy)} per trade on average. No number of trades reaches the goal. Raise reward : risk before trading this.</span></div>` : ''}
        ${l.stages.length ? `<div class="tw"><table><thead><tr><th>Stage</th><th class="r">Need</th><th class="r">Wins if all hit TP</th><th class="r">Trades at ${pb.winRate}%</th><th class="r">Min days</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
        ${compact ? '' : `<dl class="kv" style="grid-template-columns:minmax(80px,max-content) minmax(0,1fr);margin-top:12px">
          <dt>When</dt><dd style="text-align:left;font-family:var(--f-body);white-space:normal">${esc(gd.window || '—')}</dd>
          <dt>Avoid</dt><dd style="text-align:left;font-family:var(--f-body);white-space:normal">${esc(gd.news || '—')}${c.rv.newsRestricted || fr.newsRestricted ? ` · <span class="warnc">your firm restricts news on funded accounts${restr.news ? ': ' + esc(String(restr.news)) : ''}</span>` : ''}</dd>
          <dt>Note</dt><dd style="text-align:left;font-family:var(--f-body);white-space:normal">${esc(gd.tip || '')}</dd></dl>`}
      </div>`;
    }).join('');
    const foot = compact ? '' : `${corr.length > 1 ? `<div class="alert warn" style="margin-top:12px">${icon('warn')}<span>${corr.map((l) => l.symbol).join(' and ')} move together against the dollar. Treat open positions on them as one risk: never run both at full size.</span></div>` : ''}
      ${payTxt.length ? `<div class="alert info" style="margin-top:12px">${icon('info')}<span>Payout limits for this program: ${esc(payTxt.join(' · '))}. Your payout goal may need more than one cycle.</span></div>` : ''}
      <p class="hint" style="margin-top:10px">* Min days set by the consistency rule, not the trade count. Never add size to hit a payout faster. If the market gives no setup, not trading is the plan.</p>`;
    return head + `<div class="grid ${pb.legs.length > 1 && !compact ? 'g2' : ''}" style="gap:12px">${cards}</div>` + foot;
  }

  // ---------- wizard ----------
  function wizard() {
    const w = ui.wizard;
    const steps = state.profile ? ['firm', 'model', 'goal', 'config', 'import', 'plan'] : ['profile', 'firm', 'model', 'goal', 'config', 'import', 'plan'];
    const i = steps.indexOf(w.step);
    const firm = FIRMS.find((f) => f.id === w.firmId);
    const model = firm && firm.models.find((m) => m.id === w.modelId);
    let body = '', canNext = true;
    if (w.step === 'profile') {
      body = `<h2>Create your profile</h2><p class="muted">Saved in this browser.${sb ? ' Sign in with Google to keep your accounts on every device.' : ''}</p>
        <label class="field"><span>Name</span><input class="input" id="w-name" data-w="name" value="${esc(w.name || '')}" autocomplete="name"></label>
        <label class="field"><span>Email</span><input class="input" id="w-email" type="email" data-w="email" value="${esc(w.email || '')}" autocomplete="email"></label>`;
      canNext = !!(w.name && w.name.trim());
    } else if (w.step === 'firm') {
      const q = (w.q || '').toLowerCase();
      body = `<h2>Which firm is your account with?</h2><input class="input" id="w-q" type="search" placeholder="Search firms" data-w="q" value="${esc(w.q || '')}">
        <div class="pick">${FIRMS.filter((f) => !q || f.name.toLowerCase().includes(q)).map((f) => { const ok = f.models.some((m) => m.rulesComplete) && f.status === 'active'; return `<button data-act="w-firm" data-id="${f.id}" aria-pressed="${w.firmId === f.id}" ${ok ? '' : 'disabled'}><b>${esc(f.name)}</b><span class="muted" style="font-size:12px">${ok ? esc(f.market) + ' · ' + f.models.filter((m) => m.rulesComplete).length + ' programs' : f.status !== 'active' ? 'Status uncertain' : 'Rules not published yet'}</span>${f.riskFlag ? '<span class="warnc" style="font-size:11px">Trust warning</span>' : ''}</button>`; }).join('')}</div>`;
      canNext = !!(firm && firm.models.some((m) => m.rulesComplete));
    } else if (w.step === 'model') {
      body = `<h2>Which ${esc(firm.name)} account did you buy?</h2>${firm.riskFlag ? `<div class="alert bad">${icon('warn')}<span>${esc(firm.riskFlag)}</span></div>` : ''}<div class="pick">${firm.models.map((m) => `<button data-act="w-model" data-id="${m.id}" aria-pressed="${w.modelId === m.id}" ${m.rulesComplete && !m.invitationOnly ? '' : 'disabled'}><b>${esc(m.name)}</b><span class="muted" style="font-size:12px">${esc(m.structure)}${m.invitationOnly ? ' · invitation only' : m.rulesComplete ? '' : ' · rules not published'}</span></button>`).join('')}</div>
        ${model ? `<div class="field"><span>Account size</span>${model.sizes.length ? `<div class="pick">${model.sizes.map((s) => `<button data-act="w-size" data-v="${s}" aria-pressed="${Number(w.size) === s}"><b class="num">$${s.toLocaleString()}</b>${priceFor(model, s) != null ? `<span class="muted" style="font-size:12px">${model.priceCcy === 'EUR' ? '€' : '$'}${priceFor(model, s)}</span>` : ''}</button>`).join('')}</div>` : `<input class="input num" id="w-size" type="number" min="1000" step="1000" data-w="size" value="${esc(w.size || '')}" placeholder="e.g. 100000"><span class="hint">Sizes aren't published for this program. Enter the size you bought.</span>`}</div>
        <div class="field"><span>Current phase</span><div class="seg">${Object.values(model.phases).map((p) => `<button data-act="w-phase" data-k="${p.key}" aria-pressed="${w.phase === p.key}">${esc(p.label)}</button>`).join('')}</div></div>
        ${PR.verification(phaseRecords(model.id, w.phase || Object.keys(model.phases)[0], Number(w.size))).confirmed ? '' : `<div class="alert warn">${icon('info')}<span>These rules were checked on ${esc(firm.checkedAt || 'an earlier date')} from public sources and are not yet verified against the firm's own page. Review them in Firm Rules.</span></div>`}` : ''}`;
      canNext = !!(model && Number(w.size) > 0 && w.phase);
    } else if (w.step === 'goal') {
      w.goal = w.goal || defaultGoal(); w.legs = w.legs || [];
      body = `<h2>What are you trading this account for?</h2><p class="muted">Your answers turn the firm’s rules into lot sizes and trade counts for each pair you pick.</p>${goalForm(w.goal, w.legs, 'w', futuresModel(firm, model))}`;
      canNext = w.legs.length > 0 && w.legs.every((l) => Number(l.stop) > 0) && (w.goal.type === 'pass' || Number(w.goal.amount) > 0);
    } else if (w.step === 'config') {
      body = `<h2>Configure the account</h2><div class="grid g2" style="gap:12px">
        <label class="field"><span>Account name</span><input class="input" id="w-aname" data-w="aname" value="${esc(w.aname || '')}"></label>
        <label class="field"><span>Currency</span><select class="input" id="w-ccy" data-w="ccy">${['USD', 'EUR', 'GBP', 'CAD'].map((x) => `<option ${x === (w.ccy || 'USD') ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>Platform</span><select class="input" id="w-plat" data-w="platform">${['MT5', 'MT4', 'cTrader', 'DXtrade', 'Match-Trader', 'TradeLocker', 'Tradovate', 'NinjaTrader', 'Rithmic', 'TopstepX', 'TradingView', 'Other'].map((p) => `<option ${p === (w.platform || 'MT5') ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        <label class="field"><span>Purchase date</span><input class="input" type="date" id="w-date" data-w="date" value="${esc(w.date || new Date().toISOString().slice(0, 10))}"></label>
        <label class="field"><span>Commission per ${futuresModel(firm, model) ? 'contract' : 'lot'}, round trip ($)</span><input class="input num" id="w-comm" type="number" step="any" min="0" data-w="comm" value="${esc(w.comm ?? '7')}"></label>
        <div class="field"><span>Risk profile</span><div class="seg">${Object.entries(PR.PROFILES).map(([k, v]) => `<button data-act="w-prof" data-k="${k}" aria-pressed="${(w.profile || 'balanced') === k}">${v.label}</button>`).join('')}</div></div></div>
        <p class="hint">Defaults: USD, MT5, $7 commission, balanced profile. Change any of them later in Settings.</p>`;
      canNext = !!(w.aname && w.aname.trim());
    } else if (w.step === 'import') {
      body = `<h2>Bring in your trades</h2><p class="muted">Starting fresh? Skip this. Already traded on this account? Paste your history so the limits are right.</p>
        <textarea class="input" id="w-csv" rows="6" data-w="csv" placeholder="ticket,symbol,type,volume,open_time,close_time,profit,commission">${esc(w.csv || '')}</textarea>
        <div class="row"><button class="btn sm" data-act="w-csv-check">Check CSV</button>${w.csvRes ? `<span class="${w.csvRes.errors.length ? 'warnc' : 'pos'}" style="font-size:13px">${w.csvRes.trades.length} trades ready · ${w.csvRes.duplicates} duplicates · ${w.csvRes.errors.length} errors</span>` : ''}</div>
        ${w.csvRes && w.csvRes.errors.length ? `<div class="alert warn">${icon('warn')}<span>${w.csvRes.errors.slice(0, 5).map((e) => `Line ${e.line}: ${esc(e.msg)}`).join('<br>')}</span></div>` : ''}
        <div class="pick"><button disabled><b>MT4 / MT5 auto-sync</b><span class="chip info nodot" style="font-size:11px">Coming soon</span></button><button disabled><b>Broker API</b><span class="chip info nodot" style="font-size:11px">Coming soon</span></button></div>
        <p class="hint">You can track this account fully by hand: record trades, import CSV, and enter floating P&amp;L in Settings.</p>`;
    } else if (w.step === 'plan') {
      const acct = draftAccount(w); const c = compute(acct);
      body = `<h2>Your plan</h2><p class="muted">${esc(firm.name)} · ${esc(model.name)} · ${esc(c.phase.label)} · ${fmt$(acct.initialBalance, 0)}</p>
        ${c.ver.confirmed ? '' : `<div class="alert warn">${icon('info')}<span>${c.ver.unverified.length} rules are unverified. Results are shown but not confirmed.</span></div>`}
        <div class="grid g2" style="gap:12px"><div class="panel"><dl class="kv"><dt>Profit target</dt><dd>${c.plan.target != null ? fmt$(c.plan.target, 0) : '—'}</dd><dt>Daily loss limit</dt><dd>${c.dl.applicable ? fmt$(c.dl.limit, 0) : '—'}</dd><dt>Max loss floor</dt><dd>${c.dd.applicable ? fmt$(c.dd.floor, 0) : '—'}</dd><dt>Min trading days</dt><dd>${c.td.min || '—'}</dd>${c.plan.dayCap != null ? `<dt>Consistency day cap</dt><dd>${fmt$(c.plan.dayCap, 0)}</dd>` : ''}</dl></div>
        <div class="panel"><dl class="kv"><dt>Risk per trade</dt><dd>${fmt$(c.plan.riskPerTrade)}</dd><dt>Daily risk budget</dt><dd>${fmt$(c.plan.dailyBudget)}</dd><dt>Max trades a day</dt><dd>${c.plan.maxTrades}</dd><dt>Trades imported</dt><dd>${acct.trades.length}</dd></dl></div></div>
        <h2 style="margin-top:6px">What to do with ${legsOf(acct).map((l) => l.symbol).join(', ')}</h2>
        ${renderPlaybook(acct, c, false)}`;
    }
    return `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true" aria-label="Account setup" data-stop>
      <div class="sheet-h"><div class="row"><b style="font-family:var(--f-display)">Set up an account</b><div class="steps">${steps.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div></div><button class="btn ghost sm" data-act="w-close" aria-label="Close">${icon('x', 'width="16" height="16"')}</button></div>
      <div class="sheet-b">${body}</div>
      <div class="sheet-f"><button class="btn ghost" data-act="w-back" ${i === 0 ? 'disabled' : ''}>Back</button>${w.step === 'plan' ? '<button class="btn primary" data-act="w-finish">Open dashboard</button>' : `<button class="btn primary" data-act="w-next" ${canNext ? '' : 'disabled'}>${w.step === 'import' ? (w.csvRes && w.csvRes.trades.length ? 'Continue' : 'Skip for now') : 'Continue'}</button>`}</div>
    </div></div>`;
  }
  function draftAccount(w) {
    const firm = FIRMS.find((f) => f.id === w.firmId);
    return { id: 'acct-' + uid(), name: w.aname.trim(), firmId: w.firmId, modelId: w.modelId, phase: w.phase, initialBalance: Number(w.size), currency: w.ccy || 'USD', platform: w.platform || 'MT5',
      purchaseTs: Date.parse(w.date || '') || Date.now(), riskProfile: w.profile || 'balanced', instrument: (w.legs && w.legs[0] ? w.legs[0].symbol : 'XAUUSD'), stopDistance: Number(w.legs && w.legs[0] ? w.legs[0].stop : 5), goal: Object.assign({}, w.goal || defaultGoal()), legs: (w.legs || []).map((l) => ({ symbol: l.symbol, stop: Number(l.stop) })), commissionPerLot: Number(w.comm ?? 7), openPnl: 0, createdTs: Date.now(),
      trades: w.csvRes ? w.csvRes.trades : [], timezone: firm.timezone };
  }

  // ---------- copilot ----------
  const SUGG = ['How much can I risk today?', 'Why am I close to my daily loss limit?', 'How much more profit for consistency?', 'What remains before my first payout?', 'What happens if I make another $500 today?', 'Explain my account rules'];
  function copilot(a, c) {
    if (!ui.chat.length) ui.chat.push({ r: 'a', t: `I answer from ${esc(a.name)}’s loaded rules and the engine’s calculations. I don’t guess rules.${c.ver.confirmed ? '' : ' Some rules here are unverified, so treat limits as unconfirmed.'}` });
    return `<div class="overlay" data-act="close-copilot" style="background:rgba(5,6,8,.35)"></div><aside class="drawer" role="dialog" aria-label="FundedMentor Copilot">
      <div class="sheet-h"><div class="row">${icon('spark', 'width="16" height="16" style="color:var(--accent)"')}<b style="font-family:var(--f-display)">FundedMentor Copilot</b></div><button class="btn ghost sm" data-act="close-copilot" aria-label="Close">${icon('x', 'width="16" height="16"')}</button></div>
      <div class="msgs">${ui.chat.map((m) => `<div class="msg ${m.r}">${m.t}</div>`).join('')}</div>
      <div class="sugg">${SUGG.map((s) => `<button data-act="ask" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="row" style="padding:12px 16px;border-top:1px solid var(--line);flex-wrap:nowrap" id="ask-form"><input class="input" id="ask-input" placeholder="Ask about this account" autocomplete="off"><button class="btn primary" type="submit">Ask</button></form></aside>`;
  }
  function answer(q, a, c) {
    const t = q.toLowerCase(); const B = (x) => `<b>${x}</b>`;
    const tail = (c.ver.confirmed ? '' : '<br><span class="muted">Based on unverified rules.</span>') + (c.src && c.src.kind === 'manual' ? `<br><span class="muted">Uses manually entered balance and P&amp;L, not broker-verified${c.src.stale ? '; floating P&amp;L may be out of date' : ''}.</span>` : '');
    const m = t.match(/(?:make|made|earn|gain|profit of|another)\s*\$?\s*([\d,]+(?:\.\d+)?)/);
    if (m || /what happens if/.test(t)) {
      const amt = m ? Number(m[1].replace(/,/g, '')) : null;
      if (!amt) return 'How much profit should I simulate? For example: “What happens if I make another $500 today?”';
      const sim = clone(a); sim.trades.push({ id: 'sim', symbol: a.instrument, side: 'buy', openTime: Date.now() - 60000, closeTime: Date.now(), profit: amt, commission: 0, swap: 0 });
      const c2 = compute(sim);
      const parts = [`Balance would be ${B(fmt$(c2.s.balance))} and today’s P&L ${B(sgn$(c2.s.todayPnl))}.`];
      if (c2.plan.target != null) parts.push(c2.plan.remainingTarget === 0 ? 'That would reach the profit target.' : `Target remaining: ${B(fmt$(c2.plan.remainingTarget))}.`);
      if (c2.cons.applicable) parts.push(`Best-day share becomes ${B(pct(c2.cons.share))} (limit ${c2.cons.limitPct}%)${c2.cons.pass ? '' : `, so you’d need ${B(fmt$(c2.cons.additional))} more profit on other days`}.`);
      return parts.join(' ') + tail;
    }
    if (/risk/.test(t) && !/daily loss/.test(t)) return `On the ${c.plan.profile.label.toLowerCase()} profile: ${B(fmt$(c.plan.riskPerTrade))} per trade, up to ${c.plan.maxTrades} trades, daily budget ${B(fmt$(c.plan.dailyBudget))}. Daily loss left is ${B(c.dl.applicable ? fmt$(c.dl.remaining) : '—')}.${c.plan.example && c.plan.example.ok ? ` That’s ${B(qty(c.plan.example.lots, c.spec))} of ${esc(a.instrument)} at a ${a.stopDistance} ${esc(c.spec.distUnit)} stop.` : ''}` + tail;
    if (/daily|close to|violat|limit/.test(t)) {
      if (!c.dl.applicable) return 'This phase has no daily loss limit loaded.' + tail;
      return `Today’s floor is ${B(fmt$(c.dl.floor))}: the ${c.rv.dailyLossReference === 'day_start_equity' ? 'day-start equity' : c.rv.dailyLossReference === 'day_start_higher' ? 'higher of day-start balance and equity' : 'day-start balance'} of ${fmt$(c.dl.reference)} minus a ${fmt$(c.dl.limit)} limit. Your ${c.rv.dailyLossIncludesUnrealized === false ? 'balance' : 'equity (including floating P&L)'} is ${fmt$(c.dl.current)}, so ${B(fmt$(c.dl.remaining))} is left (${pct(c.dl.usedPct, 0)} used). Today’s closed P&L is ${sgn$(c.s.todayPnl)}${c.s.unrealized ? ` and floating P&L is ${sgn$(c.s.unrealized)}` : ''}.` + tail;
    }
    if (/consisten/.test(t)) {
      if (!c.cons.applicable) return 'This phase has no consistency rule loaded. You can test one on the Consistency page.';
      if (c.cons.pass == null) return 'No profitable days yet, so consistency can’t be measured.';
      return c.cons.pass ? `You’re within the rule: best day ${B(fmt$(c.cons.bestDay.pnl))} is ${B(pct(c.cons.share))} of ${fmt$(c.cons.denominator)} (limit ${c.cons.limitPct}%). Keep any single day under ${B(fmt$(c.cons.maxDayAtCurrentTotal))} at today’s total.` + tail
        : `Best day ${B(fmt$(c.cons.bestDay.pnl))} is ${B(pct(c.cons.share))} of ${fmt$(c.cons.denominator)}. Total profit must reach ${B(fmt$(c.cons.requiredTotal))}, so ${B(fmt$(c.cons.additional))} more, assuming no new day beats your best.` + tail;
    }
    if (/payout|withdraw/.test(t)) {
      const open = c.pay.reqs.filter((r) => r.status !== 'met');
      return (open.length ? 'Still open: ' + open.map((r) => `${B(esc(r.label))} (${esc(r.detail)})`).join('; ') + '.' : 'All calculable requirements are met.') + ` Your calculated share is ${B(c.pay.traderShare != null ? fmt$(c.pay.traderShare) : '—')}. The firm makes the final call.` + (c.payVer.confirmed ? '' : '<br><span class="muted">Payout rules are unverified.</span>');
    }
    if (/drawdown|max loss|overall/.test(t)) return c.dd.applicable ? `Max loss floor is ${B(fmt$(c.dd.floor))} (${c.dd.type.replace('_', ' ')}${c.dd.locked ? ', locked' : ''}). You have ${B(fmt$(c.dd.remaining))} above it.` + tail : 'No maximum loss rule is loaded.';
    if (/explain|rules|simple/.test(t)) {
      const r = c.rv; const lines = [];
      if (r.profitTargetPct) lines.push(`Make ${r.profitTargetPct}% (${fmt$(c.plan.target, 0)}) to pass this phase.`);
      if (r.dailyLossPct) lines.push(`Don’t lose more than ${r.dailyLossPct}% (${fmt$(c.dl.limit, 0)}) in one day, measured from the ${r.dailyLossReference === 'day_start_higher' ? 'higher of balance and equity' : r.dailyLossReference === 'day_start_equity' ? 'equity' : 'balance'} at the ${String(c.firm.resetHour).padStart(2, '0')}:00 reset (${esc(c.firm.timezone)}).`);
      if (r.maxLossPct) lines.push(`Never go below ${fmt$(c.dd.floor, 0)}${r.ddType !== 'static' ? '; this floor rises as your ' + (r.ddType === 'trailing_eod' ? 'end-of-day balance' : 'peak') + ' rises' : ''}.`);
      if (r.minTradingDays) lines.push(`Trade on at least ${r.minTradingDays} separate days.`);
      if (r.consistencyPct) lines.push(`No single day can be more than ${r.consistencyPct}% of your profit.`);
      if (r.newsRestricted) lines.push('Avoid trading around high-impact news.');
      return lines.map((l) => '• ' + l).join('<br>') + tail;
    }
    return 'I can answer about risk today, daily loss, drawdown, consistency, payouts, simulating extra profit, or explain the rules. Try one of the suggestions below.';
  }


  // ---------- public pages: landing + log in ----------
  const DEMO = { dl: { applicable: true, usedPct: 34, status: 'ok', remaining: 3300 }, dd: { applicable: true, usedPct: 58, status: 'warning', remaining: 4200 } };
  function lpNav() {
    return `<header class="lp-nav"><div class="lp-wrap lp-nav-in">
      <button class="lp-brand" data-act="to-landing"><span class="mark" aria-hidden="true">FM</span><b>FundedMentor</b></button>
      <nav class="lp-links" aria-label="Sections"><button data-act="lp-jump" data-to="features">Features</button><button data-act="lp-jump" data-to="pricing">Pricing</button></nav>
      <div class="row lp-nav-cta"><button class="btn ghost sm" data-act="demo">Demo</button><button class="btn primary sm" data-act="to-auth" data-mode="signup">Sign in</button></div>
    </div></header>`;
  }
  function demoCard() {
    return `<div class="lp-demo" aria-label="Example account dashboard">
      <div class="lp-demo-top"><span class="acct-pill-ic">FT</span><span class="grow"><b>FTMO 100K · Challenge</b><small>Phase 1 · Example account</small></span><span class="chip info">Active</span></div>
      <div class="lp-demo-body">
        <div class="hero-main"><span class="label">Equity</span><div class="hero-num">$104,212<span class="cents">.40</span></div>
          <div class="hero-sub"><span class="pos">+$4,212.40</span> closed · today <span class="neg">−$1,140.00</span></div>
          <div class="hero-stats"><div><span>Daily loss left</span><b class="num">$3,300</b></div><div><span>Drawdown left</span><b class="num warnc">$4,200</b></div></div></div>
        <div class="hero-dial">${bezel({ plan: { target: 10000, progressPct: 42, remainingTarget: 5788 } }, 196)}<div class="next-btn static"><span class="next-l">Next trade</span><span class="next-v">0.75 lots XAUUSD · risk $450</span></div></div>
      </div>
      <div class="lp-demo-alert alert warn">${icon('warn')}<span><b>Initial Jobless Claims</b> at 8:30 AM. FundedMentor holds your next entry until 15 minutes after the release.</span></div>
    </div>`;
  }
  function landing() {
    const n = FIRMS.filter((f) => !f.custom).length;
    const F = [
      ['spark', 'Your next trade, sized', 'Lots, stop and target for the next trade, from your target, compounding or consistency rule.'],
      ['check', 'Live loss limits', 'Daily loss and drawdown left, measured the way your firm measures them.'],
      ['warn', 'News guard', 'High-impact releases on your calendar, with a warning before you enter.'],
    ];
    return `<div class="lp">${lpNav()}
      <section class="lp-hero"><div class="lp-wrap lp-hero-in">
        <div class="lp-copy">
          <span class="lp-eyebrow"><i></i>For prop firm traders · ${n} firms loaded</span>
          <h1 class="lp-h1">Pass your challenge. <em>Keep your account.</em></h1>
          <p class="lp-lede">FundedMentor turns your firm’s rules into one clear plan: what you can lose today and exactly how big your next trade should be.</p>
          <div class="row lp-cta"><button class="btn primary lg" data-act="to-auth" data-mode="signup">Start free with Google</button><button class="btn lg" data-act="demo">Try the demo</button></div>
        </div>
        ${demoCard()}
      </div></section>
      <section class="lp-sec" id="features"><div class="lp-wrap"><div class="lp-feats">${F.map(([ic, t, d]) => `<div class="lp-feat"><span class="lp-ic">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
      <section class="lp-sec alt" id="pricing"><div class="lp-wrap">
        <h2 class="lp-h2">Less than one challenge reset</h2>
        <div class="lp-prices two">
          <div class="lp-price"><h3>Free</h3><div class="lp-amt"><b class="num">$0</b></div><ul><li>1 account</li><li>Position size and loss limits</li><li>News calendar</li></ul><button class="btn" data-act="to-auth" data-mode="signup">Start free</button></div>
          <div class="lp-price pro"><span class="chip info nodot">Pro</span><h3>Pro</h3><div class="lp-amt"><b class="num">$29</b><span>/month</span></div><ul><li>Unlimited accounts, all ${n} firms</li><li>Next trade planner</li>${FEATURES.liveSync ? '<li>Live MT5 sync, every minute</li>' : '<li class="muted">MT4/MT5 auto-sync · Coming soon</li>'}</ul><button class="btn primary" data-act="${cloudUser ? 'go-pro' : 'to-auth'}" data-mode="signup">Go Pro</button></div>
        </div>
      </div></section>
      <footer class="lp-foot"><div class="lp-wrap"><div class="row between"><span class="row"><span class="mark" aria-hidden="true">FM</span><b>FundedMentor</b></span><span class="hint">fundedmentor.com</span></div>
        <p class="disclaimer">FundedMentor is a planning and risk tool. It does not place trades, give investment advice, or guarantee a pass or payout. Trading involves substantial risk of loss.</p><p class="hint" style="margin-top:12px"><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p></div></footer>
    </div>`;
  }
  function authPage() {
    return `<div class="auth">
      <aside class="auth-side"><button class="lp-brand" data-act="to-landing"><span class="mark" aria-hidden="true">FM</span><b>FundedMentor</b></button>
        <div class="auth-side-mid"><h2 class="lp-h2">Know your limit before the market finds it.</h2>${demoCard()}</div>
        <p class="hint">Rules for ${FIRMS.filter((f) => !f.custom).length} prop firms, sized to your account.</p></aside>
      <main class="auth-main"><div class="auth-card">
        <button type="button" class="lp-brand auth-mobile-brand" data-act="to-landing"><span class="mark" aria-hidden="true">FM</span><b>FundedMentor</b></button>
        <h1>Sign in</h1>
        <p class="muted">One tap with Google. New here? The same button creates your free account.</p>
        <div id="gbtn" class="gbtn" aria-label="Sign in with Google"></div>
        <button class="btn g-btn g-fallback" data-act="google" ${ui.authBusy ? 'disabled' : ''}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>${ui.authBusy ? 'Opening Google…' : 'Continue with Google'}</button>
        ${ui.authErr ? `<div class="alert bad" role="alert">${icon('warn')}<span>${esc(ui.authErr)}</span></div>` : ''}
        <div class="auth-or"><span>or</span></div>
        <button type="button" class="btn lg" data-act="demo">Explore the demo</button>
        <p class="hint auth-fine">By continuing you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>. We use your Google name and email for your account only.</p>
      </div></main>
    </div>`;
  }
  function signIn(e) {
    const g = (id) => (($('#' + id) || {}).value || '').trim();
    const su = ui.authMode === 'signup'; const email = g('au-email'), pass = ($('#au-pass') || {}).value || '', name = g('au-name');
    if (su && !name) ui.authErr = 'Enter your name.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ui.authErr = 'Enter a valid email address.';
    else if (pass.length < 8) ui.authErr = 'Password must be at least 8 characters.';
    else ui.authErr = null;
    if (ui.authErr) { render(); return; }
    if (su || !state.profile) state.profile = { name: name || email.split('@')[0], email, created: Date.now() };
    state.session = { email, ts: Date.now() }; state.view = 'overview';
    save(); window.scrollTo(0, 0); toast(su ? 'Account created' : 'Logged in');
  }

  // ---------- events ----------
  function toast(msg) { ui.toast = msg; render(); clearTimeout(toast.t); toast.t = setTimeout(() => { ui.toast = null; render(); }, 2200); }
  function updateAcct(fn) { const a = active(); if (!a) return; fn(a); save(); }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.classList.contains('overlay') && e.target !== el) return; // clicks inside sheet
    const act = el.dataset.act; const a = active();
    const W = ui.wizard;
    switch (act) {
      case 'cal': ui.calMonth = el.dataset.m; ui.calDay = null; break;
      case 'cal-day': ui.calDay = el.dataset.k; break;
      case 'next-open': ui.next = true; ui.ntMode = null; break;
      case 'next-close': ui.next = false; break;
      case 'nt-mode': ui.ntMode = el.dataset.k; break;
      case 'next-check': ui.next = false; state.view = 'check'; ui.check = null; save(); render(); window.scrollTo(0, 0); return;
      case 'to-auth': if (state.session && state.session.demo) { state.session = null; save(); } ui.route = 'auth'; ui.authMode = el.dataset.mode || 'signup'; ui.authErr = null; render(); window.scrollTo(0, 0); return;
      case 'to-landing': ui.route = 'landing'; render(); window.scrollTo(0, 0); return;
      case 'auth-tab': ui.authMode = el.dataset.mode; ui.authErr = null; break;
      case 'auth-forgot': ui.authErr = 'Password reset arrives with live accounts. In this preview, log in with any password of 8+ characters.'; break;
      case 'lp-jump': { const t = document.getElementById(el.dataset.to); if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); return; }
      case 'demo': state.session = { email: '', demo: true, ts: Date.now() }; if (!state.accounts.length) { const s0 = seed(); state.accounts = s0.accounts; state.activeId = s0.activeId; } state.view = 'overview'; save(); render(); window.scrollTo(0, 0); return;
      case 'google': if (!sb) { ui.authErr = 'Google sign-in works on fundedmentor.com. Open the site there to sign in.'; break; } ui.authBusy = true; render(); sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/', queryParams: { prompt: 'select_account' } } }).then(({ error }) => { if (error) { ui.authBusy = false; ui.authErr = /not enabled|provider/i.test(error.message) ? 'Google sign-in is being switched on. Try again shortly or explore the demo.' : error.message; render(); } }); return;
      case 'logout': if (sb && cloudUser) { sb.auth.signOut().catch(() => {}); cloudUser = null; } state.session = null; ui.route = 'landing'; ui.menu = false; ui.more = false; ui.copilot = false; save(); render(); window.scrollTo(0, 0); return;
      case 'go': state.view = el.dataset.v; ui.more = false; ui.menu = false; ui.confirm = null; save(); render(); window.scrollTo(0, 0); return;
      case 'more': ui.more = true; break;
      case 'close-more': ui.more = false; break;
      case 'menu': ui.menu = !ui.menu; break;
      case 'close-menu': ui.menu = false; break;
      case 'switch': state.activeId = el.dataset.id; ui.menu = false; ui.calc = null; ui.check = null; ui.newTrade = null; ui.chat = []; if (state.view === 'accounts') state.view = 'overview'; save(); break;
      case 'go-pro': ui.upgrade = { reason: el.dataset.r || null }; break;
      case 'up-close': ui.upgrade = null; break;
      case 'up-pay': { const m = el.dataset.m; ui.upgrade = Object.assign({}, ui.upgrade, { busy: m, err: null }); render(); fn('billing', { method: m }).then((r) => { if (r.url) { location.href = r.url; return; } ui.upgrade = Object.assign({}, ui.upgrade, { busy: null, err: r.error }); render(); }); return; }
      case 'mt5-link': if (!FEATURES.liveSync) { toast('Automatic sync is coming soon.'); return; } { const id = el.dataset.id; const login = ($('#m-login') || {}).value || '', password = ($('#m-pass') || {}).value || '', server = ($('#m-server') || {}).value || '';
        ui.mt5Busy = id; ui.mt5Err = null; render();
        fn('mt5', { action: 'link', localId: id, login, password, server }).then((r) => { ui.mt5Busy = null;
          if (r.upgrade) { ui.upgrade = { reason: 'Live MT5 sync is part of Pro.' }; render(); return; }
          if (r.error) { ui.mt5Err = r.error; render(); return; }
          updateAcct((x) => { x.mt5 = { login: login.replace(/\D/g, ''), server: server.trim(), status: r.status, since: x.purchaseTs || x.createdTs }; });
          toast('Connecting to your broker. First sync takes 1 to 3 minutes.'); setTimeout(() => syncMt5(id, true), 45000); });
        return; }
      case 'mt5-sync': if (!FEATURES.liveSync) { toast('Automatic sync is coming soon.'); return; } syncMt5(el.dataset.id); return;
      case 'mt5-unlink': if (!FEATURES.liveSync) return; { const id = el.dataset.id; ui.confirm = null; fn('mt5', { action: 'unlink', localId: id }).then(() => { const x = state.accounts.find((y) => y.id === id); if (x) { delete x.mt5; save(); } toast('MT5 disconnected'); }); return; }
      case 'wizard': if (cloudUser && !isPro() && realAccounts() >= 1) { ui.upgrade = { reason: 'Free covers one account. Go Pro to track more.' }; break; } ui.menu = false; ui.more = false; ui.wizard = { step: state.profile ? 'firm' : 'profile', firmId: null, modelId: null, phase: null, size: null, profile: 'balanced', inst: 'XAUUSD', stop: '5', comm: '7', ccy: 'USD', platform: 'MT5' }; break;
      case 'w-close': ui.wizard = null; break;
      case 'w-firm': W.firmId = el.dataset.id; W.modelId = null; W.size = null; W.phase = null; break;
      case 'w-model': { W.modelId = el.dataset.id; const fm = findModel(W.modelId); W.phase = Object.keys(fm.model.phases)[0]; W.size = fm.model.sizes.includes(Number(W.size)) ? W.size : fm.model.sizes.length ? fm.model.sizes[Math.min(3, fm.model.sizes.length - 1)] : null; const fut = futuresModel(fm.firm, fm.model); const picks = fut ? FUT_PICKS : FX_PICKS; W.legs = (W.legs || []).filter((l) => picks.includes(l.symbol)); if (!W.legs.length) W.legs = [{ symbol: fut ? 'MNQ' : 'XAUUSD', stop: fut ? 20 : 5 }]; if (fut) { W.comm = '1.5'; W.platform = 'Tradovate'; } break; }
      case 'w-size': W.size = Number(el.dataset.v); break;
      case 'w-phase': W.phase = el.dataset.k; break;
      case 'w-prof': W.profile = el.dataset.k; break;
      case 'w-csv-check': W.csv = $('#w-csv').value; W.csvRes = PR.importTrades(W.csv, []); break;
      case 'w-back': { const steps = state.profile ? ['firm', 'model', 'goal', 'config', 'import', 'plan'] : ['profile', 'firm', 'model', 'goal', 'config', 'import', 'plan']; W.step = steps[Math.max(0, steps.indexOf(W.step) - 1)]; break; }
      case 'w-next': {
        if (W.step === 'profile') state.profile = { name: W.name.trim(), email: (W.email || '').trim(), created: Date.now() };
        if (W.step === 'model' && !W.aname) { const fm = findModel(W.modelId); W.aname = `${fm.firm.name} ${Number(W.size) / 1000}K · ${fm.model.phases[W.phase].label}`; }
        const steps = state.profile && W.step !== 'profile' ? ['firm', 'model', 'goal', 'config', 'import', 'plan'] : ['profile', 'firm', 'model', 'goal', 'config', 'import', 'plan'];
        W.step = steps[steps.indexOf(W.step) + 1]; save(); break;
      }
      case 'w-finish': { const acct = draftAccount(W); state.accounts.push(acct); state.activeId = acct.id; state.view = 'overview'; ui.wizard = null; ui.calc = null; ui.check = null; ui.chat = []; save(); toast('Account created'); return; }
      case 'clear-examples': state.accounts = state.accounts.filter((x) => !x.example); state.activeId = state.accounts[0] ? state.accounts[0].id : null; save(); break;
      case 'restore-examples': { const s = seed(); state.accounts = state.accounts.filter((x) => !x.example).concat(s.accounts); state.activeId = state.activeId || s.activeId; save(); toast('Example accounts loaded'); return; }
      case 'confirm': ui.confirm = el.dataset.k; break;
      case 'cancel-confirm': ui.confirm = null; break;
      case 'del-acct': state.accounts = state.accounts.filter((x) => x.id !== el.dataset.id); if (state.activeId === el.dataset.id) state.activeId = state.accounts[0] ? state.accounts[0].id : null; ui.confirm = null; save(); toast('Account deleted'); return;
      case 'reset': localStorage.removeItem(STORE); state = { v: 1, profile: null, view: 'overview', theme: 'system', libEdits: {}, ruleHistory: [], reports: [], accounts: [], activeId: null }; ui.confirm = null; save(); toast('All data erased'); return;
      case 'profile': updateAcct((x) => { x.riskProfile = el.dataset.k; }); break;
      case 'theme': state.theme = el.dataset.k; save(); break;
      case 'calc-set': ui.calc[el.dataset.k] = el.dataset.val; break;
      case 'check-set': ui.check[el.dataset.k] = el.dataset.val; break;
      case 'check-fill': {
        const c = compute(a); const f = ui.check; const spec = specFor(f.inst, a);
        if (f.entry === '' || f.stop === '') { toast('Enter entry and stop-loss first'); return; }
        const r = PR.positionSize({ spec, entry: f.entry, stop: f.stop, risk: c.plan.riskPerTrade, riskMode: 'amount', equity: c.s.equity, accountCcy: a.currency, conversionRate: f.rate || null, commissionPerLot: f.comm || 0 });
        if (!r.ok) { toast(r.reason); return; }
        f.lots = String(r.lots); break;
      }
      case 'rule-firm': ui.ruleFirm = el.dataset.id; ui.edit = null; window.scrollTo(0, 0); break;
      case 'goal-edit': ui.goalEdit = !ui.goalEdit; break;
      case 'goal': case 'leg': {
        const tgt = el.dataset.scope === 'w' ? ui.wizard : active(); if (!tgt) return;
        if (el.dataset.scope !== 'w') { tgt.goal = Object.assign({}, goalOf(tgt)); tgt.legs = legsOf(tgt).map((l) => Object.assign({}, l)); }
        tgt.goal = tgt.goal || defaultGoal(); tgt.legs = tgt.legs || [];
        if (act === 'goal') { const k = el.dataset.k; tgt.goal[k] = k === 'type' ? el.dataset.v : Number(el.dataset.v); }
        else { const sym = el.dataset.v; const i = tgt.legs.findIndex((l) => l.symbol === sym); if (i >= 0) { if (el.dataset.scope === 'w' || tgt.legs.length > 1) tgt.legs.splice(i, 1); } else tgt.legs.push({ symbol: sym, stop: (GUIDE[sym] || {}).stop || 10 }); }
        if (el.dataset.scope !== 'w' && tgt.legs[0]) { tgt.instrument = tgt.legs[0].symbol; tgt.stopDistance = tgt.legs[0].stop; save(); }
        break;
      }
      case 'fq': (state.finder = state.finder || {})[el.dataset.k] = el.dataset.v; save(); break;
      case 'finder-rules': ui.ruleFirm = el.dataset.f; state.view = 'rules'; save(); render(); window.scrollTo(0, 0); return;
      case 'finder-track': { const fm = findModel(el.dataset.m); ui.wizard = { step: state.profile ? 'goal' : 'profile', legs: futuresModel(fm.firm, fm.model) ? [{ symbol: 'MNQ', stop: 20 }] : [{ symbol: 'XAUUSD', stop: 5 }], firmId: el.dataset.f, modelId: el.dataset.m, size: Number(el.dataset.s), phase: Object.keys(fm.model.phases)[0], profile: 'balanced', inst: fm.firm.futures || /futures/.test(fm.model.type) ? 'MNQ' : 'XAUUSD', stop: fm.firm.futures || /futures/.test(fm.model.type) ? '20' : '5', comm: '7', ccy: 'USD', platform: 'MT5', aname: `${fm.firm.name} ${Number(el.dataset.s) / 1000}K · ${fm.model.phases[Object.keys(fm.model.phases)[0]].label}` }; break; }
      case 'rule-size': (ui.ruleSize = ui.ruleSize || {})[el.dataset.m] = Number(el.dataset.v); ui.edit = null; break;
      case 'edit': ui.edit = { m: el.dataset.m, p: el.dataset.p, k: el.dataset.k }; render(); { const i = $('#edit-val'); if (i) i.focus(); } return;
      case 'edit-cancel': ui.edit = null; break;
      case 'edit-save': {
        const { m, p, k } = ui.edit; const meta = META[k]; const raw = $('#edit-val').value;
        const val = meta.unit === 'bool' ? raw === 'true' : meta.unit === 'enum' ? raw : raw === '' ? null : Number(raw);
        if (val !== null && meta.unit !== 'bool' && meta.unit !== 'enum' && Number.isNaN(val)) { toast('Enter a number'); return; }
        const old = phaseRecords(m, p, curSize(m))[k];
        const rec = Object.assign({}, old || { source: null, effective: null, notes: '' }, { value: val, status: 'user_configured', version: (old ? old.version : 0) + 1, verifiedAt: null, editedAt: new Date().toISOString() });
        editBucket(m, p, k)[k] = rec;
        state.ruleHistory.push({ modelId: m, phase: p, key: k, old: old ? old.value : '—', new: val, from: old ? old.version : 0, to: rec.version, action: 'Edited', ts: Date.now() });
        ui.edit = null; save(); toast('Rule saved as a new version'); return;
      }
      case 'verify-phase': {
        const { m, p } = el.dataset; const recs = phaseRecords(m, p, curSize(m)); let n = 0;
        for (const k in recs) { const r = recs[k]; if (r.status === 'verified') continue; const rec = Object.assign({}, r, { status: 'verified', verifiedAt: new Date().toISOString().slice(0, 10), version: r.version + 1 }); editBucket(m, p, k)[k] = rec; state.ruleHistory.push({ modelId: m, phase: p, key: k, old: r.status, new: 'verified', from: r.version, to: rec.version, action: 'Verified', ts: Date.now() }); n++; }
        save(); toast(n ? `${n} rules marked verified` : 'Already verified'); return;
      }
      case 'report': ui.confirm = 'report-' + el.dataset.m; break;
      case 'report-save': { const tx = $('#report-text').value.trim(); if (!tx) { toast('Describe the issue first'); return; } state.reports.push({ modelId: el.dataset.m, text: tx, ts: Date.now() }); ui.confirm = null; save(); toast('Report saved to the audit trail'); return; }
      case 'add-trade': addTrade(a); return;
      case 'del-trade': updateAcct((x) => { x.trades = x.trades.filter((t) => String(t.id) !== el.dataset.id); }); toast('Trade removed'); return;
      case 'csv-preview': { ui.csvText = $('#csv-text').value; if (!ui.csvText.trim()) { toast('Choose a file or paste CSV first'); return; } ui.csv = PR.importTrades(ui.csvText, a.trades); break; }
      case 'csv-import': { const n = ui.csv.trades.length; updateAcct((x) => { x.trades = x.trades.concat(ui.csv.trades); }); ui.csv = null; ui.csvText = ''; toast(`${n} trades imported`); return; }
      case 'export': { const txt = JSON.stringify(state); const ta = $('#backup'); const done = () => toast('Backup copied'); try { navigator.clipboard.writeText(txt).then(done, () => { ta.value = txt; ta.select(); toast('Backup selected. Copy it manually.'); }); } catch (err) { ta.value = txt; ta.select(); toast('Backup selected. Copy it manually.'); } return; }
      case 'import': { try { const s = JSON.parse($('#backup').value); if (!s || s.v !== 1 || !Array.isArray(s.accounts)) throw new Error(); state = s; save(); toast('Backup restored'); } catch (err) { toast('That is not a valid FundedMentor backup'); } return; }
      case 'next-phase': { const c = compute(a); const np = nextPhase(c, a); updateAcct((x) => { (x.archive = x.archive || []).push({ phase: x.phase, trades: x.trades, endedTs: Date.now() }); x.trades = []; x.phase = np; x.openPnl = 0; x.peakEquity = null; if (np === 'funded') x.fundedTs = Date.now(); }); toast('New phase started'); return; }
      case 'copilot': ui.copilot = true; render(); { const i = $('#ask-input'); if (i) i.focus(); } return;
      case 'close-copilot': ui.copilot = false; break;
      case 'ask': ask(el.dataset.q); return;
      default: return;
    }
    render();
  });

  function ask(q) { const a = active(); if (!a || !q.trim()) return; const c = compute(a); ui.chat.push({ r: 'u', t: esc(q) }); ui.chat.push({ r: 'a', t: answer(q, a, c) }); render(); const i = $('#ask-input'); if (i) i.focus(); }
  document.addEventListener('submit', (e) => { if (e.target.id === 'auth-form') { e.preventDefault(); signIn(e); return; } if (e.target.id === 'ask-form') { e.preventDefault(); const i = $('#ask-input'); ask(i.value); } });

  function addTrade(a) {
    const f = ui.newTrade; ui.tradeErr = null;
    const ot = Date.parse(f.open), ct = Date.parse(f.close);
    if (Number.isNaN(ct)) { ui.tradeErr = 'Enter a close time.'; return render(); }
    if (!Number.isNaN(ot) && ot > ct) { ui.tradeErr = 'Open time is after close time.'; return render(); }
    let profit = f.profit === '' ? null : Number(f.profit);
    if (profit == null) {
      const spec = specFor(f.symbol, a);
      if (f.entry === '' || f.exit === '' || !(Number(f.lots) > 0)) { ui.tradeErr = 'Enter profit, or entry, exit and lots.'; return render(); }
      const conv = PR.quoteToAccount(spec, a.currency, f.exit, null);
      if (!conv.ok) { ui.tradeErr = `Enter profit directly (needs ${conv.missing}).`; return render(); }
      const D = PR.D; const move = D.sub(f.exit, f.entry) * (f.side === 'buy' ? 1n : -1n);
      const vpu = conv.inversePrice ? D.div(spec.contractSize, conv.inversePrice) : D.mul(spec.contractSize, conv.rate);
      profit = D.money(D.mul(D.mul(move, vpu), f.lots));
    }
    if (Number.isNaN(profit)) { ui.tradeErr = 'Profit must be a number.'; return render(); }
    updateAcct((x) => x.trades.push({ id: 'm-' + uid(), symbol: f.symbol, side: f.side, lots: f.lots === '' ? null : Number(f.lots), openTime: Number.isNaN(ot) ? ct : ot, closeTime: ct, entry: f.entry === '' ? null : Number(f.entry), exit: f.exit === '' ? null : Number(f.exit), profit, commission: Number(f.comm) || 0, swap: Number(f.swap) || 0, source: 'manual' }));
    ui.newTrade = null; toast(`Trade added · ${sgn$(profit)}`);
  }

  // Inputs: update state and re-render only what depends on them, so focus stays put.
  document.addEventListener('input', (e) => {
    const el = e.target; const a = active(); const d = el.dataset;
    if (d.calc !== undefined) { ui.calc[d.calc] = el.value; if (d.full) { ui.calc.cs = ''; render(); } else { const o = $('#calc-out'); if (o) o.innerHTML = calcOut(a, compute(a)); } return; }
    if (d.check !== undefined) { ui.check[d.check] = el.value; if (d.full) { const s = PR.INSTRUMENTS[el.value]; ui.check.entry = String(s.sample); ui.check.stop = ''; ui.check.tp = ''; ui.check.lots = ''; render(); } else { const o = $('#check-out'); if (o) o.innerHTML = checkOut(a, compute(a)); } return; }
    if (d.w !== undefined) { ui.wizard[d.w] = el.value; if (d.w === 'q' || d.w === 'inst') { render(); const i = $('#w-' + d.w); if (i) { i.focus(); if (i.setSelectionRange && i.type === 'search') i.setSelectionRange(i.value.length, i.value.length); } } else { const btn = $('[data-act="w-next"]'); if (btn) { const w = ui.wizard; btn.disabled = w.step === 'profile' ? !(w.name && w.name.trim()) : w.step === 'model' ? !(w.modelId && Number(w.size) > 0 && w.phase) : w.step === 'config' ? !((w.aname || '').trim()) : btn.disabled; } } return; }
    if (d.nt !== undefined) { ui.newTrade[d.nt] = el.value; return; }
    if (d.ui !== undefined) {
      ui[d.ui] = el.value;
      if (d.ui === 'ruleSearch') { render(); const i = $('#rule-search'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
      else if (d.ui === 'consWhatIf' || d.ui === 'consPct') { if (d.ui === 'consPct') { render(); const i = $('#cons-pct'); i.focus(); } else { render(); const i = $('#cons-what'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
      return;
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target; const d = el.dataset; const a = active();
    if (d.acct !== undefined && a) {
      const k = d.acct; let v = el.value;
      if (['initialBalance', 'openPnl', 'stopDistance'].includes(k)) { v = Number(v); if (Number.isNaN(v) || (k === 'initialBalance' && v <= 0)) { toast('Enter a valid number'); return; } }
      if (['peakEquity', 'dayStartEquity'].includes(k)) v = v === '' ? null : Number(v);
      if (k === 'fundedTs') v = v ? Date.parse(v + 'T00:00:00') : null;
      if (k === 'name' && !v.trim()) { toast('Name cannot be empty'); return; }
      updateAcct((x) => { x[k] = v; if (k === 'openPnl') { x.openPnlSource = 'manual'; x.openPnlTs = Date.now(); } });
      if (k === 'instrument') ui.calc = null;
      render(); return;
    }
    if (d.spec !== undefined && a) { updateAcct((x) => { x.specOverrides = x.specOverrides || {}; const o = (x.specOverrides[x.instrument] = x.specOverrides[x.instrument] || {}); if (el.value === '' || !(Number(el.value) > 0)) delete o[d.spec]; else o[d.spec] = Number(el.value); }); render(); return; }
    if (d.leg !== undefined || d.goalamt !== undefined) {
      const scope = d.scope || d.goalamt; const tgt = scope === 'w' ? ui.wizard : active(); if (!tgt) return;
      if (scope !== 'w') { tgt.goal = Object.assign({}, goalOf(tgt)); tgt.legs = legsOf(tgt).map((l) => Object.assign({}, l)); }
      if (d.leg !== undefined) { const l = (tgt.legs || []).find((x) => x.symbol === d.leg); if (l) l.stop = Number(el.value) || 0; }
      else { tgt.goal = tgt.goal || defaultGoal(); if (el.value !== '') tgt.goal.amount = Number(el.value); }
      if (scope !== 'w') { if (tgt.legs[0]) { tgt.instrument = tgt.legs[0].symbol; tgt.stopDistance = tgt.legs[0].stop; } save(); }
      render(); return;
    }
    if (d.aff !== undefined) { const v = el.value.trim(); if (v && !/^https:\/\//.test(v)) { toast('Use a full https:// link'); return; } state.affiliates = state.affiliates || {}; if (v) state.affiliates[d.aff] = v; else delete state.affiliates[d.aff]; save(); toast(v ? 'Affiliate link saved' : 'Affiliate link removed'); return; }
    if (d.profile !== undefined) { state.profile = Object.assign(state.profile || { created: Date.now() }, { [d.profile]: el.value.trim() }); save(); render(); return; }
    if (el.id === 'csv-file' && el.files && el.files[0]) { const r = new FileReader(); r.onload = () => { ui.csvText = String(r.result); ui.csv = PR.importTrades(ui.csvText, a.trades); render(); }; r.readAsText(el.files[0]); return; }
    if (d.w === 'ccy' || d.w === 'platform' || d.w === 'date') { ui.wizard[d.w] = el.value; }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (ui.next) ui.next = false; else if (ui.wizard) ui.wizard = null; else if (ui.copilot) ui.copilot = false; else if (ui.more) ui.more = false; else if (ui.menu) ui.menu = false; else return; render(); } });

  // Keep "today" fresh if the page stays open across a firm day reset.
  setInterval(() => { if (!document.activeElement || !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) render(); }, 60000);

  render();
})();
