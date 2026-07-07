#!/usr/bin/env python3
"""Generate six 16-bit storyboard frames for the Ruby Rule: The FRUS Quest demo trailer.

Each frame is an exact 256x224 indexed-color PNG built from a fixed SNES-style
palette drawn from the game's existing art (warm archive browns, gold leaf, ruby
buckram red, navy, cherry-blossom pink). No anti-aliasing: every pixel is a hard
palette index. Shading uses ordered (Bayer) dithering so gradients stay crisp.

Run: python3 docs/promo/generate_frames.py
Output: docs/promo/frame_*.png
"""
from PIL import Image
import os

W, H = 256, 224
OUT = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Palette - indices are referenced by name throughout. Colors sampled/curated
# from the existing FRUS art pack (title screen, DANN-E, cherry garden, volumes).
# ---------------------------------------------------------------------------
PAL = [
    ("black",      0x08, 0x06, 0x08),
    ("ink",        0x14, 0x10, 0x14),
    ("shadow",     0x22, 0x1a, 0x18),
    ("brownd",     0x3a, 0x28, 0x18),
    ("brown",      0x5a, 0x40, 0x22),
    ("brownl",     0x7c, 0x58, 0x30),
    ("wood",       0x94, 0x6c, 0x3c),
    ("tan",        0xb0, 0x88, 0x50),
    ("golddk",     0x9a, 0x74, 0x2c),
    ("gold",       0xc6, 0x9c, 0x48),
    ("goldl",      0xe6, 0xc2, 0x74),
    ("cream",      0xf0, 0xe2, 0xbc),
    ("parch",      0xd8, 0xc4, 0x94),
    ("parchd",     0xb8, 0xa0, 0x70),
    ("rubyd",      0x5c, 0x12, 0x14),
    ("ruby",       0x8e, 0x1c, 0x22),
    ("rubyl",      0xc2, 0x2e, 0x30),
    ("redglow",    0xf0, 0x54, 0x40),
    ("navyd",      0x0c, 0x12, 0x28),
    ("navy",       0x1a, 0x22, 0x44),
    ("navyl",      0x2e, 0x3c, 0x66),
    ("steeld",     0x30, 0x34, 0x40),
    ("steel",      0x50, 0x56, 0x64),
    ("steell",     0x7a, 0x82, 0x92),
    ("silver",     0xb0, 0xb8, 0xc4),
    ("cyan",       0x4c, 0xc0, 0xd0),
    ("cyanl",      0xa8, 0xf0, 0xf4),
    ("greend",     0x1e, 0x3a, 0x22),
    ("green",      0x36, 0x62, 0x34),
    ("greenl",     0x62, 0x94, 0x48),
    ("pink",       0xe6, 0x9c, 0xc0),
    ("pinkl",      0xf6, 0xce, 0xe0),
    ("skin",       0xe0, 0xb0, 0x88),
    ("skind",      0xa8, 0x78, 0x58),
    ("white",      0xf4, 0xf0, 0xe6),
    ("waterd",     0x1c, 0x3c, 0x5c),
    ("water",      0x2e, 0x64, 0x8c),
    ("waterl",     0x5a, 0x9c, 0xc0),
]
IDX = {name: i for i, (name, *_rgb) in enumerate(PAL)}
FLAT = []
for _n, r, g, b in PAL:
    FLAT += [r, g, b]
FLAT += [0, 0, 0] * (256 - len(PAL))


