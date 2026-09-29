# Quiet research-desk navigation feedback

Keyboard and controller focus changes now trigger a short original sine cue through the existing effects mixer. Opening, restoring focus, scrolling a long card, pointer selection, and closing do not add a navigation sound. The cue differs from paper editing, filing approval and warning sounds. A 75ms rate limit prevents rapid navigation from stacking cues; locked, hidden and muted states produce no deferred sound.

286 files / 2,126 tests, typecheck and production build passed. Actual native desk navigation on desktop, portrait phone and landscape passed focus/audio dispatch, silent reading scroll and open/close, effects mute and cleanup, no packet filing or hero movement, and reading-mix restoration. Final phone compositor inspected. Standard client ArchiveScene state inspected; black native capture limitation remains.

Offline rendering of the actual cue measured peak 0.01724 and zero tail after 100ms; waveform stored at /tmp/frus-desk-navigation/desk-focus.wav. This is synthesis/routing evidence, not human listening approval or physical controller testing. Initial dev check imported an audio singleton separate from the HMR-updated game; repeated on a fresh dev server. The fixture now uses the real scene resume callback on close so its mix assertion represents actual gameplay lifecycle.
