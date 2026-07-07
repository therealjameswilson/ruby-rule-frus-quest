#!/usr/bin/env python3
"""Deterministic generator for the 16-bit HUD icon polish pack.

Draws original SNES-era HUD icons pixel-by-pixel using the project's NES/16-bit
palette (see src/art/palette.ts) and the established Ruby Rule visual language:
ruby buckram covers, gold-stamped trim, cream paper, dark archival ink, slate
secure-facility blue, terminal cyan. Every icon is authored on an exact pixel
grid with hard edges and no anti-aliasing. 32x32 variants are crisp 2x
nearest-neighbour upscales of the 16x16 masters.

Output: public/assets/art-pack/hud/
Run:    python3 scripts/generate-hud-icon-pack.py
"""

from __future__ import annotations

import os
from PIL import Image

# --- Palette (mirrors src/art/palette.ts) --------------------------------
BLACK        = (0x0F, 0x0F, 0x0F, 255)
DEEP_RUBY    = (0x4A, 0x07, 0x12, 255)  # NES_DEEP_RUBY / shadowNavy
DARK_MAROON  = (0x3A, 0x07, 0x10, 255)  # NES_DARK_MAROON / deepRuby
BUCKRAM      = (0x7A, 0x10, 0x20, 255)  # buckramRed
MUTED_RUBY   = (0x8F, 0x20, 0x30, 255)
BRIGHT_RUBY  = (0xB8, 0x20, 0x30, 255)  # buckramHighlight
CLASSNET_RED = (0xFF, 0x3B, 0x3B, 255)
GOLD         = (0xD6, 0xA2, 0x3A, 255)  # goldStamp
OLD_GOLD     = (0xD6, 0xA8, 0x4F, 255)
PALE_GOLD    = (0xF0, 0xD0, 0x60, 255)
BRONZE       = (0x80, 0x60, 0x20, 255)
CREAM        = (0xE8, 0xD8, 0xA8, 255)  # creamPaper
WHITE        = (0xF8, 0xF0, 0xD8, 255)  # white highlight
SEPIA        = (0xB8, 0x9A, 0x5A, 255)  # sepiaInk
AMBER        = (0xC6, 0x86, 0x42, 255)  # archiveAmber
STONE_LIGHT  = (0xA8, 0xA7, 0x9E, 255)
STONE_GRAY   = (0x70, 0x70, 0x70, 255)
SLATE        = (0x30, 0x48, 0x60, 255)  # stoneDark / secure facility
CYAN         = (0x68, 0xC0, 0xC0, 255)  # terminalCyan
OPENNET      = (0x4C, 0xFF, 0x6B, 255)
CLEAR        = (0, 0, 0, 0)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "art-pack", "hud")


class Canvas:
    """A 16x16 (or arbitrary) hard-edged pixel canvas."""

    def __init__(self, w=16, h=16):
        self.w, self.h = w, h
        self.img = Image.new("RGBA", (w, h), CLEAR)
        self.px = self.img.load()

    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = c

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.p(xx, yy, c)

    def frame(self, x, y, w, h, c):
        self.rect(x, y, w, 1, c)
        self.rect(x, y + h - 1, w, 1, c)
        self.rect(x, y, 1, h, c)
        self.rect(x + w - 1, y, 1, h, c)

    def hline(self, x, y, w, c):
        self.rect(x, y, w, 1, c)

    def vline(self, x, y, h, c):
        self.rect(x, y, 1, h, c)


def bevel_panel(cv, x, y, w, h, border, fill, inner=None, highlight=None):
    """Draw a bordered panel with an optional inner fill and top-left highlight."""
    cv.rect(x, y, w, h, fill)
    cv.frame(x, y, w, h, border)
    if inner is not None:
        cv.rect(x + 1, y + 1, w - 2, h - 2, inner)
    if highlight is not None:
        cv.hline(x + 1, y + 1, w - 2, highlight)
        cv.vline(x + 1, y + 1, h - 2, highlight)


