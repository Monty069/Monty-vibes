/* Firm rule library. FIRMS_DATA comes from firms-data.js (built from research/). The custom template is defined here.
 * IMPORTANT: every seeded firm value is marked `needs_verification`. They were seeded from commonly published
 * figures and must be confirmed against the firm's official rules page before being marked Verified. */
(function (root) {
  'use strict';
  const NOTE = 'Seeded sample value. Confirm on the firm’s official rules page, then mark Verified.';
  function R(value, src, extra) {
    return Object.assign({ value, status: 'needs_verification', source: src, verifiedAt: null, effective: null, version: 1, notes: NOTE }, extra || {});
  }
  function U(value, extra) { return Object.assign({ value, status: 'user_configured', source: null, verifiedAt: null, effective: null, version: 1, notes: 'Template value you control.' }, extra || {}); }
  function phases(src, mk, common, list) {
    const out = {};
    for (const [key, label, specific] of list) {
      const rules = {};
      for (const k in common) rules[k] = mk(common[k], src);
      for (const k in specific) rules[k] = mk(specific[k], src);
      out[key] = { key, label, rules };
    }
    return out;
  }

  const RULE_META = {
    profitTargetPct: { label: 'Profit target', unit: '%', group: 'Targets' },
    minTradingDays: { label: 'Minimum trading days', unit: 'days', group: 'Targets' },
    maxTradingDays: { label: 'Maximum trading days', unit: 'days', group: 'Targets' },
    dailyLossPct: { label: 'Daily loss limit', unit: '%', group: 'Daily loss' },
    dailyLossBasis: { label: 'Daily limit measured on', unit: 'enum', options: { initial: 'Initial balance', day_start: 'Day-start reference' }, group: 'Daily loss' },
    dailyLossReference: { label: 'Daily floor reference', unit: 'enum', options: { day_start_balance: 'Day-start balance', day_start_equity: 'Day-start equity', day_start_higher: 'Higher of balance/equity at day start' }, group: 'Daily loss' },
    dailyLossIncludesUnrealized: { label: 'Counts floating P&L', unit: 'bool', group: 'Daily loss' },
    maxLossPct: { label: 'Maximum loss', unit: '%', group: 'Drawdown' },
    ddType: { label: 'Drawdown type', unit: 'enum', options: { static: 'Static', trailing_balance: 'Trailing (closed balance)', trailing_eod: 'Trailing (end of day)', trailing_intraday: 'Trailing (intraday equity)' }, group: 'Drawdown' },
    ddBasis: { label: 'Drawdown measured on', unit: 'enum', options: { equity: 'Equity', balance: 'Balance' }, group: 'Drawdown' },
    ddLockPct: { label: 'Trailing stops at (% above start)', unit: '%', group: 'Drawdown' },
    consistencyPct: { label: 'Best day max share', unit: '%', group: 'Consistency' },
    consistencyDenominator: { label: 'Share measured against', unit: 'enum', options: { total_profit: 'Total net profit', positive_days: 'Sum of profitable days' }, group: 'Consistency' },
    profitableDayMinPct: { label: 'Profitable day threshold', unit: '% of start', group: 'Consistency' },
    newsRestricted: { label: 'News trading restricted', unit: 'bool', group: 'Restrictions' },
    weekendHolding: { label: 'Weekend holding allowed', unit: 'bool', group: 'Restrictions' },
    maxLots: { label: 'Max position size', unit: 'lots', group: 'Restrictions' },
    profitSplitPct: { label: 'Profit split', unit: '%', group: 'Payout' },
    payoutWaitDays: { label: 'First payout wait', unit: 'days', group: 'Payout' },
    payoutMinProfitableDays: { label: 'Profitable days for payout', unit: 'days', group: 'Payout' },
    payoutMinAmount: { label: 'Minimum payout', unit: '$', group: 'Payout' },
    payoutMaxAmount: { label: 'Payout cap', unit: '$', group: 'Payout' },
    profitTargetAmount: { label: 'Profit target ($)', unit: '$', group: 'Targets' },
    maxLossAmount: { label: 'Maximum loss ($)', unit: '$', group: 'Drawdown' },
    dailyLossAmount: { label: 'Daily loss limit ($)', unit: '$', group: 'Daily loss' },
    ddLockAmount: { label: 'Trailing stops at (start + $)', unit: '$', group: 'Drawdown' },
  };

  const CUSTOM = [
    {
      id: 'custom', name: 'Custom firm', market: 'Any', site: null, timezone: 'America/New_York', resetHour: 17, custom: true,
      models: [{
        id: 'custom-1step', name: '1-Step · trailing EOD · 40% consistency', structure: 'One-step evaluation (template)', sizes: [25000, 50000, 100000, 150000], version: 1,
        phases: phases(null, U,
          { dailyLossPct: 3, dailyLossBasis: 'initial', dailyLossReference: 'day_start_balance', dailyLossIncludesUnrealized: true, maxLossPct: 6, ddType: 'trailing_eod', ddBasis: 'equity', ddLockPct: 0, consistencyPct: 40, consistencyDenominator: 'total_profit', profitableDayMinPct: 0.2 },
          [['phase1', 'Evaluation', { profitTargetPct: 10, minTradingDays: 3 }], ['funded', 'Funded', { profitSplitPct: 90, payoutWaitDays: 7, payoutMinProfitableDays: 5, payoutMinAmount: 100 }]]),
      }],
    },
  ];
  CUSTOM[0].checkedAt = null; CUSTOM[0].models.forEach((m) => { m.prices = {}; m.sizeRules = {}; m.rulesComplete = true; m.type = '1-step'; });
  const FIRMS = (root.FIRMS_DATA || []).concat(CUSTOM);
  root.FIRMS = FIRMS; root.RULE_META = RULE_META;
})(typeof window !== 'undefined' ? window : globalThis);
