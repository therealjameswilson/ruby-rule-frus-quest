# FRUS Volume Assembly Sequence — Art Pack Manifest

Original 16-bit SNES-style pixel art for the **binding-ceremony** endgame loop of
*Ruby Rule: FRUS Quest*. The player collects five cover pieces, then watches them
combine into a single completed ruby FRUS volume for the finale.

All artwork is original and generated deterministically by
`scripts/generate-volume-assembly.py`. Every colour is drawn from the shared NES
master palette (`src/art/palette.ts`); art is hard-edged (no anti-aliasing), on a
fully transparent background, at exact native pixel sizes.

**Palette notes — ruby-red buckram set**
- Buckram cover: `#7A1020` (NES_BUCKRAM_RUBY), lit edge `#8F2030`, shade `#3A0710`/`#4A0712`
- Highlights: `#B82030` (NES_BRIGHT_RUBY), `#B42335`
- Gold-foil stamping: `#D6A23A` (NES_GOLD), `#D6A84F`, highlight `#F0D060`, shadow `#806020`
- Cream engraved plate / paper: `#E8D8A8`, `#F8F0D8`; engrave line `#B89A5A`
- Red silk ribbon: `#B82030` body, `#FF3B3B` sheen, `#3A0710` fold
- Shadow/outline: `#0F0F0F` (NES_BLACK)

---

## 1. Cover-piece sprites

Each of the five pieces ships as a **32×32 pickup icon** (world/inventory drop)
and a **64×64 equipped/glowing variant** (charged, with a gold aura) for the
HUD / cover-assembly UI. Same silhouette at both sizes; transparent background.

| File | Dimensions | Type | Intended use |
|---|---|---|---|
| `piece_spine_pickup_32.png` | 32×32 | Pickup icon | Spine piece — ruby spine with raised gold bands + title glyphs |
| `piece_spine_equipped_64.png` | 64×64 | Equipped/glow | Spine piece, charged (gold aura) |
| `piece_front-board_pickup_32.png` | 32×32 | Pickup icon | Front board — ruby cover face, double gold rule + buckram weave + corner flourishes |
| `piece_front-board_equipped_64.png` | 64×64 | Equipped/glow | Front board, charged |
| `piece_title-plate_pickup_32.png` | 32×32 | Pickup icon | Title plate — brass plaque with cream engraved field (FOREIGN RELATIONS rules) |
| `piece_title-plate_equipped_64.png` | 64×64 | Equipped/glow | Title plate, charged |
| `piece_ribbon-marker_pickup_32.png` | 32×32 | Pickup icon | Ribbon marker — red silk bookmark with swallowtail tail + gold pin |
| `piece_ribbon-marker_equipped_64.png` | 64×64 | Equipped/glow | Ribbon marker, charged |
| `piece_seal-stamp_pickup_32.png` | 32×32 | Pickup icon | Seal / stamp — gold-ringed ruby Great-Seal medallion with central star |
| `piece_seal-stamp_equipped_64.png` | 64×64 | Equipped/glow | Seal / stamp, charged |

## 2. Assembly animation sheet

| File | Dimensions | Frame size | Frames | Layout | Suggested speed | Intended use |
|---|---|---|---|---|---|---|
| `volume_assembly_sheet_64.png` | 384×64 | 64×64 | 6 | 6×1 horizontal strip (slice `frameWidth: 64, frameHeight: 64`) | **8 fps** (~125 ms/frame, ~750 ms total); play once, hold frame 6 | Binding-ceremony cutscene: five pieces converge and bind into one ruby volume |

Frame breakdown (left → right):
1. Five pieces scattered at the edges
2. Pieces drift toward centre
3. Front board + spine locked; plate, seal, ribbon closing in
4. Volume nearly bound (all pieces seated)
5. Binding flash (gold/cream wash)
6. Completed glowing ruby volume (gold sparkles)

Suggested Phaser config:
```ts
this.load.spritesheet('anim.frus_volume_assembly',
  'assets/art-pack/volume-assembly/volume_assembly_sheet_64.png',
  { frameWidth: 64, frameHeight: 64 });
this.anims.create({
  key: 'frus_volume_assembly',
  frames: this.anims.generateFrameNumbers('anim.frus_volume_assembly', { start: 0, end: 5 }),
  frameRate: 8,
  repeat: 0,
});
```

## 3. Completed-volume hero sprite

| File | Dimensions | Type | Intended use |
|---|---|---|---|
| `volume_complete_hero_128.png` | 128×128 | Hero sprite | Ending screen: finished ruby FRUS volume — gold double-border, brass title plate, Great-Seal medallion, red silk ribbon, gold spine bands, sparkle aura. Transparent background |

## Suggested Phaser asset keys

```ts
'piece.frus_spine'         -> volume-assembly/piece_spine_pickup_32.png
'piece.frus_spine_hi'      -> volume-assembly/piece_spine_equipped_64.png
'piece.frus_front_board'   -> volume-assembly/piece_front-board_pickup_32.png
'piece.frus_front_board_hi'-> volume-assembly/piece_front-board_equipped_64.png
'piece.frus_title_plate'   -> volume-assembly/piece_title-plate_pickup_32.png
'piece.frus_title_plate_hi'-> volume-assembly/piece_title-plate_equipped_64.png
'piece.frus_ribbon'        -> volume-assembly/piece_ribbon-marker_pickup_32.png
'piece.frus_ribbon_hi'     -> volume-assembly/piece_ribbon-marker_equipped_64.png
'piece.frus_seal'          -> volume-assembly/piece_seal-stamp_pickup_32.png
'piece.frus_seal_hi'       -> volume-assembly/piece_seal-stamp_equipped_64.png
'anim.frus_volume_assembly'-> volume-assembly/volume_assembly_sheet_64.png
'hero.frus_volume_complete'-> volume-assembly/volume_complete_hero_128.png
```

## Provenance

Generated 2026-07-06 for **Ruby Rule: FRUS Quest** via
`scripts/generate-volume-assembly.py` (deterministic, re-runnable). Original
pixel art; no copyrighted game assets were copied, traced, or referenced.
Palette-locked to `src/art/palette.ts`; verified for exact dimensions,
transparent corners, and strict palette membership.
