#!/usr/bin/env python3
"""Deterministic generator for the FRUS "volume assembly" art sequence.

Produces original 16-bit SNES-style pixel art at exact native pixel sizes using
the ruby-red buckram palette established for Ruby Rule: FRUS Quest. All shapes
are hard-edged (no anti-aliasing), backgrounds are fully transparent, and every
colour is drawn from the shared NES master palette (src/art/palette.ts).

Outputs into public/assets/art-pack/volume-assembly/:
  * five cover pieces, each a 32x32 pickup icon + a 64x64 equipped/glowing icon
  * a 6-frame 384x64 assembly animation sheet (64x64 frames)
  * a 128x128 completed-volume hero sprite

Run: python3 scripts/generate-volume-assembly.py
"""
from __future__ import annotations

import os
from PIL import Image

# ---------------------------------------------------------------------------
# Palette (RGB hex, mirrors src/art/palette.ts). Alpha added at draw time.
# ---------------------------------------------------------------------------
def _rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

BLACK        = _rgb("#0F0F0F")   # NES_BLACK
DEEP_RUBY    = _rgb("#4A0712")   # NES_DEEP_RUBY
DARK_MAROON  = _rgb("#3A0710")   # NES_DARK_MAROON  (deepRuby in game PALETTE)
BUCKRAM      = _rgb("#7A1020")   # NES_BUCKRAM_RUBY (buckramRed)
MUTED_RUBY   = _rgb("#8F2030")   # NES_MUTED_RUBY
BRIGHT_RUBY  = _rgb("#B82030")   # NES_BRIGHT_RUBY
RUBY_HI      = _rgb("#B42335")   # NES_LEGACY_RUBY_HIGHLIGHT
CLASSNET_RED = _rgb("#FF3B3B")   # NES_CLASSNET_RED (ribbon silk highlight)
ROSE         = _rgb("#D06080")   # NES_ROSE
BRONZE       = _rgb("#806020")   # NES_BRONZE       (gold shadow)
GOLD         = _rgb("#D6A23A")   # NES_GOLD         (goldStamp)
OLD_GOLD     = _rgb("#D6A84F")   # NES_OLD_GOLD
PALE_GOLD    = _rgb("#F0D060")   # NES_PALE_GOLD    (gold highlight)
SEPIA        = _rgb("#B89A5A")   # NES_AGED_PAPER_SHADOW (sepiaInk)
CREAM        = _rgb("#E8D8A8")   # NES_CREAM_PAPER
WHITE_HI     = _rgb("#F8F0D8")   # NES_WHITE_HIGHLIGHT

# Every colour any sprite is allowed to use (for the palette-membership check).
ALLOWED = {
    BLACK, DEEP_RUBY, DARK_MAROON, BUCKRAM, MUTED_RUBY, BRIGHT_RUBY, RUBY_HI,
    CLASSNET_RED, ROSE, BRONZE, GOLD, OLD_GOLD, PALE_GOLD, SEPIA, CREAM, WHITE_HI,
}

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "art-pack", "volume-assembly",
)


# ---------------------------------------------------------------------------
# Tiny hard-edged drawing helpers. All coordinates are integer pixels.
# ---------------------------------------------------------------------------
class Canvas:
    def __init__(self, size: int):
        self.s = size
        self.img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        self.px = self.img.load()

    def dot(self, x: int, y: int, c, a: int = 255):
        if 0 <= x < self.s and 0 <= y < self.s:
            self.px[x, y] = (c[0], c[1], c[2], a)

    def rect(self, x0, y0, x1, y1, c, a: int = 255):
        """Filled inclusive rectangle."""
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.dot(x, y, c, a)

    def frame(self, x0, y0, x1, y1, c, a: int = 255):
        """1px rectangle outline."""
        for x in range(int(x0), int(x1) + 1):
            self.dot(x, int(y0), c, a)
            self.dot(x, int(y1), c, a)
        for y in range(int(y0), int(y1) + 1):
            self.dot(int(x0), y, c, a)
            self.dot(int(x1), y, c, a)

    def hline(self, x0, x1, y, c, a: int = 255):
        for x in range(int(x0), int(x1) + 1):
            self.dot(x, int(y), c, a)

    def vline(self, x, y0, y1, c, a: int = 255):
        for y in range(int(y0), int(y1) + 1):
            self.dot(int(x), y, c, a)

    def disc(self, cx, cy, r, c, a: int = 255):
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    self.dot(x, y, c, a)

    def ring(self, cx, cy, r, c, a: int = 255):
        inner = (r - 1) * (r - 1)
        outer = r * r
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                d = (x - cx) ** 2 + (y - cy) ** 2
                if inner < d <= outer:
                    self.dot(x, y, c, a)


