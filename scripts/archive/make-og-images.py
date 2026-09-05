#!/usr/bin/env python3
"""
Generate branded OpenGraph images (1200x630) for both worlds:
  - public/og/xelisvault-og.png  (Xelis Vault, dark gold/silver)
  - public/og/nerva-og.png       (NERVA, dark steel blue)

Design language matches each side: XelisVault = private banking
(black, silver, subtle gold); Nerva = signal blue on dark circuit.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

OUT = "/home/z/my-project/public/og"
os.makedirs(OUT, exist_ok=True)

W, H = 1200, 630

FONT_DIR = "/usr/share/fonts/truetype/english"
FRAUNCES_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf",
]
MONO_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
]


def pick(candidates):
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


FRAUNCES = pick(FRAUNCES_CANDIDATES)
MONO = pick(MONO_CANDIDATES)
print("serif:", FRAUNCES, "| mono:", MONO)


def load_font(path, size):
    if path:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def radial_glow(size, color, alpha_max):
    """soft radial glow layer"""
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    steps = 90
    for i in range(steps, 0, -1):
        r = int(size[0] * 0.75 * i / steps)
        a = int(alpha_max * (1 - i / steps) ** 2)
        cx, cy = size[0] // 2, int(size[1] * 0.42)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (a,))
    return glow.filter(ImageFilter.GaussianBlur(60))


def draw_xelisvault():
    img = Image.new("RGB", (W, H), (6, 6, 10))
    # premium feel: warm gold bloom + subtle vignette, no graph paper
    glow = radial_glow((W, H), (198, 160, 82), 78)
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    vign = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dv = ImageDraw.Draw(vign)
    dv.rectangle([0, 0, W, H], outline=(0, 0, 0, 0))
    for i in range(120):
        a = int(120 * (i / 120) ** 3)
        dv.rectangle([i * 3, i * 2, W - i * 3, H - i * 2], outline=(0, 0, 0, a), width=6)
    vign = vign.filter(ImageFilter.GaussianBlur(80))
    img = Image.alpha_composite(img, vign)

    d = ImageDraw.Draw(img)

    # logo: circle bisected by vertical line (official XelisVault mark)
    cx, cy, r = W // 2, 250, 128
    silver = (232, 232, 235)
    # metallic gold gradient ring: layered arcs, brighter at top-left
    for k in range(40):
        t = k / 39
        # angle sweep: brightness peaks around 135° (top-left)
        import math
        a0 = 90 + k * (270 / 40)
        gold_col = (int(212 + 30 * math.sin(math.radians(a0))),
                    int(168 + 26 * math.sin(math.radians(a0))),
                    int(84 + 18 * math.sin(math.radians(a0))))
        rr = r + 14 - k * 0.35
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], start=a0, end=a0 + 270 / 40 + 0.5,
              fill=gold_col, width=8)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=silver, width=9)
    d.line([(cx, cy - r - 30), (cx, cy + r + 30)], fill=silver, width=7)

    # wordmark
    serif = load_font(FRAUNCES, 74)
    title = "XELIS VAULT"
    bbox = d.textbbox((0, 0), title, font=serif)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, 415), title, font=serif, fill=(246, 246, 248))

    # tagline
    mono_s = load_font(MONO, 26)
    tag = "CONFIDENTIAL FINANCE, INSTITUTIONAL GRADE"
    bbox = d.textbbox((0, 0), tag, font=mono_s)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, 520), tag, font=mono_s, fill=(196, 178, 130))

    # domain chip
    mono_xs = load_font(MONO, 22)
    dom = "xelisvault.network"
    bbox = d.textbbox((0, 0), dom, font=mono_xs)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    px, py = (W - tw) / 2 - 34, 566
    d.rounded_rectangle([px, py, px + tw + 68, py + th + 22], radius=8,
                        outline=(255, 255, 255, 40), width=2, fill=(10, 10, 16, 200))
    d.text([(W - tw) / 2, py + 8], dom, font=mono_xs, fill=(198, 198, 204))

    img.convert("RGB").save(f"{OUT}/xelisvault-og.png", "PNG", optimize=True)
    print("saved", f"{OUT}/xelisvault-og.png")


def draw_nerva():
    img = Image.new("RGB", (W, H), (4, 7, 13))
    glow = radial_glow((W, H), (70, 130, 200), 55)  # signal blue glow
    img = Image.alpha_composite(img.convert("RGBA"), glow)

    d = ImageDraw.Draw(img)

    # circuit traces — coarse (90px) and faint to avoid moiré at small sizes
    for x in range(0, W, 90):
        d.line([(x, 0), (x, H)], fill=(90, 140, 200, 14), width=1)
    for y in range(0, H, 90):
        d.line([(0, y), (W, y)], fill=(90, 140, 200, 14), width=1)

    # Nerva chip mark: square with pins + N (simplified official mark)
    cx, cy, s = W // 2, 245, 92
    blue = (110, 170, 235)
    # pins
    for i in range(-2, 3):
        off = i * 38
        d.line([(cx + off, cy - s - 34), (cx + off, cy - s)], fill=blue, width=7)
        d.line([(cx + off, cy + s), (cx + off, cy + s + 34)], fill=blue, width=7)
        d.line([(cx - s - 34, cy + off), (cx - s, cy + off)], fill=blue, width=7)
        d.line([(cx + s, cy + off), (cx + s + 34, cy + off)], fill=blue, width=7)
    # body
    d.rounded_rectangle([cx - s, cy - s, cx + s, cy + s], radius=18,
                        outline=blue, width=8, fill=(8, 14, 24, 255))
    # N zig-zag
    d.line([(cx - 40, cy + 44), (cx - 40, cy - 44), (cx + 40, cy + 44), (cx + 40, cy - 44)],
           fill=(220, 235, 250), width=13, joint="curve")

    # wordmark
    mono_l = load_font(MONO, 72)
    title = "NERVA"
    bbox = d.textbbox((0, 0), title, font=mono_l)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, 408), title, font=mono_l, fill=(235, 242, 250))

    # tagline
    mono_s = load_font(MONO, 26)
    tag = "PRIVATE CPU MONEY · THE NERVA SIDE OF XELISVAULT"
    bbox = d.textbbox((0, 0), tag, font=mono_s)
    tw = bbox[2] - bbox[0]
    # scale down if it would run too wide
    if tw > W - 120:
        mono_s = load_font(MONO, 23)
        bbox = d.textbbox((0, 0), tag, font=mono_s)
        tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, 512), tag, font=mono_s, fill=(140, 168, 200))

    # domain chip
    mono_xs = load_font(MONO, 22)
    dom = "xelisvault.network/nerva"
    bbox = d.textbbox((0, 0), dom, font=mono_xs)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    px, py = (W - tw) / 2 - 34, 560
    d.rounded_rectangle([px, py, px + tw + 68, py + th + 22], radius=8,
                        outline=(110, 170, 235, 90), width=2, fill=(8, 14, 24, 200))
    d.text([(W - tw) / 2, py + 8], dom, font=mono_xs, fill=(160, 195, 235))

    img.convert("RGB").save(f"{OUT}/nerva-og.png", "PNG", optimize=True)
    print("saved", f"{OUT}/nerva-og.png")


draw_xelisvault()
draw_nerva()
print("done")
