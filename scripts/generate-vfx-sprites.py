#!/usr/bin/env python3
"""Deterministic generator for DANN-E combat/pickup VFX sprite strips.

Produces original 16-bit SNES/ALttP-style pixel-art effect sheets. Output is
strictly hard-edged: every pixel is either fully transparent (alpha 0) or fully
opaque (alpha 255) drawn from a small fixed palette. No anti-aliasing, no
smoothing, transparent background, readable at native scale.

Palette is anchored to the game's existing sprite frames (public/assets/sprites
SVG icons and the FRUS volume art): near-black outline #0F0F0F, ruby-red buckram
#7A1020, brass/gold #D6A23A, manila #B89A5A.

Run: python3 scripts/generate-vfx-sprites.py
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "assets" / "art-pack" / "vfx"

# --- Fixed limited palette (RGBA), matched to existing sprite frames ---------
T = (0, 0, 0, 0)          # transparent
K = (15, 15, 15, 255)     # #0F0F0F outline / shadow
RD = (90, 12, 24, 255)    # deep ruby shadow
R = (122, 16, 32, 255)    # #7A1020 ruby buckram
RL = (176, 36, 54, 255)   # light ruby
GD = (150, 108, 30, 255)  # deep gold shadow
G = (214, 162, 58, 255)   # #D6A23A brass/gold
Y = (242, 210, 122, 255)  # light gold
W = (255, 244, 214, 255)  # cream spark highlight
TN = (184, 154, 90, 255)  # #B89A5A manila
TD = (138, 112, 62, 255)  # manila shadow

ALLOWED = {T, K, RD, R, RL, GD, G, Y, W, TN, TD}


class Frame:
    def __init__(self, size: int):
        self.n = size
        self.px = [[T for _ in range(size)] for _ in range(size)]

    def set(self, x: int, y: int, c):
        if 0 <= x < self.n and 0 <= y < self.n and c != T:
            self.px[y][x] = c

    def get(self, x, y):
        if 0 <= x < self.n and 0 <= y < self.n:
            return self.px[y][x]
        return T

    def disc(self, cx, cy, r, c):
        for y in range(self.n):
            for x in range(self.n):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    self.set(x, y, c)

    def ring(self, cx, cy, r, c, w=1.0):
        for y in range(self.n):
            for x in range(self.n):
                d = math.hypot(x - cx, y - cy)
                if r - w <= d <= r:
                    self.set(x, y, c)

    def wedge(self, cx, cy, r0, r1, a0, a1, c):
        """Filled annular wedge (crescent) between radii and angles (degrees)."""
        for y in range(self.n):
            for x in range(self.n):
                d = math.hypot(x - cx + 0.0, y - cy + 0.0)
                if r0 <= d <= r1:
                    ang = math.degrees(math.atan2(y - cy, x - cx))
                    if ang < 0:
                        ang += 360
                    lo, hi = a0 % 360, a1 % 360
                    inside = lo <= ang <= hi if lo <= hi else (ang >= lo or ang <= hi)
                    if inside:
                        self.set(x, y, c)

    def outline_transparent(self, c=K):
        """Add a 1px outline around every non-transparent cluster edge."""
        add = []
        for y in range(self.n):
            for x in range(self.n):
                if self.px[y][x] == T:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nb = self.get(x + dx, y + dy)
                        if nb != T:
                            add.append((x, y))
                            break
        for x, y in add:
            self.px[y][x] = c


def save_strip(frames, path: Path):
    n = frames[0].n
    strip = Image.new("RGBA", (n * len(frames), n), T)
    for i, fr in enumerate(frames):
        img = Image.new("RGBA", (n, n), T)
        img.putdata([fr.px[y][x] for y in range(n) for x in range(n)])
        strip.paste(img, (i * n, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    strip.save(path)
    return strip.size


# --- 1. Hit-spark burst: 4 frames, 16x16 -----------------------------------
def hit_spark():
    frames = []
    specs = [
        (2, [W]),
        (5, [W, Y, G]),
        (7, [W, Y, G, R]),
        (7, [T, T, G, R]),  # hollow dissipation
    ]
    c = 8
    for fi, (reach, ramp) in enumerate(specs):
        f = Frame(16)
        # core
        if fi < 3:
            f.disc(c, c, max(1, 3 - fi), W)
        # 8-point star arms
        dirs = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)]
        for (dx, dy) in dirs:
            for t in range(reach + 1):
                # taper color along the arm
                seg = int(t / max(1, reach) * (len(ramp) - 1))
                col = ramp[seg]
                if col == T:
                    continue
                # diagonals shorter
                if dx and dy and t > reach - 2:
                    continue
                x = c + dx * t
                y = c + dy * t
                f.set(x, y, col)
        if fi == 3:
            # detached outer sparks
            for (dx, dy) in dirs[:4]:
                f.set(c + dx * (reach + 1), c + dy * (reach + 1), Y)
        frames.append(f)
    return frames


# --- 2. Defeat dissolve / pixel-scatter: 5 frames, 32x32 --------------------
def defeat_dissolve():
    rnd = random.Random(20260706)
    n = 32
    cx = cy = 16
    body_r = 10
    # base silhouette pixels (a rounded enemy blob)
    base = []
    for y in range(n):
        for x in range(n):
            d = math.hypot(x - cx, y - cy)
            if d <= body_r:
                base.append((x, y))
    # assign each pixel a scatter vector + drop order
    parts = []
    for (x, y) in base:
        ang = math.atan2(y - cy, x - cx) + rnd.uniform(-0.5, 0.5)
        spd = rnd.uniform(0.6, 1.5)
        drop = rnd.random()  # threshold at which the pixel vanishes
        parts.append((x, y, ang, spd, drop))

    frames = []
    # progression: fraction dissolved & outward push per frame
    stages = [
        (0.00, 0.0),
        (0.15, 1.5),
        (0.45, 3.5),
        (0.75, 6.0),
        (0.93, 9.0),
    ]
    for fi, (dissolved, push) in enumerate(stages):
        f = Frame(n)
        for (x0, y0, ang, spd, drop) in parts:
            if drop < dissolved:
                # this pixel has flown off; draw it as a moving scatter shard
                px = int(round(x0 + math.cos(ang) * push * spd))
                py = int(round(y0 + math.sin(ang) * push * spd - push * 0.3))
                # fade far shards to gold sparks, then gone
                life = (dissolved - drop)
                if life > 0.55:
                    continue
                col = G if life > 0.3 else Y
                f.set(px, py, col)
            else:
                # still part of the collapsing body
                d = math.hypot(x0 - cx, y0 - cy)
                if d > body_r - 1.2:
                    col = RD
                elif d > body_r - 3:
                    col = R
                else:
                    col = RL if (x0 + y0) % 5 == 0 else R
                f.set(x0, y0, col)
        f.outline_transparent(K)
        frames.append(f)
    return frames


# --- 3. Document-point pickup sparkle: 3 frames, 8x8 ------------------------
def doc_sparkle():
    frames = []
    c = 4
    # f0: small gold cross
    f0 = Frame(8)
    for d in range(2):
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            f0.set(c + dx * d, c + dy * d, G if d else W)
    f0.set(c, c, W)
    frames.append(f0)
    # f1: bright 4-point diamond star, white core, gold tips
    f1 = Frame(8)
    for d in range(3):
        col = W if d == 0 else (Y if d == 1 else G)
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            f1.set(c + dx * d, c + dy * d, col)
    # tiny diagonal glints
    for (dx, dy) in ((1, 1), (-1, -1), (1, -1), (-1, 1)):
        f1.set(c + dx, c + dy, Y)
    frames.append(f1)
    # f2: fading ring of 4 dots
    f2 = Frame(8)
    for (dx, dy) in ((2, 0), (-2, 0), (0, 2), (0, -2)):
        f2.set(c + dx, c + dy, G)
    f2.set(c, c, Y)
    frames.append(f2)
    return frames


# --- 4. FRUS volume fragment glow/pickup: 4 frames, 16x16, ruby buckram ------
def frus_fragment():
    frames = []
    n = 16

    def draw_book(f):
        # ruby buckram volume with gold spine + black outline (matches frus-volume.svg)
        for y in range(3, 14):
            for x in range(4, 12):
                f.set(x, y, R)
        for y in range(3, 14):  # gold spine band on left
            f.set(4, y, G)
            f.set(5, y, G)
        for x in range(5, 11):  # gold title lines
            f.set(x, 6, Y)
            f.set(x, 10, GD)
        # page edge on right (cream)
        for y in range(4, 13):
            f.set(11, y, W)
        f.outline_transparent(K)

    glow_r = [0, 6, 8, 7]
    for fi in range(4):
        f = Frame(n)
        # radial glow halo behind the book
        if glow_r[fi]:
            for y in range(n):
                for x in range(n):
                    d = math.hypot(x - 8, y - 8)
                    if glow_r[fi] - 1.6 <= d <= glow_r[fi]:
                        f.set(x, y, Y if fi == 2 else G)
        draw_book(f)
        # rising sparkle above the book (pickup cue)
        if fi >= 1:
            sy = 4 - fi
            f.set(8, sy, W)
            f.set(9, sy + 1, Y)
            if fi >= 2:
                f.set(7, sy + 1, Y)
        frames.append(f)
    return frames


# --- Weapon swing arcs (24x24, 3 frames each) -------------------------------
def swing_arc(colors, tip_color, base_colors, style):
    """Generic 3-frame crescent swing.

    colors: (edge, mid) for the arc body.
    tip_color: leading-edge accent.
    base_colors: small icon block colors at the pivot.
    style: 'stamp' | 'pencil' | 'folder' — tweaks arc thickness/impact.
    """
    edge, mid = colors
    n = 24
    px, py = 5, 20  # pivot (hand) lower-left
    # sweep from overhead down to the right across 3 frames
    sweeps = [(250, 300), (285, 340), (320, 15)]
    radii = {
        "stamp": (11, 15),
        "pencil": (12, 16),
        "folder": (10, 14),
    }[style]
    r0, r1 = radii
    frames = []
    for fi, (a0, a1) in enumerate(sweeps):
        f = Frame(n)
        # arc body: outer ring = mid, inner edge = edge color
        f.wedge(px, py, r0, r1, a0, a1, mid)
        f.wedge(px, py, r0, r0 + 1.6, a0, a1, edge)
        if style == "pencil":
            # thin sharp slash: keep only outer band, add gold tip streaks
            f2 = Frame(n)
            f2.wedge(px, py, r1 - 2.5, r1, a0, a1, mid)
            f2.wedge(px, py, r1 - 1.2, r1, a0, a1, RL)
            f = f2
        # leading-edge tip accent
        lead = math.radians(a1)
        for rr in (r0, (r0 + r1) / 2, r1):
            tx = int(round(px + math.cos(lead) * rr))
            ty = int(round(py + math.sin(lead) * rr))
            f.set(tx, ty, tip_color)
        # impact sparkle on final frame
        if fi == 2:
            ix = int(round(px + math.cos(lead) * (r1 + 1)))
            iy = int(round(py + math.sin(lead) * (r1 + 1)))
            f.set(ix, iy, W)
            for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                f.set(ix + dx, iy + dy, tip_color)
        # small weapon icon block at pivot
        for i, col in enumerate(base_colors):
            f.set(px, py - i, col)
            f.set(px + 1, py - i, col)
        f.outline_transparent(K)
        frames.append(f)
    return frames


def citation_stamp_arc():
    # gold body + ruby handle + black base -> gold arc, ruby edge, gold tip
    return swing_arc((R, G), Y, [K, G, G, R], "stamp")


def red_pencil_arc():
    # ruby shaft with gold tip -> thin red slash, gold tip
    return swing_arc((RD, R), G, [R, R, R, G], "pencil")


def review_folder_arc():
    # manila folder with ruby tab -> tan arc, manila body, ruby tip
    return swing_arc((TD, TN), R, [TN, TN, TN, R], "folder")


def main():
    jobs = [
        ("vfx_hit_spark_strip.png", hit_spark(), 4, 16),
        ("vfx_defeat_dissolve_strip.png", defeat_dissolve(), 5, 32),
        ("vfx_doc_point_sparkle_strip.png", doc_sparkle(), 3, 8),
        ("vfx_frus_fragment_glow_strip.png", frus_fragment(), 4, 16),
        ("vfx_citation_stamp_swing_strip.png", citation_stamp_arc(), 3, 24),
        ("vfx_red_pencil_swing_strip.png", red_pencil_arc(), 3, 24),
        ("vfx_review_folder_swing_strip.png", review_folder_arc(), 3, 24),
    ]
    for name, frames, count, size in jobs:
        assert len(frames) == count, f"{name}: expected {count} frames"
        for fr in frames:
            assert fr.n == size, f"{name}: expected {size}px grid"
            for row in fr.px:
                for c in row:
                    assert c in ALLOWED, f"{name}: off-palette color {c}"
                    assert c[3] in (0, 255), f"{name}: soft alpha {c}"
        dims = save_strip(frames, OUT_DIR / name)
        print(f"wrote {name}: {dims[0]}x{dims[1]} ({count} x {size}px)")


if __name__ == "__main__":
    main()
