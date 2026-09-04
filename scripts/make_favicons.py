#!/usr/bin/env python3
"""
Generate the OFFICIAL XelisVault favicon set, faithful to the real logo:
- circle (thin stroke) + vertical line through the center, overhanging ~19% of
  the radius on both ends, silver-white (#F1F1F1) on black, with the soft glow
  of the original mark.

Outputs:
  src/app/icon.png        32x32
  src/app/icon-192.png    192x192
  src/app/icon-512.png    512x512
  src/app/apple-icon.png  180x180
  public/favicon.ico      16/32/48 multi-size
  public/images/logo-official-preview.png  (visual check)
"""
from PIL import Image, ImageDraw, ImageFilter
import math

# ---- logo geometry (measured from public/images/xelisvault-logo.png 2046px) ----
# ring outer radius / image size       : 675/2046 = 0.330
# ring stroke / image size             : 16/2046  = 0.00782
# line width / image size              : 12/2046  = 0.00587
# line length / image size             : 1596/2046= 0.780
# overhang beyond ring (each end)      : 128/2046 = 0.0626
RING_R = 0.330
RING_W = 0.00782
LINE_W = 0.00587
LINE_LEN = 0.780
GLOW_SIGMA = 0.0015  # relative
COLOR = (241, 241, 241, 255)


def draw_logo(size: int, boost: float = 1.0, with_glow: bool = True) -> Image.Image:
    """Draw the official mark at `size` px. `boost` thickens strokes for tiny
    favicon sizes where the faithful ratio would vanish (<=0.5px)."""
    SS = 8  # supersample
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 255))
    c = S / 2

    ring_w = max(RING_W * S, 1.2 * SS) * boost
    line_w = max(LINE_W * S, 1.0 * SS) * boost
    R = RING_R * S
    half_line = LINE_LEN * S / 2

    # glow layer
    if with_glow:
        glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse([c - R, c - R, c + R, c + R], outline=COLOR, width=max(int(ring_w), 1))
        gd.line([c, c - half_line, c, c + half_line], fill=COLOR, width=max(int(line_w), 1))
        gs = max(GLOW_SIGMA * S, 1.5 * SS)
        glow = glow.filter(ImageFilter.GaussianBlur(gs))
        # boost glow alpha
        r_, g_, b_, a_ = glow.split()
        a_ = a_.point(lambda v: min(255, int(v * 1.6)))
        glow = Image.merge('RGBA', (r_, g_, b_, a_))
        img.alpha_composite(glow)

    d = ImageDraw.Draw(img)
    # ring — antialiased via supersampling
    d.ellipse([c - R, c - R, c + R, c + R], outline=COLOR, width=max(int(ring_w + 0.5), 1))
    # vertical line
    d.line([c, c - half_line, c, c + half_line], fill=COLOR, width=max(int(line_w + 0.5), 1))
    # line caps slightly rounded like the original glow ends
    cap_r = line_w / 2
    for ycap in (c - half_line, c + half_line):
        d.ellipse([c - cap_r, ycap - cap_r, c + cap_r, ycap + cap_r], fill=COLOR)

    return img.resize((size, size), Image.LANCZOS)


def make(size: int, path: str, boost: float = 1.0):
    img = draw_logo(size, boost=boost)
    img.save(path)
    print(f"  wrote {path} ({size}x{size}, boost={boost})")


if __name__ == '__main__':
    # faithful at large sizes; progressive bolding below 192 so the mark stays
    # legible in browser tabs
    make(512, '/home/z/my-project/src/app/icon-512.png', 1.0)
    make(192, '/home/z/my-project/src/app/icon-192.png', 1.35)
    make(180, '/home/z/my-project/src/app/apple-icon.png', 1.35)
    make(32, '/home/z/my-project/src/app/icon.png', 2.6)
    make(64, '/home/z/my-project/public/images/logo-official-64.png', 1.8)

    # favicon.ico 16/32/48
    base48 = draw_logo(48, boost=2.2)
    base32 = draw_logo(32, boost=2.6)
    base16 = draw_logo(16, boost=3.2)
    base48.save('/home/z/my-project/public/favicon.ico',
                sizes=[(48, 48), (32, 32), (16, 16)],
                append_images=[base32, base16])
    print("  wrote /home/z/my-project/public/favicon.ico (16+32+48)")

    # visual check sheet
    sheet = Image.new('RGB', (700, 300), (136, 136, 136))
    x = 20
    for s, b in [(256, 1.1), (64, 1.8), (32, 2.6), (16, 3.2)]:
        tile = draw_logo(s, boost=b).convert('RGB')
        # draw on white and on dark checkers to simulate both tab themes
        dark = Image.new('RGB', (s + 20, s + 20), (24, 24, 24))
        dark.paste(tile, (10, 10))
        light = Image.new('RGB', (s + 20, s + 20), (238, 238, 238))
        light.paste(tile, (10, 10))
        sheet.paste(dark.resize((s + 20, s + 20)), (x, 60))
        sheet.paste(light.resize((s + 20, s + 20)), (x, 170))
        x += s + 40
    sheet.save('/home/z/my-project/download/logo-official-preview.png')
    print("  wrote /home/z/my-project/download/logo-official-preview.png")
