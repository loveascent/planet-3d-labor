# python3 grid2.py out.jpg "Label:stats.json:scene" ...  → Zeilen = Methode×Szene, Spalten = Zeit; Tasse mit Farbmessung gegen Foto 1
import json, sys, subprocess
from PIL import Image, ImageDraw
out, *rows = sys.argv[1:]; T = 260; LW = 120
data = []
for r in rows:
    lab, f, sc = r.split(':'); lab = lab.replace('|', '\n'); data.append((lab, json.load(open(f))[sc]))
cols = max(len(d) for _, d in data)
sheet = Image.new('RGB', (LW + cols * T, len(data) * (T + 34)), (16, 16, 18)); dr = ImageDraw.Draw(sheet)
for ri, (lab, st) in enumerate(data):
    y = ri * (T + 34); dr.text((4, y + T // 2 - 8), lab, fill=(255, 220, 160))
    for ci, s in enumerate(st):
        im = Image.open(s['file']).convert('RGB').resize((T, T)); x = LW + ci * T; sheet.paste(im, (x, y))
        txt = f"{s.get('sec', round(s['frame']/60,2))}s |w|={s['vort']}"
        if 'tasse' in lab.lower():
            m = subprocess.run(['python3', '/home/claude/orb/test/measure.py', s['file'], '0.3218,0.6731,0.3989,0.8201'], capture_output=True, text=True).stdout.split('\n')
            dd = [l.split()[-1] for l in m[1:4] if l.strip()]
            txt += ' ' + 'Farbe ' + '/'.join('ok' if v == 'PASS' else 'x' for v in dd)
        dr.text((x + 3, y + T + 3), txt, fill=(230, 230, 230)); dr.text((x + 3, y + T + 17), f"M={s.get('NT',0)}", fill=(150, 150, 150))
sheet.save(out, quality=88); print(out, sheet.size)
