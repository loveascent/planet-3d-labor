# Der Weg: von der gemalten Kugel zum Planeten, der reagiert

> **Gegen das Ziel geprüft am 10.11.2026** (Ziel und Messbilder: `ZIEL.md`, `ziel-bilder/`; Prüffrage: „Kann der Planet nach diesem Schritt aufreißen oder zerbrechen?“).
> - **Verfehlt das Ziel:** Der Planet bleibt eine 2D-Karte, Ereignisse werden gestempelt, die Wolke ist ein 2D-Schnitt mit Markern (in `ZIEL.md` K8 und K10). Abschnitt 7 („Wie es in procedural-planets hineinkommt“) und Abschnitt 8 („Nächste Schritte“) sind gestrichen.
> - **Falsch:** „Mond stürzt in den Planeten ist eine andere Größenordnung“ als Grund, es auszulassen. Das ist ein Kernfall des Ziels.
> - **Brauchbar:** schlafende Physik (nur rechnen, wo etwas passiert), die Messung gegen Morton-Taylor-Turner, die Narbenkarte für bleibende Folgen.


Stand 10.11.2026. Diese Datei hält fest, was gesucht wurde, was gefunden wurde, was gemessen ist
und was als Nächstes kommt. Bilder: `bilder/` (neu erzeugen mit `node test/raster.mjs …`, Ausgabe in `test/aus/`).

## 1. Das Problem in einem Satz

Die schöne 2D-Oberfläche auf der Kugel kann nicht auf Ereignisse reagieren, eine volle 3D-Luft
(die Tasse) kostet aber schon für **ein** Ereignis zu viel, und zehn Vulkane oder hundert
Einschläge sind damit ausgeschlossen.

## 2. Was fehlte

Bisher gab es nur zwei Stufen: „2D auf der Kugel" (billig, aber starr) und „3D-Gitter" (reagiert,
aber unbezahlbar). Dazwischen fehlte eine Stufe. Drei Beobachtungen schließen die Lücke:

1. **Ein Ereignis ist um seine Hochachse fast rund.** Vulkansäule, Atompilz, Einschlagwolke,
   Gewitterturm, Wirbelsturm: Die tragende Strömung hängt nur vom Abstand zur Achse und von der
   Höhe ab. Man braucht für die Physik also kein 3D-Gitter, sondern einen **2D-Schnitt (r, z)**.
   Bei gleicher Auflösung sind das 8 192 statt rund 500 000 Zellen.
2. **Das Sichtbare muss nicht dort gerechnet werden, wo die Physik gerechnet wird** (die Erkenntnis
   aus dem Wasserkugel-Labor). Der Schnitt trägt, Marker-Partikel zeigen. Die Marker haben einen
   echten 3D-Ort; ihr Winkel um die Achse ist frei, dazu kommen kleine 3D-Wirbel. So sieht ein
   2D-Träger nach 3D aus.
3. **Physik darf schlafen.** Der Planet behält nur die Folgen (Krater, Auswurfdecke, Glut, Ruß) in
   einer Karte. Ein Ereignis weckt einen Schnitt, läuft ab, schreibt seine Narbe und gibt den
   Schnitt wieder frei.

## 3. Das ist nicht neu erfunden, sondern zusammengesetzt

| Teil | Woher | Wofür es dort benutzt wird |
|---|---|---|
| 2D-Strömung + passiv mitgetragene Partikel + Turbulenzspektrum für große Rauchwolken | Rasmussen, Nguyen, Geiger, Fedkiw: *Smoke Simulation for Large Scale Phenomena*, SIGGRAPH 2003 | Atomexplosionen im Film (ILM). Genau dieses Prinzip, hier in Echtzeit auf der GPU. |
| Achsensymmetrische Modelle für Vulkansäulen und Wirbelstürme | ATHAM (Oberhuber u. a. 1998), Rotunno & Emanuel 1987 | Forschung: Vulkanfahnen und Hurrikane werden als (r, z)-Schnitt gerechnet. |
| Transport ohne Zeitschrittgrenze | Stam, *Stable Fluids*, 1999 (wie im Hauptprojekt) | – |
| Wirbelstärke-Stromfunktion statt Druck | Lehrbuch-Verfahren | Strömung ist immer exakt divergenzfrei, auch wenn der Löser nicht fertig ist. |
| Auftrieb in geschichteter Luft, Schirm an der Sperrschicht | Morton, Taylor & Turner 1956 | Steighöhe von Fahnen und Wärmeblasen. |
| Feuerball dehnt sich | Sedov / Taylor (starke Explosion), R ∝ (E t²/ρ)^(1/5) | – |
| Kraterdurchmesser, Rand, Auswurfdecke ∝ r⁻³ | Collins, Melosh & Marcus 2005; McGetchin 1973 | Earth Impact Effects Program. |
| Auswurfgeschwindigkeit ∝ (x/R)^(−1/μ) | Housen & Holsapple 2011 | Auswurfvorhang. |
| Kleine 3D-Wirbel der Marker | Arnold-Beltrami-Childress-Strömung (exakt divergenzfrei) | Platzhalter; Rasmussen 2003 nimmt ein Kolmogorov-Spektrum (Stam & Fiume 1993), das ist der bessere Ersatz. |
| Vulkankegel-Profil | `src/rocky/shader/volc.js` aus procedural-planets | – |

