# Source-trail discovery

## Gameplay change

A fresh opening playthrough reached Archive A1 and found that its three visible
source stations refused useful evidence when visited out of order. The HUD used
`CHECK REPO` / `CHECK COLL`, while the routing message used development vocabulary.

The archive, collection and folder clues can now be read in any order. All unread
stations remain highlighted; recorded ones show `FOUND`. The HUD counts source
clues rather than ordering the player from one station to the next. Re-reading a
station repeats its evidence without a penalty or another reward. Wider cards
keep the full `ARCHIVE` and `FOLDER` labels inside their borders.

After three discoveries, the player returns to the research table. This is a
deliberate human review, not a dialog interruption at the last pickup. The
existing unsupported-readership correction, explicit filing, standards decision
and active Citation Stamp swing remain necessary before the gate opens. The
locator remains fictional training evidence; absent metadata stays unknown.

## Save and gate invariants

- `sceneProgress.sourceNoteProvenanceMask` records the three individual clues.
- `sourceNoteProvenanceStep` remains the number found for existing consumers.
- Saves without a mask recover their old inspected prefix. Saves with a mask do
  not merge that count back into prefix bits, which would invent evidence.
- Existing reviewed saves retain their credit. Gathering all three clues alone
  never sets `sourceNoteProvenanceComplete` or `aboutSeriesFirstFootnoteComplete`.
- Cancel/Continue preserves the clues and any corrected draft, but does not file
  the note or grant points. Review at the table remains available afterward.

## Verification (2026-09-08)

- Build and TypeScript pass: 250 modules, 2,788.78 KB main JS. Existing large-chunk
  warning remains. Full suite: 187 files / 1,375 tests pass.
- Pure tests cover all six clue orders, repeated reads, legacy prefix migration,
  malformed progress and no automatic review. Save tests round-trip masks 4, 6
  and 7 through the actual browser-storage writer/reader.
- `tools/qa-archive-wall.mjs --free-order` uses real keyboard or CDP touch inputs,
  starting from an earned Guide save. Folder-first collection, repeat read,
  partial Continue, table review, rejected unsupported filing, correction,
  cancel/Continue, explicit stamp and wall swing all pass. Both routes finish
  Annotation Stacks and enter Network with 55 document points.
- The ordinary archive-first route also passes on the final build. Reward totals
  remain 22 after clue gathering, 28 after evidence filing, 40 after stamping,
  43 after clearing the wall, and 55 at Network entry.
- `tools/qa-source-note-evidence.mjs --mobile` passes panel bounds, touch targets,
  input behavior and field-guide readback. The installed web-game client also
  exercised a repeated clue interaction. Its native and compositor screenshots
  were inspected; no new browser errors were reported.
- Fourteen scene-debug routes render and pass their applicable pause/map checks
  without browser errors. This is a loading/control regression check, not a
  substitute for playing all those scenes to completion.

Screenshots: `screenshots/source-trail-before.png`,
`screenshots/source-trail-discovery.png`, and
`screenshots/source-trail-review-touch.png`.

## Next playtest question

Free discovery is more forgiving than forced station order, but A1's three
source clues followed by three annotation pickups still risks repetition.
Continue the novice-paced adventure and give the adjacent archive room a more
distinct research action. This is not a claim that the whole game is finished
or that real iPhone Safari performance has been verified. Local build only.
