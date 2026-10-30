/* FUNDEDMENTOR — deterministic rules engine.
 * Pure functions only. All money math runs through fixed-point BigInt (8dp).
 * Works in browser (window.PR) and Node (module.exports). */
(function (root) {
  'use strict';

  // ---------- Fixed-point decimal (8 dp) ----------
  const S = 100000000n;
  function fx(x) {
    if (typeof x === 'bigint') return x;
    if (x === null || x === undefined || x === '' || Number.isNaN(Number(x)) || !Number.isFinite(Number(x))) {
      throw new Error('Invalid number: ' + x);
    }
    let s = typeof x === 'string' ? x.trim() : Number(x).toFixed(8);
    if (/e/i.test(s)) s = Number(s).toFixed(8);
    const neg = s.startsWith('-');
    if (neg || s.startsWith('+')) s = s.slice(1);
    let [i, f = ''] = s.split('.');
    f = f + '000000000';
    let v = BigInt(i || '0') * S + BigInt(f.slice(0, 8));
    if (Number(f[8]) >= 5) v += 1n;
    return neg ? -v : v;
  }
  const abs = (a) => (a < 0n ? -a : a);
  const add = (...xs) => xs.reduce((s, x) => s + fx(x), 0n);
  const sub = (a, b) => fx(a) - fx(b);
  function mul(a, b) {
    const p = fx(a) * fx(b);
    let q = p / S; const r = p % S;
    if (2n * abs(r) >= S) q += p < 0n ? -1n : 1n;
    return q;
  }
  function div(a, b) {
    const bb = fx(b);
    if (bb === 0n) throw new Error('Division by zero');
    const p = fx(a) * S;
    let q = p / bb; const r = p % bb;
    if (2n * abs(r) >= abs(bb)) q += (p < 0n) !== (bb < 0n) ? -1n : 1n;
    return q;
  }
  const max = (...xs) => xs.map(fx).reduce((m, x) => (x > m ? x : m));
  const min = (...xs) => xs.map(fx).reduce((m, x) => (x < m ? x : m));
  function floorTo(a, step) { // toward zero for positives, used for lot sizing
    const A = fx(a), st = fx(step);
    if (A <= 0n) return 0n;
    return (A / st) * st;
  }
  function roundTo(a, step) {
    const A = fx(a), st = fx(step);
    let q = A / st; const r = A % st;
    if (2n * abs(r) >= st) q += A < 0n ? -1n : 1n;
    return q * st;
  }
  const n = (a) => Number(fx(a)) / 1e8;
  const money = (a) => n(roundTo(a, '0.01'));
  const D = { fx, add, sub, mul, div, max, min, floorTo, roundTo, n, money, abs };

  // ---------- Instruments ----------
  // specStatus: 'standard' = conventional spec; 'broker_dependent' = must be confirmed with the user's broker/server
  const INSTRUMENTS = {
    EURUSD: { symbol: 'EURUSD', type: 'forex', base: 'EUR', quote: 'USD', contractSize: 100000, pip: 0.0001, digits: 5, distUnit: 'pips', minLot: 0.01, lotStep: 0.01, maxLot: 50, specStatus: 'standard', sample: 1.0850 },
    GBPUSD: { symbol: 'GBPUSD', type: 'forex', base: 'GBP', quote: 'USD', contractSize: 100000, pip: 0.0001, digits: 5, distUnit: 'pips', minLot: 0.01, lotStep: 0.01, maxLot: 50, specStatus: 'standard', sample: 1.2700 },
    AUDUSD: { symbol: 'AUDUSD', type: 'forex', base: 'AUD', quote: 'USD', contractSize: 100000, pip: 0.0001, digits: 5, distUnit: 'pips', minLot: 0.01, lotStep: 0.01, maxLot: 50, specStatus: 'standard', sample: 0.6600 },
    USDJPY: { symbol: 'USDJPY', type: 'forex', base: 'USD', quote: 'JPY', contractSize: 100000, pip: 0.01, digits: 3, distUnit: 'pips', minLot: 0.01, lotStep: 0.01, maxLot: 50, specStatus: 'standard', sample: 150.00 },
    USDCAD: { symbol: 'USDCAD', type: 'forex', base: 'USD', quote: 'CAD', contractSize: 100000, pip: 0.0001, digits: 5, distUnit: 'pips', minLot: 0.01, lotStep: 0.01, maxLot: 50, specStatus: 'standard', sample: 1.3700 },
    GBPJPY: { symbol: 'GBPJPY', type: 'forex', base: 'GBP', quote: 'JPY', contractSize: 100000, pip: 0.01, digits: 3, distUnit: 'pips', minLot: 0.01, lotStep: 0.01, maxLot: 50, specStatus: 'standard', sample: 190.00 },
    XAUUSD: { symbol: 'XAUUSD', type: 'metal', base: 'XAU', quote: 'USD', contractSize: 100, pip: 0.1, digits: 2, distUnit: 'price', minLot: 0.01, lotStep: 0.01, maxLot: 20, specStatus: 'broker_dependent', sample: 2650.00 },
    US30: { symbol: 'US30', type: 'index', base: 'US30', quote: 'USD', contractSize: 1, pip: 1, digits: 2, distUnit: 'points', minLot: 0.1, lotStep: 0.1, maxLot: 100, specStatus: 'broker_dependent', sample: 42000 },
    NAS100: { symbol: 'NAS100', type: 'index', base: 'NAS100', quote: 'USD', contractSize: 1, pip: 1, digits: 2, distUnit: 'points', minLot: 0.1, lotStep: 0.1, maxLot: 100, specStatus: 'broker_dependent', sample: 20000 },
    ES: { symbol: 'ES', type: 'future', base: 'ES', quote: 'USD', contractSize: 50, pip: 0.25, digits: 2, distUnit: 'points', minLot: 1, lotStep: 1, maxLot: 50, specStatus: 'standard', sample: 6000, label: 'E-mini S&P 500 ($50/pt)' },
    MES: { symbol: 'MES', type: 'future', base: 'MES', quote: 'USD', contractSize: 5, pip: 0.25, digits: 2, distUnit: 'points', minLot: 1, lotStep: 1, maxLot: 500, specStatus: 'standard', sample: 6000, label: 'Micro E-mini S&P ($5/pt)' },
    NQ: { symbol: 'NQ', type: 'future', base: 'NQ', quote: 'USD', contractSize: 20, pip: 0.25, digits: 2, distUnit: 'points', minLot: 1, lotStep: 1, maxLot: 50, specStatus: 'standard', sample: 21000, label: 'E-mini Nasdaq ($20/pt)' },
    MNQ: { symbol: 'MNQ', type: 'future', base: 'MNQ', quote: 'USD', contractSize: 2, pip: 0.25, digits: 2, distUnit: 'points', minLot: 1, lotStep: 1, maxLot: 500, specStatus: 'standard', sample: 21000, label: 'Micro Nasdaq ($2/pt)' },
    YM: { symbol: 'YM', type: 'future', base: 'YM', quote: 'USD', contractSize: 5, pip: 1, digits: 0, distUnit: 'points', minLot: 1, lotStep: 1, maxLot: 50, specStatus: 'standard', sample: 44000, label: 'E-mini Dow ($5/pt)' },
    MYM: { symbol: 'MYM', type: 'future', base: 'MYM', quote: 'USD', contractSize: 0.5, pip: 1, digits: 0, distUnit: 'points', minLot: 1, lotStep: 1, maxLot: 500, specStatus: 'standard', sample: 44000, label: 'Micro Dow ($0.50/pt)' },
    GC: { symbol: 'GC', type: 'future', base: 'GC', quote: 'USD', contractSize: 100, pip: 0.1, digits: 1, distUnit: 'price', minLot: 1, lotStep: 1, maxLot: 50, specStatus: 'standard', sample: 2650, label: 'Gold futures ($100/$1)' },
    MGC: { symbol: 'MGC', type: 'future', base: 'MGC', quote: 'USD', contractSize: 10, pip: 0.1, digits: 1, distUnit: 'price', minLot: 1, lotStep: 1, maxLot: 500, specStatus: 'standard', sample: 2650, label: 'Micro Gold ($10/$1)' },
    CL: { symbol: 'CL', type: 'future', base: 'CL', quote: 'USD', contractSize: 1000, pip: 0.01, digits: 2, distUnit: 'price', minLot: 1, lotStep: 1, maxLot: 50, specStatus: 'standard', sample: 70, label: 'Crude Oil ($1,000/$1)' },
    MCL: { symbol: 'MCL', type: 'future', base: 'MCL', quote: 'USD', contractSize: 100, pip: 0.01, digits: 2, distUnit: 'price', minLot: 1, lotStep: 1, maxLot: 500, specStatus: 'standard', sample: 70, label: 'Micro Crude ($100/$1)' },
    GER40: { symbol: 'GER40', type: 'index', base: 'GER40', quote: 'EUR', contractSize: 1, pip: 1, digits: 2, distUnit: 'points', minLot: 0.1, lotStep: 0.1, maxLot: 100, specStatus: 'broker_dependent', sample: 19000 },
  };

  /** Value of 1 unit of quote currency expressed in account currency. */
  function quoteToAccount(inst, accountCcy, price, userRate) {
    if (inst.quote === accountCcy) return { ok: true, rate: fx(1), source: 'direct' };
    if (inst.base === accountCcy && price) return { ok: true, rate: div(1, price), inversePrice: fx(price), source: 'inverse of price' };
    if (userRate) return { ok: true, rate: fx(userRate), source: 'user-supplied rate' };
    return { ok: false, missing: `${inst.quote}→${accountCcy} conversion rate` };
  }

  /** Account-currency value of a 1.0 price move for 1 lot (divides last to keep precision on inverse pairs). */
  function valuePerUnit(inst, conv) {
    return conv.inversePrice ? div(inst.contractSize, conv.inversePrice) : mul(inst.contractSize, conv.rate);
  }

  function distanceToPrice(inst, dist) {
    return inst.distUnit === 'pips' ? mul(dist, inst.pip) : fx(dist);
  }

  /** Position size from risk. Commission is round-turn per lot, in account currency. */
  function positionSize(p) {
    const inst = p.spec;
    const warnings = [];
    if (!inst || !(Number(inst.contractSize) > 0)) return { ok: false, reason: 'Missing or invalid contract size for this instrument.' };
    if (!(Number(inst.lotStep) > 0)) return { ok: false, reason: 'Missing lot step.' };
    let priceDist;
    if (p.entry != null && p.stop != null && p.entry !== '' && p.stop !== '') priceDist = abs(sub(p.entry, p.stop));
    else if (p.stopDistance != null && p.stopDistance !== '') priceDist = distanceToPrice(inst, p.stopDistance);
    else return { ok: false, reason: 'Enter a stop-loss price or distance.' };
    if (priceDist <= 0n) return { ok: false, reason: 'Stop-loss distance must be greater than zero.' };

    const conv = quoteToAccount(inst, p.accountCcy || 'USD', p.entry || inst.sample, p.conversionRate);
    if (!conv.ok) return { ok: false, reason: `Missing ${conv.missing}.`, missing: conv.missing };

    const riskAmount = p.riskMode === 'pct' ? div(mul(p.equity, p.risk), 100) : fx(p.risk);
    if (riskAmount <= 0n) return { ok: false, reason: 'Risk amount must be greater than zero.' };
    const commission = fx(p.commissionPerLot || 0);
    const valuePerPriceUnit = valuePerUnit(inst, conv); // account ccy per 1.0 price move per lot
    const lossPerLot = add(mul(priceDist, valuePerPriceUnit), commission);
    const rawLots = div(riskAmount, lossPerLot);
    let lots = floorTo(rawLots, inst.lotStep);
    if (inst.maxLot && lots > fx(inst.maxLot)) { lots = floorTo(inst.maxLot, inst.lotStep); warnings.push(`Capped at the maximum lot size of ${inst.maxLot}.`); }
    if (lots < fx(inst.minLot || 0)) { warnings.push(`Risk is too small for the minimum lot (${inst.minLot}). No position can be opened within this risk.`); lots = 0n; }
    const actualRisk = mul(lots, lossPerLot);
    let tpDist = null, profit = null, rr = null;
    if (p.tp != null && p.tp !== '' && p.entry != null && p.entry !== '') {
      tpDist = abs(sub(p.tp, p.entry));
      profit = sub(mul(mul(tpDist, valuePerPriceUnit), lots), mul(lots, commission));
      rr = div(tpDist, priceDist);
    }
    if (inst.specStatus === 'broker_dependent') warnings.push(`${inst.symbol} contract size varies by broker. Confirm ${inst.contractSize} per lot on your server.`);
    return {
      ok: true, estimate: inst.specStatus === 'broker_dependent' || conv.source === 'user-supplied rate',
      lots: n(lots), rawLots: n(rawLots), riskAmount: money(riskAmount), actualRisk: money(actualRisk),
      riskPctOfEquity: p.equity ? n(roundTo(div(mul(actualRisk, 100), p.equity), '0.0001')) : null,
      lossPerLot: money(lossPerLot), valuePerPriceUnit: n(valuePerPriceUnit), priceDistance: n(priceDist),
      commission: money(mul(lots, commission)), profitAtTP: profit == null ? null : money(profit),
      rr: rr == null ? null : n(roundTo(rr, '0.01')), conversion: conv.source, warnings,
    };
  }

  // ---------- Firm trading day / timezone ----------
  const fmtCache = {};
  function wallParts(ts, tz) {
    const f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }));
    const o = {}; for (const p of f.formatToParts(new Date(ts))) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour };
  }
  /** Trading-day key (YYYY-MM-DD) in the firm timezone. A reset at hour H means wall time >= H belongs to the next day. DST-safe. */
  function firmDayKey(ts, tz, resetHour) {
    const w = wallParts(ts, tz || 'UTC');
    let dt = Date.UTC(w.y, w.m - 1, w.d);
    if (resetHour && w.h >= resetHour) dt += 86400000;
    return new Date(dt).toISOString().slice(0, 10);
  }

  // ---------- Rules helpers ----------
  function ruleValues(rules) {
    const out = {};
    for (const k in rules) out[k] = rules[k] && typeof rules[k] === 'object' && 'value' in rules[k] ? rules[k].value : rules[k];
    return out;
  }
  function verification(rules) {
    const unverified = [];
    for (const k in rules) {
      const r = rules[k];
      if (r && typeof r === 'object' && 'status' in r && r.status !== 'verified' && r.status !== 'user_configured') unverified.push({ key: k, status: r.status });
    }
    return { confirmed: unverified.length === 0, unverified };
  }

  // ---------- Account state from trades ----------
  function netOf(t) { return add(t.profit || 0, t.commission || 0, t.swap || 0); }

  function accountState(acct, rv, now) {
    const tz = rv.timezone || 'UTC', reset = rv.resetHour || 0;
    const initial = fx(acct.initialBalance);
    const trades = [...(acct.trades || [])].filter((t) => t.closeTime).sort((a, b) => a.closeTime - b.closeTime);
    let bal = initial;
    const days = {}; const eod = []; const balSeries = [{ ts: acct.startTs || 0, balance: n(initial) }];
    const todayKey = firmDayKey(now, tz, reset);
    let dayStartBalance = initial; let realized = 0n;
    for (const t of trades) {
      const k = firmDayKey(t.closeTime, tz, reset);
      if (k < todayKey) dayStartBalance = add(bal, netOf(t));
      const net = netOf(t); bal = add(bal, net); realized = add(realized, net);
      days[k] = add(days[k] || 0, net);
      balSeries.push({ ts: t.closeTime, balance: n(bal), dayKey: k });
    }
    // End-of-day balances (last balance of each closed day)
    const keys = Object.keys(days).sort();
    let running = initial;
    for (const k of keys) { running = add(running, days[k]); if (k < todayKey) eod.push({ day: k, balance: n(running) }); }
    // Trading days by firm definition: day of open (default) or close
    const tdSet = new Set();
    for (const t of acct.trades || []) {
      const ts = rv.tradingDayBy === 'close' ? t.closeTime : (t.openTime || t.closeTime);
      if (ts) tdSet.add(firmDayKey(ts, tz, reset));
    }
    const unrealized = fx(acct.openPnl || 0);
    const dailyPnl = keys.map((k) => ({ day: k, pnl: n(days[k]) }));
    const positive = dailyPnl.filter((d) => d.pnl > 0);
    const best = positive.reduce((m, d) => (d.pnl > (m ? m.pnl : -Infinity) ? d : m), null);
    const minProfitDay = rv.profitableDayMinPct ? mul(initial, div(rv.profitableDayMinPct, 100)) : fx('0.01');
    return {
      initialBalance: n(initial), balance: money(bal), equity: money(add(bal, unrealized)), unrealized: money(unrealized),
      realized: money(realized), todayKey, todayPnl: n(days[todayKey] || 0), dayStartBalance: money(dayStartBalance),
      dayStartEquity: acct.dayStartEquity != null ? n(acct.dayStartEquity) : money(dayStartBalance),
      dailyPnl, eod, balSeries, bestDay: best, tradingDays: tdSet.size, tradingDayKeys: [...tdSet].sort(),
      profitableDays: dailyPnl.filter((d) => fx(d.pnl) >= minProfitDay).length,
      firstTradeTs: (acct.trades || []).reduce((m, t) => Math.min(m, t.openTime || t.closeTime || Infinity), Infinity),
      tradeCount: (acct.trades || []).length,
    };
  }

  // ---------- Daily loss ----------
  /** rule: { dailyLossPct, dailyLossBasis:'initial'|'day_start', dailyLossReference:'day_start_balance'|'day_start_equity'|'day_start_higher', dailyLossIncludesUnrealized } */
  function dailyLoss(rule, s) {
    if ((rule.dailyLossPct == null || rule.dailyLossPct === '') && (rule.dailyLossAmount == null || rule.dailyLossAmount === '')) return { applicable: false };
    const refBal = fx(s.dayStartBalance), refEq = fx(s.dayStartEquity != null ? s.dayStartEquity : s.dayStartBalance);
    const reference = rule.dailyLossReference === 'day_start_equity' ? refEq : rule.dailyLossReference === 'day_start_higher' ? max(refBal, refEq) : refBal;
    const basisAmt = rule.dailyLossBasis === 'day_start' ? reference : fx(s.initialBalance);
    const limit = rule.dailyLossAmount != null && rule.dailyLossAmount !== '' ? fx(rule.dailyLossAmount) : mul(basisAmt, div(rule.dailyLossPct, 100));
    const floor = sub(reference, limit);
    const current = rule.dailyLossIncludesUnrealized === false ? fx(s.balance) : fx(s.equity);
    const remaining = sub(current, floor);
    const used = sub(reference, current);
    const usedPct = limit > 0n ? n(roundTo(div(mul(max(used, 0), 100), limit), '0.01')) : 0;
    const status = remaining <= 0n ? 'breached' : usedPct >= 75 ? 'critical' : usedPct >= 50 ? 'warning' : 'ok';
    return { applicable: true, limit: money(limit), floor: money(floor), reference: money(reference), current: money(current), remaining: money(max(remaining, 0)), rawRemaining: money(remaining), usedPct, status };
  }

  // ---------- Max drawdown ----------
  /** rule: { maxLossPct, ddType:'static'|'trailing_intraday'|'trailing_eod'|'trailing_balance', ddBasis:'equity'|'balance', ddLockPct } */
  function maxDrawdown(rule, s, opts = {}) {
    const hasAmt = rule.maxLossAmount != null && rule.maxLossAmount !== '';
    if ((rule.maxLossPct == null || rule.maxLossPct === '') && !hasAmt) return { applicable: false };
    const initial = fx(s.initialBalance);
    const amount = hasAmt ? fx(rule.maxLossAmount) : mul(initial, div(rule.maxLossPct, 100));
    let hwm = initial; let estimate = false;
    const type = rule.ddType || 'static';
    if (type === 'trailing_intraday') {
      const eqs = (opts.equityPeaks || []).map(fx);
      if (!eqs.length) estimate = true; // only closed balances known
      hwm = max(initial, ...(s.balSeries || []).map((b) => b.balance), ...eqs, s.equity);
    } else if (type === 'trailing_eod') {
      hwm = max(initial, ...(s.eod || []).map((e) => e.balance));
    } else if (type === 'trailing_balance') {
      hwm = max(initial, ...(s.balSeries || []).map((b) => b.balance));
    }
    let floor = type === 'static' ? sub(initial, amount) : sub(hwm, amount);
    let locked = false;
    const hasLockAmt = rule.ddLockAmount != null && rule.ddLockAmount !== '';
    if (type !== 'static' && ((rule.ddLockPct != null && rule.ddLockPct !== '') || hasLockAmt)) {
      const lockLevel = hasLockAmt ? add(initial, rule.ddLockAmount) : add(initial, mul(initial, div(rule.ddLockPct, 100)));
      if (floor >= lockLevel) { floor = lockLevel; locked = true; }
    }
    const current = (rule.ddBasis || 'equity') === 'balance' ? fx(s.balance) : fx(s.equity);
    const remaining = sub(current, floor);
    const usedPct = amount > 0n ? n(roundTo(div(mul(max(sub(amount, remaining), 0), 100), amount), '0.01')) : 0;
    const status = remaining <= 0n ? 'breached' : usedPct >= 75 ? 'critical' : usedPct >= 50 ? 'warning' : 'ok';
    return { applicable: true, type, amount: money(amount), hwm: money(hwm), floor: money(floor), locked, current: money(current), remaining: money(max(remaining, 0)), rawRemaining: money(remaining), usedPct, status, estimate };
  }

  // ---------- Consistency ----------
  /** rule: { consistencyPct, consistencyDenominator:'total_profit'|'positive_days' } */
  function consistency(rule, dailyPnl) {
    if (!rule.consistencyPct) return { applicable: false };
    const pct = div(rule.consistencyPct, 100);
    const pos = dailyPnl.filter((d) => d.pnl > 0);
    if (!pos.length) return { applicable: true, status: 'no_profit', bestDay: null, pass: null };
    const best = pos.reduce((m, d) => (d.pnl > m.pnl ? d : m));
    const denom = rule.consistencyDenominator === 'positive_days' ? add(...pos.map((d) => d.pnl)) : add(...dailyPnl.map((d) => d.pnl));
    const required = div(best.pnl, pct);
    if (denom <= 0n) return { applicable: true, status: 'fail', pass: false, bestDay: best, denominator: money(denom), requiredTotal: money(required), additional: money(sub(required, denom)), share: null };
    const share = div(fx(best.pnl), denom);
    const pass = share <= pct;
    return {
      applicable: true, pass, status: pass ? 'pass' : 'fail', bestDay: best, denominator: money(denom),
      share: n(roundTo(mul(share, 100), '0.01')), limitPct: Number(rule.consistencyPct),
      requiredTotal: money(required), additional: money(max(sub(required, denom), 0)),
      maxDayAtCurrentTotal: money(mul(denom, pct)),
    };
  }

  // ---------- Trading days ----------
  function tradingDays(rule, s) {
    const minD = rule.minTradingDays || 0;
    return { min: minD, count: s.tradingDays, remaining: Math.max(0, minD - s.tradingDays), met: s.tradingDays >= minD, maxDays: rule.maxTradingDays || null };
  }

  // ---------- Payout eligibility ----------
  function payout(rule, s, opts) {
    const now = opts.now; const reqs = [];
    const profit = sub(s.balance, s.initialBalance);
    const startTs = opts.fundedTs || (Number.isFinite(s.firstTradeTs) ? s.firstTradeTs : null);
    if (rule.payoutWaitDays != null) {
      if (!startTs) reqs.push({ key: 'wait', label: `${rule.payoutWaitDays}-day waiting period`, status: 'unknown', detail: 'Set your funded date or record a trade.' });
      else {
        const elapsed = Math.floor((now - startTs) / 86400000);
        const met = elapsed >= rule.payoutWaitDays;
        reqs.push({ key: 'wait', label: `${rule.payoutWaitDays}-day waiting period`, status: met ? 'met' : 'unmet', detail: met ? `${elapsed} days elapsed` : `${rule.payoutWaitDays - elapsed} days to go`, eta: met ? null : startTs + rule.payoutWaitDays * 86400000 });
      }
    }
    if (rule.payoutMinProfitableDays) {
      const met = s.profitableDays >= rule.payoutMinProfitableDays;
      reqs.push({ key: 'pdays', label: `${rule.payoutMinProfitableDays} profitable days`, status: met ? 'met' : 'unmet', detail: `${s.profitableDays} of ${rule.payoutMinProfitableDays}` });
    }
    if (rule.minTradingDays) {
      const met = s.tradingDays >= rule.minTradingDays;
      reqs.push({ key: 'tdays', label: `${rule.minTradingDays} trading days`, status: met ? 'met' : 'unmet', detail: `${s.tradingDays} of ${rule.minTradingDays}` });
    }
    const minAmt = rule.payoutMinAmount != null ? fx(rule.payoutMinAmount) : 0n;
    const split = rule.profitSplitPct != null ? div(rule.profitSplitPct, 100) : null;
    const share = split != null ? mul(max(profit, 0), split) : null;
    reqs.push({ key: 'profit', label: 'Profit above starting balance', status: profit > 0n ? 'met' : 'unmet', detail: money(profit) > 0 ? `$${money(profit).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'No withdrawable profit yet' });
    if (rule.payoutMinAmount != null) {
      const met = share != null && share >= minAmt;
      reqs.push({ key: 'min', label: `Minimum payout $${Number(rule.payoutMinAmount).toLocaleString('en-US')}`, status: met ? 'met' : 'unmet', detail: share != null ? `Your share: $${money(share).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'Profit split not set' });
    }
    if (rule.consistencyPct && opts.consistency) {
      const c = opts.consistency;
      reqs.push({ key: 'cons', label: `Consistency ≤ ${rule.consistencyPct}% best day`, status: c.pass === true ? 'met' : c.pass === false ? 'unmet' : 'unknown', detail: c.pass === false ? `Need $${c.additional.toLocaleString('en-US', { minimumFractionDigits: 2 })} more total profit` : c.share != null ? `Best day is ${c.share}%` : 'No profitable days yet' });
    }
    reqs.push({ key: 'kyc', label: 'Firm compliance review / identity checks', status: 'unknown', detail: 'Handled by the firm. Cannot be calculated.' });
    let payable = share;
    let capped = false;
    if (payable != null && rule.payoutMaxAmount) { const cap = fx(rule.payoutMaxAmount); if (payable > cap) { payable = cap; capped = true; } }
    const calculable = reqs.filter((r) => r.key !== 'kyc');
    return {
      reqs, profit: money(profit), splitPct: rule.profitSplitPct ?? null, traderShare: share == null ? null : money(share),
      payable: payable == null ? null : money(payable), capped,
      calculatedEligible: calculable.every((r) => r.status === 'met'),
    };
  }

  // ---------- Plan ----------
  const PROFILES = {
    conservative: { label: 'Conservative', riskPct: 0.25, maxTrades: 2, dailyShare: 0.4, ddShare: 0.15, avgDayPct: [0.25, 0.4, 0.5] },
    balanced: { label: 'Balanced', riskPct: 0.5, maxTrades: 3, dailyShare: 0.5, ddShare: 0.2, avgDayPct: [0.4, 0.6, 0.8] },
    aggressive: { label: 'Aggressive', riskPct: 1, maxTrades: 3, dailyShare: 0.6, ddShare: 0.25, avgDayPct: [0.6, 1, 1.5] },
  };

  function plan(rv, s, profileKey, ex) {
    const prof = PROFILES[profileKey] || PROFILES.balanced;
    const dl = dailyLoss(rv, s), dd = maxDrawdown(rv, s), td = tradingDays(rv, s);
    const initial = fx(s.initialBalance);
    const target = rv.profitTargetAmount ? fx(rv.profitTargetAmount) : rv.profitTargetPct ? mul(initial, div(rv.profitTargetPct, 100)) : null;
    const progress = sub(s.balance, initial);
    const remainingTarget = target != null ? max(sub(target, progress), 0) : null;
    const remDaily = dl.applicable ? fx(dl.remaining) : null;
    const remDD = dd.applicable ? fx(dd.remaining) : null;
    const baseRisk = mul(initial, div(prof.riskPct, 100));
    const caps = [mul(baseRisk, prof.maxTrades)];
    if (remDaily != null) caps.push(mul(remDaily, prof.dailyShare));
    if (remDD != null) caps.push(mul(remDD, prof.ddShare));
    const dailyBudget = min(...caps);
    const riskPerTrade = min(baseRisk, dailyBudget);
    const notes = []; let feasible = true;
    if ((dl.applicable && dl.status === 'breached') || (dd.applicable && dd.status === 'breached')) { feasible = false; notes.push('A loss limit has been reached. Stop trading this account and check its status with the firm.'); }
    if (remainingTarget != null && remDD != null && remDD < fx(baseRisk)) notes.push('Remaining drawdown is smaller than one standard risk unit. Reduce size or stop.');
    // Consistency-aware daily cap
    let dayCap = null;
    if (rv.consistencyPct && target != null) dayCap = mul(target, div(rv.consistencyPct, 100));
    const scenarios = remainingTarget == null ? [] : prof.avgDayPct.map((p) => {
      const avg = mul(initial, div(p, 100));
      const daysNeeded = remainingTarget === 0n ? 0 : Number((remainingTarget + avg - 1n) / avg);
      const totalDays = Math.max(daysNeeded, td.remaining);
      const issues = [];
      if (rv.maxTradingDays && s.tradingDays + totalDays > rv.maxTradingDays) issues.push(`Needs ${totalDays} days but only ${rv.maxTradingDays - s.tradingDays} remain.`);
      if (dayCap != null && avg > dayCap) issues.push(`Average day exceeds the ${rv.consistencyPct}% consistency cap.`);
      if (dl.applicable && avg > fx(dl.limit)) issues.push('Average day is larger than the daily loss limit, which implies oversized risk.');
      return { avgPct: p, avgAmount: money(avg), daysNeeded, totalDays, issues, realistic: issues.length === 0 };
    });
    if (scenarios.length && scenarios.every((x) => !x.realistic)) { feasible = false; notes.push('No scenario reaches the target within these constraints without oversized days. Consider whether the deadline is reachable before adding risk.'); }
    let example = null;
    if (ex && ex.spec) example = positionSize({ spec: ex.spec, stopDistance: ex.stopDistance, risk: n(riskPerTrade), riskMode: 'amount', equity: s.equity, accountCcy: rv.currency || 'USD', conversionRate: ex.conversionRate, commissionPerLot: ex.commissionPerLot });
    return {
      profile: prof, riskPerTrade: money(riskPerTrade), dailyBudget: money(dailyBudget), maxTrades: prof.maxTrades,
      target: target == null ? null : money(target), progress: money(progress), remainingTarget: remainingTarget == null ? null : money(remainingTarget),
      progressPct: target ? Math.max(0, Math.min(100, n(roundTo(div(mul(progress, 100), target), '0.1')))) : null,
      dayCap: dayCap == null ? null : money(dayCap), scenarios, feasible, notes, example, dl, dd, td,
      stopIf: [
        dl.applicable ? `Today's loss reaches $${money(mul(fx(dl.remaining), prof.dailyShare)).toLocaleString('en-US')} (your daily budget), or 2 losses in a row.` : '2 losses in a row.',
        dayCap != null ? `A single day's profit approaches $${money(dayCap).toLocaleString('en-US')} (consistency cap).` : 'You feel the urge to win back a loss.',
        'Spreads widen around high-impact news (check your firm’s news rule).',
      ],
    };
  }


  // ---------- Goal playbook ----------
  /** Turns a payout goal + chosen instruments into per-instrument sizing and trade counts.
   *  p: { rv, s, profileKey, isFunded, fundedSplitPct, fundedConsistencyPct, goal:{type:'pass'|'payout'|'monthly', amount, winRate, rr}, legs:[{spec, stopDistance, commissionPerLot, conversionRate}], accountCcy } */
  function playbook(p) {
    const pl = plan(p.rv, p.s, p.profileKey || 'balanced');
    const g = p.goal || {};
    const wr = div(g.winRate || 50, 100);
    const rr = fx(g.rr || 2);
    const splitKnown = p.fundedSplitPct != null && p.fundedSplitPct !== '';
    const split = div(splitKnown ? p.fundedSplitPct : 80, 100);
    const profitSoFar = sub(p.s.balance, p.s.initialBalance);
    const stages = [];
    if (!p.isFunded && pl.remainingTarget != null) stages.push({ key: 'pass', label: 'Pass this phase', need: fx(pl.remainingTarget), dayCap: pl.dayCap != null ? fx(pl.dayCap) : null });
    if (g.type !== 'pass' && g.amount > 0) {
      const gross = div(g.amount, split);
      const need = p.isFunded ? max(sub(gross, max(profitSoFar, 0)), 0) : gross;
      const dc = p.fundedConsistencyPct ? div(mul(gross, p.fundedConsistencyPct), 100) : null;
      stages.push({ key: 'payout', label: g.type === 'monthly' ? 'Each month' : 'First payout', need, gross, dayCap: dc });
    }
    const legs = (p.legs || []).map((l) => {
      let ps;
      try { ps = positionSize({ spec: l.spec, stopDistance: l.stopDistance, risk: pl.riskPerTrade, riskMode: 'amount', equity: p.s.equity, accountCcy: p.accountCcy || 'USD', conversionRate: l.conversionRate, commissionPerLot: l.commissionPerLot || 0 }); }
      catch (e) { ps = { ok: false, reason: e.message }; }
      if (!ps.ok) return { symbol: l.spec ? l.spec.symbol : '?', ok: false, reason: ps.reason };
      if (!(ps.lots > 0)) return { symbol: l.spec.symbol, ok: false, reason: ps.warnings.join(' ') || 'Position would be zero lots at this risk.' };
      const lots = fx(ps.lots);
      const commission = mul(lots, l.commissionPerLot || 0);
      const win = sub(mul(mul(mul(fx(ps.priceDistance), rr), fx(ps.valuePerPriceUnit)), lots), commission);
      const loss = fx(ps.actualRisk);
      const expectancy = sub(mul(wr, win), mul(sub(fx(1), wr), loss));
      const st = stages.map((sg) => {
        const perfect = sg.need > 0n ? Number((sg.need + win - 1n) / win) : 0;
        const trades = expectancy > 0n ? (sg.need > 0n ? Number((sg.need + expectancy - 1n) / expectancy) : 0) : null;
        const days = trades == null ? null : Math.ceil(trades / pl.maxTrades);
        const consDays = sg.dayCap && sg.dayCap > 0n ? Number((sg.need + sg.dayCap - 1n) / sg.dayCap) : null;
        return { key: sg.key, label: sg.label, need: money(sg.need), perfectWins: perfect, trades, minDays: days == null ? null : Math.max(days, consDays || 0), consDays };
      });
      return { symbol: l.spec.symbol, ok: true, lots: ps.lots, risk: ps.actualRisk, win: money(win), loss: money(loss), expectancy: money(expectancy), edge: expectancy > 0n, stopDistance: l.stopDistance, distUnit: l.spec.distUnit, tpDistance: n(mul(fx(l.stopDistance), rr)), stages: st, estimate: ps.estimate, warnings: ps.warnings };
    });
    return {
      riskPerTrade: pl.riskPerTrade, dailyBudget: pl.dailyBudget, maxTrades: pl.maxTrades, splitPct: n(mul(split, 100)), splitAssumed: !splitKnown,
      winRate: n(mul(wr, 100)), rr: n(rr), stages: stages.map((sg) => ({ key: sg.key, label: sg.label, need: money(sg.need), gross: sg.gross != null ? money(sg.gross) : null, dayCap: sg.dayCap != null ? money(sg.dayCap) : null })),
      legs, feasible: pl.feasible, notes: pl.notes,
    };
  }

  // ---------- Pre-trade check ----------
  function preTrade(p) {
    const { rv, s, spec, verificationInfo } = p;
    if (!spec) return { status: 'unknown', reasons: ['Instrument spec is missing.'] };
    if (p.lots == null || p.lots === '' || !(Number(p.lots) > 0)) return { status: 'unknown', reasons: ['Enter a proposed lot size.'] };
    if (p.entry == null || p.entry === '' || p.stop == null || p.stop === '') return { status: 'unknown', reasons: ['Enter entry and stop-loss prices.'] };
    const dirOk = p.direction === 'buy' ? Number(p.stop) < Number(p.entry) : Number(p.stop) > Number(p.entry);
    const conv = quoteToAccount(spec, rv.currency || 'USD', p.entry, p.conversionRate);
    if (!conv.ok) return { status: 'unknown', reasons: [`Missing ${conv.missing}.`] };
    const vpu = valuePerUnit(spec, conv);
    const comm = mul(p.lots, p.commissionPerLot || 0);
    const loss = add(mul(mul(abs(sub(p.entry, p.stop)), vpu), p.lots), comm);
    let profit = null, rr = null;
    if (p.tp != null && p.tp !== '') { profit = sub(mul(mul(abs(sub(p.tp, p.entry)), vpu), p.lots), comm); rr = div(abs(sub(p.tp, p.entry)), abs(sub(p.entry, p.stop))); }
    const dl = dailyLoss(rv, s), dd = maxDrawdown(rv, s);
    const reasons = []; let level = 0; // 0 ok, 1 warn, 2 exceeds
    const bump = (l, msg) => { level = Math.max(level, l); reasons.push(msg); };
    if (!dirOk) bump(2, `Stop-loss is on the wrong side of entry for a ${p.direction}.`);
    if (dl.applicable) {
      const after = sub(dl.rawRemaining, loss);
      if (after <= 0n) bump(2, `A stop-out would breach the daily loss limit (only $${dl.remaining.toLocaleString('en-US')} left today).`);
      else if (loss >= mul(dl.remaining, '0.5')) bump(1, `A stop-out would use ${n(roundTo(div(mul(loss, 100), dl.remaining), '0.1'))}% of today's remaining loss allowance.`);
    }
    if (dd.applicable) {
      const after = sub(dd.rawRemaining, loss);
      if (after <= 0n) bump(2, 'A stop-out would breach the maximum drawdown.');
      else if (loss >= mul(dd.remaining, '0.25')) bump(1, `A stop-out would use ${n(roundTo(div(mul(loss, 100), dd.remaining), '0.1'))}% of remaining max drawdown.`);
    }
    if (rv.maxLots && fx(p.lots) > fx(rv.maxLots)) bump(2, `Exceeds the configured max position of ${rv.maxLots} lots.`);
    if (spec.maxLot && fx(p.lots) > fx(spec.maxLot)) bump(1, `Above the typical max lot (${spec.maxLot}) for ${spec.symbol}.`);
    if (p.plannedRisk && loss > fx(p.plannedRisk)) bump(1, `Risk is above your plan's $${Number(p.plannedRisk).toLocaleString('en-US')} per trade.`);
    if (rr != null && rr < fx(1)) bump(1, 'Reward is smaller than risk (R:R below 1).');
    if (rv.consistencyPct && profit != null && (rv.profitTargetPct || rv.profitTargetAmount)) {
      const tgt = rv.profitTargetAmount ? fx(rv.profitTargetAmount) : mul(s.initialBalance, div(rv.profitTargetPct, 100));
      const cap = mul(tgt, div(rv.consistencyPct, 100));
      if (add(s.todayPnl, profit) > cap) bump(1, `Hitting TP would push today's profit past the ~$${money(cap).toLocaleString('en-US')} consistency cap.`);
    }
    if (rv.newsRestricted) reasons.push('Firm restricts trading around high-impact news. Check the calendar.');
    if (spec.specStatus === 'broker_dependent') reasons.push(`${spec.symbol} contract size is broker-dependent. Result is an estimate.`);
    let status = level === 2 ? 'exceeds' : level === 1 ? 'warning' : 'within';
    const unconfirmed = verificationInfo && !verificationInfo.confirmed;
    return {
      status, unconfirmed, reasons, loss: money(loss), riskPct: n(roundTo(div(mul(loss, 100), s.equity), '0.01')),
      profit: profit == null ? null : money(profit), rr: rr == null ? null : n(roundTo(rr, '0.01')),
      dailyAfter: dl.applicable ? money(sub(dl.rawRemaining, loss)) : null, ddAfter: dd.applicable ? money(sub(dd.rawRemaining, loss)) : null,
    };
  }

  // ---------- CSV import ----------
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim() !== ''));
  }
  const ALIASES = { id: ['id', 'ticket', 'position', 'order', 'deal'], symbol: ['symbol', 'instrument', 'item'], side: ['side', 'type', 'direction'], lots: ['lots', 'volume', 'size', 'qty'], openTime: ['open_time', 'opentime', 'open time', 'time'], closeTime: ['close_time', 'closetime', 'close time'], entry: ['entry', 'open_price', 'open price', 'price'], exit: ['exit', 'close_price', 'close price'], profit: ['profit', 'pnl', 'p/l'], commission: ['commission', 'comm', 'fee'], swap: ['swap'] };
  function importTrades(text, existing) {
    const rows = parseCSV(text); const errors = []; const trades = [];
    if (rows.length < 2) return { trades, errors: [{ line: 0, msg: 'File has no data rows.' }], duplicates: 0 };
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = {}; for (const k in ALIASES) col[k] = head.findIndex((h) => ALIASES[k].includes(h));
    for (const req of ['symbol', 'closeTime', 'profit']) if (col[req] < 0) errors.push({ line: 1, msg: `Missing required column: ${req}` });
    if (errors.length) return { trades, errors, duplicates: 0 };
    const seen = new Set((existing || []).map((t) => String(t.id)));
    let duplicates = 0;
    rows.slice(1).forEach((r, i) => {
      const line = i + 2; const g = (k) => (col[k] >= 0 ? (r[col[k]] || '').trim() : '');
      const ct = Date.parse(g('closeTime')); const ot = g('openTime') ? Date.parse(g('openTime')) : ct;
      const profit = Number(g('profit'));
      if (!g('symbol')) return errors.push({ line, msg: 'Missing symbol' });
      if (Number.isNaN(ct)) return errors.push({ line, msg: `Unreadable close time "${g('closeTime')}"` });
      if (Number.isNaN(profit)) return errors.push({ line, msg: `Profit is not a number: "${g('profit')}"` });
      const id = g('id') || `${g('symbol')}-${ct}-${profit}`;
      if (seen.has(String(id))) { duplicates++; return; }
      seen.add(String(id));
      trades.push({ id, symbol: g('symbol').toUpperCase(), side: /sell|short/i.test(g('side')) ? 'sell' : 'buy', lots: Number(g('lots')) || null, openTime: Number.isNaN(ot) ? ct : ot, closeTime: ct, entry: Number(g('entry')) || null, exit: Number(g('exit')) || null, profit, commission: Number(g('commission')) || 0, swap: Number(g('swap')) || 0, source: 'csv' });
    });
    return { trades, errors, duplicates };
  }

  const PR = { D, INSTRUMENTS, quoteToAccount, positionSize, firmDayKey, ruleValues, verification, accountState, dailyLoss, maxDrawdown, consistency, tradingDays, payout, plan, PROFILES, playbook, preTrade, parseCSV, importTrades };
  if (typeof module !== 'undefined' && module.exports) module.exports = PR; else root.PR = PR;
})(typeof window !== 'undefined' ? window : globalThis);
