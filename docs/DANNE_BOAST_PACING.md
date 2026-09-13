# DANN-E phase-boast pacing

Phase boasts are short interruptions, not dialogue walls. Lines are capped at
48 characters; reading holds use a bounded word-count estimate of 1.8-3.2 seconds.
The existing variant catalog is unchanged.

The boss now owns advancing its phase dialogue. A or confirm advances the
pending line after a 250 ms input guard, instead of independently closing the
shared cutscene display. Automatic advance remains available. The consumed input
does not become a tool swing. Destruction settles pending waits; late timer
callbacks cannot close a subsequent cutscene.

## Verification (2026-09-09)

- Build passed: 255 modules, main JavaScript 2,801.66 KB. Existing chunk warning.
- Full suite passed: 193 files, 1,439 tests. Focused tests cover hold bounds,
  single advance, late callbacks and destruction while waiting.
- Earned keyboard route: Colossus, Swarm and Cloud defeated; seven fresh core
  openings struck, no retry, 55.561 seconds on the statutory clock.
- Earned simulated-touch route (375x667, DPR 3): all three phases defeated;
  nine fresh openings struck, one retry, 75.092 seconds on the clock.
- Both routes verified stationary player and paused clock while reading, manual
  advance of intro/Colossus, automatic advance later, no unintended swing,
  bindery entry and Continue without duplicate rewards or browser errors.
- Native keyboard and mobile compositor captures inspected. The installed game
  client independently captured the introduction from the earned entry save.

Artifacts: `/private/tmp/frus-boast-skip-desktop-0909/`,
`/private/tmp/frus-boast-skip-touch-0909/`, and
`/private/tmp/frus-boast-client-0909/`. Retained screenshots are under
`docs/screenshots/danne-boast-*`.

## Remaining limits

These are scripted earned routes, not first-player usability or real-iPhone
performance tests. The ornate cutscene frame still crowds its portrait/text
boundary and deserves a separate layout pass. Next evaluate first-attempt combat
guidance and the deadline's learning margin with player observation. No combat
damage, attack timing, save schema or deadline balance changed here. Local only.
