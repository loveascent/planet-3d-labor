// node test/sheetm.js prefix frames scene [tier] [w]  → je Zeitpunkt 3 Bilder (M1/M2/M3) aus DERSELBEN Physik
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [pre, fr, sc, tier = 'potato', W = '420', ms = '1,2,3', extra = ''] = process.argv.slice(2);
  const METH = ms.split(',').map(Number);
  const frames = fr.split(',').map(Number);
  const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=native', '--ignore-gpu-blocklist', '--use-angle=vulkan'], env: { ...process.env, VK_ICD_FILENAMES: '/usr/share/vulkan/icd.d/lvp_icd.json' } });
  const pg = await b.newPage({ viewport: { width: +W, height: +W } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 400)); }); pg.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await pg.goto(`file:///home/claude/orb/index.html?test&tier=${tier}&scene=${sc}&rs=.6${extra}`,{waitUntil:'domcontentloaded'});
  await pg.waitForFunction(() => window.__L && window.__L.ready, null, { timeout: 120000 });
  const res = {}; for (const m of METH) res['m' + m] = []; let done = 0;
  for (const f of frames) {
    const t0 = Date.now(); await pg.evaluate(n => __L.run(n), f - done); done = f;
    const st = await pg.evaluate(() => __L.stat()); st.frame = f; st.sec = +(f / 60).toFixed(2);
    for (const m of METH) { const d = await pg.evaluate(mm => __L.capM(mm), m); const file = `${pre}_${sc}_${f}_m${m}.jpg`; fs.writeFileSync(file, Buffer.from(d.split(',')[1], 'base64')); res['m' + m].push({ ...st, file }); }
    console.log(sc, f, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(st).slice(0, 200));
    fs.writeFileSync(`${pre}_${sc}_stats.json`, JSON.stringify(res));
  }
  if (errs.length) console.log('ERR', errs.slice(0, 6).join('\n'));
  await b.close();
})();
