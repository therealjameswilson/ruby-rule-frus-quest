#!/usr/bin/env python3
"""Generate a second regional overworld map for Ruby Rule: FRUS Quest.

Theme: Overseas Post / Embassy network. 16-bit SNES (ALTTP-style) pixel art.
Authored at native 384x256 with a limited palette, then nearest-neighbor
upscaled x4 -> 1536x1024 so every edge is a hard pixel edge (no anti-aliasing).
Deterministic (fixed RNG seed) for reproducible regeneration.
"""
import random
from PIL import Image, ImageDraw, ImageFont

W, H = 384, 256
SCALE = 4
random.seed(1948)  # deterministic

# ---- Limited palette (curated) -------------------------------------------
SEA_DEEP   = (24, 52, 92)
SEA_MID    = (38, 78, 128)
SEA_LIGHT  = (74, 122, 176)
FOAM       = (176, 206, 224)

SAND       = (206, 178, 120)
SAND_DK    = (168, 138, 84)
GRASS_DK   = (46, 92, 46)
GRASS_MD   = (74, 130, 62)
GRASS_LT   = (120, 168, 84)
TREE_DK    = (34, 68, 34)

PARCH_LT   = (222, 196, 140)
PARCH_MD   = (200, 168, 104)
PARCH_DK   = (150, 116, 66)
DECKLE_DK  = (120, 92, 52)

BRASS_LT   = (236, 212, 138)
BRASS_MD   = (198, 158, 74)
BRASS_DK   = (132, 100, 40)

STONE_LT   = (198, 200, 206)
STONE_MD   = (150, 152, 160)
STONE_DK   = (98, 100, 110)
ROOF       = (150, 74, 58)
ROOF_DK    = (104, 48, 40)
ROOF_BLU   = (70, 96, 132)   # for secure/comms buildings
ROOF_GRN   = (72, 108, 66)

INK        = (38, 26, 14)
CREAM      = (238, 228, 200)
GOLD_LINE  = (150, 116, 40)

# neutral pennant accents (no real national flags)
PENNANTS = [(60, 74, 120), (120, 60, 60), (72, 104, 72),
            (60, 104, 112), (168, 138, 84), (96, 72, 112),
            (120, 96, 48), (72, 88, 120)]

img = Image.new("RGB", (W, H), SEA_DEEP)
d = ImageDraw.Draw(img)
font = ImageFont.load_default()


def px(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        img.putpixel((int(x), int(y)), c)


def rect(x0, y0, x1, y1, c):
    d.rectangle([x0, y0, x1, y1], fill=c)


def text(x, y, s, c):
    """Render text with hard pixel edges (threshold the AA'd default font)."""
    b = d.textbbox((0, 0), s, font=font)
    tw, th = b[2] - b[0] + 2, b[3] + 2
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).text((-b[0], 0), s, fill=255, font=font)
    for yy in range(th):
        for xx in range(tw):
            if mask.getpixel((xx, yy)) > 110:
                px(x + xx, y + yy, c)


def text_w(s):
    b = d.textbbox((0, 0), s, font=font)
    return b[2] - b[0]


# ---- Sea texture (deterministic wave dashes) ------------------------------
for y in range(14, H - 14, 3):
    for x in range(14, W - 14, 6):
        r = random.random()
        if r < 0.10:
            rect(x, y, x + 2, y, SEA_MID)
        elif r < 0.14:
            rect(x, y, x + 1, y, SEA_LIGHT)

# ---- Dashed diplomatic sea routes -----------------------------------------
ISLANDS = {
    1: (78, 150, "REGIONAL BUREAU"),
    2: (292, 64, "CHANCERY"),
    3: (100, 60, "CONSULAR SECTION"),
    4: (80, 204, "POUCH ROOM"),
    5: (292, 194, "COMMS VAULT"),
    6: (186, 210, "MINISTRY LIAISON"),
    7: (292, 138, "ARCHIVES ANNEX"),
    8: (186, 120, "MARINE POST"),
}
ROUTES = [(3, 2), (3, 1), (1, 8), (8, 2), (8, 7), (8, 6),
          (2, 7), (7, 5), (6, 5), (4, 6), (4, 1)]


def dashed_line(p0, p1):
    x0, y0 = p0
    x1, y1 = p1
    import math
    dist = math.hypot(x1 - x0, y1 - y0)
    n = max(1, int(dist / 4))
    for i in range(n + 1):
        t = i / n
        if i % 2 == 0:
            x = x0 + (x1 - x0) * t
            y = y0 + (y1 - y0) * t
            px(x, y, FOAM)
            px(x + 1, y, FOAM)
            px(x, y + 1, SEA_LIGHT)
            px(x + 1, y + 1, SEA_LIGHT)


