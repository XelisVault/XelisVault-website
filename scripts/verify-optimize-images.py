#!/usr/bin/env python3
"""Verify + optimize picked images into public/images/bank/."""
import json, subprocess, os
from PIL import Image

picks = json.load(open('/tmp/imgs/vlm_picks.json'))
letter_to_idx = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}

chosen = {}
for cat, info in picks.items():
    idx = letter_to_idx[info['letter']]
    # find downloaded file with that prefix
    for f in os.listdir('/tmp/imgs'):
        if f.startswith(f'{cat}_{idx}.'):
            chosen[cat] = f'/tmp/imgs/{f}'
            break

# Final verification pass: watermark / text / quality flags
cmd = ['z-ai', 'vision',
       '-p', 'These 8 photos are candidates for a premium private-bank website. For each image (numbered 1-8 in order), '
             'flag: watermarks, visible text/logos, low resolution, or unprofessional content. '
             'Reply as a compact list: "1: OK" or "1: ISSUE <reason>".']
for p in chosen.values():
    cmd += ['-i', p]
cmd += ['-o', '/tmp/vlm_verify.json']
subprocess.run(cmd, capture_output=True, timeout=240)
d = json.load(open('/tmp/vlm_verify.json'))
print(d['choices'][0]['message']['content'])

# Optimize: max 1800px long edge, JPEG q80, save to public/images/bank/
OUT = '/home/z/my-project/public/images/bank'
os.makedirs(OUT, exist_ok=True)
NAMES = {
    'alps2': 'alps-hero.jpg',
    'vault': 'vault-door.jpg',
    'watch': 'precision-watch.jpg',
    'gold': 'gold-bars.jpg',
    'arch': 'architecture.jpg',
    'marble': 'marble-dark.jpg',
    'handshake': 'handshake.jpg',
    'lake': 'alpine-lake.jpg',
}
for cat, path in chosen.items():
    im = Image.open(path).convert('RGB')
    im.thumbnail((1800, 1800), Image.LANCZOS)
    dest = os.path.join(OUT, NAMES[cat])
    im.save(dest, 'JPEG', quality=80, optimize=True, progressive=True)
    print(f'{cat}: {im.size} -> {dest} ({os.path.getsize(dest)//1024} KB)')

print('\nDONE')
