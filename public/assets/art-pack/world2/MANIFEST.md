# World 2 — Overseas Post (Regional Overworld Map)

Second regional overworld map for **Ruby Rule: FRUS Quest**. Where the primary
DC-region board covers domestic archives and review, this board covers the
**overseas diplomatic post / embassy** subject area of the FRUS record — the
field side of foreign-relations documentation (cables, pouches, liaison, and
post archives).

All artwork is original, code-generated pixel art. No Nintendo, Zelda, Link,
Hyrule, Triforce, or copyrighted assets were copied, traced, or referenced.
Content is deliberately professional and politically neutral: no real countries,
officials, or national flags — only generic diplomatic facility labels and
neutral pennants, consistent with the existing embassy-compound convention
(`gameplay_maps/07_embassy_compound.png`).

---

## Assets

| File | Dimensions | Native master | Intended use | Transparency |
|---|---|---|---|---|
| `01_overseas_post_region.png` | 1536×1024 | `01_overseas_post_region_native.png` (384×256) | Overworld region-select board — `region.overseas_post` | No |
| `01_overseas_post_region_native.png` | 384×256 | — | Exact pixel master (×4 nearest-neighbor source) | No |
| `generate_overseas_post.py` | — | — | Deterministic generator (re-runs the exact map) | — |

Dimensions match the existing overworld region maps
(`overworld_maps/01_cold_war_europe.png` … `05_africa_cold_war_front.png`,
all ≈1536×1024) and the same fixed-viewport, single-screen composition:
brass title cartouche, deckled parchment border, sea field with dashed routes,
numbered compound markers, compass rose, and a right-margin pennant strip.

## Composition / style notes

- **Style:** 16-bit SNES painterly-pixel tradition (A Link to the Past era),
  authored at native 384×256 and upscaled ×4 with **nearest-neighbor only** —
  hard pixel edges, **no anti-aliasing** (verified: every 4×4 block is uniform).
- **Palette:** limited, 34 colors total (sea blues, island greens/sand,
  parchment tans, brass, stone, secure-blue/green roofs, ink, cream).
- **Frame:** deckled tan parchment border with a brass title plaque reading
  `OVERSEAS POST`; compass rose bottom-left; bottom feature banner
  `DIPLOMATIC POUCH SEA-LANE`.
- **Right margin:** eight neutral diplomatic pennants (generic seals, no real
  national flags), mirroring the flag-margin motif of the existing boards.
- **Markers:** eight brass-badged number circles with tan name cartouches,
  connected by dashed sea "pouch routes."

## Numbered locations (districts)

| # | Marker label | Full name | In-engine district id | Routes to (gameplay map) |
|---|---|---|---|---|
| 1 | REGIONAL BUREAU | Regional Bureau | `regional_bureau` | `historian_office` |
| 2 | CHANCERY | Chancery | `chancery` | `embassy` |
| 3 | CONSULAR SECTION | Consular Section | `consular_section` | `embassy` |
| 4 | POUCH ROOM | Classified Pouch Room | `pouch_room` | `nara_stacks` |
| 5 | COMMS VAULT | Communications Vault | `comms_vault` | `black_vault` |
| 6 | MINISTRY LIAISON | Foreign Ministry Liaison Office | `ministry_liaison` | `foggy_bottom` |
| 7 | ARCHIVES ANNEX | Records & Archives Annex | `archives_annex` | `frus_floor` |
| 8 | MARINE POST | Marine Security Post | `marine_post` | `capitol_hill` |

District bounds and routing live in `src/data/regions.ts` (region key
`overseas_post`); the asset key `overseas_post` is registered in
`src/assets/registry.ts` → `OVERWORLD_REGIONS` and preloaded by `BootScene`.

## Reproducing

```bash
python3 public/assets/art-pack/world2/generate_overseas_post.py \
  public/assets/art-pack/world2/01_overseas_post_region.png
```

The generator is deterministic (fixed RNG seed) and re-emits both the 1536×1024
board and the 384×256 native master.

## Provenance

Generated 2026-07-06 for **Ruby Rule: FRUS Quest**. Original code-generated
pixel art (Python + Pillow), style-matched to the existing overworld region
boards.
