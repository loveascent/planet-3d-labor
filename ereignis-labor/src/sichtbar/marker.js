// SICHTBAR "Marker": Partikel, die vom Träger durch den 3D-Raum getragen werden.
// Der Träger kennt nur (r, z). Ein Marker hat einen echten 3D-Ort: sein Abstand von der Achse und seine Höhe
// bestimmen, welche Strömung er spürt, sein Winkel um die Achse bleibt frei. Dazu kleine 3D-Wirbel (ABC-Strömung).
// Zwei Sorten: Gas-Marker (folgen der Strömung) und Wurfgeschosse (Wurfbahn + Luftwiderstand gegen das Gas).
// Marker ohne waches Ereignis ruhen und kosten fast nichts.
import { WGSL_GEMEINSAM } from '../gemeinsam.js';
import { modul } from '../geraet.js';

export const WGSL_BLICK = /* wgsl */`
struct Blick { vp: mat4x4f, kam: vec3f, zeit: f32, sonne: vec3f, dt: f32, aufl: vec2f, bild: f32, schalter: f32, tStempel: f32, pix: f32, anzahl: f32, brenn: f32 }
fn tonwert(c: vec3f) -> vec3f {            // ACES-Näherung (Narkowicz 2015) + Gamma
  let x = c * 0.8;
  return pow(clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
}
`;
const P_STRUCT = /* wgsl */`
struct P { pos: vec3f, alter: f32, vel: vec3f, art: f32, licht: f32, dichte: f32, glut: f32, gr: f32 }
`;

