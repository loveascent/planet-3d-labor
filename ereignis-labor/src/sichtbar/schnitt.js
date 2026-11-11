// PRÜFANSICHT "Schnittbild": zeigt das Trägerfeld eines Slots als Bild unten links.
// Rot = Glut, Grau = Asche, Blau/Grün = Strömung nach oben/unten. Nur zum Nachsehen, was die Physik gerade tut.
import { WGSL_GEMEINSAM } from '../gemeinsam.js';
import { modul } from '../geraet.js';
const CODE = WGSL_GEMEINSAM + /* wgsl */`
@group(0) @binding(0) var feld: texture_2d_array<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> U: vec4f;
struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> V {
  var o: V; let p = vec2f(f32(i & 1u), f32(i >> 1u));
  o.pos = vec4f(-0.98 + p.x * 0.5 * U.y, -0.98 + p.y * 1.0, 0.0, 1.0); o.uv = vec2f(p.x, p.y); return o;
}
@fragment fn fs(v: V) -> @location(0) vec4f {
  let f = textureSampleLevel(feld, samp, v.uv, u32(U.x), 0.0);
  let c = vec3f(0.02) + vec3f(0.5) * clamp(f.z, 0.0, 1.5) + vec3f(1.0, 0.25, 0.0) * clamp(f.w, 0.0, 2.0) + vec3f(0.0, 0.25, 0.6) * clamp(f.y, 0.0, 2.0) + vec3f(0.0, 0.5, 0.1) * clamp(-f.y, 0.0, 2.0);
  return vec4f(pow(clamp(c, vec3f(0.0), vec3f(1.0)), vec3f(0.6)), 1.0);
}`;
export function erzeugeSchnitt(device, format, traeger) {
  const m = modul(device, CODE, 'schnitt');
  const p = device.createRenderPipeline({ layout: 'auto', vertex: { module: m, entryPoint: 'vs' }, fragment: { module: m, entryPoint: 'fs', targets: [{ format }] }, primitive: { topology: 'triangle-strip' }, depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' } });
  const u = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const g = device.createBindGroup({ layout: p.getBindGroupLayout(0), entries: [{ binding: 0, resource: traeger.feldSicht }, { binding: 1, resource: traeger.samp }, { binding: 2, resource: { buffer: u } }] });
  return { zeichne(pass, slot, seite = 1) { device.queue.writeBuffer(u, 0, new Float32Array([slot, seite, 0, 0])); pass.setPipeline(p); pass.setBindGroup(0, g); pass.draw(4); } };
}
