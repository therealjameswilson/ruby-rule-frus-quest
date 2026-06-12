# Sprite Wiring Audit

Phase: `16bit-wire` Phase 0  
Branch: `feature/wire-16bit-sprites`  
Art pack manifest: `public/assets/art-pack/MANIFEST.md`

## Inventory

Command run:

```bash
git ls-files | grep -Ei 'sprite|character|npc' | sort
```

Tracked sprite/character/NPC-related files:

```text
experiments/duplicate-assets/public/assets/sprites/frus-volume 2.svg
experiments/duplicate-assets/public/assets/sprites/manuscript 2.svg
experiments/overworld-wip/tracked-files/src/scenes/CharacterCreateScene.ts
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/dann_e_boss_portrait.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_archivist.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_compiler.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_dann_e.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_declassification_coordinator.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_editor.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_general_editor.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_records_officer.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_reviewer.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_security_officer.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_senior_reviewer.png
experiments/overworld-wip/untracked-files/public/assets/art-pack/sprites/sprite_statechat_terminal.png
experiments/overworld-wip/untracked-files/public/assets/data/npcs.json
public/assets/_originals/sprites/archive-colleague.svg
public/assets/_originals/sprites/bureaucratic-wall.svg
public/assets/_originals/sprites/citation-stamp.svg
public/assets/_originals/sprites/elena.svg
public/assets/_originals/sprites/frus-prize-cover.svg
public/assets/_originals/sprites/frus-volume.svg
public/assets/_originals/sprites/manuscript.svg
public/assets/_originals/sprites/marcus.svg
public/assets/_originals/sprites/player-compiler.svg
public/assets/_originals/sprites/player-declass-reviewer.svg
public/assets/_originals/sprites/player-editor.svg
public/assets/_originals/sprites/player-proofreader.svg
public/assets/_originals/sprites/player-source-note-specialist.svg
public/assets/_originals/sprites/priya.svg
public/assets/_originals/sprites/sam.svg
public/assets/_originals/sprites/volume-fragment.svg
public/assets/art-pack/sprites/dann_e_boss_portrait.png
public/assets/art-pack/sprites/sprite_archivist.png
public/assets/art-pack/sprites/sprite_compiler.png
public/assets/art-pack/sprites/sprite_dann_e.png
public/assets/art-pack/sprites/sprite_declassification_coordinator.png
public/assets/art-pack/sprites/sprite_editor.png
public/assets/art-pack/sprites/sprite_general_editor.png
public/assets/art-pack/sprites/sprite_records_officer.png
public/assets/art-pack/sprites/sprite_reviewer.png
public/assets/art-pack/sprites/sprite_security_officer.png
public/assets/art-pack/sprites/sprite_senior_reviewer.png
public/assets/art-pack/sprites/sprite_statechat_terminal.png
public/assets/sprites/README.md
public/assets/sprites/agency-equity-seal.svg
public/assets/sprites/archive-colleague.svg
public/assets/sprites/buckram-key.svg
public/assets/sprites/bureaucratic-wall.svg
public/assets/sprites/citation-stamp.svg
public/assets/sprites/classnet-terminal.svg
public/assets/sprites/clearance-token.svg
public/assets/sprites/concurrence-slip.svg
public/assets/sprites/cross-reference.svg
public/assets/sprites/elena.svg
public/assets/sprites/excision-bracket-marker.svg
public/assets/sprites/frus-prize-cover.svg
public/assets/sprites/frus-volume.svg
public/assets/sprites/manuscript.svg
public/assets/sprites/marcus.svg
public/assets/sprites/opennet-terminal.svg
public/assets/sprites/player-compiler.svg
public/assets/sprites/player-declass-reviewer.svg
public/assets/sprites/player-editor.svg
public/assets/sprites/player-proofreader.svg
public/assets/sprites/player-source-note-specialist.svg
public/assets/sprites/priya.svg
public/assets/sprites/proof-lens.svg
public/assets/sprites/proof-page.svg
public/assets/sprites/red-pencil.svg
public/assets/sprites/referral-manifest.svg
public/assets/sprites/review-folder.svg
public/assets/sprites/sam.svg
public/assets/sprites/snes-colleague-compiler.svg
public/assets/sprites/snes-colleague-declass-coordinator.svg
public/assets/sprites/snes-colleague-editor.svg
public/assets/sprites/snes-colleague-review-specialist.svg
public/assets/sprites/snes-colleague-reviewer.svg
public/assets/sprites/snes-federal-shutdown.svg
public/assets/sprites/snes-frus-bees.svg
public/assets/sprites/snes-hac-member.svg
public/assets/sprites/snes-navy-hill-mice.svg
public/assets/sprites/snes-npc-archive-colleague.svg
public/assets/sprites/snes-npc-elena.svg
public/assets/sprites/snes-npc-marcus.svg
public/assets/sprites/snes-npc-priya.svg
public/assets/sprites/snes-npc-sam.svg
public/assets/sprites/snes-player-compiler-frames.svg
public/assets/sprites/snes-player-compiler.svg
public/assets/sprites/snes-player-declass-reviewer.svg
public/assets/sprites/snes-player-editor-frames.svg
public/assets/sprites/snes-player-editor.svg
public/assets/sprites/snes-player-proofreader.svg
public/assets/sprites/snes-player-source-note-specialist.svg
public/assets/sprites/snes-production-colleague-frames.svg
public/assets/sprites/snes-wall-ambiguous.svg
public/assets/sprites/snes-wall-danne-queue.svg
public/assets/sprites/snes-wall-firewall.svg
public/assets/sprites/snes-wall-hold.svg
public/assets/sprites/snes-wall-no-repo.svg
public/assets/sprites/snes-wall-pending.svg
public/assets/sprites/snes-wall-wait.svg
public/assets/sprites/snes-workflow-tools.svg
public/assets/sprites/source-note.svg
public/assets/sprites/telegram.svg
public/assets/sprites/volume-fragment.svg
src/entities/npcs/HistorianNPC.ts
src/entities/npcs/ProductionColleague.ts
src/scenes/CharacterCreateScene.ts
```

