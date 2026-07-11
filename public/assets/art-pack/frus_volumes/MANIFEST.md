# FRUS Hardback Volumes Art Pack

Ruby-red buckram FRUS hardback volume art for **Ruby Rule: FRUS Quest** — collectible items, world objects, an interactive reading sprite, a boss-reward variant, and a corrupted DANN-E variant. All assets are style-locked to a reference photo of real FRUS spines (deep ruby buckram, ornate gold-foil stamping, embossed Great Seal of the United States).

## Assets (`public/assets/art-pack/frus_volumes/`)

| # | File | Type | Use |
|---|------|------|-----|
| 01 | `01_pickup_single_volume.png` | Item icon | Standard FRUS volume pickup — 1961-1963 Vol XII, three-quarter view with gold sparkle aura |
| 02 | `02_standing_volume_soviet_union.png` | World object | A single volume standing upright (spine out) for placement on shelves or as an interactive object — 1961-1963 Vol V, Soviet Union |
| 03 | `03_bookshelf_full.png` | Scene background | Full FRUS reference shelf with 18 volumes spanning 1958-1976 and varied region subtitles. Includes parchment border + brass plaque |
| 04 | `04_pickup_volume_stack.png` | Item icon | Stack of three volumes (Cuba, Vietnam, Arms Control) — a heftier collectible drop with gold sparkle aura |
| 05 | `05_open_volume_reading.png` | Interaction sprite | Open volume on a desk with brass lamp glow, "SECRET" stamp + redaction bars, red silk ribbon bookmark — used when the player reads a document |
| 06 | `06_inventory_row_six.png` | Inventory UI strip | Horizontal row of six spines (Soviet Union, Cuba, Vietnam, Arms Control, Western Europe, Afghanistan) — for inventory or hotbar layouts |
| 07 | `07_legendary_boss_reward.png` | Boss reward / cutscene | Glowing 1961-1963 Vol XI "Cuban Missile Crisis" with golden god-rays, halo, and starfield — Zelda Triforce-style reveal |
| 08 | `08_corrupted_volume_danne.png` | DANN-E lair item | Obsidian-black buckram + glowing red foil, corrupted Great Seal with red-eyed eagle + circuit shield, DANN-E sigil on the spine, violet smoke + red arc-lightning |

## Suggested Phaser asset keys

```ts
'item.frus_volume'           -> frus_volumes/01_pickup_single_volume.png
'world.frus_volume_standing' -> frus_volumes/02_standing_volume_soviet_union.png
'bg.frus_shelf'              -> frus_volumes/03_bookshelf_full.png
'item.frus_volume_stack'     -> frus_volumes/04_pickup_volume_stack.png
'interact.frus_volume_open'  -> frus_volumes/05_open_volume_reading.png
'ui.frus_inventory_row'      -> frus_volumes/06_inventory_row_six.png
'reward.frus_legendary'      -> frus_volumes/07_legendary_boss_reward.png
'item.frus_corrupted'        -> frus_volumes/08_corrupted_volume_danne.png
```

## Style anchors
- Reference: user-provided photo of real FRUS spines (deep ruby buckram, ornate gold-foil stamping, embossed Great Seal)
- Aesthetic: 16-bit SNES painterly pixel art, Zelda: A Link to the Past lineage, chunky tile scale, no 3D shading

## Provenance
Generated 2026-06-13 by Perplexity Computer for **Ruby Rule: FRUS Quest**. Style-locked to user-provided reference image.
