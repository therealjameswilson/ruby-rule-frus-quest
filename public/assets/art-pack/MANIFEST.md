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
| `title_screen_16bit_sharp_256x240.png` | 256×240 | — | Live 16-bit title background (`TitleScene`, sharp native card) | No |
| `title_screen_frus_chest_256x240.png` | 256×240 | — | Refreshed title background (`TitleScene`): ruby buckram FRUS volume opening like a treasure chest, gold light burst, framed gold title plate | No |
| `ending_binding_ceremony_256x240.png` | 256×240 | — | True ending / binding-ceremony background (`EndingScene`): human publication table, glowing assembled FRUS volume, Office of the Historian staff celebrating | No |

> The `_1024x896.png` variants are identical to the primary `title_screen.png` /
> `intro_screen.png` files (crisp 4× nearest-neighbor upscales of the 256×224 masters).

### Refreshed native screen art (`title_screen_frus_chest_256x240.png`, `ending_binding_ceremony_256x240.png`)

Both are generated deterministically by `scripts/generate-screen-art.py` (Pillow),
so they can be re-rendered reproducibly. Drawn at exact 256×240 with hard edges and
**no anti-aliasing**; every pixel comes from the game palette (`src/art/palette.ts` /
`src/game/constants.ts` `PALETTE`). Registered in `src/assets/registry.ts` under
`SCREENS` as `title_screen_frus_chest_256x240` and `ending_binding_ceremony_256x240`.

- **Palette notes:** deep maroon/ruby buckram ground (`deepRuby`/`buckramRed`/`buckramHighlight`),
  gold-stamp accents (`goldStamp`/`paleGold`/`bronze`), cream paper (`creamPaper`),
  with `terminalCyan` / `openNetGreen` cues. Title uses 14 colors; ending uses 16.
- **Reserved safe/text areas:**
  - *Title* — top brass rail (y 0–12), framed gold title plate carrying
    `RUBY RULE:` / `THE FRUS QUEST` (y 20–64), `PRESS START TO VERIFY` line (~y 210),
    bottom marker band (y 224–236).
  - *Ending* — top gold banner `THE BINDING CEREMONY` (y 10–30) and bottom caption
    band (y 216–234); the central glowing volume + publication table occupy the
    mid-field, staff along the floor line.

## 2. Tilesets (16×16 grid)

### 2a. Gameplay-ready packed tilesets — USE THESE (`tilesets/gameplay/`)

True, gap-free, grid-aligned tilesets repacked onto an exact 16px grid. Each `*.png` is an 8× crisp (nearest-neighbor) upscale of the matching `*_native.png` (which is the exact 16px-per-tile source). Slice with `cellW = imageWidth / columns`, `cellH = imageHeight / rows`. See `manifest.json` → `tilesets` for full metadata.

