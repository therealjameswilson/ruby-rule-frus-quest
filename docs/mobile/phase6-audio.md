# Phase 6 - Audio Lifecycle

Date: 2026-06-12

## Scope

- Kept the project on oscillator-only Web Audio. No external audio assets or runtime dependencies were added.
- Explicitly configured Phaser with `audio.disableWebAudio: false`.
- Added an audio preparation step in `BootScene` that registers lifecycle listeners without playing audio or creating an `AudioContext`.
- Hardened `RetroAudio` with:
  - first-gesture unlock and silent buffer/oscillator prewarm
  - a shared master gain node for all music and SFX
  - queued score start for deep-linked scenes until the first user gesture
  - same-theme music continuity across scene changes
  - pause/suspend on backgrounding
  - resume/fade-in on foregrounding
  - state-change handling for iOS-style interrupted audio contexts
  - debug readout at `window.rubyRuleAudioDebug()`

## Verification

Build:

```bash
npm run build
```

Result: passed. Vite reports the existing large Phaser chunk warning only.

Audio probe:

- `docs/screenshots/mobile/phase6-audio-probe.json`
- `docs/screenshots/mobile/phase6-audio-recording.webm`

Confirmed behavior:

- Before tap: `TapToStartScene`, `audioStatus: oscillator score prepared`, no `AudioContext` created.
- First tap: `TitleScene`, `contextState: running`, `musicTimerActive: true`, `firstUnlockMs: 2.9`.
- Same-theme transition: `CharacterCreateScene` kept `currentThemeKey: title` and continued the score.
- Hidden: context suspended, music timer stopped, `hiddenPaused: true`.
- Visible: context resumed, music timer restarted, `hiddenPaused: false`.
- Probe finished with zero console/page errors.

Device-profile screenshots:

- `docs/screenshots/mobile/phase6-audio-iphone14pro-portrait.png`
- `docs/screenshots/mobile/phase6-audio-iphone14pro-landscape.png`
- `docs/screenshots/mobile/phase6-audio-pixel7-portrait.png`
- `docs/screenshots/mobile/phase6-audio-pixel7-landscape.png`
- `docs/screenshots/mobile/phase6-audio-device-matrix.json`

All four Playwright device profiles reported `contextState: running`, `musicTimerActive: true`, integer zoom, and zero console/page errors after the first tap.

Standard game-client regression:

- `docs/screenshots/mobile/phase6-web-game-client/shot-0.png`
- `docs/screenshots/mobile/phase6-web-game-client/shot-1.png`
- `docs/screenshots/mobile/phase6-web-game-client/state-0.json`
- `docs/screenshots/mobile/phase6-web-game-client/state-1.json`

In-app browser smoke:

- Local preview loaded at `http://127.0.0.1:5194/`.
- Title: `Ruby Rule: The FRUS Quest`.
- Console error check returned zero errors.

## Notes

- This phase uses Playwright device profiles, not physical iPhone/Pixel hardware. Real-device audio latency and interruption QA remains Phase 10 work.
- The `AudioContext` is intentionally not created during `BootScene` preparation; it is created and resumed only from the first gesture.
