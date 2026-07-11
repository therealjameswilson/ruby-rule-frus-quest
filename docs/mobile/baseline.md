# Mobile SNES Quality Baseline

Phase 0 branch: `feature/mobile-snes-quality`
Date: 2026-06-12
Build target measured: local Vite preview at `http://127.0.0.1:5195/`

This is a baseline audit only. It records the current bar before changing the render pipeline, shell, input architecture, touch controls, audio, performance, or save/resume behavior.

## Current Phaser Render Config

Source files: `src/main.ts`, `src/game/config.ts`, `src/game/constants.ts`

| Setting | Current value |
|---|---|
| Base width | `GAME_WIDTH = 256` |
| Base height | `GAME_HEIGHT = 240` |
| Renderer | `Phaser.CANVAS` |
| Parent | top-level `parent: "game-shell"` |
| Scale mode | `Phaser.Scale.FIT` |
| Scale auto center | `Phaser.Scale.CENTER_BOTH` |
| Scale auto round | `true` |
| Zoom | `3` |
| Pixel art | `true` |
| Round pixels | `true` |
| Antialias | `false` |
| Antialias GL | `false` |
| Audio | custom Web Audio oscillator/chiptune system |

The base buffer remains 256x240, as required by the mobile prompt. The current display layer does not preserve integer CSS zoom on phone-sized viewports.

## Input Path Audit

Command:

```bash
rg -n "cursors|keyboard|WASD|setInteractive|pointer(down|up|move)|Pointer|touch|keydown|keyup" src/
```

Current direct input reads/listeners are scattered outside a central input module:

| Area | Current behavior |
|---|---|
| `src/entities/Player.ts` | creates keyboard keys directly and reads `this.keys.*.isDown`; also reads `window.rubyRuleTouchState` |
| `src/main.ts` | DOM touch controls synthesize `KeyboardEvent` objects and mutate `rubyRuleTouchState`; releases use delayed keyup timers |
| `src/scenes/CharacterCreateScene.ts` | direct keyboard listeners and pointer card interactions |
| `src/scenes/TitleScene.ts` | direct keyboard listeners and pointer start interaction |
| `src/scenes/SpriteGallery.ts` | direct keyboard listener for exit |
| `src/systems/verification.ts` | direct A/B/C/D keyboard listeners and pointer option clicks |

Known latency risks before Phase 3/4:

- Movement touch buttons have a 25ms synthetic release delay.
- Action buttons have a 90ms synthetic release delay.
- Touch controls are implemented as DOM buttons that synthesize keyboard events, not as a shared frame-perfect input state.
- There is no unified `InputState` source for keyboard, touch, and gamepad.

## Fixed-Pixel UI Audit

Command:

```bash
rg -n "add\\.text|add\\.rectangle|setScrollFactor|GAME_WIDTH|GAME_HEIGHT|fontSize|dialog|HUD|hud|inventory|menu|setOrigin|setPosition" src/scenes src/systems src/ui src/entities
```

Most UI surfaces are anchored in base-resolution pixels, which is good for SNES layout discipline. The current mobile weakness is not the base anchoring; it is that the shell adds large persistent DOM controls outside the canvas and the in-game UI does not adapt to touch reading distance.

Examples:

| Surface | Current behavior |
|---|---|
| HUD | fixed to base game dimensions through scene helpers |
| Dialogue box | `DialogBox` uses a fixed 244x64 bottom panel with small pixel text |
| Inventory overlay | fixed 236x168 panel with compact text |
| Mobile controls | visible DOM grid outside/alongside the canvas, not a floating overlay |

## HTML and CSS Shell Audit

Source files: `index.html`, `src/styles/pixel.css`

Current viewport:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

Current shell strengths:

- `overflow: hidden` and `overscroll-behavior: none` are already present.
- `100dvh` is already used on `body`.
- Pixel rendering is applied to `canvas`, `img`, `.game-container`, `#game`, `#app`, and `#game-shell`.

Current shell gaps for the SNES mobile bar:

- No `maximum-scale=1` or `user-scalable=no`.
- No mobile web app capable tags.
- No Apple status bar style.
- No `theme-color`.
- No `format-detection` opt-out.
- Safe-area padding is not consistently applied to the app root.
- Persistent DOM controls consume screen space and remain visually prominent.

