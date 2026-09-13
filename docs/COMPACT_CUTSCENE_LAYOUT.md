# Compact cutscene layout

The ornate letterbox strips and scroll corners competed with the boss's short
lines at 256x240. Cutscenes now use plain black bars and a one-pixel gold frame.
Existing artwork remains registered and available to other interfaces.

- Text requests the existing 8 px bitmap-font tier instead of the 6 px tier
  selected by the previous 7 px request. The existing text-factory adapter is
  retained; no new font or image asset is introduced.
- A 24 px portrait ends at x44; text starts at x52, with 184 px of wrap width.
- The 48 px panel sits at y184-232 on desktop and y120-168 on touch devices.
  Touch buttons retain their existing locations below the panel.
- The mobile phase illustration is capped at 72 px high, centered at y78,
  leaving six pixels before the raised panel. Desktop illustration is unchanged.
- Input ownership, reading hold, combat, publication clock and saves are unchanged.

## Verification, 2026-09-09

Build passes: 255 modules; main JavaScript 2,801.73 KB, with the existing size
warning. Full suite: 194 files / 1,441 tests. New cutscene tests cover desktop and
touch geometry, portrait removal and exit visibility. Browser captures were
inspected at native size and a 375x667 DPR-3 touch viewport.

The final earned touch route cleared Colossus, Swarm and Cloud in 53.4 statutory
clock seconds with no retry, then entered the bindery and successfully continued
from its save. Six fresh core openings were struck; records and rewards remained
consistent and browser errors were empty. The installed gameplay client also
captured the final desktop introduction. These timings are scripted-route
evidence, not a player-performance or frame-rate claim.

Initial mobile captures caught the A button covering the larger text. Raising
the panel resolved that; a subsequent capture exposed the phase illustration
crossing its top border, resolved by the mobile-only illustration size cap.
These failed intermediate layouts are not the retained final screenshots.

Final captures: `docs/screenshots/compact-cutscene-desktop.png` and
`docs/screenshots/compact-cutscene-touch.png`. Temporary browser evidence lives in
`/private/tmp/frus-clean-dialogue-client-spaced-0909/` and
`/private/tmp/frus-clean-dialogue-spaced-touch-0909/`.

This is simulated mobile QA, not real-device validation. Full-game readability,
first-player combat guidance and deadline learning margin remain open work.
