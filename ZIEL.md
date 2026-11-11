# ZIEL (zuerst lesen, gilt für jede Sitzung, ändert sich nicht mehr)

Stand 10.11.2026. Worte des Nutzers:

> „Meine 2D-Planeten sehen cinematisch aus. Sowohl Gas als auch Gestein als auch Monde. Aber sie reagieren nicht auf Kollision, weil sie 2D sind,
> nicht echte 3D-Modelle. Ich will 3D-Modelle, die cinematisch aussehen und sich so verhalten, in Echtzeit, auf Impulse, messbar an z. B.
> Asteroiden-Einschlag, Atombombe, Kollision mit Mond, Vulkanausbruch usw."

> „Mir ist der Weg, die Methode, das Verfahren absolut egal. Solange du nicht zum Ziel kommst, ist es VERBOTEN."


## 0. Die Messbilder (`ziel-bilder/`) und woran man an ihnen 3D misst

| Bild | Was daran erfüllt sein muss |
|---|---|
| `01-apfel-durchschuss` | **Das ganze Ziel in einem Bild.** Fester Körper mit echtem Inneren. Die Schale bleibt scharf und blickdicht, während er durchschlagen wird. Er reagiert nur dort, wo etwas hindurchgeht. An Ein- und Austritt spritzt das Innere heraus, die Schale reißt in Fetzen auf. |
| `03-kollision-koerper-und-schnitt`, `09-kollision-strang-schichten` | Schichten (Kern, Mantel, Hülle) verformen und mischen sich; Material wird herausgerissen und von der eigenen Schwerkraft gehalten. Beleg, dass die Physik fertig existiert (SPH; SWIFT mit WoMa ist offen). |
| `02-mond-kollision-feuerschweif`, `13-kollision-gemalt` | Zwei scharfe Körper berühren sich, glühendes Material strömt ab. So soll es aussehen. |
| `04`, `05`, `06` Pilz | Säule steigt auf, Kappe rollt sich ein, Ring breitet sich aus, Wolken werfen Schatten. |
| `07-asteroid-ueber-krater`, `08-krater-gluehend-auswurf` | Fester, scharfer Brocken trifft; Loch im Körper, glühender Rand, Trümmer und Staub fliegen. |
| `10`, `11`, `12` Planet gespalten | Kruste bricht in Schollen, glühendes Inneres in den Rissen, Brocken lösen sich. |
| `14-beleg-space-crash-simulator-handy` | Beleg: Kollision mit über 600 000 Teilchen und Schwerkraft untereinander läuft am Handy (Code nicht offen; Verfahren abschauen). |
| `16-beleg-stroemung-60fps-am-handy` | Beleg: Strömungsrechnung läuft am Handy des Nutzers mit 60 Bildern pro Sekunde. |

Die Bilder sagen zusammen: Die Physik gibt es, sie läuft am Handy, das Aussehen ist vorgegeben. Es muss zusammengesetzt werden.

## 0a. Der Auftrag, in dieser Reihenfolge, ein Bild nach dem anderen

