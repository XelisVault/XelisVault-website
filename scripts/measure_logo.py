#!/usr/bin/env python3
"""Measure the official XelisVault logo geometry precisely."""
from PIL import Image
import numpy as np

img = Image.open('/home/z/my-project/public/images/xelisvault-logo.png').convert('RGB')
a = np.array(img)
h, w = a.shape[:2]
lum = a.astype(float).sum(axis=2) / 3

# Non-black mask
mask = lum > 35
ys, xs = np.where(mask)
x0, x1 = xs.min(), xs.max()
y0, y1 = ys.min(), ys.max()
print(f"image: {w}x{h}")
print(f"motif bbox: x[{x0},{x1}] y[{y0},{y1}]  -> {x1-x0+1} x {y1-y0+1}")

cx = (x0 + x1) // 2
cy = (y0 + y1) // 2

# --- vertical line extents (sample the center column) ---
col = lum[:, cx]
rows = np.where(col > 35)[0]
line_top, line_bot = rows.min(), rows.max()

# --- circle extents: scan a column offset from center (avoid the line) ---
off = 60
col2 = lum[:, cx - off] if cx - off > x0 else lum[:, cx + off]
r2 = np.where(col2 > 35)[0]
if len(r2):
    circ_top, circ_bot = r2.min(), r2.max()
else:
    circ_top, circ_bot = line_top, line_bot

# --- circle horizontal extents: scan the center row ---
row = lum[cy, :]
cols = np.where(row > 35)[0]
circ_left, circ_right = cols.min(), cols.max()

# --- stroke widths ---
# circle stroke: horizontal run at cy
runs = np.where(row > 35)[0]
# measure run length near circ_left
def run_len(vals, start_idx):
    i = start_idx
    while i + 1 < len(vals) and vals[i + 1] - vals[i] <= 2:
        i += 1
    return vals[i] - vals[start_idx] + 1

cols_list = cols.tolist()
left_stroke = run_len(cols_list, 0)
# find start index of the last run: scan for the biggest gap from the end
last_run_start = len(cols_list) - 1
for i in range(len(cols_list) - 2, -1, -1):
    if cols_list[i + 1] - cols_list[i] > 2:
        last_run_start = i + 1
        break
right_stroke = run_len(cols_list, last_run_start)

# line stroke: run at (line_top+10, cx)
rowt = lum[min(line_top + 15, h - 1), :]
ct = np.where(rowt > 35)[0]
if len(ct):
    line_stroke_top = run_len(ct.tolist(), 0)
else:
    line_stroke_top = -1

rowm = lum[cy, cx - 200:cx + 200]
cm = np.where(rowm > 35)[0]
if len(cm):
    line_stroke_mid = cm.max() - cm.min() + 1
else:
    line_stroke_mid = -1

print(f"center: ({cx},{cy})")
print(f"vertical line: rows {line_top}->{line_bot}  len={line_bot-line_top+1}")
print(f"line overhang top: {circ_top - line_top}px  bottom: {line_bot - circ_bot}px")
print(f"circle vertical: {circ_top}->{circ_bot}  (r_v={(circ_bot-circ_top)/2:.0f})")
print(f"circle horizontal: {circ_left}->{circ_right}  (r_h={(circ_right-circ_left)/2:.0f})")
print(f"circle stroke ~ left {left_stroke}px  right {right_stroke}px")
print(f"line stroke ~ top {line_stroke_top}px  mid {line_stroke_mid}px")

# fractions relative to motif width
mw = x1 - x0 + 1
mh = y1 - y0 + 1
r_h = (circ_right - circ_left) / 2
print(f"\n--- proportions (motif {mw}x{mh}) ---")
print(f"circle diameter / motif_w = {(circ_right-circ_left+1)/mw:.3f}")
print(f"circle stroke / circle_r = {left_stroke/r_h:.3f}")
print(f"line len / motif_h = {(line_bot-line_top+1)/mh:.3f}")
print(f"line overhang_top / circle_r = {(circ_top-line_top)/r_h:.3f}")
print(f"line overhang_bot / circle_r = {(line_bot-circ_bot)/r_h:.3f}")
print(f"line stroke / circle stroke = {line_stroke_mid/left_stroke:.3f}")

# max luminance for glow intensity
print(f"\nmax lum: {lum.max():.0f}  mean of motif: {lum[y0:y1, x0:x1].mean():.1f}")
