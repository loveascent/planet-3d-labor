// Schalter des Labors: jeder Baustein einzeln an/aus (URL: ?aus=a,b  bzw. ?an=c).
// Regel: Ein Baustein ist EINE Datei. Wegwerfen = Datei löschen + Zeile hier + Zeile in haupt.js löschen.
export const BAUSTEINE = [
  { schluessel: 'traeger', name: 'Träger: Achsenschnitt', text: 'Die Physik des Ereignisses als dünner 2D-Schnitt (Abstand von der Achse × Höhe). Aus: nur Wurfbahnen, kein Gas.', an: true },
  { schluessel: 'marker', name: 'Sichtbar: Marker-Partikel', text: 'Partikel, die vom Träger durch den Raum getragen werden. Das ist das, was man sieht.', an: true },
  { schluessel: 'turbulenz', name: 'Turbulenz der Marker', text: 'Kleine 3D-Wirbel (ABC-Strömung), Stärke folgt der Strömungsgeschwindigkeit des Trägers.', an: true },
  { schluessel: 'schatten', name: 'Eigenschatten', text: 'Jeder Marker misst, wie viel Asche zwischen ihm und der Sonne liegt.', an: true },
  { schluessel: 'ballistik', name: 'Wurfgeschosse', text: 'Auswurf und Lavabomben auf Wurfbahnen mit Luftwiderstand gegen das Gas des Trägers.', an: true },
  { schluessel: 'staub', name: 'Staub vom Boden', text: 'Bodenwind über der Schwelle hebt Staub: daraus entsteht der Stiel des Pilzes.', an: true },
  { schluessel: 'narben', name: 'Narben im Boden', text: 'Krater, Auswurfdecke, Glut und Ruß bleiben in der Planetenkarte, nachdem die Physik schläft.', an: true },
  { schluessel: 'wind', name: 'Höhenwind', text: 'Schert die Wolke mit der Höhe (Näherung: der Träger selbst rechnet ohne Wind).', an: false },
  { schluessel: 'schnitt', name: 'Schnittbild (Prüfansicht)', text: 'Zeigt das Trägerfeld des ersten wachen Slots als Bild.', an: false },
];
export function schalterAusUrl(qs) {
  const s = Object.fromEntries(BAUSTEINE.map((b) => [b.schluessel, b.an]));
  for (const k of (qs.get('aus') || '').split(',')) if (k in s) s[k] = false;
  for (const k of (qs.get('an') || '').split(',')) if (k in s) s[k] = true;
  return s;
}
