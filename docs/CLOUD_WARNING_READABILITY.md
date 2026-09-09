# Cloud Warning Readability

September 9, 2026. The earned Black Vault audit found low-alpha dotted warnings
hard to distinguish from red room decoration. Cloud now draws three continuous
cream pixel paths with gold arrowheads and dark outlines. Cyan corners still
mark its next perch. Low-pulse opacity stays at 0.85 instead of 0.34.

## Gameplay Boundary

The same `bossSpreadTargets` supplies warning endpoints and actual spread
directions. Paths lock to the player's position when the warning begins, not
after the player dodges. Source/muzzle coordinates, spread angles, warning
duration, cooldowns, health, damage, return window and publication clock are
unchanged. Other phases retain their existing markers and pulse behavior.

`cloudWarningGeometry` rasterizes lines and arrowheads on integer coordinates
once per warning. One Graphics object replaces the eighteen separate Cloud
lane dots; existing brackets and muzzle remain. The graphic is destroyed with
the warning on firing, interruption or cleanup. No new assets or dependencies.

## Verification

- Build passes: 255 modules, main JavaScript 2,801.01 KB (+0.98 KB).
- Full suite: 193 files / 1,433 tests pass. New tests check three continuous
  integer-pixel paths, exact rounded endpoints, low-pulse visibility and cleanup.
  Existing tests verify that moving after lock does not retarget actual bolts.
- Earned keyboard route clears Colossus, Swarm and Cloud in 61.25 seconds with
  no retries and six fresh melee hits. Reliability recovers to 100, deadline is
  unmissed, 201 document points and source records remain unchanged. Continue
  in the bindery preserves rewards. No browser errors.
- Installed game client opens the earned encounter with physical input;
  its native capture was inspected. Full-route captures cover Cloud itself.
- Normal touch counter route at 375x667 / DPR 3 completes in 70.651 seconds,
  with one Cloud retry, eight fresh melee hits and no missed deadline. Starting
  reliability 98 is preserved after recoverable combat pressure; source records,
  201 points and one-time rewards survive Continue. No browser errors.

The initial optional satellite-stress touch run reached Swarm with 8 reliability
and exhausted it before dispersing a satellite. Its assertion failed before
Cloud. This is recorded as a failure, not evidence about the new warning.

## Screenshots

Before: `screenshots/earned-vault-cloud-touch.png`.
After: `screenshots/cloud-warning-bright-touch.png` and
`screenshots/cloud-warning-bright-desktop.png` (native resolution).
Both after captures show separate locked trajectories, readable arrowheads and
the next-perch corners. The source art and scenery were not replaced.

## Remaining Scope

The warning's improved visibility is supported by inspected screenshots, not
proof of first-time usability or a measured increase in player success. Replay
times include automation and capture overhead. Deadline margin, close-range
sprite overlap and short phase-boast reading time remain separate concerns.
No real-iPhone/Safari, locked-60-fps, public deployment or full publication claim.
