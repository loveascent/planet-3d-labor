// KOSTEN: Zeit je Rechenschritt, gemessen im selben Software-Renderer (SwiftShader, CPU). Die absoluten Zahlen
// gelten NICHT für ein Handy, nur die Verhältnisse.
// Aufruf: node test/kosten.mjs
import { oeffne } from './seite.mjs';

const zeile = (n, ms, bem = '') => console.log(n.padEnd(46), (ms.toFixed(1) + ' ms').padStart(10), bem);
const fall = async (titel, query, vor, n = 40) => {
  const { pg, zu, fehler } = await oeffne(query, 200, 200);
  await pg.evaluate(vor); await pg.evaluate(() => window.__E.schritte(60)); await pg.evaluate(() => window.__E.fertig());
  const ms = await pg.evaluate((n) => window.__E.messen(n), n);
  zeile(titel, ms, fehler.length ? 'FEHLER ' + fehler[0] : ''); await zu(); return ms;
};
const eins = `window.__E.api.zuende('bombe', { up: [0.46, 0.63, 0.63] })`;
console.log('--- Ereignis-Labor (Rechenschritt ohne Zeichnen) ---');
await fall('nichts wach, 200k Marker', '&marker=200000&netz=16', '0');
await fall('1 Ereignis, nur Träger (Marker aus)', '&marker=1000&netz=16&aus=marker', eins);
await fall('8 Ereignisse, nur Träger (Marker aus)', '&marker=1000&netz=16&aus=marker', `window.__E.api.stresstest()`);
await fall('1 Ereignis, nur 200k Marker (Träger aus)', '&marker=200000&netz=16&aus=traeger', eins);
await fall('1 Ereignis, Träger + 200k Marker', '&marker=200000&netz=16', eins);
await fall('8 Ereignisse, Träger + 200k Marker', '&marker=200000&netz=16', `window.__E.api.stresstest()`);
await fall('8 Ereignisse, Träger + 1 Mio Marker', '&marker=1000000&netz=16', `window.__E.api.stresstest()`, 12);

// Die Tasse (wasserkugel-labor/euler.html) lässt sich hier nicht mitmessen: SwiftShader verliert dabei das Gerät.
// Vergleich deshalb über Zellbesuche je Bild, siehe WEG.md Abschnitt 5.
