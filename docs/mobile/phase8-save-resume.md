# Mobile SNES Quality Phase 8: Save and Resume

## Scope

- Added a versioned save payload for the current scene, player position, facing, profile, inventory, tools, process stamps, document workflow, room traversal, and quest flags.
- Added `localStorage` autosave with `sessionStorage` fallback when browser privacy or quota rules reject persistent storage.
- Added autosaves on scene transitions, `pagehide`, `visibilitychange -> hidden`, and every 30 seconds during active play.
- Added a boot Continue/New Game choice when a save exists.
- Added a full-screen tap-to-resume overlay after backgrounding, so mobile browsers resume gameplay and audio from a trusted user gesture.
- Added `window.rubyRuleSaveDebug()` for QA.

## Save Schema

Current schema version: `1`

Storage key: `rubyRuleFrusQuestSave`

The restore path sanitizes transient dialog/choice/pause modes back to gameplay and clears active transition effects before starting the saved scene.

## Verification

| Probe | Result |
| --- | --- |
| `npm run build` | passed |
| Required web-game client smoke | passed, no error artifacts |
| Pagehide save | saved `ArchiveScene`, Compiler profile, Citation Stamp, document points, and player position |
| Continue | restored `ArchiveScene`, profile, inventory, process stamps, document points, and mode `explore` |
| Non-default position restore | restored player to `{ x: 166, y: 177 }`, facing `east` |
| New Game | cleared save slot and landed on `TitleScene` |
| Tap-to-resume | overlay appeared after simulated background/foreground and hid after tap |

Playwright screenshot capture logged Chromium `ReadPixels` performance warnings only; page errors were zero.

Evidence files:

- `docs/screenshots/mobile/phase8-web-game-client/`
- `docs/screenshots/mobile/phase8-save-resume/probe.json`
- `docs/screenshots/mobile/phase8-save-resume/nondefault-position-probe.json`
- `docs/screenshots/mobile/phase8-save-resume/new-game-probe.json`
- `docs/screenshots/mobile/phase8-save-resume/continue-menu.png`
- `docs/screenshots/mobile/phase8-save-resume/after-continue.png`
- `docs/screenshots/mobile/phase8-save-resume/after-nondefault-position-continue.png`
- `docs/screenshots/mobile/phase8-save-resume/tap-to-resume-visible.png`
- `docs/screenshots/mobile/phase8-save-resume/after-tap-resume.png`
