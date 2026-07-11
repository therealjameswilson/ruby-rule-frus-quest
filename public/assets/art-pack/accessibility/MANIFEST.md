# Colorblind-Accessible UI Overlays

Small 16-bit pixel-art overlay/icon assets that make game state readable
**without relying on color**. Each overlay adds a distinct **shape or pattern**
(stripe, dot, hatch, check, cross, ring, padlock, star, diamond, arrow,
crosshair, exclamation) so players with any form of color vision deficiency
(protanopia, deuteranopia, tritanopia, monochromacy) can distinguish states
that the base art currently signals with hue alone.

## Design rules (all files)

- **Format:** PNG, RGBA, true alpha. Transparent background (alpha = 0) except
  where drawn. No partial alpha — every pixel is either fully opaque or fully
  transparent, so there are no anti-aliasing/smoothing artifacts.
- **Hard pixels only**, authored at native UI scale (nearest-neighbour upscale
  for display; never smooth-scale).
- **Palette-consistent** with `src/art/palette.ts`: transparent, `NES_BLACK`
  (`#0F0F0F`) outline, plus one high-luminance fill from the game palette
  (`NES_WHITE_HIGHLIGHT #F8F0D8`, `NES_GOLD #D6A23A`, `NES_OPENNET_GREEN
  #4CFF6B`, `NES_CLASSNET_RED #FF3B3B`). Every glyph carries a 1px black
  outline so it reads on **any** background color (light or dark) — contrast,
  not hue, does the work.
- **State = shape.** Color is retained only as a redundant/thematic accent; the
  shape or pattern alone fully disambiguates the state.

## Color-only cues these overlays address

| Base cue (color-only) | Where | Overlay(s) |
|---|---|---|
| Filled vs empty verification/HP/reliability cell (red vs slate) | `UIScene.ts` heart/meter cells (`classNetRed` vs `stoneDark`) | `hp_cell_full`, `hp_cell_empty` |
| Confidence / Clarity meter tier (gold / cyan / red / slate) | `UIScene.ts` meter fill tiers | `meter_tier_high`, `meter_tier_mid`, `meter_tier_low` |
| Inventory / tool slot: equipped vs acquired vs locked (gold / ruby / gray) | `ReliabilityHud` + `UIScene.ts` slots | `slot_equipped`, `slot_acquired`, `slot_locked` |
| Process-stamp earned vs pending (cream vs black) | `UIScene.ts` stamp badges | `stamp_earned_check`, `stamp_pending_ring` |
| Dungeon key held vs missing (gold vs gray) | `UIScene.ts` key indicator | `key_held` |
| Map room status: current / cleared / locked (color-coded fill) | `UIScene.ts` minimap | `room_current_arrow`, `room_cleared_check`, `room_locked_x`, `gate_unlocked` |
| DANN-E boss healthbar critical + phase gems (red glow / lit gems) | `danne-pack/ui/18_ui_boss_healthbar.png` | `boss_hp_critical_excl`, `boss_phase_active`, `boss_phase_spent` |
| Network routing OpenNet vs ClassNet (green vs red) | `NetworkScene.ts` route status | `net_opennet_open`, `net_classnet_cross` |
| Enemy weakness indicator (color highlight) | enemy/blocker weaknesses | `weakness_target` |

## File index

Legend: **Dim** = pixel dimensions · **State/use** = intended UI state ·
**Shape meaning** = how the pattern/shape encodes the state · **Placement** =
suggested overlay position/animation.

### Meter & HP fill patterns (8×8, tileable)

| File | Dim | State / use | Shape meaning | Placement / animation |
|---|---|---|---|---|
| `hp_cell_full.png` | 8×8 | Filled verification/HP/reliability cell | Dense forward diagonal stripes = present/full | Tile over each filled heart/meter cell |
| `hp_cell_empty.png` | 8×8 | Empty verification/HP/reliability cell | Hollow box + center dot = drained/empty | Tile over each empty cell |
| `meter_tier_high.png` | 8×8 | High confidence/clarity segment | Solid vertical bars (dense) = high | Tile over the gold high-tier meter fill |
| `meter_tier_mid.png` | 8×8 | Mid confidence/clarity segment | Diagonal cross-hatch (medium) = mid | Tile over the cyan mid-tier meter fill |
| `meter_tier_low.png` | 8×8 | Low confidence/clarity segment | Sparse dots (light) = low | Tile over the red/slate low-tier fill |

### Status glyphs (8×8)

| File | Dim | State / use | Shape meaning | Placement / animation |
|---|---|---|---|---|
| `key_held.png` | 8×8 | Dungeon key currently held | Filled gold key silhouette = have key | Overlay the key indicator; hide when unheld |
| `room_current_arrow.png` | 8×8 | Current/active room on minimap | Right-pointing chevron = "you are here" | Center on current room cell; may blink ~2 Hz |
| `room_cleared_check.png` | 8×8 | Cleared / visited room | Check mark = done/visited | Corner of cleared room cells |
| `room_locked_x.png` | 8×8 | Locked / inaccessible room | X = blocked | Center of locked room cells |
| `boss_phase_active.png` | 8×8 | Boss phase gem — still active | Filled diamond = phase remaining | Over each lit phase-indicator gem slot |
| `boss_phase_spent.png` | 8×8 | Boss phase gem — spent | Hollow diamond = phase cleared | Over each dimmed phase-indicator gem slot |
| `net_opennet_open.png` | 8×8 | OpenNet routing selected | Hollow ring "O" (open) = OpenNet | Route status chip / OpenNet nodes |
| `net_classnet_cross.png` | 8×8 | ClassNet routing selected | Bold plus/cross = classified/restricted | Route status chip / ClassNet nodes |

### Icon & slot overlays (16×16)

| File | Dim | State / use | Shape meaning | Placement / animation |
|---|---|---|---|---|
| `slot_equipped.png` | 16×16 | Inventory item equipped | Gold five-point star = equipped | Full-slot badge over the equipped item icon |
| `slot_acquired.png` | 16×16 | Inventory item acquired (not equipped) | Filled dot, bottom-right = owned | Bottom-right corner badge on the item icon |
| `slot_locked.png` | 16×16 | Item/gate locked or not yet owned | Closed padlock = locked | Center over locked slot or gate |
| `gate_unlocked.png` | 16×16 | Gate/room unlocked & passable | Open padlock (shackle up) = unlocked | Center over a newly opened gate/door |
| `stamp_earned_check.png` | 16×16 | Process stamp earned | Bold check = earned | Overlay the earned process-stamp badge |
| `stamp_pending_ring.png` | 16×16 | Process stamp not yet earned | Hollow ring = pending/empty slot | Overlay the empty process-stamp badge |
| `boss_hp_critical_excl.png` | 16×16 | Boss/HP critical state | Exclamation in triangle = danger/critical | Over boss healthbar when critical; may flash ~4 Hz |
| `weakness_target.png` | 16×16 | Enemy weakness / hit-here indicator | Crosshair/target ring = weak point | Over the enemy/blocker weak spot; may pulse |

## Integration notes (Phaser)

- Load as individual textures (`this.load.image(key, path)`) and add as overlay
  `Image`/`Sprite` objects on top of the existing colored HUD element at a
  higher depth, or bake into an atlas.
- 8×8 fill patterns are seamless and can be tiled across a meter's filled width;
  swap the pattern texture (not just the color) as the tier/level changes.
- Keep nearest-neighbour scaling (`setScale` with the game's integer zoom) to
  preserve hard pixel edges; do not enable texture smoothing.
- Overlays are additive: they do not replace existing art, so color can remain
  as a redundant cue for players who rely on it.
