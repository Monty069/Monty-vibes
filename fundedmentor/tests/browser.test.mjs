// Real-browser smoke test (Chromium + iPhone 13 emulation) for a deployed FundedMentor build.
// Not part of 'npm test' (needs a browser). Run against a preview or production URL:
//   npm i --no-save playwright@1.48.2 && npx playwright install --with-deps chromium
//   BASE=https://<deployment> SHARE=<same URL, or a Vercel share link for protected previews> node browser.test.mjs
// Covers: landing, login page + Google script, onboarding wizard, account creation, dashboard,
// live news, position size, pre-trade check, daily plan, trade entry, persistence across reload,
// no paywalls / billing calls, private paths 404, mobile layout (no horizontal scroll).
// Real-browser (Chromium) smoke test of the FundedMentor preview build.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE, SHARE = process.env.SHARE;
let pass = 0, fail = 0; const out = [];
const ok = (c, m) => { if (c) { pass++; out.push('PASS ' + m); } else { fail++; out.push('FAIL ' + m); } };
const shots = '/vercel/bt/shots'; fs.mkdirSync(shots, { recursive: true });

async function session(name, ctxOpts) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [], fnCalls = [], failed = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('request', (r) => { if (/functions\/v1\//.test(r.url())) fnCalls.push(r.method() + ' ' + r.url()); });
  const bad = []; page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().split('?')[0]); });
  page.on('requestfailed', (r) => failed.push(r.url() + ' ' + (r.failure() || {}).errorText));
  await page.goto(SHARE, { waitUntil: 'networkidle' }); // sets the preview-access cookie
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  return { browser, ctx, page, errs, fnCalls, failed, bad, shot: (n) => page.screenshot({ path: `${shots}/${name}-${n}.png`, fullPage: false }) };
}
const click = (page, sel) => page.locator(sel).first().click({ timeout: 8000 }).catch((e) => { out.push('STEP-ERR click ' + sel + ': ' + String(e).split('\n')[0]); });
const fill = (page, sel, v) => page.locator(sel).first().fill(v, { timeout: 8000 }).catch((e) => { out.push('STEP-ERR fill ' + sel + ': ' + String(e).split('\n')[0]); });
const text = (page) => page.locator('#root').innerText();
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

