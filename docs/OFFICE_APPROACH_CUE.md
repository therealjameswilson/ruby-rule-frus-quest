# Office Approach Cue

September 12, 2026. Opening comprehension pass, not a novice playtest.

## Observed Problem

The Office HUD displayed the primary action badge while no object was in
range, alongside generic text such as FIND A GLOWING DESK OR DOOR. That
suggested pressing interact could advance the task while the player still
needed to move. The quest arrow also used a fixed 34-pixel hide radius,
different from the actual target interaction radius.

## Change

- In Office exploration with no reachable object, the HUD now uses a notice
  badge and FOLLOW GOLD ARROW. English, Spanish and French strings fit the
  existing action line.
- Reachable objects retain their existing action-button cue. Dialog, choices,
  boss cues and other scenes retain their existing behavior.
- The arrow hides at the guided target's actual interaction radius, avoiding
  a gap between losing the arrow and being able to act.
- No new overlay, dialog, input binding, gameplay state or save field.

## Verification

All 196 test files / 1,469 tests pass. Production build passes with the
existing large-chunk warning. The fresh simulated-touch opening passes 17
checkpoints through Archive, with no browser errors and reliability 80.
It asserts the actual HUD text/notice badge and visible arrow at spawn and
after memo pickup, then the real action cue at the inbox. The independent
installed game client also loads Office and moves using keyboard bursts;
native screenshots were inspected.

An initial run stalled on a QA target circle despite the south door being
interactable: fixed 85ms direction bursts oscillated with the faster player.
The test now tapers actual input duration near a destination; it does not
teleport or widen the arrival tolerance. The rerun passed. Runtime movement
was not altered.

Evidence: `/private/tmp/frus-office-approach-verified/` and
`/private/tmp/frus-office-cue-client/`. Initial failed run:
`/private/tmp/frus-office-approach/`. Retained image:
`screenshots/office-approach-cue.png`.

This removes one misleading instruction. It does not establish unaided
comprehension or whole-game enjoyment. Local only; not deployed.
