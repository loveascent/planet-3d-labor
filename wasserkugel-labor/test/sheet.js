// node test/sheet.js out_prefix frames(csv) scene1,scene2,... [tier] [w]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [pre, fr, scs, tier = 'potato', W = '420', page = 'index.html', extra = ''] = process.argv.slice(2);
  const frames = fr.split(',').map(Number), scenes = scs.split(',');
  const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=native', '--ignore-gpu-blocklist', '--use-angle=vulkan'], env: { ...process.env, VK_ICD_FILENAMES: '/usr/share/vulkan/icd.d/lvp_icd.json' } });
  const pg = await b.newPage({ viewport: { width: +W, height: +W } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); }); pg.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  const res = {};
  for (const sc of scenes) {
    await pg.goto(`http://localhost:8772/${page}?test&tier=${tier}&scene=${sc}&rs=.6${extra}`);
    await pg.waitForFunction(() => window.__L && window.__L.ready, null, { timeout: 120000 });
    let done = 0; res[sc] = [];
    for (const f of frames) {
      const t0 = Date.now(); await pg.evaluate(n => __L.run(n), f - done); done = f;
      const d = await pg.evaluate(() => __L.cap()); const file = `${pre}_${sc}_${f}.jpg`; fs.writeFileSync(file, Buffer.from(d.split(',')[1], 'base64'));
      const st = await pg.evaluate(() => __L.stat()); st.frame = f; st.sec = +(f / 60).toFixed(2); st.file = file; res[sc].push(st);
      console.log(sc, f, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(st));
      fs.writeFileSync(pre + '_stats.json', JSON.stringify(res, null, 1));
    }
  }
  if (errs.length) console.log('ERR', errs.slice(0, 5).join('\n'));
  await b.close();
})();
