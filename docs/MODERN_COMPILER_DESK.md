# Interactive compiler desk

The game’s broader goal is a modern console-quality adventure that teaches FRUS production through play. The current changes replace the manuscript-selection, chapter-assembly, and manuscript-revision quizzes. It does not claim to finish the campaign-wide overhaul.

The Archive east manuscript desk now opens a native-resolution reading surface over the existing logical game canvas. Players place two illustrative research packets into a working manuscript. The page budget reacts immediately; keeping only routine material fails even though it fits. The decision packet retains policy instructions, dissent, and implementation evidence. Unselected material stays in the source file rather than being destroyed. No particular FRUS title, administration, or date range is assigned to the player.

The 1,100-page starting point and two packets are an illustrative exercise, not records from an actual manuscript. The existing SOP game mapping supplies the 1,400 document-page limit and annotation distinction. No new operational claim is introduced.

Draft arrangement uses numeric sceneProgress flags and saves after each move. It does not grant selection credit. Filing succeeds only after the model checks substantive coverage and the page budget; existing ordered SOP progression still handles chapter assembly, first review, second review, revision, front matter, Joint Historian review, and DPD submission. Existing completed saves are not reset.

The panel has keyboard, touch, and gamepad navigation, visible filing/budget controls, scrollable packets, focus containment, safe-area spacing, reduced-motion behavior, and scene-shutdown cleanup. On short screens, vertical controller navigation first reveals clipped packet content. Native dialog presentation keeps it above fullscreen. Temporary touch-action changes are restored when it closes. Existing original paper and filing foley supply feedback.

Validation tools: `tools/qa-manuscript-desk.mjs` exercises missing-evidence and over-budget rejection, reversible packet movement, draft save/reload, simulated controller actions, finger scrolling, and continuation through DPD handoff at desktop, portrait-phone, and landscape sizes. Unit tests cover selection rules and existing checkpoint ordering. The browser fixtures seed a ready Archive scene; they are not a new-game-to-victory run. Physical iPhone Safari and physical controllers remain unverified.

Remaining broader work includes replacing other lengthy quiz chains with document-handling encounters, establishing a consistent modern presentation across the campaign, reviewing movement/combat and sound in sustained play, and completing a fresh end-to-end victory/learning audit. Those requirements remain open.

## Chapter assembly

After selecting the manuscript evidence, the player handles three clearly illustrative exhibits. The conversation happened on Day 1 but was written up on Day 5; an instruction was issued on Day 3 from a Day 2 draft; an implementation report is dated Day 6. The player orders those records, retaining both kinds of dates. These are invented exercise exhibits, not archival documents or quotations.

The annotation quotes a shortfall described in the implementation report. The player must select Exercise C and highlight the supporting sentence. Changing to a different exhibit clears the old highlight; reopening the same exhibit retains it. The final packet requires the ordered documents, one chapter annotation file, and backup numbered to footnote 1. All prerequisites are rechecked before submission; stale or malformed drafts cannot silently bypass the work. The existing supervisor first review follows.

Numeric sceneProgress fields retain the arrangement, annotation link, highlight and packet attachments across save/reload. Neither editing the draft nor advancing inside the desk grants the SOP checkpoint. Only the final valid packet can complete the existing backup task. Old completed tasks remain complete without fabricating work on these new illustrative exhibits.

`DeskControls` now supplies both desks' modal lifecycle and input behavior. `tools/qa-chapter-desk.mjs` covers earned interactions, error feedback, stage-by-stage reload and arrival at first review. `tools/qa-chapter-desk-lifecycle.mjs` checks fullscreen, dynamic keyboard/controller focus, cancellation and scene cleanup. Fullscreen checks should run separately from the headed skill client. A discovered between-frame F-key tap loss is fixed in the existing input latch and covered by an input regression test.

## Evidence-led revision

Both existing ordered reviews must be complete before the revision desk opens. The player opens a supervisor's coverage-gap comment and a General Editor's unsupported-claim comment on footnote 2. This is a second illustrative annotation, not a reversal of the correctly supported footnote 1 from chapter assembly. A routing slip, follow-up report, and file cover provide distinct evidence: only the follow-up report's substantive passage establishes that the resource shortfall continued.

The player highlights the relevant passage, reviews the proposed correction alongside the retained original, explicitly applies it to a revision copy, and attaches backup 2. Choosing another source or passage invalidates the applied correction. The original and review comments remain available. Draft changes save without granting revision credit; final filing rechecks both reviews, both comments, source, passage, applied correction, and numbered backup. It then resumes the existing front-matter clearance task, without granting DPD submission or publication.

First and second review routing still use the prior choice encounters. Their richer presentation remains open alongside the broader campaign work. These invented exhibits do not name the compiler's assigned volume or claim to reproduce real archival documents. Keyboard/touch/controller and modal lifecycle use the common DeskControls system. `tools/qa-revision-desk.mjs` covers wrong evidence, draft reload, source-change invalidation, original preservation, and arrival at front-matter review. The combined manuscript route earns this desk through `tools/revision-desk-actions.mjs`.