## Current State

The codebase does **not** currently use `this.load.image(...)`, `this.load.spritesheet(...)`, or `this.load.atlas(...)` for character art in `src/`; the requested grep returned no matches. It also has no `anims.create(...)` calls in `src/`.

Current character art is loaded in `src/scenes/BootScene.ts` through `this.load.svg(...)` and then used mostly as `Phaser.GameObjects.Image`, not animated `Sprite` objects.

| Loader/source | Current keys | Current path pattern | Current size/frame |
| --- | --- | --- | --- |
| `BootScene.preloadSvgAssets()` | `sam`, `elena`, `marcus`, `priya` | `assets/sprites/*.svg` | 16x16 SVG raster target |
| `BootScene.preloadSvgAssets()` | `player-proofreader`, `player-compiler`, `player-editor`, `player-declass-reviewer`, `player-source-note-specialist` | `assets/sprites/player-*.svg` | 16x16 SVG raster target |
| `BootScene.preloadSvgAssets()` | `snes-player-proofreader`, `snes-player-compiler`, `snes-player-editor`, `snes-player-declass-reviewer`, `snes-player-source-note-specialist` | `assets/sprites/snes-player-*.svg` | 32x32 SVG stills |
| `BootScene.preloadSvgAssets()` via `SNES_NPC_ASSETS` | `snes-npc-sam`, `snes-npc-elena`, `snes-npc-marcus`, `snes-npc-priya`, `snes-npc-archive-colleague` | `assets/sprites/snes-npc-*.svg` | 32x32 SVG stills |
| `BootScene.preloadSvgAssets()` via `SNES_PRODUCTION_COLLEAGUE_ASSETS` | `snes-colleague-compiler`, `snes-colleague-declass-coordinator`, `snes-colleague-reviewer`, `snes-colleague-editor`, `snes-colleague-review-specialist` | `assets/sprites/snes-colleague-*.svg` | 32x32 SVG stills |
| `BootScene.preloadSvgAssets()` via `SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET` | `snes-production-colleague-frames` | `assets/sprites/snes-production-colleague-frames.svg` | 192x160 sheet, 32x32 registered frames |
| `BootScene.preloadSvgAssets()` via `SNES_ROLE_FRAME_SHEETS` | `snes-player-compiler-frames`, `snes-player-editor-frames` | `assets/sprites/snes-player-*-frames.svg` | 608x48 strips, 32x48 manually registered frames |

Current live constructors:

- `src/entities/Player.ts` prefers a 32x48 SVG strip only for roles returned by `getSnesRoleFrameSheet()`, currently Compiler and Editor. Other player roles fall back to 32x32 `snes-player-*` stills or 16x16 `player-*` stills.
- `src/entities/npcs/HistorianNPC.ts` uses `scene.add.image(...)` with a 32x32 `snes-npc-*` still if available, otherwise a 16x16 fallback key.
- `src/entities/npcs/ProductionColleague.ts` uses a manually registered 32x32 SVG frame sheet if the desired pose exists, otherwise a 32x32 still.
- Scene files instantiate NPCs by role ids such as `new HistorianNPC(this, "elena", ...)` and `new ProductionColleague(...)`, so final wiring should target those classes and shared character registries rather than one-off scene edits first.

## Target State

The manifest confirms all ten requested sheets exist on disk under `public/assets/art-pack/sprites/`.

