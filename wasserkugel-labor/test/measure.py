# python3 measure.py render.jpg "x0,x1,yTop,yBot" (normierte Flüssigkeitssäule im Renderbild)
# Misst dieselben Zonen wie in ref/r1_glas_milch.jpg und gibt PASS/FAIL je Kriterium aus.
import sys, numpy as np
from PIL import Image
REF = {'Tee (K1)': ((165, 80, 73), 53.3), 'Beulen (K3/K4)': ((171, 71, 15), 24.0), 'Milchschicht (K2)': ((149, 112, 83), 10.8)}
FR = {'Tee (K1)': (.01, .20), 'Beulen (K3/K4)': (.22, .54), 'Milchschicht (K2)': (.63, .95)}
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float); H, W, _ = im.shape
x0, x1, yt, yb = map(float, sys.argv[2].split(','))
ok_all = True
print(f"{'Zone':20s} {'Referenz':>16s} {'Mein Bild':>16s}  ΔRGB  σRef σMein  Ergebnis")
for k, (c, s) in REF.items():
    f0, f1 = FR[k]; ya, yb2 = yt + (yb - yt) * f0, yt + (yb - yt) * f1
    a = im[int(ya * H):int(yb2 * H), int(x0 * W):int(x1 * W)].reshape(-1, 3)
    m = a.mean(0); sd = a.mean(1).std(); d = float(np.linalg.norm(m - np.array(c)))
    sat = lambda v: (max(v) - min(v)) / max(max(v), 1); ds = abs(sat(m) - sat(c))
    # Tee-Zone: σ im Foto stammt vom Kuchen dahinter, nicht vom Tee → nur Farbe prüfen
    sig_ok = True if k.startswith('Tee') else (s / 2.5 < sd < s * 2.5)
    ok = d < 30 and ds < 0.12 and sig_ok; ok_all &= ok
    print(f"{k:20s} {str(tuple(c)):>16s} {str(tuple(int(v) for v in m)):>16s} {d:5.0f} {s:5.1f} {sd:5.1f}  Δsat {ds:.2f}  {'PASS' if ok else 'FAIL'}")
print('GESAMT:', 'PASS' if ok_all else 'FAIL')
