# Optional Exploration Playtest

Local browser verification, 2026-09-13. No public deployment.

## Current Footprint Recheck

The hidden room's south trigger still required the old 16px feet alignment
after walking feet narrowed to 12px. Actual keyboard movement at x138 reached
y222 but stayed in HiddenReadingRoomScene. The visible 32px doorway was clear.
`reachedReadingRoomReturn` now derives its horizontal clearance from
`PLAYER_MOVEMENT_TUNING.feetWidth`: x118 through x138, not x120 through x136.
The vertical threshold and walls are unchanged; out-of-door positions remain
blocked. Unit tests cover both new margins and outside edges.

`qa-reading-room-return.mjs --edge-return` reproduces the old failure and now
passes keyboard at the right margin. `--mobile --edge-return --left-edge` passes
from an asserted x118 touch approach. Both collect +25, return, revisit without
duplicating the reward and verify persistence. These are explicit debug-room
fixtures for edge collision, not proof of earning the secret. Position traces
are retained because exact touch probes can overshoot their narrow margin.

The separate earned run uses the previously walked NARA checkpoint from the
route below, on the current runtime, with `--mobile --natural-entry --escape-return`.
It passes Folder discovery, first edition, return sidestep and reload; 201 ->
226 points, one inventory entry, no browser errors. Its movement helper now
stops when the scene changes and does not steer toward NARA coordinates after
already arriving in the hidden room. No progression is granted by this change.

Evidence: `/private/tmp/frus-secret-edge-before/`,
`/private/tmp/frus-secret-edge-fixed/`,
`/private/tmp/frus-secret-left-edge-touch-final/`, and
`/private/tmp/frus-secret-current-earned-fixed/`. Native failure/return,
reward/sidestep and standard-client screenshots inspected. Build and 1,681 tests
pass. Physical iPhone and unaided discovery remain unverified.

## Earned Route

Started with the earned pre-boss save at
`/private/tmp/frus-proof-cancel-after/desktop/earned-storage.json`.
Keyboard movement traversed Black Vault, Proof, Editor, Referral R2/R1,
Networks N2/N1, Archive A1, Annotation Stacks AS and NARA DN1. All 201
document points and the Review Folder survived. No debug scene relocation.

The NARA arrival save then fed `qa-earned-secret.mjs --mobile --natural-entry`.
Actual touch inputs read the clue, approached the northeast shelf, used the
earned Folder, entered the hidden room, claimed the first edition, returned
south and reloaded. Points rose to 226; discovery and exactly one first-edition
inventory entry persisted. No browser errors.

## Readability Fix

Completed Annotation Stacks still displayed NOTES / TABLE SOUTH beneath the
NORTH: NARA STACKS objective. It now shows NARA NORTH / ARCHIVE SOUTH. Unfiled
packets retain their work cue, even when every note is gathered. Nearby
interaction prompts still take precedence. English, Spanish and French updated.

## Evidence and Limits

- Return route with live HUD assertion: `/private/tmp/frus-natural-secret-route-after/`.
- Natural-entry touch discovery: `/private/tmp/frus-natural-secret-touch/`.
- Native annotation, clue/reward and Archive client screenshots inspected.
- Full suite: 203 files, 1,571 tests passed. Build passed with existing chunk warning.
- Automation reads runtime positions for navigation. This proves traversability,
  reward and save behavior, not unaided first-time discovery or human enjoyment.
- The chapter return leg used keyboard; the secret leg used simulated portrait
  touch. Physical iPhone testing and a first-time exploration session remain open.

## Fair Return Window

The new `--escape-return` check failed twice before the change: drone 4 targeted
the secret doorway on the first arrival frame, and a touch sidestep was hit.
The diagnostic captured arrival at (204,94), 384 ms of warning remaining, and
an invulnerability/knockback state after the escape attempt.

NARA now gives drones 800 ms of active gameplay before their first attack.
They still patrol during that delay. Normal 400 ms warnings and subsequent
attack rhythm are unchanged, and pausing does not consume the initial delay.
This is not permanent player invulnerability and does not affect DANN-E bosses.

The same earned touch route now passes: (204,94) -> (161,94), no hit state,
226 document points preserved, then return-save reload succeeds. Before evidence:
`/private/tmp/frus-secret-return-observed/`; after:
`/private/tmp/frus-secret-return-protected/`. Native captures inspected.
Unit coverage verifies patrol during grace, pause preservation and the first
normal warning/hit. Build passes with the existing bundle warning.
