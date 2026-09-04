#!/usr/bin/env python3
"""Precise logo measurement with strict threshold (solid geometry, no glow)."""
from PIL import Image
import numpy as np

img = Image.open('/home/z/my-project/public/images/xelisvault-logo.png').convert('RGB')
a = np.array(img)
h, w = a.shape[:2]
lum = a.astype(float).sum(axis=2) / 3

TH = 100  # solid strokes only
mask = lum > TH
ys, xs = np.where(mask)
x0, x1 = xs.min(), xs.max()
y0, y1 = ys.min(), ys.max()
print(f"image {w}x{h}, solid bbox x[{x0},{x1}] y[{y0},{y1}]")
cx = (x0 + x1) // 2
cy = (y0 + y1) // 2
print(f"center ~ ({cx}, {cy})")

# LINE: column at cx, strict
col = lum[:, cx]
r = np.where(col > TH)[0]
line_top, line_bot = r.min(), r.max()
# line width: row at cy+? -> at center row the circle is also there; measure
# line width ABOVE the circle instead
# find circle top first: column at cx + 300 (right of line, on the ring arc zone)
def extent_col(x):
    c = lum[:, x]
    rr = np.where(c > TH)[0]
    return (rr.min(), rr.max()) if len(rr) else (None, None)

def extent_row(y):
    c = lum[y, :]
    rr = np.where(c > TH)[0]
    return (rr.min(), rr.max()) if len(rr) else (None, None)

# circle extents: row at cy gives left/right of ring
cl, cr = extent_row(cy)
# column at cx gives top/bottom of ring+line; use column slightly off-center to
# get ring top/bottom without line (x offset must still intersect ring)
for off in (150, 200, 250, 300):
    ct, cb = extent_col(cx + off)
    if ct is not None:
        break
print(f"circle: x[{cl},{cr}] y[{ct},{cb}] via col offset {off}")
rx = (cr - cl) / 2
ry = (cb - ct) / 2
print(f"  -> radii rx={rx:.0f} ry={ry:.0f} (x-center={(cl+cr)/2:.0f}, y-center={(ct+cb)/2:.0f})")

# ring stroke width: at cy, first run from left
row = lum[cy, :]
cols = np.where(row > TH)[0].tolist()
def run_len(vals, start_idx):
    i = start_idx
    while i + 1 < len(vals) and vals[i + 1] - vals[i] <= 3:
        i += 1
    return vals[i] - vals[start_idx] + 1
ring_stroke = run_len(cols, 0)
print(f"ring stroke at cy: {ring_stroke}px")

# line stroke: row above circle top (line exists there alone)
yprobe = ct - 60
rowp = lum[yprobe, :]
cp = np.where(rowp > 80)[0].tolist()
if cp:
    line_stroke = cp[-1] - cp[0] + 1
    print(f"line stroke at y={yprobe}: {line_stroke}px (cols {cp[0]}..{cp[-1]})")

print(f"\nline: y[{line_top},{line_bot}] len={line_bot-line_top+1}")
print(f"line overhang above circle top: {ct - line_top}px ; below: {line_bot - cb}px")
print(f"line overhang / ry: {(ct-line_top)/ry:.3f} / {(line_bot-cb)/ry:.3f}")
print(f"ring stroke / rx: {ring_stroke/rx:.3f}")
print(f"line stroke / ring stroke: {line_stroke/ring_stroke:.3f}")
print(f"circle outer diameter / image: {2*rx/w:.3f}")
print(f"line len / 2*ry: {(line_bot-line_top+1)/(2*ry):.3f}")

# brightness profile: is the line brighter than ring?
print(f"\nline max lum: {lum[line_top+30, cp[0]:cp[-1]+1].max():.0f}")
print(f"ring max lum at cy: {lum[cy, cl:cl+ring_stroke].max():.0f}")