class Canvas:
    def __init__(self, w=W, h=H, bg="black"):
        self.w, self.h = w, h
        self.px = [[IDX[bg]] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = IDX[c] if isinstance(c, str) else c

    def hline(self, x0, x1, y, c):
        if x0 > x1:
            x0, x1 = x1, x0
        for x in range(x0, x1 + 1):
            self.set(x, y, c)

    def vline(self, x, y0, y1, c):
        if y0 > y1:
            y0, y1 = y1, y0
        for y in range(y0, y1 + 1):
            self.set(x, y, c)

    def rect(self, x0, y0, x1, y1, c):
        self.hline(x0, x1, y0, c)
        self.hline(x0, x1, y1, c)
        self.vline(x0, y0, y1, c)
        self.vline(x1, y0, y1, c)

    def fill(self, x0, y0, x1, y1, c):
        if x0 > x1:
            x0, x1 = x1, x0
        if y0 > y1:
            y0, y1 = y1, y0
        ci = IDX[c] if isinstance(c, str) else c
        for y in range(max(0, y0), min(self.h, y1 + 1)):
            row = self.px[y]
            for x in range(max(0, x0), min(self.w, x1 + 1)):
                row[x] = ci

    # 4x4 Bayer ordered dither between two colors. t=0 -> all a, t=1 -> all b.
    BAYER = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
    ]

    def dither_fill(self, x0, y0, x1, y1, a, b, t):
        if x0 > x1:
            x0, x1 = x1, x0
        if y0 > y1:
            y0, y1 = y1, y0
        ai = IDX[a] if isinstance(a, str) else a
        bi = IDX[b] if isinstance(b, str) else b
        thr = t * 16
        for y in range(max(0, y0), min(self.h, y1 + 1)):
            row = self.px[y]
            for x in range(max(0, x0), min(self.w, x1 + 1)):
                row[x] = bi if self.BAYER[y & 3][x & 3] < thr else ai

    # Vertical gradient using per-row dithered blend across a color ramp.
    def vgrad(self, x0, y0, x1, y1, ramp):
        n = len(ramp) - 1
        span = max(1, y1 - y0)
        for y in range(y0, y1 + 1):
            f = (y - y0) / span * n
            i = min(n - 1, int(f))
            frac = f - i
            self.dither_fill(x0, y, x1, y, ramp[i], ramp[i + 1], frac)

    def radial_glow(self, cx, cy, r, inner, outer):
        """Soft round glow: dither blend from inner (center) to outer (rim)."""
        ii = IDX[inner] if isinstance(inner, str) else inner
        oi = IDX[outer] if isinstance(outer, str) else outer
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                if d2 > r * r:
                    continue
                t = (d2 ** 0.5) / r
                self.px[y][x] = (oi if self.BAYER[y & 3][x & 3] < t * 16 else ii) \
                    if 0 <= x < self.w and 0 <= y < self.h else self.px[y][x]

    def fill_circle(self, cx, cy, r, c, edge=None):
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                d = (x - cx) ** 2 + (y - cy) ** 2
                if d <= r * r:
                    self.set(x, y, c)
                elif edge and d <= (r + 1) ** 2:
                    self.set(x, y, edge)

    def ring(self, cx, cy, r, c):
        # midpoint circle outline
        x, y, d = r, 0, 1 - r
        while x >= y:
            for sx, sy in ((x, y), (y, x), (-x, y), (-y, x),
                           (x, -y), (y, -x), (-x, -y), (-y, -x)):
                self.set(cx + sx, cy + sy, c)
            y += 1
            if d < 0:
                d += 2 * y + 1
            else:
                x -= 1
                d += 2 * (y - x) + 1

    def save(self, path):
        im = Image.new("P", (self.w, self.h))
        im.putpalette(FLAT)
        im.putdata([c for row in self.px for c in row])
        im.save(path)
        return im


# ---------------------------------------------------------------------------
# 5x7 pixel font (uppercase, digits, punctuation). Each glyph = 7 rows of 5 px.
# ---------------------------------------------------------------------------
FONT = {
    'A': ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    'B': ["11110", "10001", "11110", "10001", "10001", "10001", "11110"],
    'C': ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    'D': ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    'E': ["11111", "10000", "11110", "10000", "10000", "10000", "11111"],
    'F': ["11111", "10000", "11110", "10000", "10000", "10000", "10000"],
    'G': ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
    'H': ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    'I': ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    'J': ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
    'K': ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    'L': ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    'M': ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    'N': ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    'O': ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    'P': ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    'Q': ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    'R': ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    'S': ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    'T': ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    'U': ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    'V': ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    'W': ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    'X': ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    'Y': ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    'Z': ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    '0': ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    '1': ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    '2': ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
    '3': ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    '4': ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    '5': ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    '6': ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    '7': ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    '8': ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    '9': ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    ' ': ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    '.': ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
    ',': ["00000", "00000", "00000", "00000", "01100", "01100", "01000"],
    '!': ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    '?': ["01110", "10001", "00010", "00100", "00100", "00000", "00100"],
    ':': ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
    '-': ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    "'": ["00100", "00100", "00100", "00000", "00000", "00000", "00000"],
    '/': ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
    '&': ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
    '(': ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
    ')': ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
    '*': ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
    '+': ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
    '%': ["11000", "11001", "00010", "00100", "01000", "10011", "00011"],
    '>': ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
    '<': ["00001", "00010", "00100", "01000", "00100", "00010", "00001"],
}


def text_width(s, scale=1, spacing=1):
    return (len(s) * (5 + spacing) - spacing) * scale


def draw_text(cv, s, x, y, color, scale=1, spacing=1, shadow=None):
    s = s.upper()
    cx = x
    for ch in s:
        g = FONT.get(ch, FONT['?'])
        for ry, row in enumerate(g):
            for rx, bit in enumerate(row):
                if bit == '1':
                    if shadow is not None:
                        for dx, dy in ((1, 1),):
                            cv.fill(cx + rx * scale + dx, y + ry * scale + dy,
                                    cx + rx * scale + dx + scale - 1,
                                    y + ry * scale + dy + scale - 1, shadow)
        cx += (5 + spacing) * scale
    # draw glyph fills on top so shadow sits behind
    cx = x
    for ch in s:
        g = FONT.get(ch, FONT['?'])
        for ry, row in enumerate(g):
            for rx, bit in enumerate(row):
                if bit == '1':
                    cv.fill(cx + rx * scale, y + ry * scale,
                            cx + rx * scale + scale - 1,
                            y + ry * scale + scale - 1, color)
        cx += (5 + spacing) * scale


