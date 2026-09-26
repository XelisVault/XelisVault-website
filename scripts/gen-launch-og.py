#!/usr/bin/env python3
"""VaultLaunch OG card — 1200x630, the house style.

What X/Discord/Telegram show when a /launch trade-page link is shared.
Design language mirrors the app: warm-ink background (not purple-black),
champagne-bronze gold, hairline frames with the signature corner
brackets, ledger mono type, the official logo.

Regenerate:  python3 scripts/gen-launch-og.py
"""

from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1200, 630
OUT = "public/og/launch-og.png"

# ── OKLCH → sRGB (the exact tokens the app uses) ─────────────────────

def oklch_to_rgb(l, c, h_deg):
    """OKLab → linear sRGB → gamma sRGB, 0-255."""
    h = math.radians(h_deg)
    a = c * math.cos(h)
    b = c * math.sin(h)
    # OKLab → LMS'
    l_ = l + 0.3963377774 * a + 0.2158037573 * b
    m_ = l - 0.1055613458 * a - 0.0638541728 * b
    s_ = l - 0.0894841775 * a - 1.2914855480 * b
    # LMS' → LMS (cube)
    l_ = l_ ** 3
    m_ = m_ ** 3
    s_ = s_ ** 3
    # LMS → linear sRGB
    r = +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
    g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
    bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_
    def gamma(x):
        if x <= 0.0031308:
            return 12.92 * x
        return 1.055 * (max(0.0, x) ** (1 / 2.4)) - 0.055
    return tuple(int(round(255 * min(1.0, max(0.0, gamma(v))))) for v in (r, g, bl))


INK       = oklch_to_rgb(0.135, 0.008, 80)   # --background (app-dark)
INK_CARD  = oklch_to_rgb(0.175, 0.010, 80)   # --card
GOLD      = oklch_to_rgb(0.52, 0.09, 70)     # --vault champagne bronze
GOLD_SOFT = oklch_to_rgb(0.78, 0.06, 78)     # --vault-soft
IVORY     = oklch_to_rgb(0.955, 0.004, 85)   # foreground paper
MUTED     = oklch_to_rgb(0.62, 0.012, 80)    # muted foreground on ink

print("palette:", {"ink": INK, "gold": GOLD, "goldSoft": GOLD_SOFT, "ivory": IVORY, "muted": MUTED})

# ── canvas ────────────────────────────────────────────────────────────

img = Image.new("RGB", (W, H), INK)
d = ImageDraw.Draw(img)

# subtle vertical gradient (ink → slightly lighter at top-left glow)
for y in range(H):
    t = y / H
    lift = int(10 * (1 - t))
    d.line([(0, y), (W, y)], fill=tuple(min(255, c + lift) for c in INK))

# radial gold glow behind the logo (top-left)
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
cx, cy, R = 250, 300, 420
for r in range(R, 0, -4):
    a = int(26 * (1 - r / R) ** 2)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=a)
gold_layer = Image.new("RGB", (W, H), GOLD)
img = Image.composite(gold_layer, img, glow)
d = ImageDraw.Draw(img)

# faint ledger grid (hairlines every 60px)
grid = Image.new("RGB", (W, H), INK)
gg = ImageDraw.Draw(grid)
for x in range(0, W, 60):
    gg.line([(x, 0), (x, H)], fill=tuple(c + 6 for c in INK))
for y in range(0, H, 60):
    gg.line([(0, y), (W, y)], fill=tuple(c + 4 for c in INK))
img = Image.blend(grid, img, 0.82)
d = ImageDraw.Draw(img)

# ── fonts ─────────────────────────────────────────────────────────────

F_DISPLAY = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
F_REG     = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
F_MONO    = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
F_MONO_B  = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

f_kicker = ImageFont.truetype(F_MONO_B, 21)
f_ticker = ImageFont.truetype(F_DISPLAY, 168)
f_title  = ImageFont.truetype(F_REG, 44)
f_sub    = ImageFont.truetype(F_REG, 26)
f_mono   = ImageFont.truetype(F_MONO, 22)
f_chip   = ImageFont.truetype(F_MONO_B, 19)

