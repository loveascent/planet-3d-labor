// BODEN + NARBEN: der Planet als EINE Karte (Höhe, Glut, Ruß), die Ereignisse verändern dürfen.
// Das ist das Gedächtnis des Planeten: Krater, Auswurfdecke, Lava und Asche bleiben in der Karte,
// nachdem die Ereignis-Physik wieder schläft. Kosten pro Bild: eine Texturabfrage, egal wie viele Narben.
// (Im Labor eine Längen-/Breitenkarte; im Hauptprojekt wäre es eine Zusatzschicht je Würfelseite.)
import { WGSL_GEMEINSAM } from '../gemeinsam.js';
import { WGSL_BLICK } from './marker.js';
import { modul } from '../geraet.js';
import { halb } from '../traeger/achse.js';

const KW = 1024, KH = 512;

const VOLLBILD = /* wgsl */`
struct VB { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VB {
  var o: VB; let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0); o.uv = vec2f(p.x, 1.0 - p.y); return o;
}
fn richtung(uv: vec2f) -> vec3f {
  let lon = (uv.x - 0.5) * 2.0 * PI; let lat = (0.5 - uv.y) * PI;
  return vec3f(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
}
fn h3(p: vec3i) -> f32 { return f32(pcg((u32(p.x) * 73856093u) ^ (u32(p.y) * 19349663u) ^ (u32(p.z) * 83492791u)) >> 8u) / 16777216.0; }
fn rausch(p: vec3f) -> f32 {
  let i = vec3i(floor(p)); let f = fract(p); let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3i(1, 0, 0)), u.x), mix(h3(i + vec3i(0, 1, 0)), h3(i + vec3i(1, 1, 0)), u.x), u.y),
             mix(mix(h3(i + vec3i(0, 0, 1)), h3(i + vec3i(1, 0, 1)), u.x), mix(h3(i + vec3i(0, 1, 1)), h3(i + vec3i(1, 1, 1)), u.x), u.y), u.z);
}
fn fbm(p: vec3f) -> f32 { var a = 0.5; var s = 0.0; var q = p; for (var k = 0; k < 7; k++) { s += a * (rausch(q) * 2.0 - 1.0); q = q * 2.03 + vec3f(11.7); a *= 0.5; } return s; }
`;

const BACKEN = WGSL_GEMEINSAM + VOLLBILD + /* wgsl */`
@fragment fn fs(v: VB) -> @location(0) vec4f {
  let d = richtung(v.uv);
  let h = fbm(d * 1.7 + vec3f(3.1)) * 0.022 + 0.004 + abs(fbm(d * 6.0)) * 0.004;
  return vec4f(h, 0.0, 0.0, 0.0);
}`;

// Stempel: liest die alte Karte, schreibt die neue. art 0 = Krater, 1 = Vulkankegel, 2 = Aschedecke.
const STEMPEL = WGSL_GEMEINSAM + VOLLBILD + /* wgsl */`
struct St { zentrum: vec3f, radius: f32, tiefe: f32, rand: f32, hitze: f32, russ: f32, art: f32, abkling: f32, basis: f32, seed: f32 }
@group(0) @binding(0) var<uniform> S: St;
@group(0) @binding(1) var karte: texture_2d<f32>;
@fragment fn fs(v: VB) -> @location(0) vec4f {
  var k = textureLoad(karte, vec2i(v.pos.xy), 0);
  k.g *= S.abkling;                                        // alte Glut ist seit dem letzten Stempel abgekühlt
  let d = richtung(v.uv);
  let x = acos(clamp(dot(d, S.zentrum), -1.0, 1.0)) / S.radius;
  if (x > 14.0) { return k; }
  let strahl = 0.55 + 0.9 * rausch(normalize(d - S.zentrum + vec3f(1e-5)) * 9.0 + S.seed);    // Auswurfstrahlen
  if (S.art < 0.5) {
    // Krater: Schüssel bis zum Rand, außen Auswurfdecke, Dicke ∝ r⁻³ (McGetchin 1973)
    let innen = S.basis - S.tiefe + (S.tiefe + S.rand) * x * x;
    let aussen = k.r + S.rand * pow(max(x, 1.0), -3.0) * strahl;
    k.r = mix(innen, aussen, smoothstep(0.92, 1.06, x));
    k.g += S.hitze * exp(-2.2 * x * x);
    k.b = clamp(k.b + S.russ * strahl * exp(-0.55 * x), 0.0, 1.0);
  } else if (S.art < 1.5) {
    // Schichtvulkan: nach innen gewölbte Flanke (wie src/rocky/shader/volc.js), Schlot als Schüssel
    if (x < 1.0) {
      let fl = (exp(-3.0 * x) - exp(-3.0)) / (1.0 - exp(-3.0));
      k.r = max(k.r, S.basis) + S.rand * fl - S.tiefe * (1.0 - smoothstep(0.0, 0.14, x));
    }
    k.g += S.hitze * exp(-60.0 * x * x);
    k.b = clamp(k.b + S.russ * exp(-3.0 * x * x), 0.0, 1.0);
  } else {
    k.b = clamp(k.b + S.russ * exp(-x * x) * strahl, 0.0, 1.0);
  }
  return k;
}`;

