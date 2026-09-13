# NARA Patrol Room

## Playtest Findings

The entry room had four permanent DRONE labels, duplicate floor/interaction
labels, a second location card, and a note drawn at (128,92) while its actual
hotspot was (128,178). The fragment stayed visible and interactive after being
collected, including after Continue. It could also be reached directly from the
entrance aisle, so the apparent exploration reward barely used the room.

In the live pause test, drone 1 moved from x135 to x91 and drone 3 from y162 to
y107 while the map was open. Stamp bounds ended one pixel above the player's
stationary feet, making contact less predictable than the drawing implied.

## Changes

- One readable room title, simple shelf numbers, quiet aisle markings, and no
  permanent enemy-name labels. A small temporary exclamation appears during
  windup, separated from the damaged-enemy HP bar.
- Note and fragment art are positioned from the interaction definitions.
  Generic duplicate markers and floating text banners are absent in NARA;
  a local outline/A badge plus the existing HUD names the nearest action.
- The note gives two short, repeatable hints without stopping play. It does
  not award a review, grant a tool, or reveal the secret by itself.
- Fragment I is now at (166,64), in the walkable upper aisle. Its 18-pixel
  interaction radius requires reaching that aisle past the patrol crossings.
  The stairs remain freely usable. This is an optional recovery, not a new
  compulsory gate or a requirement to defeat all four enemies.
- Collecting the fragment removes its paper, frame, and interaction target,
  plays the existing pickup cue, saves the existing inventory item, and gives a
  short toast. Continue and repeat attempts cannot duplicate it. The QA entity
  list also stops claiming that the collected paper remains in the room.
- Stamps use the existing telegraph timing helpers: 400 ms warning, 600 ms
  contact window, 180 ms fade, and the existing 1,700 ms attack interval.
  The gold warning and black/red active bar share the same 30x8 floor bounds,
  centered on the feet at player.y + 1. Moving out before impact avoids contact.
- Shelves block targeting through Phaser's line/rectangle intersection test;
  targeting reads current geometry when the secret shelf opens, not a stale wall.
  Patrol and stamp timers advance only during active play, preserving the
  remaining warning across a pause. No queued attack lands behind the map.
- Drone HP and the current stamp phase, position, and remaining time are
  exposed through the existing visible-threat QA schema. No save schema change.

The existing contact consequence is deliberately preserved: a stagger/knockback
with player invulnerability, not an invented permanent standards violation or
reliability debit. Drones still take two registered tool hits. The Review Folder
shelf and hidden first-edition reward are unchanged and separately verified.

## Verification

September 5, 2026, local production preview:

- Keyboard and 375x667/DPR-3 touch: entry, note, both aisle crossings, upper
  fragment, repeat input, Continue, and physical return to Archive. No blocking
  dialogue; one fragment; reliability and document points unchanged.
- Separate actual-input combat checks on both viewports: pause during windup,
  hold for 2.2 seconds, unchanged patrols and warning time, resume/dodge, remain
  for a later contact and observe stagger, damage a drone, then defeat it.
- Touch secret regression: wrong tool, Review Folder reveal, Continue, physical
  entry, hidden-room pause/map, first-edition pickup, Continue, matching shelf
  return, repeated pickup rejection, and Archive return. Points 201 -> 226 once.
- Fourteen existing scene-debug routes rendered nonblank without page/console
  errors. These are scene-load checks, not fourteen completed playthroughs.
- 155 Vitest files / 981 tests pass; TypeScript and production build pass.
  New tests exercise the real drone update/hit loop and note/reward handlers,
  with renderer stubs; geometry-library behavior is checked in browser play.
  Main JS: 2,711.70 KB uncompressed, 221 modules. Existing chunk-size warning.

The earned pre-boss save is a bounded QA fixture: only starting scene, position,
facing, and traversal are changed to reach NARA. Tools are already earned, not
granted for these tests. This is not a new Title-to-ending completion claim.

Evidence directories:

- `/private/tmp/frus-nara-before-desktop`: reproduced original problems.
- `/private/tmp/frus-nara-final-desktop`: upper-aisle keyboard pickup/Continue.
- `/private/tmp/frus-nara-verified-mobile`: touch pickup/Continue.
- `/private/tmp/frus-nara-combat-final-desktop`: keyboard combat and pause.
- `/private/tmp/frus-nara-combat-mobile-recheck`: isolated touch combat/pause.
- `/private/tmp/frus-nara-passage-regression-mobile`: hidden-room regression.
- `/private/tmp/frus-nara-passage-verified`: direct-swing keyboard regression
  with current collision geometry after the shelf opens.
- `/private/tmp/frus-hearing-scene-smoke`: refreshed fourteen-route load checks.
- `/private/tmp/frus-nara-collision-required`: final required game-client run.

One synthetic 1 ms key press was not sampled; ordinary 45 ms presses passed.
One touch dodge under concurrent browser load failed; an isolated rerun passed.
Neither result is a real-device latency/performance certification. Required
client direct WebGL-buffer images remain black in headed/headless runs; opened
compositor and native in-frame snapshots are the visual evidence. No speculative
renderer changes were made.

Retained images: `screenshots/nara-patrol-before.png`, `nara-patrol-after.png`,
`nara-upper-fragment.png`, and `nara-fragment-touch.png`.

## Remaining Work

Local checkpoint only; no public deployment or iOS project changes. The broad
fun/adventure goal remains open. Next audits should address pause-menu density,
pause-time accounting, other legacy enemies' overlay behavior, very brief input
edges, transition stalls, and actual iPhone Safari play/performance. The current
drone sprite scale and mixed room-art fidelity still deserve a separate art pass.