# --- 1. Reliability / confidence meter frame -----------------------------
def reliability_meter_frame():
    cv = Canvas()
    # Gold outer frame with dark ruby channel that a meter fill sits inside.
    bevel_panel(cv, 0, 3, 16, 10, GOLD, DARK_MAROON)
    # corner rivets
    for cx, cy in ((0, 3), (15, 3), (0, 12), (15, 12)):
        cv.p(cx, cy, PALE_GOLD)
    # heart emblem at the left (reliability = hearts in-game)
    hx, hy = 2, 5
    cv.p(hx + 1, hy, CLASSNET_RED); cv.p(hx + 3, hy, CLASSNET_RED)
    cv.rect(hx, hy + 1, 5, 3, CLASSNET_RED)
    cv.rect(hx + 1, hy + 4, 3, 1, CLASSNET_RED)
    cv.p(hx + 2, hy + 5, CLASSNET_RED)
    cv.p(hx + 1, hy + 1, WHITE)  # sheen
    # segmented meter track to the right of the heart
    track_x = 8
    cv.rect(track_x, 6, 6, 4, BLACK)
    cv.rect(track_x, 6, 4, 4, BRIGHT_RUBY)   # filled portion
    cv.rect(track_x, 6, 4, 1, CLASSNET_RED)  # top sheen on fill
    cv.vline(track_x + 2, 6, 4, DARK_MAROON) # segment divider
    return cv


# --- 2. Document points counter icon -------------------------------------
def document_points_icon():
    cv = Canvas()
    # Cream page with folded gold corner and ruby ruled lines + gold star badge.
    cv.rect(2, 1, 10, 14, BLACK)
    cv.rect(2, 1, 9, 13, CREAM)
    cv.frame(2, 1, 9, 13, SEPIA)
    # folded top-right corner
    cv.p(9, 1, GOLD); cv.rect(8, 2, 2, 1, GOLD); cv.p(9, 2, PALE_GOLD)
    # ruled text lines (ruby ink)
    for ly in (4, 6, 8):
        cv.rect(4, ly, 5, 1, BUCKRAM)
    cv.rect(4, 10, 3, 1, BUCKRAM)
    # gold points star badge, bottom-right
    sx, sy = 9, 9
    cv.p(sx + 1, sy, GOLD)
    cv.rect(sx, sy + 1, 3, 1, PALE_GOLD)
    cv.p(sx + 1, sy + 1, WHITE)
    cv.rect(sx, sy + 2, 3, 1, GOLD)
    cv.p(sx, sy + 3, GOLD); cv.p(sx + 2, sy + 3, GOLD)
    cv.frame(sx - 1, sy - 1, 5, 6, BRONZE)
    return cv


# --- 3. Process stamp icons ----------------------------------------------
def _stamp_base(body, ink_bg):
    """Common stamped-frame body: black notch shadow + coloured stamp plate."""
    cv = Canvas()
    cv.rect(2, 2, 13, 13, BLACK)          # drop shadow / notch
    cv.rect(1, 1, 13, 13, body)           # stamp plate
    cv.rect(2, 2, 11, 11, ink_bg)         # ink field
    cv.vline(12, 2, 12, DARK_MAROON)      # right edge shade
    return cv


def stamp_rule():
    cv = _stamp_base(BUCKRAM, DARK_MAROON)
    # Gold serif "rule" mark: top & bottom bars with a central stem (paragraph rule).
    cv.rect(4, 4, 7, 1, GOLD)
    cv.rect(4, 10, 7, 1, GOLD)
    cv.rect(6, 4, 3, 7, GOLD)
    cv.vline(3, 2, 11, BRIGHT_RUBY)       # ink bleed at left
    return cv


def stamp_source():
    cv = _stamp_base(SEPIA, CREAM)
    # Aged source document: ruby ruled lines with a gold provenance seal.
    for ly, lw in ((4, 6), (6, 5), (8, 4)):
        cv.rect(3, ly, lw, 1, BUCKRAM)
    cv.rect(8, 9, 3, 3, GOLD)             # seal block
    cv.frame(8, 9, 3, 3, BRONZE)
    cv.p(9, 10, WHITE)
    return cv


def stamp_network():
    cv = _stamp_base(SLATE, BLACK)
    # Cyan node graph: three nodes linked by edges.
    nodes = ((3, 3), (9, 3), (6, 9))
    # edges first
    cv.rect(4, 4, 6, 1, CYAN)             # top edge
    cv.p(5, 5, CYAN); cv.p(6, 6, CYAN); cv.p(7, 5, CYAN); cv.p(8, 6, CYAN)
    for nx, ny in nodes:
        cv.rect(nx, ny, 2, 2, CYAN)
        cv.p(nx, ny, WHITE)
    return cv


