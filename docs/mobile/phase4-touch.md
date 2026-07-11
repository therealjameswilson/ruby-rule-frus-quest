# Phase 4: Touch Controls and Audio Start Gate

Branch: `feature/mobile-snes-quality`  
Date: 2026-06-12  
Preview tested: local Vite dev server at `http://127.0.0.1:5194/`

## Implementation

- Added a `UIScene` that runs above gameplay and owns the mobile control overlay.
- Added `TouchControls` under `src/input/`, keeping touch and pointer handling inside the central input module.
- Replaced persistent DOM controls with canvas-drawn, semi-transparent controls:
  - floating D-pad anchored on first press in the left-third movement zone
  - 4-way cardinal snapping with a 12px dead zone
  - A, B, Start, and hidden Select controls with larger invisible hit zones than visible graphics
  - pressed controls brighten and compress immediately
- Added independent pointer tracking so D-pad and A can be held at the same time.
- Added haptic feedback via `navigator.vibrate(8)` on button presses where supported.
- Added an F10 desktop debug toggle to force-show the touch overlay.
- Added a `TapToStartScene` before the title path so the first user gesture unlocks and pre-warms the Web Audio context.
- Added a small `window.rubyRuleTouchControls` debug readout for verification of active pointer/button state.

## Verification

Build:

```bash
npm run build
```

Result: passed. Vite still reports the existing large Phaser chunk warning only.

Automated probe:

- `docs/screenshots/mobile/phase4-touch-probe.json`
- `docs/screenshots/mobile/phase4-touch-recording.webm`
- `docs/screenshots/mobile/phase4-tap-gate.png`
- `docs/screenshots/mobile/phase4-after-tap-title.png`
- `docs/screenshots/mobile/phase4-touch-idle.png`
- `docs/screenshots/mobile/phase4-touch-held-dpad-a.png`
- `docs/screenshots/mobile/phase4-touch-dpad-a.png`

Confirmed behavior:

- Tap gate starts at `TapToStartScene`.
- First tap unlocks audio and reaches `TitleScene`.
- Direct `GuideScene` starts still boot through the QA deep link.
- A advances the opening dialogue.
- D-pad moves the player north from `y=160` to `y=113`.
- The held-input debug state reports `dpadDirection: "up"` while A (`space`) is pressed.
- Probe finished with zero console/page errors.

Device-profile screenshots:

- `docs/screenshots/mobile/phase4-iphone14pro-portrait.png`
- `docs/screenshots/mobile/phase4-iphone14pro-landscape.png`
- `docs/screenshots/mobile/phase4-pixel7-portrait.png`
- `docs/screenshots/mobile/phase4-pixel7-landscape.png`
- `docs/screenshots/mobile/phase4-device-matrix.json`

All four Playwright device profiles reported integer zoom and zero console/page errors. This is emulated-browser coverage, not the later real-device QA matrix.

In-app browser smoke:

- Local scene loaded at `http://127.0.0.1:5194/?scene=GuideScene&role=compiler&name=Ruby`.
- Console error check returned zero errors.

## Remaining Later-Phase Work

- Phase 5 should make dialogue and inventory explicitly touch-friendly.
- Phase 6 should add interruption-proof/gapless audio behavior beyond the initial unlock/pre-warm.
- Phase 10 still needs actual iPhone/Pixel hardware QA; Phase 4 only produced repeatable Playwright device-profile artifacts.
