# Annotation Return Cart

The Annotation Stacks now has a physical task distinct from the preceding
free-order source-clue search: push a loaded document cart into the cyan return
bay, then collect its context note. The side aisles remain freely explorable.

## Rules and recovery

- Each interaction pushes one 16px step away from the player's feet.
- The marked lane contains eight valid positions, all with a route to the bay.
- A wrong push costs nothing. There is no timer or permanent trap.
- Cart collision moves with its visual. Pushing works at actual feet contact;
  browser testing caught and corrected an overly restrictive distance check.
- Position and parked state use existing sceneProgress save fields. Continue
  retains partial movement. Previously earned context notes imply a parked cart.
- Older player positions inside the new obstacle recover to a safe position.
- Parking awards no points and does not collect or approve the note. Explicit
  collection and the existing human filing decisions remain required.

The cart uses original, pixel-sized drawing primitives and the existing room
palette. No external assets, renderer changes or save-schema migration were added.
Note cards were widened to keep their labels inside the paper.

## Verification (2026-09-09)

- Build passes: 251 modules, 2,792.67 KB main JavaScript; existing chunk warning.
- Full suite passes: 188 files, 1,380 tests.
- Full earned keyboard and simulated touch routes reach Network at 55 document
  points with no console errors. Both save and resume mid-cart puzzle.
- Safety routes cover partial packets, absent packed tile texture fallback and
  older completed saves without re-awarding points.
- Unit checks cover all eight cart positions, off-lane pushes, physical contact,
  partial save round-trip, legacy notes and safe spawn recovery.
- Final installed game-client browser pass verifies actual movement and pushing;
  native renderer and browser-composited screenshots are inspected.

Evidence directories: /private/tmp/frus-annotation-cart-desktop-final-0909,
/private/tmp/frus-annotation-cart-touch-0909,
/private/tmp/frus-annotation-cart-safety-0909 and
/private/tmp/frus-annotation-cart-final-client-0909.

These are simulated mobile checks, not real Safari performance certification.
Passing a scripted route does not establish that the whole game is fun. Next:
novice-paced play through Network and referrals, watching for repeated gate
patterns, excessive instructions and unclear next actions.
