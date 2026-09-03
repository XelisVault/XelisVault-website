#!/usr/bin/env python3
"""Verify the breach has no dark gap: track brightness through the breach."""
from PIL import Image
import numpy as np
import glob

frames = sorted(glob.glob('/home/z/my-project/frames/x-*.png'),
                key=lambda p: float(p.split('-')[-1][:-4]))
print('t_video   lum_mean  bright_frac  verdict')
for f in frames:
    t = float(f.split('-')[-1][:-4])
    a = np.array(Image.open(f).convert('RGB'))
    lum = a.astype(float).sum(axis=2) / 3
    mean = lum.mean()
    frac = (lum > 100).mean()
    verdict = 'DARK!' if frac < 0.05 and mean < 40 else ('bright' if frac > 0.2 else 'mid')
    print(f'{t:7.2f}  {mean:8.1f}  {frac:9.3f}  {verdict}')