def buckram_texture(cv: Canvas, x0, y0, x1, y1, step=3):
    """Deterministic woven-cloth speckle inside a ruby field."""
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            if (x + y) % step == 0 and (x * 7 + y * 3) % 5 == 0:
                cv.dot(x, y, DARK_MAROON)
            elif (x - y) % step == 0 and (x * 3 + y * 5) % 7 == 0:
                cv.dot(x, y, MUTED_RUBY)


# ---------------------------------------------------------------------------
# The five cover pieces. Each is drawn to fill a square of the given size so
# the 32px pickup and 64px equipped variants share the same silhouette.
# `glow` adds the equipped/charged aura.
# ---------------------------------------------------------------------------
def draw_spine(size: int, glow: bool) -> Image.Image:
    cv = Canvas(size)
    u = size / 32.0
    x0, x1 = int(9 * u), int(22 * u)
    y0, y1 = int(2 * u), int(29 * u)
    if glow:
        cv.rect(x0 - 2, y0 - 2, x1 + 2, y1 + 2, PALE_GOLD, 60)
        cv.frame(x0 - 2, y0 - 2, x1 + 2, y1 + 2, GOLD, 130)
    cv.rect(x0 + 1, y0 + 1, x1 + 1, y1 + 1, BLACK, 150)          # drop shadow
    cv.rect(x0, y0, x1, y1, BUCKRAM)                              # spine body
    cv.vline(x0, y0, y1, MUTED_RUBY)                             # lit edge
    cv.vline(x1, y0, y1, DARK_MAROON)                            # shaded edge
    buckram_texture(cv, x0 + 1, y0 + 1, x1 - 1, y1 - 1)
    cv.frame(x0, y0, x1, y1, GOLD)                                # gold rule
    for gy in (7, 12, 22, 26):                                    # raised bands
        yy = int(gy * u)
        cv.hline(x0, x1, yy, GOLD)
        cv.hline(x0, x1, yy + 1 if u >= 2 else yy, BRONZE)
    # gold title glyph blocks on the spine face
    midx = (x0 + x1) // 2
    for gy in (15, 18):
        yy = int(gy * u)
        cv.hline(midx - int(3 * u), midx + int(3 * u), yy, PALE_GOLD)
    return cv.img


def draw_front_board(size: int, glow: bool) -> Image.Image:
    cv = Canvas(size)
    u = size / 32.0
    x0, y0, x1, y1 = int(4 * u), int(3 * u), int(28 * u), int(29 * u)
    if glow:
        cv.rect(x0 - 2, y0 - 2, x1 + 2, y1 + 2, PALE_GOLD, 60)
        cv.frame(x0 - 2, y0 - 2, x1 + 2, y1 + 2, GOLD, 130)
    cv.rect(x0 + 1, y0 + 1, x1 + 1, y1 + 1, BLACK, 150)
    cv.rect(x0, y0, x1, y1, BUCKRAM)
    cv.hline(x0, x1, y0, MUTED_RUBY)
    cv.vline(x0, y0, y1, MUTED_RUBY)
    cv.hline(x0, x1, y1, DARK_MAROON)
    cv.vline(x1, y0, y1, DARK_MAROON)
    buckram_texture(cv, x0 + 1, y0 + 1, x1 - 1, y1 - 1)
    cv.frame(x0, y0, x1, y1, GOLD)                                # outer gold rule
    inset = int(2 * u)
    cv.frame(x0 + inset, y0 + inset, x1 - inset, y1 - inset, GOLD)  # inner border
    # gold corner flourishes
    for cx, cy in ((x0 + inset, y0 + inset), (x1 - inset, y0 + inset),
                   (x0 + inset, y1 - inset), (x1 - inset, y1 - inset)):
        cv.dot(cx, cy, PALE_GOLD)
        cv.hline(cx - 1, cx + 1, cy, PALE_GOLD)
        cv.vline(cx, cy - 1, cy + 1, PALE_GOLD)
    return cv.img


