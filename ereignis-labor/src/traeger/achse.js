// TRÄGER "Achsenschnitt": die Physik eines Ereignisses als 2D-Gitter (r = Abstand von der Achse, z = Höhe).
//
// Gleichungen (Boussinesq, achsensymmetrisch, ohne Drall), Wirbelstärke-Stromfunktion-Form:
//   ξ = ω/r                         (ω = ∂u_r/∂z − ∂u_z/∂r, Wirbelstärke um die Achse)
//   Dξ/Dt = −(1/r) ∂b_eff/∂r        (Auftrieb erzeugt Wirbel: heißer Kern -> Wirbelring -> Pilz)
//   Db/Dt = −N²(z) u_z              (geschichtete Luft: Wolke bleibt an der Sperrschicht stehen und breitet sich aus)
//   E²ψ = ∂²ψ/∂z² + r ∂/∂r((1/r) ∂ψ/∂r) = −r² ξ
//   u_r = −(1/r) ∂ψ/∂z,  u_z = (1/r) ∂ψ/∂r   (immer exakt divergenzfrei, egal wie weit der Löser ist)
//   b_eff = b − gewicht·asche       (Asche macht schwer: dichte Säulen können zusammenbrechen)
// Dazu: Volumenquelle (Feuerball dehnt sich, Potentialströmung, analytisch), Staubheben am Boden, Abkühlen.
//
// Nach außen gibt der Träger genau EINE Textur ab: feld[slot] = (u_r, u_z, asche, glut).
// Marker und Darstellung lesen nur diese Textur. Ein anderer Träger (z. B. grobes 3D-Gitter) muss nur sie liefern.

import { NR, NZ, SLOTS, SLOT_N, WGSL_GEMEINSAM } from '../gemeinsam.js';
import { modul } from '../geraet.js';

const KOPF = WGSL_GEMEINSAM + /* wgsl */`
fn ix(i: i32, j: i32, s: u32) -> u32 { return (s * u32(NZ) + u32(clamp(j, 0, NZ - 1))) * u32(NR) + u32(clamp(i, 0, NR - 1)); }
`;

const ADVEKTION = KOPF + /* wgsl */`
@group(0) @binding(0) var<storage, read> slots: array<Slot>;
@group(0) @binding(1) var<storage, read> zA: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> zB: array<vec4f>;
@group(0) @binding(3) var feld: texture_2d_array<f32>;
@group(0) @binding(4) var samp: sampler;

fn cr(t: f32) -> vec4f { let a = t * t; let b = a * t; return vec4f(-0.5 * b + a - 0.5 * t, 1.5 * b - 2.5 * a + 1.0, -1.5 * b + 2.0 * a + 0.5 * t, 0.5 * b - 0.5 * a); }
// Bikubisch (Catmull-Rom) mit Begrenzer auf die vier nächsten Zellen: verschmiert viel weniger als bilinear,
// erzeugt aber keine neuen Extremwerte. c in Zellkoordinaten (0 = Mitte der ersten Zelle).
fn lesen(c: vec2f, s: u32) -> vec4f {
  let f = floor(c); let w = c - f; let i = i32(f.x); let j = i32(f.y);
  let wx = cr(w.x); let wy = cr(w.y);
  var summe = vec4f(0.0); var lo = vec4f(1e9); var hi = vec4f(-1e9);
  for (var b = -1; b <= 2; b++) {
    var zeile = vec4f(0.0);
    for (var a = -1; a <= 2; a++) {
      let v = zA[ix(i + a, j + b, s)]; zeile += v * wx[a + 1];
      if (a >= 0 && a <= 1 && b >= 0 && b <= 1) { lo = min(lo, v); hi = max(hi, v); }
    }
    summe += zeile * wy[b + 1];
  }
  return clamp(summe, lo, hi);
}
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let s = id.z; let S = slots[s];
  if (S.an < 0.5) { return; }
  let i = i32(id.x); let j = i32(id.y);
  let p = (vec2f(f32(i), f32(j)) + 0.5) * H;
  let u = textureSampleLevel(feld, samp, p / vec2f(RD, HD), s, 0.0).xy;
  // Transport (semi-Lagrange, Stam 1999): woher kam diese Zelle?
  var q = lesen((p - u * S.dt) / H - 0.5, s);
  q.z = lesen((p - (u - vec2f(0.0, S.sink)) * S.dt) / H - 0.5, s).z;      // Asche sinkt zusätzlich
  // Auftrieb erzeugt Wirbel
  let l = zA[ix(i - 1, j, s)]; let r = zA[ix(i + 1, j, s)];
  q.x -= ((r.y - S.gewicht * r.z) - (l.y - S.gewicht * l.z)) / (2.0 * H * p.x) * S.dt;
  // Schichtung der Umgebungsluft
  let n2 = mix(S.n2a, S.n2b, smoothstep(S.ztp - 0.25, S.ztp + 0.25, p.y));
  q.y -= n2 * u.y * S.dt;
  q.w *= exp(-S.kuehl * S.dt);
  // Staub vom Boden: Bodenwind über der Schwelle hebt Staub (unterste Zellreihe)
  if (j == 0) { q.z += S.heben * max(abs(u.x) - S.schwelle, 0.0) * S.dt; }
  // Dauerquelle (Schlot) und Schubstrahl (Wirbelschicht am Strahlrand: ω = W / Randdicke)
  if (S.qAn > 0.5 && p.y < S.qH) {
    let k = clamp(10.0 * S.dt, 0.0, 1.0);
    if (p.x < S.qR) { q.y = mix(q.y, S.qB, k); q.z = mix(q.z, S.qAsche, k); q.w = mix(q.w, S.qGlut, k); }
    if (abs(p.x - S.qR) < H) { q.x = mix(q.x, S.strahl / (2.0 * H * p.x), k); }
  }
  // Schwamm an Außen- und Oberrand: nichts prallt zurück
  let sw = clamp((smoothstep(0.82, 1.0, p.x / RD) + smoothstep(0.88, 1.0, p.y / HD)) * 6.0 * S.dt, 0.0, 1.0);
  q.x *= 1.0 - sw; q.y *= 1.0 - sw; q.z *= 1.0 - sw;
  q.z = clamp(q.z, 0.0, 6.0);
  zB[ix(i, j, s)] = q;
}`;