for a, b in ROUTES:
    dashed_line(ISLANDS[a][:2], ISLANDS[b][:2])


# ---- Island + compound drawing -------------------------------------------
def blob(cx, cy, rx, ry, c):
    for yy in range(-ry, ry + 1):
        span = int(rx * (1 - (yy / ry) ** 2) ** 0.5)
        rect(cx - span, cy + yy, cx + span, cy + yy, c)


def building(x, y, w, h, roof, wall=STONE_LT):
    rect(x, y + 2, x + w, y + h, wall)
    rect(x, y + 2, x, y + h, STONE_DK)
    rect(x + w, y + 2, x + w, y + h, STONE_DK)
    # roof
    for i in range((w // 2) + 1):
        rect(x + i, y - i + 2, x + w - i, y - i + 2, roof)
    rect(x + w // 2, y + 4, x + w // 2, y + h, STONE_MD)  # door column hint
    # windows
    for wx in range(x + 2, x + w - 1, 3):
        px(wx, y + 5, STONE_DK)
        px(wx, y + h - 2, STONE_DK)


def tree(x, y):
    px(x, y + 3, ROOF_DK)
    blob(x, y, 2, 2, TREE_DK)
    px(x - 1, y - 1, GRASS_MD)


def flagpole(x, y, c):
    rect(x, y - 6, x, y, STONE_DK)
    rect(x + 1, y - 6, x + 3, y - 4, c)


def island(num):
    cx, cy, _ = ISLANDS[num]
    # sand rim then grass
    blob(cx, cy, 30, 21, SAND_DK)
    blob(cx, cy, 29, 20, SAND)
    blob(cx, cy, 27, 18, GRASS_DK)
    blob(cx, cy, 26, 17, GRASS_MD)
    blob(cx, cy, 20, 12, GRASS_LT)
    # foam ring speckle
    for a in range(0, 360, 20):
        import math
        rad = math.radians(a)
        fx = cx + int(31 * math.cos(rad))
        fy = cy + int(22 * math.sin(rad))
        px(fx, fy, FOAM)
    # trees around edge
    tree(cx - 20, cy - 8)
    tree(cx + 19, cy + 7)
    tree(cx - 18, cy + 9)
    tree(cx + 20, cy - 6)

    # compound: choose roof by role
    if num in (5, 4):          # comms vault / pouch room -> secure blue
        rmain = ROOF_BLU
    elif num in (6, 7):        # liaison / archives -> green
        rmain = ROOF_GRN
    else:
        rmain = ROOF
    building(cx - 9, cy - 4, 12, 9, rmain)
    building(cx + 5, cy + 1, 8, 7, ROOF_DK)
    building(cx - 12, cy + 4, 7, 6, rmain)
    flagpole(cx + 12, cy - 6, CREAM)


for n in ISLANDS:
    island(n)

# ---- Small ships on the sea ----------------------------------------------
def ship(x, y):
    rect(x, y, x + 4, y, STONE_DK)
    rect(x + 1, y + 1, x + 3, y + 1, ROOF_DK)
    rect(x + 2, y - 3, x + 2, y - 1, STONE_LT)
    px(x + 3, y - 3, CREAM)


for _ in range(7):
    sx = random.randint(30, W - 60)
    sy = random.randint(30, H - 40)
    ship(sx, sy)

# ---- Compass rose (bottom-left) ------------------------------------------
ccx, ccy = 40, 222
for r in range(8, 0, -1):
    col = BRASS_MD if r % 2 else BRASS_DK
    d.ellipse([ccx - r, ccy - r, ccx + r, ccy + r], outline=col)
rect(ccx, ccy - 8, ccx, ccy + 8, CREAM)
rect(ccx - 8, ccy, ccx + 8, ccy, CREAM)
px(ccx, ccy - 8, ROOF); px(ccx, ccy - 7, ROOF)  # north tip red
text(ccx - 2, ccy - 17, "N", INK)

# ---- Deckled parchment border --------------------------------------------
BW = 13
rect(0, 0, W - 1, BW, PARCH_MD)
rect(0, H - 1 - BW, W - 1, H - 1, PARCH_MD)
rect(0, 0, BW, H - 1, PARCH_MD)
rect(W - 1 - BW, 0, W - 1, H - 1, PARCH_MD)
# parchment shading grain
for _ in range(900):
    x = random.randint(0, W - 1); y = random.randint(0, H - 1)
    if x < BW or x > W - 1 - BW or y < BW or y > H - 1 - BW:
        c = random.choice([PARCH_LT, PARCH_DK, PARCH_MD])
        px(x, y, c)
# deckle inner edge (irregular notches of sea + parchment bumps)
for y in range(BW - 2, H - BW + 2):
    n = random.randint(-1, 2)
    for k in range(n):
        px(BW + k, y, SEA_DEEP)
        px(W - 1 - BW - k, y, SEA_DEEP)
    if random.random() < 0.3:
        px(BW - 1, y, PARCH_DK)
        px(W - BW, y, PARCH_DK)
for x in range(BW - 2, W - BW + 2):
    n = random.randint(-1, 2)
    for k in range(n):
        px(x, BW + k, SEA_DEEP)
        px(x, H - 1 - BW - k, SEA_DEEP)
    if random.random() < 0.3:
        px(x, BW - 1, PARCH_DK)
        px(x, H - BW, PARCH_DK)
# thin outer + inner framing lines
d.rectangle([0, 0, W - 1, H - 1], outline=DECKLE_DK)
d.rectangle([BW, BW, W - 1 - BW, H - 1 - BW], outline=GOLD_LINE)

# ---- Right-margin pennant strip (neutral) --------------------------------
strip_x = W - 12
rect(strip_x - 1, 26, strip_x, H - 40, PARCH_DK)  # leather cord
for i, c in enumerate(PENNANTS):
    py = 30 + i * 24
    # pennant swallowtail
    rect(strip_x - 9, py, strip_x - 1, py + 10, c)
    rect(strip_x - 9, py, strip_x - 9, py + 10, INK)
    # tail notch
    px(strip_x - 1, py + 4, PARCH_MD)
    px(strip_x - 1, py + 5, PARCH_MD)
    px(strip_x - 2, py + 5, PARCH_MD)
    # emblem dot (generic seal)
    px(strip_x - 5, py + 4, CREAM)
    px(strip_x - 5, py + 5, CREAM)

# ---- Bottom feature label (like "DANUBE") --------------------------------
lbl = "DIPLOMATIC POUCH SEA-LANE"
text((W - text_w(lbl)) // 2, H - 22, lbl, CREAM)

# ---- Title plaque (brass) -------------------------------------------------
title = "OVERSEAS POST"
tw = text_w(title)
pad = 10
px0 = (W - (tw + pad * 2)) // 2
px1 = px0 + tw + pad * 2
py0, py1 = 3, 21
rect(px0, py0, px1, py1, BRASS_MD)
rect(px0, py0, px1, py0, BRASS_LT)
rect(px0, py1, px1, py1, BRASS_DK)
d.rectangle([px0, py0, px1, py1], outline=BRASS_DK)
d.rectangle([px0 + 2, py0 + 2, px1 - 2, py1 - 2], outline=BRASS_LT)
# corner rivets
for rx in (px0 + 3, px1 - 3):
    for ry in (py0 + 3, py1 - 3):
        px(rx, ry, INK)
text((W - tw) // 2, py0 + 5, title, INK)

# ---- Numbered marker badges + labels (drawn last, on top) ----------------
def marker_layout(num):
    cx, cy, name = ISLANDS[num]
    my = cy - 30  # above compound
    lw = text_w(name)
    if cx < W // 2:                       # badge left, name extends right
        ox0, ox1, bx, tx = cx - 8, cx + 12 + lw, cx, cx + 6
    else:                                 # name extends left, badge at right
        ox0, ox1, bx, tx = cx - 12 - lw, cx + 8, cx, cx - 6 - lw
    return my, ox0, ox1, bx, tx


def marker_bg(num):
    my, ox0, ox1, bx, _ = marker_layout(num)
    rect(ox0, my, ox1, my + 11, PARCH_LT)
    d.rectangle([ox0, my, ox1, my + 11], outline=DECKLE_DK)
    rect(ox0 + 1, my + 1, ox1 - 1, my + 1, CREAM)
    d.ellipse([bx - 9, my - 1, bx + 3, my + 11], fill=BRASS_MD, outline=BRASS_DK)
    d.ellipse([bx - 8, my, bx + 2, my + 10], outline=BRASS_LT)


def marker_text(num):
    my, _, _, bx, tx = marker_layout(num)
    text(bx - 5, my + 1, str(num), INK)
    text(tx, my + 2, ISLANDS[num][2], INK)


for n in ISLANDS:      # backgrounds first
    marker_bg(n)
for n in ISLANDS:      # then text, so it is never overwritten
    marker_text(n)

# ---- Verify limited palette, then upscale x4 (nearest) --------------------
colors = img.getcolors(maxcolors=100000)
print("native color count:", len(colors))
assert len(colors) <= 64, "palette not limited enough: %d" % len(colors)

big = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
print("final size:", big.size)

import sys
out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/world2.png"
native_out = out.replace(".png", "_native.png")
img.save(native_out)
big.save(out)
print("saved:", out, "and", native_out)
