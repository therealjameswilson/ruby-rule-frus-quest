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

## First reward follow-up

The Guide's full objective incorrectly asked the player to use the Stamp to
claim the fragment even though its interaction handler uses A/interact. Corrected
that instruction, the English HUD cue, pickup label and short reward toast to
identify Front Matter. The saved inventory/fragment identifiers, ten-point reward
and gate requirements remain unchanged. The message distinguishes this recovered
part from the future volume, which still needs research and review.

The replay now tries a tool swing at the revealed pickup and verifies that it
does not collect it, then uses interact and verifies collection. It still checks
repeat interaction for duplicate points, Continue and Archive entry. No new
dialogue or puzzle was added. Other language HUD translations remain unchanged.

Follow-up verification: build passes (255 modules / 2,802.57 KB), full suite
195 files / 1,452 tests passes after correcting one stale copy assertion. Fresh
touch replay passes the swing-versus-interact check, repeated pickup, Continue
and Archive entry without browser errors. Native reveal and mobile collection
captures inspected under `/private/tmp/frus-front-matter-touch-0909/`; the
installed client also reopens a previously earned Guide save. The guide NPC's
older art remains visibly inconsistent with the hero and is a separate follow-up.
