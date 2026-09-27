# Contextual travel cards

Destination cards now identify the selected presidential library, its NSC wing, or the actual outdoor region. Main workflow chapters have human-readable names and concise process captions; no specific volume assignment is introduced. Existing transition duration and reduced-motion behavior are preserved.

Browser validation at 390 x 844 covers all four current libraries, the Bush43 NSC wing with reduced motion, and the Texas outdoor region. It uses direct transitions from an Office fixture (not earned travel). For inspection only, the covered-card delay is paused; after resuming, each destination starts and its arrival fade completes. All text remains within horizontal margins, title and caption do not overlap, and no page errors occur. NSC card compositor screenshot inspected.

Production build passed. Full regression suite: 282 files, 2110 tests passed. Standard skill client reaches Office explore and moves to x143; its canvas screenshot retains the known black-capture limitation. Compositor capture renders normally. Physical hardware and subjective readability during unpaused travel remain unverified.

## Gameplay chrome during travel

Follow-up fixes the stale source-room HUD visible above the curtain. UIScene suppresses the quest band and gameplay controls while the transition state is active, and resumes scene-based presentation afterward. TouchControls now treats a null active scene as hidden, also honoring the existing Codex overlay caller. Unit regression covers travel suppression/restoration and null-scene controls.

All six browser cases reran with touch enabled, asserting hidden controls/HUD on the covered card and restored controls/HUD after arrival. No errors. Inspected NSC phone compositor screenshot; no stale Kathy objective remains. Fresh build and 282 files / 2111 tests pass. Headed standard client reaches Office explore at x146; black canvas capture limitation remains. No claim of physical touch or full-campaign validation.
