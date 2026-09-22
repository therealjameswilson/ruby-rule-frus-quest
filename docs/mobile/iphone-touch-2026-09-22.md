# iPhone touch verification — September 22, 2026

Fixed the touch pause control being painted underneath the opaque quest HUD.
MENU now appears beside A/B, with a 44×44 logical-pixel target (at least 44 CSS
pixels on the tested phones). It is hidden during dialogs, choices, and pause
so it cannot intercept their content. Desktop keyboard controls are unchanged.

## Automated browser checks

Chromium touch simulation, not physical iPhone Safari certification:

| Viewport | DPR | Result |
| --- | --- | --- |
| 375×667 | 2 | Pass |
| 393×852 | 3 | Pass |
| 430×932 | 3 | Pass |

Each size passed MENU opening, all four pause tabs, close/resume, simultaneous
thumb movement and B attack in Archive, stopping on release, and clearing held
movement on rotation. Landscape canvas bounds passed with simulated 47px side
and 21px bottom safe-area padding. Native name input, keyboard-space layout,
Done, and touch Begin passed. Isolated research-plan fixtures passed incorrect
answer feedback/retry and both approvals using A/B touch controls. These fixtures
are not evidence of a complete earned mission playthrough.

Screenshots of portrait Office, pause inventory, landscape Archive, native name
entry, choices, and feedback were visually inspected. No page or console errors
were recorded. Results: `iphone-touch-2026-09-22.json`.

All 249 Vitest files / 1,882 tests pass. Production build passes with the existing
large-bundle warning. The develop-web-game client also ran movement/release;
its direct WebGL capture remains black, so full-page screenshots are the visual
evidence.

## Reproduce

Start a production preview, then run:

```sh
FRUS_QA_URL=http://127.0.0.1:5202/ node tools/qa-iphone-touch.mjs
```

Set PLAYWRIGHT_MODULE to the installed Playwright module if it is not locally
resolvable. Screenshots/results default to /tmp/ruby-iphone-qa.

## Remaining hardware validation

Real iPhone Safari and installed-home-screen behavior, actual notch geometry,
keyboard appearance, audio interruption/resume, and sustained device performance
still need a physical device pass. Nothing from this change is published yet.
