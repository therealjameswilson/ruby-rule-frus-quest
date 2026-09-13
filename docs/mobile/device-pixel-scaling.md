# Device-Pixel Scaling

## Reproduced Problems

The September 8 chronology playtest raised a misleading apparent discrepancy:
a CSS zoom of 1.333 at DPR 3 is intentional, because each game pixel occupies
four device pixels. Fractional CSS zoom was not itself the bug.

Actual screenshot evidence identified three problems:

- Rounding DPR 2.625 to 3 produced alternating 3- and 4-device-pixel checker
  cells while the debug display reported an integer scale.
- Flex centering or layout-only offsets placed the origin between physical
  pixels. At DPR 1.25, the canvas edge had a blended extra color.
- Fractional canvas layout dimensions could round before rasterization. A
  correct top-left checker did not guarantee a correct far-corner diagonal.

## Correction

The 256x240 Phaser world and backing buffer remain unchanged. The canvas is
painted at native CSS dimensions and scaled by the compositor. One shared
layout computes the actual-DPR zoom, safe-area placement and snapped origin;
the shell is positioned with translate3d. Pointer bounds and displayScale use
the final displayed rectangle, not the canvas's untransformed CSS width.

The existing frame readout detects DPR changes even when no resize event is
delivered. Phaser resize corrections run before paint, with a re-entry guard.
The readout distinguishes CSS zoom, physical scale and origin alignment.
No gameplay, inventory, save-schema, room-graph or art assets were changed.

## Verified Results

On September 8, the final production build passed all 28 screenshot cases,
including 303,183 exact native-to-compositor pixel comparisons. No page or
console errors occurred. Results are retained in `device-pixel-results.json`.
The full suite passed 182 files / 1,280 tests; the production build contains
244 modules and a 2,775.48 KB main JS bundle, 0.62 KB above the starting build.
The existing large-chunk warning remains. Earlier test runs had worker-start
and async timeouts; the unchanged full suite rerun alone passed in 7.78 seconds.

Retained screenshot evidence:

- [Before: uneven Pixel checker](../screenshots/pixel-scaling-before.png)
- [After: exact device-pixel proof](../screenshots/pixel-scaling-after.png)
- [Touch puzzle after rotation](../screenshots/pixel-scaling-touch-landscape.png)
- [Touch Clearance Token pickup](../screenshots/pixel-scaling-touch-reward.png)

## Repeatable Proof

Run `tools/qa-pixel-scale.mjs` against the production preview. Environment:

```sh
FRUS_QA_URL=http://127.0.0.1:5195/
FRUS_QA_OUT=/tmp/frus-pixel-proof
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium
```

`--observe` records baseline failures without accepting them. Optional
`FRUS_QA_PROFILE` selects a single named profile. Every case retains native and
compositor images, geometry, exact pixel comparisons and failed assertions.
Screenshot capture and device overrides share one CDP session: a separate
session can capture at a different DPR. Screenshot dimensions are asserted
against the actual viewport and DPR before interpreting pixels.

| Profile | CSS viewport | Actual DPR | Initial device zoom |
| --- | --- | --- | --- |
| iPhone | 393x852 | 3 | 4 |
| Small iPhone | 375x667 | 3 | 4 |
| Pixel | 412x915 | 2.625 | 4 |
| Tablet | 1024x768 | 2 | 6 |
| Desktop | 1280x960 | 1 | 4 |
| Desktop display zoom | 1281x961 | 1.25 | 5 |

Each profile rotates and returns. Touch profiles also apply asymmetric
47/13/34/29 CSS-pixel padding and reduce height by 80 CSS pixels. The last
desktop profile changes DPR to 2.625 and back without changing viewport size.
These are browser simulations, not physical notch/chrome measurements.

The proof requires identical native RGB values across the complete origin
checker, single texel and far-corner diagonal; equal run lengths in both axes;
unchanged 256x240 logical/backing size; aligned origin; and no overflow or
safe-area intrusion. It does not rely on the PASS label alone.

## Gameplay Regression

`tools/qa-network-ledger.mjs --ledger-only --mobile --rotate` uses an earned
pending-ledger save. It opens the actual review board, rotates, tries invalid
placements, edits a correct unfiled draft, rotates back, closes and reloads,
then files, collects the Clearance Token and walks into Referral. Reading
freezes player/threats; neither rotation nor editing changes reliability.

Override `FRUS_QA_WIDTH`, `FRUS_QA_HEIGHT` and `FRUS_QA_DPR` for the Pixel
412x915 / 2.625 profile. Defaults remain small-iPhone 375x667 / 3. Desktop
`--pointer` checks off-center mouse targets plus keyboard movement. This is
actual input replay, not setting quest flags to manufacture completion.

Final Pixel and small-iPhone touch replays and the desktop mouse replay all
reached Referral. Reliability remained 93 during puzzle review; incidental
combat after review reduced it to 84 on the Pixel run, while the final small-
iPhone and desktop routes stayed at 93. This variation remains a separate
novice-pacing investigation, not evidence of latency or difficulty parity.
Fourteen scene/pause/map routes passed without page/console errors. The
required headed client also rendered and edited the real draft; its inspected
compositor capture agrees with the game-state readout.

## Remaining Limits

- Real iPhone Safari, hardware display switching, pinch magnification and
  accessibility browser zoom still require physical-device verification.
- Automated viewport changes do not prove uninterrupted 60 fps or physical
  input-to-display latency. No performance certification is claimed.
- The required gameplay client can produce a black direct WebGL-buffer image;
  renderer snapshots and compositor screenshots show the actual scene.
- This is a local rendering correction, not a deployment or whole-game
  completion claim. Continue first-player pacing and touch-pressure testing.
