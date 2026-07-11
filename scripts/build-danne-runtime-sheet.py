#!/usr/bin/env python3
"""Build the crisp 4x4 DANN-E gameplay sheet from the illustrated pose board."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/art-pack/sprites/sprite_dann_e.png"
OUTPUT = ROOT / "public/assets/art-pack/sprites/runtime/sprite_dann_e.png"

FRAME_WIDTH = 32
FRAME_HEIGHT = 48
SOURCE_COLUMNS = ((45, 330), (375, 650), (680, 975))
SOURCE_ROWS = ((75, 390), (395, 700), (700, 1025), (1025, 1325))

# The master is a 3x4 illustrated pose board, not a runtime grid. Reuse its
# front/back/side/action poses to author the game's 4x4 directional layout.
FRAME_MAP = (
    ((0, 0, False), (1, 0, False), (0, 0, False), (1, 0, False)),
    ((0, 1, False), (1, 1, False), (0, 1, False), (1, 1, False)),
    ((2, 0, False), (0, 2, True), (2, 0, False), (1, 2, True)),
    ((3, 0, False), (3, 1, False), (3, 1, False), (3, 2, False)),
)

STEEL_RAMP = (
    (15, 15, 15),
    (35, 40, 48),
    (64, 72, 82),
    (112, 112, 112),
    (176, 176, 168),
    (248, 240, 216),
)
DEEP_RED = (184, 32, 48)
BRIGHT_RED = (232, 48, 48)


def quantize_robot(frame: Image.Image) -> Image.Image:
    pixels = frame.load()
    for y in range(frame.height):
        for x in range(frame.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha < 128:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            if red > max(65, green * 1.45, blue * 1.35):
                accent = BRIGHT_RED if red > 150 else DEEP_RED
                pixels[x, y] = (*accent, 255)
                continue
            luminance = (red * 3 + green * 6 + blue) // 10
            ramp_index = (
                0 if luminance < 34 else
                1 if luminance < 65 else
                2 if luminance < 110 else
                3 if luminance < 165 else
                4 if luminance < 215 else
                5
            )
            pixels[x, y] = (*STEEL_RAMP[ramp_index], 255)
    return frame


def extract_pose(source: Image.Image, row: int, column: int, flip: bool) -> Image.Image:
    left, right = SOURCE_COLUMNS[column]
    top, bottom = SOURCE_ROWS[row]
    pose = source.crop((left, top, right, bottom))
    alpha = pose.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError(f"DANN-E source pose {row},{column} is empty")
    pose = pose.crop(bounds)
    alpha = alpha.crop(bounds)
    pose.putalpha(alpha)
    if flip:
        pose = pose.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    scale = min(30 / pose.width, 43 / pose.height)
    size = (max(1, round(pose.width * scale)), max(1, round(pose.height * scale)))
    return quantize_robot(pose.resize(size, Image.Resampling.NEAREST))


def build_sheet() -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    if source.size != (1024, 1536):
        raise RuntimeError(f"Unexpected DANN-E master size: {source.size}")
    sheet = Image.new("RGBA", (FRAME_WIDTH * 4, FRAME_HEIGHT * 4), (0, 0, 0, 0))
    for target_row, row in enumerate(FRAME_MAP):
        for target_column, source_pose in enumerate(row):
            pose = extract_pose(source, *source_pose)
            x = target_column * FRAME_WIDTH + (FRAME_WIDTH - pose.width) // 2
            y = target_row * FRAME_HEIGHT + FRAME_HEIGHT - 1 - pose.height
            sheet.alpha_composite(pose, (x, y))
    return sheet


def main() -> None:
    sheet = build_sheet()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT, optimize=True)
    alpha_values = set(sheet.getchannel("A").tobytes())
    if alpha_values - {0, 255}:
        raise RuntimeError(f"Runtime sheet has partial alpha values: {sorted(alpha_values)}")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    main()
