#!/usr/bin/env python3
"""Generate the New Game+ "veteran editor" palette-swap cosmetic sprite pack.

Cosmetic-only recolor of the five production player-role sprite sheets. Applies a
distinguished ruby-buckram + gold/silver-trim palette over the existing art while
preserving the exact 4x4 / 32x48 frame layout, sheet dimensions, transparent
background, animation ordering, and hard pixel edges (no anti-aliasing).

The transform is a strict per-role color lookup table: every opaque source color
maps to exactly one output color, so no pixel moves and transparency is untouched.
Skin, hair, held documents, and outline colors are intentionally left unchanged so
each veteran stays recognizable; only garment/trim colors are recolored.
"""
from __future__ import annotations

import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "public/assets/art-pack/sprites/native"
OUT_DIR = ROOT / "public/assets/art-pack/ng-plus"
NATIVE_OUT = OUT_DIR / "native"
MASTER_SCALE = 8  # 128x192 native -> 1024x1536 display master (nearest neighbor)

# --- Veteran palette ramps -------------------------------------------------
RUBY_SHADOW = (0x4A, 0x0A, 0x12)
RUBY_DARK = (0x7A, 0x0F, 0x1E)
RUBY_MID = (0xA8, 0x18, 0x28)
RUBY_LIGHT = (0xC8, 0x28, 0x3A)
GOLD_DARK = (0x9C, 0x6E, 0x1A)
GOLD_MID = (0xE0, 0xB0, 0x40)
GOLD_LIGHT = (0xF4, 0xD4, 0x68)
SILVER_DARK = (0x7C, 0x7C, 0x8A)
SILVER_MID = (0xB4, 0xB4, 0xC2)
SILVER_LIGHT = (0xE4, 0xE4, 0xEE)


def hx(s: str) -> tuple[int, int, int]:
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


# Per-role LUTs: production role -> (source native sheet, {src_rgb: dst_rgb}).
# Any source color not listed passes through unchanged (skin, hair, paper, outline).
ROLE_MAPS = {
    "proofreader": (
        "sprite_reviewer.png",
        {
            hx("1D2438"): RUBY_DARK,    # navy jacket dark -> ruby buckram
            hx("304860"): RUBY_MID,     # navy jacket light -> ruby buckram
            hx("303640"): RUBY_SHADOW,  # trousers -> deep ruby
            hx("D6A23A"): GOLD_MID,     # waistcoat -> distinguished gold trim
            hx("E8D8A8"): GOLD_LIGHT,   # waistcoat highlight -> gold sheen
            hx("F8F0D8"): SILVER_LIGHT, # collar -> silver trim
            hx("B89A5A"): GOLD_DARK,    # stray accent -> gold
        },
    ),
    "compiler": (
        "sprite_compiler.png",
        {
            hx("163820"): RUBY_MID,     # green waistcoat -> ruby buckram
            hx("303640"): RUBY_SHADOW,  # trousers -> deep ruby
            hx("D6A23A"): GOLD_MID,     # buttons/accent -> gold trim
            hx("B89A5A"): GOLD_DARK,    # stray accent -> gold
        },
    ),
    "editor": (
        "sprite_editor.png",
        {
            hx("B82030"): RUBY_MID,     # red waistcoat -> canonical ruby buckram
            hx("503020"): RUBY_DARK,    # jacket mid -> ruby buckram
            hx("2A2420"): RUBY_SHADOW,  # jacket shadow -> deep ruby
            hx("303640"): RUBY_SHADOW,  # trousers -> deep ruby
            hx("D6A23A"): GOLD_MID,     # red pencil / accent -> gold trim
            hx("F8F0D8"): SILVER_LIGHT, # collar -> silver trim
            hx("E8D8A8"): SILVER_MID,   # collar shade -> silver trim
            hx("B89A5A"): GOLD_DARK,
        },
    ),
    "declass_reviewer": (
        "sprite_declassification_coordinator.png",
        {
            hx("163820"): RUBY_DARK,    # green lapel dark -> ruby buckram
            hx("2F7A32"): RUBY_MID,     # green lapel bright -> ruby buckram
            hx("D6A23A"): GOLD_MID,     # accent -> gold trim
            hx("B0B0A8"): SILVER_MID,   # gray -> silver trim
        },
    ),
    "source_note_specialist": (
        "sprite_records_officer.png",
        {
            hx("18181C"): RUBY_DARK,    # suit body -> ruby buckram
            hx("163820"): SILVER_MID,   # green lapel -> silver trim
            hx("B82030"): RUBY_MID,     # archive book -> canonical ruby buckram
            hx("503020"): RUBY_SHADOW,  # trousers -> deep ruby
            hx("D6A23A"): GOLD_MID,     # accent -> gold trim
            hx("B89A5A"): GOLD_DARK,
        },
    ),
}


def recolor(src: Image.Image, lut: dict) -> Image.Image:
    src = src.convert("RGBA")
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    sp = src.load()
    op = out.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if a == 0:
                continue  # preserve transparency exactly
            nr, ng, nb = lut.get((r, g, b), (r, g, b))
            op[x, y] = (nr, ng, nb, a)
    return out


def main() -> None:
    NATIVE_OUT.mkdir(parents=True, exist_ok=True)
    for role, (src_name, lut) in ROLE_MAPS.items():
        src = Image.open(SRC_DIR / src_name)
        native = recolor(src, lut)
        native_path = NATIVE_OUT / f"sprite_{role}_veteran.png"
        native.save(native_path)
        master = native.resize(
            (native.width * MASTER_SCALE, native.height * MASTER_SCALE),
            Image.NEAREST,
        )
        master_path = OUT_DIR / f"sprite_{role}_veteran.png"
        master.save(master_path)
        print(f"{role}: {src_name} -> {native_path.name} ({native.size}) + master {master.size}")


if __name__ == "__main__":
    main()