// ---------------- Desktop ----------------
try {
  const S = await session('desktop', { viewport: { width: 1280, height: 860 } }); const p = S.page;
  ok(/FundedMentor/.test(await p.title()) || /FundedMentor/.test(await text(p)), 'landing loads');
  const proBtn = p.locator('button', { hasText: 'Pro — Coming Soon' });
  ok(await proBtn.count() > 0 && await proBtn.first().isDisabled(), 'landing: Pro — Coming Soon button is disabled');
  ok(!(await p.locator('button', { hasText: /^Go Pro$/ }).count()), 'landing: no Go Pro button');
  await S.shot('1-landing');
  // Sign-in page (Google): renders; real Google account login is not automatable
  await click(p, '[data-act="to-auth"]'); await p.waitForTimeout(1500);
  const authTxt = await text(p);
  ok(/Sign in/.test(authTxt) && /Explore the demo/.test(authTxt), 'signup/login page renders (Google + demo entry)');
  const gisLoaded = await p.evaluate(() => !!(window.google && google.accounts && google.accounts.id));
  ok(gisLoaded, 'Google Identity Services script loaded on the login page');
  await S.shot('2-auth');
  // Demo -> onboarding wizard -> create a real (local) account
  await click(p, 'button:has-text("Explore the demo")'); await p.waitForTimeout(800);
  ok(/Equity/i.test(await text(p)), 'demo dashboard renders');
  if (await p.locator('[data-act="clear-examples"]').count()) { await click(p, '[data-act="clear-examples"]'); await p.waitForTimeout(400); }
  await click(p, '[data-act="wizard"]'); await p.waitForTimeout(400);
  const step = async () => (await p.locator('.sheet h2').first().innerText().catch(() => ''));
  if (await p.locator('#w-name').count()) { await fill(p, '#w-name', 'Beta Tester'); await fill(p, '#w-email', 'beta@example.com'); await click(p, '[data-act="w-next"]'); }
  await fill(p, '#w-q', 'FTMO'); await click(p, '[data-act="w-firm"][data-id="ftmo"]'); await click(p, '[data-act="w-next"]');
  await click(p, '[data-act="w-model"]:not([disabled])'); await p.waitForTimeout(200);
  if (await p.locator('[data-act="w-size"]').count()) await click(p, '[data-act="w-size"]');
  await click(p, '[data-act="w-next"]');
  out.push('INFO wizard step now: ' + (await step()));
  ok(/trading this account for/i.test(await step()), 'onboarding: goal step reached');
  ok(await p.locator('[data-act="leg"][aria-pressed="true"]').count() > 0, 'onboarding: a market is pre-selected on the goal step');
  if (!(await p.locator('[data-act="leg"][aria-pressed="true"]').count())) await click(p, '[data-act="leg"][data-v="XAUUSD"]');
  await p.waitForTimeout(200);
  await click(p, '[data-act="w-next"]');
  if (await p.locator('#w-aname').count()) { await fill(p, '#w-aname', 'My FTMO 100K'); }
  await click(p, '[data-act="w-next"]'); // config -> import
  await click(p, '[data-act="w-next"]'); // import (skip) -> plan
  ok(/Your plan/.test(await step()), 'onboarding: plan step shows the challenge plan');
  await S.shot('3-wizard-plan');
  await click(p, '[data-act="w-finish"]'); await p.waitForTimeout(800);
  let t = await text(p);
  ok(/My FTMO 100K/.test(t) && /Equity/i.test(t), 'account created and dashboard shows it');
  ok(/Manual data/.test(t), 'dashboard labels numbers as manual data');
  ok(!/News guard is off/.test(t) && !/isn’t available/.test(t), 'news: live calendar loaded from Supabase (guard on)');
  await S.shot('4-dashboard');
  // Calculations: position size
  await click(p, '[data-act="go"][data-v="calc"]'); await p.waitForTimeout(500);
  t = await text(p); ok(/Position Size Calculator/.test(t) && /lots|contracts/.test(t), 'position size calculator renders a size');
  await S.shot('5-calc');
  // Pre-trade check
  await click(p, '[data-act="go"][data-v="check"]'); await p.waitForTimeout(500);
  t = await text(p); ok(/Can I take this trade\?/.test(t) && /Result/i.test(t), 'pre-trade check renders a result');
  // Daily plan + next trade
  await click(p, '[data-act="go"][data-v="plan"]'); await p.waitForTimeout(400);
  ok(/Daily Plan/.test(await text(p)) && /Risk per trade/i.test(await text(p)), 'daily plan renders');
  // Record a trade
  await click(p, '[data-act="go"][data-v="trades"]'); await p.waitForTimeout(400);
  await fill(p, '#t-lots', '1'); await fill(p, '#t-profit', '650'); await p.locator('#t-profit').blur();
  await click(p, '[data-act="add-trade"]'); await p.waitForTimeout(500);
  const tradesBefore = await p.evaluate(() => JSON.parse(localStorage.getItem('passrate.v1')).accounts.find((a) => a.name === 'My FTMO 100K').trades.length);
  ok(/\+\$643\.00/.test(await text(p)) && tradesBefore === 1, 'trade recorded: net +$643.00 ($650 − $7 commission)');
  // Persistence: full reload keeps account + trade
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await click(p, '[data-act="go"][data-v="trades"]').catch(() => {}); await p.waitForTimeout(400);
  t = await text(p);
  const tradesAfter = await p.evaluate(() => JSON.parse(localStorage.getItem('passrate.v1')).accounts.find((a) => a.name === 'My FTMO 100K').trades.length);
  ok(/My FTMO 100K/.test(t) && /\+\$643\.00/.test(t) && tradesAfter === 1, 'account and trade persist across a full page reload');
  // Pro surfaces inside the app
  await click(p, '[data-act="go"][data-v="settings"]'); await p.waitForTimeout(400);
  t = await text(p); ok(!/Go Pro|Manage billing|Pay by card|Pay with crypto/.test(t), 'settings: no purchase or billing buttons');
  ok(/Coming soon/i.test(t), 'settings: MT5 sync shown as Coming soon');
  await click(p, '[data-act="wizard"]'); await p.waitForTimeout(400);
  ok(/Set up an account/.test(await text(p)) && !/Go Pro/.test(await text(p)), 'second account: no paywall');
  await click(p, '[data-act="w-close"]');
  ok(S.fnCalls.length === 0, 'no edge-function (billing/checkout/mt5) requests made: ' + S.fnCalls.join(', '));
  out.push('INFO desktop 4xx responses: ' + (S.bad.join(', ') || 'none'));
  const previewOnly = (e) => /GSI_LOGGER.*origin is not allowed/.test(e) || (/status of 403/.test(e) && S.bad.every((b) => /accounts\.google\.com/.test(b)));
  ok(S.errs.filter((e) => !previewOnly(e)).length === 0, 'desktop: no page or console errors (Google origin warning on preview URL excluded): ' + S.errs.slice(0, 3).join(' | '));
  // Private paths
  for (const path of ['/supabase/functions/stripe-webhook/index.ts', '/supabase/migrations/20261022210000_split_entitlements.sql', '/tests/smoke.test.js', '/ROLLBACK.md']) {
    const r = await p.request.get(BASE + path); ok(r.status() === 404, `not served: ${path} (${r.status()})`);
  }
  await S.browser.close();
} catch (e) { out.push('ABORT desktop: ' + String(e).split('\n')[0]); fail++; }