const PLANET = WGSL_GEMEINSAM + WGSL_BLICK + /* wgsl */`
@group(0) @binding(0) var<uniform> B: Blick;
@group(0) @binding(1) var karte: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
struct V { @builtin(position) pos: vec4f, @location(0) d: vec3f }
fn kuv(d: vec3f) -> vec2f { return vec2f(atan2(d.z, d.x) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(d.y, -1.0, 1.0)) / PI); }
@vertex fn vs(@location(0) d: vec3f) -> V {
  var o: V; let k = textureSampleLevel(karte, samp, kuv(d), 0.0);
  o.pos = B.vp * vec4f(d * (1.0 + max(k.r, 0.0)), 1.0); o.d = d; return o;
}
@fragment fn fs(v: V) -> @location(0) vec4f {
  let d = normalize(v.d); let uv = kuv(d);
  let k = textureSampleLevel(karte, samp, uv, 0.0);
  let e = vec2f(1.0 / ${KW}.0, 1.0 / ${KH}.0);
  let cl = max(sqrt(1.0 - d.y * d.y), 0.05);
  let ost = normalize(vec3f(-d.z, 0.0, d.x) + vec3f(1e-6, 0.0, 0.0)); let nord = cross(ost, d);
  let hO = textureSampleLevel(karte, samp, uv + vec2f(e.x, 0.0), 0.0).r - textureSampleLevel(karte, samp, uv - vec2f(e.x, 0.0), 0.0).r;
  let hN = textureSampleLevel(karte, samp, uv - vec2f(0.0, e.y), 0.0).r - textureSampleLevel(karte, samp, uv + vec2f(0.0, e.y), 0.0).r;
  let land = k.r > 0.0;
  var n = d;
  if (land) { n = normalize(d - ost * hO / (2.0 * e.x * 2.0 * PI * cl) - nord * hN / (2.0 * e.y * PI)); }
  let L = B.sonne; let ndl = max(dot(n, L), 0.0);
  let blick = normalize(B.kam - d);
  var alb: vec3f;
  if (land) {
    let h = k.r;
    alb = mix(vec3f(0.62, 0.55, 0.38), vec3f(0.16, 0.3, 0.1), smoothstep(0.0003, 0.0025, h));
    alb = mix(alb, vec3f(0.36, 0.3, 0.22), smoothstep(0.008, 0.016, h));
    alb = mix(alb, vec3f(0.9), smoothstep(0.02, 0.026, h) * (1.0 - smoothstep(0.0, 0.5, k.g)));
  } else {
    alb = mix(vec3f(0.02, 0.1, 0.22), vec3f(0.04, 0.22, 0.34), smoothstep(-0.006, 0.0, k.r));
  }
  alb = mix(alb, vec3f(0.06, 0.055, 0.05), k.b * 0.85);     // Ruß und Asche
  var c = alb * (vec3f(1.0, 0.96, 0.9) * 2.1 * ndl + vec3f(0.5, 0.62, 0.8) * 0.05);
  if (!land) { c += vec3f(1.0, 0.9, 0.7) * 2.0 * pow(max(dot(reflect(-L, n), blick), 0.0), 60.0); }
  // Glut kühlt seit dem letzten Stempel weiter ab (τ = 25 s)
  c += glutFarbe(k.g * exp(-(B.zeit - B.tStempel) / 25.0)) * select(0.25, 1.0, land);
  // Dunstsaum am Rand
  let rand = pow(1.0 - max(dot(d, blick), 0.0), 3.0);
  c = mix(c, vec3f(0.35, 0.55, 0.95) * (0.1 + 1.6 * max(dot(d, L) + 0.15, 0.0)), rand * 0.55);
  return vec4f(tonwert(c), 1.0);
}`;

