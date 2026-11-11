// EREIGNIS-POOL: weckt Physik nur dort und nur so lange, wie ein Ereignis läuft.
// Ein Ereignis belegt einen Slot (einen Achsenschnitt des Trägers). Ist es vorbei, schreibt es seine Spuren
// in die Planetenkarte (Narben) und gibt den Slot frei. Schlafende Slots kosten nichts.
import { NR, NZ, H, SLOTS, SLOT_N, ART, slotSicht } from './gemeinsam.js';
import { sedovQuelle } from './formeln.js';

// Vorlagen in Ereignis-Einheiten (Gebiet: Radius 2, Höhe 4). 'skala' = Planetenradien je Einheit.
export const VORLAGEN = {
  vulkan: {
    art: ART.VULKAN, skala: 0.05, dauer: 60, ausbruch: 40,
    n2a: 0.5, n2b: 5.0, ztp: 2.3, turb: 0.3,
    qR: 0.16, qH: 0.2, qB: 3.5, qAsche: 1.6, qGlut: 1.3, strahl: 0.8, gewicht: 0.3,
    sink: 0.03, kuehl: 1.6, heben: 0.0, schwelle: 0.0,
    bombenAnteil: 0.03, ejV: 0.75, g: 1.6, feuerAnteil: 0.0, spawn: 0.9, leben: 30,
    farbe: [0.36, 0.33, 0.31], kraterR: 0.6, feuerR: 0.0, feuerZ: 0.0, b0: 0, tExp: 0, rEnd: 0,
  },
  bombe: {
    art: ART.BOMBE, skala: 0.045, dauer: 45, ausbruch: 0,
    n2a: 0.5, n2b: 5.0, ztp: 2.4, turb: 0.3,
    qR: 0, qH: 0, qB: 0, qAsche: 0, qGlut: 0, strahl: 0, gewicht: 0.3,
    sink: 0.02, kuehl: 0.45, heben: 5.0, schwelle: 0.12,
    bombenAnteil: 0.0, ejV: 0, g: 1.6, feuerAnteil: 0.6, spawn: 25, leben: 40,
    farbe: [0.55, 0.5, 0.46], kraterR: 0.2, feuerR: 0.32, feuerZ: 0.3, b0: 9.0, tExp: 0.45, rEnd: 0.5,
  },
  einschlag: {
    art: ART.EINSCHLAG, skala: 0.11, dauer: 45, ausbruch: 0,
    n2a: 0.4, n2b: 4.0, ztp: 2.6, turb: 0.35,
    qR: 0, qH: 0, qB: 0, qAsche: 0, qGlut: 0, strahl: 0, gewicht: 0.5,
    sink: 0.04, kuehl: 0.35, heben: 6.0, schwelle: 0.12,
    bombenAnteil: 0.2, ejV: 0.9, g: 1.4, feuerAnteil: 0.45, spawn: 25, leben: 40,
    farbe: [0.42, 0.36, 0.3], kraterR: 0.34, feuerR: 0.34, feuerZ: 0.0, b0: 10.0, tExp: 0.5, rEnd: 0.55,
  },
};