def draw_title_plate(size: int, glow: bool) -> Image.Image:
    cv = Canvas(size)
    u = size / 32.0
    x0, y0, x1, y1 = int(3 * u), int(9 * u), int(28 * u), int(22 * u)
    if glow:
        cv.rect(x0 - 2, y0 - 3, x1 + 2, y1 + 3, PALE_GOLD, 60)
        cv.frame(x0 - 2, y0 - 3, x1 + 2, y1 + 3, GOLD, 130)
    cv.rect(x0 + 1, y0 + 1, x1 + 1, y1 + 1, BLACK, 150)
    cv.rect(x0, y0, x1, y1, GOLD)                                 # brass plate
    cv.hline(x0, x1, y0, PALE_GOLD)                              # top sheen
    cv.vline(x0, y0, y1, PALE_GOLD)
    cv.hline(x0, x1, y1, BRONZE)                                 # bottom shade
    cv.vline(x1, y0, y1, BRONZE)
    inset = int(2 * u)
    cv.frame(x0 + inset, y0 + inset, x1 - inset, y1 - inset, BRONZE)
    cv.rect(x0 + inset + 1, y0 + inset + 1, x1 - inset - 1, y1 - inset - 1, CREAM)  # engraved field
    # engraved title rules (the FOREIGN RELATIONS lines)
    tx0, tx1 = x0 + inset + 2, x1 - inset - 2
    for ry in (12, 15, 18):
        yy = int(ry * u)
        if y0 + inset + 1 < yy < y1 - inset - 1:
            cv.hline(tx0, tx1, yy, SEPIA)
    return cv.img


def draw_ribbon(size: int, glow: bool) -> Image.Image:
    cv = Canvas(size)
    u = size / 32.0
    x0, x1 = int(12 * u), int(19 * u)
    top = int(2 * u)
    tail = int(23 * u)      # where the straight body ends
    bottom = int(29 * u)    # tip of the swallowtail forks
    mid = (x0 + x1) // 2
    if glow:
        cv.rect(x0 - 2, top - 2, x1 + 2, bottom + 2, PALE_GOLD, 55)
    # straight ribbon body
    cv.rect(x0 + 1, top + 1, x1 + 1, tail + 1, BLACK, 140)        # shadow
    cv.rect(x0, top, x1, tail, BRIGHT_RUBY)
    cv.vline(x0, top, tail, CLASSNET_RED)                        # silk highlight
    cv.vline(x1, top, tail, DARK_MAROON)                         # shaded fold
    cv.vline(mid, top, tail, CLASSNET_RED, 150)                  # centre sheen
    # swallowtail: two triangular forks with a V notch cut between them
    span = tail - top
    for i in range(bottom - tail + 1):
        yy = tail + i
        notch = int(round(i * (mid - x0) / max(1, (bottom - tail))))
        cv.hline(x0, mid - notch, yy, BRIGHT_RUBY)               # left fork
        cv.hline(mid + notch, x1, yy, BRIGHT_RUBY)               # right fork
        cv.dot(x0, yy, CLASSNET_RED)
        cv.dot(x1, yy, DARK_MAROON)
    # gold pin at the top
    cv.hline(x0 - 1, x1 + 1, top, GOLD)
    cv.dot(mid, top - 1, PALE_GOLD)
    _ = span
    return cv.img


