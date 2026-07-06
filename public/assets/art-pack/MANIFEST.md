# Ruby Rule: The FRUS Quest — 16-bit Art Pack Manifest

An original SNES-era pixel-art asset pack themed around U.S. diplomatic history,
archives, declassification, editorial review, and the production of FRUS volumes.
All artwork is original. No Nintendo, Zelda, Link, Hyrule, Triforce, swords, or
copyrighted game assets were copied, traced, or referenced.

**Visual identity:** ruby-red buckram covers, gold-stamped lettering, cream paper,
dark archival wood, federal stone, reading-room green lamps, blue-gray secure
facilities, black redaction bars, brass plaques, manila folders, document boxes.

---

## 1. Screens

| Filename | Dimensions | Frame size | Intended use | Transparency |
|---|---|---|---|---|
| `title_screen.png` | 1024×896 (native 256×224 ×4) | — | Game title screen (PRESS START TO VERIFY) | No |
| `title_screen_256x224.png` | 256×224 | — | Exact native-resolution title screen | No |
| `title_screen_hires.png` | 1448×1086 | — | High-res hero/marketing version | No |
| `intro_screen.png` | 1024×896 (native 256×224 ×4) | — | Story introduction / reading-room scene | No |
| `intro_screen_256x224.png` | 256×224 | — | Exact native-resolution intro screen | No |
| `intro_screen_hires.png` | 1448×1086 | — | High-res hero/marketing version | No |

> The `_1024x896.png` variants are identical to the primary `title_screen.png` /
> `intro_screen.png` files (crisp 4× nearest-neighbor upscales of the 256×224 masters).

## 2. Tilesets (16×16 grid)

### 2a. Gameplay-ready packed tilesets — USE THESE (`tilesets/gameplay/`)

True, gap-free, grid-aligned tilesets repacked onto an exact 16px grid. Each `*.png` is an 8× crisp (nearest-neighbor) upscale of the matching `*_native.png` (which is the exact 16px-per-tile source). Slice with `cellW = imageWidth / columns`, `cellH = imageHeight / rows`. See `manifest.json` → `tilesets` for full metadata.

| Filename | Dimensions | Grid | Native | Intended use | Transparency |
|---|---|---|---|---|---|
| `gameplay/tileset_overworld_16x16.png` | 1024×1024 | 8×8 (128px cells) | 128×128 | Overworld (v2): grass, dirt path/edge, gravel, sand, cobblestone, stone-brick, brick, sidewalk, marble step, wood plank, water + shorelines, river bends, dock, hedge, flowers, tree, fences, lamp post, signpost; rows 5-8 seamless grass/dirt fills | No |
| `gameplay/tileset_interiors_16x16.png` | 1024×1024 | 8×8 (128px cells) | 128×128 | Office/archive interiors (v2): tiling floors & walls (rows 1–2) + centered furniture/objects — desk, chair, filing cabinet, bookshelf, document box, banker lamp, CRT terminal, safe, doors (closed/open), world-map wall, bulletin board, lectern, elevator (rows 3–4); rows 5-8 seamless floor fills | No |
| `gameplay/tileset_archive_dungeon_16x16.png` | 896×896 | 7×7 (128px cells) | 112×112 | Archive-dungeon (v2, cleaner centered objects): stone floors/walls, doorway, arches, pit, rubble, column, carved face, bookshelf, iron grate, torch, brazier, iron door, ruby pedestal, red button panel, treasure chest; rows 5-7 seamless floor fills | No |

### 2b. Original concept sheets — REFERENCE ONLY (`tilesets/concept/`)

The first-pass AI concept art. Beautiful mood/reference, but tiles are irregular sizes with gaps and are **not** on a packable grid. Kept for reference; do not load as live tilemap tilesets.

| Filename | Dimensions | Intended use |
|---|---|---|
| `concept/tileset_overworld_concept.png` | 1536×1024 | Overworld concept reference (trees, buildings, lamps, signpost, plaques, etc.) |
| `concept/tileset_interiors_concept.png` | 1024×1024 | Interiors concept reference (desks, terminals, doors, map wall, lectern, etc.) |
| `concept/tileset_archive_dungeon_concept.png` | 1536×1024 | Archive-dungeon concept reference (vault doors, pedestals, switches, boss walls, etc.) |

## 3. Concept maps

| Filename | Dimensions | Intended use | Transparency |
|---|---|---|---|
| `world_map_concept.png` | 1536×1024 | Overworld reference/concept map — 8 regions (Navy Hill, White House, NARA I, NARA II, Little Rock, Springfield, Newington, Undisclosed Location) | No |
| `dungeon_nara_ii.png` | 1024×1536 | Dungeon concept — declassification maze, agency referrals, document stacks, security gates | No |
| `dungeon_undisclosed_location.png` | 1024×1536 | Dungeon concept — vault, classified corridors, redaction barriers, hidden rooms | No |
| `dungeon_white_house_review.png` | 1536×1024 | Dungeon concept — policy review chambers, briefing rooms, decision gates | No |
| `dungeon_navy_hill_editorial.png` | 1536×1024 | Dungeon concept — manuscript assembly, editorial desks, footnote puzzles, publication gate | No |

