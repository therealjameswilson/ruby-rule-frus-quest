# Publication process recap — 2026-09-27

Added an optional Process page after the publication record, preserving direct Title access and cancel to the volume. Six stages connect archival research, selection/annotation, review/revision, clearance, editing/proofing and publication. Access versus release remains explicit. This is a process overview, not a claim that an older save completed newly added missions. Both normal and secret endings expose the page; no specific volume is assigned.

Sources checked September27:
- https://history.state.gov/historicaldocuments/about-frus — research breadth, accuracy, visible omissions, access versus publication.
- https://history.state.gov/historicaldocuments/frus-history/stages — collection, selection, annotation, two-stage review, agency clearance, comparison with originals, publication. Historical overview, not a new operational SOP.
- Existing docs/COMPILER_SOP_MISSION.md — user-supplied August2026 SOP mapping, revision after both reviews and DPD handoff; original attachment not freshly available.

Validation:282files/2114tests pass; final build passes. Normal/secret cycle and input-lock unit coverage updated. Earned published save tested on1280×720,390×844,844×390: process text within bounds, page cycle, Title, reload preserves published certification. Phone font raised to8logical pixels after visual inspection. Desktop and phone process screenshots inspected.

One initial Continue assertion observed null certification. A diagnostic rerun passed all3layouts. A subsequent run overlapped a Vite text edit and timed out during phone Continue; final stable rerun passed all3 with saved resumed-state JSON. Cause of the first null was not established; do not present a runtime fix for it. Keep this as a regression watch item. Preview port5217 was confirmed stopped and restarted as session75030.

Artifacts: /tmp/frus-process-diagnose-0927/. Standard skill client ran on Office; native screenshot black as before, compositor captures used for visual review. Physical devices and learning effectiveness remain unproven. Changes local only.
