# Opening experience audit

## Goal clarity

The warning previously told players to recover FRUS volumes while character
creation told them to build one. The first now says `COMPILE. VERIFY. PUBLISH.`;
the compiler remit says `FIND SOURCES. VERIFY. PUBLISH.`. Both remain short,
visible pixel text. DANN-E artwork and the history.state.gov credit remain.

The office route was retained: meet JR, take the memo, carry it to the inbox,
stamp it, and enter the archive. These are physical interactions with short
toasts, not a new mandatory conversation or quiz.

## Fresh-save verification

The touch audit uses an empty browser context, starts at WarningScene, creates
the compiler, completes the office route, earns the Citation Stamp, misses a
practice bolt harmlessly, follows the visible facing/timing cues, earns the
fragment, reloads/continues and enters ArchiveScene. No progression flags or
inventory were injected. The perimeter and paused-bolt checks remain.

`tools/qa-guide-counter.mjs` now captures the warning, compiler setup and four
office milestones in addition to the tool lesson. Each capture records elapsed
wall time. Those values include browser startup, screenshot overhead, deliberate
waits and perimeter tests: they are not first-player completion times or input
latency measurements.

Build passes: 255 modules, 2,802.45 KB main JavaScript with existing size warning.
Full suite: 195 files / 1,452 tests passed. Native warning and compiler captures
were inspected; the installed gameplay client independently captured the fresh
desktop warning. Simulated touch viewport: 375x667, DPR 3.

Evidence: `/private/tmp/frus-opening-mission-touch-0909/` and
`/private/tmp/frus-opening-mission-client-0909/`. Earlier fresh route audits are
retained under `/private/tmp/frus-opening-revisit-touch-0909/` and
`/private/tmp/frus-opening-audit-touch-0909/`.

## Remaining questions

- Can a new player follow the office route without knowing its coordinates?
- Do the safe practice cues teach a counter that players remember in combat?
- Does the archive's source-note task feel like discovery rather than paperwork?
- Can players distinguish collectible volume pieces from the volume they publish?

The scripted route establishes functionality, not fun or real-device performance.
Do not respond to these open questions by adding more compulsory explanation.