def stamp_referral():
    cv = _stamp_base(CREAM, SEPIA)
    # Routing slip: ruby spine, cream memo body, gold forwarding arrow.
    cv.rect(2, 2, 2, 11, BRIGHT_RUBY)     # spine
    for ly in (4, 6):
        cv.rect(5, ly, 5, 1, BUCKRAM)
    # gold arrow pointing right (referred onward)
    cv.rect(4, 9, 5, 1, GOLD)
    cv.p(8, 8, GOLD); cv.p(9, 9, GOLD); cv.p(8, 10, GOLD)
    return cv


def stamp_read():
    cv = _stamp_base(BUCKRAM, DARK_MAROON)
    # Proofreading "read" mark: cream page under a gold eye (Silent Read).
    cv.rect(3, 8, 8, 4, CREAM)            # page being read
    cv.rect(4, 9, 6, 1, BUCKRAM)
    cv.rect(4, 10, 4, 1, BUCKRAM)
    # eye above the page
    cv.rect(4, 4, 7, 1, GOLD)
    cv.rect(3, 5, 9, 1, GOLD)
    cv.rect(4, 6, 7, 1, GOLD)
    cv.rect(6, 5, 3, 1, DARK_MAROON)      # iris well
    cv.rect(7, 5, 1, 1, CYAN)             # pupil glint
    return cv


PROCESS_STAMPS = {
    "rule": stamp_rule,
    "source": stamp_source,
    "network": stamp_network,
    "referral": stamp_referral,
    "read": stamp_read,
}


# --- 4. Equipped-tool slot frames ----------------------------------------
def tool_slot_empty():
    cv = Canvas()
    bevel_panel(cv, 1, 1, 14, 14, STONE_GRAY, BLACK, highlight=None)
    cv.rect(2, 2, 12, 12, DEEP_RUBY)
    cv.rect(2, 2, 12, 12, BLACK)
    # faint placeholder tool glyph (dim key)
    cv.rect(5, 6, 5, 2, STONE_GRAY)
    cv.rect(8, 8, 2, 4, STONE_GRAY)
    # inner shading
    cv.frame(2, 2, 12, 12, DEEP_RUBY)
    return cv


def tool_slot_active():
    cv = Canvas()
    bevel_panel(cv, 1, 1, 14, 14, GOLD, BUCKRAM)
    cv.rect(2, 2, 12, 12, DARK_MAROON)
    # gold corner accents (selected / equipped highlight)
    for cx, cy in ((1, 1), (14, 1), (1, 14), (14, 14)):
        cv.p(cx, cy, PALE_GOLD)
    cv.hline(2, 2, 11, MUTED_RUBY)        # top inner sheen
    # equipped tool glyph (gold key/stamp), matching UIScene tool slot
    cv.rect(5, 5, 5, 2, GOLD)
    cv.rect(7, 7, 2, 5, GOLD)
    cv.p(6, 6, PALE_GOLD)
    return cv


TOOL_SLOTS = {
    "tool_slot_frame_empty": tool_slot_empty,
    "tool_slot_frame_active": tool_slot_active,
}


# --- 5. Volume-assembly progress tracker (5 cover pieces) -----------------
# Segment order matches the volume-assembly cover pieces:
# spine, front board, title plate, ribbon marker, seal/stamp.
def seg_spine(cv, ox, earned):
    body = DARK_MAROON if earned else BLACK
    band = GOLD if earned else STONE_GRAY
    cv.rect(ox + 4, 1, 8, 14, body)
    cv.vline(ox + 5, 1, 14, BRIGHT_RUBY if earned else STONE_GRAY)
    for by in (3, 7, 11):
        cv.rect(ox + 4, by, 8, 1, band)
    cv.vline(ox + 11, 1, 14, band)


def seg_front_board(cv, ox, earned):
    body = BUCKRAM if earned else BLACK
    trim = GOLD if earned else STONE_GRAY
    bevel_panel(cv, ox + 2, 2, 12, 12, trim, body)
    if earned:
        cv.frame(ox + 4, 4, 8, 8, OLD_GOLD)
        cv.rect(ox + 6, 6, 4, 4, DEEP_RUBY)
        cv.p(ox + 7, 7, PALE_GOLD)