export async function erzeugeBoden(device, format, blickPuffer, netz = 128) {
  const tex = () => device.createTexture({ size: [KW, KH], format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC });
  const karte = [tex(), tex()]; let akt = 0;
  const samp = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'clamp-to-edge' });
  const rp = (code, name, ziel, tiefe) => { const m = modul(device, code, name); return device.createRenderPipeline({ layout: 'auto', vertex: { module: m, entryPoint: 'vs', buffers: tiefe ? [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }] : [] }, fragment: { module: m, entryPoint: 'fs', targets: [{ format: ziel }] }, primitive: { topology: 'triangle-list', cullMode: 'none' }, ...(tiefe ? { depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' } } : {}) }); };
  const pBacken = rp(BACKEN, 'boden-backen', 'rgba16float', false);
  const pStempel = rp(STEMPEL, 'boden-stempel', 'rgba16float', false);
  const pPlanet = rp(PLANET, 'boden-planet', format, true);
  const lauf = (pipe, ziel, gruppe) => {
    const enc = device.createCommandEncoder();
    const p = enc.beginRenderPass({ colorAttachments: [{ view: ziel.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
    p.setPipeline(pipe); if (gruppe) p.setBindGroup(0, gruppe); p.draw(3); p.end();
    device.queue.submit([enc.finish()]);
  };
  lauf(pBacken, karte[0]);

  // Höhen einmal zurücklesen, damit Ereignisse wissen, wie hoch der Boden an ihrem Ort ist
  const hoehen = new Float32Array(KW * KH);
  {
    const b = device.createBuffer({ size: KW * KH * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyTextureToBuffer({ texture: karte[0] }, { buffer: b, bytesPerRow: KW * 8 }, [KW, KH]);
    device.queue.submit([enc.finish()]);
    await b.mapAsync(GPUMapMode.READ);
    const h = new Uint16Array(b.getMappedRange());
    for (let i = 0; i < KW * KH; i++) hoehen[i] = halb(h[i * 4]);
    b.unmap(); b.destroy();
  }

  // Würfelkugel-Netz
  const N = netz, ecken = new Float32Array(6 * (N + 1) * (N + 1) * 3), idx = new Uint32Array(6 * N * N * 6);
  let e = 0, q = 0;
  for (let f = 0; f < 6; f++) {
    const basis = e / 3;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const a = Math.tan((i / N - 0.5) * Math.PI / 2), b = Math.tan((j / N - 0.5) * Math.PI / 2);     // gleichwinklig
      const v = [[1, b, -a], [-1, b, a], [a, 1, -b], [a, -1, b], [a, b, 1], [-a, b, -1]][f];
      const l = Math.hypot(...v); ecken[e++] = v[0] / l; ecken[e++] = v[1] / l; ecken[e++] = v[2] / l;
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const p = basis + j * (N + 1) + i;
      idx.set([p, p + N + 1, p + 1, p + 1, p + N + 1, p + N + 2], q); q += 6;
    }
  }
  const vb = device.createBuffer({ size: ecken.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST }); device.queue.writeBuffer(vb, 0, ecken);
  const ib = device.createBuffer({ size: idx.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST }); device.queue.writeBuffer(ib, 0, idx);

  const stPuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const gPlanet = karte.map((k) => device.createBindGroup({ layout: pPlanet.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: blickPuffer } }, { binding: 1, resource: k.createView() }, { binding: 2, resource: samp }] }));
  const gStempel = karte.map((k) => device.createBindGroup({ layout: pStempel.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: stPuffer } }, { binding: 1, resource: k.createView() }] }));
  let tStempel = 0, jetzt = 0, anzahl = 0;

  return {
    an: true,
    get tStempel() { return tStempel; }, get stempelZahl() { return anzahl; },
    setzeZeit(t) { jetzt = t; },
    hoehe(d) {
      const u = (Math.atan2(d[2], d[0]) / (2 * Math.PI) + 0.5) * KW, v = (0.5 - Math.asin(Math.max(-1, Math.min(1, d[1]))) / Math.PI) * KH;
      return Math.max(hoehen[Math.min(KH - 1, Math.max(0, v | 0)) * KW + (((u | 0) % KW) + KW) % KW], 0);
    },
    // Narbe in die Karte schreiben. Ein Durchlauf über die Karte, nur wenn ein Ereignis beginnt oder endet.
    stempel(o) {
      if (!this.an) return;
      device.queue.writeBuffer(stPuffer, 0, new Float32Array([...o.zentrum, o.radius, o.tiefe, o.rand, o.hitze, o.russ, o.art, Math.exp(-(jetzt - tStempel) / 25), o.basis, Math.random() * 50]));
      lauf(pStempel, karte[1 - akt], gStempel[akt]);
      akt = 1 - akt; tStempel = jetzt; anzahl++;
    },
    zeichne(pass) { pass.setPipeline(pPlanet); pass.setBindGroup(0, gPlanet[akt]); pass.setVertexBuffer(0, vb); pass.setIndexBuffer(ib, 'uint32'); pass.drawIndexed(idx.length); },
  };
}
