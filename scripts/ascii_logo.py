#!/usr/bin/env python3
"""ASCII visualization of the official logo to understand its layout."""
from PIL import Image
import numpy as np

img = Image.open('/home/z/my-project/public/images/xelisvault-logo.png').convert('RGB')
# downsample to 60x60 ascii
small = img.resize((56, 56), Image.LANCZOS)
a = np.array(small)
lum = a.astype(float).sum(axis=2) / 3

chars = ' .:-=+*#%@'
print('+' + '-' * 56 + '+')
for row in lum:
    line = ''
    for v in row:
        idx = min(int(v / 256 * len(chars)), len(chars) - 1)
        line += chars[idx]
    print('|' + line + '|')
print('+' + '-' * 56 + '+')

# check corners and edges brightness
h, w = lum.shape
print(f"\ncorners: TL={lum[0,0]:.0f} TR={lum[0,-1]:.0f} BL={lum[-1,0]:.0f} BR={lum[-1,-1]:.0f}")
print(f"edges: top={lum[0,:].mean():.0f} bottom={lum[-1,:].mean():.0f} left={lum[:,0].mean():.0f} right={lum[:,-1].mean():.0f}")
print(f"center rows mean: {lum[26:30,:].mean():.0f}")
