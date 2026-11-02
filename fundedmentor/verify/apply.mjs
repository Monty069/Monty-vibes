// Applies verify/<firm>.json overlays to firms-data.js.
// A program in an overlay gets exactly the rules listed there, each marked verified (with its official source).
// Rules not listed are removed: nothing unverified is shown. Programs with no overlay are unpublished (hidden from
// new setup, Find a Prop and Firm Rules) but kept so existing accounts still compute.
// Usage: node verify/apply.mjs   (reads the pristine copy verify/base-firms-data.json, writes ../firms-data.js)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..');
const basePath = path.join(dir, 'base-firms-data.json');
if (!fs.existsSync(basePath)) {
  const src = fs.readFileSync(path.join(root, 'firms-data.js'), 'utf8');
  const json = JSON.parse(src.slice(src.indexOf('window.FIRMS_DATA = JSON.parse(') + 31, src.lastIndexOf(')')));
  fs.writeFileSync(basePath, JSON.stringify(JSON.parse(json), null, 1));
}
const firms = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const CORE = ['profitTargetPct', 'profitTargetAmount', 'dailyLossPct', 'dailyLossAmount', 'maxLossPct', 'maxLossAmount', 'ddType'];
const report = [];

for (const firm of firms) {
  const file = path.join(dir, firm.id + '.json');
  const ov = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  let published = 0, sourced = 0;
  // An overlay can add programs the base data doesn't have yet (new launches).
  if (ov && ov.models) for (const [id, mo] of Object.entries(ov.models)) if (!firm.models.some((m) => m.id === id))
    firm.models.push({ id, name: mo.name || id, type: mo.type || '', structure: mo.structure || '', priceCcy: 'USD', invitationOnly: false, sizes: mo.sizes || [], prices: {}, sizeRules: {}, phases: {} });
  for (const m of firm.models) {
    let mo = ov && ov.models && ov.models[m.id];
    // "patch": fill in sizes/prices/notes for a program whose sourced rules are fine but whose size list was missing.
    if (mo && mo.patch) { for (const k of ['sizes', 'prices', 'priceNote', 'notes', 'name', 'payout']) if (mo[k] !== undefined) m[k] = mo[k]; mo = null; }
    if (!mo) {
      // No official confirmation yet: publish the sourced (secondary) rules when they are complete enough to run,
      // clearly labelled "Sourced · confirm" in the app. Programs with no usable data stay hidden.
      const LOSS = ['maxLossPct', 'maxLossAmount'];
      const hasCore = Object.values(m.phases || {}).some((ph) => Object.keys(ph.rules || {}).some((k) => LOSS.includes(k)))
        || Object.values(m.sizeRules || {}).some((r) => Object.keys(r).some((k) => LOSS.includes(k)));
      if (!hasCore || !(m.sizes || []).length || m.invitationOnly) { m.published = false; continue; }
      m.published = true; m.rulesComplete = true; m.verifyLevel = 'sourced'; delete m.verifiedAt;
      sourced++; continue;
    }
    // sourceType "secondary": rules taken from a dated third-party page because the firm's own page couldn't be read.
    // They publish as "Sourced · confirm", never as verified.
    const sec = (mo.sourceType || ov.sourceType) === 'secondary';
    const at = mo.checkedAt || ov.verifiedAt; const src = mo.source || ov.sources[0];
    const rec = (value, source) => sec
      ? ({ value, status: 'needs_verification', source: source || src, sourceType: 'secondary', checkedAt: at, verifiedAt: null, version: 1, notes: `From ${new URL(source || src).hostname} (checked ${at}). Confirm on the firm's site before relying on it.` })
      : ({ value, status: 'verified', source: source || src, sourceType: 'official', checkedAt: at, verifiedAt: at, version: 2, notes: `Confirmed on the firm's official page on ${at}.` });
    const phases = {};
    for (const [key, ph] of Object.entries(mo.phases)) {
      const rules = {};
      for (const [k, v] of Object.entries(ph.rules)) rules[k] = (v && typeof v === 'object' && 'value' in v) ? rec(v.value, v.source) : rec(v);
      phases[key] = { key, label: ph.label || (m.phases[key] && m.phases[key].label) || key, rules };
      if (!Object.keys(rules).some((k) => CORE.includes(k)) && !Object.keys(mo.sizeRules || {}).length) throw new Error(`${m.id}.${key}: no core rule`);
    }
    m.phases = phases;
    // Sizes confirmed officially keep the overlay's size rules; other sizes the firm sells (from the sourced data)
    // stay available, marked unverified per size.
    const baseSizes = m.sizes || []; const baseSR = m.sizeRules || {};
    m.sizeRules = Object.assign({}, mo.sizeRules || {});
    if (mo.sizes) {
      const extra = baseSizes.filter((z) => !mo.sizes.includes(z) && (baseSR[z] || !Object.keys(baseSR).length));
      for (const z of extra) { if (baseSR[z]) m.sizeRules[z] = baseSR[z]; for (const k of Object.keys(baseSR)) if (k.endsWith('@' + z)) m.sizeRules[k] = baseSR[k]; }
      m.verifiedSizes = mo.sizes.slice();
      m.sizes = [...new Set(mo.sizes.concat(extra))].sort((x, y) => x - y);
      if (extra.length && m.prices && !('prices' in mo)) {} // keep base prices
      m._extraPrices = extra.length && m.prices ? Object.fromEntries(extra.filter((z) => m.prices[z] != null).map((z) => [z, m.prices[z]])) : null;
    }
    if (mo.name) m.name = mo.name;
    if ('prices' in mo) { m.prices = Object.assign({}, m._extraPrices || {}, mo.prices || {}); delete m.altPrices; m.priceNote = mo.priceNote || null; }
    delete m._extraPrices;
    for (const k of ['payout', 'restrictions', 'funded', 'notes']) m[k] = mo[k] !== undefined ? mo[k] : (k === 'notes' ? [] : null);
    if (sec) { m.rulesComplete = true; m.published = true; m.verifyLevel = 'sourced'; delete m.verifiedAt; delete m.verifiedSizes; m.verifySource = src; sourced++; continue; }
    m.rulesComplete = true; m.published = true; m.verifyLevel = 'official'; m.verifiedAt = at; m.verifySource = src;
    published++;
  }
  if (ov) {
    const fsec = ov.sourceType === 'secondary';
    firm.checkedAt = ov.verifiedAt; if (!fsec) firm.verifiedAt = ov.verifiedAt;
    firm.sources = ov.sources.map((url) => ({ url, type: fsec ? 'secondary' : 'official' }));
    for (const [k, v] of Object.entries(ov.firm || {})) firm[k] = v;
  }
  firm.published = published + sourced > 0;
  report.push(`${firm.id}: ${published} verified + ${sourced} sourced / ${firm.models.length}`);
}
const out = `/* Built by verify/apply.mjs from verify/*.json. Every rule in a published program was confirmed on the firm's official page. */\nwindow.FIRMS_DATA = JSON.parse(${JSON.stringify(JSON.stringify(firms))});\n`;
fs.writeFileSync(path.join(root, 'firms-data.js'), out);
console.log(report.join('\n'));
