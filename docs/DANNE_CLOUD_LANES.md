# Cloud spread: warnings that match the attack

## Observed problem

Cloud spread angles used the boss's feet as their origin and built a synthetic
48-pixel target. The shared projectile function then launched ten pixels above
that origin. The resulting shot direction differed from the warned center ray,
and the warning showed only one lane for three projectiles.

## Change

`bossSpreadTargets` computes endpoints from the actual muzzle. Both the Cloud
warning and fired spread use those endpoints. Three short dotted lanes now show
the fan before it fires; cyan corners still mark the teleport destination. The
player's position is captured when the warning locks, not tracked afterward.
The shared spread-origin correction also applies to Ascendant's existing fan.

No changes to HP, damage, speed, attack timing, tool windows, rewards, or saves.
No new asset or dependency. Positions are snapped for rendering; movement keeps
its existing unrounded integration. Runtime telegraph reporting includes `lanes`.

## Evidence

- Build passes: 249 modules / 2,787.41 KB main JS; existing chunk warning only.
- 186 test files / 1,361 tests pass. New checks cover four aim directions,
  symmetry/speed, exact fired-to-warning alignment, and moving after aim locks.
- Earned-save simulated-touch fight completes in 84.432 seconds with one Cloud
  retry, no missed deadline, unchanged documents/points, and successful bindery
  Continue. Browser errors: none. This is not evidence of real-iPhone performance
  or a controlled improvement in completion time.
- Installed game-client actual boss-entry native/compositor captures inspected.
  The direct WebGL screenshot limitation remains; native capture shows gameplay.
- Keyboard also completes all phases and Continue: 76.564 seconds, one Cloud
  retry, no missed deadline or document/points changes. Fourteen scene routes
  and their pause/map checks pass. No browser errors in either full fight or
  the scene checks.

Run `tools/qa-boss-counter-loop.mjs --mobile --disperse --cloud-warning` with
`FRUS_QA_STORAGE` set to an earned Black Vault entry save and `FRUS_QA_OUT` set
to an output directory. Omit `--mobile` for keyboard. Existing Playwright/browser
environment overrides remain supported. The new option captures an actual live
Cloud Shift and checks that all three distinct warning endpoints are reported.

Screenshot: `screenshots/danne-cloud-three-lanes-touch.png`.

## Remaining play-feel question

The clearer warning does not eliminate retries. Investigate retreat/repositioning
and whether a first-time player understands the short counterattack window.
Do not declare the complete fight balanced on the basis of a scripted win.
Local work only; no deployment in this pass.
