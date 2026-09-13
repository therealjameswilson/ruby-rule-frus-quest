# Repair the Chronology

The Editor's two-choice date question is now a movable three-record sequence.
The player shifts a memcon between a cable and a telegram, using meeting-time
evidence rather than the later drafting date, then explicitly files the order.
The HUD identifies this as chronology restoration, not an answer quiz.

## Source and Boundaries

[About the Series: Editorial Methodology](https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries)
places records by Washington time and memoranda of conversation by the
conversation's date/time, not the memorandum's drafting date. Verified against
the official page on 2026-09-09.

Training File B and its January records are fictional practice evidence,
explicitly labeled on the panel. They are not historical quotations. This is
an ordering repair, not a declassification decision or rewriting source text.

## Interaction and Save Safety

- Left/right arrows or touch buttons move the memcon; filing is separate.
- Wrong orders give a specific hint, with no extra penalty or lost document.
- Optional sceneProgress.silentReadChronologySlot persists the unfiled draft.
  Missing/invalid values restore the faulty last position, not completion.
- Correct placement does not grant approval, a stamp, points or tools.
  Explicit filing verifies; the existing next interaction stamps and rewards.
- Review freezes movement and DANN-E. Cancel/close is swallowed.
- Completed older chapters are not reopened for this new puzzle.
- The shared board renderer retains the earlier Network withholding case,
  with separate evidence, insertion behavior and saved state.

## Verification

- Full build: 252 modules, main JS 2,796.25 KB. Existing chunk warning remains.
- Full suite: 190 files / 1,404 tests pass. Covers ordering, corrupt saves,
  unfiled save round-trips, legacy completion, board keyboard/touch callbacks,
  the prior withholding task, scene approval guards and frozen combat.
- tools/qa-proof-comparison.mjs completes the earned Editor route using
  keyboard and simulated 375x667/DPR-3 touch. Both gain exactly 87 points,
  survive partial-draft Continue, reject wrong orders, file explicitly,
  backtrack without duplicate credit and enter Black Vault without errors.
- After the HUD-only wording fix, tools/qa-editor-chronology.mjs replays the
  earned pending task on touch. Filing leaves 141 points and verified status,
  not stamped. Native/compositor screenshots inspected.
- The installed game client separately reopens the earned task and makes a
  keyboard correction. It does not replace the real-clock full-route checks.

Local evidence: /private/tmp/frus-chronology-desktop-0909/,
/private/tmp/frus-chronology-touch-0909/,
/private/tmp/frus-chronology-final-touch-0909/ and
/private/tmp/frus-chronology-client-0909/. Retained screenshots are prefixed
editor-chronology in docs/screenshots/.

## Remaining Work

Four middle Editor tasks still use two-choice prompts. Next assess release
scope as a physical document/excerpt comparison, preserving the distinction
between an accessible excerpt and its still-classified parent source.
This is a small hands-on improvement, not proof of whole-game fun, first-time
discoverability, sustained 60 fps or physical iPhone Safari compatibility.
