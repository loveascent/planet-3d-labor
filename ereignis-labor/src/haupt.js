// VERDRAHTUNG. Hier wird nichts gerechnet, nur zusammengesteckt:
//   Ereignis-Pool -> Träger (Physik) -> Marker (Sichtbares) -> Boden (Gedächtnis).
// Ein Baustein fliegt raus, indem man seine Zeile hier und in bausteine.js löscht.
import { geraetHolen } from './geraet.js';
import { BAUSTEINE, schalterAusUrl } from './bausteine.js';
import { erzeugeEreignisse } from './ereignisse.js';
import { erzeugeTraegerAchse } from './traeger/achse.js';
import { erzeugeMarker } from './sichtbar/marker.js';
import { erzeugeBoden } from './sichtbar/boden.js';
import { erzeugeSchnitt } from './sichtbar/schnitt.js';
import { baueBedienung } from './bedienung.js';
import { NR, NZ, SLOTS, SLOT_N, F } from './gemeinsam.js';

const qs = new URLSearchParams(location.search);
const TEST = qs.has('test');
const canvas = document.getElementById('bild');
const melde = (t) => { document.getElementById('status').textContent = t; };

async function start() {
  const { device, format } = await geraetHolen();
  const ctx = canvas.getContext('webgpu');
  ctx.configure({ device, format, alphaMode: 'opaque' });
  const schalter = schalterAusUrl(qs);
  const blickPuffer = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const blick = new Float32Array(32);

  const ereignisse = erzeugeEreignisse(device);
  const traeger = erzeugeTraegerAchse(device, ereignisse.puffer);
  const boden = await erzeugeBoden(device, format, blickPuffer, +(qs.get('netz') || 128));
  let marker = erzeugeMarker(device, format, blickPuffer, ereignisse.puffer, traeger, +(qs.get('marker') || 300000));
  const schnitt = erzeugeSchnitt(device, format, traeger);
  ereignisse.verbinde(traeger, boden);

  const Z = { zeit: 0, bild: 0, tempo: +(qs.get('tempo') || 1), groesse: 1, pause: false, fps: 0,
    kam: { az: 0.6, el: 0.35, dist: 3.2, ziel: [0, 0, 0] }, sonne: norm([1, 0.45, 0.55]) };
  let tiefe = null, B = 0, Hh = 0;
  const groesse = () => {
    const dpr = TEST ? 1 : Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (w === B && h === Hh) return;
    B = w; Hh = h; canvas.width = w; canvas.height = h;
    tiefe?.destroy(); tiefe = device.createTexture({ size: [w, h], format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
  };

  // Ort unter der Bildmitte: dort zünden neue Ereignisse
  const mitte = () => (len(Z.kam.ziel) > 0.5 ? norm(Z.kam.ziel) : norm(auge()));
  function auge() {
    const k = Z.kam, z = k.ziel;
    if (len(z) < 0.5) return [k.dist * Math.cos(k.el) * Math.cos(k.az), k.dist * Math.sin(k.el), k.dist * Math.cos(k.el) * Math.sin(k.az)];
    const up = norm(z), a = Math.abs(up[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], e1 = norm(kreuz(a, up)), e2 = kreuz(up, e1);     // am Ereignis: Höhe über dem Horizont
    const c = Math.cos(k.el), s = Math.sin(k.el);
    return [0, 1, 2].map((i) => z[i] + k.dist * (c * Math.cos(k.az) * e1[i] + c * Math.sin(k.az) * e2[i] + s * up[i]));
  }
  function blickSchreiben() {
    const k = Z.kam, e = auge(), up = len(k.ziel) > 0.5 ? norm(k.ziel) : [0, 1, 0];
    const fov = 0.7, f = 1 / Math.tan(fov / 2), nah = 0.005, fern = 30;
    const P = [f / (B / Hh), 0, 0, 0, 0, f, 0, 0, 0, 0, fern / (nah - fern), -1, 0, 0, fern * nah / (nah - fern), 0];
    blick.set(mal(P, schau(e, k.ziel, up)), 0);
    blick.set(e, 16); blick[19] = Z.zeit; blick.set(Z.sonne, 20); blick[23] = Z.dt || 0;
    blick[24] = B; blick[25] = Hh; blick[26] = Z.bild;
    blick[27] = (schalter.turbulenz ? 1 : 0) | (schalter.schatten ? 2 : 0) | (schalter.ballistik ? 4 : 0) | (schalter.staub ? 8 : 0) | (schalter.wind ? 16 : 0);
    blick[28] = boden.tStempel; blick[29] = TEST ? 1.0 : 1.3; blick[30] = marker.anzahl; blick[31] = (Hh / 2) * f;
    device.queue.writeBuffer(blickPuffer, 0, blick);
  }

  // Ein fester Zeitschritt: Pool -> Träger -> Marker
  function schritt() {
    const dt = (1 / 60) * Z.tempo; Z.dt = dt; Z.zeit += dt; Z.bild++;
    boden.an = schalter.narben; boden.setzeZeit(Z.zeit);
    ereignisse.schritt(dt);
    blickSchreiben();
    const h = ereignisse.hoechster();
    if (h >= 0) {                                          // nichts wach -> gar keine Rechenpässe
      const enc = device.createCommandEncoder();
      if (schalter.traeger) traeger.schritt(enc, h);
      if (schalter.marker) marker.schritt(enc);
      device.queue.submit([enc.finish()]);
    }
    ereignisse.nachSchritt();
  }
  function zeichne(zielSicht) {
    blickSchreiben();
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [{ view: zielSicht, loadOp: 'clear', storeOp: 'store', clearValue: [0.005, 0.006, 0.012, 1] }],
      depthStencilAttachment: { view: tiefe.createView(), depthLoadOp: 'clear', depthStoreOp: 'store', depthClearValue: 1 },
    });
    boden.zeichne(pass);
    if (schalter.marker) marker.zeichne(pass);
    if (schalter.schnitt) schnitt.zeichne(pass, Math.max(0, ereignisse.hoechster()));
    pass.end();
    device.queue.submit([enc.finish()]);
  }

  const zuende = (name, opt = {}) => {
    const up = opt.up || mitte();
    const s = ereignisse.starte(name, up, { groesse: Z.groesse, ...opt });
    api.letzter = { ort: up, skala: ereignisse.daten[s * SLOT_N + F.skala] };
    return s;
  };
  const api = {
    letzter: null, Z, schalter, ereignisse, traeger, boden, device, zuende,
    get marker() { return marker; },
    skala: (s) => ereignisse.daten[s * SLOT_N + F.skala],
    markerNeu(n) { marker.freigeben(); marker = erzeugeMarker(device, format, blickPuffer, ereignisse.puffer, traeger, n); },
    // Kamera an ein Ereignis setzen: Blick auf halbe Wolkenhöhe, Abstand passend zur Ereignisgröße
    ansicht(ort, skala = 0.05) { Z.kam.ziel = ort ? ort.map((x) => x * (1 + 1.5 * skala)) : [0, 0, 0]; if (ort) { Z.kam.dist = 5.2 * skala; Z.kam.el = 0.12; } else { Z.kam.dist = 3.2; } },
    stresstest() {
      for (let k = 0; k < SLOTS; k++) {
        const a = k * 2.399, y = 0.75 - 1.5 * (k + 0.5) / SLOTS, r = Math.sqrt(1 - y * y);
        zuende(['vulkan', 'bombe', 'einschlag'][k % 3], { up: [r * Math.cos(a), y, r * Math.sin(a)], groesse: Z.groesse * (k % 3 === 2 ? 0.6 : 1) });
      }
    },
  };

  // ---- Prüf-Schnittstelle (test/*.mjs): feste Schritte, Bild als Daten, Felder zurücklesen, Zeiten messen
  window.__E = {
    bereit: true, api,
    schritte(n) { for (let i = 0; i < n; i++) schritt(); },
    async fertig() { await device.queue.onSubmittedWorkDone(); },
    async bild() {
      groesse();
      const t = device.createTexture({ size: [B, Hh], format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
      zeichne(t.createView());
      const zeile = Math.ceil(B * 4 / 256) * 256;
      const b = device.createBuffer({ size: zeile * Hh, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      const enc = device.createCommandEncoder(); enc.copyTextureToBuffer({ texture: t }, { buffer: b, bytesPerRow: zeile }, [B, Hh]); device.queue.submit([enc.finish()]);
      await b.mapAsync(GPUMapMode.READ);
      const roh = new Uint8Array(b.getMappedRange()), px = new Uint8ClampedArray(B * Hh * 4), bgr = format.startsWith('bgra');
      for (let y = 0; y < Hh; y++) for (let x = 0; x < B; x++) { const i = y * zeile + x * 4, o = (y * B + x) * 4; px[o] = roh[i + (bgr ? 2 : 0)]; px[o + 1] = roh[i + 1]; px[o + 2] = roh[i + (bgr ? 0 : 2)]; px[o + 3] = 255; }
      b.unmap(); b.destroy(); t.destroy();
      const c = document.createElement('canvas'); c.width = B; c.height = Hh; c.getContext('2d').putImageData(new ImageData(px, B, Hh), 0, 0);
      return c.toDataURL('image/jpeg', 0.9);
    },
    async feld(s) { return Array.from(await traeger.lesen(s)); },
    // Zeit je Schritt in ms (Mittel über n Schritte, wartet auf die GPU)
    async messen(n) { await device.queue.onSubmittedWorkDone(); const t0 = performance.now(); for (let i = 0; i < n; i++) { schritt(); if (i % 4 === 3) await device.queue.onSubmittedWorkDone(); } await device.queue.onSubmittedWorkDone(); return (performance.now() - t0) / n; },
    gitter: { NR, NZ, SLOTS },
  };

  groesse();
  if (TEST) { melde('Prüfmodus'); return; }
  baueBedienung(api, BAUSTEINE);
  zuende('vulkan', { up: norm([0.46, 0.63, 0.63]) }); api.ansicht(api.letzter.ort, api.letzter.skala); Z.kam.az = 2.2;     // Seite öffnet mitten im Geschehen
  let letzte = performance.now(), rest = 0, n = 0, summe = 0;
  const rahmen = (jetzt) => {
    const d = Math.min(jetzt - letzte, 100); letzte = jetzt;
    groesse();
    if (!Z.pause) { rest += d; let k = 0; while (rest >= 1000 / 60 - 0.5 && k < 2) { schritt(); rest -= 1000 / 60; k++; } if (rest > 50) rest = 0; }
    zeichne(ctx.getCurrentTexture().createView());
    summe += d; n++;
    if (n === 30) { Z.fps = 30000 / summe; n = 0; summe = 0; melde(`${Z.fps.toFixed(0)} B/s · ${ereignisse.wach()} wach · ${(marker.anzahl / 1000).toFixed(0)}k Marker · Träger ${ereignisse.wach() * NR * NZ} Zellen`); }
    requestAnimationFrame(rahmen);
  };
  requestAnimationFrame(rahmen);
}

// ---- kleine Vektorhelfer
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punkt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function schau(e, z, up) {
  const f = norm([z[0] - e[0], z[1] - e[1], z[2] - e[2]]), s = norm(kreuz(f, up)), u = kreuz(s, f);
  return [s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -punkt(s, e), -punkt(u, e), punkt(f, e), 1];
}
function mal(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }

start().catch((e) => { melde('Fehler: ' + e.message); console.error(e); window.__E = { fehler: String(e) }; });
