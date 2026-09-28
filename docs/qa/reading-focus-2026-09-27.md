# Consistent reading audio

Canvas dialogue, choices/review boards and the Codex now acquire the same temporary reading mix as native desks. The UI owns one lease across frames and releases it when reading ends, UI hides, or UIScene shuts down. Existing native-desk leases coexist without compounding attenuation. Player mix preferences and effects volume are unchanged.

Validation:
- 282 files / 2,116 tests pass; final production build passes. Unit coverage checks one lease across dialogue/choice/Codex and release on hidden UI, alongside existing audio ownership/preference tests.
- New `tools/qa-reading-focus.mjs` uses the runtime-loaded Vite audio module, live AudioContext and real UI updates with bounded modal fixtures. Ten checks passed: .8 exploration → .36 reading; nested native/canvas .36; both closed .8; changed preference .6 → .27 reading → .6 restored; music0 stays0; UIScene shutdown releases to.8. Effects/master preferences remain1. No page errors.
- Initial harness imported an unversioned duplicate of the live audio module, then a headless output device left its audio clock stationary. Resolved harness to load the already-requested module URL and use Chromium's silent audio output, matching existing mix QA. These were harness corrections, not claimed runtime audio fixes.
- A TypeScript fixture intersection was corrected with the existing scene-test cast convention. Final build passed after correction.
- Canvas-review compositor screenshot inspected. Standard game client Archive movementx140/explore; native capture remains black, compositor evidence used.

Evidence `/tmp/frus-reading-focus-0927/`. Digital gain/lifecycle verification only; no listening approval or physical-device claim. Local only.
