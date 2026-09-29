# Native outdoor research journal

Replaced the sequential outdoor journal dialogue with a selectable discovered-place list and readable landmark details. Existing holdings, collection notes, library and NSC exercise counts remain available. Repository references are focusable links. A visit is explicitly a lead, not a cleared document; browsing does not grant research progress.

## Evidence

- `tools/qa-research-journal.mjs`, result in the adjacent JSON: desktop 1280x900, phone 375x667, small phone 320x568, landscape 844x390. All pass.
- View-only fixture includes all 16 locations without granting campaign discoveries. Checks empty view, controller list traversal, touch Library of Congress/Haig and Bush library details, keyboard scrolling, unchanged player/progress/points, B/Escape and scene-shutdown cleanup; no page errors.
- Inspected compositor screenshots `/tmp/frus-journal-verified/small-loc.png` and `landscape-empty.png`. Return and Back controls stay visible, with at least 44px touch targets.
- Standard game client finished successfully; `/tmp/frus-native-journal-standard/state-0.json` shows ResearchWorldScene exploration. Its canvas capture limitation remains; compositor captures supply visual evidence.
- Final source suite: 287 files / 2142 tests pass (`/tmp/frus-journal-tests-final.log`).
- Typecheck, production build `/tmp/frus-native-journal-verified-build`, and diff whitespace check pass.

## Limits

Direct scene journal invocation and view fixtures verify the panel, not a newly earned discovery route. Simulated Gamepad API and browser viewports do not establish physical controller or iPhone Safari behavior. No new archival claims researched in this change. Local only; not deployed. Full game quality, human listening, and novice learning remain separate unfinished goals.
