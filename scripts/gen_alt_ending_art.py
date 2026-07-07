#!/usr/bin/env python3
"""Generate original SNES-style pixel art for the contested-declassification ending.

All output is hard-edged, no anti-aliasing, restricted to the game's NES palette
(src/art/palette.ts). Three assets are produced under
public/assets/art-pack/alt-ending/:

  bg_interagency_review_room.png  256x240  full-scene ending background
  stamp_under_appeal.png          128x48   transparent "UNDER APPEAL" overlay
  volume_contested_redacted.png   80x120   muted, redaction-banded FRUS cover

Run: python3 scripts/gen_alt_ending_art.py
"""
from __future__ import annotations

import os
from PIL import Image

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "art-pack", "alt-ending",
)

# --- NES palette subset (must match src/art/palette.ts) -------------------
BLACK = (0x0F, 0x0F, 0x0F)
DARK_GRAY = (0x20, 0x20, 0x20)
CHARCOAL = (0x30, 0x30, 0x30)
MED_GRAY = (0x50, 0x50, 0x50)
ARCHIVE_GRAY = (0x70, 0x70, 0x70)
STONE_LIGHT = (0xA8, 0xA7, 0x9E)
SLATE_BLUE = (0x30, 0x48, 0x60)
DEEP_BROWN = (0x4A, 0x2A, 0x00)
BRONZE = (0x80, 0x60, 0x20)
DARK_MAROON = (0x3A, 0x07, 0x10)
DEEP_RUBY = (0x4A, 0x07, 0x12)
BUCKRAM = (0x7A, 0x10, 0x20)
MUTED_RUBY = (0x8F, 0x20, 0x30)
BRIGHT_RUBY = (0xB8, 0x20, 0x30)
CLASSNET_RED = (0xFF, 0x3B, 0x3B)
GOLD = (0xD6, 0xA2, 0x3A)
AGED_PAPER = (0xB8, 0x9A, 0x5A)
ARCHIVE_AMBER = (0xC6, 0x86, 0x42)
CREAM = (0xE8, 0xD8, 0xA8)
WHITE_HI = (0xF8, 0xF0, 0xD8)
TERMINAL_CYAN = (0x68, 0xC0, 0xC0)

ALPHA0 = (0, 0, 0, 0)


def rgba(c, a=255):
    return (c[0], c[1], c[2], a)


