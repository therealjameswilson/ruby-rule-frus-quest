# Fresh Opening Playability Check

Verified locally on 2026-09-13 against gameplay commit `65b88b5` at port 5195.
Three fresh browser profiles; no tool grants, state edits or scene jumps.
All runs use `tools/qa-guide-counter.mjs` with real keyboard/pointer/touch input.

## Verified Loop

- Warning, title, compiler confirmation and Office entry.
- Talk to the compiler, collect and route the assignment memo, stamp it, enter Guide.
- Earn the Citation Stamp and face a live, telegraphed practice bolt.
- Miss without losing reliability or receiving completion credit.
- Pause during flight; verify bolt state stays frozen and closing does not swing.
- Return the bolt using the tool, then collect the revealed Front Matter Fragment.
- Repeated interaction does not duplicate points.
- Reload, Continue, retain the trained counter and reward, then enter Archive.

Keyboard, touch, and cue-guided keyboard runs all reached Archive with reliability
80 and no captured page/console errors. Touch uses Chrome emulation at 375x667,
DPR 3; a two-pointer check asserts both upward movement and B during windup.
The cue-guided run intentionally faces the wrong direction first, then follows
the displayed facing/swing cues from the pickup area instead of moving to the
script's usual counter position. It also checks both room corners by walking.

## Evidence

Each directory contains native renderer captures, viewport screenshots,
`results.json`, and an earned save usable for subsequent main-route testing.

| Run | Arguments | Local artifacts |
| --- | --- | --- |
| Keyboard | none | `/private/tmp/frus-opening-current/` |
| Touch | `--mobile` | `/private/tmp/frus-opening-touch-current/` |
| Coaching | `--coaching` | `/private/tmp/frus-opening-coached-current/` |

Set `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` for the installed browser runtime;
`FRUS_QA_OUT` chooses the evidence directory. Native reward, coached counter and
archive-entry captures, plus the full touch viewport, were visually inspected.

## What This Does Not Prove

The harness knows the Office route and reads coaching state, so these are not
unaided human comprehension tests. Run timings include capture and test waits;
they are not first-time-player pacing measurements. This is not physical iPhone
Safari, measured frame latency, the entire compilation journey, or a public
deployment check.

The simple Guide room gives the tool, challenge and reward room to stand out.
Archive arrival is denser: an entry card, source-note guidance and several door
labels compete briefly. Next, use the earned Archive save to assess source-note
collection, provenance work and the next tool reward before adding more content.
