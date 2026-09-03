#!/usr/bin/env python3
"""Check the central mark pixels in the breach-prep frames."""
from PIL import Image
import numpy as np

for name in ['w-11.3.png', 'w-11.55.png', 'w-11.75.png', 'w-11.95.png', 'w-12.15.png', 'w-12.45.png']:
    img = Image.open(f'/home/z/my-project/frames/{name}').convert('RGB')
    a = np.array(img)
    h, w = a.shape[:2]
    cx, cy = w // 2, h // 2
    # door = 640px wide centered -> mark circle radius = 118/600*640 = ~126px
    # sample ring points (left/right of center at r=126) and line (center col, above center)
    ring_l = a[cy, cx - 126 - 4: cx - 126 + 5].astype(float).mean()
    ring_r = a[cy, cx + 126 - 4: cx + 126 + 5].astype(float).mean()
    line_above = a[cy - 180:cy - 140, cx - 3:cx + 4].astype(float).mean()  # line above circle top? no, inside port: line spans r=156
    line_inside = a[cy - 60:cy - 20, cx - 3:cx + 4].astype(float).mean()
    hub = a[cy - 8:cy + 8, cx - 8:cx + 8].astype(float).mean()
    center_region = a[cy - 130:cy + 130, cx - 130:cx + 130].astype(float)
    frac_bright = (center_region.sum(axis=2) / 3 > 100).mean()
    print(f"{name}: ring_l={ring_l:.0f} ring_r={ring_r:.0f} line_in={line_inside:.0f} hub={hub:.0f} bright_frac={frac_bright:.3f}")
