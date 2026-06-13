# Overworld & Gameplay Maps Pack

This pack adds two complementary layers of world geography to **Ruby Rule: FRUS Quest**:

1. **Overworld Region Maps** — strategic district-overview boards (parchment-island style with brass cartouches + flag margin) used for fast travel and region selection.
2. **Gameplay World Maps** — closer playable tilemap scenes the player walks through (rooms, buildings, dungeons, compounds).

All assets are 16-bit SNES painterly pixel-art in the Zelda: A Link to the Past visual tradition, framed by parchment borders with ornate brass plaques.

---

## Overworld Region Maps (`public/assets/art-pack/overworld_maps/`)

Strategic district-overview boards. Each region presents 8 numbered districts on a parchment island with miniature country flags down the right margin and a tan deckled border.

| # | File | Region | Districts |
|---|------|--------|-----------|
| 01 | `01_cold_war_europe.png` | Cold War Europe | West Berlin, Paris, Bonn, London, Rome, Vienna, Geneva, Iron Curtain |
| 02 | `02_pacific_theater.png` | Pacific Theater | Tokyo, Seoul, Manila, Saigon, Beijing, Hong Kong, Honolulu, Guam |
| 03 | `03_middle_east_crossroads.png` | Middle East Crossroads | Cairo, Jerusalem, Beirut, Damascus, Baghdad, Tehran, Riyadh, Suez |
| 04 | `04_latin_america.png` | Latin America | Mexico City, Havana, Panama, Bogotá, Lima, Santiago, Buenos Aires, Rio de Janeiro |
| 05 | `05_africa_cold_war_front.png` | Africa — Cold War Front | Algiers, Kinshasa, Lagos, Addis Ababa, Nairobi, Luanda, Pretoria, Cape Town |

**Use in-engine:** load as `region.<key>` keys in the world-select scene; clicking a district transitions into a corresponding gameplay map or sub-scene.

---

## Gameplay World Maps (`public/assets/art-pack/gameplay_maps/`)

Walkable tilemap-style interiors and compounds. Each map shows a single building, dungeon, or block in top-down playable form, framed by the same parchment border for visual continuity.

| # | File | Scene | Notes |
|---|------|-------|-------|
| 01 | `01_office_of_the_historian.png` | Office of the Historian (HQ) | 5 rooms — Research Bullpen, Conference Room, Historian-in-Chief, Archive Room, Printer/Copier, Coffee Station |
| 02 | `02_nara_ii_stacks_dungeon.png` | NARA II — Stacks Level B2 | 4 vaults, central catalog desk, freight elevator, Red Zone declassification corner |
| 03 | `03_foggy_bottom_street.png` | Foggy Bottom — 23rd & C Streets NW | Truman Building entrance, motorcade, cherry blossoms, National Academy of Sciences |
| 04 | `04_white_house_west_wing.png` | White House — West Wing | Oval Office, Cabinet Room, Roosevelt Room, Situation Room, Press Briefing Room |
| 05 | `05_black_vault_lair.png` | Black Vault — DANN-E Sanctum | Final boss arena — glowing red obelisk core, arc-lightning emitters, blast doors |
| 06 | `06_frus_production_floor.png` | FRUS Production Floor | 5 rooms — Research, Compilation, Declass Review, Annotation, Publication |
| 07 | `07_embassy_compound.png` | U.S. Embassy Compound | Chancery, Consular Section, Ambassador's Residence, Motor Pool, Helipad, Chapel, Marine guards |
| 08 | `08_capitol_hill_hearing.png` | Capitol Hill — Senate Foreign Relations | Hearing chamber, Staff Office, Closed-Session vault room, Press Gallery |

**Use in-engine:** load as Phaser scene backgrounds; tilemap collision layers should be authored on top in Tiled, with doorway tiles wired to scene transitions and NPC spawn points placed at empty desks/seats.

---

## Style Anchors

- **Reference for overworld maps:** `_style_ref_overworld_v2.jpeg` (user-provided perfect-style overworld)
- **Reference for interior gameplay maps:** the earlier `dann_e_pack/05_map_nara_stacks.png` and `dann_e_pack/04_map_senate_hearing_chamber.png`
- **All assets:** painterly pixel-art, parchment border, brass plaque at top, NO modern UI, NO 3D shading, strictly SNES-scale tiles.

## Suggested Asset Keys

```ts
// Overworld
'region.europe'        -> overworld_maps/01_cold_war_europe.png
'region.pacific'       -> overworld_maps/02_pacific_theater.png
'region.middle_east'   -> overworld_maps/03_middle_east_crossroads.png
'region.latin_america' -> overworld_maps/04_latin_america.png
'region.africa'        -> overworld_maps/05_africa_cold_war_front.png

// Gameplay
'map.historian_office' -> gameplay_maps/01_office_of_the_historian.png
'map.nara_stacks'      -> gameplay_maps/02_nara_ii_stacks_dungeon.png
'map.foggy_bottom'     -> gameplay_maps/03_foggy_bottom_street.png
'map.west_wing'        -> gameplay_maps/04_white_house_west_wing.png
'map.black_vault'      -> gameplay_maps/05_black_vault_lair.png
'map.frus_floor'       -> gameplay_maps/06_frus_production_floor.png
'map.embassy'          -> gameplay_maps/07_embassy_compound.png
'map.capitol_hill'     -> gameplay_maps/08_capitol_hill_hearing.png
```

## Provenance

Generated 2026-06-12 by Perplexity Computer for **Ruby Rule: FRUS Quest**. Style-locked to user-provided reference images.
