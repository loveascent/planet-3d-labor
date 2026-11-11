// node test/shoot.js plan.json
const { chromium } = require('playwright');
(async () => {
  const plan = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=native', '--ignore-gpu-blocklist', '--use-angle=vulkan'], env: { ...process.env, VK_ICD_FILENAMES: '/usr/share/vulkan/icd.d/lvp_icd.json' } });
  const pg = await b.newPage({ viewport: { width: plan.w || 900, height: plan.h || 600 } });
  const logs = []; const seen = new Set();
  pg.on('console', m => { const t = m.text(); const k = t.slice(0, 90); if (seen.has(k)) return; seen.add(k); if (logs.length < 40) logs.push(m.type() + ': ' + t.slice(0, m.type() === 'error' ? 3000 : 500)); });
  pg.on('pageerror', e => logs.push('PAGEERR: ' + String(e).slice(0, 800)));
  const t0 = Date.now();
  await pg.goto('http://localhost:8772/index.html' + (plan.q || ''));
  try { await pg.waitForFunction(() => window.__L && window.__L.ready, null, { timeout: plan.timeout || 120000 }); } catch (e) { logs.push('TIMEOUT ready'); }
  console.log('ready', (Date.now() - t0) / 1000);
  for (const s of plan.steps || []) {
    const t1 = Date.now();
    if (s.eval) { try { const r = await pg.evaluate(s.eval); if (r !== undefined) console.log('eval:', String(JSON.stringify(r)).slice(0, 600), ((Date.now() - t1) / 1000).toFixed(1) + 's'); } catch (e) { console.log('evalerr', String(e).slice(0, 500)); } }
    if (s.shot) { try { const d = await pg.evaluate(() => window.__L.cap()); require('fs').writeFileSync(s.shot, Buffer.from(d.split(',')[1], 'base64')); console.log('shot', s.shot); } catch (e) { console.log('shoterr', String(e).slice(0, 300)); } }
    if (s.pshot) { await pg.screenshot({ path: s.pshot }); }
  }
  console.log(logs.join('\n'));
  await b.close();
})();