## Debug HUD Added

Phase 0 added a hidden debug HUD toggled by `F11` or enabled with `?mobileDebug=1`.

It reports:

- FPS current, 1s average, and 10s minimum
- Pointerdown-to-next-RAF latency probe
- Active pointer count
- DPR
- Canvas CSS size
- Canvas backing-store size
- Computed zoom
- Whether computed zoom is integer
- First debug frame timestamp

The metrics are also exposed through:

```ts
window.rubyRuleMobileMetrics
```

## Mobile Emulation Measurements

These are Playwright mobile emulation results captured from the local preview with the debug HUD visible. They are useful for finding layout and integer-scaling failures, but they are not a substitute for the real-device Phase 10 QA matrix.

| Profile | First frame | FPS 1s avg | FPS 10s min | Input probe | Canvas CSS | Backing store | Zoom | Integer zoom | Console errors |
|---|---:|---:|---:|---:|---|---|---:|---|---:|
| iPhone 14 Pro portrait | 211.6ms | 23.3 | 1.5 | 37.9ms | 376x353 | 256x240 | 1.46875 | No | 0 |
| iPhone 14 Pro landscape | 131.9ms | 24.8 | 12.0 | 41.3ms | 402x376 | 256x240 | 1.5703125 | No | 0 |
| Pixel 7 portrait | 81.4ms | 24.6 | 12.0 | 28.4ms | 395x371 | 256x240 | 1.54296875 | No | 0 |
| Pixel 7 landscape | 77.8ms | 23.8 | 12.0 | 39.4ms | 422x395 | 256x240 | 1.6484375 | No | 0 |

The FPS numbers were captured while Playwright was recording video and should be treated as a proxy baseline. The fractional zoom failure is independent of the recording overhead and should be fixed first.

## Audio Baseline

The current title path calls `retroAudio.startMusic("TitleScene")` during scene creation. On mobile Safari/Chrome this is expected to be blocked or delayed until a user gesture.

Phase 0 did not add a first-audio-sample hook. The best current proxy is `render_game_to_text().audioStatus`, which reports an intended music state after interaction, not verified sample output timing.

Current status:

- No tap-to-start audio gate.
- No AudioContext pre-warm.
- No interruption recovery.
- No measurement for first tap to first audible sample.

## Captured Artifacts

Screenshots:

- `docs/screenshots/mobile/phase0-standard.png`
- `docs/screenshots/mobile/phase0-iphone14pro-portrait.png`
- `docs/screenshots/mobile/phase0-iphone14pro-landscape.png`
- `docs/screenshots/mobile/phase0-pixel7-portrait.png`
- `docs/screenshots/mobile/phase0-pixel7-landscape.png`
- `docs/screenshots/mobile/phase0-contact-sheet.png`

Recordings:

- `docs/screenshots/mobile/phase0-iphone14pro-portrait.webm`
- `docs/screenshots/mobile/phase0-iphone14pro-landscape.webm`
- `docs/screenshots/mobile/phase0-pixel7-portrait.webm`
- `docs/screenshots/mobile/phase0-pixel7-landscape.webm`

Raw metrics:

- `docs/mobile/phase0-measurements.json`

## What Fails the SNES Mobile Bar

1. Fractional zoom on every tested mobile profile, so pixels are not guaranteed to map to whole CSS pixels.
2. Persistent visible DOM controls take over too much of the small screen and do not feel like native retro controls.
3. Touch input is implemented by keyboard-event synthesis rather than a frame-perfect shared input state.
4. Input reads are scattered across gameplay, scenes, and systems instead of isolated under `src/input/`.
5. Touch release delays exist today, including 90ms for action buttons.
6. Audio attempts to start before the first user gesture and has no unlock/pre-warm gate.
7. Safe-area and mobile PWA metadata are incomplete.
8. Dialogue and menus remain desktop-sized in base pixels and are not yet touch-friendly.
9. No Bluetooth gamepad adapter exists.
10. Real-device FPS, latency, audio, and save/resume QA is still unmeasured.

## Phase 1 Target

The highest-confidence first fix is render discipline:

- preserve the 256x240 base resolution
- force integer CSS zoom after resize/orientation
- keep `pixelArt`, `roundPixels`, and antialiasing disabled
- prove with a checkerboard/diagonal debug overlay
