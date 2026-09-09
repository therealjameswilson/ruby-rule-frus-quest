# Boss Speaker Attribution

## Problem

DANN-E's intro, phase and defeated boasts used `danne-portrait-archivist`,
the allied Senior Archivist's portrait. The speaking character therefore
contradicted the boss still and dialogue.

## Change

- Register the existing robot bust through `DANNE_BOSS_PORTRAIT_ASSET` in
  `danneAtlas.ts`, included in Boot's image preload and the debug gallery.
- All boss phase dialogue defaults to `pack-danne-boss-portrait`.
- Keep the shared dialogue renderer's missing-texture guard. Missing portrait
  art hides the portrait; it does not substitute an ally.
- No changes to combat balance, input timing, saves or dialogue placement.

## Verification (2026-09-09)

- Production build passes; existing large-chunk warning remains.
- 195 test files / 1,459 tests pass, including portrait preload and speaker-key
  assertions.
- Earned-save mobile boss probe with `--boast-skip --imprecise` passes. Both
  opening boasts render the robot key and not the archivist key. Player and
  clock remain frozen during lines; advancing does not swing the weapon.
- The subsequent fixed uneven-input probe reaches Swarm with four returned
  bolts and no browser errors. This is not an unaided player test or a full
  boss-completion test.
- Standard installed game client captures the keyboard intro. Native touch
  and keyboard images were inspected; text and controls do not overlap.
- Captures: `screenshots/boss-speaker-touch.png` and
  `screenshots/boss-speaker-keyboard.png`.

Remaining: test unaided counter discovery and the overall adventure's pacing.
This checkpoint is local, not deployed.
