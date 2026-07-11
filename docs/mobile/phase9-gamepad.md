# Phase 9: Bluetooth Gamepad Support

Date: 2026-06-12

## Scope

- Added Phaser gamepad input support while preserving the existing keyboard and touch paths.
- Centralized gamepad polling inside `src/input/InputState.ts`.
- Added a gamepad connection listener so UI code can respond without reading browser input directly.
- Auto-hides the touch overlay when a controller connects and restores it when the controller disconnects.
- Added a brief UI toast for controller connect/disconnect events.
- Added `window.rubyRuleGamepadDebug()` for QA probes and mobile debug HUD readout.

## Mapping

- D-pad: move up/down/left/right.
- Left stick: cardinal movement with the same deliberate 4-way feel as touch controls.
- Button 0: A / interact.
- Button 1: B / cancel or secondary action.
- Button 2: ability/tool.
- Button 8: Select.
- Button 9: Start / menu.

## Verification

- `npm run build` passes.
- Automated Playwright probe uses a mocked `navigator.getGamepads()` object to verify:
  - controller connection is detected,
  - right input maps to `direction: "right"`,
  - button 0 maps to A,
  - touch controls are suppressed while a controller is connected,
  - touch controls return after disconnect on a touch-capable viewport.

## Real-Device Note

This phase is wired for Bluetooth controllers, but physical iOS/Android controller QA still belongs in Phase 10's device matrix.