## 4. Character sprite sheets

All humanoid sheets share a consistent **32×48 frame size**, laid out 4 frames per row:
- Row 1: idle down, idle up, idle left, idle right
- Row 2: walk down 1, walk down 2, walk up 1, walk up 2
- Row 3: walk left 1, walk left 2, walk right 1, walk right 2
- Row 4: interact/use-tool, reading document, approval/victory

| Filename | Dimensions | Frame size | Intended use | Transparency |
|---|---|---|---|---|
| `sprite_compiler.png` | 1024×1536 | 32×48 | Compiler (tweed jacket, glasses, document binder) | Yes |
| `sprite_editor.png` | 1024×1536 | 32×48 | Editor (red pencil, marked-up manuscript) | Yes |
| `sprite_declassification_coordinator.png` | 1024×1536 | 32×48 | Declassification Coordinator (badge, stamp, secure folder) | Yes |
| `sprite_reviewer.png` | 1024×1536 | 32×48 | Reviewer (cardigan, clipboard, cautious) | Yes |
| `sprite_senior_reviewer.png` | 1024×1536 | 32×48 | Senior Reviewer (gray coat, approval stamp) | Yes |
| `sprite_general_editor.png` | 1024×1536 | 32×48 | General Editor (senior leader, ruby FRUS volume) | Yes |
| `sprite_archivist.png` | 1024×1536 | 32×48 | Archivist (cardigan, document cart, archival box) | Yes |
| `sprite_records_officer.png` | 1024×1536 | 32×48 | Records Officer (office attire, file tray) | Yes |
| `sprite_security_officer.png` | 1024×1536 | 32×48 | Security Officer (badge, access clipboard, non-militarized) | Yes |
| `sprite_statechat_terminal.png` | 1024×1536 | 32×48 | StateChat Terminal (stationary object, blinking screen; not humanoid — frames are idle/blink/data-stream/state animation states) | Yes |
| `sprite_dann_e.png` | 1024×1536 | 32×48 | DANN-E — robotic villain/boss (bully, menace). Chrome bald dome, red-glowing black rectangular visor, gray armor over dark chassis, glowing red chest core. Row 4 villain frames = menace pose, attack pose (red energy blast), defeated/short-circuit. | Yes |

### Runtime character sheets

For Phaser runtime loading, the ten non-boss character sheets above also have
native 1× derivatives under `sprites/native/` using the same filenames. These
runtime sheets are 128×192 images arranged as a 4×4 grid of 32×48 frames, and
are the paths used by `src/art/characters.ts` for `this.load.spritesheet(...)`.
The larger 1024×1536 sheets remain the display/master exports.

### Boss art

| Filename | Dimensions | Intended use | Transparency |
|---|---|---|---|
| `dann_e_boss_portrait.png` | 1024×1024 | DANN-E boss-intro / dialogue bust portrait | Yes |

## 5. Items & icons

| Filename | Dimensions | Icon size | Intended use | Transparency |
|---|---|---|---|---|
| `items_icons_16x16.png` | 1024×1536 | 16×16 | Inventory/HUD icons: finding aid, citation pen, document cart, redaction lens, declassification stamp, review memo, clearance badge, bound volume, source note, archival citation, routing slip, clearance authorization, document box, classified folder, ruby buckram emblem, question mark, exclamation mark, locked gate, open gate, approval seal, rejection mark, revision pencil, footnote token, chronology fragment | Yes |

## 6. UI & HUD

| Filename | Dimensions | Intended use | Transparency |
|---|---|---|---|
| `ui_hud_16bit.png` | 1536×1024 | UI components: ruby buckram HUD frame, gold trim, cream paper dialogue box, black archival dialogue box, menu cursor, verification meter heart, tool slot frame, mini-map frame, pause menu frame, inventory slot, quest log panel, region title card, PROPOSES badge, DECIDES badge, redaction-bar element (only PROPOSES/DECIDES carry baked text) | Yes |

## 7. Backgrounds

| Filename | Dimensions | Intended use | Transparency |
|---|---|---|---|
| `bg_archive_shelves.png` | 1774×887 | Archive-shelves backdrop (horizontally tileable) | No |
| `bg_reading_room.png` | 1536×1024 | Reading-room cutscene/menu backdrop | No |
| `bg_secure_facility.png` | 1536×1024 | Secure-facility cutscene/menu backdrop | No |
| `bg_federal_exterior.png` | 1536×1024 | Federal-building exterior establishing backdrop | No |
| `bg_ruby_buckram_pattern.png` | 1254×1254 | Seamless ruby buckram pattern for menus/cutscenes (tileable) | No |

## 8. Extras (portraits, items, effects, UI kit)

Added after the base pack. See `manifest.json` → `extras` for grid metadata. Grid sheets slice by simple division (`cellW = imageWidth / columns`); free-layout sheets are sliced by hand.

