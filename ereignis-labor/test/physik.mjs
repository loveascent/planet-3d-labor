// PHYSIKPRÜFUNG des Trägers gegen die Literatur (nicht gegen das Auge).
// 1) Wärmeblase in geschichteter Luft: Steighöhe ∝ (B/N²)^(1/4)  (Morton, Taylor & Turner 1956).
//    Geprüft wird der Exponent: 4× Schichtung N² -> Höhe × 0,71;  4× Auftrieb B -> Höhe × 1,41.
// 2) Die Strömung ist divergenzfrei (in Zylinderkoordinaten).
// Aufruf: node test/physik.mjs
import { oeffne } from './seite.mjs';
const { pg, zu, fehler } = await oeffne('&marker=1000&netz=16&aus=marker', 200, 200);

const lauf = (n2, b0) => pg.evaluate(async ({ n2, b0 }) => {
  const E = window.__E, { NR, NZ } = E.gitter, H = 2 / NR;
  E.api.ereignisse.alleSchlafen();
  E.api.zuende('bombe', { up: [0, 1, 0], n2a: n2, n2b: n2, heben: 0, tExp: 0, b0, feuerR: 0.3, feuerZ: 0.35, sink: 0, gewicht: 0, kuehl: 0 });
  let hoechst = 0, div = 0, grad = 0;
  for (let k = 0; k < 14; k++) {
    E.schritte(60);
    const f = await E.feld(0);
    let m = 0, mz = 0;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NR; i++) { const a = f[(j * NR + i) * 4 + 2], r = (i + 0.5) * H; m += a * r; mz += a * r * (j + 0.5) * H; }
    hoechst = Math.max(hoechst, mz / m);
    if (k === 2) for (let j = 2; j < NZ - 2; j++) for (let i = 2; i < NR - 2; i++) {
      const u = (a, b) => f[(b * NR + a) * 4], w = (a, b) => f[(b * NR + a) * 4 + 1], r = (i + 0.5) * H;
      const d = ((r + H) * u(i + 1, j) - (r - H) * u(i - 1, j)) / (2 * H * r) + (w(i, j + 1) - w(i, j - 1)) / (2 * H);
      div += Math.abs(d); grad += Math.abs(u(i + 1, j) - u(i - 1, j)) / (2 * H) + Math.abs(w(i, j + 1) - w(i, j - 1)) / (2 * H);
    }
  }
  return { hoehe: hoechst - 0.35, div: div / grad };
}, { n2, b0 });

const a = await lauf(0.5, 6), b = await lauf(2.0, 6), c = await lauf(2.0, 24);
const z = (t, ist, soll) => console.log(t.padEnd(52), 'gemessen', ist.toFixed(2), ' Theorie', soll.toFixed(2), Math.abs(ist / soll - 1) < 0.2 ? ' OK' : ' ABWEICHUNG');
console.log('Steighöhe der Wärmeblase (Schwerpunkt der Asche über dem Startpunkt), in Ereignis-Einheiten:');
console.log(`  N²=0,5 B=6: ${a.hoehe.toFixed(2)}   N²=2 B=6: ${b.hoehe.toFixed(2)}   N²=2 B=24: ${c.hoehe.toFixed(2)}`);
z('4× stärkere Schichtung: Höhe mal', b.hoehe / a.hoehe, 4 ** -0.25);
z('4× mehr Auftrieb: Höhe mal', c.hoehe / b.hoehe, 4 ** 0.25);
console.log('Divergenz relativ zur Größe der Geschwindigkeitsänderungen:', (a.div * 100).toFixed(2) + ' %');
if (fehler.length) console.log('FEHLER', fehler.slice(0, 3).join('\n'));
await zu();