export function erzeugeEreignisse(device) {
  const daten = new Float32Array(SLOTS * SLOT_N);
  const puffer = device.createBuffer({ size: daten.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const info = new Array(SLOTS).fill(null);
  let traeger = null, boden = null, uhr = 0;

  const anfang = (v) => {        // Feuerball: heiße, aschehaltige Kugel als Anfangszustand (ξ, b, asche, glut)
    const z = new Float32Array(NR * NZ * 4);
    if (v.feuerR > 0) for (let j = 0; j < NZ; j++) for (let i = 0; i < NR; i++) {
      const d = Math.hypot((i + 0.5) * H, (j + 0.5) * H - v.feuerZ) / v.feuerR;
      const w = d < 1 ? 1 - d * d * (3 - 2 * d) : 0, o = (j * NR + i) * 4;
      z[o + 1] = v.b0 * w; z[o + 2] = 2.0 * w; z[o + 3] = 2.2 * w;
    }
    return z;
  };

  return {
    daten, puffer, info,
    verbinde(t, b) { traeger = t; boden = b; },
    wach: () => info.filter(Boolean).length,
    hoechster() { let h = -1; info.forEach((x, s) => { if (x) h = s; }); return h; },
    // Ereignis zünden. up = Ort auf der Kugel (Einheitsvektor). opt.groesse skaliert das ganze Ereignis.
    starte(name, up, opt = {}) {
      const v = { ...VORLAGEN[name], ...opt };
      let s = info.findIndex((x) => !x);
      if (s < 0) { s = 0; info.forEach((x, k) => { if (x.t > info[s].t) s = k; }); this.schlafen(s); }   // voll: ältestes weicht
      const S = slotSicht(daten, s);
      for (const k of ['n2a', 'n2b', 'ztp', 'turb', 'qR', 'qH', 'qB', 'qAsche', 'qGlut', 'strahl', 'gewicht', 'sink', 'kuehl', 'heben', 'schwelle',
        'bombenAnteil', 'ejV', 'g', 'feuerAnteil', 'spawn', 'leben', 'kraterR', 'feuerR', 'feuerZ', 'art']) S[k] = v[k];
      S.skala = v.skala * (opt.groesse || 1);
      S.an = 1; S.t = 0; S.neu = 1; S.qAn = v.ausbruch > 0 ? 1 : 0; S.expQ = 0;
      S.upx = up[0]; S.upy = up[1]; S.upz = up[2];
      S.fr = v.farbe[0]; S.fg = v.farbe[1]; S.fb = v.farbe[2];
      S.seed = Math.random() * 100; S.wind = opt.wind ?? 0.25;
      S.bodenH = boden ? boden.hoehe(up) : 0;
      info[s] = { name, v, t: 0, slot: s, up };
      traeger?.setzeSlot(s, anfang(v));
      if (boden) {
        const R = S.kraterR * S.skala;                    // Winkelradius der Narbe
        if (v.art === ART.VULKAN) { boden.stempel({ art: 1, zentrum: up, radius: R, rand: 0.2 * R, tiefe: 0.05 * R, hitze: 2.5, russ: 0.35, basis: S.bodenH }); S.bodenH += 0.2 * R * 0.9; }
        else { boden.stempel({ art: 0, zentrum: up, radius: R, rand: 0.07 * R, tiefe: 0.3 * R, hitze: v.art === ART.EINSCHLAG ? 3.0 : 1.2, russ: 0.8, basis: S.bodenH }); S.bodenH = Math.max(S.bodenH - 0.3 * R, 0); }
      }
      return s;
    },
    schlafen(s) {
      const x = info[s]; if (!x) return;
      const S = slotSicht(daten, s);
      boden?.stempel({ art: 2, zentrum: x.up, radius: 1.3 * S.skala, rand: 0, tiefe: 0, hitze: 0, russ: 0.5, basis: 0 });   // Aschedecke bleibt
      S.an = 0; info[s] = null;
    },
    alleSchlafen() { for (let s = 0; s < SLOTS; s++) { if (info[s]) { slotSicht(daten, s).an = 0; info[s] = null; } } },
    // vor jedem Zeitschritt
    schritt(dt) {
      uhr += dt;
      let wach = 0; for (const x of info) if (x) wach++;
      let kum = 0;
      for (let s = 0; s < SLOTS; s++) {
        const S = slotSicht(daten, s), x = info[s];
        if (x) {
          x.t += dt; S.t = x.t; S.dt = dt;
          if (x.v.ausbruch > 0 && x.t > x.v.ausbruch) S.qAn = 0;
          // Feuerball dehnt sich nach Sedov-Taylor, bis er den Endradius erreicht hat
          S.expQ = x.v.tExp > 0 && x.t < x.v.tExp ? sedovQuelle(x.v.rEnd / x.v.tExp ** 0.4, x.t) : 0;
          if (x.t > x.v.dauer) { this.schlafen(s); }
          else kum += 1 / wach;
        }
        S.anteil = kum;                                   // Marker werden gleichmäßig auf wache Ereignisse verteilt
      }
      device.queue.writeBuffer(puffer, 0, daten);
    },
    nachSchritt() { for (let s = 0; s < SLOTS; s++) daten[s * SLOT_N + 3] = 0; },     // 'neu' gilt genau einen Schritt
  };
}