Startpunkt ist **nicht** `procedural-planets` (dort wird eine feste Kugel bemalt). Startpunkt ist ein offener Teilchen-Code für den Browser,
der Material wirklich bewegt: zuerst EA pbmpm (https://github.com/electronicarts/pbmpm, laut Suche BSD-3, **Lizenz noch nicht nachgelesen**) und
webgpu-ocean / WaterBall (matsuoka-601, Lizenz prüfen) ansehen, den besseren nehmen; das eigene `wasserkugel-labor/index.html` nur, wenn beide ausscheiden.
Aus `procedural-planets` wird nur das **Aussehen** mitgenommen (Formeln am Herkunftsort des Materials).

1. **Der Apfel** (`01`): eine Kugel aus festem Material mit scharfer, blickdichter Schale wird von einem kleinen Körper durchschlagen.
   Schale reißt auf, Inneres tritt aus, der Rest bleibt scharf. Lieferung: eine einzelne HTML-Datei fürs Handy + Zeitraster-Bild.
2. Erst wenn der Nutzer am Handy „ja" sagt: Asteroid und Krater (`07`, `08`) mit glühendem Inneren.
3. Dann Kollision mit Mond samt eigener Schwerkraft und Schichten (`02`, `03`, `09`).
4. Dann Pilz, Vulkan, Tornado (`04`–`06`): Luftströmung am Ort des Ereignisses (die Tasse) dazu.
5. Dann das Aussehen der eigenen Planeten (Gas, Gestein, Mond) auf diese Körper.

Abbruchregel: 40 Werkzeug-Aufrufe ohne neues Bild → aufhören, in drei Sätzen sagen, woran es hängt.
Die schwierigste Stelle ist Zeile c unten (scharfe, blickdichte Schale auf bewegtem Material). Daran ist jeder bisherige Versuch gescheitert. Sie kommt deshalb zuerst (Auftrag 1).

## 0b. Warum es monatelang nicht 3D wurde (damit es nicht wieder passiert)

- „Vom höchsten Stand weiterentwickeln, kein System daneben" wurde als „bleib im Kugel-Shader und häng einen Regler an" gelesen. Dort gibt es keinen Weg zu 3D.
- Die alten Notizen haben jeden echten 3D-Weg als gescheitert markiert (Teilchen = Knete, Gitter = zu teuer, „ohne Teilchen"). Übrig blieb Rechnen auf der Kugel.
- Verbotslisten statt Bauauftrag: Die KI wählt dann den kleinsten sicheren Schritt, und das ist ein Regler am Bestand.
- „Aus muss pixelgleich sein" belohnt Zusätze, die nichts ändern. Ein Körper, der zerbricht, ist kein abschaltbarer Zusatz.
- „Abschauen" griff nach dem, was im Ordner lag (Strömung auf der Kugel, Labor), nicht nach dem, worauf die Bilder zeigen.
- Die KI sieht das Bild nicht und prüfte, ob Code übersetzt, nicht ob ein 3D-Körper zu sehen ist.

## 1. Woran das Ziel gemessen wird

1. Gasriese, Gesteinsplanet und Mond sind echte 3D-Körper, nicht ein Bild auf einer Kugel.
2. Sie sehen so gut aus wie der heutige Stand in `procedural-planets/` (gleiche Schärfe, gleiches Licht). Kein Plastik, keine Knete.
3. Das Feste ist **blickdicht**. Durchsichtig ist nur, was wirklich Gas, Staub oder Dampf ist.
4. Sie reagieren in Echtzeit auf: Asteroiden-Einschlag, Atombombe, Kollision mit einem Mond, Vulkanausbruch.
5. Es läuft im Browser am Handy flüssig. Das beurteilt nur der Nutzer am Gerät.
6. Ergebnis ist ein Bild bzw. eine Seite, die der Nutzer öffnen kann. Text ist kein Ergebnis.

## 2. Verboten

- Jede Arbeit, die nicht zu Abschnitt 1 führt (auch wenn sie „Voraussetzung" oder „Feinschliff" heißt).
- Neu erfinden, was es im Projekt oder im Internet gibt. Das wird abgeschaut, übernommen, zusammengesetzt, mit Quelle und Lizenz.
- Das Ziel kleiner machen, bis es zu etwas passt, das leicht geht (Punkt im Raum, Wolkenhöhe, nur Krater …).
- Das Feste als Wolke aus halb durchsichtigen Flecken zeichnen und dann an Deckkraft-Reglern drehen. Ist rund ein Dutzend Mal passiert.
- Den Nutzer das Ziel noch einmal erklären lassen. Es steht hier.

## 3. Was ein vollständiger Weg braucht (jede Zeile muss besetzt sein)

| Nr. | Aufgabe | Was es dafür gibt (Quelle; „G" = nur aus dem Gedächtnis, nicht nachgeschlagen) |
|---|---|---|
| a | **Material bewegen** (fest, flüssig, Gas; zerbrechen, verschmelzen) | MLS-MPM-Teilchen: eigenes Labor `wasserkugel-labor/index.html`; webgpu-ocean / WaterBall (matsuoka-601, WebGPU, ~100 000 Teilchen); EA pbmpm (WebGPU, BSD-3); WebGPUMPM (chetan-parthiban). SPH-Teilchen: miluphcuda (CUDA), SWIFT, WoMa/SEAGen (Startplaneten, Tillotson-Werte), treesph.js (Browser, in Arbeit), Space Crash Simulator (Handy-App, Beweis dass es geht). 3D-Gitter: Tasse `wasserkugel-labor/euler.html`; Niagara Fluids; EmberGen (G). Gitter mit Herkunft für feste + flüssige Körper: RMT3D (github ylunalin/RMT3D, CPU), BiMocq (github ziyinq/Bimocq), Characteristic Mapping. Starre Bruchstücke: vorab zerlegter Körper (Voronoi-Bruch, Chaos Destruction in Unreal, Blender Cell Fracture) (G). Voxel-Planet, in den man gräbt: Marching Cubes, Dual Contouring, Transvoxel (Lengyel) (G). Geschlossene Formeln ohne Speicher: Z-Modell (Krater, in `alt/WEITERENTWICKLUNG-3D.md` Abschnitt 10 nachgerechnet), Kelvinlets / Dynamic Kelvinlets (Welle), Sedov-Taylor (Feuerball), Morton-Taylor-Turner (Steighöhe). 2D-Achsenschnitt: `ereignis-labor/`. |
| b | **Schwerkraft des Materials auf sich selbst** (ohne sie keine Mond-Kollision) | Barnes-Hut-Baum (miluphcuda, treesph.js); Particle-Mesh in WebGPU (Reusser, 2D); Poisson-Gleichung auf dem Gitter mit dem Jacobi-Löser der Tasse; im Labor bisher nur zwei Massepunkte (`bodyG`). |
| c | **Blickdichte Oberfläche aus dem bewegten Material** | Screen-Space Fluid Rendering (van der Laan 2009; in WaterBall/webgpu-ocean umgesetzt); anisotrope Kerne (Yu & Turk 2013) (G); Dichte aufs Gitter + Strahl bis zur Schwelle (im Labor als Volumen vorhanden); Marching Cubes (G); Level-Set aus der Herkunft (`φ = |Ξ| − 1 − h`, Abschnitt 3 F3); Non-linear sphere tracing (Seyb u. a. 2019, doi 10.1145/3355089.3356502) für verformte Formel-Körper. |
| d | **Das cinematische Bild auf dieser Oberfläche** | Herkunftsort je Materialstück mitführen und dort die vorhandenen Formeln auswerten: Gesteinsplanet trennt Herkunft (`o.obj`) und Ort (`o.world`) schon (`scene_vertex.js`); Gasriese rechnet alles aus `q` (`render_basis.ts`). Vorbilder: Reference Map (Kamrin 2012), Neyret 2003, Houdini „rest position" (G). Am 10.11. als Marker-Fassung gebaut (Abschnitt 5, Nr. 12). |
| e | **Gas, Staub, Dampf, Glut als Volumen** | Tasse (Strahlmarsch + Lichtvolumen); Nubis (Schneider & Vos 2015); Wrenninge „Oz" 2013; Luft im Gesteinsplaneten (Bruneton/Hillaire, `atmo.js`); Wavelet Turbulence (Kim 2008, Code in Blender Mantaflow) für Detail; Unreal Heterogeneous Volumes / Sparse Volume Textures; Planck-Glut. |
| f | **Nur dort rechnen, wo etwas passiert** | Schlafende Physik (Ereignis-Pool im `ereignis-labor`, gemessen: schlafend 0 ms); ungestörte Flächen zeichnet der vorhandene Planeten-Shader, Material nur im geweckten Bereich; Kollisions-Meldung gibt es in `src/welt/physik/kollision.ts` (Leinhardt & Stewart 2012). |
| g | **Bleibende Folgen** | Kraterformel `krater.js` (Pike 1977) zur Laufzeit füttern; Narbenkarte (Höhe, Glut, Ruß) aus dem `ereignis-labor`; Gasriese: Farbstoff + Quelle in die 2D-Strömung (`demos/coffee.html`). |
| h | **Bildrate am Handy** | grobe Physik, feines Bild (Trennung, schon Prinzip des Labors); halbe Auflösung für Volumen; Qualitätsstufen (vorhanden); Multigrid statt Jacobi (G). |

## 4. Alle bekannten Kombinationen

| Nr. | Kombination | Deckt | Stand / Haken |
|---|---|---|---|
| K1 | Teilchen (a) + Schwerkraft (b) + Oberfläche aus Teilchen (c) + Formeln am Herkunftsort (d) + Volumen für Staub (e) | alle vier Ereignisse | Alle Teile existieren einzeln. Nie zusammengesetzt. Schärfe hängt davon ab, ob (c)+(d) die Teilchenkörnung verbergen. |
| K2 | 3D-Gitter mit mitgeführter Herkunft (RMT3D/BiMocq in die Tasse) + Poisson-Schwerkraft + Strahl bis zur Fläche + Formeln am Herkunftsort | alle vier | Herleitung in `alt/WEITERENTWICKLUNG-3D.md` (F1–F11), ungeprüft; Gitter am Handy nur ~72³; Risse und freie Oberfläche offen. |
| K3 | K1 oder K2 **nur im geweckten Bereich**, Rest zeichnet der heutige Planeten-Shader (f) | alle vier, mit heutiger Schärfe außerhalb des Ereignisses | Übergang zwischen Shader-Fläche und Material nicht gelöst. Vermutlich der einzige Weg zu voller Schärfe am Handy. |
| K4 | Geschlossene Verformungsformeln (Z-Modell, Kelvinlets) + Non-linear sphere tracing | Krater, Welle | Kein Mond, keine Wolke, kein Vulkan. Allein nicht das Ziel; als Teil von K3 brauchbar. |
| K5 | Vorab zerlegter Körper aus starren Bruchstücken + Staub-Volumen | Einschlag, Mond-Kollision (grob) | Bruchstücke sehen nach Scherben aus, kein Schmelzen, kein Fließen. Nie versucht. |
| K6 | Voxel-Planet, in den Ereignisse graben + Trümmer-Teilchen + Volumen | Einschlag, Bombe, Vulkan | Kollision ganzer Körper nur mit zusätzlicher Physik. Nie versucht. |
| K7 | Gasriese: Mehrschicht-Flachwasser + Quelle im Drucklöser + Volumen für die Fahne | Einschlag und Bombe in Gas | `ROADMAP.md` 1c, 3, 4. Nie gebaut. Körper bleibt Kugel. |
| K8 | 2D-Achsenschnitt + Marker (`ereignis-labor`) | Bombe, Vulkan, Einschlagwolke | Gebaut. Sah schlechter aus als der Bestand. Planet selbst bleibt 2D. |
| K9 | Vorgerechnete Abläufe abspielen (gebackene Volumen/Netze) | sieht gut aus | Reagiert nicht auf beliebige Impulse. Verfehlt das Ziel. |
| K10 | Nur Höhenkarte/Narbe stempeln | Krater-Folgen | Kein 3D-Körper. Verfehlt das Ziel. |
| K11 | Gelerntes Modell, das die Physik ersetzt (G) | unbekannt | Nicht recherchiert. Kein Beleg für Handy. |

## 5. Was bisher versucht wurde (alle Sitzungen, soweit dokumentiert)

| Nr. | Versuch | Ergebnis |
|---|---|---|
| 1 | MLS-MPM-Teilchen als Material und Farbe (Labor M1) | Knete, Farbe so grob wie die Physik |
| 2 | Volumen aus Teilchen (Labor V2) | weich, cremig |
| 3 | Marker je Schicht (Labor V3) | beste Oberfläche bisher, Auswurf körnig, halb durchsichtig |
| 4 | Marker + Volumen-Gas (Labor V4) | führend im Labor, trotzdem Knete |
| 5 | MPM-Fels + Gitter-Gas (Labor V5/V6) | ab 3 s weiß |
| 6 | Tasse (3D-Gitter, Volumenlicht) | läuft, am Handy nie gemessen, kein Planet |
| 7 | 2D-Achsenschnitt + Marker (`ereignis-labor`) | schlechter als Bestand |
| 8 | Relief, Tiefe aus Druck, Parallaxe am Gasriesen (im Projekt) | Beleuchtungs-Täuschung, kein 3D |
| 9 | Baustein „Raum" (Strahl durch Wolkenschale), 10.11. | genauere Parallaxe; Planet war zwischendurch durchsichtig; führt nicht zum Ziel |
| 10 | Baustein „Dunst im Raum", 10.11. | gibt es beim Gesteinsplaneten schon besser; führt nicht zum Ziel |
| 11 | Z-Modell als Herkunftsformel nachgerechnet, 10.11. | Formel exakt; deckt nur den Krater |
| 12 | Marker tragen Herkunftsort, Farbe aus der Karte des Gasriesen, 10.11. (`?her=0` schaltet ab) | Bänder liegen auf dem 3D-Körper und wandern mit; unscharf, halb durchsichtig, „sieht aus wie Müll" (Nutzer) |
| 13 | Sonnensystem: Kollision nach Leinhardt & Stewart | nur Masse/Radius, Anzeige Blitz + Punkte |

Gemeinsamer Fehler von 1–5, 9 und 12: Das Feste hat keine blickdichte Oberfläche (Zeile c fehlt), und das Bild hängt an der Körnung des Speichers (Zeile d fehlt oder ist zu grob).

## 6. Nirgends gefunden (nur in den Suchen vom 09./10.11., kein Beweis)

- Planetenkollision mit eigener Schwerkraft im Browser, fertig.
- Bewegtes Material, das seine Herkunft trägt, mit einem prozeduralen Planeten als Bild (Zeile d in Echtzeit).
- Nahtloser Übergang zwischen Shader-Planet und gewecktem Material (K3).
- Pilzwolke rein aus Formeln.

## 7. Nicht gewusst

- Ob das Ziel in voller Form (Filmqualität, echte Kollision, flüssig am Handy) im Browser erreichbar ist. Kein Beleg dafür oder dagegen.
- Welcher Stand von `procedural-planets` der höchste ist (v1.1.0 neuester, v0.1 einziger auf Hardware bestätigter).
- Was die drei Videos zeigen (YouTube 5Bt1r7uc5xI, 6V4G6H05qSU, MMUwgujS2i8).

Alte Notizen liegen in `alt/` (nicht vorab lesen; nur nachschlagen, wenn eine Zeile oben darauf verweist). Der Stand vom 10.11. (Bausteine Raum/Dunst, Labor mit Herkunftsfarbe) liegt auf dem Zweig `raum-3d`.
