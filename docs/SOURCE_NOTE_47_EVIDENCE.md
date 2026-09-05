# Source Note 47: Evidence That Travels

## Gameplay

Archive A1 still uses three physical stations: repository ledger, collection
register, and folder tab. The final stop now opens a short repair panel rather
than a question with its answer already supplied. The draft claims presidential
readership, but the fictional packet has no readership evidence. The player
removes that unsupported assertion, then explicitly files the note. Repair
highlights File Note, so two deliberate A presses work without extra navigation.

An unsupported filing gives a hint, not a reliability penalty. Repair alone
does not grant credit. Return, B, and Escape close the panel without swinging.
Movement and DANN-E pressure pause while it is open. The existing six-point
verification, later Citation Stamp, NO REPO wall counter, annotation packet and
east exit remain separate and unchanged.

## Source Boundary

The official basis is the first-footnote paragraph in
[About the Series, FRUS 1989-1992, Volume XXXI](https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries).
It calls for source, original classification, distribution, drafting, policy
background and readership information. It is methodological guidance, not the
source of the game's fictional document.

The locator comes from the existing authored A1 clues: Fictional National
Archives Collection; Office Files of the Policy Planning Staff; Alliance
Consultation. It is not a real NARA citation. No box number, lot number,
classification, author, recipient list, or presidential reading claim is invented.
The folder title supplies only a limited training topic, not a substantive
historical policy narrative. Unknown readership does not mean the document was
not read; original classification being unknown does not mean public release.

## Persistence and Readback

`sourceNote47.ts` holds the locator and its conservative reconciliation rules.
`DocumentCandidate.firstFootnote` is optional and deep-cloned; explicit nulls
record metadata absent from this training packet. Source, collection and folder
remain in the existing candidate fields. The field guide's new Source Note 47
entry reads that candidate from the current save, rather than global codex
unlock storage. Its pages show the full locator and each known/unknown field.

Each discovered station and opening the review save immediately. The numeric
`sceneProgress.sourceNote47ReadershipCorrected` retains a repair across canceled
reviews and Continue, without marking it filed. No save-version change.

Legacy metadata repair requires all five earned markers: collected, routed,
three traced stations, provenance complete, and the original human first-footnote
review. Tool ownership, a debug seed, a downstream proof state, or a bare
completion flag is insufficient. Only absent fields and the exact old worksheet
placeholders are filled. If any locator component was edited, the whole trail
stays intact rather than mixing a new repository with this training folder.
Existing footnote content stays intact; no rewards, workflow transitions or new
repair completion are inferred.

## Verification

- `npm test -- --pool=threads --maxWorkers=2`: 173 files / 1,173 tests pass.
  Earlier fork-pool attempts encountered worker-start timeouts, not failed
  assertions. `npm run build` passes with the existing bundle-size warning.
- `tools/qa-archive-wall.mjs`: earned Guide save through repair, unsupported filing,
  repeat repair, canceled partial Continue at the same position, filing, stamp,
  active swing against NO REPO, annotation and Network entry. Run with `--mobile`
  for actual simulated touch input at 375x667/DPR 3.
- `tools/qa-source-note-evidence.mjs`: panel text/button bounds, touch-safe target
  heights, combat pause and swallowed cancel, desktop field-guide return, and
  every filed-note page reached from the actual field guide in both input modes.
- Required web-game client: keyboard repair and distinct filing from the earned
  pending-review save; inspect renderer/compositor captures as well as JSON.
- Fourteen existing scene routes render and round-trip through map pause. An
  earned older published save retains its status and 241 points while restoring
  the missing training locator. Final desktop and touch checks verify two
  deliberate A presses repair, then file, without premature rewards.

Retained screenshots in `docs/screenshots/`: `source-note-evidence-before.png`,
`source-note-evidence-repair.png`, `source-note-evidence-touch.png`, and
`source-note-evidence-filed.png`. The direct WebGL-buffer screenshot from the
required client remains black in both headed and headless Chromium; inspected
renderer snapshots and browser compositor captures provide the visual evidence.

Browser replays require `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` as appropriate,
and earned storage from the preceding replay. Archive uses `FRUS_QA_STORAGE`;
evidence readback uses `FRUS_QA_ARCHIVE_OUT`. `FRUS_QA_OUT` controls captures and
`FRUS_QA_URL` defaults to the local production preview at port 5195.

## Remaining Work

This is one fictional source-note exercise, not verification of a real FRUS
volume. A fresh whole-game pacing pass, damaged-record return route from the
bindery, older art consistency and real iPhone Safari testing remain necessary.
The broader goal is still active; these local changes do not certify deployment
or the entire game as complete.
