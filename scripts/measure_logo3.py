#!/usr/bin/env python3
"""Clean measurement ignoring the 1px right-edge artifact column."""
from PIL import Image
import numpy as np

img = Image.open('/home/z/my-project/public/images/xelisvault-logo.png').convert('RGB')
a = np.array(img)
h, w = a.shape[:2]
lum = a.astype(float).sum(axis=2) / 3
# kill the artifact column(s) at the very edge
lum[:, 2040:] = 0
lum[:, :6] = 0

TH = 100
mask = lum > TH
ys, xs = np.where(mask)
x0, x1 = xs.min(), xs.max()
y0, y1 = ys.min(), ys.max()
cx = (x0 + x1) // 2
cy = (y0 + y1) // 2
print(f"solid bbox x[{x0},{x1}] y[{y0},{y1}] -> center ({cx},{cy})")

def extent_col(x):
    c = lum[:, x]
    rr = np.where(c > TH)[0]
    return (rr.min(), rr.max()) if len(rr) else (None, None)

def extent_row(y):
    c = lum[y, :]
    rr = np.where(c > TH)[0]
    return (rr.min(), rr.max()) if len(rr) else (None, None)

# LINE at cx
lt, lb = extent_col(cx)
# LINE WIDTH: row just above circle top
# circle top: scan column cx±large to find ring without line
cl, cr = extent_row(cy)
print(f"row {cy}: runs x[{cl}..{cr}]")

# ring top/bottom via column offset (avoid line)
for off in (120, 160, 200, 260):
    ct, cb = extent_col(cx + off)
    if ct is not None:
        ring_col = cx + off
        break
print(f"ring via col {ring_col}: y[{ct},{cb}]")
rx = (cr - cl) / 2
ry = (cb - ct) / 2
print(f"ring radii: rx={rx:.0f} ry={ry:.0f}")
print(f"ring outer: x[{cl},{cr}] y[{ct},{cb}]")

# ring stroke at cy (first run from left)
row = lum[cy, :]
cols = np.where(row > TH)[0].tolist()
def run_len(vals, start_idx):
    i = start_idx
    while i + 1 < len(vals) and vals[i + 1] - vals[i] <= 3:
        i += 1
    return vals[i] - vals[start_idx] + 1
ring_stroke = run_len(cols, 0)
print(f"ring stroke at cy: {ring_stroke}px")

# line width above the circle
yprobe = ct - 80
rowp = lum[yprobe, :]
cp = np.where(rowp > 80)[0].tolist()
line_w = cp[-1] - cp[0] + 1
print(f"line width at y={yprobe}: {line_w}px (x {cp[0]}..{cp[-1]})")

print(f"\nline: y[{lt},{lb}] len={lb-lt+1}")
print(f"line center x = {(cp[0]+cp[-1])/2:.0f}  (circle center x = {(cl+cr)/2:.0f})")
print(f"overhang top: {ct-lt}px ({(ct-lt)/ry:.3f} ry), bottom: {lb-cb}px ({(lb-cb)/ry:.3f} ry)")
print(f"ring stroke / rx = {ring_stroke/rx:.3f}")
print(f"line width / ring stroke = {line_w/ring_stroke:.3f}")
print(f"line len / ring outer diam = {(lb-lt+1)/(2*ry):.3f}")
print(f"ring outer diam / image = {2*rx/w:.3f}")

# Glow analysis: radius where luminance > 10 at row cy beyond ring
row_g = lum[cy, :]
glow_right = np.where(row_g > 10)[0]
print(f"\nglow extends to x {glow_right.max()} (ring outer right {cr})")

# avg color of strokes
print(f"ring color sample rgb: {a[cy, cl+ring_stroke//2]}")
print(f"line color sample rgb: {a[lt+50, cp[len(cp)//2]]}")