Eine fertige offene WebGPU-Umsetzung genau dieser Kombination hat die Suche nicht gefunden
(gefunden: 3D-Gitter-Rauch, MLS-MPM, Wolken-Raymarcher). Übernehmbar war also das Verfahren,
nicht der Code. Nicht online nachgeprüft, sondern aus dem Gedächtnis: die Vorfaktoren 5,0
(Fahnenhöhe) und 2,66 (Blasenhöhe) sowie die Exponenten 0,78 / 0,44 / −0,22 der Kraterformel.
Bestätigt wurden der Vorfaktor 1,161 und die Form H ∝ F^(1/4) N^(−3/4).

## 4. Aufbau

```
Planetenkarte (2D, immer da)      Höhe · Glut · Ruß        <- Narben bleiben, eine Texturabfrage je Pixel
        ^ Stempel beim Zünden und beim Einschlafen
Ereignis-Pool (8 Slots)           weckt, hält wach, legt schlafen
        v
Träger je Slot (2D-Schnitt)       64 × 128 Zellen: Wirbel ξ, Auftrieb b, Asche, Glut  ->  feld = (u_r, u_z, asche, glut)
        v
Marker (3D, das Sichtbare)        Gas-Marker folgen feld + kleine 3D-Wirbel; Wurfgeschosse fliegen Wurfbahnen
```

Was aus den Gleichungen von selbst entsteht (nicht geskriptet): Wirbelring und Kappe des Pilzes,
der Stiel aus aufgewirbeltem Bodenstaub, das Stehenbleiben und Ausbreiten an der Sperrschicht
(Schirm), die Fußwolke am Boden, die Vulkansäule mit Schirm.

## 5. Gemessen

**Physik des Trägers gegen die Literatur** (`node test/physik.mjs`, Wärmeblase in geschichteter Luft):

| Prüfung | gemessen | Theorie (Morton, Taylor & Turner) |
|---|---|---|
| 4× stärkere Schichtung N²: Steighöhe mal | 0,61 | 0,71 |
| 4× mehr Auftrieb: Steighöhe mal | 1,40 | 1,41 |
| Divergenz der Strömung (relativ) | 0,06 % | 0 |

Der Auftriebs-Exponent stimmt, der Schichtungs-Exponent liegt 14 % daneben (grobes Gitter, die Blase
ist nur rund zehn Zellen groß).

**Kosten je Rechenschritt** (`node test/kosten.mjs`, Software-Renderer auf 4 CPU-Kernen, ohne Zeichnen;
nur die Verhältnisse zählen, das sind keine Handy-Zeiten):

| Fall | Zeit |
|---|---|
| nichts wach, 200k Marker | 0,0 ms |
| 1 Ereignis, nur Träger | 7,3 ms |
| 8 Ereignisse, nur Träger | 52,8 ms |
| 1 Ereignis, nur 200k Marker | 38,0 ms |
| 1 Ereignis, Träger + 200k Marker | 49,2 ms |
| 8 Ereignisse, Träger + 200k Marker | 95,4 ms |
| 8 Ereignisse, Träger + 1 Mio Marker | 251 ms |

Was das zeigt: Schlafende Physik kostet nichts. Der Träger wächst gerade mit der Zahl wacher
Ereignisse (rund 6,6 ms je Ereignis in dieser Umgebung). Die Marker kosten fast unabhängig von der
Zahl der Ereignisse, weil der Vorrat geteilt wird.

**Vergleich mit der Tasse (gerechnet, nicht gemessen).** Die Tasse lief im Software-Renderer nicht
(Gerät geht verloren). Zellbesuche je Bild:

