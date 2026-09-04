#!/usr/bin/env python3
"""Generate Nerva favicon set from the official color logo (1024x1024, RGBA)."""
from PIL import Image
import os

SRC = "/home/z/my-project/public/images/nerva/nerva-logo-color.png"
OUT = "/home/z/my-project/public/images/nerva"
PUBLIC = "/home/z/my-project/public"

img = Image.open(SRC).convert("RGBA")

# The color logo has transparency; composite onto a dark navy tile so it reads
# well in a browser tab (the logo is steel-blue -> violet, dark bg suits it).
def on_tile(size: int, tile_rgba, pad_ratio=0.14) -> Image.Image:
    tile = Image.new("RGBA", (size, size), tile_rgba)
    logo = img.copy()
    logo.thumbnail((int(size * (1 - 2 * pad_ratio)), int(size * (1 - 2 * pad_ratio))), Image.LANCZOS)
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    tile.alpha_composite(logo, (x, y))
    return tile

# Dark navy tile matching the Nerva world background
TILE = (7, 11, 20, 255)

for size in (32, 192, 512, 180):
    name = {180: "apple-icon"}.get(size, f"icon-{size}")
    on_tile(size, TILE).save(f"{OUT}/nerva-{name}.png" if size != 180 else f"{OUT}/nerva-apple-icon.png")
    print(f"wrote nerva-{name}.png")

# ico (16/32/48) for /favicon compatibility inside the nerva world
ico_sizes = [(16, 16), (32, 32), (48, 48)]
on_tile(48, TILE).save(f"{OUT}/nerva-favicon.ico", sizes=ico_sizes)
print("wrote nerva-favicon.ico")

# Also produce a clean transparent PNG of the logo itself (square, for UI use)
img.save(f"{OUT}/nerva-mark.png")
print("wrote nerva-mark.png")
print("done")