| Texture key | File | Exists | Image dimensions | Logical frame |
| --- | --- | --- | --- | --- |
| `compiler` | `sprite_compiler.png` | yes | 1024x1536 | 32x48 |
| `editor` | `sprite_editor.png` | yes | 1024x1536 | 32x48 |
| `declassification_coordinator` | `sprite_declassification_coordinator.png` | yes | 1024x1536 | 32x48 |
| `reviewer` | `sprite_reviewer.png` | yes | 1024x1536 | 32x48 |
| `senior_reviewer` | `sprite_senior_reviewer.png` | yes | 1024x1536 | 32x48 |
| `general_editor` | `sprite_general_editor.png` | yes | 1024x1536 | 32x48 |
| `archivist` | `sprite_archivist.png` | yes | 1024x1536 | 32x48 |
| `records_officer` | `sprite_records_officer.png` | yes | 1024x1536 | 32x48 |
| `security_officer` | `sprite_security_officer.png` | yes | 1024x1536 | 32x48 |
| `statechat_terminal` | `sprite_statechat_terminal.png` | yes | 1024x1536 | 32x48 |

Authoritative frame index map from `MANIFEST.md`:

| Index | Meaning |
| ---: | --- |
| 0 | idle down |
| 1 | idle up |
| 2 | idle left |
| 3 | idle right |
| 4 | walk down 1 |
| 5 | walk down 2 |
| 6 | walk up 1 |
| 7 | walk up 2 |
| 8 | walk left 1 |
| 9 | walk left 2 |
| 10 | walk right 1 |
| 11 | walk right 2 |
| 12 | interact/use-tool |
| 13 | reading document |
| 14 | approval/victory |

Important integration note: the manifest lists a logical frame size of 32x48, while the files on disk are 1024x1536. That dimension implies the PNGs are 8x display exports of a 4-column by 4-row logical 32x48 sheet. Phase 1 should either locate/add native 128x192 sheets or create a guarded native-runtime texture path before relying on Phaser's `frameWidth: 32, frameHeight: 48` against the 1024x1536 display PNGs.

Phase 1 follow-up: native 128x192 sheets were generated under `public/assets/art-pack/sprites/native/` so Phaser can load the canonical character keys with `frameWidth: 32` and `frameHeight: 48` without slicing the 1024x1536 display exports incorrectly.

## Diff

Needed path/key changes:

- Add a central character registry with the canonical keys and art-pack paths.
- Replace BootScene's character SVG loads for live character rendering with centralized 32x48 character sheet loading.
- Preserve old SVG/fallback generation paths until the new sheets are verified, but prevent live scene constructors from preferring those old keys.
- Decide how to handle display-scale PNGs: use native 32x48 slices only if native sheets are present/generated; otherwise Phaser will slice the 1024x1536 sheets into 32x48 display chunks that do not match the intended 15-frame layout.

Needed frame and animation changes:

- Replace the current compiler/editor-only manual frame names (`idle-0`, `walk-down-0`, `read`, etc.) with the manifest index map for all ten canonical character keys.
- Introduce Phaser animation registration for idle, two-frame walks, interact, reading, and approval.
- Convert live character renderers from `GameObjects.Image` to `GameObjects.Sprite` where animation is needed.

Needed scene/entity changes:

- Map playable role ids to canonical art keys:
  - `compiler` -> `compiler`
  - `editor` -> `editor`
  - `declass_reviewer` / declass coordinator role -> `declassification_coordinator`
  - `proofreader` likely needs an explicit design choice; no `proofreader` sheet exists in the canonical list, while `reviewer` and `records_officer` do.
  - `source_note_specialist` likely needs an explicit design choice; no direct canonical sheet exists, with `archivist` or `records_officer` as likely candidates.
- Map current named NPC ids:
  - `elena` -> `compiler`
  - `marcus` -> `declassification_coordinator`
  - `priya` -> `general_editor` or `editor` depending intended role text
  - `sam` -> `reviewer` or `records_officer`
  - `archive-colleague` -> `archivist`
- Replace `HistorianNPC` still images with animated sprites using canonical keys.
- Replace `ProductionColleague` still/frame-sheet SVG usage with canonical role sprites and animation states.
- Keep `statechat_terminal` terminal-only: it may be loaded as a stationary terminal sheet/object, but must not become a speaking character, face, mascot, body, or assistant avatar.

Old placeholder references to retire or quarantine after the new sheets work:

- `public/assets/sprites/sam.svg`
- `public/assets/sprites/elena.svg`
- `public/assets/sprites/marcus.svg`
- `public/assets/sprites/priya.svg`
- `public/assets/sprites/archive-colleague.svg`
- `public/assets/sprites/player-*.svg`
- `public/assets/sprites/snes-player-*.svg`
- `public/assets/sprites/snes-npc-*.svg`
- `public/assets/sprites/snes-colleague-*.svg`
- `public/assets/sprites/snes-player-compiler-frames.svg`
- `public/assets/sprites/snes-player-editor-frames.svg`
- `public/assets/sprites/snes-production-colleague-frames.svg`

Phase 1 should not remove unrelated object, item, terminal, wall, or UI art. Those are outside this sprite-sheet wiring pass.