| Filename | Dimensions | Grid | Native | Intended use | Transparency |
|---|---|---|---|---|---|
| `gameplay/tileset_overworld_16x16.png` | 1024×1024 | 8×8 (128px cells) | 128×128 | Overworld (v2): grass, dirt path/edge, gravel, sand, cobblestone, stone-brick, brick, sidewalk, marble step, wood plank, water + shorelines, river bends, dock, hedge, flowers, tree, fences, lamp post, signpost; rows 5-8 seamless grass/dirt fills | No |
| `gameplay/tileset_interiors_16x16.png` | 1024×1024 | 8×8 (128px cells) | 128×128 | Office/archive interiors (v2): tiling floors & walls (rows 1–2) + centered furniture/objects — desk, chair, filing cabinet, bookshelf, document box, banker lamp, CRT terminal, safe, doors (closed/open), world-map wall, bulletin board, lectern, elevator (rows 3–4); rows 5-8 seamless floor fills | No |
| `gameplay/tileset_archive_dungeon_16x16.png` | 896×896 | 7×7 (128px cells) | 112×112 | Archive-dungeon (v2, cleaner centered objects): stone floors/walls, doorway, arches, pit, rubble, column, carved face, bookshelf, iron grate, torch, brazier, iron door, ruby pedestal, red button panel, treasure chest; rows 5-7 seamless floor fills | No |
| `gameplay/tileset_miniboss_arena_16x16.png` | 1024×1024 | 8×8 (128px cells) | 128×128 | DANN-E miniboss arena — a federal office floor overtaken by a shutdown / stop-work antagonist. Row1 walls (corners/edges); Row2 office floor variants incl. cracked-tile floors; Row3 hazard floors (paper debris, red stain, rubble, diagonal crack, antagonist red-glow seam, warning chevrons, scorch, floor grate); Row4 paper stacks (small/med/toppling/scattered), file box + overturned box, STOP-WORK octagon sign, striped barricade; Row5 overhead light fixtures ON/FLICKER/OFF/broken-spark + ceiling/stain/hanging-wire/broken-vent; Row6 caution-tape border set (4 edges + 4 corners); Row7 locked vault door 2×2 CLOSED (48/49/56/57) and OPEN-on-clear (50/51/58/59) states, single-tile vault closed/open (60/61), shutdown terminal, STOP-WORK placard, caution-tape cross, rubble pile, dark filler. Floors/walls opaque; props/lights/tape/vault on transparent backgrounds so they overlay floor layers. Drop-in for Phaser tilemaps at the native 16px grid (or 128px on the display PNG); no rescaling. | Yes (props) |

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

The illustrated DANN-E master is a 3×4 pose board rather than a packed runtime
grid. Its gameplay-safe derivative lives at
`sprites/runtime/sprite_dann_e.png`: 128×192, 4×4 frames at 32×48, binary
transparency, and a nine-color steel/red palette. Regenerate it with
`scripts/build-danne-runtime-sheet.py`; keep the 1024×1536 master for portraits
and cutscene reference only.

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

## 10. Secrets (hidden reading-room bonus area)

Optional secret content reached via a hidden passage. See
`secrets/MANIFEST.md` for the full tile map, animation, and palette notes.

| Filename | Dimensions | Grid / layout | Intended use | Transparency |
|---|---|---|---|---|
| `secrets/tileset_reading_room_16x16_native.png` | 112×112 | 7×7 grid (16px tiles) | Hidden reading-room bonus-area tileset (native 1× source): stone floors/walls, disguised + revealed hidden-passage tiles, doorway/arch, bookshelves, reading table/chair/pedestal, globe, candle & green banker lamp (+ glow overlays), wall sconce, framed map, brass FRUS placard; rows 5-7 seamless fills | Yes |
| `secrets/tileset_reading_room_16x16.png` | 896×896 | 7×7 grid (128px cells) | 8× crisp nearest-neighbor upscale of the native reading-room tileset (display/master) | Yes |
| `secrets/collectible_first_edition_frus_32x32.png` | 128×32 | 4 frames × 32×32 (horizontal) | Rare collectible: gilded "first edition" FRUS volume, sparkle-animated (4 frames, ~8fps / ~500ms loop) — the optional secret reward | Yes |

## 11. HUD icon polish pack (`hud/`)

Original SNES-era HUD sprites authored pixel-by-pixel on an exact grid (hard
edges, no anti-aliasing, transparent background) via
`scripts/generate-hud-icon-pack.py`. Every icon ships as a 16×16 master plus a
crisp 2× nearest-neighbour 32×32 variant, and reuses the project's NES palette
(`src/art/palette.ts`) to match the `UIScene` quest-band visual language: ruby
buckram bodies, gold-stamped trim, cream paper, slate secure-facility blue,
terminal cyan. Palette-, dimension-, and alpha-verified (binary alpha, no AA).

### 9a. Meters & counters

