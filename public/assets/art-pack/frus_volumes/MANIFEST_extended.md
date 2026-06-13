# FRUS Hardback Volumes — Extended Pack

Eight additional ruby-red FRUS volume assets that extend the base pack (PR #11) with new era subseries, distressed variants, a microform supplemental drop, a multi-shelf library wall, a top-down world tile, and an open-volume reading variant with fold-out maps.

## Extended Assets (`public/assets/art-pack/frus_volumes/`)

| # | File | Type | Use |
|---|------|------|-----|
| 09 | `09_pickup_1977_1980_carter_era.png` | Item icon | Carter administration subseries — 1977-1980 Vol I "Foundations of Foreign Policy" |
| 10 | `10_pickup_1981_1988_reagan_era.png` | Item icon | Reagan administration subseries — 1981-1988 Vol III, "Soviet Union January 1981 - January 1983" |
| 11 | `11_pickup_damaged_volume.png` | Item icon | Water-damaged variant with peeling gold foil, stained buckram, wavy pages — downgraded pickup |
| 12 | `12_pickup_burnt_volume.png` | Item icon | Charred/burning variant with smoldering embers, half-melted Great Seal — quest item from destroyed archives |
| 13 | `13_pickup_microform_reels.png` | Item icon | NARA archival box with three 16mm microfilm reels + microfiche sleeve — supplemental research drop |
| 14 | `14_library_wall_full.png` | Scene background | Five-shelf FRUS Archive Wall with brass rolling library ladder; era-labeled brass plaques (1945-57 → 1969-76) |
| 15 | `15_world_volume_topdown.png` | World object | Closed volume viewed top-down (bird-eye) — overworld walkable pickup tile, Vol VIII Eastern Europe |
| 16 | `16_open_volume_with_maps.png` | Interaction sprite | Open volume showing Cuba missile-site map + Berlin sectors map as fold-out pages |

## Suggested Phaser asset keys

```ts
'item.frus_carter'         -> frus_volumes/09_pickup_1977_1980_carter_era.png
'item.frus_reagan'         -> frus_volumes/10_pickup_1981_1988_reagan_era.png
'item.frus_damaged'        -> frus_volumes/11_pickup_damaged_volume.png
'item.frus_burnt'          -> frus_volumes/12_pickup_burnt_volume.png
'item.frus_microform'      -> frus_volumes/13_pickup_microform_reels.png
'bg.frus_library_wall'     -> frus_volumes/14_library_wall_full.png
'world.frus_volume_top'    -> frus_volumes/15_world_volume_topdown.png
'interact.frus_open_maps'  -> frus_volumes/16_open_volume_with_maps.png
```

## Gameplay role notes

- **Carter / Reagan era variants** — extend volume drops past the Cold War middle years; unlock the matching era codex entries.
- **Damaged / Burnt** — reduced pickup yield; the burnt variant is a quest item from a destroyed-archive set piece.
- **Microform reels** — a single guaranteed drop after the NARA archivist NPC dialog; unlocks supplemental codex entries.
- **Library wall** — full era-browser background scene; clicking each era-labeled shelf row opens that era's codex.
- **Top-down world tile** — the canonical walkable pickup sprite for FRUS volumes lying on dungeon floors / overworld terrain.
- **Open volume with maps** — used when examining map-bearing volumes (Cuban Missile Crisis, Berlin Crisis, Suez, etc.).

## Style anchors
- Reference: user-provided photo of real FRUS spines (deep ruby buckram, ornate gold-foil stamping, embossed Great Seal)
- Aesthetic: 16-bit SNES painterly pixel art, Zelda: A Link to the Past lineage, chunky tile scale, no 3D shading

## Provenance
Generated 2026-06-13 by Perplexity Computer for **Ruby Rule: FRUS Quest**. Style-locked to user-provided reference image; consistent with the base FRUS volumes pack from PR #11.