| | Zellen | Durchläufe | Zellbesuche je Bild |
|---|---|---|---|
| Tasse, Stufe „Gutes Handy" | 72³ Strömung + 112³ Farbe | 30 Druckschritte + rund 6, Farbe rund 3 | rund 17,6 Mio |
| Achsenschnitt, 1 Ereignis | 64 × 128 | 12 Löserschritte (je 2 Halbdurchläufe) + 2 | rund 0,21 Mio |
| Achsenschnitt, 8 Ereignisse | 8 × 64 × 128 | wie oben | rund 1,7 Mio |

Ein Ereignis braucht also etwa 1/80 der Rechenarbeit der Tasse, acht gleichzeitig etwa 1/10.
Ob das am Handy in Bildrate ankommt, muss dort gemessen werden.

**Bilder** (alle aus derselben Physik, 250k bis 400k Marker): `bilder/raster_ereignisse.jpg` (Bombe, Vulkan,
Einschlag über 16 s), `bilder/raster_stress.jpg` (acht Ereignisse gleichzeitig aus dem All).

## 6. Grenzen (ehrlich)

- **Rund um die Achse.** Zwei Wolken, die ineinanderlaufen, schräge Einschläge und starker
  Seitenwind sind im Träger nicht enthalten. Der Baustein „Höhenwind" schert nur die Marker.
  Wenn das für ein Heldenereignis nicht reicht: ein grobes 3D-Gitter als zweiter Träger nur für
  dieses eine Ereignis, gleiche Schnittstelle (`feld`).
- **Krater entsteht sofort** (Stempel), nicht in Sekunden. Der Auswurf fliegt echt.
- **Überhöhung.** Eine echte Vulkansäule ist 0,6 % des Planetenradius hoch. Im Labor sind
  Ereignisse rund 20-fach vergrößert, damit man sie aus dem All sieht (Regler „Größe").
- **Mond stürzt in den Planeten** ist eine andere Größenordnung: Dort bricht der Körper selbst,
  das bleibt beim Teilchen-Verfahren (MPM) aus dem Wasserkugel-Labor bzw. Leinhardt & Stewart im
  Sonnensystem. Der Pool ist dafür der Ein-/Ausschalter, der Träger wäre ein anderer.
- **Noch nicht auf echter Hardware gemessen.** Alle Zeiten stammen vom Software-Renderer.

## 7. Wie es in procedural-planets hineinkommt

1. `src/ereignis/` anlegen und die Bausteine dieses Labors unverändert übernehmen
   (`gemeinsam`, `ereignisse`, `traeger/achse`, `sichtbar/marker`). Sie brauchen nur ein
   GPU-Gerät, die Blick-Matrix und ein Tiefenbild.
2. **Gesteinsplanet:** die Narbenkarte als Zusatzschicht je Würfelseite zu den vorhandenen
   Höhenkarten addieren (`src/rocky/shader/gen.js` / `texh.js`), Glut und Ruß in `scene_planet.js`.
   Vulkane aus `volc.js` kennen ihren Ort schon: Jeder kann ein Ereignis `vulkan` zünden.
3. **Gasriese:** kein Boden. Stattdessen schreibt ein Ereignis beim Einschlafen Farbstoff und
   eine Quelle (∇·u ≠ 0) in die 2D-Strömung auf der Würfelkugel, wie es die Kaffee-Demo schon
   kann. Einschlag in Jupiter (Shoemaker-Levy 9): dunkler Fleck, der vom Wind verschmiert wird.
4. **Sonnensystem:** `src/welt/physik/kollision.ts` meldet Einschläge schon. Kleine Körper
   zünden ein Ereignis `einschlag` am Treffpunkt statt nur einen Blitz.
5. Der Höhenwind der Marker kommt dann aus dem Windfeld des Planeten am Ereignisort.

## 8. Nächste Schritte (in dieser Reihenfolge)

1. **Am Handy messen** (dist/ereignis.html): Bildrate bei 1 und bei 8 wachen Ereignissen, 300k bis 1 Mio Marker.
2. Drall als fünfte Größe im Träger (Γ = r·u_φ): damit sind Wirbelstürme und Tornados derselbe Träger.
3. Kolmogorov-Turbulenz statt ABC-Strömung (Rasmussen 2003, Stam & Fiume 1993).
4. Feinschliff (Fleißarbeit): Rauchfarben, Glut-Bloom, weiche Marker-Ränder, Auswurf-Schattierung, Kamera.
5. Einbau nach Abschnitt 7.
