# DANN-E Combat & Pickup VFX

Original 16-bit SNES/ALttP-style pixel-art effect sheets for the DANN-E combat
loop: hit feedback, enemy defeat, item pickups, and the three player weapon
swing arcs. All frames are hand-edged pixel art — no anti-aliasing, hard edges
only (every pixel is fully transparent or fully opaque), transparent
background, limited palette, readable at native scale.

Generated deterministically by [`scripts/generate-vfx-sprites.py`](../../../../scripts/generate-vfx-sprites.py)
(`python3 scripts/generate-vfx-sprites.py`). Re-running reproduces byte-stable output.

## Palette

Matched to the existing sprite frames (`public/assets/sprites/*.svg`) and the
FRUS volume / weapon icons. Ruby-red buckram and brass are the anchors.

| Swatch | Hex | Role |
|--------|-----|------|
| ⬛ | `#0F0F0F` | Outline / shadow |
| 🟥 | `#5A0C18` | Deep ruby shadow |
| 🟥 | `#7A1020` | Ruby buckram (FRUS volume, weapon accents) |
| 🟥 | `#B02436` | Light ruby |
| 🟨 | `#966C1E` | Deep gold shadow |
| 🟨 | `#D6A23A` | Brass / gold (Citation Stamp body) |
| 🟨 | `#F2D27A` | Light gold |
| ⬜ | `#FFF4D6` | Cream spark highlight |
| 🟫 | `#B89A5A` | Manila (Review Folder) |
| 🟫 | `#8A703E` | Manila shadow |

## Layout

Each file is a single horizontal strip: frames laid left-to-right, one grid cell
per frame. Slice at the listed grid size to load as a Phaser spritesheet.

| # | File | Frames | Grid | Strip | Suggested fps | Effect |
|---|------|--------|------|-------|---------------|--------|
| 1 | `vfx_hit_spark_strip.png` | 4 | 16×16 | 64×16 | 16 | **Hit spark** — 8-point star burst. White core → gold arms → ruby tips → dissipating ring. Play once on melee/projectile contact. |
| 2 | `vfx_defeat_dissolve_strip.png` | 5 | 32×32 | 160×32 | 12 | **Defeat dissolve** — enemy silhouette cracks and pixel-scatters outward into gold sparks, then gone. Play once on enemy death. |
| 3 | `vfx_doc_point_sparkle_strip.png` | 3 | 8×8 | 24×8 | 10 | **Document-point sparkle** — small gold twinkle. Loop over collectible document points. |
| 4 | `vfx_frus_fragment_glow_strip.png` | 4 | 16×16 | 64×16 | 8 | **FRUS volume fragment glow/pickup** — ruby-red buckram volume (`#7A1020`) with gold spine and a pulsing gold halo + rising sparkle. Loop while idle, play once on pickup. |
| 5 | `vfx_citation_stamp_swing_strip.png` | 3 | 24×24 | 72×24 | 18 | **Citation Stamp swing arc** — gold crescent with ruby leading edge and gold tip, matching the Citation Stamp weapon icon (`citation-stamp.svg`). Pivots from the hand overhead → down-right, impact spark on frame 3. |
| 6 | `vfx_red_pencil_swing_strip.png` | 3 | 24×24 | 72×24 | 18 | **Red Pencil swing arc** — thin ruby slash with a gold tip streak, matching the Red Pencil weapon icon (`red-pencil.svg`). |
| 7 | `vfx_review_folder_swing_strip.png` | 3 | 24×24 | 72×24 | 16 | **Review Folder special-use arc** — manila fan/arc with ruby tab accents, matching the Review Folder weapon icon (`review-folder.svg`). |

## Verification

- Dimensions confirmed exact for every strip (see table).
- Every pixel has alpha 0 or 255 (no smoothing / anti-aliasing).
- Every pixel is drawn from the palette above (verified programmatically).
- Weapon arcs (5–7) carry a small pivot icon block in each weapon's own colors
  so the arc reads as coming from that item at native scale.