def draw_seal(size: int, glow: bool) -> Image.Image:
    cv = Canvas(size)
    u = size / 32.0
    cx, cy = size / 2.0 - 0.5, size / 2.0 - 0.5
    r = int(13 * u)
    if glow:
        cv.disc(cx, cy, r + 2, PALE_GOLD, 60)
    cv.disc(cx + 1, cy + 1, r, BLACK, 150)                       # shadow
    cv.disc(cx, cy, r, GOLD)                                      # gold rim
    cv.disc(cx, cy, r - int(2 * u), DEEP_RUBY)                    # ruby field
    cv.ring(cx, cy, r, PALE_GOLD)                                # bright outer edge
    cv.ring(cx, cy, r - int(2 * u), BRONZE)                      # inner rim shade
    # inner gold ring
    cv.ring(cx, cy, r - int(4 * u), GOLD)
    # central star / eagle-shield abstraction
    star = int(4 * u)
    cv.vline(cx, cy - star, cy + star, PALE_GOLD)
    cv.hline(cx - star, cx + star, cy, PALE_GOLD)
    cv.dot(cx, cy, WHITE_HI)
    # diagonal star arms
    for d in range(1, star):
        cv.dot(cx - d, cy - d, GOLD)
        cv.dot(cx + d, cy - d, GOLD)
        cv.dot(cx - d, cy + d, GOLD)
        cv.dot(cx + d, cy + d, GOLD)
    return cv.img


PIECES = {
    "spine": draw_spine,
    "front-board": draw_front_board,
    "title-plate": draw_title_plate,
    "ribbon-marker": draw_ribbon,
    "seal-stamp": draw_seal,
}


