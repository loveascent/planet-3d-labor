# python3 grid.py prefix out.jpg  -> Raster: Zeilen = Szenen, Spalten = Zeit, mit Messwerten
import json, sys
from PIL import Image, ImageDraw
pre, out = sys.argv[1:3]
R = json.load(open(pre + '_stats.json')); T = 300
rows = list(R.keys()); cols = max(len(v) for v in R.values())
sheet = Image.new('RGB', (cols * T + 90, rows and len(rows) * (T + 34)), (16, 16, 18)); d = ImageDraw.Draw(sheet)
for ri, sc in enumerate(rows):
    y = ri * (T + 34); d.text((4, y + T // 2), sc, fill=(255, 220, 160))
    for ci, st in enumerate(R[sc]):
        im = Image.open(st['file']).convert('RGB').resize((T, T)); x = 90 + ci * T; sheet.paste(im, (x, y))
        lab = f"{st['sec']}s |w|={st['vort']}"
        if 'trcYsd' in st: lab += f" Yσ={st['trcYsd']} Rσ={st['trcRsd']}"
        if 'r_oil' in st: lab += f" rÖl={st['r_oil']} rW={st.get('r_aq','-')}"
        if st.get('Tmax', 0) > 0.5: lab += f" Tmax={st['Tmax']}"
        d.text((x + 3, y + T + 3), lab, fill=(230, 230, 230)); d.text((x + 3, y + T + 17), f"N={st['N']} M={st['NT']}", fill=(150, 150, 150))
sheet.save(out, quality=88); print(out, sheet.size)
