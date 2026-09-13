# Mark the Released Excerpt

The ClassNet source task is now a marking puzzle rather than a two-choice
question. A fictional release note authorizes section B of a three-part
record. The draft initially marks all three parts for print. The player keeps
B selected and switches A and C to Hold, then explicitly files the markings.
Textual Print/Hold states and checkmarks distinguish the choices without
depending on color alone.

## Historical Boundary

[About the Series](https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries)
explains that published extracts may come from still-classified documents.
Publication of the excerpt does not make its parent source public in full.
Training File C, its section labels and release note are fictional teaching
evidence, not quotations or actual declassification determinations.

## State and Controls

- Three independent markings, navigable by keyboard or direct touch.
- Empty markings and any markings including A or C cannot be filed.
- Optional sceneProgress.silentReadReleaseScope preserves partial and correct
  unfiled drafts. Invalid saved values restore the faulty draft, not approval.
- Filing requires both valid markings and the matching saved draft. It only
  verifies the task; the existing subsequent stamp grants its original reward.
- Editing leaves document records and their classification/equities alone.
- Reading pauses movement and DANN-E; cancel is swallowed before gameplay.
- Completed older chapters keep their progress without a new mandatory task.

## Evidence

Unit coverage enumerates all eight marking combinations, corrupt values,
independent toggles, saved unfiled drafts, keyboard/pointer callbacks and
scene-level filing/stamping guards. tools/qa-proof-comparison.mjs checks the
new task on the complete earned Editor route, including partial Continue,
correct-but-unfiled Continue and unchanged record data before approval.

Verified on 2026-09-09:

- Build passed: 254 modules, 2,800.03 KB main JavaScript before compression.
- Full unit suite passed: 192 files, 1,429 tests.
- Earned keyboard and simulated-touch (375x667, DPR 3) chapter routes both
  reached Black Vault with exactly 87 points gained (114 to 201), no browser
  errors and no repeated rewards after Continue/backtracking.
- Installed web-game client reopened the earned draft and changed A to Hold;
  saved mask 6 remained unfiled. Native and compositor captures inspected.
- Retained screenshots: `screenshots/editor-release-scope-desktop.png` and
  `screenshots/editor-release-scope-touch.png`.

These runs establish functional behavior, not locked-60-fps performance or
real-iPhone certification. Captured frame-time spikes remain outside this
change's scope. This work is local, not deployed.

## Remaining Work

Three Editor tasks still use two-choice prompts. The next pacing check should
also examine the earned Black Vault encounter and the transition from these
document tasks back to movement and threat avoidance, rather than replacing
every interaction with another modal. Scripted known-answer play is not
first-time usability or proof that the full adventure goal is achieved.