| Filename | Dimensions | Layout | Intended use | Transparency |
|---|---|---|---|---|
| `portraits/portraits_cast.png` | 1536×1024 | 3×2 grid | Dialogue-portrait busts for the 6 cast roles (senior editor, compiler, declassification reviewer, archivist, security officer, records officer); matches `dann_e_boss_portrait` style | Yes |
| `icons/items_collectibles.png` | 1024×1024 | ~6×4 grid | Collectible item icons: documents, envelope, wax seal, scroll, book, ruby, keys, locks, magnifier, pen, ink, film reels, floppy, badge, mug, phone, chest, redaction bar | Yes |
| `effects/effects_stamps.png` | 1024×1024 | 5×4 grid | Effects + emotes: sparkle, impact, dust, smoke, splash, !/? bubbles, anger, heal +, sleep Z, aura ring, explosion, speed lines, arrows, colored stamp frames, seal emblem, check | Yes |
| `effects/stamps_text.png` | 1536×1024 | 2×2 grid | Document stamp marks with correct text: CONFIDENTIAL, TOP SECRET, DECLASSIFIED, APPROVED — overlay for the declassification theme | Yes |
| `ui/ui_kit.png` | 1536×1024 | free layout | UI kit (ruby-red/gold parchment): dialogue/menu box frames (9-slice), cursor + continue arrows, progress meters, HP ruby gem, A/B/START buttons, scroll banner, heart/star/coin, corner flourishes | Yes |

## 9. DANN-E enemy variant sprite sheets (`enemies/danne/`)

Grid-aligned, exact-pixel enemy sheets (no anti-aliasing) following the same
hard-edge / limited-palette conventions as `tilesets/gameplay/tileset_overworld_16x16.png`.
They reuse the locked ruby-buckram / stone-archive palette (ruby `#7B0208`,
gold `#D6A23A`, cream `#F8F0D8`/`#E8D8A8`, steel/stone `#707070`/`#B0B0A8`,
chassis ink `#0F0F0F`, red core/eye `#B82030`/`#E83030`, manila `#D8B060`).

**Sheet layout (all variants):** 8 columns × 3 rows. 22 frames used; the last 2
cells (row 3, cols 7–8) are intentionally transparent.

**Frame order (row-major, index 0-based):**
- `0` idle A, `1` idle B (2-frame idle bob)
- `2–5` walk down ×4
- `6–9` walk up ×4
- `10–13` walk left ×4
- `14–17` walk right ×4
- `18` stun / hit-flash (single frame)
- `19–21` defeat / dissolve ×3

Slice with `cellW = imageWidth / 8`, `cellH = imageHeight / 3`.

| Filename | Dimensions | Grid (cell) | Frames | Frame duration | Motif / behavior | Transparency |
|---|---|---|---|---|---|---|
| `enemies/danne/01_danne_redactor.png` | 256×96 | 32×32 | 22 | idle 350ms · walk 160ms · stun 120ms · dissolve 130ms | Black-bar redaction motif — slow patrol enemy | Yes |
| `enemies/danne/02_danne_queue_blocker.png` | 256×96 | 32×32 | 22 | idle 400ms · walk 150ms · stun 120ms · dissolve 130ms | Stamped folder / inbox motif — tanky enemy | Yes |
| `enemies/danne/03_danne_30_year_wall.png` | 256×96 | 32×32 | 22 | idle 500ms · walk 200ms (turret aim) · stun 120ms · dissolve 140ms | Stone-and-clock motif — stationary turret (walk frames = 4-direction aim) | Yes |
| `enemies/danne/04_danne_classification_drone.png` | 256×96 | 32×32 | 22 | idle 200ms · walk 90ms · stun 100ms · dissolve 110ms | Red-stripe / eye motif — fast erratic flyer | Yes |
| `enemies/danne/05_danne_shutdown_miniboss.png` | 384×144 | 48×48 | 22 | idle 300ms · walk 140ms · stun 130ms · dissolve 160ms | Stop-work-sign motif — larger 48×48 miniboss | Yes |

> All five sheets verified: exact dimensions, on an exact pixel grid, RGBA with
> alpha 0 background, no anti-aliasing (≤16 distinct colors each, all within the
> locked palette above), and all 22 frame cells populated.

---

## Engine / integration notes (Phaser)

- Sprite sheets, tilesets, icons, and UI are exported with true alpha transparency
  (verified: transparent regions have alpha = 0), ready for `this.load.spritesheet`
  / `this.load.atlas` with `frameWidth: 32, frameHeight: 48` for humanoid characters
  (16×16 for tilesets and icons).
- Tiles are arranged on a clean 16×16-compatible grid; slice on 16-px boundaries.
- Title and intro screens are provided at native 256×224 plus crisp 4× upscales
  (1024×896) using nearest-neighbor scaling to preserve hard pixel edges.
- Concept maps and dungeon maps are reference/design art (not playable tilemaps);
  some include helpful room labels/legends. No HUD or dialogue UI is baked into
  the playable map backgrounds.
- Opaque scene art is RGB; all sprite/tile/icon/UI art is RGBA.
