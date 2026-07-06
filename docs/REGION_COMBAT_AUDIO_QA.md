# Region and Combat Audio QA

Date: 2026-07-06
Branch: `codex/region-combat-audio`

## Track Registry

The live music system uses repo-local Web Audio oscillator arrangements derived from the public-domain MIDI stems in `public/assets/audio/midi/`:

- `bach-contrapunctus-i.mid`
- `bach-chromatic-fantasy-bwv903.mid`
- `satie-ogive-no2.mid`

`window.rubyRuleAudioDebug()` exposes the active track key, title, source note, and MIDI stem path.

## Scene Coverage

- Office hub: `Office Hub Contrapunctus`
- Archive/Guide dungeon: `Archive Dungeon Chromatic`
- Two Networks dungeon: `Two Networks Fugue`
- Referral Vault dungeon: `Referral Vault Ogive`
- Silent Read dungeon: `Silent Read Chromatic`
- Black Vault ambient: `Black Vault Lair`
- DANN-E miniboss rooms: `DANN-E Miniboss Queue`
- DANN-E combat / boss: `DANN-E Combat Chromatic`
- Ending: `Published Volume Fanfare`

## Verification Checklist

- [x] `OfficeScene` starts `officeHub`.
- [x] `GameplayMapScene?map=nara_stacks` starts `danneMiniboss` while DANN-E enemies remain active.
- [x] `GameplayMapScene?map=black_vault` starts `danneCombat` while Black Vault DANN-E enemies remain active.
- [x] Defeating all Black Vault `DanneEnemy` instances crossfades back to `blackVault`.
- [x] `EndingScene` starts `endingFanfare`.
- [x] The `N` key sound toggle still disables and re-enables music without changing the selected scene track.
- [x] `npm run build` passes.

## Probe Output Summary

- Office: `currentThemeKey = officeHub`, stem `assets/audio/midi/bach-contrapunctus-i.mid`.
- NARA DANN-E room: `currentThemeKey = danneMiniboss`, stem `assets/audio/midi/bach-contrapunctus-i.mid`.
- Black Vault combat: `currentThemeKey = danneCombat`, stem `assets/audio/midi/bach-chromatic-fantasy-bwv903.mid`.
- Black Vault after forced room clear: `currentThemeKey = blackVault`, stem `assets/audio/midi/bach-chromatic-fantasy-bwv903.mid`.
- Ending: `currentThemeKey = endingFanfare`, stem `assets/audio/midi/satie-ogive-no2.mid`.
- Toggle check: `enabled=true/musicTimerActive=true` -> press `N` -> `enabled=false/musicTimerActive=false` -> press `N` -> `enabled=true/musicTimerActive=true`.
