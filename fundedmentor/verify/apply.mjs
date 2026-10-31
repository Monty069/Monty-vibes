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
  let published = 0;
  for (const m of firm.models) {
    const mo = ov && ov.models && ov.models[m.id];
    if (!mo) { m.published = false; continue; }
    const at = ov.verifiedAt; const src = mo.source || ov.sources[0];
    const rec = (value, source) => ({ value, status: 'verified', source: source || src, sourceType: 'official', checkedAt: at, verifiedAt: at, version: 2, notes: `Confirmed on the firm's official page on ${at}.` });
    const phases = {};
    for (const [key, ph] of Object.entries(mo.phases)) {
      const rules = {};
      for (const [k, v] of Object.entries(ph.rules)) rules[k] = (v && typeof v === 'object' && 'value' in v) ? rec(v.value, v.source) : rec(v);
      phases[key] = { key, label: ph.label || (m.phases[key] && m.phases[key].label) || key, rules };
      if (!Object.keys(rules).some((k) => CORE.includes(k)) && !Object.keys(mo.sizeRules || {}).length) throw new Error(`${m.id}.${key}: no core rule`);
    }
    m.phases = phases;
    m.sizeRules = mo.sizeRules || {};
    if (mo.sizes) m.sizes = mo.sizes;
    if (mo.name) m.name = mo.name;
    if ('prices' in mo) { m.prices = mo.prices || {}; delete m.altPrices; m.priceNote = mo.priceNote || null; }
    for (const k of ['payout', 'restrictions', 'funded', 'notes']) m[k] = mo[k] !== undefined ? mo[k] : (k === 'notes' ? [] : null);
    m.rulesComplete = true; m.published = true; m.verifiedAt = at; m.verifySource = src;
    published++;
  }
  if (ov) {
    firm.checkedAt = ov.verifiedAt; firm.verifiedAt = ov.verifiedAt;
    firm.sources = ov.sources.map((url) => ({ url, type: 'official' }));
    for (const [k, v] of Object.entries(ov.firm || {})) firm[k] = v;
  }
  firm.published = published > 0;
  report.push(`${firm.id}: ${published}/${firm.models.length} programs verified`);
}
const out = `/* Built by verify/apply.mjs from verify/*.json. Every rule in a published program was confirmed on the firm's official page. */\nwindow.FIRMS_DATA = JSON.parse(${JSON.stringify(JSON.stringify(firms))});\n`;
fs.writeFileSync(path.join(root, 'firms-data.js'), out);
console.log(report.join('\n'));
