# Office starter-route contract

The first playable room teaches the game's core physical workflow in five short
beats:

1. talk to the equal-rank Junior Compiler;
2. pick up the Assignment Memo;
3. carry it to the Production Inbox;
4. stamp it at the same workstation;
5. take the Master Declass Key through the south Archive Guide door.

`src/game/officeStarterRoute.ts` is the authority for this route. It derives one
stage from the existing `juniorCompilerIntroduced`, `officeStarterMemoStatus`,
and Master Declass Key inventory state. The fixed objective, gold in-world
target, interaction filter, and legacy-save recovery all consume that stage.

The former full-room tutorial card and permanent keybind footer duplicated the
fixed HUD and obscured the playfield. They are removed. A first-time player now
sees the room immediately, with the compact HUD saying `GO LEFT - TALK` and one
gold `GO TO JR` marker over the actual target.

Normal play awards the Master Declass Key when the memo is stamped. Older saves
can contain a stamped memo without the key; this is now a deliberate
`recover_key` stage. Only JR is actionable, the objective says to return there,
and talking restores the key before the Archive target appears.

The focused unit test covers every stage and malformed saved memo values. The
browser route harness separately exercises keyboard and DPR-3 touch movement,
the complete physical memo loop, the Guide transition, and the legacy recovery
case.
