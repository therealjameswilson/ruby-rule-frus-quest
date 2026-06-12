# 16-Bit Sprite Wiring Final Report

Branch: `feature/wire-16bit-sprites`

## Branch Log

```text
0edb05b chore(art): palette check after 16-bit sprite wiring
c1b2040 feat(debug): sprite gallery scene for visual QA
81c10aa feat(scenes): swap character sprites to 16-bit sheets
433f621 feat(art): generate idle/walk/interact anims for all 16-bit characters
d3e0c8a refactor(art): centralize 16-bit character sprite loading at 32x48
ab0c747 docs(art): audit current sprite wiring vs 16-bit art pack
```

## Cleanup

- `experiments/old-8bit/` does not exist in this branch, so there were no old placeholder PNG files to delete.
- Legacy SVG character textures still exist because BootScene uses them as guarded fallbacks; live player, NPC, character creator, and debug-gallery paths now prefer the centralized 32x48 art-pack sheets.
- `public/assets/art-pack/MANIFEST.md` now documents the `sprites/native/` runtime derivatives used by Phaser.

## Centralized Loading Confirmation

All character spritesheet loading is centralized in `src/art/characters.ts`:

```ts
export const CHARACTER_FRAME = { width: 32, height: 48 } as const;
```

The only live character `load.spritesheet(...)` loop uses `CHARACTERS[key]` paths and `CHARACTER_FRAME.width` / `CHARACTER_FRAME.height`. A source scan confirms character loading flows through:

- `src/art/characters.ts`
- `preloadCharacters(this)` in `src/scenes/BootScene.ts`

The canonical runtime paths are under:

```text
assets/art-pack/sprites/native/sprite_*.png
```

Each runtime sheet is 128x192, sliced into a 4x4 grid of 32x48 frames.

## Animation Frame Order

The manifest frame order mapped cleanly for the ten canonical sheets:

- idle: down, up, left, right
- walk: down1/down2, up1/up2, left1/left2, right1/right2
- action: interact/use-tool, reading, approval/victory

No canonical sheet required a special frame-order exception.

## Before / After Evidence

| Coverage | Before | After |
|---|---|---|
| Live title/office path | `docs/screenshots/16bit-wire-phase0.png` | `docs/screenshots/16bit-wire-phase3-office-guide.png` |
| Interior sample | `docs/screenshots/16bit-wire-phase2.png` | `docs/screenshots/16bit-wire-phase3-interior.png` |
| Contact sheet | n/a | `docs/screenshots/16bit-wire-phase3-comparison.png` |
| All character sheets | n/a | `docs/screenshots/16bit-wire-gallery.png` |
| Hidden F9 QA path | n/a | `docs/screenshots/16bit-wire-phase4-f9.png` |

## Validation

- `npm run build` passes.
- `?scene=SpriteGallery` reports `SpriteGallery` / `debug` with 10 visible character entities.
- F9 from `TitleScene` opens `SpriteGallery`.
- `npm run palette:check --if-present` exits successfully, but no palette-check script is configured; see `tools/palette_report.md`.

## PR Status

Requested PR title:

```text
Wire up 16-bit character sprites (32x48) across all scenes
```

Branch push status: pushed to `origin/feature/wire-16bit-sprites`.

PR creation URL:

```text
https://github.com/therealjameswilson/ruby-rule-frus-quest/pull/new/feature/wire-16bit-sprites
```

PR creation was attempted through the GitHub connector after push, but the connector returned `token_expired`. The local GitHub CLI fallback is also unavailable because `gh` is not installed. The branch is ready for PR creation once GitHub auth is refreshed.
