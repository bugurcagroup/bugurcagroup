'use strict';
// Slide top: double-click this file (node push-son.cjs) from the app root.
// It simply runs: git push origin main  (normal Windows GCM prompts you once).
const { spawnSync } = require('child_process');
const fsXQ = require('fs');
const appXs = [];
(function dfsX(dirX, depX) {
  let esX; try { esX = fsXQ.readdirSync(dirX, { withFileTypes: true }); } catch (eX) { return; }
  for (const enX of esX) {
    if (enX.isDirectory()) {
      if (enX.name === 'node_modules' || enX.name === '.git' || enX.name === 'dist') continue;
      if (depX < 5) dfsX(dirX + '/' + enX.name, depX + 1);
    } else if (enX.isFile() && enX.name === 'App.tsx') {
      const pX = (dirX + '/' + enX.name).replace(/\\/g, '/');
      if (pX.indexOf('/src/App.tsx') !== -1) appXs.push(pX);
    }
  }
})('C:/Users/acer/Desktop', 0);
if (appXs.length === 0) { console.error('NO APP'); process.exit(5); }
const rootX = appXs[appXs.length - 1].slice(0, appXs[appXs.length - 1].indexOf('/src/App.tsx'));
console.log('ROOT:', rootX);
const rp = (a, tmo) => {
  const rr = spawnSync('git.exe', a, { cwd: rootX, encoding: 'utf8', shell: false, timeout: tmo || 480000, maxBuffer: 3e7 });
  if (rr.error) return 'SP:' + rr.error.message;
  const so = (rr.stdout || '').trim(); const se = (rr.stderr || '').trim();
  if (rr.status !== 0) return 'RC' + rr.status + ':\n' + so.slice(0, 2000) + (se ? '\n-E-' + se.slice(0, 1200) : '');
  return so.slice(0, 3000) + (se ? '\n-N-' + se.slice(0, 900) : '');
};
console.log('=== STATUS ===');
console.log(rp(['status', '--short'], 60000));
console.log('=== UNSTAGED KUNYE OK CHECK ===');
const c8x = fsXQ.readFileSync(rootX + '/src/App.tsx', 'utf8');
console.log('KUNYE<IRKET>:', c8x.indexOf('\u015Eirket \u00DCnvan\u0131') !== -1);
console.log('KUNYE<MERSIS>:', c8x.indexOf('MERS\u0130S / Ticaret Sicil No') !== -1);
console.log('KUNYE<ADRES>:', c8x.indexOf('\u015EANLIURFA') !== -1);
console.log('=== PUSH ===');
console.log(rp(['push', 'origin', 'main'], 780000));
console.log('=== DONE ===');
process.exit(0);
