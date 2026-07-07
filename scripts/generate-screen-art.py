#!/usr/bin/env python3
"""Deterministic 16-bit SNES-style screen art generator.

Renders two native-resolution (256x240) opaque backgrounds using the game's
NES/SNES palette (see src/art/palette.ts) with hard edges and no anti-aliasing:

  1. title_screen_frus_chest_256x240.png
     Ruby buckram FRUS volume opening like a treasure chest, with a framed gold
     title plate carrying "RUBY RULE:" / "THE FRUS QUEST".

  2. ending_binding_ceremony_256x240.png
     Binding-ceremony true-ending: human publication table, glowing assembled
     FRUS volume, Office of the Historian staff in celebration poses.

Every draw call snaps to integer pixels; no blur/AA filters are used, so output
stays a clean, limited-palette pixel image at native resolution.
"""
from __future__ import annotations

import os
from PIL import Image

W, H = 256, 240

# --- Palette (mirrors src/art/palette.ts / src/game/constants.ts PALETTE) ---
BLACK = "#0F0F0F"
DEEP_RUBY = "#4A0712"
DARK_MAROON = "#3A0710"        # PALETTE.deepRuby (scene background)
BUCKRAM_RUBY = "#7A1020"       # PALETTE.buckramRed
MUTED_RUBY = "#8F2030"
BRIGHT_RUBY = "#B82030"        # PALETTE.buckramHighlight
CLASSNET_RED = "#FF3B3B"
GOLD = "#D6A23A"               # PALETTE.goldStamp
OLD_GOLD = "#D6A84F"
PALE_GOLD = "#F0D060"
BRONZE = "#806020"
DEEP_BROWN = "#4A2A00"
CREAM = "#E8D8A8"              # PALETTE.creamPaper
WHITE = "#F8F0D8"             # PALETTE.white
SEPIA = "#B89A5A"
ARCHIVE_AMBER = "#C68642"
TERMINAL_CYAN = "#68C0C0"
OPENNET_GREEN = "#4CFF6B"
STONE_LIGHT = "#A8A79E"
STONE_GRAY = "#707070"
SLATE_BLUE = "#304860"
SHADOW_NAVY = "#4A0712"


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


class Canvas:
    def __init__(self, w: int, h: int, bg: str):
        self.w, self.h = w, h
        self.px = Image.new("RGB", (w, h), hex_rgb(bg)).load()
        self._img = None

    def _store(self, img):
        self._img = img

    def set(self, x: int, y: int, c: str):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = hex_rgb(c)

    def rect(self, x: int, y: int, w: int, h: int, c: str):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, c)

    def border(self, x: int, y: int, w: int, h: int, c: str, t: int = 1):
        self.rect(x, y, w, t, c)
        self.rect(x, y + h - t, w, t, c)
        self.rect(x, y, t, h, c)
        self.rect(x + w - t, y, t, h, c)

    def hline(self, x: int, y: int, w: int, c: str):
        self.rect(x, y, w, 1, c)

    def vline(self, x: int, y: int, h: int, c: str):
        self.rect(x, y, 1, h, c)

    def tri_up(self, cx: int, cy: int, half: int, c: str):
        # solid upward triangle, apex at top
        for i in range(half + 1):
            self.hline(cx - i, cy + (half - i), 2 * i + 1, c)

    def diamond(self, cx: int, cy: int, r: int, c: str):
        for i in range(-r, r + 1):
            span = r - abs(i)
            self.hline(cx - span, cy + i, 2 * span + 1, c)

    def save(self, path: str):
        img = Image.new("RGB", (self.w, self.h))
        for y in range(self.h):
            for x in range(self.w):
                img.putpixel((x, y), self.px[x, y])
        img.save(path)


# --- 5x7 pixel font (uppercase, digits, few symbols), no anti-aliasing ---
FONT = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "D": ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
    ":": ["00000", "00100", "00100", "00000", "00100", "00100", "00000"],
    ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
    "/": ["00001", "00001", "00010", "00100", "01000", "10000", "10000"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
}


