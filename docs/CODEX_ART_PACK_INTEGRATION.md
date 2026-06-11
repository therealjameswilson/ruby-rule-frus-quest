# Codex Integration Guide — Ruby Rule Art Pack

This is a single, self-contained brief for Codex to wire the original 16-bit art pack into the `ruby-rule-frus-quest` Phaser game. Work through Part A (sprites/screens/portraits/backgrounds) then Part B (tilemaps). All art lives at `public/assets/art-pack/` with a machine-readable `public/assets/art-pack/manifest.json` that is the source of truth for every path, size, grid, frame size, and frame order.

## Global ground rules
- Read `public/assets/art-pack/manifest.json` FIRST and on every run. Never hardcode numbers that contradict it.
- Ensure `pixelArt: true` is set in the Phaser.Game config (src/main.ts or wherever the config lives). Add it if missing.
- KEEP the existing SVG/rectangle fallback system intact. PNG art AUGMENTS it. Everywhere you swap art, guard with `this.textures.exists(key)` and fall back to the current SVG/rect texture. The game must still run if `public/assets/art-pack/` is deleted. Never remove `createTextures()` fallbacks.
- Use texture keys prefixed `pack-` to avoid colliding with existing SVG keys.
- Keep the 256x240 logical canvas and the crisp pixel look. The `tilesets/concept/` sheets are REFERENCE ONLY — never load them as tilemap tilesets.

---

## PART A — Sprites, screens, portraits, backgrounds

### Sprite-sheet facts
All character/villain/terminal sprite sheets are 32x upscales: each sheet is 1024x1536, 4 columns x 4 rows, cell = 256x384, representing a NATIVE 32x48 frame. Load with `this.load.spritesheet(key, path, { frameWidth: 256, frameHeight: 384 })`, then DISPLAY scaled down to 32x48 (scale = 1/8). The 4th row uses only the first 3 cells -> 15 used frames (indices 0..14); ignore frame index 15.

Per-sheet frame order is in manifest `sheets[key].frameOrder`:
- Humanoid: idle-down, idle-up, idle-left, idle-right, walk-down-0, walk-down-1, walk-up-0, walk-up-1, walk-left-0, walk-left-1, walk-right-0, walk-right-1, interact, read, victory.
- DANN-E: same first 12 then menace, attack, defeated.
- StateChat terminal: idle-0..3, blink-0..3, stream-0..3, off, query, success.

### A1 — New atlas module `src/game/artPack.ts`
Export typed helpers built from the manifest: `ART_PACK_BASE = "assets/art-pack"`; `HUMANOID_FRAME` = { sourceW:256, sourceH:384, nativeW:32, nativeH:48, columns:4, usedFrames:15 }; `ART_PACK_SHEETS` map (logical key -> { textureKey, path, frameOrder }) for every manifest.sheets entry; `ART_PACK_IMAGES` map for every manifest.images entry; `ART_PACK_TILESETS` map for every manifest.tilesets entry; and `frameIndex(sheetKey, frameName)` returning the integer index from frameOrder.

### A2 — Load PNGs in BootScene
In `src/scenes/BootScene.ts` `preload()`: add `this.load.json("artPackManifest", "assets/art-pack/manifest.json")`; for every sheet `this.load.spritesheet("pack-"+key, path, { frameWidth:256, frameHeight:384 })`; for every image `this.load.image("pack-"+key, path)`. KEEP all existing `preloadSvgAssets()` loads.
In `create()` after load, register Phaser anims from frameOrder for each humanoid/villain sheet: walk-down/up/left/right loops (two frames each), single-frame idle-* facings, one-shot interact/read/victory. For DANN-E add one-shot menace/attack/defeated. Name anims `<textureKey>-<state>`. For the StateChat terminal: idle loop (idle-0..3), blink, stream loops, single-frame off/query/success.

### A3 — Map sprites to existing entities
- PROCESS_ROLES (src/game/constants.ts) ids: proofreader, compiler, editor, declass_reviewer, source_note_specialist; each has `snesSpriteKey`. Map closest pack sheet: compiler->pack-sprite_compiler, editor->pack-sprite_editor, declass_reviewer->pack-sprite_declassification_coordinator, source_note_specialist->pack-sprite_records_officer, proofreader->pack-sprite_archivist. Add an optional `packSheetKey` to each role OR keep a map in artPack.ts (choose lower churn).
- Remaining humanoid sheets (sprite_general_editor, sprite_reviewer, sprite_senior_reviewer, sprite_security_officer) are NPCs; wire any that map to existing entries in SNES_NPC_ASSETS / SNES_PRODUCTION_COLLEAGUE_ASSETS, otherwise leave registered for future use.
- DANN-E villain: the game already has a bureaucratic-wall enemy `type:"DANN-E QUEUE"`, key `snes-wall-danne-queue`, behavior `push` (SNES_BUREAUCRATIC_WALL_ASSETS in snesAtlas.ts; referenced in BureaucraticWall.ts, constants.ts, questArchitecture.ts, ArchiveScene.ts, EndingScene.ts, GuideScene.ts). Make THIS enemy render with `pack-sprite_dann_e` when the texture exists: idle = idle-down, while pushing/chasing play walk anims, trigger menace/attack one-shots on contact, defeated when cleared. Do NOT rename the key, change its `push` behavior, or alter quest wiring — swap the VISUAL only.

