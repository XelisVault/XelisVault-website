#!/usr/bin/env python3
"""Evaluate image contact sheets with VLM and pick the best per category."""
import json, subprocess, os

cats = ['alps2', 'vault', 'watch', 'gold', 'arch', 'marble', 'handshake', 'lake']
results = {}
for cat in cats:
    sheet = f'/tmp/imgs/sheet_{cat}.jpg'
    if not os.path.exists(sheet):
        continue
    out = f'/tmp/vlm_{cat}.json'
    cmd = ['z-ai', 'vision',
           '-p', 'Contact sheet of 5 photos labeled A-E (black badge top-left of each tile). '
                 'Which ONE tile is the most professional, high-quality, editorial photograph for a premium '
                 'private-banking website? Answer ONLY: LETTER, one-line reason',
           '-i', sheet, '-o', out]
    try:
        subprocess.run(cmd, capture_output=True, timeout=180)
        d = json.load(open(out))
        content = d['choices'][0]['message']['content'].strip()
        letter = content.strip()[0].upper()
        if letter in 'ABCDE':
            results[cat] = {'letter': letter, 'reason': content}
            print(f'[{cat}] -> {letter} | {content[:90]}')
        else:
            print(f'[{cat}] UNPARSED: {content[:100]}')
    except Exception as e:
        print(f'[{cat}] ERROR: {e}')

json.dump(results, open('/tmp/imgs/vlm_picks.json', 'w'), indent=2)
print('\nSaved to /tmp/imgs/vlm_picks.json')