# ---------------------------------------------------------------------------
# The completed volume (used by the final assembly frame and the hero sprite).
# Drawn as a 3/4 ruby hardback: front board + spine + gold rules + plate + seal
# + ribbon, all combined.
# ---------------------------------------------------------------------------
def draw_complete_volume(size: int, sparkle: bool = True) -> Image.Image:
    cv = Canvas(size)
    u = size / 128.0
    # spine (left) + front board (right) block
    sp_x0, sp_x1 = int(20 * u), int(34 * u)
    bd_x0, bd_x1 = int(34 * u), int(104 * u)
    y0, y1 = int(14 * u), int(114 * u)

    if sparkle:
        cv.rect(int(12 * u), int(8 * u), int(112 * u), int(120 * u), PALE_GOLD, 32)

    # drop shadow
    cv.rect(sp_x0 + int(4 * u), y0 + int(4 * u), bd_x1 + int(4 * u), y1 + int(4 * u), BLACK, 150)

    # spine block
    cv.rect(sp_x0, y0, sp_x1, y1, DARK_MAROON)
    cv.vline(sp_x0, y0, y1, MUTED_RUBY)
    buckram_texture(cv, sp_x0 + 1, y0 + 1, sp_x1 - 1, y1 - 1, step=4)
    # spine gold bands
    for by in (26, 40, 88, 102):
        yy = int(by * u)
        cv.rect(sp_x0, yy, sp_x1, yy + int(2 * u), GOLD)
        cv.hline(sp_x0, sp_x1, yy, PALE_GOLD)

    # front board
    cv.rect(bd_x0, y0, bd_x1, y1, BUCKRAM)
    cv.hline(bd_x0, bd_x1, y0, MUTED_RUBY)
    cv.hline(bd_x0, bd_x1, y1, DARK_MAROON)
    cv.vline(bd_x1, y0, y1, DARK_MAROON)
    buckram_texture(cv, bd_x0 + 1, y0 + 1, bd_x1 - 1, y1 - 1, step=4)

    # gold border rules
    cv.frame(bd_x0 + int(4 * u), y0 + int(4 * u), bd_x1 - int(4 * u), y1 - int(4 * u), GOLD)
    cv.frame(bd_x0 + int(7 * u), y0 + int(7 * u), bd_x1 - int(7 * u), y1 - int(7 * u), OLD_GOLD)

    # title plate (brass) near the top
    px0, py0, px1, py1 = int(44 * u), int(24 * u), int(96 * u), int(46 * u)
    cv.rect(px0, py0, px1, py1, GOLD)
    cv.hline(px0, px1, py0, PALE_GOLD)
    cv.hline(px0, px1, py1, BRONZE)
    cv.frame(px0 + int(2 * u), py0 + int(2 * u), px1 - int(2 * u), py1 - int(2 * u), BRONZE)
    cv.rect(px0 + int(3 * u), py0 + int(3 * u), px1 - int(3 * u), py1 - int(3 * u), CREAM)
    for ly in (30, 36, 40):
        yy = int(ly * u)
        if py0 + int(3 * u) < yy < py1 - int(3 * u):
            cv.hline(px0 + int(5 * u), px1 - int(5 * u), yy, SEPIA)

    # great-seal medallion (centre-lower)
    scx, scy = int(70 * u), int(80 * u)
    sr = int(16 * u)
    cv.disc(scx, scy, sr, GOLD)
    cv.disc(scx, scy, sr - int(2 * u), DEEP_RUBY)
    cv.ring(scx, scy, sr, PALE_GOLD)
    cv.ring(scx, scy, sr - int(4 * u), GOLD)
    arm = int(6 * u)
    cv.vline(scx, scy - arm, scy + arm, PALE_GOLD)
    cv.hline(scx - arm, scx + arm, scy, PALE_GOLD)
    for d in range(1, arm):
        cv.dot(scx - d, scy - d, GOLD)
        cv.dot(scx + d, scy - d, GOLD)
        cv.dot(scx - d, scy + d, GOLD)
        cv.dot(scx + d, scy + d, GOLD)
    cv.dot(scx, scy, WHITE_HI)

    # red silk ribbon spilling from the top edge
    rx0, rx1 = int(88 * u), int(94 * u)
    cv.rect(rx0, y0, rx1, int(118 * u), BRIGHT_RUBY)
    cv.vline(rx0, y0, int(118 * u), CLASSNET_RED)
    cv.vline(rx1, y0, int(118 * u), DARK_MAROON)

    if sparkle:
        for dx, dy in ((16, 18), (110, 26), (22, 108), (112, 100)):
            x, y = int(dx * u), int(dy * u)
            cv.dot(x, y, PALE_GOLD)
            cv.hline(x - 1, x + 1, y, GOLD)
            cv.vline(x, y - 1, y + 1, GOLD)
    return cv.img


# ---------------------------------------------------------------------------
# 6-frame assembly animation: pieces fly in and lock together, then bind + glow.
# Each frame is 64x64. Layout: 5 pieces converge onto the final volume.
# ---------------------------------------------------------------------------
def _paste(dst: Image.Image, src: Image.Image, x: int, y: int):
    dst.alpha_composite(src, (int(x), int(y)))