### A4 — Title + intro screens
In `src/scenes/TitleScene.ts`, draw `pack-title_screen` full-bleed scaled to the 256x240 canvas (use the 4x PNG and let NEAREST scaling handle it, or the native `title_screen_256x224` at 1:1). Keep all interactive title text/menu on top. Use `pack-intro_screen` for the opening beat if one exists.

### A5 — Boss portrait + backgrounds
- `pack-dann_e_boss_portrait` (1024x1024, transparent): show during DANN-E QUEUE encounter dialogue (EndingScene/GuideScene reference DANN-E). Render as a portrait panel beside the dialogue box, scaled to fit.
- Backgrounds: archive shelves in ArchiveScene, reading room in SilentReadScene, secure facility in NetworkScene/ReferralVaultScene, federal exterior on world/office hub, ruby buckram as tiling menu/border texture. Place behind gameplay layers (low depth).

---

## PART B — Real tilemaps from the packed tilesets

### Tileset facts (READ from manifest.json `tilesets`, never hardcode)
Each entry gives: `path` (8x display PNG), `nativePath` (exact 16px source), `columns`, `rows`, `imageWidth`, `imageHeight`, `displayCellPx` (128), `nativeTileSize` (16), `theme`, and a `note` describing the per-row tile layout.
- overworld: 8 columns x 8 rows, 1024x1024
- interiors: 8 columns x 8 rows, 1024x1024
- archive-dungeon: 7 columns x 7 rows, 896x896  (DIFFERENT grid — always read columns/rows per tileset)

Tile index = row * columns + col (0-based, left-to-right, top-to-bottom).

### B1 — Load
In BootScene preload, load each tileset DISPLAY png as an image, e.g. `this.load.image("pack-tiles-overworld", manifest.tilesets.tileset_overworld_16x16.path)`. Prefer the display PNG with tile size = `displayCellPx` (128) so art stays crisp under `pixelArt:true`. (Alternatively load `nativePath` with tile size 16 for true-native maps — pick ONE approach and use it consistently per map.)

### B2 — Register tilesets
For each map: `const ts = map.addTilesetImage(name, key, displayCellPx, displayCellPx, 0, 0)` — margin AND spacing are BOTH 0 (tiles are packed edge-to-edge). Tile dimensions/gutters must match the chosen PNG (128/0/0 for display, 16/0/0 for native).

### B3 — Build maps using the documented layout
Use each tileset's `note` to pick indices. Verify against manifest:
- OVERWORLD (8x8): row0 grass/dirt-edge/dirt-path/gravel/sand; row1 stone/brick/sidewalk/marble/wood; row2 water + shorelines/river/dock; row3 hedge/flowers/tree/fence-h/fence-v/lamp/signpost; rows4-7 seamless grass/dirt ground fills. Ground-fill tiles for base floor layer; row3 objects as above-player decoration layer.
- INTERIORS (8x8): row0 floors; row1 walls; row2 furniture (desk/chair/cabinet/bookshelf/box/lamp/CRT); row3 objects (safe/doors/map/board/lectern/elevator); rows4-7 floor fills. Floors base layer, walls collision layer, furniture/objects decoration.
- ARCHIVE-DUNGEON (7x7): row0 floors; row1 walls+doorway/arches; row2 pit/rubble/column/face/bookshelf/grate; row3 torch/brazier/iron-door/ruby-pedestal/button/chest; rows4-6 floor fills.

Apply to scenes: OfficeScene -> interiors; ArchiveScene + dungeon scenes -> archive-dungeon; overworld/hub -> overworld. Build with `make.tilemap({ data, tileWidth, tileHeight })` from a 2D index array you author, or convert existing scene layouts. Set collision on wall tiles via `layer.setCollisionByExclusion([...floorIndices])` or `setCollision([...wallIndices])`.

### B4 — Fallback + safety
Guard each tilemap build with `this.textures.exists("pack-tiles-...")`; if absent, fall back to the current SVG/rect tile rendering. Keep old tile textures and code path intact.

---

## Verification (run after BOTH parts)
- `npm run dev`: title screen shows new art; player role sprite animates with 32x48 frames at native scale (no blur, not 8x-too-large); DANN-E QUEUE renders with the robot sprite and menace/attack/defeated fire; each scene renders new tiles crisply at the 256x240 scale; walls collide, floors don't; objects layer correctly above/below player; the FRUS production win condition still works.
- `npm run build` must pass with no TS errors. Do not commit anything that breaks the build.
- Report: files changed, the texture-key naming scheme, the per-tileset index maps used, and any sheet whose frameOrder didn't cleanly map to an existing entity.
