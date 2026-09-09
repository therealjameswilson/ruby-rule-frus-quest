# Earned Black Vault Audit

September 9, 2026. Continued the actual desktop and simulated-touch Editor
completion saves from the release-scope playthrough. No debug tool grants,
boss-health edits, scene jumps or clearance flags were injected.

## Results

| Route | Fight time | Retry | Fresh core hits | Deadline missed | Final reliability |
| --- | --- | --- | --- | --- | --- |
| Keyboard, revised approach | 83.911 s | 1 | 9 | No | 100 |
| Touch, 375x667 DPR 3 | 103.459 s | 1 | 7 | Yes | 94 |

Times include scripted movement, state sampling and screenshot overhead; these
are not first-player speed or device-performance benchmarks. Both routes clear
Colossus, Swarm and Cloud, disperse satellites with real swings, preserve
records and 201 document points, and count each defeated phase once. Continue
in the bindery preserves inventory and defeat counts. No browser errors.
Entering the bindery is not completing its publication work.

An earlier keyboard run completed in 88.379 seconds with one retry. The initial
touch attempt failed the test after its core opening expired: the old script
walked into the boss rather than stopping at Red Pencil reach, then asserted
damage even though the core had closed. This failed attempt is not a pass.

## Replay Correction

`tools/qa-boss-counter-loop.mjs` now approaches Colossus from y=145, within
Pencil reach, rather than y=130 overlapping the sprite. It requires at least
one fresh melee hit independent of returned-bolt damage across the full route.
It distinguishes approaches with less than 600 ms left from clear open-core
hit opportunities; it no longer labels an already-expired opening as a combat
regression. The low-budget counter is named `tightApproaches` (the captured
runs used its earlier label `expiredApproaches`: desktop 0, touch 1).

No production gameplay, input, damage, timing or save code changed in this audit.
The installed web-game client also continued the earned entry, physically
started the encounter and captured its opening. Native and mobile compositor
screenshots were inspected. The replay passes JavaScript syntax checking.
The preceding production build and 1,429-test verification remain unchanged;
they were not rerun for this tooling/documentation-only checkpoint.

## What Still Needs Work

1. Cloud attack warnings need stronger visual separation from the room's red
   decoration. The captured warning has dim, disconnected dots and a faint
   destination bracket during its low-alpha pulse. Preserve all three lanes,
   but make their origin, direction and destination readable throughout.
2. Touch completed with little margin and a missed deadline after one retry.
   Evaluate the deadline alongside ordinary learning/retries; do not silently
   remove standards consequences or make boss HP easier to satisfy automation.
3. The player and boss overlap visually during close approaches. The corrected
   route demonstrates reach is sufficient without that overlap, but the game
   should communicate the strike distance better to a new player.
4. Phase boast lines are held for 1,150 ms in `showPhaseCutscene`, regardless of
   length. Review their readability without adding long interruptions to combat.

Next implementation priority: improve Cloud warning contrast and motion
readability, then replay these same earned routes. Preserve the current return,
fresh-strike, recoverable-pressure and publication-readiness rules.

## Evidence

- `screenshots/earned-vault-cloud-touch.png`: Cloud warning on simulated touch.
- `screenshots/earned-vault-opening-native.png`: installed client opening.
- Local full results: `/private/tmp/frus-earned-vault-desktop-rerun-0909/` and
  `/private/tmp/frus-earned-vault-touch-rerun-0909/`.

Local only. No real iPhone/Safari, secret Ascendant route, first-time usability,
locked-60-fps performance, deployment or whole-game completion claim.
