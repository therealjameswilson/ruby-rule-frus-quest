# Physical bindery finale

The finale previously displayed five floating workstation boxes on a flat ruby
background. Nothing stopped the compiler walking through them. This pass makes
the existing five-packet workflow inhabit a small room, without adding errands
or changing the human certification decision.

## Room

- Five 32x16 solid benches reuse the native interior desk tile (source index 16).
- A 48x16 binding press and 32x12 inbox have matching feet collision. The inbox
  moves four pixels south to leave a 32-pixel corridor below the press.
- A 14x10 native tile floor uses source indices 36, 37, 44, 45 from the packed
  interior sheet. Its detail is subdued over a gray base so benches and papers
  carry the contrast. No new images or dependencies.
- Bench faces sort at their front edge. Short on-desk labels replace floating
  labels below the furniture. The large 128px assembly sheet is reserved for
  the actual publication ceremony, not the walkable work area.
- Floor guidance routes around furniture using the existing workstation helper.
  Routes refresh by eight-pixel movement cells rather than every pixel.
- Old saved positions inside furniture recover to the nearest valid position;
  valid positions remain unchanged. No save-schema change.

## Checks

- Build passes: 250 modules / 2,788.75 KB main JS; existing size warning only.
- 187 test files / 1,365 tests pass. New tests cover four floor variants,
  accessible approaches, collision-free full packet routing, and old positions.
- Full earned-save keyboard and simulated-touch finales publish the volume at
  241 points: exactly the existing +40 packet rewards. They test an incorrect
  index route, correction, human-seal cancellation, Continue, certification,
  publication, and idempotent post-publication Continue.
- Live movement into the inbox and front bench stops at the feet boundary
  without losing the held packet. Tests use actual keyboard/CDP touch input.
- The inherited finale test incorrectly assumed no reliability restoration on
  packet completion. It now checks no loss on the incorrect index choice and
  the existing capped +3 per completed packet. It also accepts the existing
  TrueEnding presentation on Continue when the complete treaty branch applies.
- The final floor-contrast-only change is separately inspected with the installed
  game client. Native/compositor captures show actual carried-packet gameplay;
  its direct WebGL buffer screenshot remains black.
- Touch round trip from pending certification through the cleared vault and
  proofing room, back to bindery, then Continue passes with the same documents,
  inventory, boss counts, packet status and points. The test now uses actual open
  aisles instead of the older through-furniture path in both rooms. Fourteen
  scene/pause/map checks pass. All these browser checks report no errors.

Reproduce with `tools/qa-bindery-finale.mjs [--mobile]`, setting
`FRUS_QA_STORAGE` to an earned bindery-entry storage snapshot and `FRUS_QA_OUT`
to an output directory. Existing Playwright/browser overrides are supported.
The script writes intermediate certification and publication snapshots for
follow-up tests. No progress grants are used in these playthroughs.

Screenshots: `screenshots/bindery-room-before.png`,
`screenshots/bindery-room-physical.png`, and `screenshots/bindery-published.png`.

## Remaining scope

This improves the room's physical readability, not proof that the entire game
is fun. The next priority remains a novice-paced start-to-publication playthrough,
including whether the final five-station lap feels earned or repetitive after
DANN-E. Real Safari and hardware performance remain unverified. Local only.
