# Referral Walking Guide

## Change

The active R1 walking guide previously destroyed and recreated target/dot
objects while leaving their references in the room's tracked-object list.
It now clears and redraws one Graphics object, released on room exit.
Furniture-aware routing, interaction ranges, human approval, rewards and
save data are unchanged. Dots use integer edges below character depth.

## Verification (2026-09-09)

- Build passed: 251 modules; main JavaScript 2,794.67 KB. Existing chunk-size
  warning remains.
- Full suite passed: 188 files, 1,382 tests.
- Earned-save keyboard and simulated-touch playthroughs both reached the
  Editor from Referral. Touch used 375x667 at DPR 3, not physical Safari.
- Both exercised equity handoffs, wrong-station recovery, source-copy
  retrieval, shelf-crank shortcut, draft edits, explicit filing, treatment
  handoffs, Concurrence Slip pickup, Continue and backtracking.
- Both recorded zero console/page errors. R1 tracked objects ranged from
  34 to 39 with at most one guide across 25 checkpoints per run.
- QA now checks the room and transition lock alongside collision geometry:
  an earlier failure combined the previous room's route with the next
  room's geometry. This was a test race, not a game softlock.
- Installed game client ran separately via the Referral debug entry.
  Native and compositor screenshots were inspected. This debug run shows
  the initial batch state, not the completed earned-save route.

Evidence retained in docs/screenshots/referral-guide-touch-review.png and
docs/screenshots/referral-guide-native.png. Full route artifacts are local
under /private/tmp/frus-referral-guide-{desktop,touch}-0909/.

## Remaining Work

No measured FPS improvement or whole-game fun claim follows from this fix.
Next, play the earned Editor route and assess whether its decisions and
movement differ enough from Referral's repeated workstation handoffs.
The older unused concurrence-guide implementation was not changed.
