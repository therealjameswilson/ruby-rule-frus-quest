# Boss retry input guard

The prior replay unexpectedly returned to the vault entrance after Swarm damage.
A focused test of the actual ChoicePrompt reproduced a contributing mechanism:
opening a choice with the combat B edge present immediately invoked its Leave
callback. The test failed before the guard and passes afterward. This proves the
input hazard, not the exact event sequence in that earlier browser recording.

Only DANN-E's retry prompt opts into a 300 ms settling period. It then requires
neutral action input before accepting a fresh choice. Keyboard, controller/touch
A/B edges and pointer rows use the same acceptance gate. Reopening resets the
guard. Ordinary existing choices retain their immediate behavior.

## Evidence

- Build: 255 modules, 2,802.43 KB main JavaScript; existing size warning.
- Final full suite: 195 files / 1,452 tests passed, including all five focused
  choice tests. TypeScript compile passes.
- Real simulated-touch damage with B held reduced reliability to zero. The menu
  remained open after another 500 ms. Releasing B and tapping A deliberately
  restarted Colossus, preserving document candidates and points.
- The subsequent fight cleared all three phases and reached bindery/Continue
  without browser errors or duplicate rewards. A later Cloud retry needed two
  automated A attempts because the first fell inside the guard; those are two
  attempts on one menu, not two separate defeats. Eleven fresh core strikes were
  recorded. The intentional damage/retry route missed the publication deadline;
  that remains recorded, and bindery reliability was 94.
- Native/mobile screenshots inspected; the installed gameplay client also ran.
  Evidence: `/private/tmp/frus-retry-guard-touch-0909/` and
  `/private/tmp/frus-retry-client-0909/`.

The guard prevents an attack from becoming a menu decision. It does not restore
lost deadline time, weaken enemies, modify saves, or prevent intentional retreat.
Real-device usability and first-player difficulty still require evaluation.