const RECHNEN = WGSL_GEMEINSAM + WGSL_BLICK + P_STRUCT + /* wgsl */`
@group(0) @binding(0) var<uniform> B: Blick;
@group(0) @binding(1) var<storage, read> slots: array<Slot>;
@group(0) @binding(2) var<storage, read_write> ps: array<P>;
@group(0) @binding(3) var feld: texture_2d_array<f32>;
@group(0) @binding(4) var samp: sampler;

fn gas(s: u32, p: vec3f) -> vec4f {        // Träger am Ort p: (u_r, u_z, asche, glut)
  let r = length(p.xy);
  if (r > RD || p.z > HD) { return vec4f(0.0); }
  var f = textureSampleLevel(feld, samp, vec2f(r / RD, p.z / HD), s, 0.0);
  f.x *= min(r / (0.5 * H), 1.0);
  return f;
}
fn abc(p: vec3f, t: f32) -> vec3f {        // Arnold-Beltrami-Childress-Strömung, 2 Größen, exakt divergenzfrei
  let a = p * 7.0 + vec3f(0.0, 1.3, 2.1) + t * vec3f(0.31, -0.23, 0.17);
  let b = p * 16.0 + vec3f(4.0, 0.7, 2.9) - t * vec3f(0.4, 0.33, -0.5);
  return vec3f(sin(a.z) + cos(a.y), sin(a.x) + cos(a.z), sin(a.y) + cos(a.x)) * 0.6
       + vec3f(sin(b.z) + cos(b.y), sin(b.x) + cos(b.z), sin(b.y) + cos(b.x)) * 0.4;
}
fn kreis(r: f32, phi: f32) -> vec2f { return r * vec2f(cos(phi), sin(phi)); }

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= u32(B.anzahl)) { return; }
  // Zuteilung: fester Zufallswert je Marker gegen die kumulierten Anteile der wachen Ereignisse
  let a = f32(pcg(i) >> 8u) / 16777216.0;
  var s = SLOTS;
  for (var k = 0u; k < SLOTS; k++) { if (a < slots[k].anteil) { s = k; break; } }
  var p = ps[i];
  if (s == SLOTS) { if (p.alter >= 0.0) { p.alter = -1.0; ps[i] = p; } return; }
  let S = slots[s];
  let dt = S.dt;
  let schalter = u32(B.schalter);
  var seed = pcg(i * 9781u + u32(B.bild) * 6271u + 17u);
  var sorte = u32(p.art) >> 6u;
  var tot = p.alter < 0.0 || (u32(p.art) & 63u) != s;
  var geboren = false;

  if (S.neu > 0.5) {
    // Zündung: Feuerball besetzen, Auswurf starten, Rest bleibt Reserve für aufgewirbelten Staub
    tot = true;
    let u1 = zuf(&seed);
    if (u1 < S.feuerAnteil) {
      let d = normalize(vec3f(zuf(&seed), zuf(&seed), zuf(&seed)) * 2.0 - 1.0) * S.feuerR * pow(zuf(&seed), 0.333);
      p.pos = vec3f(d.xy, abs(d.z + S.feuerZ) + 0.01);
      p.vel = vec3f(0.0); sorte = 0u; p.gr = 0.03 + 0.03 * zuf(&seed); geboren = true;
    } else if (u1 < S.feuerAnteil + S.bombenAnteil && S.art > 2.5 && (schalter & 4u) != 0u) {
      // Auswurf (Z-Modell-artig): je näher am Zentrum gestartet, desto schneller. v ∝ (x/R)^(−1/μ), μ ≈ 0,55 (Housen & Holsapple 2011)
      let x = sqrt(mix(0.03, 1.0, zuf(&seed)));
      let phi = 6.2832 * zuf(&seed);
      let v = min(S.ejV * pow(x, -1.8), 5.0 * S.ejV) * (0.85 + 0.3 * zuf(&seed));
      let w = radians(45.0 + 14.0 * (zuf(&seed) - 0.5));
      p.pos = vec3f(kreis(x * S.kraterR, phi), 0.02);
      p.vel = vec3f(kreis(v * cos(w), phi), v * sin(w));
      sorte = 1u; p.gr = 0.008 + 0.02 * zuf(&seed) * zuf(&seed); p.licht = clamp(v / (3.0 * S.ejV), 0.0, 1.0); geboren = true;
    }
  } else if (tot && zuf(&seed) < S.spawn * dt) {
    if (S.qAn > 0.5 && zuf(&seed) < 0.8) {
      // Schlot: Gas-Marker, ein Teil als Lavabomben
      p.pos = vec3f(kreis(S.qR * sqrt(zuf(&seed)), 6.2832 * zuf(&seed)), S.qH * zuf(&seed));
      if (zuf(&seed) < S.bombenAnteil && (schalter & 4u) != 0u) {
        let w = 0.5 * zuf(&seed); let v = S.ejV * (0.5 + 0.9 * zuf(&seed));
        p.vel = vec3f(kreis(v * sin(w), 6.2832 * zuf(&seed)), v * cos(w));
        sorte = 1u; p.gr = 0.006 + 0.012 * zuf(&seed); p.licht = 1.0;
      } else { p.vel = vec3f(0.0); sorte = 0u; p.gr = 0.025 + 0.03 * zuf(&seed); }
      geboren = true;
    } else if (S.heben > 0.0 && (schalter & 8u) != 0u) {
      // Staub: Kandidat am Boden, wird nur geboren, wo der Träger gerade Staub hebt
      let q = vec3f(kreis(1.5 * zuf(&seed), 6.2832 * zuf(&seed)), H * (0.3 + zuf(&seed)));
      let f = gas(s, q);
      if (zuf(&seed) < S.heben * max(abs(f.x) - S.schwelle, 0.0) * 0.6) {
        p.pos = q; p.vel = vec3f(0.0); sorte = 0u; p.gr = 0.025 + 0.03 * zuf(&seed); geboren = true;
      }
    }
  }
  if (geboren) { tot = false; p.alter = 0.0; p.dichte = 1.0; p.glut = 0.0; if (sorte == 0u) { p.licht = 1.0; } }
  if (tot) {
    if (p.alter >= 0.0 || (u32(p.art) & 63u) != s) { p.alter = -1.0; p.art = f32(s); ps[i] = p; }
    return;
  }

  p.alter += dt;
  let f = gas(s, p.pos);
  if (sorte == 0u) {
    // Gas-Marker: vom Träger getragen
    let rr = length(p.pos.xy);
    var u = vec3f(p.pos.xy / max(rr, 1e-5) * f.x, f.y);
    if ((schalter & 1u) != 0u) { u += abc(p.pos + S.seed, S.t) * S.turb * length(f.xy); }
    p.pos += u * dt;
    p.pos.z = max(p.pos.z, 0.004);
    let ende = S.leben * (0.5 + 0.5 * f32(pcg(i + 77u) & 255u) / 255.0);
    p.dichte = clamp((ende - p.alter) / 4.0, 0.0, 1.0);          // die Marker SIND die Wolke; sie verblassen am Lebensende
    p.glut = f.w;
    if (p.alter > ende || rr > RD * 0.97 || p.pos.z > HD * 0.97) { p.alter = -1.0; }
    // Eigenschatten: Asche zwischen Marker und Sonne aufsummieren (jeder Marker jedes 4. Bild)
    if ((schalter & 2u) != 0u) {
      if (((i + u32(B.bild)) & 3u) == 0u) {
        let L = B.sonne * basis(vec3f(S.upx, S.upy, S.upz));     // Sonne in Ereignis-Koordinaten
        var tau = 0.0; var q = p.pos;
        for (var k = 0; k < 6; k++) {
          q += L * 0.13;
          if (q.z < 0.0) { tau += 9.0; break; }
          tau += gas(s, q).z * 0.13;
        }
        // Wolkenoberfläche: die Asche nimmt nach außen ab, also zeigt −∇asche nach außen
        let er = p.pos.xy / max(rr, 1e-5); let e = 1.5 * H;
        let gr = gas(s, p.pos + vec3f(er * e, 0.0)).z - gas(s, p.pos - vec3f(er * e, 0.0)).z;
        let gz = gas(s, p.pos + vec3f(0.0, 0.0, e)).z - gas(s, p.pos - vec3f(0.0, 0.0, e)).z;
        let nrm = -vec3f(er * gr, gz) / max(length(vec2f(gr, gz)), 0.02);
        p.licht = exp(-5.0 * tau) * (0.55 + 0.45 * clamp(dot(nrm, L), -1.0, 1.0));
      }
    } else { p.licht = 1.0; }
  } else if (sorte == 1u) {
    // Wurfgeschoss: Schwerkraft + Luftwiderstand gegen das Gas des Trägers
    let rr = length(p.pos.xy);
    let ug = vec3f(p.pos.xy / max(rr, 1e-5) * f.x, f.y);
    p.vel += (vec3f(0.0, 0.0, -S.g) + (ug - p.vel) / 5.0) * dt;
    p.pos += p.vel * dt;
    p.glut = 1.6 * p.licht * exp(-0.5 * p.alter); p.dichte = 1.0;
    if (p.pos.z <= 0.0) { p.pos.z = 0.003; p.vel = vec3f(0.0); sorte = 2u; }
    if (rr > RD * 3.0) { p.alter = -1.0; }
  } else {
    p.glut = 1.6 * p.licht * exp(-0.5 * p.alter);               // gelandet: kühlt aus und bleibt liegen
    if (p.alter > S.leben * 0.5) { p.alter = -1.0; }
  }
  p.art = f32(s + (sorte << 6u));
  ps[i] = p;
}`;

