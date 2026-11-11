# Wasserkugel-/Planeten-Labor – was funktioniert hat, was nicht, wie weiter

> **Gegen das Ziel geprüft am 10.11.2026** (Ziel und Messbilder: `ZIEL.md`, `ziel-bilder/`; Prüffrage: „Kann der Planet nach diesem Schritt aufreißen oder zerbrechen?“).
> - **Zielnah:** Dieses Labor bewegt echtes 3D-Material. Die Arbeitsweise (Zeitraster, mehrere Verfahren, Bewährtes übernehmen) gilt weiter; Messbilder sind jetzt `ziel-bilder/`, nicht mehr die Tee-Fotos.
> - **Korrektur:** „V4 führend“ stimmt nur innerhalb des Labors. Gemessen am Apfel (`ziel-bilder/01`) sind V1 bis V6 alle durchgefallen: keine scharfe, blickdichte Schale. Marker und Volumen als halb durchsichtige Flecken sind verboten.
> - **Gestrichen:** die Schritte „Atmosphäre auf Kugelschale mit Coriolis, gegen Jupiter-Foto messen“ (das ist wieder die bemalte Kugel).
> - **Fehlt hier und ist Pflicht:** Schwerkraft des Materials auf sich selbst (bisher zwei Massepunkte), Oberfläche aus dem Material, Aussehen am Herkunftsort.
> - Reihenfolge ab jetzt: `ZIEL.md` Abschnitt 0a. Startpunkt ist zuerst ein offener Teilchen-Code aus dem Internet; dieses Labor nur, wenn der ausscheidet.


Stand 01.11.2026 abends. Artefakt: https://claude.ai/artifact/MQssPvngxwaYu3qJsA1Dy2
(Hauptseite = euler.html → dist/wasserkugel.html, Unterseite planet.html = index.html)

## Arbeitsweise (Pflicht, vom Nutzer erzwungen)
1. Ziel = Referenzfotos des Nutzers (ref/r1_glas_milch.jpg, r3_strahl.jpg, r4_oben.jpg). Bild 2 (Latte-Art) war absichtlich falsch.
2. Nie Einzelbild tunen. Immer ZEITRASTER: Zeilen = Verfahren, Spalten = Zeitpunkte (0,25…4+ s), pro Bild Messwerte
   (|ω| Wirbelstärke, Verteilung, Farbe gegen Foto via test/measure.py).
3. Mehrere Verfahren parallel aus DERSELBEN Physik rendern (test/sheetm.js capM(1..n)), bestes behalten.
4. Erst prüfen ob eine Methode das Ziel überhaupt erreichen KANN, dann tunen. Bei 2× Fehlschlag Methode wechseln.
5. Bewährtes übernehmen (Paper/Open Source), nicht erfinden. Ehrlich berichten, Bild zuerst.

## Was NICHT funktioniert hat (und warum)
- MLS-MPM-Teilchen als Medium UND als Farbe (M1): Farbe so grob wie die Physik (~40k Teilchen), Milch bläht auf,
  Schwerelos-Kugel wird beim Treffer zum Pfannkuchen (kein Oberflächenspannungs-Halt), Gischt durch Druckspitzen.
- Dunkler Hintergrund: Tee wirkt schwarz (Transmission braucht helles Licht dahinter).
- Teilchen-Zufallsklumpen beim Eingießen → Druckspitzen → Spritzer. Abhilfe war Gitterscheiben-Emission.
- Wirbelverstärkung/Curl-Noise an der freien Oberfläche → Gischt. Nur im Inneren anwenden.
- Marker als 1-px-Punkte mit gewichtetem Mittel ohne Tiefe → Kern scheint durch, dunkle Flecken.
  Abhilfe: vorderste Schicht gewichten (exp(-(d - d_Oberfläche)/1,2)), Mehrfachstreu-Boden im Licht.
- Kamera zu nah beim großen Asteroiden; Stoßglühen 3× zu stark → alles weiß.
- Einzelbild-Tuning ohne Zeit: hat das Aufblähen/Pfannkuchen erst im Raster sichtbar gemacht.

## Was funktioniert hat (und warum)
- Trennung Bewegung / Sichtbares (Idee des Nutzers): grobe Strömung + feines Farbfeld bzw. 1–4 Mio passive Marker.
  Genau das Prinzip der 2D-„liquid fluid“-Demos (Stam Stable Fluids), nur in 3D.
- M2 Gitter-Strömung im festen Gefäß (euler.html): Stam 1999 semi-Lagrange, Jacobi-Druck, Fedkiw-2001-Wirbelverstärkung,
  MacCormack-Farbtransport (Selle 2008) auf feinerem Farbgitter, Boussinesq: Milch = „umgekehrter Rauch“ (schwer → sinkt).
  Darstellung: Volumen-Raymarching + Lichtvolumen (Selbstschatten) + exakte Brechung an Kugel/Zylinder.
  → Tasse: Milch stürzt, breitet sich am Boden aus, Tee bleibt oben klar (wie Foto 1). Kugel bleibt Kugel.
