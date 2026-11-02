// Builds crawlable SEO pages from firms-data.js: /prop-firms (all firms) and /prop-firms/<firm> (every program and size).
// Every number shown comes from the same data the app uses, with its source link and verified / sourced label.
// Usage: node seo/build.mjs   (run after verify/apply.mjs). Writes prop-firms/*.html and sitemap.xml.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://fundedmentor.com';
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'firms-data.js'), 'utf8'), ctx);
const FIRMS = ctx.window.FIRMS_DATA.filter((f) => f.published && f.id !== 'custom' && f.id !== 'personal');
const YEAR = 2026; const TODAY = new Date().toISOString().slice(0, 10);
const PARTNERS = {
  wemastertrade: { url: 'https://my.wemastertrade.com/register?ref=390283', code: 'FUNDEDMENTOR', deal: '35% off' },
  fundingpips: { url: 'https://app.fundingpips.com/register?referral_code=51LM3ZBC', code: '51LM3ZBC', deal: null },
  topstep: { url: 'https://topstep.com', code: 'TS-7AUMKSO2JXGXT', deal: '15% off' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const val = (r) => (r && typeof r === 'object' && 'value' in r ? r.value : r);
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const kSize = (z) => (z >= 1e6 ? '$' + (z / 1e6) + 'M' : z < 1000 ? '$' + z : '$' + (z / 1000) + 'K');
const range = (a, b) => (a === b ? kSize(a) : kSize(a) + '–' + kSize(b));
const DD = { static: 'Static', trailing_intraday: 'Trailing (intraday)', trailing_eod: 'Trailing (end of day)', trailing_balance: 'Trailing (balance)' };
const pubModels = (f) => f.models.filter((m) => m.published !== false && m.sizes && m.sizes.length);

// One phase's rules at one size: % rules turned into dollars, size-specific dollar rules layered on top.
function rulesAt(m, phaseKey, size) {
  const r = {}; for (const [k, v] of Object.entries((m.phases[phaseKey] || {}).rules || {})) r[k] = val(v);
  Object.assign(r, (m.sizeRules || {})[size] || {}, (m.sizeRules || {})[phaseKey + '@' + size] || {});
  const amt = (pk, ak) => (r[ak] != null ? r[ak] : r[pk] != null ? r[pk] / 100 * size : null);
  return { target: phaseKey === 'funded' ? null : amt('profitTargetPct', 'profitTargetAmount'), daily: amt('dailyLossPct', 'dailyLossAmount'), max: amt('maxLossPct', 'maxLossAmount'), dd: DD[r.ddType] || null, minDays: r.minTradingDays ?? null, cons: r.consistencyPct ?? null, lots: r.maxLots ?? null, split: r.profitSplitPct ?? null };
}
const phaseKeys = (m) => Object.keys(m.phases).filter((k) => k !== 'funded');
const sourceOf = (m) => { for (const ph of Object.values(m.phases)) for (const r of Object.values(ph.rules || {})) if (r && r.source) return { url: r.source, at: r.checkedAt || r.verifiedAt }; return { url: m.verifySource || null, at: m.verifiedAt }; };
const isVer = (m, z) => m.verifyLevel === 'official' && (!m.verifiedSizes || m.verifiedSizes.includes(z));

const CSS = `:root{color-scheme:dark;--bg:#0B0A09;--s:#141311;--s2:#1A1916;--line:rgba(255,255,255,.08);--fg:#EFEBE2;--mu:#8C877B;--ac:#DCBE7D;--pos:#8FCBA8;--warn:#E0AE62}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(110% 40% at 50% -8%,#221B11 0,rgba(34,27,17,0) 60%),var(--bg);color:var(--fg);font:400 16px/1.6 "Geist",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1040px;margin:0 auto;padding:28px 16px 80px}a{color:var(--ac)}h1{font-weight:500;font-size:clamp(28px,5vw,40px);line-height:1.15;letter-spacing:-.03em;margin:28px 0 10px}
h2{font-weight:500;font-size:22px;letter-spacing:-.02em;margin:40px 0 8px}h3{font-size:16px;margin:0}.mu{color:var(--mu)}.top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--fg);font-weight:500}.mk{width:32px;height:30px;background:url(/brand/logo-mark.png) center/contain no-repeat}.wm span{color:var(--ac)}
.btn{display:inline-block;padding:10px 16px;border-radius:12px;background:linear-gradient(180deg,#FBF3DE,#E2C890 55%,#B39255);color:#241A08;font-weight:600;text-decoration:none}
.card{background:var(--s);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0}.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}th,td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}th{color:var(--mu);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.chip{display:inline-block;font-size:12px;padding:2px 9px;border-radius:99px;border:1px solid var(--line);margin-left:6px;vertical-align:middle}.ok{color:var(--pos);border-color:rgba(143,203,168,.35)}.wa{color:var(--warn);border-color:rgba(224,174,98,.35)}
.deal{border-color:rgba(220,190,125,.4);background:rgba(220,190,125,.08)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}.grid a{text-decoration:none;color:var(--fg)}
.crumb{font-size:13px;color:var(--mu);margin-top:18px}.crumb a{color:var(--mu)}details{border-bottom:1px solid var(--line);padding:12px 0}summary{cursor:pointer;font-weight:500}ul{padding-left:20px}footer{margin-top:56px;color:var(--mu);font-size:13px}`;

function page({ title, desc, canon, body, ld }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canon}">
<meta property="og:type" content="website"><meta property="og:site_name" content="FundedMentor"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}"><meta property="og:image" content="${SITE}/brand/og-image.jpg"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png"><link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap">
<style>${CSS}</style>${ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('')}</head><body><main>
<div class="top"><a class="brand" href="/"><span class="mk" aria-hidden="true"></span><span class="wm">Funded<span>Mentor</span></span></a><a class="btn" href="/">Track your challenge free</a></div>
${body}
<footer><p>FundedMentor is a planning tool for prop firm traders. It is not a prop firm, broker or financial adviser. Rules change often: always confirm on the firm's own site before you buy or trade. “Verified” means we confirmed the rule on the firm's official page on the date shown; “Sourced” means it comes from the dated third-party page linked and still needs confirming.</p>
<p><a href="/prop-firms">All prop firms</a> · <a href="/">FundedMentor app</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p></footer></main></body></html>`;
}

function firmPage(f) {
  const ms = pubModels(f); const p = PARTNERS[f.id];
  const sizes = [...new Set(ms.flatMap((m) => m.sizes))].sort((a, b) => a - b);
  const prices = ms.flatMap((m) => Object.values(m.prices || {}).filter((x) => x > 0)); const from = prices.length ? Math.min(...prices) : null;
  const anyVer = ms.some((m) => m.verifyLevel === 'official');
  const title = `${f.name} Rules ${YEAR}: Account Sizes, Profit Targets & Drawdown | FundedMentor`;
  const desc = `${f.name} prop firm rules for ${YEAR}: ${ms.length} program${ms.length === 1 ? '' : 's'} (${ms.map((m) => m.name).slice(0, 4).join(', ')}${ms.length > 4 ? '…' : ''}), account sizes ${range(sizes[0], sizes[sizes.length - 1])}${from ? ', from ' + money(from) : ''}. Profit targets, daily loss and max drawdown for every size, with sources.`;
  const faq = [];
  const sections = ms.map((m) => {
    const src = sourceOf(m); const phs = phaseKeys(m);
    const rows = m.sizes.map((z) => {
      const P = phs.map((k) => rulesAt(m, k, z)); const fu = m.phases.funded ? rulesAt(m, 'funded', z) : null; const a = P[0] || fu;
      return `<tr><td><b>${kSize(z)}</b></td><td>${m.prices && m.prices[z] ? money(m.prices[z]) : '—'}</td>${phs.length ? `<td>${P.map((x) => (x.target != null ? money(x.target) : '—')).join(' / ')}</td>` : ''}<td>${a.daily != null ? money(a.daily) : 'None listed'}</td><td>${a.max != null ? money(a.max) : '—'}</td><td>${a.dd || '—'}</td><td>${isVer(m, z) ? '<span class="chip ok">Verified</span>' : '<span class="chip wa">Sourced</span>'}</td></tr>`;
    }).join('');
    const z0 = m.sizes.includes(100000) ? 100000 : m.sizes[Math.floor(m.sizes.length / 2)]; const r0 = (phs[0] && rulesAt(m, phs[0], z0)) || rulesAt(m, 'funded', z0);
    if (r0.target != null) faq.push([`What is the profit target on the ${f.name} ${m.name} ${kSize(z0)} account?`, `${money(r0.target)}${phs.length > 1 ? ' in phase 1' : ''}${r0.max != null ? `, with a ${money(r0.max)} maximum loss (${(r0.dd || 'type not stated').toLowerCase()})` : ''}${r0.daily != null ? ` and a ${money(r0.daily)} daily loss limit` : ''}.`]);
    const one = phs[0] ? rulesAt(m, phs[0], m.sizes[0]) : null; const fu = m.phases.funded ? rulesAt(m, 'funded', m.sizes[0]) : null;
    const facts = [one && one.minDays != null ? `Minimum trading days: ${one.minDays}` : null, (fu && fu.cons) || (one && one.cons) ? `Consistency rule: ${(fu && fu.cons) || one.cons}%` : null, m.payout && m.payout.splitPct ? `Profit split: ${m.payout.splitPct}` : fu && fu.split ? `Profit split: ${fu.split}%` : null].filter(Boolean);
    return `<section class="card" id="${esc(m.id)}"><h3>${esc(m.name)}${m.verifyLevel === 'official' ? (m.verifiedSizes && m.verifiedSizes.length < m.sizes.length ? '<span class="chip ok">Partly verified</span>' : '<span class="chip ok">Verified</span>') : '<span class="chip wa">Sourced · confirm</span>'}</h3>
<p class="mu" style="margin:6px 0 10px">${esc(m.structure || m.type || '')}${phs.length ? ` · ${phs.length} phase${phs.length === 1 ? '' : 's'}` : ' · no evaluation'}</p>
<div class="tw"><table><thead><tr><th>Size</th><th>Price</th>${phs.length ? `<th>Profit target${phs.length > 1 ? 's' : ''}</th>` : ''}<th>Daily loss</th><th>Max loss</th><th>Drawdown</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
${facts.length ? `<ul>${facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${(m.notes || []).length ? `<ul class="mu">${m.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
${m.priceNote ? `<p class="mu" style="font-size:13px">${esc(m.priceNote)}</p>` : ''}${src.url ? `<p class="mu" style="font-size:13px">Source: <a href="${esc(src.url)}" rel="nofollow noopener" target="_blank">${esc(new URL(src.url).hostname)}</a>${src.at ? ', checked ' + esc(src.at) : ''}.</p>` : ''}</section>`;
  }).join('');
  const deal = p ? `<div class="card deal"><b>FundedMentor partner${p.deal ? ' · ' + esc(p.deal) : ''}</b><p style="margin:6px 0 10px">Use code <b>${esc(p.code)}</b> at ${esc(f.name)}.</p><a class="btn" href="${esc(p.url)}" rel="sponsored noopener" target="_blank">Get ${esc(f.name)}${p.deal ? ' ' + esc(p.deal) : ''}</a></div>` : '';
  faq.unshift([`How many account types does ${f.name} offer?`, `${ms.length}: ${ms.map((m) => m.name).join(', ')}. Sizes range from ${kSize(sizes[0])} to ${kSize(sizes[sizes.length - 1])}.`]);
  faq.push([`How do I track my ${f.name} challenge?`, `Add your ${f.name} account to FundedMentor for free. It turns these rules into a daily plan: daily loss left, drawdown left, position size for your next trade and progress to target.`]);
  const body = `<p class="crumb"><a href="/">Home</a> › <a href="/prop-firms">Prop firms</a> › ${esc(f.name)}</p>
<h1>${esc(f.name)} rules ${YEAR}: every account, size and drawdown</h1>
<p class="mu">${esc(f.market || 'Prop firm')} · ${ms.length} program${ms.length === 1 ? '' : 's'} · sizes ${range(sizes[0], sizes[sizes.length - 1])}${from ? ' · from ' + money(from) : ''}. ${anyVer ? 'Rules marked Verified were confirmed on ' + esc(f.name) + '’s own site.' : 'These rules come from dated third-party sources: confirm with the firm before you buy.'}</p>
${deal}<div class="card"><b>Have a ${esc(f.name)} account?</b><p style="margin:6px 0 10px">FundedMentor turns these rules into your daily plan: how much you can lose today, drawdown left, lot size for the next trade and progress to target. Free.</p><a class="btn" href="/">Start tracking free</a></div>
<h2>${esc(f.name)} account types</h2>${sections}
<h2>${esc(f.name)} FAQ</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
<h2>Other prop firms</h2><div class="grid">${FIRMS.filter((x) => x.id !== f.id).slice(0, 12).map((x) => `<a class="card" style="margin:0" href="/prop-firms/${x.id}"><b>${esc(x.name)} rules</b><br><span class="mu" style="font-size:13px">${esc(x.market || '')}</span></a>`).join('')}</div>`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Prop firms', item: SITE + '/prop-firms' }, { '@type': 'ListItem', position: 3, name: f.name, item: `${SITE}/prop-firms/${f.id}` }] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return page({ title, desc, canon: `${SITE}/prop-firms/${f.id}`, body, ld });
}

function indexPage() {
  const rows = FIRMS.map((f) => { const ms = pubModels(f); const sz = ms.flatMap((m) => m.sizes); const pr = ms.flatMap((m) => Object.values(m.prices || {}).filter((x) => x > 0));
    return `<tr><td><a href="/prop-firms/${f.id}"><b>${esc(f.name)}</b></a>${PARTNERS[f.id] && PARTNERS[f.id].deal ? `<span class="chip ok">${esc(PARTNERS[f.id].deal)}</span>` : ''}</td><td>${esc(f.market || '')}</td><td>${ms.length}</td><td>${range(Math.min(...sz), Math.max(...sz))}</td><td>${pr.length ? money(Math.min(...pr)) : '—'}</td><td>${ms.some((m) => m.verifyLevel === 'official') ? '<span class="chip ok">Verified</span>' : '<span class="chip wa">Sourced</span>'}</td></tr>`; }).join('');
  const nP = FIRMS.reduce((n, f) => n + pubModels(f).length, 0);
  const title = `Funded Prop Firms ${YEAR}: Rules for ${FIRMS.length} Prop Firms Compared | FundedMentor`;
  const desc = `Compare ${FIRMS.length} funded prop firms and ${nP} challenge accounts: FTMO, Apex, Topstep, FundedNext, Funding Pips, The5ers and more. Profit targets, daily loss, max drawdown and prices for every account size, with sources.`;
  const body = `<p class="crumb"><a href="/">Home</a> › Prop firms</p><h1>Funded prop firms ${YEAR}: rules for ${FIRMS.length} firms, ${nP} accounts</h1>
<p class="mu">Every forex and futures prop firm FundedMentor covers, with each challenge's account sizes, profit targets, daily loss and max drawdown. Pick a firm for the full rules, sourced and dated.</p>
<div class="card"><div class="tw"><table><thead><tr><th>Prop firm</th><th>Markets</th><th>Accounts</th><th>Sizes</th><th>From</th><th>Rules</th></tr></thead><tbody>${rows}</tbody></table></div></div>
<div class="card"><b>Already funded or in a challenge?</b><p style="margin:6px 0 10px">FundedMentor tracks your prop firm account against these exact rules and tells you what you can risk on the next trade.</p><a class="btn" href="/">Track your challenge free</a></div>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: FIRMS.map((f, i) => ({ '@type': 'ListItem', position: i + 1, name: f.name + ' rules', url: `${SITE}/prop-firms/${f.id}` })) }];
  return page({ title, desc, canon: `${SITE}/prop-firms`, body, ld });
}

const out = path.join(root, 'prop-firms'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
fs.writeFileSync(path.join(root, 'prop-firms.html'), indexPage());
for (const f of FIRMS) fs.writeFileSync(path.join(out, f.id + '.html'), firmPage(f));
const urls = [['/', '1.0', 'weekly'], ['/prop-firms', '0.9', 'weekly'], ...FIRMS.map((f) => ['/prop-firms/' + f.id, '0.8', 'weekly']), ['/privacy', '0.3', 'yearly'], ['/terms', '0.3', 'yearly']];
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, p, c]) => `  <url><loc>${SITE}${u === '/' ? '/' : u}</loc><lastmod>${TODAY}</lastmod><changefreq>${c}</changefreq><priority>${p}</priority></url>`).join('\n')}\n</urlset>\n`);
console.log(`${FIRMS.length} firm pages + index, sitemap with ${urls.length} URLs`);
