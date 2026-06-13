# Phase 3: Unified Input State

## Summary

Phase 3 refactored input into `src/input/InputState.ts`.

- Keyboard, touch-button, pointer-start, and gamepad state now merge into one frame buffer.
- Gameplay scenes call `tickInput()` once at the top of `update()` and read `getInput()`.
- Direct keyboard/pointer reads outside `src/input/` were removed.
- Touch buttons no longer synthesize `KeyboardEvent`s; they bind directly to shared touch controls.
- Player movement now reads from the shared four-way direction state.

## Verification

- `npm run build` passed.
- Direct-input grep returned no matches outside `src/input/` for:
  - `input.keyboard`
  - `Phaser.Input.Keyboard`
  - `KeyboardMap`
  - `keydown`
  - `keyup`
  - `pointerdown`
  - `pointerup`
  - `pointermove`
  - `cursors`
- Web-game client title/create/guide input burst passed with no console/page errors.
- GuideScene input burst advanced dialogue, moved the player to `x=99, y=124`, faced west, and picked up the Citation Stamp.
- In-app browser loaded `http://127.0.0.1:5193/?scene=GuideScene&role=compiler&name=Ruby`; game canvas reported `256x240` backing and `512x480` CSS size.
- iPhone 14 Pro and Pixel 7 portrait/landscape screenshots reported integer zoom and no console errors.

## Artifacts

- `docs/screenshots/mobile/phase3-guide-input/shot-0.png`
- `docs/screenshots/mobile/phase3-iphone14pro-portrait.png`
- `docs/screenshots/mobile/phase3-iphone14pro-landscape.png`
- `docs/screenshots/mobile/phase3-pixel7-portrait.png`
- `docs/screenshots/mobile/phase3-pixel7-landscape.png`
