// BEDIENUNG: Knöpfe, Schalter, Regler, Drehen/Zoomen. Kennt nur die api aus haupt.js.
export function baueBedienung(api, BAUSTEINE) {
  const { Z, schalter } = api;
  const el = (tag, attrs = {}, ...kinder) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); } e.append(...kinder); return e; };
  const feld = document.getElementById('bedienung');
  const zuende = (name, opt) => api.zuende(name, opt);

  feld.append(
    el('div', { class: 'reihe' },
      el('button', { text: 'Vulkan', onclick: () => zuende('vulkan') }),
      el('button', { text: 'Atombombe', onclick: () => zuende('bombe') }),
      el('button', { text: 'Asteroid', onclick: () => zuende('einschlag') }),
      el('button', { text: '8 auf einmal', onclick: () => api.stresstest() }),
    ),
    el('div', { class: 'reihe' },
      el('button', { text: 'Zum Ereignis', onclick: () => { if (api.letzter) api.ansicht(api.letzter.ort, api.letzter.skala); } }),
      el('button', { text: 'Ganzer Planet', onclick: () => api.ansicht(null) }),
      el('button', { text: 'Pause', onclick: (e) => { Z.pause = !Z.pause; e.target.textContent = Z.pause ? 'Weiter' : 'Pause'; } }),
      el('button', { text: 'Alles aus', onclick: () => api.ereignisse.alleSchlafen() }),
    ),
  );
  const regler = (name, min, max, wert, schritt, setze, fmt = (v) => v) => {
    const zahl = el('span', { text: fmt(wert) });
    feld.append(el('label', { class: 'regler' }, el('span', { text: name }), el('input', { type: 'range', min, max, step: schritt, value: wert, oninput: (e) => { setze(+e.target.value); zahl.textContent = fmt(+e.target.value); } }), zahl));
  };
  regler('Marker', 50, 2000, api.marker.anzahl / 1000, 50, (v) => api.markerNeu(v * 1000), (v) => v + 'k');
  regler('Größe', 0.3, 2.5, 1, 0.1, (v) => { Z.groesse = v; }, (v) => '×' + v);
  regler('Tempo', 0.2, 3, Z.tempo, 0.1, (v) => { Z.tempo = v; }, (v) => '×' + v);
  regler('Löser-Schritte', 2, 40, api.traeger.iterationen, 1, (v) => { api.traeger.iterationen = v; });

  const liste = el('details', {}, el('summary', { text: 'Bausteine an/aus' }));
  for (const b of BAUSTEINE) {
    liste.append(el('label', { class: 'schalter', title: b.text },
      el('input', { type: 'checkbox', ...(schalter[b.schluessel] ? { checked: '' } : {}), onchange: (e) => { schalter[b.schluessel] = e.target.checked; } }),
      el('span', {}, el('b', { text: b.name }), el('small', { text: ' ' + b.text }))));
  }
  feld.append(liste);

  // Drehen (ziehen), Zoomen (Rad / zwei Finger)
  const c = document.getElementById('bild'), zeiger = new Map(); let abstand = 0;
  c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); zeiger.set(e.pointerId, [e.clientX, e.clientY]); });
  c.addEventListener('pointerup', (e) => { zeiger.delete(e.pointerId); abstand = 0; });
  c.addEventListener('pointercancel', (e) => { zeiger.delete(e.pointerId); abstand = 0; });
  c.addEventListener('pointermove', (e) => {
    if (!zeiger.has(e.pointerId)) return;
    const alt = zeiger.get(e.pointerId); zeiger.set(e.pointerId, [e.clientX, e.clientY]);
    const k = Z.kam, nah = Math.hypot(...k.ziel) > 0.5;
    if (zeiger.size === 1) {
      k.az += (e.clientX - alt[0]) * 0.006 * (nah ? -1 : 1);
      k.el = Math.max(nah ? -0.2 : -1.5, Math.min(1.5, k.el + (e.clientY - alt[1]) * 0.006));
    } else if (zeiger.size === 2) {
      const [a, b] = [...zeiger.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (abstand > 0) k.dist = grenze(k.dist * abstand / d, nah);
      abstand = d;
    }
  });
  c.addEventListener('wheel', (e) => { e.preventDefault(); const k = Z.kam; k.dist = grenze(k.dist * Math.exp(e.deltaY * 0.001), Math.hypot(...k.ziel) > 0.5); }, { passive: false });
  const grenze = (d, nah) => Math.max(nah ? 0.03 : 1.25, Math.min(nah ? 3 : 8, d));
}
