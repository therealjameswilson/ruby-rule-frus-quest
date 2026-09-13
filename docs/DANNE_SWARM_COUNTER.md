# Red Pencil swarm counter

The Black Vault swarm now offers an optional space-clearing decision: use the
Red Pencil to disperse satellites, or keep concentrating on returned Ego bolts
and the main core. This replaces invincible satellite hazards with tool-specific
counterplay. No workflow decision, save schema, reward, or publication gate changes.

## Rules

- Four satellites start at distinct positions around the core.
- An owned tool's active swing can hit a satellite. Red Pencil disperses it in
  one strike; another owned weapon stuns it for 650 ms without defeating it.
- A swing affects a given satellite once. Windup, cooldown, and unowned tools
  cannot hit. A successful counter takes priority over same-frame contact.
- Stunned satellites stop moving and firing; pausing preserves their stun.
- Contact uses overlapping feet rectangles, not proximity through empty space.
- Dispersal grants no points, documents, inventory, or main-boss damage. The
  armored core still needs a returned bolt and a fresh strike during its opening.
- Retry respawns the phase's satellites. `minisDispersed` is runtime telemetry,
  not a saved collectible or a farmable completion reward.
- The objective changes from `PENCIL CLEARS MINIS` to `RETURN EGO BOLTS` when
  all four are gone. Normal phase completion remains available without dispersal.

## Verification

- Production build: 249 modules, 2,787.13 KB main JS, existing chunk-size warning.
- Full suite: 186 files / 1,356 tests pass, including nine new satellite cases.
- Real-input replays use saves earned through the preceding chapter, not injected
  boss progress. Both keyboard and 375x667/DPR3 simulated touch disperse all four.
- Touch completes all three boss phases in 91.778 seconds with one Cloud retry;
  no missed deadline, no changed document candidates or points. Bindery Continue
  preserves inventory and boss counts. This is not a real-iPhone performance claim.
- Keyboard completes in 77.682 seconds with one Cloud retry and the same
  progression/Continue checks. Both full-fight runs report no browser errors.
- Fourteen scene routes plus pause/map checks pass with no browser errors.
- Installed browser client checks the earned vault entry; native and compositor
  captures are used because its direct WebGL buffer screenshot is black.

Reproduce with the repository's existing Playwright runtime:

```sh
FRUS_QA_STORAGE=/path/to/earned-storage.json \
FRUS_QA_OUT=/tmp/frus-swarm-touch \
node tools/qa-boss-counter-loop.mjs --mobile --disperse
```

Omit `--mobile` for keyboard. The script accepts `PLAYWRIGHT_MODULE`,
`CHROMIUM_EXECUTABLE`, and `FRUS_QA_URL` overrides. It checks pause during a
core opening, fresh-strike damage, safe retry, reward invariants, and Continue.

Retained evidence: `screenshots/danne-swarm-before.png` and
`screenshots/danne-swarm-cleared-touch.png`. The touch baseline also needed one
Cloud retry; do not interpret this change as proving an easier complete fight.
Next assess Cloud's side-perch approach, novice reaction time, and the final
binding ceremony. The overall adventure/fun goal remains active. Local only.
