// Gemeinsame Zahlen und WGSL-Stücke. Einzige Stelle, an der das Gitter und der Slot-Aufbau festgelegt sind.
// Jeder Baustein (Träger, Marker, Boden) liest von hier, keiner kennt den anderen.

export const NR = 64;          // Zellen radial (weg von der Ereignisachse)
export const NZ = 128;         // Zellen in der Höhe
export const RD = 2.0;         // Gebietsradius in Ereignis-Einheiten
export const HD = 4.0;         // Gebietshöhe in Ereignis-Einheiten
export const H = RD / NR;      // Zellgröße
export const SLOTS = 8;        // gleichzeitig wache Ereignisse (jedes ein eigener Achsenschnitt)

// Ein Slot = ein waches Ereignis. Alle Werte f32, Reihenfolge = Reihenfolge im Speicher.
export const SLOT_FELDER = [
  'an', 't', 'dt', 'neu',                    // wach?, Zeit seit Zündung, Zeitschritt, 1 nur im Zündschritt
  'n2a', 'n2b', 'ztp', 'turb',               // Schichtung N² unten/oben, Höhe der Sperrschicht, Turbulenzgrad der Marker
  'qR', 'qH', 'qB', 'qAsche',                // Dauerquelle (Schlot): Radius, Höhe, Auftrieb, Asche
  'qGlut', 'qAn', 'strahl', 'gewicht',       // Glut der Quelle, Quelle an?, Schubgeschwindigkeit, Aschegewicht
  'sink', 'kuehl', 'heben', 'schwelle',      // Sinkgeschwindigkeit Asche, Abkühlrate, Staubheben vom Boden, Schwellwind
  'expQ', 'skala', 'art', 'bombenAnteil',    // Volumenquelle (Feuerball dehnt sich), Planetenradien je Einheit, Ereignisart, Anteil Wurfgeschosse
  'upx', 'upy', 'upz', 'anteil',             // Ort auf der Kugel (Einheitsvektor), kumulierter Marker-Anteil
  'ejV', 'g', 'seed', 'feuerAnteil',         // Auswurfgeschwindigkeit am Kraterrand, Fallbeschleunigung, Zufall, Anteil Feuerball-Marker
  'fr', 'fg', 'fb', 'spawn',                 // Rauchfarbe, Nachschubrate toter Marker
  'leben', 'kraterR', 'feuerR', 'feuerZ',    // Marker-Lebensdauer, Kraterradius, Feuerball-Radius und -Höhe
  'bodenH', 'wind', 'res2', 'res3',          // Geländehöhe am Ort, Windscherung, Reserve
];
export const SLOT_N = SLOT_FELDER.length;
export const F = Object.fromEntries(SLOT_FELDER.map((n, i) => [n, i]));

export const ART = { VULKAN: 1, BOMBE: 2, EINSCHLAG: 3 };

export const WGSL_GEMEINSAM = /* wgsl */`
const NR: i32 = ${NR};
const NZ: i32 = ${NZ};
const RD: f32 = ${RD.toFixed(4)};
const HD: f32 = ${HD.toFixed(4)};
const H: f32 = ${H.toFixed(6)};
const SLOTS: u32 = ${SLOTS}u;
const PI: f32 = 3.14159265;
struct Slot { ${SLOT_FELDER.map((n) => `${n}: f32`).join(', ')} }

fn pcg(v: u32) -> u32 {
  let s = v * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
fn zuf(seed: ptr<function, u32>) -> f32 { *seed = pcg(*seed); return f32(*seed >> 8u) / 16777216.0; }

// Tangentialbasis am Ereignisort: Spalten = Ost, Nord, Oben
fn basis(up: vec3f) -> mat3x3f {
  let a = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(up.y) > 0.9);
  let e1 = normalize(cross(a, up));
  return mat3x3f(e1, cross(up, e1), up);
}
// Ereignis-Koordinaten (x, y = am Boden entlang, z = Höhe) auf die Kugel biegen:
// Abstand von der Achse wird Bogenlänge, Höhe wird Radius. Große Wolken legen sich so um den Planeten.
fn lokalZuWelt(p: vec3f, up: vec3f, skala: f32, bodenH: f32) -> vec3f {
  let B = basis(up);
  let rr = length(p.xy);
  let a = rr * skala;
  let d2 = p.xy / max(rr, 1e-6);
  return (1.0 + bodenH + p.z * skala) * (cos(a) * B[2] + sin(a) * (B[0] * d2.x + B[1] * d2.y));
}
// Schwarzkörper-ähnliche Glutfarbe: dunkelrot -> orange -> gelbweiß
fn glutFarbe(g: f32) -> vec3f {
  let x = clamp(g, 0.0, 4.0);
  return vec3f(1.0, 0.33, 0.07) * x * x * 1.6 + vec3f(0.9, 0.8, 0.5) * max(x - 0.8, 0.0) * 2.0;
}
`;

// Slot-Daten als Float32Array-Fenster mit Namen
export function slotSicht(daten, s) {
  const o = s * SLOT_N;
  return new Proxy({}, {
    get: (_, n) => daten[o + F[n]],
    set: (_, n, v) => { if (!(n in F)) throw new Error('Slot-Feld unbekannt: ' + String(n)); daten[o + F[n]] = v; return true; },
  });
}
