# Archive Review Touch Verification

Verified locally on 2026-09-12 using Chromium touch emulation, DPR 3.
This is functional input coverage, not physical Safari, audio-latency or FPS certification.

| Check | 375x667 portrait | 667x375 landscape |
| --- | --- | --- |
| Touch-only entry and D-pad navigation around desks | Pass | Pass |
| A files the referral tray and opens the routes | Pass | Pass |
| Specialist and recording gate refuse premature review | Pass | Pass |
| Examine document, Continue, retain both readings | Pass | Pass |
| Complete specialist review and record decision | Pass | Pass |
| Reject overstated wording, retry faithfully, no accidental B swing | Pass | Pass |
| Start or visible Back cancels without approval or opening pause | Pass | Pass |
| Walk east into the next room | Pass | Pass |
| Hold D-pad and B simultaneously; move during tool windup | Pass | Pass |
| Release both fingers without stuck input | Pass | Pass |
| Expected points (201 to 213), no browser errors | Pass | Pass |

## Reproduce

Use an earned browser storage state with the completed main Archive source room
and unresolved optional B1/B2 walls. Set `FRUS_QA_STORAGE` to that JSON file.
The script never teleports the player or injects puzzle flags, tools or rewards.
Collision inspection is read-only and used to plan cardinal input gestures.

```sh
FRUS_QA_OUT=/private/tmp/archive-phone-portrait node tools/qa-backtrack.mjs --proof-loop --mobile
FRUS_QA_OUT=/private/tmp/archive-phone-landscape node tools/qa-backtrack.mjs --proof-loop --mobile --landscape
```

The game must be running at `http://127.0.0.1:5195/`.
Set `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` when using an external installed
Playwright runtime. No new game dependency is needed.

Each checkpoint saves a native game image and a viewport screenshot. The JSON
outputs record room, player position, objective, points, browser errors and
simultaneous/released touch-control state.

Touch steering uses shorter correction gestures than keyboard steering because
browser touch dispatch spans frames. Arrival tolerance and collision checks are
unchanged. The initial full-duration gestures overshot small corrections; input
telemetry showed correct directions, so no runtime movement change was made.

## Evidence And Limits

- Cancellation regression: `/private/tmp/frus-review-cancel-grace/` (portrait)
  and `/private/tmp/frus-review-cancel-landscape/` (landscape). The latter also
  verifies movement during the 600 ms post-review recovery window. Keyboard
  Escape and mouse Back: `/private/tmp/frus-review-escape-fixed/`.
- Editorial wording decision replay: `/private/tmp/frus-meaning-touch/` and
  `/private/tmp/frus-meaning-landscape/`; the landscape run also reloads after
  correct approval and verifies the approval and its points persist.
- Portrait: `/private/tmp/frus-proof-touch-final/`.
- Landscape: `/private/tmp/frus-proof-touch-landscape-final/`.
- Keyboard locked-route and retreat regression: `/private/tmp/frus-touch-driver-keyboard/`.
- Production build passes with the pre-existing large-chunk warning.
- No physical iPhone, Safari interruption, audio, frame-rate or touch-to-pixel
  latency measurement is claimed by this check. No public deployment was made.
