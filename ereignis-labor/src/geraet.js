// WebGPU-Gerät holen. Sonst nichts.
export async function geraetHolen() {
  if (!navigator.gpu) throw new Error('Dieser Browser hat kein WebGPU.');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('Kein WebGPU-Adapter gefunden.');
  const device = await adapter.requestDevice();
  device.addEventListener('uncapturederror', (e) => console.error('GPU-Fehler: ' + e.error.message));
  return { device, adapter, format: navigator.gpu.getPreferredCanvasFormat() };
}
export const modul = (device, code, name) => {
  const m = device.createShaderModule({ code, label: name });
  m.getCompilationInfo().then((i) => { for (const x of i.messages) if (x.type === 'error') console.error(`WGSL ${name} Zeile ${x.lineNum}: ${x.message}`); });
  return m;
};
