# Editor Chapter: Earned-Route Pacing Audit

## Baseline

2026-09-09, local build at commit 28e2484. The route begins with the actual
Referral completion saves from the preceding keyboard and touch playthroughs.
No tools, tasks or points were injected. Replay: tools/qa-proof-comparison.mjs.

The opening bracket task, OpenNet source match and final typeset comparison
ask the player to edit a document rather than simply accept an answer. Their
drafts survive Continue. Filing and stamping remain separate, so finding the
correct edit does not silently award the tool or advance the chapter.

## What Still Feels Too Much Like a Quiz

Five middle tasks use two-choice prompts: released-excerpt scope, a wholly
withheld entry, conversation date, marginal note and index reference. The
screens are legible, but repeated walk/check/stamp/handoff cycles produce
little spatial or mechanical variation. Working traversal is not evidence
that this section meets the adventure-game goal.

The date prompt is the clearest next replacement. It currently states both
the meeting and drafting dates, then asks the player to pick one. Instead:

1. Show a small chronology with two fixed records and one movable memcon.
2. Let the player slide that record into its chronological position using
   retained meeting-time evidence, not the later drafting date.
3. Persist the unfiled placement; an incorrect placement gives a specific
   hint without awarding progress or requiring a fresh walk to the desk.
4. Keep explicit filing and the existing stamp/tool reward boundaries.
5. Retest touch, wrong placement, cancel, Continue, backtracking and the
   complete 87-point chapter route.

Reuse established board/input patterns. The existing withholding chronology
is useful implementation precedent, but its separate task and evidence must
not be silently reused as an already-solved Editor puzzle. Keep the scenario
clearly labeled fictional training evidence.

## Coverage Limits

Both keyboard and 375x667/DPR-3 Chromium touch completed all eight tasks,
earned exactly 87 points (114 to 201), continued at partial and completed
states, backtracked without new rewards and entered BlackVaultLairScene.
Both result files report zero browser errors. The installed game client also
reopened the earned final proof; native rendering matched its choice state.
Screenshots of the date question and touch proof are retained under
docs/screenshots/editor-audit-*.png.

Full local artifacts: /private/tmp/frus-editor-earned-0909/desktop/,
/private/tmp/frus-editor-earned-touch-0909/mobile/ and
/private/tmp/frus-editor-client-0909/. No code changed, so this audit did not
rerun the build or unit suite from the preceding verified commit.

These scripted playthroughs exercise real keyboard/pointer inputs but know
the route and answers. They do not establish first-time discoverability,
real iPhone Safari behavior, or sustained 60 fps. No production game behavior
was changed during this audit. Full-game fun remains unproven.
