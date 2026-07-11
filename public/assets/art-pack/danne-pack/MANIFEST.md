# DANN-E Warning & Expansion Art Pack

Twenty-one new 16-bit SNES-style art assets for **Ruby Rule: The FRUS Quest** — anchored by a DANN-E warning screen shown at game start, plus a wide expansion across maps, NPC portraits, enemy/ally sprite sheets, items, UI, and VFX. All assets match the established painterly-pixel-art aesthetic of the existing `ruby_rule_art_pack` (Zelda: A Link to the Past, parchment border, brass cartouche).

## Pack layout

```
public/assets/art-pack/danne-pack/
├── screens/   — Title-card / boot-screen art (warning)
├── maps/      — Full-room area maps for new zones
├── portraits/ — Oval-frame NPC dialogue portraits
├── sprites/   — 4-direction sprite sheets (enemies + allies)
├── items/     — Inventory item cards
├── ui/        — HUD + window-chrome UI assets
└── vfx/       — Projectile / effect frame strips
```

## File index

### Screens (1)
| # | File | Use |
|---|------|-----|
| 01 | `screens/01_warning_screen_danne.png` | Game-start warning card. Shows DANN-E with red eye-slit glow and copy: "BEWARE DANN-E / DOCUMENT ANNIHILATING NEURAL NETWORK EXECUTABLE / HE STRIKES WITH EGO BOLTS AND BOASTS WITHOUT END / DESTROY HIM AND SAVE THE RECORD / PRESS A TO BEGIN". Display before the main title screen. |

### Maps (5)
| # | File | Setting | In-game role |
|---|------|---------|--------------|
| 02 | `maps/02_map_cherry_blossom_garden.png` | Diplomatic peace garden | Safe-zone hub. Koi pond, gazebo, US + Japanese flags. Sakura petals. Save point. |
| 03 | `maps/03_map_black_vault_lair.png` | DANN-E's final dungeon | Endgame boss arena. Obsidian floor with red lava cracks, central DANN-E core altar. |
| 04 | `maps/04_map_senate_hearing_chamber.png` | Senate Foreign Relations Committee | Story/dialogue room. Curved dais, witness table, senator NPCs. |
| 05 | `maps/05_map_nara_stacks.png` | National Archives II classified stacks | Side-quest dungeon. Compact shelving with SECRET / TOP SECRET / NOFORN boxes. Stealth section. |
| 06 | `maps/06_map_embassy_cable_room.png` | Cold War embassy communications room | Mid-game scene. Teletypes, bronze cipher machine, world clocks, Marine guard. |

### Portraits (4)
Oval-brass-framed NPC portraits sized for dialogue UI. All 1024×1024 (1:1).
| # | File | Character |
|---|------|-----------|
| 07 | `portraits/07_portrait_historian.png` | **The Historian** — bespectacled tweed-jacketed sage with FRUS volume. Main-questgiver. |
| 08 | `portraits/08_portrait_declass_coordinator.png` | **The Declassification Coordinator** — sharp blazer, manila folder stamped DECLASSIFIED, redaction marker. Side-quest hub. |
| 09 | `portraits/09_portrait_archivist.png` | **The Senior Archivist** — elderly Black woman with archival gloves and diplomatic ledger. NARA stacks NPC. |
| 10 | `portraits/10_portrait_senator.png` | **The Senator** — silver-haired statesman with rolled treaty. Politically neutral. |

### Sprites (4)
4×4-grid 4-direction sprite sheets + hero portrait.
| # | File | Type | Role |
|---|------|------|------|
| 11 | `sprites/11_sprite_redactor_drone.png` | Minor enemy | Small floating eye-creature shaped like a black redaction stamp. Attack: stamp black bars. |
| 12 | `sprites/12_sprite_censorship_wraith.png` | Mid-tier enemy | Tall ghost in shredded-redaction-bar shroud, paint-roller hands. Attack: sweep ink. |
| 13 | `sprites/13_sprite_junior_compiler.png` | Ally NPC | Cardigan-wearing young historian with FRUS clipboard and HSG coffee mug. |
| 14 | `sprites/14_sprite_marine_guard.png` | Ally NPC | Marine Security Guard in full dress blues. Salute animation. |

### Items (3)
| # | File | Item | Type |
|---|------|------|------|
| 15 | `items/15_item_ruby_pen.png` | **The Ruby Pen** | Legendary weapon. "The pen that writes history itself." Three-star tier. |
| 16 | `items/16_item_declass_key.png` | **Master Declass Key** | Key item. Brass skeleton key with State Dept seal. "Opens all classified vaults." Executive Order 13526 inscription. |
| 17 | `items/17_item_treaty_fragments.png` | **Treaty Fragments** (I, II, III of III) | Three-piece collectible set. "Reunite to restore the record." Triforce-style display. |

### UI (3)
| # | File | Element |
|---|------|---------|
| 18 | `ui/18_ui_boss_healthbar.png` | **DANN-E boss healthbar frame** — three variants on one sheet: 75%-fill, empty, critical (red glow). Includes DANN-E dome icon at left, three phase-indicator gem slots, ego-bolt motif end caps. |
| 20 | `ui/20_ui_scroll_corners.png` | **Quest scroll corner ornaments** — 4 corner pieces + tileable horizontal/vertical edge strips. Navy/brass/ruby filigree with quill, scroll, seal motifs. |
| 21 | `ui/21_ui_letterbox_bars.png` | **Cutscene letterbox bars** — top and bottom 16:9 cropping bars with gold filigree, State Dept eagle seals, quill-and-scroll devices, brass rivets. |

### VFX (1)
| # | File | Effect |
|---|------|--------|
| 19 | `vfx/19_vfx_ego_bolt_strip.png` | **Ego Bolt projectile frames** — 4-frame animation strip × 2 rotations. Red rubber-stamp-shaped energy projectile (canonical "I" sigil for ego). Spawn → mid-flight → peak → impact (with shredded paper). |

## DANN-E lore (canonical)
- **Acronym:** Document Annihilating Neural Network Executable
- **Visual:** Steel-armored robotic figure, dome head, glowing red eye-slits, red glowing chest core, chunky armored limbs
- **Attacks:** Ego bolts (red rubber-stamp shaped energy projectiles)
- **Behavior:** Boasts endlessly
- **Role:** Final boss

## Integration notes
1. **Warning screen** — Display before the existing title screen with a 3-second hold + "PRESS A TO BEGIN" prompt to skip.
2. **Maps** — Load as backgrounds in their own scenes; route the player via doorways from existing maps.
3. **Portraits** — Wire into the dialogue system as portrait slots keyed by NPC ID.
4. **Sprite sheets** — Slice at 4 cols × 4 rows for 4-direction movement (down/up/left + attack-or-idle).
5. **Items** — Use card art for the inventory grid; generate small 16×16 thumbnails by scaling down.
6. **UI** — Boss healthbar shown only during the DANN-E fight. Scroll corners can wrap any text dialog. Letterbox bars overlay during cutscenes only.
7. **VFX** — Ego Bolt strip is sliced as 4 frames × 2 rows; play at 10 fps for a snappy projectile feel.

## Politically neutral
DANN-E is a fictional rogue AI antagonist. The Senator and government settings are non-partisan; the American flag and State Department iconography reflect the game's diplomatic-history setting, not any political position.
