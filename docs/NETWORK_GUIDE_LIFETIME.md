# Network guidance lifetime

## Finding

Both Network rooms rebuilt their route markers whenever the rounded player
position changed. Each new rectangle or ellipse was added to roomObjects;
clearing the previous guide destroyed its shapes but did not remove those
references. Walking therefore kept growing the room's cleanup list until exit.

## Change

N1 and N2 each lazily create one Graphics guide, clear its drawing commands and
reuse it. Room exit destroys it through the existing ownership path and resets
the reference. Near a destination and after task completion it has no drawing
commands. Routes, classification checks, rewards and save fields are unchanged.

The N2 guide now sits on the floor beneath characters, as N1 already did. Its
odd-sized dots use integer edges; the target has an even-height outline. The
old floating shadow is removed. No external assets or renderer settings change.

## Verification (2026-09-09)

- Production build passes: 251 modules; 2,792.22 KB main JavaScript. The existing
  large-chunk warning remains. All 188 test files / 1,380 tests pass.
- Earned keyboard and simulated-touch routes finish N1 and N2 and enter Referral
  Vault. They check wrong-network and wrong-desk recovery, the stamp crossing,
  held-batch Continue, an unfiled withholding entry restored after reload,
  deliberate filing, physical token pickup and exit. No console/page errors.
- The replay now records room ownership counts and asserts a bounded increase,
  plus at most one guide per room. Across both routes: N1 has 27-48 tracked
  objects, N2 has 39-61. The higher counts include completion rewards, not
  moving-marker accumulation.
- Native and browser-composited screenshots inspected, including 375x667/DPR3
  touch. The installed game client also exercises a saved vault scene.

Local evidence: /private/tmp/frus-network-guide-desktop-0909 and
/private/tmp/frus-network-guide-touch-0909. This proves bounded guide ownership,
not a measured FPS improvement or real iPhone Safari certification.

## Next gameplay work

The rooms remain guided delivery tasks. The stamp shortcut and editable
withholding ledger add useful variation, but the early batch instructions
still largely supply their answers. The center pedestal's future-reward label
also competes with the batch pickup toast. Continue a separate readability and
player-decision pass rather than treating these regression routes as proof
that the whole game is enjoyable.