def text_width(s: str, scale: int, spacing: int = 1) -> int:
    return len(s) * (5 * scale + spacing * scale) - spacing * scale


def draw_text(cv: Canvas, x: int, y: int, s: str, color: str, scale: int = 1,
              spacing: int = 1, shadow: str | None = None):
    cx = x
    for ch in s.upper():
        glyph = FONT.get(ch, FONT[" "])
        for ry, row in enumerate(glyph):
            for rx, bit in enumerate(row):
                if bit == "1":
                    px = cx + rx * scale
                    py = y + ry * scale
                    if shadow:
                        cv.rect(px + scale, py + scale, scale, scale, shadow)
        # second pass so shadow never overlaps face pixels
        for ry, row in enumerate(glyph):
            for rx, bit in enumerate(row):
                if bit == "1":
                    cv.rect(cx + rx * scale, y + ry * scale, scale, scale, color)
        cx += 5 * scale + spacing * scale


def draw_text_centered(cv: Canvas, cx: int, y: int, s: str, color: str, scale: int = 1,
                       spacing: int = 1, shadow: str | None = None):
    w = text_width(s, scale, spacing)
    draw_text(cv, cx - w // 2, y, s, color, scale, spacing, shadow)


# ---------------------------------------------------------------------------
# Shared background: ruby buckram wallpaper with damask + vignette
# ---------------------------------------------------------------------------
def draw_buckram_wallpaper(cv: Canvas):
    cv.rect(0, 0, W, H, DARK_MAROON)
    # buckram weave threads
    for y in range(0, H, 4):
        for x in range(0, W, 2):
            cv.set(x + (y // 4) % 2, y, DEEP_RUBY)
    # damask diamonds on staggered grid
    for gy in range(0, H + 24, 24):
        for gx in range(0, W + 24, 24):
            cx = gx + (0 if (gy // 24) % 2 == 0 else 12)
            cv.diamond(cx, gy, 4, BUCKRAM_RUBY)
            cv.diamond(cx, gy, 2, GOLD)
            cv.set(cx, gy, PALE_GOLD)
    # vignette: darken edges
    for d in range(22):
        a = BLACK if d < 8 else DEEP_RUBY
        # only paint sparse dither so it reads as shading, not a solid bar
        for x in range(0, W, 1):
            if (x + d) % 3 == 0:
                cv.set(x, d, a)
                cv.set(x, H - 1 - d, a)
    for d in range(18):
        for y in range(0, H, 1):
            if (y + d) % 3 == 0:
                cv.set(d, y, DEEP_RUBY if d >= 6 else BLACK)
                cv.set(W - 1 - d, y, DEEP_RUBY if d >= 6 else BLACK)


def gold_frame(cv: Canvas, x: int, y: int, w: int, h: int):
    # drop shadow
    cv.rect(x + 2, y + 3, w, h, BLACK)
    # outer brown mat
    cv.rect(x, y, w, h, DEEP_BROWN)
    cv.border(x, y, w, h, GOLD, 1)
    # gold band
    cv.border(x + 1, y + 1, w - 2, h - 2, PALE_GOLD, 1)
    cv.border(x + 2, y + 2, w - 4, h - 4, BRONZE, 1)
    # corner rivets
    for (rx, ry) in ((x + 2, y + 2), (x + w - 3, y + 2), (x + 2, y + h - 3), (x + w - 3, y + h - 3)):
        cv.rect(rx, ry, 2, 2, PALE_GOLD)
        cv.set(rx, ry, DEEP_BROWN)


def light_ray_burst(cv: Canvas, cx: int, cy: int, length: int, color: str, step: int = 2):
    # radial dashed rays (hard-edged) emanating from a point
    import math
    for deg in range(0, 360, 15):
        rad = math.radians(deg)
        dx, dy = math.cos(rad), math.sin(rad)
        d = 4
        while d < length:
            px = int(round(cx + dx * d))
            py = int(round(cy + dy * d))
            # dashed
            if (d // step) % 2 == 0:
                cv.set(px, py, color)
            d += 1


# ---------------------------------------------------------------------------
# 1) TITLE SCREEN
# ---------------------------------------------------------------------------
def build_title() -> Canvas:
    cv = Canvas(W, H, DARK_MAROON)
    draw_buckram_wallpaper(cv)

    # top brass plaque rail
    cv.rect(0, 0, W, 12, DEEP_BROWN)
    cv.hline(0, 11, W, GOLD)
    cv.hline(0, 12, W, BLACK)
    draw_text(cv, 6, 3, "OFFICE OF THE HISTORIAN", GOLD, 1)
    draw_text(cv, W - text_width("FRUS ARCHIVE", 1) - 6, 3, "FRUS ARCHIVE", CREAM, 1)

    # --- Title plate (reserved readable gold text area) ---
    plate_x, plate_y, plate_w, plate_h = 24, 20, 208, 44
    gold_frame(cv, plate_x, plate_y, plate_w, plate_h)
    cv.rect(plate_x + 4, plate_y + 4, plate_w - 8, plate_h - 8, SHADOW_NAVY)
    cv.border(plate_x + 4, plate_y + 4, plate_w - 8, plate_h - 8, GOLD, 1)
    # engraved title text: layered shadow + gold face
    draw_text_centered(cv, W // 2, plate_y + 9, "RUBY RULE:", GOLD, 2, spacing=1, shadow=BLACK)
    cv.hline(plate_x + 30, plate_y + 26, plate_w - 60, BRONZE)
    draw_text_centered(cv, W // 2, plate_y + 29, "THE FRUS QUEST", CREAM, 1, spacing=1, shadow=BLACK)

    # --- Central treasure: ruby buckram FRUS volume opening like a chest ---
    bx, by = 128, 128  # chest center
    # golden light burst behind the opening volume
    light_ray_burst(cv, bx, by - 6, 66, PALE_GOLD, step=3)
    light_ray_burst(cv, bx, by - 6, 46, GOLD, step=2)
    # glow pool
    cv.diamond(bx, by - 8, 30, DEEP_RUBY)
    cv.diamond(bx, by - 8, 20, MUTED_RUBY)

    # opened cover lid (upper leaf tilted back) — trapezoid via stacked rows
    lid_top_w = 46
    lid_bottom_w = 70
    lid_h = 22
    lid_bottom_y = by - 12
    for i in range(lid_h):
        t = i / (lid_h - 1)
        w = int(round(lid_top_w + (lid_bottom_w - lid_top_w) * t))
        yy = lid_bottom_y - lid_h + 1 + i
        cv.hline(bx - w // 2, yy, w, BUCKRAM_RUBY)
    cv.border(bx - lid_bottom_w // 2, lid_bottom_y - lid_h + 1, lid_bottom_w, lid_h, GOLD, 1)
    # lid interior gleam (cream endpaper)
    for i in range(lid_h - 6):
        t = i / (lid_h - 7)
        w = int(round((lid_top_w - 12) + ((lid_bottom_w - 20) - (lid_top_w - 12)) * t))
        yy = lid_bottom_y - lid_h + 4 + i
        cv.hline(bx - w // 2, yy, w, DEEP_RUBY)
    # gold spine bands across lid
    cv.hline(bx - lid_top_w // 2, lid_bottom_y - lid_h + 6, lid_top_w, GOLD)
    cv.hline(bx - (lid_top_w + 6) // 2, lid_bottom_y - lid_h + 12, lid_top_w + 6, GOLD)

    # volume body (lower box) — the buckram cover base
    box_w, box_h = 74, 30
    box_x = bx - box_w // 2
    box_y = by - 8
    cv.rect(box_x + 2, box_y + box_h - 2, box_w, 4, BLACK)  # cast shadow
    cv.rect(box_x, box_y, box_w, box_h, BUCKRAM_RUBY)
    cv.border(box_x, box_y, box_w, box_h, GOLD, 1)
    cv.border(box_x + 2, box_y + 2, box_w - 4, box_h - 4, MUTED_RUBY, 1)
    # cream page block spilling out (treasure = pages/documents)
    cv.rect(box_x + 8, box_y + 4, box_w - 16, 8, CREAM)
    for yy in range(box_y + 5, box_y + 11, 2):
        cv.hline(box_x + 10, yy, box_w - 20, SEPIA)
    # gold seal medallion on the cover
    cv.diamond(bx, box_y + 20, 6, GOLD)
    cv.diamond(bx, box_y + 20, 3, PALE_GOLD)
    cv.set(bx, box_y + 20, WHITE)
    # gold corner clasps (chest fittings)
    for cxp in (box_x + 3, box_x + box_w - 4):
        cv.rect(cxp - 1, box_y + box_h - 6, 3, 6, GOLD)
        cv.rect(cxp - 1, box_y + box_h - 6, 3, 1, PALE_GOLD)

    # floating coins/gold sparkles rising from the chest
    for (sx, sy) in ((bx - 40, by - 30), (bx + 38, by - 34), (bx - 26, by - 44),
                     (bx + 22, by - 46), (bx, by - 52), (bx - 52, by - 8), (bx + 52, by - 10)):
        cv.rect(sx, sy, 3, 3, GOLD)
        cv.set(sx + 1, sy + 1, PALE_GOLD)

    # --- Relic shelf strip (echoes existing title) ---
    shelf_y = 176
    gold_frame(cv, 40, shelf_y, 176, 26)
    cv.rect(44, shelf_y + 4, 168, 18, DEEP_BROWN)
    relics = [BUCKRAM_RUBY, ARCHIVE_AMBER, TERMINAL_CYAN, CREAM, GOLD]
    for i, col in enumerate(relics):
        rx = 58 + i * 34
        cv.rect(rx, shelf_y + 6, 12, 15, col)
        cv.border(rx, shelf_y + 6, 12, 15, GOLD, 1)
        cv.hline(rx + 2, shelf_y + 9, 8, PALE_GOLD)
    cv.hline(44, shelf_y + 22, 168, BLACK)

    # --- Press start affordance ---
    draw_text_centered(cv, W // 2, 210, "PRESS START TO VERIFY", TERMINAL_CYAN, 1, shadow=BLACK)
    cv.hline(W // 2 - 46, 220, 92, TERMINAL_CYAN)

    # bottom marker band
    cv.rect(4, 224, W - 8, 12, DEEP_BROWN)
    cv.border(4, 224, W - 8, 12, GOLD, 1)
    draw_text_centered(cv, W // 2, 227, "ORIGINAL SNES-STYLE ART  NO BORROWED ASSETS", SEPIA, 1)
    return cv


# ---------------------------------------------------------------------------
# 2) ENDING / BINDING CEREMONY
# ---------------------------------------------------------------------------
def draw_staff(cv: Canvas, x: int, y: int, robe: str, accent: str, arms_up: bool):
    # simple 12x18 chibi archivist celebrating
    # head
    cv.rect(x - 3, y - 16, 6, 6, CREAM)
    cv.rect(x - 3, y - 17, 6, 2, DEEP_BROWN)  # hair
    cv.set(x - 2, y - 13, BLACK)
    cv.set(x + 1, y - 13, BLACK)
    # body / robe
    cv.rect(x - 4, y - 10, 8, 12, robe)
    cv.border(x - 4, y - 10, 8, 12, accent, 1)
    cv.rect(x - 1, y - 9, 2, 10, accent)  # placket
    # legs
    cv.rect(x - 3, y + 2, 2, 4, DEEP_BROWN)
    cv.rect(x + 1, y + 2, 2, 4, DEEP_BROWN)
    # arms
    if arms_up:
        cv.rect(x - 6, y - 16, 2, 8, robe)
        cv.rect(x + 4, y - 16, 2, 8, robe)
        cv.rect(x - 6, y - 17, 2, 2, CREAM)
        cv.rect(x + 4, y - 17, 2, 2, CREAM)
    else:
        cv.rect(x - 6, y - 9, 2, 7, robe)
        cv.rect(x + 4, y - 9, 2, 7, robe)
        cv.rect(x - 6, y - 3, 2, 2, CREAM)
        cv.rect(x + 4, y - 3, 2, 2, CREAM)


def build_ending() -> Canvas:
    cv = Canvas(W, H, DARK_MAROON)
    # deep ruby room floor + wall split (matches EndingScene deepRuby bg)
    cv.rect(0, 0, W, H, DARK_MAROON)
    # back wall damask (upper 60%)
    for gy in range(14, 150, 20):
        for gx in range(0, W + 20, 20):
            cx = gx + (0 if (gy // 20) % 2 == 0 else 10)
            cv.diamond(cx, gy, 3, DEEP_RUBY)
            cv.set(cx, gy, GOLD)
    # floor
    floor_y = 150
    cv.rect(0, floor_y, W, H - floor_y, DEEP_RUBY)
    for y in range(floor_y, H, 6):
        cv.hline(0, y, W, DARK_MAROON)
    for x in range(0, W, 24):
        cv.vline(x, floor_y, H - floor_y, BUCKRAM_RUBY)

    # brass room frame border (echoes drawRoomFrame)
    cv.border(0, 0, W, H, DEEP_BROWN, 4)
    cv.border(2, 2, W - 4, H - 4, GOLD, 1)

    # --- Top banner: BINDING CEREMONY (reserved gold text area) ---
    gold_frame(cv, 28, 10, 200, 20)
    cv.rect(32, 14, 192, 12, SHADOW_NAVY)
    draw_text_centered(cv, W // 2, 15, "THE BINDING CEREMONY", GOLD, 1, shadow=BLACK)

    # --- Glowing assembled FRUS volume, elevated & radiant ---
    vx, vy = 128, 76
    light_ray_burst(cv, vx, vy, 60, PALE_GOLD, step=3)
    light_ray_burst(cv, vx, vy, 42, GOLD, step=2)
    cv.diamond(vx, vy, 26, DEEP_RUBY)
    cv.diamond(vx, vy, 16, MUTED_RUBY)
    # the standing ruby buckram volume
    vw, vh = 30, 40
    cv.rect(vx - vw // 2, vy - vh // 2, vw, vh, BUCKRAM_RUBY)
    cv.border(vx - vw // 2, vy - vh // 2, vw, vh, GOLD, 1)
    cv.vline(vx - vw // 2 + 3, vy - vh // 2, vh, MUTED_RUBY)  # spine edge
    # gold stamped bands + seal
    cv.hline(vx - vw // 2 + 2, vy - vh // 2 + 6, vw - 4, GOLD)
    cv.hline(vx - vw // 2 + 2, vy + vh // 2 - 7, vw - 4, GOLD)
    draw_text_centered(cv, vx, vy - 8, "FRUS", PALE_GOLD, 1)
    cv.diamond(vx, vy + 6, 5, GOLD)
    cv.diamond(vx, vy + 6, 2, PALE_GOLD)
    cv.set(vx, vy + 6, WHITE)
    # sparkles around the volume
    for (sx, sy) in ((vx - 34, vy - 20), (vx + 32, vy - 24), (vx - 24, vy - 34),
                     (vx + 20, vy - 36), (vx, vy - 44), (vx - 40, vy + 8), (vx + 40, vy + 6)):
        cv.rect(sx, sy, 3, 3, GOLD)
        cv.set(sx + 1, sy + 1, PALE_GOLD)

    # --- Human publication table ---
    tx, ty, tw, th = 60, 150, 136, 26
    cv.rect(tx + 3, ty + th, tw, 5, BLACK)  # shadow
    cv.rect(tx, ty, tw, th, DEEP_BROWN)     # table top
    cv.border(tx, ty, tw, th, GOLD, 1)
    cv.hline(tx + 2, ty + 3, tw - 4, BRONZE)
    # table legs
    cv.rect(tx + 6, ty + th, 6, 12, DEEP_BROWN)
    cv.rect(tx + tw - 12, ty + th, 6, 12, DEEP_BROWN)
    # cream document layout + brass lamp on the table
    cv.rect(tx + 14, ty + 8, 26, 14, CREAM)
    cv.border(tx + 14, ty + 8, 26, 14, SEPIA, 1)
    cv.rect(tx + tw - 42, ty + 8, 26, 14, CREAM)
    cv.border(tx + tw - 42, ty + 8, 26, 14, SEPIA, 1)
    # banker lamp
    lx = tx + tw // 2
    cv.rect(lx - 8, ty + 4, 16, 5, OPENNET_GREEN)
    cv.border(lx - 8, ty + 4, 16, 5, GOLD, 1)
    cv.vline(lx, ty + 9, 6, BRONZE)
    cv.rect(lx - 4, ty + 15, 8, 3, BRONZE)
    # gold "CERTIFIED" plate on table front
    cv.rect(lx - 22, ty + 18, 44, 7, DEEP_RUBY)
    cv.border(lx - 22, ty + 18, 44, 7, GOLD, 1)
    draw_text_centered(cv, lx, ty + 19, "CERTIFIED", PALE_GOLD, 1)

    # --- Office of the Historian staff in celebration poses ---
    staff = [
        (30, 168, ARCHIVE_AMBER, GOLD, True),
        (56, 176, SLATE_BLUE, TERMINAL_CYAN, False),
        (92, 182, MUTED_RUBY, GOLD, True),
        (164, 182, BRONZE, CREAM, True),
        (200, 176, SLATE_BLUE, TERMINAL_CYAN, False),
        (226, 168, ARCHIVE_AMBER, GOLD, True),
    ]
    for (sx, sy, robe, accent, up) in staff:
        cv.rect(sx - 5, sy + 6, 10, 3, BLACK)  # ground shadow
        draw_staff(cv, sx, sy, robe, accent, up)

    # confetti / rising motes of gold + cyan
    for (cxp, cyp, col) in ((44, 40, GOLD), (72, 54, TERMINAL_CYAN), (190, 46, GOLD),
                            (214, 60, PALE_GOLD), (100, 34, TERMINAL_CYAN), (156, 40, GOLD),
                            (36, 96, PALE_GOLD), (222, 100, TERMINAL_CYAN)):
        cv.set(cxp, cyp, col)
        cv.set(cxp + 1, cyp, col)

    # --- bottom caption band ---
    cv.rect(4, 216, W - 8, 18, DEEP_BROWN)
    cv.border(4, 216, W - 8, 18, GOLD, 1)
    draw_text_centered(cv, W // 2, 219, "THE VOLUME IS BOUND  THE RECORD IS PUBLIC", CREAM, 1)
    draw_text_centered(cv, W // 2, 227, "HUMAN CERTIFICATION RECORDED", OPENNET_GREEN, 1)
    return cv


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "assets",
                           "art-pack", "screens")
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    title = build_title()
    title_path = os.path.join(out_dir, "title_screen_frus_chest_256x240.png")
    title.save(title_path)
    print("wrote", title_path)

    ending = build_ending()
    ending_path = os.path.join(out_dir, "ending_binding_ceremony_256x240.png")
    ending.save(ending_path)
    print("wrote", ending_path)


if __name__ == "__main__":
    main()
