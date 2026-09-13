# Referral Vault: Traveling Batches

## Playtest Findings

The old route required six center-tray pickups around six distinct filing
decisions, plus the separate StateChat draft pickup. Correct filing discarded
the carried object; an incorrect desk also returned it to the tray. Continue
kept the numeric carried-file flag but reset the player to R1's entrance and
lost the held-item label. The Concurrence Slip unlocked the east exit logically
while leaving its red lock and uncollected pedestal on screen.

## Gameplay Changes

- Pick up the equity batch once. File Intelligence Annex at CIA, Base Access
  Memo at DOD, and White House Minutes at NSC. Each correct filing hands the
  next file directly to the compiler.
- Keep the separate StateChat draft pickup and physical Human Concurrence
  Desk handoff. Carrying a batch does not automate substantive human review.
- Pick up the treatment batch once. Visit Permission Desk, Appeal Ledger,
  and Bracket Press in order. All seven underlying treatment checks remain.
- A wrong destination keeps the current item in hand and names the right
  destination. It still costs two reliability points and does not advance
  progress, award points, or create a resolved equity.
- The final review opens the gate without teleporting the player. Collecting
  the Concurrence Slip immediately redraws the open exit and collected pedestal.

This reduces center-tray returns from six pickups to two, or from seven total
pickups to three including the independently reviewed draft. All desk visits,
existing point/reliability rewards, referral stamp, volume fragment, physical
tool pickup, exit requirements, and DANN-E pressure are preserved.

## Save Compatibility

The existing sceneProgress fields and save schema remain authoritative. Save
after every pickup, retry, filing, human review, completed gate, tool pickup,
and room entry. Capture room/visited-room/player data before scene setup resets
transient state. Continue restores the exact position, facing, room, active
batch label, and held icon through the existing Player and save hooks.

Legacy uncarried progress stays at its next tray pickup. Existing permission,
appeal, and completion flags keep their credit. Mismatched or cross-stage
carried flags are cleared, not converted into rewards. Finished batches reject
further filing attempts.

## Verification

- Deterministic tests cover both batch sequences, wrong destinations,
  out-of-order items, finished/invalid steps, new and legacy carry restoration,
  and actual browser-storage save/load boundaries.
- Replay R1 -> R2 -> Silent Read with desktop keyboard and 375x667/DPR-3 touch.
  Intentionally use one wrong agency and one wrong treatment station, retry in
  place, Continue with an equity file, the draft, and an appeal docket held,
  Continue in R2 before and after the slip, and backtrack without duplicate loot.
- Inspect compositor screenshots of the handoffs and unlocked gate, and check
  console/page errors. Mobile Chromium is a touch proxy, not iPhone Safari
  certification. This focused replay is not a new full-game completion claim.

Evidence is recorded in progress.md after the final replay.