| Filename | Dimensions | Intended use | Transparency |
|---|---|---|---|
| `reliability_meter_frame_16.png` / `_32.png` | 16×16 / 32×32 | Reliability/confidence meter frame: gold-riveted container with ruby fill track + heart emblem, framing the quest-band reliability hearts | Yes |
| `document_points_icon_16.png` / `_32.png` | 16×16 / 32×32 | Document-points counter icon: cream page with ruby ruled lines, folded gold corner, and gold points star badge | Yes |

### 9b. Process stamp icons (12×12 stamp on 16×16 tile)

Match the earned-process motifs used by the publication screen. Each is a ruby
(or paper/slate) stamp plate with a black notch shadow and an accent glyph.

| Filename | Dimensions | Intended use | Transparency |
|---|---|---|---|
| `process_stamp_rule_16.png` / `_32.png` | 16×16 / 32×32 | "Rule" process stamp — gold serif rule/paragraph mark on ruby | Yes |
| `process_stamp_source_16.png` / `_32.png` | 16×16 / 32×32 | "Source" process stamp — aged document with ruby lines + gold provenance seal | Yes |
| `process_stamp_network_16.png` / `_32.png` | 16×16 / 32×32 | "Network" process stamp — cyan node graph on slate | Yes |
| `process_stamp_referral_16.png` / `_32.png` | 16×16 / 32×32 | "Referral" process stamp — routing slip with ruby spine + gold forwarding arrow | Yes |
| `process_stamp_read_16.png` / `_32.png` | 16×16 / 32×32 | "Read" process stamp — gold eye over a cream page (Silent Read / proofreading) | Yes |

### 9c. Equipped-tool slot frames

| Filename | Dimensions | Intended use | Transparency |
|---|---|---|---|
| `tool_slot_frame_empty_16.png` / `_32.png` | 16×16 / 32×32 | Empty tool slot — stone-gray bevel, black interior, dim placeholder glyph | Yes |
| `tool_slot_frame_active_16.png` / `_32.png` | 16×16 / 32×32 | Equipped/selected tool slot — gold bevel, ruby interior, gold corner accents + tool glyph | Yes |

### 9d. Volume-assembly progress tracker (5-segment)

Five cover pieces assembled left→right into the final ruby buckram FRUS volume,
in order: **spine, front board, title plate, ribbon marker, seal/stamp**. The
tracker bar is 5 × 16px segments (80×16); `empty` shows unearned (stone/black)
segments, `full` shows all five earned. Individual 16×16 (+32×32) segment icons
are also provided for per-piece display.

| Filename | Dimensions | Grid | Intended use | Transparency |
|---|---|---|---|---|
| `volume_assembly_tracker_empty_80x16.png` / `_160x32.png` | 80×16 / 160×32 | 5×1 (16px cells) | Unearned progress tracker (all segments dim) | Yes |
| `volume_assembly_tracker_full_80x16.png` / `_160x32.png` | 80×16 / 160×32 | 5×1 (16px cells) | Complete progress tracker (all five cover pieces earned) | Yes |
| `volume_segment_spine_16.png` / `_32.png` | 16×16 / 32×32 | — | Segment 1: ruby spine with gold bands | Yes |
| `volume_segment_front_board_16.png` / `_32.png` | 16×16 / 32×32 | — | Segment 2: ruby buckram front board with gold emblem | Yes |
| `volume_segment_title_plate_16.png` / `_32.png` | 16×16 / 32×32 | — | Segment 3: gold title plate with engraved lines | Yes |
| `volume_segment_ribbon_marker_16.png` / `_32.png` | 16×16 / 32×32 | — | Segment 4: gold ribbon bookmark with notched tail | Yes |
| `volume_segment_seal_stamp_16.png` / `_32.png` | 16×16 / 32×32 | — | Segment 5: gold wax seal/stamp with ruby core + star emboss | Yes |

## 12. Accessibility overlays (`accessibility/`)

