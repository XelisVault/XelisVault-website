#!/usr/bin/env python3
"""Download image candidates + build labeled contact sheets for VLM evaluation."""
import json, glob, os, urllib.request
from PIL import Image, ImageDraw

RAW = '/tmp/imgs'
PUB = '/home/z/my-project/public/images/bank'
os.makedirs(PUB, exist_ok=True)

cats = {}
for f in sorted(glob.glob(f'{RAW}/*.json')):
    name = os.path.basename(f).replace('.json', '')
    d = json.load(open(f))
    cats[name] = [r['original_url'] for r in d.get('results', [])]

# Download
index = {}
for cat, urls in cats.items():
    index[cat] = []
    for i, u in enumerate(urls):
        ext = os.path.splitext(u)[1].split('?')[0] or '.jpg'
        dest = f'{RAW}/{cat}_{i}{ext}'
        if not os.path.exists(dest):
            try:
                urllib.request.urlretrieve(u, dest)
                index[cat].append(dest)
            except Exception as e:
                print('DL FAIL', cat, i, e)
        else:
            index[cat].append(dest)

# Contact sheets (one per category, 5 tiles labeled A-E)
for cat, files in index.items():
    tiles = []
    for i, fp in enumerate(files):
        im = Image.open(fp).convert('RGB')
        im.thumbnail((420, 320))
        tile = Image.new('RGB', (440, 360), 'white')
        tile.paste(im, ((440 - im.width) // 2, 30))
        d = ImageDraw.Draw(tile)
        label = chr(65 + i)
        d.rectangle([8, 8, 34, 30], fill='black')
        d.text((14, 12), label, fill='white')
        tiles.append(tile)
    sheet = Image.new('RGB', (440 * len(tiles), 360), 'white')
    for t_i, t in enumerate(tiles):
        sheet.paste(t, (440 * t_i, 0))
    sheet.save(f'{RAW}/sheet_{cat}.jpg', quality=82)
    print('sheet:', cat, len(tiles), 'tiles')

print('DONE')