def draw_text_center(cv, s, y, color, scale=1, spacing=1, shadow=None):
    x = (W - text_width(s, scale, spacing)) // 2
    draw_text(cv, s, x, y, color, scale, spacing, shadow)


# ---------------------------------------------------------------------------
# Shared decorative elements
# ---------------------------------------------------------------------------
def ornate_border(cv):
    """Gold double-line archive frame with corner studs, matching game screens."""
    cv.rect(0, 0, W - 1, H - 1, "black")
    cv.rect(1, 1, W - 2, H - 2, "golddk")
    cv.rect(2, 2, W - 3, H - 3, "gold")
    cv.rect(3, 3, W - 4, H - 4, "goldl")
    cv.rect(4, 4, W - 5, H - 5, "golddk")
    cv.rect(5, 5, W - 6, H - 6, "brownd")
    for (cx, cy) in ((6, 6), (W - 7, 6), (6, H - 7), (W - 7, H - 7)):
        cv.fill(cx - 2, cy - 2, cx + 2, cy + 2, "goldl")
        cv.fill(cx - 1, cy - 1, cx + 1, cy + 1, "rubyl")
        cv.set(cx, cy, "redglow")


def letterbox(cv, bar=26):
    cv.fill(0, 0, W - 1, bar - 1, "black")
    cv.fill(0, H - bar, W - 1, H - 1, "black")
    cv.hline(0, W - 1, bar, "golddk")
    cv.hline(0, W - 1, H - bar - 1, "golddk")


def label_plate(cv, s, y, scale=1):
    """Small centered gold nameplate with dark text field."""
    w = text_width(s, scale) + 12
    x0 = (W - w) // 2
    x1 = x0 + w
    h = 7 * scale + 6
    cv.fill(x0, y, x1, y + h, "brownd")
    cv.rect(x0, y, x1, y + h, "gold")
    cv.rect(x0 + 1, y + 1, x1 - 1, y + h - 1, "golddk")
    draw_text_center(cv, s, y + 3, "goldl", scale, shadow="black")


def star_scatter(cv, x0, y0, x1, y1, color, seed=1, density=23):
    r = seed
    for y in range(y0, y1):
        for x in range(x0, x1):
            r = (r * 1103515245 + 12345) & 0x7fffffff
            if r % density == 0:
                cv.set(x, y, color)


def sparkle(cv, x, y, color, core="white"):
    cv.set(x, y, core)
    cv.set(x - 1, y, color)
    cv.set(x + 1, y, color)
    cv.set(x, y - 1, color)
    cv.set(x, y + 1, color)


