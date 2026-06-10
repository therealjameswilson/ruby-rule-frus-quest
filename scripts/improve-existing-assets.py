#!/usr/bin/env python3
"""Improve existing PNG assets in place without changing their design.

The script is intentionally conservative:
- originals are backed up once under public/assets/_originals/
- alpha is snapped to 0 or 255
- visible pixels are mapped to the fixed Ruby Rule palette
- optional pixel-clean downsample/upscale is only used when an integer
  nearest-neighbor pass appears safe
"""

from __future__ import annotations

import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover - only runs when Pillow is missing
    raise SystemExit(
        "Pillow is required. Install it with `python -m pip install Pillow`."
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = PROJECT_ROOT / "public" / "assets"
ORIGINALS_ROOT = ASSET_ROOT / "_originals"
REPORT_PATH = ASSET_ROOT / "asset_improvement_report.md"

PALETTE: tuple[tuple[int, int, int], ...] = (
    (0x0F, 0x0F, 0x0F),  # black outline
    (0x7A, 0x10, 0x20),  # deep ruby
    (0xB8, 0x20, 0x30),  # bright ruby
    (0x3A, 0x07, 0x10),  # dark maroon
    (0xE8, 0xD8, 0xA8),  # cream paper
    (0xB8, 0x9A, 0x5A),  # aged paper shadow
    (0xD6, 0xA2, 0x3A),  # gold
    (0x30, 0x48, 0x60),  # slate blue
    (0x68, 0xC0, 0xC0),  # terminal cyan
    (0x70, 0x70, 0x70),  # archive gray
    (0xF8, 0xF0, 0xD8),  # white highlight
)


@dataclass
class AssetReport:
    path: Path
    original_dimensions: tuple[int, int]
    final_dimensions: tuple[int, int]
    original_color_count: int
    final_color_count: int
    alpha_cleaned: bool
    palette_quantized: bool
    dimensions_preserved: bool
    pixel_cleaned: bool
    backup_created: bool
    warnings: list[str]


def iter_png_assets() -> Iterable[Path]:
    if not ASSET_ROOT.exists():
        return []
    return sorted(
        path
        for path in ASSET_ROOT.rglob("*.png")
        if ORIGINALS_ROOT not in path.parents
    )


def has_alpha_channel(image: Image.Image) -> bool:
    return image.mode in {"RGBA", "LA"} or "transparency" in image.info


def visible_color_count(image: Image.Image) -> int:
    rgba = image.convert("RGBA")
    return len({(r, g, b) for r, g, b, a in rgba.getdata() if a > 0})


def nearest_palette_color(r: int, g: int, b: int) -> tuple[int, int, int]:
    return min(
        PALETTE,
        key=lambda color: (
            (r - color[0]) * (r - color[0])
            + (g - color[1]) * (g - color[1])
            + (b - color[2]) * (b - color[2])
        ),
    )


def clean_alpha_and_palette(image: Image.Image) -> tuple[Image.Image, bool, bool]:
    rgba = image.convert("RGBA")
    cleaned_pixels: list[tuple[int, int, int, int]] = []
    alpha_cleaned = False
    palette_quantized = False

    for r, g, b, a in rgba.getdata():
        next_alpha = 0 if a < 128 else 255
        if next_alpha != a:
            alpha_cleaned = True

        if next_alpha == 0:
            cleaned_pixels.append((0, 0, 0, 0))
            continue

        nearest = nearest_palette_color(r, g, b)
        if nearest != (r, g, b):
            palette_quantized = True
        cleaned_pixels.append((*nearest, 255))

    cleaned = Image.new("RGBA", rgba.size)
    cleaned.putdata(cleaned_pixels)
    return cleaned, alpha_cleaned, palette_quantized or any(a >= 128 for *_, a in rgba.getdata())


def alpha_level_count(image: Image.Image) -> int:
    rgba = image.convert("RGBA")
    return len({a for *_, a in rgba.getdata()})


def looks_blurry_or_noisy(image: Image.Image, original_color_count: int) -> bool:
    pixels = image.width * image.height
    if pixels == 0:
        return False
    semi_alpha_pixels = sum(1 for *_, a in image.convert("RGBA").getdata() if 0 < a < 255)
    return (
        original_color_count > max(len(PALETTE) * 6, 64)
        or alpha_level_count(image) > 2
        or semi_alpha_pixels / pixels > 0.02
    )


def image_difference_ratio(a: Image.Image, b: Image.Image) -> float:
    a_rgba = a.convert("RGBA")
    b_rgba = b.convert("RGBA")
    if a_rgba.size != b_rgba.size:
        return 1.0
    total = a_rgba.width * a_rgba.height
    if total == 0:
        return 0.0
    changed = sum(1 for left, right in zip(a_rgba.getdata(), b_rgba.getdata()) if left != right)
    return changed / total


def safe_pixel_clean(image: Image.Image) -> tuple[Image.Image, bool, str | None]:
    width, height = image.size
    candidates: list[tuple[int, float, Image.Image]] = []
    for scale in (2, 3, 4, 5, 6, 8):
        if width % scale != 0 or height % scale != 0:
            continue
        down_size = (width // scale, height // scale)
        if down_size[0] < 8 or down_size[1] < 8:
            continue
        down = image.resize(down_size, Image.Resampling.NEAREST)
        up = down.resize((width, height), Image.Resampling.NEAREST)
        ratio = image_difference_ratio(image, up)
        candidates.append((scale, ratio, up))

    if not candidates:
        return image, False, "no safe integer pixel-art downsample size found"

    scale, ratio, cleaned = min(candidates, key=lambda item: item[1])
    if ratio <= 0.08:
        return cleaned, True, None

    return image, False, (
        f"manual pixel editing recommended; nearest safe scale {scale} changed "
        f"{ratio:.1%} of pixels"
    )


def backup_original(path: Path) -> bool:
    relative = path.relative_to(ASSET_ROOT)
    backup_path = ORIGINALS_ROOT / relative
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    if backup_path.exists():
        return False
    shutil.copy2(path, backup_path)
    return True


def save_png(image: Image.Image, path: Path, original_had_alpha: bool) -> None:
    if not original_had_alpha and all(a == 255 for *_, a in image.getdata()):
        image.convert("RGB").save(path)
        return
    image.save(path)


def improve_asset(path: Path) -> AssetReport:
    backup_created = backup_original(path)
    with Image.open(path) as source:
        source.load()
        original_had_alpha = has_alpha_channel(source)
        original_dimensions = source.size
        original_color_count = visible_color_count(source)
        needs_pixel_clean = looks_blurry_or_noisy(source, original_color_count)

        cleaned, alpha_cleaned, palette_quantized = clean_alpha_and_palette(source)
        warnings: list[str] = []
        pixel_cleaned = False

        if needs_pixel_clean:
            cleaned, pixel_cleaned, warning = safe_pixel_clean(cleaned)
            if warning:
                warnings.append(warning)

        final_dimensions = cleaned.size
        save_png(cleaned, path, original_had_alpha)

    final_color_count = visible_color_count(cleaned)
    if final_color_count > len(PALETTE):
        warnings.append("manual pixel editing recommended; final colors exceed project palette")

    return AssetReport(
        path=path,
        original_dimensions=original_dimensions,
        final_dimensions=final_dimensions,
        original_color_count=original_color_count,
        final_color_count=final_color_count,
        alpha_cleaned=alpha_cleaned,
        palette_quantized=palette_quantized,
        dimensions_preserved=original_dimensions == final_dimensions,
        pixel_cleaned=pixel_cleaned,
        backup_created=backup_created,
        warnings=warnings,
    )


def yes_no(value: bool) -> str:
    return "yes" if value else "no"


def write_report(reports: list[AssetReport]) -> None:
    lines = [
        "# PNG Asset Improvement Report",
        "",
        "Generated by `scripts/improve-existing-assets.py`.",
        "",
        "## Palette",
        "",
        "| Color | Purpose |",
        "|---|---|",
        "| `#0F0F0F` | black outline |",
        "| `#7A1020` | deep ruby |",
        "| `#B82030` | bright ruby |",
        "| `#3A0710` | dark maroon |",
        "| `#E8D8A8` | cream paper |",
        "| `#B89A5A` | aged paper shadow |",
        "| `#D6A23A` | gold |",
        "| `#304860` | slate blue |",
        "| `#68C0C0` | terminal cyan |",
        "| `#707070` | archive gray |",
        "| `#F8F0D8` | white highlight |",
        "",
        "## PNG Inventory",
        "",
        "| File path | Original dimensions | Final dimensions | Original color count | Final color count | Alpha cleaned | Palette quantization applied | Dimensions preserved | Warnings |",
        "|---|---:|---:|---:|---:|---|---|---|---|",
    ]

    if reports:
        for report in reports:
            relative = report.path.relative_to(PROJECT_ROOT)
            warnings = "; ".join(report.warnings) if report.warnings else ""
            if report.pixel_cleaned:
                warnings = (warnings + "; " if warnings else "") + "pixel-cleaned with nearest-neighbor integer scaling"
            if report.backup_created:
                warnings = (warnings + "; " if warnings else "") + "original backed up"
            else:
                warnings = (warnings + "; " if warnings else "") + "existing original backup preserved"
            lines.append(
                "| "
                f"`{relative}` | "
                f"{report.original_dimensions[0]}x{report.original_dimensions[1]} | "
                f"{report.final_dimensions[0]}x{report.final_dimensions[1]} | "
                f"{report.original_color_count} | "
                f"{report.final_color_count} | "
                f"{yes_no(report.alpha_cleaned)} | "
                f"{yes_no(report.palette_quantized)} | "
                f"{yes_no(report.dimensions_preserved)} | "
                f"{warnings} |"
            )
    else:
        lines.append("| _No PNG files found outside `public/assets/_originals/`._ | - | - | - | - | - | - | - | No PNG assets to process. |")

    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- PNG files under `public/assets/_originals/` are excluded from processing.",
            "- Original PNG backups are stored under `public/assets/_originals/` with the same relative path.",
            "- Alpha cleanup uses a hard threshold: alpha `< 128` becomes `0`; alpha `>= 128` becomes `255`.",
            "- Visible pixels are mapped to the nearest project-palette color.",
            "- No bilinear, bicubic, Lanczos, blur, sharpening, or antialiasing filters are used.",
            "- Dimensions are not resized by default; any pixel-cleaning pass restores the original dimensions with nearest-neighbor scaling.",
        ]
    )

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    if not ASSET_ROOT.exists():
        print(f"Asset folder not found: {ASSET_ROOT}", file=sys.stderr)
        return 1

    pngs = list(iter_png_assets())
    reports = [improve_asset(path) for path in pngs]
    write_report(reports)

    print(f"Processed {len(reports)} PNG asset(s).")
    print(f"Report written to {REPORT_PATH.relative_to(PROJECT_ROOT)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