Colorblind-accessible overlay/icon assets that encode UI/HUD state with
**shape and pattern** instead of color alone (HP/verification cells, meter
tiers, inventory-slot state, process stamps, dungeon keys, map room status,
boss healthbar/phase, network routing, enemy weakness). All RGBA, transparent,
hard-pixel, palette-consistent. See `accessibility/MANIFEST.md` for the full
per-file index (21 overlays at 8×8 and 16×16).

---

## 13. New Game+ veteran editor cosmetic pack (`ng-plus/`)

Palette-swap cosmetic sprite sheets for the five production player roles, unlocked
as a **New Game+** reward. Ruby-buckram + gold/silver-trim recolors that preserve
the exact 32×48 / 4×4 frame layout, sheet dimensions, transparency, and animation
ordering of the base player sheets. See `ng-plus/MANIFEST.md` for per-role palette
notes and source→output mapping; regenerate with
`scripts/generate-ng-plus-veteran-pack.py`.

| Filename | Dimensions | Frame size | Source sheet | Intended use | Transparency |
|---|---|---|---|---|---|
| `ng-plus/native/sprite_proofreader_veteran.png` | 128×192 | 32×48 | `sprite_reviewer.png` | NG+ veteran Proofreader costume | Yes |
| `ng-plus/native/sprite_compiler_veteran.png` | 128×192 | 32×48 | `sprite_compiler.png` | NG+ veteran Compiler costume | Yes |
| `ng-plus/native/sprite_editor_veteran.png` | 128×192 | 32×48 | `sprite_editor.png` | NG+ veteran Editor costume | Yes |
| `ng-plus/native/sprite_declass_reviewer_veteran.png` | 128×192 | 32×48 | `sprite_declassification_coordinator.png` | NG+ veteran Declass Reviewer costume | Yes |
| `ng-plus/native/sprite_source_note_specialist_veteran.png` | 128×192 | 32×48 | `sprite_records_officer.png` | NG+ veteran Source Note Specialist costume | Yes |

> Each `ng-plus/native/*.png` also has a 1024×1536 display master at `ng-plus/*.png`
> (exact 8× nearest-neighbor upscale), matching the masters + `native/` convention.

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

---

## 14. Volume assembly sequence (`volume-assembly/`)

Binding-ceremony endgame art: five collectible cover pieces (each a 32×32 pickup
+ a 64×64 equipped/glow variant), a 6-frame 384×64 assembly animation sheet
(64×64 frames, ~8 fps), and a 128×128 completed-volume hero sprite. Native-size,
hard-edged, transparent, palette-locked to `src/art/palette.ts`. Generated by
`scripts/generate-volume-assembly.py`. See `volume-assembly/MANIFEST.md` for the
per-file table, frame breakdown, animation config, and Phaser asset keys.
## 15. Alternate ending — contested declassification (`alt-ending/`)

Native-resolution, hard-edged pixel art (no anti-aliasing) for the "contested
declassification" ending branch — publishing a FRUS volume with unresolved agency
equities, issued *under appeal*. Colors are drawn only from `src/art/palette.ts`.
Theme is politically neutral: generic interagency-review motifs only (no real
officials, seals, or borders). See `alt-ending/MANIFEST.md` for full metadata,
overlay placement, and palette mapping.

| Filename | Dimensions | Mode | Intended use | Transparency |
|---|---|---|---|---|
| `alt-ending/bg_interagency_review_room.png` | 256×240 | RGB | Tense interagency review-room ending background (drop-in for the 256×240 logical canvas filled by `EndingScene` / `BadEndingScene`) | No |
| `alt-ending/stamp_under_appeal.png` | 176×52 | RGBA | "UNDER APPEAL / EQUITIES UNRESOLVED" rubber-stamp overlay; composite over the contested volume or as a full-screen verdict banner | Yes |
| `alt-ending/volume_contested_redacted.png` | 80×120 | RGBA | Subdued, redaction-banded variant of the completed FRUS volume cover (same ruby-buckram language as `assets/sprites/frus-prize-cover.svg`) for publishing with unresolved equities | Yes |
