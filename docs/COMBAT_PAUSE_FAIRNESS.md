# Combat Pause Fairness

Local playability pass, September 5, 2026. No save-schema, reward, room-clear,
renderer, source-art or publication-gate changes.

## Reproduced Problems

- Black Vault guards kept moving and completed ink sweeps behind menus. In the
  baseline 2.4-second pause, the left guard moved from (87,178) to (108,150), and
  the right from (169,178) to (148,150). Their animation frames also advanced.
- Expansion-map encounters stopped calling their combat update, but their Arcade
  bodies and sprite animations remained active.
- Player swing, hurt and invulnerability deadlines used scene time, which keeps
  advancing during in-scene overlays. A paused swing could also outlive an
  enemy's hit cooldown and connect a second time on return.
- The guard's 240 ms warning was shorter than a full sideways escape at the
  player's movement speed. Its curved effect did not show the actual hitbox.

## Changes

- `CombatClock` subtracts paused intervals without changing the scene-time origin.
  Player swings, recovery, invulnerability, ability frames and blinking use it.
- Expansion DANN-E enemies freeze their physics bodies, animation, owned tweens,
  projectile travel/lifetime, hit immunity, stun and attack deadlines. Resume
  restores the previous body movement setting. The next-wave delay also pauses.
- Drone and wraith animations and existing hit-flash tweens stop with combat.
  Their shared hit cooldown excludes pause time and rejects hits while paused.
- Wraiths stop patrol, warning and swipe resolution during overlays. The warning
  is now 550 ms, the damaging window 170 ms, and recovery 300 ms. A floor rectangle
  matches the sweep's collision bounds: gold warning, red active, faint recovery.
  The rectangle is destroyed when the guard dies or the boss intro removes it.
- DanneMapScene accepts ability/swing input only after overlay, dialogue,
  boss-decision and cutscene handling. Closing a modal cannot queue a new swing.
- Existing QA state now includes wraith HP and phase-specific warning time, and
  expansion-enemy melee telegraphs. Existing final-boss pause handling is retained.

## Verification

- Full Vitest suite: 161 files, 1,025 tests pass. Focused coverage includes all
  three tool timelines, player recovery, enemy/projectile freeze, retained hit
  cooldown, wraith warning/active/recovery, defeat and effect cleanup.
- TypeScript and production build pass: 224 modules; main JS 2,708.56 KB versus
  the preceding 2,705.22 KB. The pre-existing large-chunk warning remains.
- Chromium keyboard and 375x667/DPR-3 touch: pause a Black Vault warning for
  3.2 seconds, resume, retreat outside it without a hit, pause a player swing,
  resume its remaining frames, close a later menu without an accidental swing,
  then deliberately swing again. Positions, frames, HP and deadlines stay fixed.
- Expansion Embassy, NARA and Black Vault encounters pass 2.4-second freeze and
  resume checks, including moving actors, turret/projectile state and restored
  Arcade movement, on desktop and touch.
- Earned-tool NARA touch fixture: warning pause -> dodge -> contact stagger ->
  first tool hit -> second hit defeats a drone. Reliability remains 100 because
  these existing stamps stagger rather than impose a standards violation.
- Final-boss touch regression: a 255 ms cannon warning stays at 255 ms through
  pause. After resume, a deliberate Red Pencil strike reduces HP from 180 to
  152. This test also intentionally stands in an Ego bolt and takes 10 pressure
  damage after resuming; it is not a no-damage boss playthrough.
- All fourteen primary/expansion debug scenes render nonblank, open the Map
  page where playable, and close back to exploration without page/console
  errors. The required game client also reaches Black Vault with valid state
  and no captured errors, though its direct-buffer screenshot is black.
- Background/resume regression with synthetic visibility events: tapping the
  resume shield over touch B does not swing; the next intentional B tap does.

## Manual Replay

1. Open `?scene=BlackVaultLairScene`, approach either guard, then open M/Start
   during its gold warning. Wait, close with Escape/the X button, and retreat
   out of the rectangle. The other guard is still a separate threat.
2. Swing with X/touch B, open the menu during windup, wait, and close it. Only
   the original swing should finish. The next intentional swing still works.
3. Open `?scene=GameplayMapScene&map=embassy`, then the `nara_stacks` and
   `black_vault` map variants. Pause moving enemies/projectiles and resume.
4. Continue an earned NARA save and defeat a drone with two review-tool hits.

## Evidence And Limits

Retained captures are in `docs/screenshots/combat-pause-*.png`. Detailed local
logs are under `/private/tmp/frus-combat-freeze-*`,
`/private/tmp/frus-combat-final-nara-mobile` and
`/private/tmp/frus-combat-boss-pause-mobile`.

An initial lateral dodge escaped one guard but entered the second guard's
warning. That failed replay is not called a pass. The verified retreat leaves
the marked area; attack damage and the second guard were not disabled.

Debug combat routes grant test readiness. Only the NARA fixture uses previously
earned tools; neither is a fresh complete-game replay. Simulated Chromium touch
is not real iPhone/Safari or locked-60-fps certification. Direct WebGL-buffer
captures from the required client can be black; inspected renderer/compositor
captures provide visual evidence. No public deployment occurred in this pass.

Next: quieter Black Vault interaction prompts, consistent readable enemy art,
remaining codex layouts, and fresh-run pacing plus real iPhone testing.
