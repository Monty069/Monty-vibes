// node verify/dump.mjs <firmId> : compact view of current rules for a firm (from the pristine base)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
let firms; const b = path.join(dir, 'base-firms-data.json');
if (fs.existsSync(b)) firms = JSON.parse(fs.readFileSync(b, 'utf8')); else { const s = fs.readFileSync(path.join(dir, '..', 'firms-data.js'), 'utf8'); firms = JSON.parse(JSON.parse(s.slice(s.indexOf('window.FIRMS_DATA = JSON.parse(') + 31, s.lastIndexOf(')')))); }
for (const id of process.argv.slice(2)) { const f = firms.find((x) => x.id === id);
  console.log(`== ${f.id} site=${f.site} tz=${f.timezone} reset=${f.resetHour} futures=${f.futures}`);
  for (const m of f.models) { console.log(`-- ${m.id} "${m.name}" sizes=${JSON.stringify(m.sizes)} complete=${m.rulesComplete} inv=${m.invitationOnly}`);
    for (const [k, p] of Object.entries(m.phases)) console.log(`   ${k} (${p.label}): ` + Object.entries(p.rules).map(([a, r]) => `${a}=${JSON.stringify(r.value)}`).join(' '));
    if (Object.keys(m.sizeRules || {}).length) console.log('   size: ' + JSON.stringify(m.sizeRules)); } }
