# Connected Chapter Doorways

## Player-Facing Change

The main route is no longer a one-way sequence. Physical return doors connect
the editor, referral, network, archive, and Office chapters. A player who missed
the Senate or NARA records can return for them before entering the final review.
The late-earned Review Folder can now be brought back to NARA's hidden passage.
These use the existing screen transitions, not a teleport menu.

| Return Door | Arrival | Forward Gate Preserved |
| --- | --- | --- |
| Editor E1 west | Referral R2 east doorway | Concurrence Slip |
| Referral R1 west | Network N2 east doorway | Clearance Token |
| Network N1 west | Archive A1 east doorway | Completed source packet and Citation Stamp |
| Archive A1 west | Office south doorway | Existing Office training requirements |

After both counter training and the Front Matter fragment, the Office's archive
door returns directly to A1. First-time players still take the Guide. Red Pencil
and Buckram gates remain unchanged. Adjacent wall tiles remain solid; only the
authored three-tile side openings changed.

## State And Arrival Rules

- `chapterTravel.ts` accepts only eight authored source/destination door pairs.
  It does not accept arbitrary coordinates or destinations from scene data.
- Explicit doorway arrivals take precedence over a previous chapter's position.
  Continue keeps its exact saved room and position, including N2, R2, and S1.
- Ordinary transitions pass empty scene data explicitly. Continue also rejects
  stale arrival data retained by Phaser from an earlier visit.
- Visited rooms persist in existing numeric `sceneProgress` entries. The map
  keeps chapter discoveries after a scene change, save/load, and return trip.
  A new run clears them. Legacy saves retain known current-room visits without
  guessing unrecorded earlier travel.
- Existing document, tool, inventory, and reward storage is unchanged. There is
  no new save version. Unfinished Archive notes still have to be filed before
  leaving; routing/referral batches and reviewed proof files retain their work.

## Verification

- Reproduced the old editor west-wall dead end using an earned pre-boss save.
- Keyboard round trip: Black Vault -> S1 -> E1 -> R2 -> R1 -> N2 -> N1 -> A1 ->
  Office -> completed Guide shortcut -> NARA -> A1 -> N1 -> N2 -> R1 -> R2 ->
  E1 -> S1. The inventory stayed identical and document points stayed at 201.
- Touch, 375x667, DPR 3: the same return route recovered previously missed
  Senate and NARA treaty fragments, entered the hidden reading room with the
  Review Folder, collected the first edition, and returned to proofing. The
  one-time first-edition reward changed document points from 201 to 226; leaving,
  returning, and interacting with it again awarded nothing more.
- Continue was exercised in R2, N2, the Senate, and the hidden room.
- Separate bounded fixtures reconstruct previously recorded partial-work
  snapshots over an earned earlier-chapter save: routing packet 2, equity
  packet 2, and the verified printer's copy. Actual keyboard/touch travel away,
  Continue while away, return, and another Continue preserve the carried item,
  step, verification state, points, and exact return room. These are regression
  fixtures, not fresh-run progression evidence.
- 149 Vitest files / 940 tests pass. Coverage includes every authored arrival,
  malformed/stale data, real scene exit handlers, forward locks, tutorial
  bypass conditions, wall collision, visit persistence, and reset behavior.
- TypeScript and production build pass: 218 modules, 2,697.73 KB main JS.
  The existing large-chunk warning remains.
- Completed browser runs emitted no page or console errors. The required game
  client also crossed Network -> Archive. Its direct WebGL-buffer capture was
  black in headless and headed modes; inspected compositor screenshots and
  in-frame native renderer snapshots provide the visual evidence.

Evidence directories: `/private/tmp/frus-backtrack-before-desktop`,
`/private/tmp/frus-backtrack-after-desktop`,
`/private/tmp/frus-backtrack-discovery-mobile-final2`, and
`/private/tmp/frus-backtrack-partial-{network,referral,proof}`.
The first repeat needed a corrected scripted sidestep after a drone knocked the
player against a NARA shelf; no collision was removed to pass that test.
Retained native screenshots are `docs/screenshots/chapter-routing-return.png`,
`chapter-proof-return.png`, and `chapter-hidden-edition-return.png`.

## Limits And Next Checks

This is a local connected-world checkpoint, not a public deployment or a new
Title-to-ending completion claim. Real iPhone Safari, isolated transition
stalls, and play-time accounting while an open tab is paused still need work.
The hidden-room return currently uses NARA's existing south entry rather than
the secret passage mouth. Art, combat balance, and room objectives are not
redesigned here. Standalone side-scene map markers retain their existing
current-scene behavior; the new visit history covers the traversable chapters.
