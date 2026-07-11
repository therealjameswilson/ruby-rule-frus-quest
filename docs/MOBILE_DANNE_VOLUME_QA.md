# Mobile DANN-E Combat and Volume Assembly QA

Date: 2026-07-06
Branch: `codex/mobile-danne-volume-parity`

## Touch Input Path

- Movement: `TouchControls` captures a floating D-pad touch in the left third of the canvas and writes `left`, `right`, `up`, and `down` through `setTouchControl()`. `InputState.tickInput()` reads those flags into the shared `dir` field used by gameplay scenes.
- Equipped-tool swing: the touch `B` button writes the `b` control. `GameplayMapScene` already treats `input.bJustPressed || input.abilityJustPressed` as the equipped FRUS tool action, which calls `Player.startAction()`, enters `weaponState`, and exposes the active-frame hitbox for `DanneEnemy.tryPlayerToolHit()`.
- Interact remains separate: touch `A` writes the `space` control for confirm/interact and does not double as the weapon swing.

## HUD Change

The touch `B` button now includes a compact vertical cooldown meter beside the button:

- red fill while a tool is cooling down;
- cyan fill while the active hit window is live;
- gold tick during windup/active frames;
- the same weapon phase/cooldown data is exposed through `window.rubyRuleTouchControls` for QA.

## Simulated Mobile Probe

Viewport:

- 375 x 667 CSS pixels;
- DPR 2;
- touch/mobile enabled;
- URL: `?scene=GameplayMapScene&map=black_vault&role=compiler&name=Ruby&give=combat-tools&equip=red_pencil&debug=hitbox`.

Observed metrics:

- canvas CSS size: 256 x 240;
- canvas backing size: 512 x 480;
- computed integer zoom: 1;
- `integerZoom`: true;
- final input latency sample: 8.4 ms;
- no page errors.

## Manual Checklist

- [x] Touch overlay appears on a mobile viewport.
- [x] Floating D-pad moves the player during the DANN-E encounter.
- [x] Touch `B` enters the weapon active phase and shows the cooldown indicator.
- [x] Red Pencil active hitbox damages DANN-E Colossus, whose weakness is `red_pencil`.
- [x] DANN-E Colossus reaches `defeated`.
- [x] Volume assembly advances from 0/5 to 1/5 after the boss-tier DANN-E defeat.
- [x] `window.render_game_to_text()` reports active enemy count, HP, and `volumeAssembly`.
- [x] HUD remains readable at 375 x 667.

## Evidence

- `docs/screenshots/mobile-danne-volume-parity/combat-touch-before.png`
- `docs/screenshots/mobile-danne-volume-parity/combat-cooldown-visible.png`
- `docs/screenshots/mobile-danne-volume-parity/volume-piece-award.png`