// Rot-Schwarz-SOR für E²ψ = −r²ξ, direkt im Speicher (rote Zellen lesen nur schwarze und umgekehrt).
const LOESER = KOPF + /* wgsl */`
@group(0) @binding(0) var<storage, read> slots: array<Slot>;
@group(0) @binding(1) var<storage, read> z: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> psi: array<f32>;
@group(0) @binding(3) var<uniform> par: vec4f;      // x = Farbe (0/1), y = Überrelaxation
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let s = id.z; let i = i32(id.x); let j = i32(id.y);
  if (((i + j) & 1) != i32(par.x) || slots[s].an < 0.5) { return; }
  let fi = f32(i); let rr = (fi + 0.5) * H;
  let k = ix(i, j, s); let alt = psi[k];
  let ap = (fi + 0.5) / (fi + 1.0);                       // r_i / r_(i+½)
  var am = 0.0; var diag = ap + 2.0 + 4.0;                // Achse (i = 0): ψ ~ r², daraus der Fluss über r = 0
  var pl = 0.0;
  if (i > 0) { am = (fi + 0.5) / fi; diag = ap + am + 2.0; pl = psi[k - 1u]; }
  let pr = select(alt, psi[k + 1u], i < NR - 1);          // Außenrand offen: Luft darf einströmen
  let pu = select(alt, psi[k + u32(NR)], j < NZ - 1);     // Oberrand offen
  let pd = select(-alt, psi[k - u32(NR)], j > 0);         // Boden dicht: ψ = 0
  let neu = (ap * pr + am * pl + pu + pd + H * H * rr * rr * z[k].x) / diag;
  psi[k] = mix(alt, neu, par.y);
}`;

const GESCHWINDIGKEIT = KOPF + /* wgsl */`
@group(0) @binding(0) var<storage, read> slots: array<Slot>;
@group(0) @binding(1) var<storage, read> z: array<vec4f>;
@group(0) @binding(2) var<storage, read> psi: array<f32>;
@group(0) @binding(3) var aus: texture_storage_2d_array<rgba16float, write>;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let s = id.z; let S = slots[s];
  if (S.an < 0.5) { return; }
  let i = i32(id.x); let j = i32(id.y);
  let k = ix(i, j, s); let m = psi[k];
  let rr = (f32(i) + 0.5) * H; let zz = (f32(j) + 0.5) * H;
  let pr = select(m, psi[k + 1u], i < NR - 1);
  let pl = select(m, psi[k - 1u], i > 0);                 // ψ ist gerade in r
  let pu = select(m, psi[k + u32(NR)], j < NZ - 1);
  let pd = select(-m, psi[k - u32(NR)], j > 0);
  var u = vec2f(-(pu - pd), pr - pl) / (2.0 * H * rr);
  // Feuerball dehnt sich: Punktquelle im Halbraum (plus Spiegelquelle unter dem Boden), exakt divergenzfrei außerhalb
  if (S.expQ > 0.0) {
    let a = vec2f(rr, zz - S.feuerZ); let b = vec2f(rr, zz + S.feuerZ);
    let e = 0.004;
    u += S.expQ / (4.0 * PI) * (a / pow(dot(a, a) + e, 1.5) + b / pow(dot(b, b) + e, 1.5));
  }
  let q = z[k];
  textureStore(aus, vec2i(i, j), s, vec4f(u, q.z, q.w));
}`;

