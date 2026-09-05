# A Shorter, Accountable Bindery

## Observed Baseline

The September 5 earned boss-clear save starts the bindery with 201 document
points, five cover pieces, five selected proofed documents, two completed
agency-equity decisions, and no open standards violations. The previous goal
turn made concrete progress through a verified DANN-E counter loop. This pass
continues that earned state, rather than granting publication prerequisites.

The baseline already bundles 38 reference checks into five packets. It does
not ask 38 separate questions. It instead repeats placement followed by an empty
seal at each station, with an actual index decision only at the Index Desk.
The old seal message nevertheless claimed all underlying checks were recorded.

## Gameplay Change

- Keep the five stations, initial folder pickup, traveling handoffs, forgiving
  station radius, existing rewards and final manual publication action.
- A correct ordinary delivery files immediately. The Index Desk opens its
  document-number router on delivery; the standards press opens human review.
- The normal route needs nine primary confirmations instead of thirteen,
  excluding navigation, retries, optional reading and reopening a canceled panel.
- Show the earned ruby volume assembling in the center using the existing
  six-frame sheet at native size. The publication frame remains reserved for
  the ending ceremony. Preserve the old press drawing if that texture is absent.
- Increase station/progress labels and index evidence to native eight-pixel
  text. Show a bindery action instead of inviting another Pencil swing.

## Human Standards Seal

The new panel presents live counts: selected proofs filed, agency decisions
filed, hidden cuts, and unresolved standards violations. The compiler explicitly
attests to retaining major facts and not concealing policy defects.

This distinction follows the official [About the Series](https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries).
A filed declassification decision is not a claim that every word was released:
the series accounts for excisions and wholly withheld records. The existing
handbook and index exercise remain available.

No source document is changed by opening or sealing this panel. It cannot
repair a missing proof, annotation, hidden deletion, open equity or actual
standards violation. If the same agency is resolved on one selected document
but still pending on another, the final seal remains blocked. An empty record
or absent equity map cannot pass.

Old final-certification quiz mistakes remain correctable through explicit
attestation. This exception excludes records tied to a document and deadline
violations, even if their context resembles an old quiz. Real violations are
not cleared by the seal.

## Save Compatibility

No schema version or dependency changes. Existing carried/routed packet codes
remain supported. A canceled or interrupted decision stays routed; Continue
restores position and the pending packet. Legacy completed packets and
published saves are honored. Rewards remain +8/+8/+6/+8/+10. Repeated callbacks
or Continue cannot award a packet or completed volume twice.

The historical completion fields still represent bundled station work; the
game no longer tells the player that one tap independently verified 38 checks.
The `checks` QA field remains the reference-check count for compatibility.

## Verification

- Production build: 233 modules, main JavaScript 2,734.97 KB. Existing Vite
  chunk warning remains; no new assets or external dependencies.
- Full suite: 171 files / 1,154 tests pass. Coverage includes unresolved and
  duplicate agency equities, incomplete proofs, hidden cuts, legacy mistakes,
  live revalidation, pointer/keyboard cancellation, single rewards and handoffs.
- Production Chromium keyboard and 375x667 / DPR-3 simulated touch continue
  actual earned boss saves through every packet and publication. Both end at
  241 points and 100 reliability. Wrong index routing has no penalty. Cancel,
  reload, exact pending position, unchanged documents, and published Continue
  are exercised. No page or console errors in these runs.
- Native/compositor screenshots were visually inspected. A first phone layout
  crowded the A control; final 34-pixel-tall decision targets end at y175,
  above its y176 hit-zone boundary. At this viewport the targets exceed 44 CSS
  pixels in height. Gameplay and weapon input remain frozen while reviewing.
- The required development-game client confirms the human seal using keyboard
  input. Its direct WebGL-buffer PNG remains black in headless/headed capture;
  separately captured renderer snapshots and compositor images are the visual
  evidence, not that black buffer image.
- Fourteen scene-debug routes and their playable pause/map screens pass with
  no page/console errors. Focused final-panel checks measure all seven bitmap
  text objects and both buttons, verify desktop field-guide return, and tap the
  lower-right edge of the phone Return target without accidentally sealing or
  swinging. Both panels reopen correctly.

Two initial QA assertions, not gameplay, needed correction: exclude the hidden
pixel-proof canvas when counting gameplay canvases; inspect the bitmap-text
objects rather than assuming Canvas Text objects or eight labels.

Replay: `tools/qa-bindery-finale.mjs`. Supply `FRUS_QA_STORAGE` with an earned
bindery snapshot, plus `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` if the
browser tools are outside the repository. Add `--mobile` for touch. The script
does not grant tools, edit game state or call private gameplay methods.

Local evidence:
- `/private/tmp/frus-bindery-baseline`
- `/private/tmp/frus-bindery-finale-desktop`
- `/private/tmp/frus-bindery-finale-touch`
- `/private/tmp/frus-bindery-client` and `/private/tmp/frus-bindery-client-headed`
- `/private/tmp/frus-bindery-panel-final` and `/private/tmp/frus-bindery-scene-smoke`

Retained screenshots: `docs/screenshots/bindery-finale-before.png`,
`bindery-finale-human-seal.png`, `bindery-finale-assembly.png`, and
`bindery-finale-publication-touch.png` in the same directory.

## Remaining Work

This is an earned post-boss finish, not a fresh whole-game or real-iPhone
certification. No deployment was performed. The source-note-47 fixture still
has a blank repository despite its filed-citation flag; the panel intentionally
reports recorded workflow state, not independent archival verification. That
metadata inconsistency needs a source-table repair, not invented provenance.
Mixed older art, the return path for a damaged final record, and a fresh
uninterrupted pacing playthrough remain follow-ups.