// ---------------- Mobile (iPhone 13) ----------------
try {
  const S = await session('mobile', { ...devices['iPhone 13'] }); const p = S.page;
  ok(await noHScroll(p), 'mobile landing: no horizontal scroll');
  await S.shot('1-landing');
  await click(p, '[data-act="demo"]'); await p.waitForTimeout(800);
  ok(await p.locator('.tabbar').isVisible(), 'mobile: bottom tab bar visible');
  ok(await noHScroll(p), 'mobile dashboard: no horizontal scroll');
  await S.shot('2-dashboard');
  await click(p, '.tabbar [data-v="calc"]'); await p.waitForTimeout(400);
  ok(/Position Size/.test(await text(p)) && await noHScroll(p), 'mobile calculator: renders without horizontal scroll');
  await S.shot('3-calc');
  await click(p, '.tabbar [data-v="check"]'); await p.waitForTimeout(400);
  ok(await noHScroll(p), 'mobile pre-trade check: no horizontal scroll');
  await click(p, '[data-act="next-open"]').catch(() => {}); await click(p, '.tabbar [data-v="overview"]').catch(() => {});
  await p.waitForTimeout(300); await click(p, '[data-act="next-open"]'); await p.waitForTimeout(400);
  ok(/Your next trade/.test(await text(p).catch(() => '')) || /Your next trade/.test(await p.content()), 'mobile: next-trade sheet opens');
  await S.shot('4-next-trade');
  ok(S.errs.length === 0, 'mobile: no page or console errors: ' + S.errs.slice(0, 3).join(' | '));
  ok(S.fnCalls.length === 0, 'mobile: no edge-function requests');
  await S.browser.close();
} catch (e) { out.push('ABORT mobile: ' + String(e).split('\n')[0]); fail++; }
console.log(out.join('\n')); console.log(`\n${pass} passed, ${fail} failed`);