export function erzeugeTraegerAchse(device, slotPuffer) {
  const n = SLOTS * NR * NZ;
  const puf = (bytes) => device.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
  const z = [puf(n * 16), puf(n * 16)];
  const psi = puf(n * 4);
  const feld = device.createTexture({
    size: [NR, NZ, SLOTS], format: 'rgba16float',
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
  });
  const feldSicht = feld.createView({ dimension: '2d-array' });
  const samp = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  const mk = (code, name) => device.createComputePipeline({ layout: 'auto', compute: { module: modul(device, code, name), entryPoint: 'main' } });
  const pAdv = mk(ADVEKTION, 'achse-advektion'); const pLoe = mk(LOESER, 'achse-loeser'); const pGes = mk(GESCHWINDIGKEIT, 'achse-geschwindigkeit');
  const farbe = [0, 1].map((c) => { const b = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); device.queue.writeBuffer(b, 0, new Float32Array([c, 1.7, 0, 0])); return b; });
  const bg = (p, e) => device.createBindGroup({ layout: p.getBindGroupLayout(0), entries: e.map((r, i) => ({ binding: i, resource: r instanceof GPUBuffer ? { buffer: r } : r })) });
  // für beide Ping-Pong-Richtungen: [a -> b]
  const gruppen = [0, 1].map((a) => ({
    adv: bg(pAdv, [slotPuffer, z[a], z[1 - a], feldSicht, samp]),
    loe: [0, 1].map((c) => bg(pLoe, [slotPuffer, z[1 - a], psi, farbe[c]])),
    ges: bg(pGes, [slotPuffer, z[1 - a], psi, feld.createView({ dimension: '2d-array' })]),
  }));
  let richtung = 0;
  const null4 = new Float32Array(NR * NZ);
  const nullFeld = new Uint16Array(NR * NZ * 4);

  return {
    feld, feldSicht, samp,
    iterationen: 12,
    // Anfangszustand eines Slots setzen (Float32Array NR*NZ*4: ξ, b, asche, glut)
    setzeSlot(s, daten) {
      for (const b of z) device.queue.writeBuffer(b, s * NR * NZ * 16, daten);
      device.queue.writeBuffer(psi, s * NR * NZ * 4, null4);
      device.queue.writeTexture({ texture: feld, origin: [0, 0, s] }, nullFeld, { bytesPerRow: NR * 8, rowsPerImage: NZ }, [NR, NZ, 1]);
    },
    // Ein Zeitschritt für die Slots 0..hoechster. Kosten wachsen nur mit der Zahl wacher Ereignisse.
    schritt(enc, hoechster) {
      if (hoechster < 0) return;
      const g = gruppen[richtung]; const dx = NR / 8, dy = NZ / 8, dz = hoechster + 1;
      let p = enc.beginComputePass(); p.setPipeline(pAdv); p.setBindGroup(0, g.adv); p.dispatchWorkgroups(dx, dy, dz); p.end();
      p = enc.beginComputePass(); p.setPipeline(pLoe);
      for (let k = 0; k < this.iterationen; k++) for (let c = 0; c < 2; c++) { p.setBindGroup(0, g.loe[c]); p.dispatchWorkgroups(dx, dy, dz); }
      p.end();
      p = enc.beginComputePass(); p.setPipeline(pGes); p.setBindGroup(0, g.ges); p.dispatchWorkgroups(dx, dy, dz); p.end();
      richtung = 1 - richtung;
    },
    // Prüfzugriff: Feld eines Slots zurücklesen (Float32Array NR*NZ*4: u_r, u_z, asche, glut)
    async lesen(s) {
      const b = device.createBuffer({ size: NR * NZ * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      const enc = device.createCommandEncoder();
      enc.copyTextureToBuffer({ texture: feld, origin: [0, 0, s] }, { buffer: b, bytesPerRow: NR * 8, rowsPerImage: NZ }, [NR, NZ, 1]);
      device.queue.submit([enc.finish()]);
      await b.mapAsync(GPUMapMode.READ);
      const h = new Uint16Array(b.getMappedRange().slice(0)); b.destroy();
      const f = new Float32Array(h.length);
      for (let i = 0; i < h.length; i++) f[i] = halb(h[i]);
      return f;
    },
    zellenJeSlot: NR * NZ,
  };
}

export function halb(h) {
  const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 31, m = h & 1023;
  if (e === 0) return s * Math.pow(2, -14) * (m / 1024);
  if (e === 31) return m ? NaN : s * Infinity;
  return s * Math.pow(2, e - 15) * (1 + m / 1024);
}
void SLOT_N;