def seg_title_plate(cv, ox, earned):
    plate = GOLD if earned else STONE_GRAY
    body = DARK_MAROON if earned else BLACK
    cv.rect(ox + 2, 3, 12, 10, body)
    bevel_panel(cv, ox + 3, 5, 10, 6, plate, PALE_GOLD if earned else STONE_LIGHT)
    if earned:
        cv.rect(ox + 4, 7, 8, 1, BUCKRAM)  # engraved title line
        cv.rect(ox + 5, 9, 6, 1, BUCKRAM)


def seg_ribbon_marker(cv, ox, earned):
    body = DARK_MAROON if earned else BLACK
    ribbon = PALE_GOLD if earned else STONE_GRAY
    edge = BRONZE if earned else STONE_GRAY
    cv.rect(ox + 2, 1, 12, 14, body)
    cv.rect(ox + 6, 1, 4, 10, ribbon)
    cv.vline(ox + 6, 1, 10, edge)
    cv.vline(ox + 9, 1, 10, edge)
    # notched (swallow-tail) ribbon tail
    cv.p(ox + 6, 11, ribbon); cv.p(ox + 9, 11, ribbon)
    cv.p(ox + 6, 12, ribbon); cv.p(ox + 9, 12, ribbon)
    cv.p(ox + 7, 11, body); cv.p(ox + 8, 11, body)


def seg_seal(cv, ox, earned):
    body = DARK_MAROON if earned else BLACK
    ring = GOLD if earned else STONE_GRAY
    core = BRIGHT_RUBY if earned else STONE_GRAY
    cv.rect(ox + 2, 2, 12, 12, body)
    # round-ish wax seal
    cv.rect(ox + 5, 4, 6, 8, core)
    cv.rect(ox + 4, 5, 8, 6, core)
    cv.frame(ox + 5, 4, 6, 8, ring)
    cv.frame(ox + 4, 5, 8, 6, ring)
    if earned:
        # star emboss
        cv.p(ox + 7, 6, PALE_GOLD)
        cv.rect(ox + 6, 7, 4, 1, PALE_GOLD)
        cv.p(ox + 7, 8, PALE_GOLD); cv.p(ox + 8, 8, PALE_GOLD)


SEGMENTS = [
    ("spine", seg_spine),
    ("front_board", seg_front_board),
    ("title_plate", seg_title_plate),
    ("ribbon_marker", seg_ribbon_marker),
    ("seal_stamp", seg_seal),
]


def volume_assembly_tracker(earned_count):
    """80x16 bar: 5 segments left-to-right, first `earned_count` filled."""
    cv = Canvas(80, 16)
    for i, (_, drawer) in enumerate(SEGMENTS):
        ox = i * 16
        drawer(cv, ox, i < earned_count)
        # segment divider tick
        if i > 0:
            cv.vline(ox, 2, 12, BLACK)
    # outer gold frame around the whole tracker
    cv.frame(0, 0, 80, 16, GOLD if earned_count >= len(SEGMENTS) else BRONZE)
    return cv


def volume_segment_icon(drawer):
    cv = Canvas()
    drawer(cv, 0, True)
    return cv


# --- output helpers ------------------------------------------------------
def save(cv, name):
    path16 = os.path.join(OUT_DIR, f"{name}_16.png")
    cv.img.save(path16)
    up = cv.img.resize((cv.w * 2, cv.h * 2), Image.NEAREST)
    up.save(os.path.join(OUT_DIR, f"{name}_32.png"))
    return name


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    written = []

    written.append(save(reliability_meter_frame(), "reliability_meter_frame"))
    written.append(save(document_points_icon(), "document_points_icon"))

    for name, fn in PROCESS_STAMPS.items():
        written.append(save(fn(), f"process_stamp_{name}"))

    for name, fn in TOOL_SLOTS.items():
        written.append(save(fn(), name))

    # Volume-assembly tracker bar (empty + full) and per-segment icons.
    for count, tag in ((0, "empty"), (5, "full")):
        cv = volume_assembly_tracker(count)
        cv.img.save(os.path.join(OUT_DIR, f"volume_assembly_tracker_{tag}_80x16.png"))
        cv.img.resize((160, 32), Image.NEAREST).save(
            os.path.join(OUT_DIR, f"volume_assembly_tracker_{tag}_160x32.png")
        )
        written.append(f"volume_assembly_tracker_{tag}")

    for name, drawer in SEGMENTS:
        written.append(save(volume_segment_icon(drawer), f"volume_segment_{name}"))

    print(f"Wrote {len(written)} icon groups to {os.path.relpath(OUT_DIR)}")
    for name in written:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
