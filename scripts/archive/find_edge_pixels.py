#!/usr/bin/env python3
"""Find what bright pixels exist near the image edges."""
from PIL import Image
import numpy as np

img = Image.open('/home/z/my-project/public/images/xelisvault-logo.png').convert('RGB')
a = np.array(img)
h, w = a.shape[:2]
lum = a.astype(float).sum(axis=2) / 3

TH = 100
# bright pixels outside a central square region (motif ~ x 300-1800)
outside = lum.copy()
outside[300:1800, 300:1800] = 0
ys, xs = np.where(outside > TH)
print(f"bright pixels outside central zone: {len(ys)}")
if len(ys):
    # cluster summary
    for lim in [(0, 100), (100, 300), (1800, 1946), (1946, 2046)]:
        pass
    print(f"y range: {ys.min()}..{ys.max()}, x range: {xs.min()}..{xs.max()}")
    # sample a few
    idx = np.linspace(0, len(ys) - 1, 10).astype(int)
    for i in idx:
        print(f"  sample ({xs[i]},{ys[i]}) lum={lum[ys[i], xs[i]]:.0f} rgb={a[ys[i], xs[i]]}")
    # histogram of brightness
    print("brightness histogram:", np.histogram(outside[ys, xs], bins=5, range=(100, 255))[0])

# Check specific: top rows
print("\nrow 0-3 max lum:", lum[0:4].max())
print("col 2040-2045 max lum:", lum[:, 2040:2046].max())
print("row 2040-2045 max lum:", lum[2040:2046].max())
print("col 0-5 max lum:", lum[:, 0:6].max())

# where exactly are row-0 bright pixels
r0 = np.where(lum[0] > 100)[0]
print("row 0 bright cols:", r0[:20] if len(r0) else "none")
r1 = np.where(lum[1] > 100)[0]
print("row 1 bright cols:", r1[:20] if len(r1) else "none")
c0 = np.where(lum[:, 2045] > 100)[0]
print("col 2045 bright rows:", c0[:20] if len(c0) else "none")