const ZEICHNEN = WGSL_GEMEINSAM + WGSL_BLICK + P_STRUCT + /* wgsl */`
@group(0) @binding(0) var<uniform> B: Blick;
@group(0) @binding(1) var<storage, read> slots: array<Slot>;
@group(0) @binding(2) var<storage, read> ps: array<P>;
struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) farbe: vec3f, @location(2) dichte: f32, @location(3) grund: vec3f, @location(4) lv: vec3f }

@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
  var o: V;
  let p = ps[ii];
  if (p.alter < 0.0) { o.pos = vec4f(0.0, 0.0, -2.0, 1.0); return o; }
  let S = slots[u32(p.art) & 63u];
  let sorte = u32(p.art) >> 6u;
  var lp = p.pos;
  if ((u32(B.schalter) & 16u) != 0u) { lp.x += S.wind * min(S.t, 25.0) * lp.z / HD; }      // Höhenwind schert die Wolke
  let w = lokalZuWelt(lp, vec3f(S.upx, S.upy, S.upz), S.skala, S.bodenH);
  let clip = B.vp * vec4f(w, 1.0);
  var rad = p.gr * S.skala;
  if (sorte == 0u) { rad *= 1.0 + 0.05 * p.alter; }
  let px = max(rad * B.brenn / max(clip.w, 1e-4), B.pix);
  let ecke = vec2f(f32(vi & 1u), f32(vi >> 1u)) * 2.0 - 1.0;
  o.pos = clip + vec4f(ecke * px / (B.aufl * 0.5) * clip.w, 0.0, 0.0);
  o.uv = ecke;
  // Sonnenrichtung im Bildraum, damit jeder Marker als kleine Kugel eine helle und eine dunkle Seite bekommt
  let c2 = B.vp * vec4f(w + B.sonne * 0.01, 1.0);
  let d2 = c2.xy / c2.w - clip.xy / clip.w;
  let lz = dot(B.sonne, normalize(B.kam - w));
  o.lv = vec3f(normalize(d2 * B.aufl + vec2f(1e-6)) * sqrt(max(1.0 - lz * lz, 0.0)), lz);
  let tag = smoothstep(-0.1, 0.25, dot(normalize(w), B.sonne));
  if (sorte == 0u) {
    let alb = vec3f(S.fr, S.fg, S.fb);
    o.farbe = alb * vec3f(1.0, 0.95, 0.88) * 2.1 * p.licht * tag;
    o.grund = alb * vec3f(0.45, 0.58, 0.8) * 0.3 * (0.25 + 0.75 * p.licht) * (0.12 + tag) + glutFarbe(p.glut);
    o.dichte = p.dichte;
  } else {
    o.farbe = vec3f(0.3, 0.26, 0.22) * 2.0 * tag;
    o.grund = vec3f(0.02) + glutFarbe(p.glut);
    o.dichte = 9.0;
  }
  return o;
}
@fragment fn fs(v: V) -> @location(0) vec4f {
  let d2 = dot(v.uv, v.uv);
  if (d2 > 1.0) { discard; }
  // dünner Rand der Wolke: Marker lösen sich körnig auf statt hart zu enden
  let n = fract(sin(dot(floor(v.pos.xy), vec2f(12.9898, 78.233))) * 43758.5453);
  if (v.dichte < 1.0 && n > v.dichte) { discard; }
  let lam = dot(vec3f(v.uv, sqrt(1.0 - d2)), v.lv);
  return vec4f(tonwert(v.farbe * (0.5 + 0.5 * clamp(lam * 0.8 + 0.35, 0.0, 1.0)) + v.grund), 1.0);
}`;

