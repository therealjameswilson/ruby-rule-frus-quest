# Phase 5 - Touch UI and HUD

Date: 2026-06-12

## Scope

- Dialogue boxes now accept tap-to-advance through the shared input state instead of direct scene keyboard reads.
- Long-press on the dialogue panel fast-forwards the active dialogue sequence.
- The manuscript inventory now opens as a pause-mode modal with a dimmed background, explicit close target, outside-dismiss behavior, and tappable tool slots.
- HUD, dialogue, inventory, and objective text are fixed to the camera with `setScrollFactor(0)` so they remain anchored during scene movement.
- Touch controls are hidden while the inventory modal is active, but their pointer routing still handles modal taps.

## Verification

Automated touch probe:

- Dialogue first tap advanced from "Good to compare notes, Ruby." to "Same rank, same burden: make the volume reliable."
- Dialogue long press returned the game to `explore` mode.
- Inventory opened in `pause` mode.
- Locked tool tap produced `Tool not in the folder yet.`
- Close tap returned the game to `explore` mode.
- Acquired tool tap equipped `clearance_token`.
- Input latency probe recorded 11.2 ms.
- No console errors were recorded.

Device screenshots:

- `docs/screenshots/mobile/phase5-iphone14pro-portrait.png`
- `docs/screenshots/mobile/phase5-iphone14pro-landscape.png`
- `docs/screenshots/mobile/phase5-pixel7-portrait.png`
- `docs/screenshots/mobile/phase5-pixel7-landscape.png`

Interaction artifacts:

- `docs/screenshots/mobile/phase5-dialog-touch-before.png`
- `docs/screenshots/mobile/phase5-dialog-touch-after-tap.png`
- `docs/screenshots/mobile/phase5-dialog-longpress-after.png`
- `docs/screenshots/mobile/phase5-inventory-open.png`
- `docs/screenshots/mobile/phase5-inventory-tool-tap.png`
- `docs/screenshots/mobile/phase5-inventory-close.png`
- `docs/screenshots/mobile/phase5-inventory-equip-acquired.png`
- `docs/screenshots/mobile/phase5-touch-ui-recording.webm`
- `docs/screenshots/mobile/phase5-web-game-client/shot-0.png`
- `docs/screenshots/mobile/phase5-web-game-client/shot-1.png`

## Notes

- The modal keeps the base 256x240 layout intact; touch hit zones are larger than their visible pixel-art controls.
- The inventory remains deliberately compact so the play area does not become a mobile-only layout fork.
- Browser profiles in the automated matrix used Playwright viewport emulation, not physical devices.