# --- 5x7 pixel font (uppercase, only the glyphs we render) ----------------
FONT = {
    " ": ["....."] * 7,
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "C": [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "G": [".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"],
    "I": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "N": ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "V": ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
}


def draw_text(px, x, y, text, color, scale=1, alpha=255, spacing=1):
    """Draw hard-edged bitmap text. px is a pixel-setter callback."""
    cx = x
    for ch in text:
        glyph = FONT[ch]
        for gy, row in enumerate(glyph):
            for gx, cell in enumerate(row):
                if cell == "#":
                    for sy in range(scale):
                        for sx in range(scale):
                            px(cx + gx * scale + sx, y + gy * scale + sy, color, alpha)
        cx += (5 + spacing) * scale
    return cx


def text_width(text, scale=1, spacing=1):
    return (len(text) * (5 + spacing) - spacing) * scale


# --------------------------------------------------------------------------
# 1. Interagency review room background (256x240)
# --------------------------------------------------------------------------
def build_background():
    W, H = 256, 240
    img = Image.new("RGB", (W, H), BLACK)
    p = img.load()

    def rect(x, y, w, h, c):
        for yy in range(y, y + h):
            if 0 <= yy < H:
                for xx in range(x, x + w):
                    if 0 <= xx < W:
                        p[xx, yy] = c

    def px(x, y, c, a=255):
        if 0 <= x < W and 0 <= y < H:
            p[x, y] = c

    # Ceiling
    rect(0, 0, W, 22, CHARCOAL)
    rect(0, 20, W, 2, DARK_GRAY)
    # Recessed ceiling light panels (cold, institutional glow)
    for lx in (28, 100, 172):
        rect(lx, 5, 56, 8, MED_GRAY)
        rect(lx + 2, 7, 52, 4, CREAM)
        rect(lx + 2, 7, 52, 1, WHITE_HI)

    # Back wall (blue-gray secure facility)
    rect(0, 22, W, 124, SLATE_BLUE)
    # Wall panel seams
    for sx in range(0, W, 32):
        rect(sx, 22, 1, 124, CHARCOAL)
    # Wainscot / base molding
    rect(0, 138, W, 4, ARCHIVE_GRAY)
    rect(0, 142, W, 4, BRONZE)

    # Floor (dark carpet with perspective seams)
    rect(0, 146, W, H - 146, DARK_GRAY)
    for i in range(1, 6):
        yy = 146 + i * 16
        rect(0, yy, W, 1, CHARCOAL)
    # Converging perspective lines toward center vanishing point
    for step in range(0, 130, 10):
        lx = 40 - step // 3
        rx = 216 + step // 3
        yy = 240 - step
        if 0 <= yy < H:
            px(max(0, lx), yy, CHARCOAL)
            px(min(W - 1, rx), yy, CHARCOAL)

    # --- Central projection screen: contested equity map -----------------
    sx0, sy0, sw, sh = 92, 30, 72, 52
    rect(sx0 - 3, sy0 - 3, sw + 6, sh + 6, BRONZE)          # frame
    rect(sx0 - 2, sy0 - 2, sw + 4, sh + 4, ARCHIVE_GRAY)
    rect(sx0, sy0, sw, sh, BLACK)                            # screen
    # Generic contested world regions (no real seals/borders)
    rect(sx0 + 6, sy0 + 8, 20, 12, STONE_LIGHT)
    rect(sx0 + 30, sy0 + 6, 16, 10, AGED_PAPER)
    rect(sx0 + 48, sy0 + 14, 16, 14, STONE_LIGHT)
    rect(sx0 + 14, sy0 + 26, 22, 12, AGED_PAPER)
    rect(sx0 + 40, sy0 + 32, 20, 12, STONE_LIGHT)
    # Redaction bars across the contested map
    rect(sx0 + 6, sy0 + 12, 34, 3, BLACK)
    rect(sx0 + 30, sy0 + 30, 28, 3, BLACK)
    # Contested zone highlighted in alarm red with a dashed outline
    rect(sx0 + 44, sy0 + 18, 14, 10, MUTED_RUBY)
    for dx in range(sx0 + 44, sx0 + 58, 2):
        px(dx, sy0 + 18, CLASSNET_RED)
        px(dx, sy0 + 27, CLASSNET_RED)
    # Screen title label
    draw_text(px, sx0 + 8, sy0 + sh - 9, "CONTESTED", GOLD, scale=1)

    # Recording / in-session indicator above the screen
    rect(sx0 + sw - 8, sy0 - 12, 6, 6, DARK_MAROON)
    rect(sx0 + sw - 7, sy0 - 11, 4, 4, CLASSNET_RED)
    px(sx0 + sw - 6, sy0 - 10, WHITE_HI)

    # --- Blank interagency placards (generic, no real insignia) ----------
    def placard(x, y):
        rect(x, y, 22, 30, DEEP_BROWN)
        rect(x, y, 22, 30, DEEP_BROWN)
        # gold border
        rect(x, y, 22, 1, GOLD); rect(x, y + 29, 22, 1, GOLD)
        rect(x, y, 1, 30, GOLD); rect(x + 21, y, 1, 30, GOLD)
        rect(x + 2, y + 2, 18, 26, BLACK)
        # neutral column/balance motif (no seal)
        rect(x + 10, y + 6, 2, 14, AGED_PAPER)          # column
        rect(x + 6, y + 6, 10, 2, AGED_PAPER)           # beam
        rect(x + 6, y + 8, 2, 4, ARCHIVE_GRAY)          # left pan
        rect(x + 14, y + 8, 2, 4, ARCHIVE_GRAY)         # right pan
        rect(x + 6, y + 22, 10, 2, AGED_PAPER)          # base
        rect(x + 4, y + 24, 14, 1, ARCHIVE_GRAY)

    placard(20, 36)
    placard(50, 36)
    placard(184, 36)
    placard(214, 36)

    # --- Blocky wall clock (tension) -------------------------------------
    cx, cy = 236, 100
    rect(cx - 8, cy - 8, 16, 16, ARCHIVE_GRAY)
    rect(cx - 7, cy - 7, 14, 14, CREAM)
    rect(cx - 7, cy - 7, 14, 1, WHITE_HI)
    # hands pointing near the hour (time pressure)
    rect(cx, cy - 5, 1, 6, BLACK)   # minute hand up
    rect(cx, cy, 5, 1, BLACK)       # hour hand right
    px(cx, cy, MUTED_RUBY)

    # --- Long conference table -------------------------------------------
    tx0, ty0, tw, th = 40, 150, 176, 40
    # far edge (narrower) then near edge (wider) for slight perspective
    rect(tx0 + 14, ty0, tw - 28, 6, BRONZE)
    rect(tx0, ty0 + 6, tw, th - 6, DEEP_BROWN)
    rect(tx0, ty0 + 6, tw, 2, BRONZE)               # top bevel
    rect(tx0, ty0 + th - 2, tw, 2, BLACK)           # front shadow
    rect(tx0, ty0 + 6, 2, th - 6, BRONZE)
    rect(tx0 + tw - 2, ty0 + 6, 2, th - 6, BLACK)
    # wood grain
    for gy in range(ty0 + 10, ty0 + th - 4, 5):
        rect(tx0 + 6, gy, tw - 12, 1, DARK_MAROON)

    # Items on the table
    def folder(x, y, base, tab=AGED_PAPER):
        rect(x, y, 18, 12, base)
        rect(x, y, 8, 2, tab)             # tab
        rect(x, y, 18, 1, WHITE_HI)
        rect(x + 1, y + 4, 16, 1, ARCHIVE_GRAY)
        rect(x + 1, y + 7, 16, 1, ARCHIVE_GRAY)

    folder(52, 168, AGED_PAPER)
    folder(78, 172, AGED_PAPER)
    folder(150, 170, AGED_PAPER)
    # contested (red) folder with a redaction bar
    folder(112, 166, MUTED_RUBY, tab=CLASSNET_RED)
    rect(114, 170, 14, 3, BLACK)
    # water glasses (cyan)
    for gx in (70, 138, 176):
        rect(gx, 160, 4, 6, TERMINAL_CYAN)
        rect(gx, 160, 4, 1, WHITE_HI)
    # blank name placards (cream tents, no names)
    for nx in (60, 128, 188):
        rect(nx, 158, 12, 4, CREAM)
        rect(nx, 158, 12, 1, WHITE_HI)
        rect(nx, 162, 12, 1, ARCHIVE_GRAY)

    # --- Chairs: empty seats behind, silhouettes in foreground -----------
    # Far chairs (backs peeking above the table)
    for cxp in (64, 104, 148, 188):
        rect(cxp, 142, 16, 10, CHARCOAL)
        rect(cxp + 1, 143, 14, 2, MED_GRAY)
    # Foreground chair backs (near camera, cropped by bottom edge)
    for cxp in (30, 96, 162, 222):
        rect(cxp, 206, 30, 34, CHARCOAL)
        rect(cxp + 2, 208, 26, 4, MED_GRAY)
        rect(cxp + 2, 214, 26, 22, DARK_GRAY)
        rect(cxp, 206, 30, 1, ARCHIVE_GRAY)

    # Ruby cornice banner to tie into the FRUS visual identity
    rect(0, 22, W, 4, DARK_MAROON)
    rect(0, 24, W, 1, BUCKRAM)
    for bx in range(0, W, 16):
        px(bx, 23, GOLD)

    return img


# --------------------------------------------------------------------------
# 2. "UNDER APPEAL" stamp overlay (128x48, transparent)
# --------------------------------------------------------------------------
def build_stamp():
    W, H = 176, 52
    img = Image.new("RGBA", (W, H), ALPHA0)
    p = img.load()

    def px(x, y, c, a=255):
        if 0 <= x < W and 0 <= y < H:
            p[x, y] = rgba(c, a)

    def rect(x, y, w, h, c, a=255):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                px(xx, yy, c, a)

    INK = CLASSNET_RED
    INK_A = 235  # rubber-stamp ink slightly translucent

    # Double-ruled border with clipped corners (rubber-stamp look)
    def frame(x, y, w, h, thick):
        for t in range(thick):
            rect(x + t, y + t, w - 2 * t, 1, INK, INK_A)
            rect(x + t, y + h - 1 - t, w - 2 * t, 1, INK, INK_A)
            rect(x + t, y + t, 1, h - 2 * t, INK, INK_A)
            rect(x + w - 1 - t, y + t, 1, h - 2 * t, INK, INK_A)

    frame(4, 4, W - 8, H - 8, 2)
    frame(9, 9, W - 18, H - 18, 1)
    # clip the outer corners for a worn stamp silhouette
    for cx, cy in ((4, 4), (W - 6, 4), (4, H - 6), (W - 6, H - 6)):
        for yy in range(cy, cy + 2):
            for xx in range(cx, cx + 2):
                px(xx, yy, ALPHA0[:3], 0)

    # Main line: UNDER APPEAL
    line1 = "UNDER APPEAL"
    w1 = text_width(line1, scale=2)
    draw_text(px, (W - w1) // 2, 13, line1, INK, scale=2, alpha=INK_A)
    # Sub line: EQUITIES UNRESOLVED
    line2 = "EQUITIES UNRESOLVED"
    w2 = text_width(line2, scale=1)
    draw_text(px, (W - w2) // 2, 33, line2, INK, scale=1, alpha=INK_A)

    # Worn ink gaps: knock out a few scattered pixels for a rubber-stamp feel
    for gx, gy in ((34, 16), (72, 20), (118, 15), (150, 22), (56, 35), (104, 38), (140, 34)):
        px(gx, gy, ALPHA0[:3], 0)
        px(gx + 1, gy, ALPHA0[:3], 0)

    return img


# --------------------------------------------------------------------------
# 3. Muted, redaction-banded FRUS volume cover (80x120)
# --------------------------------------------------------------------------
def build_volume():
    W, H = 80, 120
    img = Image.new("RGBA", (W, H), ALPHA0)
    p = img.load()

    def px(x, y, c, a=255):
        if 0 <= x < W and 0 <= y < H:
            p[x, y] = rgba(c, a)

    def rect(x, y, w, h, c, a=255):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                px(xx, yy, c, a)

    # Drop shadow (matches frus-prize-cover geometry)
    rect(5, 7, 70, 108, BLACK)
    # Cover body: subdued deep ruby instead of bright buckram
    rect(2, 3, 70, 108, DEEP_RUBY)
    # Weathering / desaturation streaks
    for wy in range(6, 108, 9):
        rect(6, 3 + wy, 60, 1, DARK_MAROON)
    # Spine: archive gray instead of gold
    rect(2, 3, 7, 108, ARCHIVE_GRAY)
    rect(2, 3, 2, 108, MED_GRAY)
    rect(7, 3, 1, 108, CHARCOAL)
    # Inner recessed panel
    rect(9, 8, 58, 98, BLACK)
    # Panel frame in muted sepia (was bright gold)
    rect(9, 8, 58, 1, AGED_PAPER)
    rect(9, 105, 58, 1, AGED_PAPER)
    rect(9, 8, 1, 98, AGED_PAPER)
    rect(66, 8, 1, 98, AGED_PAPER)
    # right inner rule (muted)
    rect(63, 12, 1, 89, ARCHIVE_GRAY)

    # Faded title lines (sepia/gray) where gold text used to be
    for ty, tw in ((16, 40), (20, 32), (24, 44)):
        rect((W - tw) // 2, ty, tw, 1, AGED_PAPER)
    # Seal ring, drained of color (was gold emblem)
    rect(30, 60, 20, 2, ARCHIVE_GRAY)
    rect(30, 74, 20, 2, ARCHIVE_GRAY)
    rect(28, 62, 2, 12, ARCHIVE_GRAY)
    rect(48, 62, 2, 12, ARCHIVE_GRAY)
    rect(37, 65, 4, 4, MED_GRAY)
    # lower faded lines
    for ty, tw in ((88, 36), (92, 28)):
        rect((W - tw) // 2, ty, tw, 1, AGED_PAPER)

    # --- REDACTION BAND across the title block ---------------------------
    rect(11, 30, 54, 9, BLACK)
    rect(11, 30, 54, 1, ARCHIVE_GRAY)   # thin outline so it reads as applied
    rect(11, 38, 54, 1, CHARCOAL)
    # second, shorter redaction over the lower caption
    rect(20, 96, 36, 6, BLACK)
    rect(20, 96, 36, 1, ARCHIVE_GRAY)

    # --- "under appeal" corner tab (no text; red flag on gray tab) -------
    rect(52, 3, 16, 12, ARCHIVE_GRAY)
    rect(52, 3, 16, 1, STONE_LIGHT)
    rect(54, 6, 8, 6, MUTED_RUBY)
    rect(54, 6, 8, 1, CLASSNET_RED)
    # little flag pole + pennant
    rect(58, 1, 1, 5, MED_GRAY)
    rect(59, 1, 4, 3, CLASSNET_RED)

    return img


def report(path, img):
    colors = img.getcolors(1 << 20) or []
    print(f"  {os.path.basename(path):32s} {img.size} {img.mode} colors={len(colors)}")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = [
        ("bg_interagency_review_room.png", build_background()),
        ("stamp_under_appeal.png", build_stamp()),
        ("volume_contested_redacted.png", build_volume()),
    ]
    print(f"Writing to {OUT_DIR}")
    for name, img in jobs:
        path = os.path.join(OUT_DIR, name)
        img.save(path)
        report(path, img)


if __name__ == "__main__":
    main()
