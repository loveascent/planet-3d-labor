# python3 cmp.py out.jpg ref.jpg mine.jpg [mine2 ...]  -> nebeneinander, gleiche Höhe
import sys
from PIL import Image, ImageDraw
out, *ims = sys.argv[1:]
H = 420
tiles = []
for i, p in enumerate(ims):
    im = Image.open(p).convert('RGB'); w = int(im.width * H / im.height); im = im.resize((w, H))
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 120, 18], fill=(0, 0, 0)); d.text((4, 3), 'REFERENZ' if i == 0 else f'MEIN BILD {i}', fill=(255, 255, 255))
    tiles.append(im)
W = sum(t.width for t in tiles) + 6 * (len(tiles) - 1)
sheet = Image.new('RGB', (W, H), (255, 255, 255)); x = 0
for t in tiles: sheet.paste(t, (x, 0)); x += t.width + 6
sheet.save(out, quality=90)
