# Interactive compiler desk

The game’s broader goal is a modern console-quality adventure that teaches FRUS production through play. This change replaces only the manuscript-selection quiz. It does not claim to finish the campaign-wide overhaul.

The Archive east manuscript desk now opens a native-resolution reading surface over the existing logical game canvas. Players place two illustrative research packets into a working manuscript. The page budget reacts immediately; keeping only routine material fails even though it fits. The decision packet retains policy instructions, dissent, and implementation evidence. Unselected material stays in the source file rather than being destroyed. No particular FRUS title, administration, or date range is assigned to the player.

The 1,100-page starting point and two packets are an illustrative exercise, not records from an actual manuscript. The existing SOP game mapping supplies the 1,400 document-page limit and annotation distinction. No new operational claim is introduced.

Draft arrangement uses numeric sceneProgress flags and saves after each move. It does not grant selection credit. Filing succeeds only after the model checks substantive coverage and the page budget; existing ordered SOP progression still handles chapter assembly, first review, second review, revision, front matter, Joint Historian review, and DPD submission. Existing completed saves are not reset.

The panel has keyboard, touch, and gamepad navigation, visible filing/budget controls, scrollable packets, focus containment, safe-area spacing, reduced-motion behavior, and scene-shutdown cleanup. On short screens, vertical controller navigation first reveals clipped packet content. Native dialog presentation keeps it above fullscreen. Temporary touch-action changes are restored when it closes. Existing original paper and filing foley supply feedback.

Validation tools: `tools/qa-manuscript-desk.mjs` exercises missing-evidence and over-budget rejection, reversible packet movement, draft save/reload, simulated controller actions, finger scrolling, and continuation through DPD handoff at desktop, portrait-phone, and landscape sizes. Unit tests cover selection rules and existing checkpoint ordering. The browser fixtures seed a ready Archive scene; they are not a new-game-to-victory run. Physical iPhone Safari and physical controllers remain unverified.

Remaining broader work includes replacing other lengthy quiz chains with document-handling encounters, establishing a consistent modern presentation across the campaign, reviewing movement/combat and sound in sustained play, and completing a fresh end-to-end victory/learning audit. Those requirements remain open.
