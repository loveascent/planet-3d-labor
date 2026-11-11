// ZEITRASTER: Zeilen = Varianten, Spalten = Zeitpunkte. Nie ein Einzelbild beurteilen.
// Aufruf: node test/raster.mjs <plan> [marker] [bildgröße]      Pläne stehen unten in PLAENE.
import { oeffne, raster } from './seite.mjs';

const ORT = [0.46, 0.63, 0.63];
const PLAENE = {
  // die drei Ereignisse von der Seite
  ereignisse: { zeiten: [0.5, 1.5, 3, 6, 10, 16], zeilen: ['bombe', 'vulkan', 'einschlag'].map((e) => ({ titel: e, ereignis: e })) },
  // dasselbe Ereignis, je ein Baustein abgeschaltet: was trägt jeder bei?
  bausteine: { zeiten: [1, 3, 6, 10], zeilen: [['alles an', ''], ['ohne Turbulenz', 'turbulenz'], ['ohne Eigenschatten', 'schatten'], ['ohne Staub', 'staub'], ['ohne Träger', 'traeger']].map(([t, aus]) => ({ titel: t, ereignis: 'bombe', aus })) },
  // Prüfansicht: was rechnet der Träger?
  schnitt: { zeiten: [0.5, 1.5, 3, 6, 10, 16], zeilen: ['bombe', 'vulkan', 'einschlag'].map((e) => ({ titel: e + '\nSchnittbild', ereignis: e, an: 'schnitt' })) },
  // aus dem All
  orbit: { zeiten: [1, 4, 8, 14, 22], zeilen: [{ titel: 'Asteroid\naus dem All', ereignis: 'einschlag', orbit: true, groesse: 1.6 }, { titel: 'Vulkan\naus dem All', ereignis: 'vulkan', orbit: true, groesse: 1.5 }] },
  // acht Ereignisse gleichzeitig, aus dem All (Belastungsprobe)
  stress: { zeiten: [1.5, 5, 10, 18], zeilen: [{ titel: '8 auf einmal', stress: true, orbit: true }] },
};
const [planName = 'ereignisse', markerZahl = '200000', gr = '300'] = process.argv.slice(2);
const plan = PLAENE[planName];
let seite = null; const zeilen = [];
for (const z of plan.zeilen) {
  seite = await oeffne(`&marker=${markerZahl}&netz=64${z.aus ? '&aus=' + z.aus : ''}${z.an ? '&an=' + z.an : ''}`, +gr, +gr);
  const { pg } = seite;
  await pg.evaluate(({ z, ORT }) => {
    const E = window.__E; if (z.stress) { E.api.Z.groesse = 1.6; E.api.stresstest(); }
    const s = z.stress ? 0 : E.api.zuende(z.ereignis, { up: ORT, groesse: z.groesse || 1 });
    if (z.orbit) { E.api.Z.kam.az = 0.95; E.api.Z.kam.el = z.stress ? 0.25 : 0.55; E.api.Z.kam.dist = z.stress ? 3.4 : 2.6; }
    else { E.api.ansicht(E.api.ereignisse.info[s].up, E.api.skala(s)); E.api.Z.kam.az = 2.2; }
  }, { z, ORT });
  const bilder = []; let t = 0;
  for (const ziel of plan.zeiten) {
    await pg.evaluate((n) => window.__E.schritte(n), Math.round((ziel - t) * 60)); t = ziel;
    bilder.push(await pg.evaluate(() => window.__E.bild()));
  }
  zeilen.push({ titel: z.titel, bilder });
  if (seite.fehler.length) console.log('FEHLER', z.titel, [...new Set(seite.fehler)].slice(0, 5).join('\n'));
  if (z !== plan.zeilen.at(-1)) await seite.zu();
}
console.log(await raster(seite.pg, zeilen, plan.zeiten.map((t) => t + ' s'), `raster_${planName}.jpg`));
await seite.zu();