def text(pos, s, font, fill, anchor=None, ls=0):
    """Letter-spaced text (ls = extra px per char)."""
    if ls <= 0:
        d.text(pos, s, font=font, fill=fill, anchor=anchor)
        return
    x, y = pos
    total = sum(d.textlength(ch, font=font) + ls for ch in s) - ls
    if anchor and "m" in anchor:
        x -= total / 2
    elif anchor and "r" in anchor:
        x -= total
    for ch in s:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + ls

# ── frame: hairline + the signature corner brackets ───────────────────

M = 34
d.rectangle([M, M, W - M, H - M], outline=tuple(c + 26 for c in INK), width=1)
BL, BT = 56, 30
for (x, y, dx, dy) in [
    (M + 2, M + 2, 1, 1), (W - M - 2, M + 2, -1, 1),
    (M + 2, H - M - 2, 1, -1), (W - M - 2, H - M - 2, -1, -1),
]:
    d.line([(x, y), (x + dx * BL, y)], fill=GOLD, width=BT)
    d.line([(x, y), (x, y + dy * BL)], fill=GOLD, width=BT)

# ── the official logo on a framed tile ────────────────────────────────

logo = Image.open("public/images/xelisvault-logo.png").convert("RGBA")
TILE = 250
logo = logo.resize((TILE - 44, TILE - 44), Image.LANCZOS)
tx, ty = 110, (H - TILE) // 2
# tile
d.rectangle([tx, ty, tx + TILE, ty + TILE], fill=INK_CARD,
            outline=tuple(int(c * 0.55 + GOLD[0] * 0.45) for c in GOLD), width=2)
# tile corner brackets
for (x, y, dx, dy) in [
    (tx + 1, ty + 1, 1, 1), (tx + TILE - 1, ty + 1, -1, 1),
    (tx + 1, ty + TILE - 1, 1, -1), (tx + TILE - 1, ty + TILE - 1, -1, -1),
]:
    d.line([(x, y), (x + dx * 20, y)], fill=GOLD, width=4)
    d.line([(x, y), (x, y + dy * 20)], fill=GOLD, width=4)
img.paste(logo, (tx + 22, ty + 22), logo)
d = ImageDraw.Draw(img)

# ── text block ────────────────────────────────────────────────────────

TX = 440
# kicker
text((TX, 122), "VAULTLAUNCH · OFFICIAL TOKEN", f_kicker, GOLD_SOFT, ls=6)
# the ticker — huge gold
d.text((TX - 8, 158), "XVLT", font=f_ticker, fill=GOLD)
# title
d.text((TX, 356), "The official XelisVault token", font=f_title, fill=IVORY)
# subtitle
d.text((TX, 418), "Fixed supply · locked seed · XELIS mainnet", font=f_sub, fill=MUTED)

# chips: OFFICIAL / TRUSTED
def chip(x, y, label, fg, border, ls=3):
    base = d.textlength(label, font=f_chip)
    w = base + ls * (len(label) - 1) + 36  # letter-spacing accounted for
    d.rectangle([x, y, x + w, y + 44], outline=border, width=2)
    text((x + 18, y + 10), label, f_chip, fg, ls=ls)
    return x + w + 16

cx0 = TX
cx0 = chip(cx0, 486, "OFFICIAL", GOLD_SOFT, GOLD)
chip(cx0, 486, "TRUSTED", (110, 220, 170), (60, 150, 120))

# url — bottom right, mono
url = "xelisvault.xyz/launch"
uw = d.textlength(url, font=f_mono)
d.text((W - M - 26 - uw, H - M - 58), url, font=f_mono, fill=GOLD_SOFT)

# bonding-curve progress — bottom right, above the url (decorative)
BX, BY, BW = W - M - 26 - 320, H - M - 96, 320
d.rectangle([BX, BY, BX + BW, BY + 6], fill=tuple(c + 22 for c in INK))
d.rectangle([BX, BY, BX + int(BW * 0.68), BY + 6], fill=GOLD)
text((BX, BY - 34), "BONDING CURVE → PERMANENT DEX", f_mono, MUTED, ls=2)

img.save(OUT, "PNG", optimize=True)
print("wrote", OUT, img.size)
