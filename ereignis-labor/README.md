# Ereignis-Labor (WebGPU)

Labor für **eine** Frage: Wie werden aus „gemalten" Planeten Planeten, deren Luft und Boden auf
Vulkan, Atombombe und Einschlag reagieren, ohne dass ein Handy einbricht?

Der gefundene Weg und alle Messwerte stehen in [WEG.md](WEG.md). Kurzfassung:

- **Träger** (Physik): ein dünner 2D-Schnitt je Ereignis (Abstand von der Achse × Höhe), 64 × 128 Zellen.
- **Sichtbares**: Marker-Partikel im echten 3D-Raum, vom Träger getragen.
- **Gedächtnis**: eine Planetenkarte (Höhe, Glut, Ruß), in die Ereignisse ihre Narben schreiben.
- **Pool**: Physik läuft nur, solange ein Ereignis wach ist. Nichts wach = keine Rechenpässe.

## Starten

```bash
npm install
npm run bauen                 # dist/ereignis.html: eine einzige Datei, läuft per Doppelklick und am Handy
```

Die Seite braucht WebGPU (Chrome/Edge aktuell, Android-Chrome 121+, Safari 26+).

## Prüfen (immer Zeitraster, nie Einzelbild)

```bash
node test/rauch.mjs                 # lädt, zündet jedes Ereignis, meldet Shader-Fehler
node test/raster.mjs ereignisse     # Zeilen = Ereignisse, Spalten = Zeitpunkte -> test/aus/raster_ereignisse.jpg
node test/raster.mjs bausteine      # dasselbe Ereignis, je ein Baustein abgeschaltet
node test/raster.mjs schnitt        # mit Prüfansicht des Trägerfelds
node test/raster.mjs orbit          # aus dem All
node test/physik.mjs                # Träger gegen die Literatur (Steighöhe, Divergenz)
node test/kosten.mjs                # Zeit je Rechenschritt, Vergleich mit der Tasse
```

Die Prüfungen laufen in Chromium mit Software-WebGPU (SwiftShader). Bilder und Physik stimmen,
**Zeiten sind keine Handy-Zeiten** (nur die Verhältnisse zählen).

## Aufbau: ein Baustein = eine Datei

```
src/gemeinsam.js          Gitter, Slot-Aufbau, gemeinsame WGSL-Stücke (einzige geteilte Stelle)
src/bausteine.js          Liste der Schalter (?aus=turbulenz,schatten  /  ?an=wind,schnitt)
src/ereignisse.js         Pool: zünden, wach halten, schlafen legen; Vorlagen Vulkan / Bombe / Einschlag
src/formeln.js            Formeln aus der Literatur, rein rechnerisch (Krater, Sedov-Taylor, Fahnenhöhe)
src/traeger/achse.js      TRÄGER: Achsenschnitt (Wirbelstärke-Stromfunktion, Boussinesq)
src/sichtbar/marker.js    SICHTBAR: Marker-Partikel (Gas-Marker + Wurfgeschosse)
src/sichtbar/boden.js     Planet + Narbenkarte
src/sichtbar/schnitt.js   Prüfansicht des Trägerfelds
src/haupt.js              Verdrahtung, sonst nichts
src/bedienung.js          Knöpfe und Regler
```

**Regeln, damit es wegwerfbar bleibt**

1. Ein Baustein kennt nur `gemeinsam.js`, nie einen anderen Baustein.
2. Der Träger gibt genau eine Textur ab: `feld[slot] = (u_r, u_z, asche, glut)`. Wer einen anderen
   Träger ausprobiert (z. B. grobes 3D-Gitter), liefert dieselbe Textur und lässt alles andere stehen.
3. Wegwerfen = Datei löschen + eine Zeile in `bausteine.js` + eine Zeile in `haupt.js`.
4. Neues Verfahren = neue Datei neben der alten, eigene Zeile im Zeitraster, dann vergleichen.