def draw_assembly_sheet() -> Image.Image:
    F = 64
    sheet = Image.new("RGBA", (F * 6, F), (0, 0, 0, 0))

    # small piece sprites reused across frames
    p_spine = draw_spine(32, False)
    p_board = draw_front_board(32, False)
    p_plate = draw_title_plate(32, False)
    p_ribbon = draw_ribbon(32, False)
    p_seal = draw_seal(32, False)

    def frame(i):
        return (i * F, 0)

    # ---- Frame 0: five pieces scattered around the edges ----
    f0 = Image.new("RGBA", (F, F), (0, 0, 0, 0))
    _paste(f0, p_board.resize((22, 22), Image.NEAREST), 2, 2)
    _paste(f0, p_spine.resize((14, 22), Image.NEAREST), 46, 4)
    _paste(f0, p_plate.resize((22, 12), Image.NEAREST), 4, 40)
    _paste(f0, p_ribbon.resize((12, 22), Image.NEAREST), 30, 40)
    _paste(f0, p_seal.resize((20, 20), Image.NEAREST), 42, 40)
    sheet.alpha_composite(f0, frame(0))

    # ---- Frame 1: pieces drift toward centre ----
    f1 = Image.new("RGBA", (F, F), (0, 0, 0, 0))
    _paste(f1, p_board.resize((26, 26), Image.NEAREST), 8, 8)
    _paste(f1, p_spine.resize((14, 26), Image.NEAREST), 38, 10)
    _paste(f1, p_plate.resize((22, 12), Image.NEAREST), 12, 34)
    _paste(f1, p_ribbon.resize((10, 20), Image.NEAREST), 32, 36)
    _paste(f1, p_seal.resize((18, 18), Image.NEAREST), 40, 36)
    sheet.alpha_composite(f1, frame(1))

    # ---- Frame 2: board + spine locked, plate/seal/ribbon closing in ----
    f2 = Image.new("RGBA", (F, F), (0, 0, 0, 0))
    _paste(f2, draw_spine(64, False).resize((16, 44), Image.NEAREST), 14, 10)
    _paste(f2, p_board.resize((34, 44), Image.NEAREST), 26, 10)
    _paste(f2, p_plate.resize((26, 12), Image.NEAREST), 30, 18)
    _paste(f2, p_ribbon.resize((8, 18), Image.NEAREST), 46, 24)
    _paste(f2, p_seal.resize((16, 16), Image.NEAREST), 34, 34)
    sheet.alpha_composite(f2, frame(2))

    # ---- Frame 3: nearly bound volume (no glow) ----
    f3 = draw_complete_volume(64, sparkle=False)
    sheet.alpha_composite(f3, frame(3))

    # ---- Frame 4: bound volume + binding flash ----
    f4 = draw_complete_volume(64, sparkle=False).copy()
    fl = Canvas(64)
    fl.rect(6, 4, 58, 60, PALE_GOLD, 70)
    f4.alpha_composite(fl.img)
    sheet.alpha_composite(f4, frame(4))

    # ---- Frame 5: completed glowing volume ----
    f5 = draw_complete_volume(64, sparkle=True)
    sheet.alpha_composite(f5, frame(5))

    return sheet


# ---------------------------------------------------------------------------
_ALLOWED_LIST = list(ALLOWED)


def snap_palette(img: Image.Image) -> Image.Image:
    """Snap every pixel's RGB to the nearest master-palette colour (alpha kept).

    Semi-transparent glow/shadow layers composited over opaque art can produce
    blended intermediate tones; snapping guarantees strict palette membership
    without introducing anti-aliasing (each pixel is mapped independently).
    """
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    cache: dict[tuple[int, int, int], tuple[int, int, int]] = {}
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            key = (r, g, b)
            best = cache.get(key)
            if best is None:
                best = min(_ALLOWED_LIST,
                          key=lambda c: (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2)
                cache[key] = best
            px[x, y] = (best[0], best[1], best[2], a)
    return img


def save(img: Image.Image, name: str):
    path = os.path.join(OUT_DIR, name)
    snap_palette(img).save(path)
    return path


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    written = []
    for key, fn in PIECES.items():
        p32 = fn(32, glow=False)
        p64 = fn(64, glow=True)
        written.append(save(p32, f"piece_{key}_pickup_32.png"))
        written.append(save(p64, f"piece_{key}_equipped_64.png"))
    written.append(save(draw_assembly_sheet(), "volume_assembly_sheet_64.png"))
    written.append(save(draw_complete_volume(128, sparkle=True), "volume_complete_hero_128.png"))
    for p in written:
        print("wrote", os.path.relpath(p, os.path.dirname(OUT_DIR)))


if __name__ == "__main__":
    main()
