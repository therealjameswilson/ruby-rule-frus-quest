# Phase 2 Mobile Shell

Branch: `feature/mobile-snes-quality`
Commit target: `feat(shell): SNES-grade HTML shell with safe-area, dvh, no-scroll`

Phase 2 keeps the 256x240 base resolution and the Phase 1 integer zoom lock intact while making the surrounding browser shell safer for phones.

## Changes

- Updated `index.html` with strict mobile viewport, PWA-capable tags, Apple status-bar style, black theme color, and telephone-format detection disabled.
- Switched the shell background to black and made `html`, `body`, and `#app` use `100dvw`/`100dvh`, hidden overflow, no overscroll, no selection, and no tap highlight.
- Kept safe-area padding on the document shell so notches and home indicators do not cover the game or controls.
- Added dynamic `--ruby-rule-vh` and `--ruby-rule-vw` CSS vars from `window.innerHeight`/`innerWidth`.
- Added canvas-only `touchmove` prevention so the game canvas cannot scroll the page.
- Added a dismissible iOS Safari "Add to Home Screen" hint, stored in `localStorage`.
- Added a dismissible Android/Chrome fullscreen affordance that calls `requestFullscreen()` from a user gesture when available.
- Replaced immediate resize/orientation handling with a 100ms debounce that updates viewport vars, refreshes Phaser scale, and reapplies the Phase 1 integer zoom guard.

## Mobile Profile Results

Measured through local Vite preview at:

`http://127.0.0.1:5197/?scene=ArchiveScene&role=compiler&name=Ruby&mobileDebug=1`

| Profile | Zoom | Integer | iOS hint | Fullscreen button before tap | Fullscreen button after tap | Canvas touchmove prevented | Body touchmove prevented | Console errors |
|---|---:|---|---|---|---|---|---|---:|
| iPhone 14 Pro portrait | 1.000 | Yes | Yes | No | No | Yes | No | 0 |
| iPhone 14 Pro landscape | 1.000 | Yes | Yes | No | No | Yes | No | 0 |
| Pixel 7 portrait | 1.000 | Yes | No | Yes | No | Yes | No | 0 |
| Pixel 7 landscape | 1.000 | Yes | No | Yes | No | Yes | No | 0 |

All four profiles reported the viewport meta:

`width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`

## In-App Browser Check

The Codex in-app browser at a desktop-style viewport reported:

- viewport meta updated
- theme color `#000000`
- body overflow `hidden`
- body touch-action `none`
- clean 2x integer shell (`512x480` canvas for a 256x240 buffer)

## Captured Artifacts

- `docs/screenshots/mobile/phase2-standard.png`
- `docs/screenshots/mobile/phase2-iphone14pro-portrait.png`
- `docs/screenshots/mobile/phase2-iphone14pro-landscape.png`
- `docs/screenshots/mobile/phase2-pixel7-portrait.png`
- `docs/screenshots/mobile/phase2-pixel7-landscape.png`
- `docs/screenshots/mobile/phase2-contact-sheet.png`
- `docs/mobile/phase2-measurements.json`

Recordings:

- `docs/screenshots/mobile/phase2-iphone14pro-portrait.webm`
- `docs/screenshots/mobile/phase2-iphone14pro-landscape.webm`
- `docs/screenshots/mobile/phase2-pixel7-portrait.webm`
- `docs/screenshots/mobile/phase2-pixel7-landscape.webm`

## Remaining Shell Notes

- The current DOM touch controls still consume too much screen area. Phase 4 should replace them with a floating overlay while preserving the shell and integer zoom behavior from Phases 1 and 2.
- The fullscreen request is verified as an affordance and user-gesture code path in emulation. Real-device confirmation remains part of the Phase 10 QA matrix.
