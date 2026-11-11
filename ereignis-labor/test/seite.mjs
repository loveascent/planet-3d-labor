// Gemeinsamer Start für alle Prüfungen: Chromium mit WebGPU (hier: SwiftShader, also CPU), lädt dist/ereignis.html?test
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const HIER = dirname(fileURLToPath(import.meta.url));
export const AUS = resolve(HIER, 'aus');
mkdirSync(AUS, { recursive: true });

export async function oeffne(query = '', w = 420, h = 420) {
  const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: w, height: Math.round(h / 0.62) } });
  const fehler = [];
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fehler.push(m.text().slice(0, 600)); });
  pg.on('pageerror', (e) => fehler.push('SEITE: ' + String(e).slice(0, 600)));
  await pg.goto('file://' + resolve(HIER, '../dist/ereignis.html') + '?test' + query);
  await pg.waitForFunction(() => window.__E && (window.__E.bereit || window.__E.fehler), null, { timeout: 120000 });
  const f = await pg.evaluate(() => window.__E.fehler);
  if (f) fehler.push(f);
  return { b, pg, fehler, zu: () => b.close() };
}
export const speichere = (name, dataUrl) => { const p = resolve(AUS, name); writeFileSync(p, Buffer.from(dataUrl.split(',')[1], 'base64')); return p; };

// Mehrere Bilder zu einem Raster mit Beschriftung zusammensetzen (im Browser, damit kein Bildpaket nötig ist)
export async function raster(pg, zeilen, spaltenTitel, name) {
  const url = await pg.evaluate(async ({ zeilen, spaltenTitel }) => {
    const lade = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const erstes = await lade(zeilen[0].bilder[0]);
    const w = erstes.width, h = erstes.height, links = 120, oben = 22;
    const c = document.createElement('canvas'); c.width = links + w * spaltenTitel.length; c.height = oben + h * zeilen.length;
    const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#fff'; g.font = '13px sans-serif';
    spaltenTitel.forEach((t, k) => g.fillText(t, links + k * w + 6, 15));
    for (let z = 0; z < zeilen.length; z++) {
      zeilen[z].titel.split('\n').forEach((t, k) => g.fillText(t, 6, oben + z * h + 18 + k * 16));
      for (let k = 0; k < zeilen[z].bilder.length; k++) g.drawImage(await lade(zeilen[z].bilder[k]), links + k * w, oben + z * h);
    }
    return c.toDataURL('image/jpeg', 0.88);
  }, { zeilen, spaltenTitel });
  return speichere(name, url);
}
