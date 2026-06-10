# Asset Improvement Report

## Summary

- No PNG image files are present in the current game asset set.
- The loaded image assets are SVG files under `public/assets/sprites`, `public/assets/tiles`, and `public/assets/ui`.
- Original SVG assets were copied to `public/assets/_originals/` before modification so the repo has a Git-safe before/after baseline.
- Existing filenames, paths, dimensions, identities, tile meanings, and game references were preserved.
- Cleanup focused on the existing art only: off-palette colors were snapped to the game palette, SVG text/circle/stroke elements were replaced with hard rectangle pixels, and UI borders were converted from strokes to filled pixel rectangles.
- The visual comparison page is `public/assets/asset_debug.html`.

## Palette And Alpha Checks

- Palette retained: ruby buckram, deep ruby, buckram highlight, gold stamp, cream paper, sepia ink, archive amber, stone grays, slate/map blue, terminal cyan, OpenNet green, ClassNet red, black, and white.
- No semi-transparent pixels or opacity attributes remain in the loaded image assets.
- Sprite transparency is preserved through fully transparent SVG backgrounds (`fill="none"`), not partial alpha.
- Current image assets use rectangle-only pixel forms; no SVG text, circles, paths, gradients, filters, blur, opacity, or stroke outlines are used by the loaded art files.

## Asset Inventory

| Path | Dimensions | Current color count | Alpha usage | Code references |
|---|---:|---:|---|---|
| `public/assets/sprites/archive-colleague.svg` | 16x16 | 6 | transparent bg only | `src/scenes/BootScene.ts:85`, `src/scenes/BootScene.ts:265`, `src/scenes/BootScene.ts:290`, `src/scenes/GuideScene.ts:57` |
| `public/assets/sprites/bureaucratic-wall.svg` | 36x32 | 6 | transparent bg only | `src/entities/BureaucraticWall.ts:32`, `src/scenes/BootScene.ts:88`, `src/scenes/BootScene.ts:295`, `src/scenes/BootScene.ts:326` |
| `public/assets/sprites/citation-stamp.svg` | 18x18 | 6 | transparent bg only | `src/scenes/BootScene.ts:86`, `src/scenes/BootScene.ts:218`, `src/scenes/BootScene.ts:236`, `src/scenes/GuideScene.ts:59` |
| `public/assets/sprites/elena.svg` | 16x16 | 5 | transparent bg only | `src/game/constants.ts:33`, `src/scenes/ArchiveScene.ts:58`, `src/scenes/BootScene.ts:52`, `src/scenes/BootScene.ts:77`, `src/scenes/OfficeScene.ts:56`, `src/scenes/OfficeScene.ts:82` |
| `public/assets/sprites/frus-prize-cover.svg` | 80x120 | 7 | transparent bg only | `src/scenes/BootScene.ts:91`, `src/scenes/BootScene.ts:181`, `src/scenes/BootScene.ts:213`, `src/scenes/EndingScene.ts:126` |
| `public/assets/sprites/frus-volume.svg` | 52x42 | 7 | transparent bg only | `src/scenes/BootScene.ts:90`, `src/scenes/BootScene.ts:159`, `src/scenes/BootScene.ts:176`, `src/scenes/TitleScene.ts:55` |
| `public/assets/sprites/manuscript.svg` | 18x18 | 6 | transparent bg only | `src/entities/Manuscript.ts:16`, `src/game/constants.ts:58`, `src/game/types.ts:28`, `src/scenes/BootScene.ts:89`, `src/scenes/BootScene.ts:137`, `src/scenes/BootScene.ts:154`, `src/systems/inventory.ts:43` |
| `public/assets/sprites/marcus.svg` | 16x16 | 6 | transparent bg only | `src/game/constants.ts:39`, `src/scenes/BootScene.ts:53`, `src/scenes/BootScene.ts:78`, `src/scenes/NetworkScene.ts:75`, `src/scenes/OfficeScene.ts:57`, `src/scenes/OfficeScene.ts:83`, `src/scenes/ReferralVaultScene.ts:75` |
| `public/assets/sprites/player-compiler.svg` | 16x16 | 4 | transparent bg only | `src/game/constants.ts:68`, `src/scenes/BootScene.ts:81` |
| `public/assets/sprites/player-declass-reviewer.svg` | 16x16 | 7 | transparent bg only | `src/game/constants.ts:84`, `src/scenes/BootScene.ts:83` |
| `public/assets/sprites/player-editor.svg` | 16x16 | 6 | transparent bg only | `src/game/constants.ts:76`, `src/scenes/BootScene.ts:82` |
| `public/assets/sprites/player-proofreader.svg` | 16x16 | 4 | transparent bg only | `src/game/constants.ts:60`, `src/scenes/BootScene.ts:80` |
| `public/assets/sprites/player-source-note-specialist.svg` | 16x16 | 5 | transparent bg only | `src/game/constants.ts:92`, `src/scenes/BootScene.ts:84` |
| `public/assets/sprites/priya.svg` | 16x16 | 5 | transparent bg only | `src/game/constants.ts:45`, `src/scenes/BootScene.ts:54`, `src/scenes/BootScene.ts:79`, `src/scenes/OfficeScene.ts:58`, `src/scenes/OfficeScene.ts:84`, `src/scenes/SilentReadScene.ts:42` |
| `public/assets/sprites/sam.svg` | 16x16 | 5 | transparent bg only | `src/game/constants.ts:27`, `src/scenes/BootScene.ts:51`, `src/scenes/BootScene.ts:76`, `src/scenes/GuideScene.ts:98` |
| `public/assets/sprites/volume-fragment.svg` | 20x18 | 7 | transparent bg only | `src/scenes/BootScene.ts:87`, `src/scenes/BootScene.ts:241`, `src/scenes/BootScene.ts:260`, `src/scenes/GuideScene.ts:60` |
| `public/assets/tiles/archive-tiles.svg` | 16x16 | 4 | none | `src/scenes/ArchiveScene.ts:51`, `src/scenes/BootScene.ts:66`, `src/scenes/BootScene.ts:97` |
| `public/assets/tiles/network-tiles.svg` | 16x16 | 6 | none | `src/scenes/BootScene.ts:67`, `src/scenes/BootScene.ts:97`, `src/scenes/NetworkScene.ts:64` |
| `public/assets/tiles/office-tiles.svg` | 16x16 | 5 | none | `src/scenes/BootScene.ts:65`, `src/scenes/BootScene.ts:97`, `src/scenes/OfficeScene.ts:39` |
| `public/assets/tiles/vault-tiles.svg` | 16x16 | 5 | none | `src/scenes/BootScene.ts:68`, `src/scenes/BootScene.ts:97`, `src/scenes/ReferralVaultScene.ts:64` |
| `public/assets/ui/dialog-box.svg` | 32x16 | 2 | none | `src/scenes/BootScene.ts:69`, `src/scenes/BootScene.ts:101` |
| `public/assets/ui/reliability-meter.svg` | 32x16 | 3 | none | `src/scenes/BootScene.ts:71`, `src/scenes/BootScene.ts:101` |
| `public/assets/ui/terminal-panel.svg` | 32x16 | 2 | none | `src/scenes/BootScene.ts:70`, `src/scenes/BootScene.ts:101` |

