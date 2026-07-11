#!/usr/bin/env python3
"""Generate cohesive FRUS-themed 32x48 character sheets.

The imported native sheets have a useful file contract, but several animation
cells split the body and feet into separate fragments. This script preserves the
filenames, dimensions, transparency, and 4x4 frame layout while replacing the
broken cells with original repo-local pixel art.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import shutil

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SPRITE_DIR = ROOT / "public/assets/art-pack/sprites/native"
BACKUP_ROOT = ROOT / "public/assets/_originals/art-pack/sprites/native"
REPORT_PATH = ROOT / "docs/art/frus_character_sprite_sharpening.md"

FRAME_W = 32
FRAME_H = 48
COLS = 4
ROWS = 4


COLORS = {
    "transparent": (0, 0, 0, 0),
    "outline": (15, 15, 15, 255),
    "ink": (24, 24, 28, 255),
    "shadow": (42, 36, 32, 255),
    "cream": (248, 240, 216, 255),
    "paper": (232, 216, 168, 255),
    "paper_shadow": (184, 154, 90, 255),
    "gold": (214, 162, 58, 255),
    "ruby": (184, 32, 48, 255),
    "deep_ruby": (122, 16, 32, 255),
    "maroon": (58, 7, 16, 255),
    "cyan": (104, 192, 192, 255),
    "green": (47, 122, 50, 255),
    "green_dark": (22, 56, 32, 255),
    "slate": (48, 72, 96, 255),
    "slate_light": (82, 120, 144, 255),
    "navy": (29, 36, 56, 255),
    "navy_light": (64, 92, 152, 255),
    "gray": (112, 112, 112, 255),
    "gray_light": (176, 176, 168, 255),
    "gray_dark": (48, 54, 64, 255),
    "skin": (240, 192, 144, 255),
    "skin_shadow": (200, 138, 88, 255),
    "hair_brown": (106, 64, 36, 255),
    "hair_brown_light": (166, 106, 50, 255),
    "hair_dark": (42, 36, 32, 255),
    "hair_gray": (176, 176, 168, 255),
    "hair_silver": (208, 200, 184, 255),
    "tan": (184, 154, 90, 255),
    "tan_dark": (106, 64, 36, 255),
    "brown": (138, 85, 44, 255),
    "brown_dark": (80, 48, 32, 255),
    "shoe": (42, 36, 32, 255),
}


@dataclass(frozen=True)
class RoleArt:
    filename: str
    hair: str
    hair_light: str
    jacket: str
    jacket_dark: str
    pants: str
    accent: str
    shirt: str = "cream"
    skin: str = "skin"
    skin_shadow: str = "skin_shadow"
    prop: str = "folder"
    glasses: bool = False
    hat: bool = False
    tie: bool = True


ROLES = [
    RoleArt(
        "sprite_compiler.png",
        hair="hair_brown",
        hair_light="hair_brown_light",
        jacket="tan",
        jacket_dark="tan_dark",
        pants="gray_dark",
        accent="green_dark",
        prop="folder",
        glasses=True,
    ),
    RoleArt(
        "sprite_editor.png",
        hair="hair_dark",
        hair_light="hair_brown",
        jacket="brown",
        jacket_dark="brown_dark",
        pants="gray_dark",
        accent="ruby",
        prop="red_pencil",
        glasses=True,
    ),
    RoleArt(
        "sprite_declassification_coordinator.png",
        hair="hair_brown",
        hair_light="hair_brown_light",
        jacket="green",
        jacket_dark="green_dark",
        pants="brown",
        accent="cyan",
        prop="clipboard",
        glasses=False,
        tie=False,
    ),
    RoleArt(
        "sprite_reviewer.png",
        hair="hair_brown",
        hair_light="hair_brown_light",
        jacket="slate",
        jacket_dark="navy",
        pants="gray_dark",
        accent="gold",
        prop="briefcase",
        glasses=False,
    ),
    RoleArt(
        "sprite_senior_reviewer.png",
        hair="hair_gray",
        hair_light="hair_silver",
        jacket="gray",
        jacket_dark="gray_dark",
        pants="gray_dark",
        accent="gold",
        prop="stamp",
        glasses=False,
        hat=True,
        tie=False,
    ),
    RoleArt(
        "sprite_general_editor.png",
        hair="hair_silver",
        hair_light="cream",
        jacket="navy",
        jacket_dark="ink",
        pants="navy",
        accent="ruby",
        prop="red_pencil",
        glasses=False,
    ),
    RoleArt(
        "sprite_archivist.png",
        hair="hair_gray",
        hair_light="hair_silver",
        jacket="deep_ruby",
        jacket_dark="maroon",
        pants="tan_dark",
        accent="gold",
        prop="file_box",
        glasses=True,
        tie=False,
    ),
    RoleArt(
        "sprite_records_officer.png",
        hair="hair_brown",
        hair_light="hair_brown_light",
        jacket="green_dark",
        jacket_dark="ink",
        pants="brown_dark",
        accent="paper",
        prop="source_note",
        glasses=True,
        tie=False,
    ),
    RoleArt(
        "sprite_security_officer.png",
        hair="hair_brown",
        hair_light="hair_brown_light",
        jacket="navy",
        jacket_dark="ink",
        pants="navy",
        accent="cyan",
        prop="keycard",
        glasses=False,
    ),
]


def c(name: str) -> tuple[int, int, int, int]:
    return COLORS[name]


def rect(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill: str) -> None:
    draw.rectangle(xy, fill=c(fill))


def line(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill: str, width: int = 1) -> None:
    draw.line(xy, fill=c(fill), width=width)


def box(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill: str, outline: str = "outline") -> None:
    rect(draw, xy, outline)
    x0, y0, x1, y1 = xy
    if x1 - x0 > 2 and y1 - y0 > 2:
        rect(draw, (x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill)


def paste_flipped(frame: Image.Image) -> Image.Image:
    return frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)


def draw_head(draw: ImageDraw.ImageDraw, role: RoleArt, facing: str) -> None:
    if role.hat:
        box(draw, (9, 8, 23, 13), "gray_dark")
        rect(draw, (7, 12, 25, 14), "outline")
        rect(draw, (9, 11, 23, 13), "gray")
    if facing == "up":
        box(draw, (9, 9, 23, 22), role.hair)
        rect(draw, (11, 10, 21, 13), role.hair_light)
        rect(draw, (10, 20, 22, 23), role.skin_shadow)
        return
    if facing == "left":
        box(draw, (9, 10, 22, 23), role.skin)
        rect(draw, (9, 10, 20, 14), role.hair)
        rect(draw, (11, 9, 22, 12), role.hair_light)
        rect(draw, (9, 20, 20, 23), role.skin_shadow)
        rect(draw, (20, 15, 23, 18), role.skin)
        rect(draw, (13, 16, 14, 17), "ink")
        if role.glasses:
            rect(draw, (12, 15, 15, 18), "cream")
            rect(draw, (13, 16, 14, 17), "ink")
        return
    box(draw, (9, 10, 23, 23), role.skin)
    rect(draw, (8, 14, 10, 18), role.skin_shadow)
    rect(draw, (22, 14, 24, 18), role.skin_shadow)
    rect(draw, (9, 9, 23, 14), role.hair)
    rect(draw, (11, 8, 20, 11), role.hair_light)
    rect(draw, (10, 20, 22, 23), role.skin_shadow)
    if role.glasses:
        rect(draw, (11, 15, 14, 18), "cream")
        rect(draw, (18, 15, 21, 18), "cream")
        line(draw, (14, 16, 18, 16), "outline")
    rect(draw, (12, 16, 13, 17), "ink")
    rect(draw, (19, 16, 20, 17), "ink")


def draw_body(draw: ImageDraw.ImageDraw, role: RoleArt, facing: str, step: int = 0) -> None:
    # Legs and shoes.
    if facing in ("down", "up"):
        left_shift = -1 if step == 1 else 0
        right_shift = 1 if step == 2 else 0
        box(draw, (11 + left_shift, 33, 15 + left_shift, 42), role.pants)
        box(draw, (17 + right_shift, 33, 21 + right_shift, 42), role.pants)
        rect(draw, (10 + left_shift, 42, 15 + left_shift, 45), "shoe")
        rect(draw, (17 + right_shift, 42, 22 + right_shift, 45), "shoe")
    else:
        stride = -1 if step == 1 else 1 if step == 2 else 0
        box(draw, (13 + stride, 34, 17 + stride, 42), role.pants)
        box(draw, (18 - stride, 34, 22 - stride, 42), role.pants)
        rect(draw, (12 + stride, 42, 17 + stride, 45), "shoe")
        rect(draw, (18 - stride, 42, 23 - stride, 45), "shoe")

    # Torso, shirt, jacket lapels.
    box(draw, (9, 22, 24, 35), role.jacket)
    rect(draw, (11, 23, 22, 25), role.jacket)
    rect(draw, (13, 23, 20, 34), role.shirt)
    rect(draw, (10, 28, 13, 35), role.jacket_dark)
    rect(draw, (20, 28, 23, 35), role.jacket_dark)
    if role.tie:
        rect(draw, (15, 24, 17, 31), role.accent)
        rect(draw, (14, 31, 18, 33), role.accent)


def draw_arms(draw: ImageDraw.ImageDraw, role: RoleArt, facing: str, step: int = 0) -> None:
    swing = 1 if step == 1 else -1 if step == 2 else 0
    if facing == "left":
        box(draw, (7, 24 + swing, 10, 34 + swing), role.jacket_dark)
        rect(draw, (7, 34 + swing, 10, 37 + swing), role.skin)
        box(draw, (21, 24 - swing, 24, 33 - swing), role.jacket_dark)
        return
    if facing == "up":
        box(draw, (7, 24 + swing, 10, 34 + swing), role.jacket_dark)
        box(draw, (22, 24 - swing, 25, 34 - swing), role.jacket_dark)
        return
    box(draw, (7, 24 + swing, 10, 35 + swing), role.jacket_dark)
    rect(draw, (7, 35 + swing, 10, 38 + swing), role.skin)
    box(draw, (22, 24 - swing, 25, 35 - swing), role.jacket_dark)
    rect(draw, (22, 35 - swing, 25, 38 - swing), role.skin)


def draw_prop(draw: ImageDraw.ImageDraw, role: RoleArt, mode: str, facing: str) -> None:
    if mode == "none":
        return
    if mode == "reading":
        box(draw, (8, 27, 23, 37), "paper")
        line(draw, (15, 28, 15, 36), "paper_shadow")
        line(draw, (10, 30, 14, 30), "tan_dark")
        line(draw, (17, 31, 21, 31), "tan_dark")
        return
    if mode == "approval":
        box(draw, (6, 24, 11, 31), "gold")
        box(draw, (21, 24, 26, 31), "gold")
        return
    if role.prop == "red_pencil":
        line(draw, (21, 24, 26, 18), "ruby", 2)
        rect(draw, (25, 17, 27, 19), "gold")
    elif role.prop == "clipboard":
        box(draw, (21, 27, 27, 37), "paper")
        rect(draw, (23, 26, 25, 27), "gold")
        line(draw, (22, 31, 26, 31), "slate")
        # Tiny mug/steam cue.
        box(draw, (7, 31, 11, 35), "cream")
        rect(draw, (10, 32, 12, 34), "cream")
        rect(draw, (8, 28, 9, 29), "gray_light")
    elif role.prop == "briefcase":
        box(draw, (21, 31, 27, 39), "brown_dark")
        rect(draw, (23, 30, 25, 31), "gold")
    elif role.prop == "stamp":
        box(draw, (21, 29, 27, 36), "gold")
        rect(draw, (23, 26, 25, 30), "brown_dark")
    elif role.prop == "file_box":
        box(draw, (5, 31, 12, 39), "paper_shadow")
        rect(draw, (7, 33, 10, 34), "paper")
    elif role.prop == "source_note":
        box(draw, (20, 26, 27, 37), "paper")
        rect(draw, (21, 27, 22, 36), "ruby")
        line(draw, (23, 30, 26, 30), "tan_dark")
    elif role.prop == "keycard":
        box(draw, (21, 30, 27, 36), "cyan")
        rect(draw, (22, 32, 26, 33), "slate")
    else:
        box(draw, (21, 28, 27, 38), "brown_dark")
        rect(draw, (22, 29, 26, 36), "paper")


def draw_character_frame(role: RoleArt, facing: str, step: int = 0, mode: str = "default") -> Image.Image:
    frame = Image.new("RGBA", (FRAME_W, FRAME_H), c("transparent"))
    draw = ImageDraw.Draw(frame)
    if role.filename == "sprite_statechat_terminal.png":
        draw_terminal(draw, mode=mode, step=step, facing=facing)
        return frame
    if facing == "right":
        left = draw_character_frame(role, "left", step=step, mode=mode)
        return paste_flipped(left)
    draw_body(draw, role, facing, step)
    draw_arms(draw, role, facing, step)
    draw_head(draw, role, facing)
    prop_mode = "reading" if mode == "reading" else "approval" if mode == "approval" else "default"
    draw_prop(draw, role, prop_mode, facing)
    if mode == "interact":
        if role.prop == "stamp":
            box(draw, (20, 20, 27, 27), "gold")
            rect(draw, (21, 25, 26, 27), "ruby")
        elif role.prop == "red_pencil":
            line(draw, (20, 19, 28, 27), "ruby", 2)
            rect(draw, (27, 27, 29, 29), "gold")
        else:
            box(draw, (20, 22, 28, 30), role.accent)
    if mode == "approval":
        line(draw, (8, 24, 5, 18), role.jacket_dark, 2)
        line(draw, (24, 24, 27, 18), role.jacket_dark, 2)
    return frame


def draw_terminal(draw: ImageDraw.ImageDraw, mode: str, step: int, facing: str) -> None:
    glow = "cyan" if step % 2 == 0 else "slate_light"
    box(draw, (7, 12, 25, 27), "gray_light")
    box(draw, (9, 14, 23, 24), "ink")
    rect(draw, (11, 16, 21, 21), glow)
    if mode == "reading":
        line(draw, (11, 18, 21, 18), "cream")
    box(draw, (10, 28, 22, 36), "gray")
    rect(draw, (12, 30, 20, 31), "paper")
    rect(draw, (8, 37, 24, 39), "outline")
    if mode == "approval":
        rect(draw, (11, 16, 21, 21), "gold")
        rect(draw, (15, 18, 17, 20), "ruby")


def build_sheet(role: RoleArt) -> Image.Image:
    frames = [
        draw_character_frame(role, "down"),
        draw_character_frame(role, "up"),
        draw_character_frame(role, "left"),
        draw_character_frame(role, "right"),
        draw_character_frame(role, "down", step=1),
        draw_character_frame(role, "down", step=2),
        draw_character_frame(role, "up", step=1),
        draw_character_frame(role, "up", step=2),
        draw_character_frame(role, "left", step=1),
        draw_character_frame(role, "left", step=2),
        draw_character_frame(role, "right", step=1),
        draw_character_frame(role, "right", step=2),
        draw_character_frame(role, "down", mode="interact"),
        draw_character_frame(role, "down", mode="reading"),
        draw_character_frame(role, "down", mode="approval"),
        draw_character_frame(role, "down"),
    ]
    sheet = Image.new("RGBA", (FRAME_W * COLS, FRAME_H * ROWS), c("transparent"))
    for index, frame in enumerate(frames):
        x = (index % COLS) * FRAME_W
        y = (index // COLS) * FRAME_H
        sheet.alpha_composite(frame, (x, y))
    return sheet


def color_count(path: Path) -> int:
    image = Image.open(path).convert("RGBA")
    return len(image.getcolors(maxcolors=1_000_000) or [])


def generate_role(role: RoleArt) -> tuple[Path, int, int]:
    path = SPRITE_DIR / role.filename
    if not path.exists():
        raise FileNotFoundError(path)
    before = color_count(path)
    backup = BACKUP_ROOT / role.filename
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(path, backup)
    sheet = build_sheet(role)
    sheet.save(path, optimize=False)
    after = color_count(path)
    return path.relative_to(ROOT / "public/assets"), before, after


def write_report(rows: list[tuple[Path, int, int]]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# FRUS Character Sprite Sharpening",
        "",
        "Generated by `scripts/sharpen-frus-character-sprites.py`.",
        "",
        "Scope: the 32x48 native character sheets under `public/assets/art-pack/sprites/native/`.",
        "The pass preserves filenames, dimensions, 4x4 frame order, transparent backgrounds, and role identity.",
        "It replaces broken split-body frames with original FRUS-themed pixel art in one cohesive 16-bit style.",
        "No external or copyrighted artwork was imported.",
        "",
        "Backups are stored under `public/assets/_originals/art-pack/sprites/native/`.",
        "",
        "| Asset | Colors before | Colors after |",
        "| --- | ---: | ---: |",
    ]
    for path, before, after in rows:
        lines.append(f"| `{path}` | {before} | {after} |")
    lines.append("")
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    rows = [generate_role(role) for role in ROLES]
    # StateChat is an interface, not a person, but it uses the same sheet path.
    terminal = RoleArt(
        "sprite_statechat_terminal.png",
        hair="gray",
        hair_light="gray_light",
        jacket="gray",
        jacket_dark="gray_dark",
        pants="gray_dark",
        accent="cyan",
        prop="terminal",
        tie=False,
    )
    rows.append(generate_role(terminal))
    write_report(rows)
    for path, before, after in rows:
        print(f"{path}: {before} -> {after} colors; generated coherent 32x48 frame sheet")
    print(f"Report: {REPORT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