export function erzeugeMarker(device, format, blickPuffer, slotPuffer, traeger, anzahl) {
  const ps = device.createBuffer({ size: anzahl * 48, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  {  // alle Marker ruhend anlegen (alter = −1)
    const f = new Float32Array(anzahl * 12);
    for (let i = 0; i < anzahl; i++) { f[i * 12 + 3] = -1; f[i * 12 + 7] = 63; }
    device.queue.writeBuffer(ps, 0, f);
  }
  const pR = device.createComputePipeline({ layout: 'auto', compute: { module: modul(device, RECHNEN, 'marker-rechnen'), entryPoint: 'main' } });
  const mZ = modul(device, ZEICHNEN, 'marker-zeichnen');
  const pZ = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: mZ, entryPoint: 'vs' },
    fragment: { module: mZ, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-strip' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
  });
  const gR = device.createBindGroup({ layout: pR.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: blickPuffer } }, { binding: 1, resource: { buffer: slotPuffer } }, { binding: 2, resource: { buffer: ps } },
    { binding: 3, resource: traeger.feldSicht }, { binding: 4, resource: traeger.samp }] });
  const gZ = device.createBindGroup({ layout: pZ.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: blickPuffer } }, { binding: 1, resource: { buffer: slotPuffer } }, { binding: 2, resource: { buffer: ps } }] });
  return {
    anzahl,
    schritt(enc) { const p = enc.beginComputePass(); p.setPipeline(pR); p.setBindGroup(0, gR); p.dispatchWorkgroups(Math.ceil(anzahl / 64)); p.end(); },
    zeichne(pass) { pass.setPipeline(pZ); pass.setBindGroup(0, gZ); pass.draw(4, anzahl); },
    freigeben() { ps.destroy(); },
  };
}
