# Honest Publication Deadline Record

September 9, 2026. The earned touch boss audit crossed the deadline but still
completed the reviewed record. The clock readout previously switched to
"Published within the 30-year mandate" unconditionally after publication.
That contradicted its persisted `statutoryDeadlineMissed` flag.

## Change

- Clock readouts expose a derived `deadlineMissed` boolean. A recorded miss
  remains visible after opening the Buckram Gate and publishing, even if the
  supplied time is below 30. Gate/published statuses retain their existing types.
- Late publication reads "Published after the 30-year deadline". Opening the
  gate later does not erase the historical miss or offer the shortcut again.
- Standard and true-ending record pages show a separate Deadline row: Met,
  Missed, or Pending. Seven rows fit above skills and existing touch buttons.
- Record integrity and deadline performance remain distinct. This does not
  convert a clean record into an appeal outcome, add damage, alter deadlines,
  reset retry timing, grant rewards or change save format.

## Verification

- Build passes: 255 modules / 2,801.22 KB main JavaScript.
- Full suite: 193 files / 1,436 tests pass. Regression checks cover recorded
  misses after opening/publication and the added completion row.
- Earned on-time desktop save and genuinely late touch save both complete all
  five bindery packets, publish and Continue. Each gains exactly 40 points
  (201 to 241). Records stay unchanged before publication; completion stats
  and rewards remain stable after reload. No browser errors.
- Desktop record reads Met; 375x667 DPR 3 touch record reads Missed. Native and
  compositor screenshots inspected with no clipped/overlapping labels.
- The installed web-game client independently reopens the late publication
  save for visual verification.

Screenshots: `screenshots/publication-deadline-met.png` and
`screenshots/publication-deadline-missed-touch.png`.
Earned evidence: `/private/tmp/frus-deadline-on-time-0909/` and
`/private/tmp/frus-deadline-late-touch-0909/`.

## Remaining Questions

The fight still has roughly 85 active seconds from its readiness floor, with
menus/cutscenes paused and phase retries consuming play time. This change makes
the outcome honest; it does not establish that the learning budget is fair.
Next: check phase-boast readability and first-attempt guidance, then evaluate
deadline pressure with players rather than tuning solely around automation.
Local only; no real-iPhone certification or whole-game fun/completion claim.