def bookshelf_bg(cv, x0, y0, x1, y1):
    """Wall of archive volumes - the recurring FRUS backdrop."""
    cv.dither_fill(x0, y0, x1, y1, "brownd", "shadow", 0.5)
    shelf_h = 18
    colors = ["ruby", "rubyd", "brown", "greend", "navy", "golddk", "brownl"]
    ci = 0
    for sy in range(y0, y1, shelf_h):
        # shelf plank
        cv.fill(x0, min(y1, sy + shelf_h - 3), x1, min(y1, sy + shelf_h - 1), "brownd")
        cv.hline(x0, x1, sy, "black")
        bx = x0 + 1
        while bx < x1 - 2:
            r = (bx * 7 + sy * 13) % 6 + 5
            w = min(r, x1 - 1 - bx)
            top = sy + ((bx * 3) % 3)
            col = colors[ci % len(colors)]
            ci += 1
            cv.fill(bx, top, bx + w - 1, sy + shelf_h - 4, col)
            cv.vline(bx, top, sy + shelf_h - 4, "black")
            # gold band on some spines
            if (bx // 3) % 2 == 0:
                cv.hline(bx + 1, bx + w - 2, top + 3, "gold")
                cv.hline(bx + 1, bx + w - 2, sy + shelf_h - 7, "goldl")
            bx += w + 1


def great_seal(cv, cx, cy, r):
    """Stylized US Great Seal medallion."""
    cv.fill_circle(cx, cy, r, "golddk", edge="black")
    cv.fill_circle(cx, cy, r - 1, "gold")
    cv.ring(cx, cy, r, "black")
    cv.ring(cx, cy, r - 2, "goldl")
    # eagle body suggestion
    cv.fill(cx - 1, cy - r + 3, cx + 1, cy + r - 3, "brownd")
    cv.fill(cx - r + 3, cy - 1, cx + r - 3, cy + 1, "brownd")
    for dx in range(-r + 3, r - 2):
        cv.set(cx + dx, cy - 2 - abs(dx) // 3, "goldl")
    cv.set(cx, cy, "cream")


# ===========================================================================
# FRAME 1 - Title screen reveal
# ===========================================================================
def frame1():
    cv = Canvas()
    bookshelf_bg(cv, 0, 0, W - 1, H - 1)
    # darken vignette toward center-glow
    cv.dither_fill(0, 0, W - 1, H - 1, "black", "black", 0)  # no-op keep
    cv.vgrad(0, 0, W - 1, 60, ["black", "shadow"])
    ornate_border(cv)

    # radiant treasure glow behind the FRUS chest
    gx, gy = W // 2, 150
    for r, col in ((58, "brownd"), (46, "golddk"), (34, "gold"),
                   (24, "goldl"), (14, "cream")):
        cv.fill_circle(gx, gy, r, col)
    # ray streaks
    for a in range(0, 360, 30):
        import math
        dx, dy = math.cos(math.radians(a)), math.sin(math.radians(a))
        for t in range(14, 60, 2):
            cv.set(int(gx + dx * t), int(gy + dy * t * 0.7), "goldl")

    # open treasure chest holding a glowing FRUS volume
    cv.fill(gx - 34, gy - 6, gx + 34, gy + 30, "rubyd")
    cv.fill(gx - 32, gy - 4, gx + 32, gy + 28, "ruby")
    cv.rect(gx - 34, gy - 6, gx + 34, gy + 30, "black")
    cv.fill(gx - 30, gy - 2, gx + 30, gy + 8, "goldl")   # inner light
    cv.fill(gx - 30, gy + 8, gx + 30, gy + 26, "gold")
    # chest lid open (back)
    cv.fill(gx - 34, gy - 26, gx + 34, gy - 8, "rubyd")
    cv.rect(gx - 34, gy - 26, gx + 34, gy - 8, "black")
    cv.hline(gx - 32, gx + 32, gy - 17, "gold")
    # standing volume inside
    cv.fill(gx - 10, gy - 20, gx + 10, gy + 6, "rubyl")
    cv.rect(gx - 10, gy - 20, gx + 10, gy + 6, "black")
    great_seal(cv, gx, gy - 5, 6)
    draw_text_center(cv, "FRUS", gy - 18, "goldl", 1)

    # scattered classified papers at base
    for (px, py) in ((26, 178), (40, 190), (206, 176), (214, 192), (30, 200)):
        cv.fill(px, py, px + 20, py + 12, "parch")
        cv.rect(px, py, px + 20, py + 12, "brownd")
        for ly in range(py + 3, py + 11, 2):
            cv.hline(px + 2, px + 17, ly, "brownl")
    draw_text(cv, "TOP SECRET", 24, 172, "ruby", 1)

    # TITLE lockup
    draw_text_center(cv, "RUBY RULE", 30, "goldl", 3, shadow="black")
    # ruby accent underline
    cv.fill(46, 56, W - 46, 58, "rubyl")
    cv.hline(46, W - 46, 55, "goldl")
    draw_text_center(cv, "THE FRUS QUEST", 66, "cream", 1, shadow="black")

    # prompt
    draw_text_center(cv, "PRESS START TO VERIFY", 198, "goldl", 1, shadow="black")
    return cv


# ===========================================================================
# FRAME 2 - Character creation
# ===========================================================================
def frame2():
    cv = Canvas()
    cv.vgrad(0, 0, W - 1, H - 1, ["navyd", "navy", "brownd"])
    bookshelf_bg(cv, 8, 40, 92, H - 30)
    ornate_border(cv)
    label_plate(cv, "CHOOSE YOUR HISTORIAN", 12, 1)

    # left: portrait frame of selected character
    px0, py0, px1, py1 = 20, 42, 96, 150
    cv.fill(px0, py0, px1, py1, "navyd")
    cv.rect(px0, py0, px1, py1, "gold")
    cv.rect(px0 + 1, py0 + 1, px1 - 1, py1 - 1, "golddk")
    # character bust
    cx = (px0 + px1) // 2
    cv.fill_circle(cx, 92, 16, "skin")             # head
    cv.fill(cx - 16, 106, cx + 16, py1 - 3, "greend")  # tweed jacket
    cv.fill(cx - 5, 104, cx + 5, 116, "skin")      # neck
    cv.fill(cx - 6, 112, cx + 6, 122, "cream")     # collar
    cv.fill(cx - 2, 116, cx + 2, py1 - 3, "ruby")  # bow tie strip
    cv.fill(cx - 4, 118, cx + 4, 122, "ruby")
    # hair + glasses
    cv.fill(cx - 16, 78, cx + 16, 86, "shadow")
    cv.fill_circle(cx - 6, 92, 4, "steell")
    cv.fill_circle(cx + 6, 92, 4, "steell")
    cv.set(cx - 6, 92, "navyd")
    cv.set(cx + 6, 92, "navyd")
    cv.hline(cx - 2, cx + 2, 92, "gold")
    draw_text_center_in(cv, "THE COMPILER", px0, px1, py1 + 4, "goldl", 1)

    # right: class selection list
    lx = 112
    classes = [
        ("COMPILER", True),
        ("EDITOR", False),
        ("PROOFREADER", False),
        ("SOURCE-NOTE SPEC", False),
        ("DECLASS REVIEWER", False),
    ]
    ly = 48
    for name, sel in classes:
        col = "goldl" if sel else "parch"
        if sel:
            cv.fill(lx - 3, ly - 2, W - 16, ly + 10, "rubyd")
            cv.rect(lx - 3, ly - 2, W - 16, ly + 10, "gold")
            draw_text(cv, ">", lx - 12, ly, "redglow", 1)
        draw_text(cv, name, lx, ly, col, 1, shadow="black")
        ly += 16

    # stat bars panel
    sy = 140
    cv.fill(lx - 6, sy - 4, W - 14, H - 34, "navyd")
    cv.rect(lx - 6, sy - 4, W - 14, H - 34, "golddk")
    stats = [("RIGOR", 5), ("SPEED", 3), ("CITATION", 4), ("RESOLVE", 3)]
    for name, val in stats:
        draw_text(cv, name, lx, sy, "cream", 1)
        bx = lx + 66
        for i in range(5):
            col = "gold" if i < val else "shadow"
            cv.fill(bx + i * 9, sy, bx + i * 9 + 6, sy + 5, col)
            cv.rect(bx + i * 9, sy, bx + i * 9 + 6, sy + 5, "black")
        sy += 12

    draw_text_center(cv, "A CONFIRM   B BACK", 200, "goldl", 1, shadow="black")
    return cv


def draw_text_center_in(cv, s, x0, x1, y, color, scale=1):
    w = text_width(s, scale)
    x = x0 + ((x1 - x0) - w) // 2
    draw_text(cv, s, x, y, color, scale, shadow="black")


# ===========================================================================
# FRAME 3 - First DANN-E encounter
# ===========================================================================
def frame3():
    cv = Canvas()
    # ominous red/black vault atmosphere
    cv.vgrad(0, 0, W - 1, H - 1, ["black", "rubyd", "navyd"])
    # cracked red energy veins
    import math
    for k in range(9):
        x = 20 + k * 26
        y = 30
        for step in range(60):
            cv.set(x, y, "ruby" if step % 3 else "rubyl")
            x += (1 if (k + step) % 2 else -1) + (k % 3 - 1)
            y += 3
    letterbox(cv, 24)

    # DANN-E menacing silhouette center
    cx, cy = W // 2, 120
    # soft round red aura
    cv.radial_glow(cx, cy - 6, 68, "ruby", "black")
    cv.radial_glow(cx, cy - 6, 40, "rubyl", "ruby")
    # hulking shoulders + torso (trapezoid via stacked rows)
    for i, y in enumerate(range(cy - 8, cy + 46)):
        halfw = 30 - i // 4
        cv.hline(cx - halfw, cx + halfw, y, "steeld")
        cv.hline(cx - halfw + 3, cx + halfw - 3, y, "steel")
    cv.vline(cx - 30, cy - 8, cy + 40, "black")
    cv.vline(cx + 30, cy - 8, cy + 40, "black")
    # angular armored shoulders
    for side in (-1, 1):
        sx = cx + side * 30
        cv.fill(sx - 6, cy - 12, sx + 6, cy - 2, "steell")
        cv.rect(sx - 6, cy - 12, sx + 6, cy - 2, "black")
    # chest core reactor
    cv.fill_circle(cx, cy + 14, 9, "black")
    cv.fill_circle(cx, cy + 14, 7, "rubyd")
    cv.fill_circle(cx, cy + 14, 4, "redglow")
    cv.set(cx, cy + 14, "cream")
    # neck
    cv.fill(cx - 6, cy - 16, cx + 6, cy - 8, "steeld")
    # large angular head with horns
    cv.fill(cx - 17, cy - 40, cx + 17, cy - 14, "steel")
    cv.fill(cx - 17, cy - 40, cx + 17, cy - 33, "steell")
    cv.rect(cx - 17, cy - 40, cx + 17, cy - 14, "black")
    # horns / antenna spikes
    for hx in (cx - 17, cx + 17):
        for k in range(6):
            cv.set(hx + (0 if hx < cx else 0), cy - 40 - k, "steell")
        cv.set(hx, cy - 46, "silver")
    cv.set(cx - 20, cy - 44, "steel"); cv.set(cx + 20, cy - 44, "steel")
    # glowing angry eyes (angled)
    for side in (-1, 1):
        ex = cx + side * 8
        cv.fill(ex - 4, cy - 30, ex + 4, cy - 26, "redglow")
        cv.fill(ex - 4 + (side < 0), cy - 31, ex - 1 + (side < 0), cy - 31, "rubyl")
        cv.set(ex, cy - 28, "cream")
    # brow ridge (menace)
    cv.hline(cx - 15, cx - 2, cy - 32, "black")
    cv.hline(cx + 2, cx + 15, cy - 32, "black")
    # jagged grin
    cv.hline(cx - 11, cx + 11, cy - 20, "black")
    for i in range(-10, 11, 2):
        cv.vline(cx + i, cy - 22, cy - 19, "redglow")
    # long clawed arms reaching forward
    for side in (-1, 1):
        ax = cx + side * 34
        for i, y in enumerate(range(cy - 6, cy + 34)):
            cv.hline(ax - 4, ax + 4, y, "steeld")
        cv.rect(ax - 4, cy - 6, ax + 4, cy + 34, "black")
        cv.fill(ax - 5, cy + 6, ax + 5, cy + 12, "steell")  # elbow joint
        for f in range(-4, 6, 3):                            # claws
            cv.vline(ax + f, cy + 34, cy + 44, "silver")
            cv.set(ax + f, cy + 45, "cream")
    # ego bolts hurled from claws
    for bx, by in ((cx - 52, cy + 40), (cx + 52, cy + 40)):
        cv.radial_glow(bx, by, 9, "redglow", "black")
        cv.fill_circle(bx, by, 4, "rubyl")
        cv.set(bx, by, "cream")
        for a in range(0, 360, 45):
            cv.set(int(bx + math.cos(math.radians(a)) * 10),
                   int(by + math.sin(math.radians(a)) * 10), "rubyl")

    # dialog + label
    label_plate(cv, "! DANN-E APPEARS !", 30, 1)
    # bottom dialog box
    by0 = H - 22
    cv.fill(14, by0, W - 14, H - 8, "navyd")
    cv.rect(14, by0, W - 14, H - 8, "gold")
    draw_text(cv, "YOU CANNOT DECLASSIFY ME.", 22, by0 + 4, "cyanl", 1)
    return cv


# ===========================================================================
# FRAME 4 - Volume-assembly progress moment
# ===========================================================================
def frame4():
    cv = Canvas()
    cv.vgrad(0, 0, W - 1, H - 1, ["navyd", "navy"])
    star_scatter(cv, 6, 20, W - 6, H - 30, "steell", seed=7, density=29)
    ornate_border(cv)
    label_plate(cv, "COMPILING THE RECORD", 12, 1)

    # bookshelf slots - 6 volumes, 4 collected glowing, 2 empty
    slots = 6
    sw = 30
    total = slots * sw
    x0 = (W - total) // 2
    baseY = 60
    era = ["45", "52", "61", "69", "77", "81"]
    got = [True, True, True, True, False, False]
    cv.fill(x0 - 6, baseY - 6, x0 + total + 4, baseY + 74, "brownd")
    cv.rect(x0 - 6, baseY - 6, x0 + total + 4, baseY + 74, "gold")
    cv.rect(x0 - 5, baseY - 5, x0 + total + 3, baseY + 73, "golddk")
    cv.fill(x0 - 6, baseY + 66, x0 + total + 4, baseY + 74, "brown")  # shelf plank
    for i in range(slots):
        vx = x0 + i * sw + 4
        if got[i]:
            for r in range(3):
                cv.set(vx - 2, baseY - 3 + r, "goldl")
            cv.fill(vx, baseY, vx + sw - 10, baseY + 62, "ruby")
            cv.fill(vx, baseY, vx + 3, baseY + 62, "rubyl")   # spine light
            cv.rect(vx, baseY, vx + sw - 10, baseY + 62, "black")
            cv.hline(vx + 2, vx + sw - 12, baseY + 8, "gold")
            cv.hline(vx + 2, vx + sw - 12, baseY + 54, "goldl")
            great_seal(cv, vx + (sw - 10) // 2, baseY + 32, 5)
            draw_text_center_in(cv, era[i], vx, vx + sw - 10, baseY + 44, "goldl", 1)
            sparkle(cv, vx + (sw - 10) // 2, baseY - 4, "goldl")
        else:
            cv.dither_fill(vx, baseY, vx + sw - 10, baseY + 62, "shadow", "brownd", 0.5)
            cv.rect(vx, baseY, vx + sw - 10, baseY + 62, "golddk")
            draw_text_center_in(cv, "?", vx, vx + sw - 10, baseY + 28, "brownl", 2)

    # progress meter
    my = 150
    cv.fill(24, my, W - 24, my + 16, "navyd")
    cv.rect(24, my, W - 24, my + 16, "gold")
    filled = int((W - 52) * 4 / 6)
    cv.vgrad(26, my + 2, 26 + filled, my + 14, ["gold", "goldl"])
    cv.dither_fill(26, my + 2, 26 + filled, my + 14, "gold", "goldl", 0.5)
    draw_text_center(cv, "4 / 6 VOLUMES VERIFIED", my + 20, "cream", 1, shadow="black")

    # ruby pen writing sparkle in corner
    px, py = 210, 176
    cv.fill(px, py, px + 3, py + 22, "ruby")
    cv.fill(px, py, px + 3, py + 4, "gold")
    cv.set(px + 1, py + 24, "silver")
    for s in range(5):
        sparkle(cv, px - 6 - s * 4, py + 20 - s * 3, "goldl")
    draw_text(cv, "THE RUBY PEN RECORDS EACH PROOF", 24, 196, "goldl", 1, shadow="black")
    return cv


# ===========================================================================
# FRAME 5 - Miniboss fight
# ===========================================================================
def frame5():
    cv = Canvas()
    # black vault arena
    cv.vgrad(0, 0, W - 1, H - 1, ["black", "rubyd", "ink"])
    # floor grid receding
    for i in range(0, W, 20):
        cv.vline(i, 150, H - 6, "shadow")
    for j, y in enumerate(range(150, H - 6, 10)):
        cv.hline(6, W - 6, y, "shadow")
    # runic circle on floor
    cv.ring(W // 2, 186, 40, "ruby")
    cv.ring(W // 2, 186, 30, "rubyd")
    ornate_border(cv)

    # boss health bar top
    hb0, hb1 = 40, W - 40
    cv.fill(hb0, 14, hb1, 24, "navyd")
    cv.rect(hb0 - 1, 13, hb1 + 1, 25, "gold")
    hp = int((hb1 - hb0 - 2) * 0.62)
    cv.dither_fill(hb0 + 1, 15, hb0 + 1 + hp, 23, "rubyl", "ruby", 0.5)
    draw_text_center(cv, "CENSORSHIP WRAITH", 28, "redglow", 1, shadow="black")

    # miniboss - the censorship wraith (hooded redactor), tapered cloak
    bx, by = W // 2, 92
    cv.radial_glow(bx, by + 10, 52, "ruby", "black")
    # flowing cloak: narrow at hood, wide at hem (inverted trapezoid)
    for i, y in enumerate(range(by - 6, by + 64)):
        halfw = 10 + i // 2
        cv.hline(bx - halfw, bx + halfw, y, "ink")
        cv.hline(bx - halfw + 2, bx + halfw - 2, y, "steeld")
    # tattered hem
    for i in range(-34, 35, 7):
        cv.vline(bx + i, by + 64, by + 70 + (i % 3), "ink")
    cv.set(bx - 34, by + 30, "black"); cv.set(bx + 34, by + 30, "black")
    # pointed hood
    for i, y in enumerate(range(by - 30, by + 8)):
        halfw = 3 + i // 2
        cv.hline(bx - halfw, bx + halfw, y, "ink")
    cv.fill(bx - 11, by - 14, bx + 11, by + 4, "shadow")
    cv.fill(bx - 11, by - 14, bx + 11, by + 4, "shadow")
    # void face + burning eyes
    cv.fill(bx - 9, by - 12, bx + 9, by + 2, "black")
    for ex in (bx - 5, bx + 5):
        cv.fill(ex - 2, by - 7, ex + 2, by - 3, "redglow")
        cv.fill(ex - 2, by - 8, ex + 2, by - 8, "rubyl")
        cv.set(ex, by - 5, "cream")
    # skeletal hands emerging, gripping redaction bars
    for side in (-1, 1):
        hx = bx + side * 24
        cv.fill(hx - 3, by + 18, hx + 3, by + 26, "silver")
        cv.rect(hx - 3, by + 18, hx + 3, by + 26, "black")
    # redaction bars hovering (its weapon)
    for (rx, ry) in ((bx - 50, by - 2), (bx + 30, by - 10), (bx + 40, by + 22)):
        cv.fill(rx, ry, rx + 24, ry + 6, "black")
        cv.rect(rx - 1, ry - 1, rx + 25, ry + 7, "ruby")
        cv.hline(rx + 2, rx + 22, ry + 3, "rubyd")

    # player at bottom left with ruby pen raised
    hx, hy = 52, 176
    cv.fill(hx - 8, hy, hx + 8, hy + 26, "greend")   # coat
    cv.fill_circle(hx, hy - 8, 7, "skin")            # head
    cv.fill(hx - 7, hy - 14, hx + 7, hy - 10, "shadow")  # hair
    cv.fill_circle(hx - 3, hy - 8, 2, "steell")
    cv.fill_circle(hx + 3, hy - 8, 2, "steell")
    # raised ruby pen slashing light
    cv.fill(hx + 8, hy - 22, hx + 11, hy - 2, "ruby")
    cv.fill(hx + 8, hy - 24, hx + 11, hy - 20, "gold")
    for s in range(6):
        cv.set(hx + 12 + s * 3, hy - 24 + s * 2, "goldl")
    # impact spark on boss
    sparkle(cv, bx - 20, by + 20, "cyanl", core="white")
    sparkle(cv, bx - 24, by + 26, "goldl")

    draw_text_center(cv, "STRIKE WITH VERIFIED CITATIONS", 200, "cyanl", 1, shadow="black")
    return cv


# ===========================================================================
# FRAME 6 - Binding-ceremony ending
# ===========================================================================
def frame6():
    cv = Canvas()
    # serene dawn sky over cherry-blossom garden
    cv.vgrad(0, 0, W - 1, 120, ["navy", "navyl", "pink"])
    cv.vgrad(0, 118, W - 1, H - 1, ["greend", "green"])
    # distant sun glow
    cv.fill_circle(W // 2, 70, 30, "goldl")
    cv.fill_circle(W // 2, 70, 20, "cream")
    star_scatter(cv, 6, 8, W - 6, 40, "cream", seed=3, density=41)

    # cherry blossom trees flanking
    for tx in (30, W - 30):
        cv.fill(tx - 3, 70, tx + 3, 118, "brownd")   # trunk
        for (ox, oy, r) in ((0, 46, 18), (-12, 54, 12), (12, 54, 12), (0, 60, 14)):
            cv.fill_circle(tx + ox, oy, r, "pink")
            cv.fill_circle(tx + ox, oy - 2, r - 3, "pinkl")
    # falling petals
    star_scatter(cv, 6, 40, W - 6, 150, "pink", seed=11, density=57)

    # reflecting pond
    cv.fill(40, 150, W - 40, 168, "water")
    cv.dither_fill(40, 150, W - 40, 168, "water", "waterl", 0.35)
    cv.rect(40, 150, W - 40, 168, "waterd")

    ornate_border(cv)

    # central pedestal with the bound legendary volume, radiant
    px, py = W // 2, 126
    cv.radial_glow(px, py, 40, "cream", "pink")
    import math
    for a in range(0, 360, 24):
        dx, dy = math.cos(math.radians(a)), math.sin(math.radians(a))
        for t in range(22, 56, 2):
            cv.set(int(px + dx * t), int(py + dy * t * 0.8), "goldl")
    # pedestal
    cv.fill(px - 16, py + 18, px + 16, py + 34, "parchd")
    cv.fill(px - 20, py + 32, px + 20, py + 38, "parch")
    cv.rect(px - 20, py + 32, px + 20, py + 38, "brownd")
    # the bound volume with halo
    cv.ring(px, py - 2, 16, "goldl")
    cv.fill(px - 11, py - 14, px + 11, py + 18, "ruby")
    cv.fill(px - 11, py - 14, px - 8, py + 18, "rubyl")
    cv.rect(px - 11, py - 14, px + 11, py + 18, "black")
    cv.hline(px - 9, px + 9, py - 8, "gold")
    cv.hline(px - 9, px + 9, py + 12, "goldl")
    great_seal(cv, px, py + 2, 6)
    sparkle(cv, px - 16, py - 16, "cream")
    sparkle(cv, px + 16, py - 10, "goldl")
    sparkle(cv, px + 14, py + 16, "cream")

    # two robed figures flanking, completing the binding ceremony
    for side, col in ((-1, "greend"), (1, "navy")):
        fx = px + side * 62
        # robe (tapered)
        for i, y in enumerate(range(py - 2, py + 42)):
            hw = 6 + i // 5
            cv.hline(fx - hw, fx + hw, y, col)
        cv.vline(fx - 10, py + 30, py + 41, "black")
        cv.vline(fx + 10, py + 30, py + 41, "black")
        # head + hair
        cv.fill_circle(fx, py - 8, 6, "skin")
        cv.fill(fx - 6, py - 14, fx + 6, py - 10, "shadow")
        # inner arm reaching toward the volume
        ay = py + 6
        ix = fx - side * 7
        cv.fill(min(ix, px - side * 16), ay, max(ix, px - side * 16), ay + 2, "skin")
        cv.set(px - side * 16, ay + 1, "goldl")

    label_plate(cv, "THE BINDING CEREMONY", 30, 1)
    draw_text_center(cv, "THE RECORD IS COMPLETE", 196, "goldl", 1, shadow="black")
    return cv


FRAMES = [
    ("frame_1_title_reveal.png", frame1),
    ("frame_2_character_creation.png", frame2),
    ("frame_3_danne_encounter.png", frame3),
    ("frame_4_volume_assembly.png", frame4),
    ("frame_5_miniboss_fight.png", frame5),
    ("frame_6_binding_ceremony.png", frame6),
]


def main():
    for name, fn in FRAMES:
        cv = fn()
        path = os.path.join(OUT, name)
        cv.save(path)
        print("wrote", path)


if __name__ == "__main__":
    main()