- Tee-Farbe: Absorption (0.08, 1.6, 4.0)·0.05/Zelle·(96/G) vor hellem warmen Raum → misst nahe Foto (Δ≈24–34).
- Analytische Normalen an Glaswand/ruhiger Oberfläche statt Teilchen-Buckeln.
- Planeten: MPM bleibt richtig, weil die Form zerbricht. Marker je Schicht (Kern/Mantel/Kruste/Ozean/Gas) mit
  Tiefengewichtung zeigen Kontinente/Ozeane am besten (M3).

## Erkenntnis für das Endziel
Die Tasse IST die Atmosphäre-Physik. Umgedreht (Wärme → steigt, statt schwer → sinkt) ist sie:
Atompilz / Vulkanausbruch / Einschlag-Wolke / Laser-Dampfwolke (Rayleigh-Taylor + Wirbelring + Schirm).
Gleicher Löser, Auftrieb b = β·T·r̂ (radial vom Planeten weg), Wärmequelle aus dem MPM (heiße Teilchen).
Jupiter-Wirbel: dieselbe Gitter-Strömung auf einer Kugelschale + Corioliskraft −2Ω×v + Marker für Wolkenfäden.

## Weiteres Verfahren (Reihenfolge)
1. Planeten: 6 Verfahren im Zeitraster (Asteroid, ganze Kugel im Bild, Glühen ⅓):
   V1 Teilchen · V2 Volumen · V3 Marker (weiche Größe) · V4 Marker + Volumen-Gas/Glut ·
   V5 MPM-Fels + Gitter-Gas (Boussinesq, Wärme aus MPM) · V6 wie V5 + Gas-Marker (Fäden).
2. Bestes Verfahren → Atmosphäre auf Kugelschale mit Coriolis, gegen Jupiter-Foto messen.
3. Danach Einschlag-/Laser-Dampfwolke als „umgedrehte Tasse“ auf dem Planeten.

## Dateien
index.html (MPM, Planeten, M1/M2/M3 über ?m=), euler.html (Gitter-Strömung M2/M3), test/sheet.js, test/sheetm.js,
test/grid2.py (Raster), test/measure.py (Farbmessung), ref/ (Fotos). Tests: lavapipe ≈ 2–7 s/Bild, per file:// laden.

## Ergebnis 6-Verfahren-Raster Asteroid (raster_v6.jpg, 01.11. spät)
- V1 Teilchen: dunkel, Klumpen-Flecken → raus.
- V2 Volumen: lesbare Form, aber weich/cremig.
- V3 Marker: beste Oberfläche (Kontinente), Auswurf körnig-schaumig.
- V4 Marker + Volumen-Gas aus MPM: Auswurf als quellende Blumenkohl-Wolken → wirkt am ehesten wie Einschlagwolke. FÜHREND.
- V5/V6 Gitter-Gas: echte Fahne steigt auf (0,8 s), danach Ausbleichen: Staubquelle (dünner Fels → Staub ×2) und
  Hitzequelle viel zu stark, Bild ab 3 s weiß. Methode vielversprechend (umgedrehte Tasse), Quellen dosieren.
- Alle: Auswurfvorhang fliegt Richtung Kamera und füllt das Bild → Kamera seitlicher/weiter.
Nächste Schritte: V4 als Basis; V5-Quellen ×0,2 + Abkühlung; dann V4+V5 kombinieren (Fels-Marker, MPM-Staub, Gitter-Hitzefahne).

## Stand Version 3 des Artefakts (01.11. spät)
- Bedienblatt scrollbar (max 78 dvh), Griff klappt auf/zu. Qualität als 4er-Segment: Altes Handy / Gutes Handy / Laptop / Gaming-PC.
- Alle Regler mit ⓘ-Formel. Flüssig: Milch-Schwere, Wirbel, Strahl-Tempo/-Breite, Teestärke + Tee R/G/B, Milch-Dichte + Milch R/G/B,
  Sonne, Umgebung, Belichtung, Raymarch-Schritt, Druck-Iterationen, Auflösung.
  Planet: Gravitation, Stoßhitze, Abkühlung, Zähigkeit, Sonne, Umgebung, Glühen, Atmosphäre, Marker-Größe,
  Gas-Auftrieb/-Wirbel/Staub-/Hitze-Quelle/-Abkühlung, Druck-Iterationen, Auflösung, Belichtung.
- V5/V6-Quellen gedrosselt (Staub 0,4, Hitze 0,25, Abkühlung 0,03) – noch nicht im Raster nachgemessen.
- Version 4: Bedienung nicht mehr schwebend – Bild oben (60 vh), alle Regler darunter im Seitenfluss (Artefakt-Rahmen am Handy schnitt das feste Blatt unten ab). Desktop ≥900 px: Seitenleiste rechts.
