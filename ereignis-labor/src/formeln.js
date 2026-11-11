// Formeln aus der Literatur, rein rechnerisch (läuft auch in Node, siehe test/formeln.mjs).
// SI-Einheiten, wenn nicht anders gesagt. Quellen stehen in WEG.md.

// Übergangskrater-Durchmesser, Collins, Melosh & Marcus 2005 (Earth Impact Effects Program), Gl. für Festgestein.
// L Durchmesser des Körpers, v Geschwindigkeit, rhoI/rhoT Dichte Körper/Boden, g Schwere, winkel ab Horizont.
export const kraterUebergang = (L, v, rhoI = 3000, rhoT = 2700, g = 9.81, winkel = Math.PI / 4) =>
  1.161 * Math.cbrt(rhoI / rhoT) * L ** 0.78 * v ** 0.44 * g ** -0.22 * Math.cbrt(Math.sin(winkel));
export const kraterEndgueltig = (Dtc) => 1.25 * Dtc;                       // einfacher Krater
export const kraterRandhoehe = (Dtc) => 0.07 * Dtc ** 4 / kraterEndgueltig(Dtc) ** 3;
export const auswurfDicke = (Dtc, r) => Dtc ** 4 / (112 * r ** 3);         // Dicke der Auswurfdecke im Abstand r vom Zentrum (∝ r⁻³, McGetchin 1973)
export const einschlagEnergie = (L, v, rhoI = 3000) => 0.5 * rhoI * (Math.PI / 6) * L ** 3 * v * v;

// Starke Explosion: Sedov-Taylor, Radius der Stoßfront. E Energie, rho Luftdichte, t Zeit.
export const sedovRadius = (E, rho, t) => 1.03 * (E * t * t / rho) ** 0.2;
// Dazu passende Volumenquelle im Halbraum (V = 2π/3 R³): Q = dV/dt = (4π/5) A³ t^(1/5),  A = R(t)/t^(2/5)
export const sedovQuelle = (A, t) => (4 * Math.PI / 5) * A ** 3 * Math.max(t, 1e-4) ** 0.2;

// Auftriebsfahne in geschichteter Luft (Morton, Taylor & Turner 1956): Gipfelhöhe ∝ F^(1/4) N^(−3/4).
// F Auftriebsfluss [m⁴/s³], N Brunt-Väisälä-Frequenz [1/s]. Vorfaktor ≈ 5 (Briggs 1969).
export const fahnenHoehe = (F, N) => 5.0 * F ** 0.25 * N ** -0.75;
// Einmalige Wärmeblase (Thermik): Gipfelhöhe ∝ (B/N²)^(1/4), B = gesamter Auftrieb [m⁴/s²].
export const blasenHoehe = (B, N) => 2.66 * (B / (N * N)) ** 0.25;
