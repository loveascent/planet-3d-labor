// Rauchprobe: lädt die Seite, zündet jedes Ereignis einmal, meldet Fehler. Aufruf: node test/rauch.mjs
import { oeffne, speichere } from './seite.mjs';
const { pg, fehler, zu } = await oeffne('&marker=60000&netz=48', 360, 360);
for (const name of ['bombe', 'vulkan', 'einschlag']) {
  await pg.evaluate((n) => { const E = window.__E; E.api.ereignisse.alleSchlafen(); const s = E.api.zuende(n, { up: [0.62, 0.5, 0.6] }); E.api.ansicht(E.api.ereignisse.info[s].up); E.api.Z.kam.dist = 0.6; E.schritte(150); }, name);
  speichere(`rauch_${name}.jpg`, await pg.evaluate(() => window.__E.bild()));
  const f = await pg.evaluate(() => window.__E.feld(0));
  let maxU = 0, asche = 0, nan = 0; for (let i = 0; i < f.length; i += 4) { if (!isFinite(f[i]) || !isFinite(f[i + 1])) nan++; maxU = Math.max(maxU, Math.hypot(f[i], f[i + 1])); asche += f[i + 2]; }
  console.log(name, 'max|u|', maxU.toFixed(3), 'Asche Σ', asche.toFixed(1), 'NaN', nan);
}
console.log(fehler.length ? 'FEHLER:\n' + [...new Set(fehler)].slice(0, 12).join('\n') : 'keine Fehler');
await zu();
