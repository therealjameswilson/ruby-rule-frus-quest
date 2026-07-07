# Phase 1 Render Lock

Branch: `feature/mobile-snes-quality`
Commit target: `feat(render): pixel-perfect FIT scaling with integer-zoom lock`

Phase 1 keeps the base resolution at 256x240 and locks display sizing to whole-number CSS zoom.

## Changes

- Kept Phaser `Scale.FIT`, `pixelArt: true`, `roundPixels: true`, and antialiasing disabled.
- Added explicit scale parent and base dimensions to the Phaser scale config.
- Added a high-performance render preference.
- Reworked the game-shell scaler to use `Math.floor(rawScale)` with a minimum 1x, never fractional display zoom.
- Added a resize/orientation guard that refreshes Phaser scale and corrects canvas CSS drift when computed zoom differs from the integer target by more than 0.001.
- Added `?pixelProof=1` / `F8` debug overlay with a 1px checkerboard, a 1px diagonal line, and 1px stripe tests.
- Extended `?mobileDebug=1` metrics to show integer target zoom, proof-overlay state, and guard corrections.
- Converted a few debug/gallery/prop fractional sprite scales to 1x.

## Mobile Profile Results

Measured through local Vite preview at:

`http://127.0.0.1:5196/?scene=ArchiveScene&role=compiler&name=Ruby&mobileDebug=1&pixelProof=1`

| Profile | CSS canvas | Backing store | Computed zoom | Integer | Target | Guard corrections | Console errors |
|---|---:|---:|---:|---|---:|---:|---:|
| iPhone 14 Pro portrait | 256x240 | 256x240 | 1.000 | Yes | 1x | 0 | 0 |
| iPhone 14 Pro landscape | 256x240 | 256x240 | 1.000 | Yes | 1x | 0 | 0 |
| Pixel 7 portrait | 256x240 | 256x240 | 1.000 | Yes | 1x | 0 | 0 |
| Pixel 7 landscape | 256x240 | 256x240 | 1.000 | Yes | 1x | 0 | 0 |

The current DOM touch-control layout still forces mobile down to 1x in these profiles. That is visually smaller than the Phase 0 fractional fit, but it is pixel-correct. Phase 4 should recover screen real estate by moving to floating overlay controls while preserving integer zoom.

## Follow-up: device-pixel integer zoom

The Phase 1 lock computed integer zoom in **CSS** pixels, which caps a high-DPR
iPhone (dpr 3, ~393 CSS px wide) at 1x — a 256 px canvas on a 393 px screen. The
render lock now snaps to an integer number of **device** pixels instead
(`computeDeviceIntegerZoom`): the backing store is always an exact integer
multiple of the 256x240 base, so every game pixel maps to a whole number of
physical pixels and stays crisp, while the CSS zoom is allowed to be fractional
so the canvas fills more of the screen.

| Profile | dpr | Old CSS zoom | Old CSS width | New device zoom | New CSS width | Backing store |
|---|---:|---:|---:|---:|---:|---:|
| iPhone 14 Pro portrait | 3 | 1x | 256 px | 4x | ~341 px | 1024x960 |

On dpr=1 desktops the device-pixel zoom is identical to the old CSS-integer zoom,
so desktop behavior is unchanged. The crispness invariant is now "backing store
is an integer multiple of the base resolution", proven by `?scene=RenderDebugScene`
(`CHECK: PASS`) and covered by `src/systems/pixelPerfect.test.ts`.

## Captured Artifacts

- `docs/screenshots/mobile/phase1-standard.png`
- `docs/screenshots/mobile/phase1-iphone14pro-portrait.png`
- `docs/screenshots/mobile/phase1-iphone14pro-landscape.png`
- `docs/screenshots/mobile/phase1-pixel7-portrait.png`
- `docs/screenshots/mobile/phase1-pixel7-landscape.png`
- `docs/screenshots/mobile/phase1-contact-sheet.png`
- `docs/mobile/phase1-measurements.json`

Recordings:

- `docs/screenshots/mobile/phase1-iphone14pro-portrait.webm`
- `docs/screenshots/mobile/phase1-iphone14pro-landscape.webm`
- `docs/screenshots/mobile/phase1-pixel7-portrait.webm`
- `docs/screenshots/mobile/phase1-pixel7-landscape.webm`

## Remaining Render Notes

- `CharacterCreateScene` still uses a fractional role-card thumbnail scale to fit 32x48 character sprites into compact cards. It should be redesigned in the UI phase rather than stretched as a one-line render fix.
- Some enemy bob/jitter values are fractional internally, but render positions pass through `snapPixel()` before display.