## Files Improved In Place

| File | Change |
|---|---|
| `public/assets/sprites/archive-colleague.svg` | Replaced the only non-palette shoe color with palette sepia. |
| `public/assets/sprites/frus-prize-cover.svg` | Replaced SVG text and circle strokes with hard rectangle pixel marks while preserving the ruby FRUS cover identity. |
| `public/assets/tiles/archive-tiles.svg` | Replaced off-palette grid lines with palette sepia. |
| `public/assets/tiles/network-tiles.svg` | Replaced off-palette slate lines with existing map/slate blue. |
| `public/assets/tiles/office-tiles.svg` | Replaced off-palette cream grid lines with palette gold. |
| `public/assets/ui/dialog-box.svg` | Converted stroked border to filled 2px pixel rectangles. |
| `public/assets/ui/reliability-meter.svg` | Converted stroked border to filled 2px pixel rectangles. |
| `public/assets/ui/terminal-panel.svg` | Converted stroked border to filled 2px pixel rectangles. |

## Color Count Changes

Most assets already used a small indexed palette and kept their original color count. Three files had color-count reductions after off-palette colors were merged into the existing palette:

| File | Original colors | Current colors |
|---|---:|---:|
| `public/assets/sprites/archive-colleague.svg` | 7 | 6 |
| `public/assets/tiles/archive-tiles.svg` | 5 | 4 |
| `public/assets/tiles/office-tiles.svg` | 6 | 5 |

## Validation

- Inventory confirmed all loaded SVG assets keep the same dimensions.
- Inventory confirmed all loaded SVG asset colors are in the existing game palette.
- Inventory confirmed no loaded image asset uses opacity, semi-transparent color, SVG text, circles, paths, gradients, blur, filters, or stroke outlines.
- The before/after page compares `public/assets/_originals/` against current assets without changing game code references.
- `npm run build` passed with only the existing Phaser bundle-size warning.
- Playwright `EndingScene` verification confirmed the FRUS cover prize still renders and `frusPrize.assembled` remains `true`.
- Playwright `OfficeScene` verification confirmed cleaned tiles and sprites render correctly inside the Phaser canvas.
- Browser verification of `http://127.0.0.1:5175/assets/asset_debug.html` loaded 23 asset cards and 46 images, with no console errors.
