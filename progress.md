Original prompt: Build a Web-Based NES-Style FRUS Production Game, working title Ruby Rule: The FRUS Quest.

## Progress

- Codex + Perplexity integration play pass (2026-07-11):
  - Composed all 21 open PR heads into `codex/gameplay-integration`; every open head commit is an ancestor of the integration branch.
  - Reconciled accessibility, NG+, completion stats, equity endings, the hidden room, second-volume unlocks, deferred art loading, and both Perplexity art drops without dropping sibling state fields or scene assets.
  - Fixed deferred loading gaps so the accessibility HUD, ending variants, and Hidden Reading Room load their own textures instead of relying on the old boot-wide art preload.
  - Removed post-start WebGL backing/camera mutation from the pixel scaler; Phaser now retains its 256x240 logical buffer while nearest-neighbor CSS scaling resolves to an integer physical-pixel multiple.
  - Live-played the Office tutorial route and removed the redundant blocking dialog after a successful Assignment Memo stamp; the existing toast now returns control immediately.
  - Replaced the Archive Cavern's unsolicited entry dialog with a concise `STAMP -> FRAGMENT -> GATE` route toast; the colleague's optional interaction still carries the longer workflow explanation.
  - Made the first Verification Gate non-blocking: missing evidence produces a warning toast, while a cited fragment produces a brief success toast and automatic room transition.
  - Removed Archive A1's unsolicited three-page briefing; the room now opens in movement mode with a concise Source Note 47 route toast.
  - Fixed cleared DANN-E rooms reporting `0/0` and `roomClear: null`; persisted/cheat-cleared encounters now expose their expected defeated count and a positive room-clear marker to `render_game_to_text()`.
  - Desktop + mobile QA: all 25 registered `?scene=` routes boot to the requested scene with no page/console errors; DPR-3 iPhone emulation maps the 341.3x320 CSS canvas to 4 physical pixels per game pixel at ~60 fps with zero scale-guard adjustments.
  - Verified multi-touch combat by holding the floating D-pad while pressing B: movement advanced 14px while the Citation Stamp entered cooldown, with independent pointer IDs and no dropped input.
  - Verified tool weakness live in Black Vault: Citation Stamp damaged Cloud Form (4 -> 3 HP), while Red Pencil produced a resistance cue and no damage; seeded clear state now reports 4/4 and opens the blast-door flags.
  - Removed the meaningless first-run `VOLUMES COMPLETED 0` overlay that was colliding with the baked title logo; completion history remains visible once NG+ is unlocked.

- DANN-E/weapon/volume automated coverage pass (2026-07-06):
  - Added direct unit coverage for live DANN-E enemy interactions: matching-tool damage, wrong-tool knockback without damage, loot/volume-piece awards on defeat, and room-clear gate unlock behavior.
  - Added save/restore coverage for FRUS volume assembly progress and verified the 5/5 completion flag is set when the final cover piece is earned.
  - Strengthened weapon-state coverage so a single active swing keeps one swing id and can be used to prevent repeat hits on the same DANN-E target.
  - Verification: `npm run test` passes (77 files / 375 tests), `npm run build` passes, and the required web-game client completed against Black Vault with DANN-E threat/readout state present.
- Combat feel / ALTTP juice pass (2026-07-07):
  - Added `src/systems/combatFeedback.ts`, a small reusable screen-shake helper with pure, tuned hit-feedback profiles (`player-hurt`, `player-hurt-heavy`, `boss-hit`, `boss-defeat`) plus `resolveHitFeedback` (scaling + clamping) and an `applyHitShake(scene, kind)` wrapper that no-ops safely during teardown.
  - Intensities are capped so shake stays ~1-2px on the 256x240 canvas, preserving pixel-perfect art while adding an impact flinch.
  - Wired shake into the universal damage choke point `Player.takeHit` (heavy variant for high-knockback wall hits, normal for lurker/ego-bolt contact) so every scene gets consistent got-hit feedback.
  - Wired shake into the DANN-E boss: a light flinch on each Ruby Pen sword connect and a stronger shake on final defeat.
  - Added `src/systems/combatFeedback.test.ts` (profile defaults, subtlety bounds, heavy>normal ordering, scaling, clamp, and non-finite/negative scale safety).
  - Verification: `tsc --noEmit` clean; `npm test` 74 files / 362 tests pass; `npm run build` passes (known Vite large-chunk warning only).
- Localization scaffold pass (2026-07-07):
  - Added a typed `src/systems/i18n.ts` helper with `getString(key)` lookup, interpolation, localStorage persistence, and English fallback for missing Spanish/French keys.
  - Added the English baseline strings beside the existing Spanish/French packs and extended those packs with language/pause-menu labels.
  - Wired the title screen language selector (`LANG EN/ES/FR`, pointer or `L`) and localized the procedural title, route strip, source shoutout, mission plaque, skip-warning toggle, HUD quest band, gamepad/touch toasts, and pause/subscreen labels.
  - Added focused helper tests covering fallback, interpolation, and language selection.
- Canonical DANN-E eight-variant combat correction (2026-07-06):
  - Revised the live DANN-E combat registry to use exactly the eight PR #7/#8 variant assets: Prime, Mark I, Colossus, Cloud, Executive, Swarm, Defeated, and Ascendant.
  - Removed redactor-drone and censorship-wraith from the DANN-E variant registry so those extra pack enemies no longer masquerade as DANN-E forms.
  - Distributed the eight canonical DANN-E forms across GameplayMapScene combat rooms: Black Vault, NARA Stacks, Embassy, and Capitol Hill.
  - Scaled the single-card DANN-E variant art down to enemy-token size and hid permanent labels during normal play; names/HP remain available through `window.render_game_to_text()` and `?debug=threats`.
  - Updated `docs/DANNE_ENEMY_DESIGN.md` and tests so future changes cannot silently add non-canonical DANN-E variants.
- Colorblind accessibility mode pass (2026-07-07):
  - Registered the accessibility overlay art pack as typed preload assets so HUD, enemy, and boss feedback can swap to pattern-backed indicators without hardcoded paths.
  - Added a persisted `High Contrast / Colorblind Mode` pause-subscreen toggle, available from Esc/M pause flow and stored in `localStorage`.
  - Wired pattern overlays into reliability hearts, process-tool slots, enemy HP bars, boss HP/phase/weakness indicators, and `window.render_game_to_text()` state.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=colorblind-smoke`;
    - direct Playwright probe confirmed Esc opens the subscreen and clicking `HC / CB` keeps pause open while persisting `ruby-rule.highContrastColorblind=true`;
    - visual proof: `output/colorblind-pause-after-toggle.png`.
- New Game+ unlock pass (2026-07-06):
  - Added persistent New Game+ metadata (`ngPlusUnlocked`, `volumesCompleted`) separate from the normal save slot, so clearing or starting a fresh game does not erase completion history.
  - Completing the Buckram Gate binding/publication ceremony now counts the volume once per run, unlocks New Game+, and displays the lifetime completed-volume count on the title and ending summary screens.
  - Wired the NG+ veteran editor cosmetic sheets from `public/assets/art-pack/ng-plus/` through the central 32x48 character registry; New Game+ runs automatically use veteran role sprites in character creation and gameplay.
  - Added a veteran DANN-E difficulty tier that shifts the existing curve upward with more HP, faster movement/projectiles, shorter attack cooldowns, and faster statutory-clock pressure while leaving normal mode unchanged.
  - Verification:
    - `npm run test` passes (72 files / 354 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=TitleScene&v=ngplus-smoke`;
    - direct Playwright probes confirmed title count/NG+ selection, `newGamePlus.active === true`, `difficultyTier === "veteran"`, and active player sprite `reviewer_veteran` after entering Office;
    - visual proof: `output/ngplus-probe/title-unlocked.png`, `output/ngplus-probe/character-veteran.png`, and `output/ngplus-probe/office-veteran.png`.
- Equity-resolution ending branch (2026-07-06):
  - Added a save-safe unresolved-equities counter to `GameState`, completion stats, and `window.render_game_to_text()`.
  - Wired concrete declassification/referral failure points into the counter: wrong OpenNet/ClassNet routing, wrong agency-equity matching, unchecked StateChat referral manifests, failed foreign-government permission/withholding appeal gates, visible-excision failures, and DANN-E's omission shortcut.
  - Added a publication outcome readout (`Published clean` vs. `Published under appeal`) and froze the outcome when completion stats finalize.
  - Added original repo-local alt-ending pixel art under `public/assets/art-pack/alt-ending/` and registered it through `ALT_ENDING_ASSETS`.
  - Branched the Buckram Gate publication result: clean runs keep the existing binding-ceremony prize, while unresolved equities show a contested-declassification / under-appeal ending and completion-stat outcome.
  - Verification:
    - `npm test -- --run src/game/completionStats.test.ts` passes (1 file / 4 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=equity-ending-smoke`;
    - Chrome-backed visual smoke against `EndingScene` reports zero console errors and a valid `render_game_to_text()` state;
    - full `npm test -- --run` currently fails in pre-existing `src/art/characterSprites.test.ts` because that test still expects every character pose to resolve to frame 0.
- Second FRUS volume world-region unlock pass (2026-07-06):
  - Wired the existing `public/assets/art-pack/world2/` Overseas Post map into the live world-map selector as a post-completion region rather than an always-open sixth atlas page.
  - Added `secondVolumeUnlocked` to `GameState`, save/restore normalization, and `window.render_game_to_text()` output so QA can verify whether the second-volume region is available.
  - Publishing the first FRUS volume now sets the second-volume unlock flag, and direct `?scene=WorldMapScene&region=overseas_post` links display a locked-region prompt until the flag is present.
  - Reused the existing district routing into `GameplayMapScene`, DANN-E routes, and FRUS room graph instead of duplicating dungeon or combat logic for the new map.
  - Verification:
    - focused tests cover explicit unlock, final-gate publication unlock, save/restore persistence, and legacy scene-progress normalization;
    - build and browser smoke-test details are in this branch's PR checklist.
- ALTTP disassembly translation pass (2026-07-05):
  - Studied `JaredBrian/AsarUSALTTPDisassembly` as a mechanics reference only, focusing on room data pointers, ancilla object allocation/update loops, sprite damage checks, direction-to-player helpers, and milestone item effects.
  - Added `src/game/lttpFrusTranslation.ts` and `docs/lttp-frus-translation.md` to formalize how those patterns become FRUS rooms, process-effect slots, standards/reliability damage, DANN-E pressure targeting, and publication milestone rewards.
  - Exposed the translation through the full `window.render_game_to_text()` debug state so QA can verify that the game is aiming at a Zelda-like grammar without copying protected assets or expression.
  - Capped DANN-E's roaming Ego bolts at four active slots inside the ten-slot FRUS temporary-effect model, keeping deadline pressure readable on the 256x240 screen.
- DANN-E Ego attack and boast encounter pass (2026-07-05):
  - Upgraded the reusable roaming `DanneLurker` so DANN-E now boasts in a floating speech cue and fires visible Ego-bolt attacks when the hero enters range.
  - Reused the existing DANN-E ego-bolt VFX/audio and added a small gold-edged red stamp body so the projectile remains readable against ruby/black vault art.
  - Wired Ego-bolt hits into Office, Archive, Network, Referral Vault, Silent Read, and the Black Vault gameplay map; hits apply the existing missed-30-year-deadline standards damage and update the objective toward lawful human review.
  - Added a Black Vault `GameplayMapScene` DANN-E encounter so the static gameplay-map route now has the same lurker behavior before the dedicated final boss scene.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - `npm test -- --run src/input/InputState.test.ts src/systems/standardsDamage.test.ts` passes (2 files / 19 tests);
    - required web-game client completed against `?scene=GameplayMapScene&map=black_vault&role=compiler&name=Ruby&v=danne-ego-final-client`;
    - direct Playwright probes confirmed `visibleThreats[0].behavior` reports DANN-E "boasts, and fires ego bolts", the live boast line `DANN-E boasts: OMIT THE HARD PART.`, and standards damage on Ego-bolt hit with zero browser errors;
    - visual proof: `output/danne-ego-final-early.png`, `output/danne-ego-final-proof.png`, and `output/danne-ego-gameplay-map.png`.
- Opening history.state.gov shoutout pass (2026-07-05):
  - Added a small `FRUS SOURCE TRAIL: HISTORY.STATE.GOV` line to the first DANN-E warning card.
  - Added the same small source-trail line to the procedural title card so the shoutout remains visible when the warning is skipped.
  - Updated the opening scene text-state entities so `window.render_game_to_text()` exposes the history.state.gov shoutout during automated QA.
  - Verification:
    - `npm test -- --run src/input/InputState.test.ts src/scenes/TitleScene.test.ts` passes (2 files / 25 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?v=history-shoutout-client`;
    - direct Playwright probe confirmed `WarningScene` exposes `history.state.gov shoutout` in `window.render_game_to_text()` and reports zero browser errors;
    - visual proof: `output/history-shoutout-warning.png` and `output/history-shoutout-title.png`.
- Eerie public-domain Bach background music pass (2026-07-05):
  - Added a richer `Eerie Bach Fugue` Web Audio theme built from repo-local MIDI note data derived from checked-in public-domain Bach MIDI sources.
  - Layered the background music with low pedal tones, a delayed counterline, and a chromatic square-wave lead so it reads more like eerie Bach than a thin single-line chiptune.
  - Mapped the main production route (Title, Character Create, Office/Guide, Archive, Network, Referral Vault, and Silent Read) to the new eerie Bach theme while preserving the existing procedural scene stems elsewhere.
  - Updated `public/assets/audio/ATTRIBUTION.md` to document that the theme is a repo-local Web Audio arrangement and does not use a copyrighted recording.
  - Verification:
    - normal browser flow confirmed audio unlocks on first tap and `window.rubyRuleAudioDebug()` reports `currentThemeTitle: "Eerie Bach Fugue"` with `musicTimerActive: true`;
    - direct Office route reports the same theme after the main route remap;
    - `npm run build` passes with the known Vite large-chunk warning;
    - focused `npm test -- --run src/input/InputState.test.ts` passes (1 file / 16 tests);
    - required web-game client completed against `?v=eerie-bach-client-final`;
    - visual proof: `output/eerie-bach-normal-flow-office.png`.
- iPhone playability pass (2026-07-05):
  - Found and fixed a mobile-specific blocker where a quick on-screen A-button tap could press and release between frames, so `aJustPressed` never reached gameplay scenes.
  - Added a short touch-control latch parallel to the existing keyboard tap latch, preserving one clean interaction edge for brief A/B/Start-style taps.
  - Made CharacterCreateScene easier to start on a phone by turning the large role preview and begin prompt into forgiving confirmation targets, with copy changed to `A / TAP PREVIEW TO BEGIN`.
  - Verification:
    - iPhone 14 Pro emulation confirmed Warning -> Title -> Character Create -> touch confirm -> Office;
    - iPhone portrait confirmed virtual D-pad movement, approach to Junior Compiler, and on-screen A interaction advancing the objective to `Pick up the Assignment Memo.`;
    - iPhone landscape confirmed virtual D-pad movement with integer zoom and touch controls active;
    - `npm test -- --run src/input/InputState.test.ts` passes (1 file / 16 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?v=iphone-touch-latch-client`;
    - visual proof: `output/iphone-final-qa/iphone-portrait-office-after-a.png` and `output/iphone-final-qa/iphone-landscape-office-move.png`.
- DANN-E lurking obstacle pass (2026-07-05):
  - Added a reusable `DanneLurker` enemy that uses existing DANN-E art and patrols workflow routes as deadline-pressure friction rather than replacing StateChat or human review.
  - Wired the lurker into Office, Archive, Network, Referral Vault, and Silent Read scenes; the existing Ending/Buckram Gate still reports the 30-year line and DANN-E queue as final blockers.
  - DANN-E pressure now applies the `missed_30_year_deadline` standards violation, debits reliability hearts, bumps the player, and refreshes the objective toward human review instead of shortcutting the process.
  - The visible-threat readout now includes DANN-E alongside scene-specific bureaucratic walls, so the obstacle is inspectable through `window.render_game_to_text()`.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - focused `npm test -- --run src/input/InputState.test.ts src/systems/standardsDamage.test.ts` passes (2 files / 18 tests);
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=danne-lurker-client-2`;
    - direct Playwright sweep confirmed Office, Archive, Network, Referral Vault, Silent Read, and Ending all report DANN-E in visible threats with zero fatal browser errors;
    - visual proof: `output/danne-lurker-OfficeScene.png` and `output/danne-lurker-ArchiveScene.png`.
- Cohesive FRUS character sprite pass (2026-07-05):
  - Replaced the broken imported native 32x48 character animation sheets with original repo-local FRUS-themed pixel sheets that preserve the same filenames, dimensions, 4x4 frame layout, transparency, and role identities.
  - Added `scripts/sharpen-frus-character-sprites.py` so the character sheets can be regenerated reproducibly; original imported sheets are backed up under `public/assets/_originals/art-pack/sprites/native/`.
  - Restored real 4-direction idle/walk/action frame usage in `src/art/character_anims.ts` instead of forcing every animation to frame 0.
  - Updated `Player` art priority so the playable character uses the same sharpened 32x48 art family as role cards and NPCs, with older SVG role strips retained as fallback.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/input/InputState.test.ts src/scenes/CharacterCreateScene.test.ts` passes (3 files / 19 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=SpriteGallery&v=sharp-sprites-generated-client`;
    - direct Playwright visual probe confirmed `SpriteGallery` and `OfficeScene` render with zero browser errors;
    - visual proof: `output/sharp-sprites-generated-gallery.png`, `output/sharp-sprites-generated-office.png`, and `output/native-sprites-generated-montage.png`.
- First-three-minutes physical loop pass (2026-07-04):
  - Replaced the opening Office station-check sequence with one concrete task: talk to JR, pick up the Assignment Memo, carry it to INBOX, stamp it, and enter Archive Guide.
  - Made the first JR interaction non-modal so the first click starts the task instead of forcing players through dialogue pages.
  - Added a visible Assignment Memo object, a held-item state, route/stamp states at the INBOX, and a clear `ARCHIVE GUIDE OPEN` unlock burst.
  - Kept the first Office visually quiet by hiding route diagrams and station labels during the opening loop; prompts now introduce terms only when the player is acting on them.
  - Widened the onboarding-only INBOX interaction radius so the first physical routing step is forgiving.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - direct bundled-Playwright route confirmed JR -> Assignment Memo -> INBOX route -> INBOX stamp -> Master Declass Key -> GuideScene;
    - visual proof: `output/targeted-nonmodal-first-loop-after-stamp.png` and `output/targeted-enter-archive-final.png`.
- Gameplay HUD declutter pass (2026-07-03):
  - Removed the duplicate legacy room HUD from Guide, Archive, Network, Referral Vault, Silent Read, Office, and Ending scenes so the global quest band is the only persistent top HUD.
  - Hid the ReliabilityHud summary by default in the gameplay scenes; the reliability detail panel remains available when explicitly opened, but it no longer paints production text over the playfield on scene load.
  - Hid permanent multi-room title labels in Archive, Network, Referral Vault, and Silent Read scenes. The animated room-entry banner now provides location feedback without colliding with minimaps or room art.
  - Tightened the default dialog frame from a large bottom box into a smaller caption-style box, preserving guidance while leaving more of the room visible during conversations.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - focused `npm test -- --run src/input/InputState.test.ts src/systems/interactionPrompt.test.ts` passes (2 files / 21 tests);
    - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=adventure-hud-client`;
    - visual proof: `output/adventure-dialog-pass/GuideScene.png`, `output/adventure-dialog-pass/ArchiveScene.png`, and `output/adventure-dialog-pass/NetworkScene.png`.
- First-route gameplay feel pass (2026-07-03):
  - Played the current first-time-player opening flow and found that the game was technically playable but still felt noisy: the first Office room showed multiple station labels and route UI before the player had a reason to care, the JR target cue hid at the starting position, the role preview had an overlapping `EQUAL RANK` stage label, and the title prompt used the abstract phrase `VERIFY`.
  - Tightened the first quest into a single readable lane: JR -> Production Inbox -> FRUS Cart -> Archive Terminal -> JR -> Archive Guide. The Archive Guide door now explains what is missing instead of silently acting like an early bypass.
  - Kept the first Office route visually quiet until the Master Declass Key is earned. Station labels appear after JR introduces the route, but the route compass and production/training board stay hidden until the first route is complete.
  - Reworked the gold target cue so it remains visible from the starting position and retargets to the next active station (`JR`, `INBOX`, `CART`, `TERM`, then `ARCHIVE`). Approach prompts now say `GO TO JR`/`GO TO INBOX` instead of the less useful `STEP CLOSER`.
  - Shortened Office objectives for the HUD (`Inspect Production Inbox.`, `Return to JR for the key.`, `Enter Archive Guide.`) so they fit the top band and read like immediate actions.
  - Cleaned the character creation role preview by removing the duplicate `EQUAL RANK` label that overlapped the sprite, and changed the title affordance to `PRESS START TO BEGIN`.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - focused `npm test -- --run src/scenes/TitleScene.test.ts src/scenes/CharacterCreateScene.test.ts src/input/InputState.test.ts src/systems/interactionPrompt.test.ts` passes (4 files / 33 tests);
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=feel-pass-client` and confirmed the JR dialog advances to objective `Inspect Production Inbox.`;
    - direct Playwright route confirmed JR -> Inbox -> Cart -> Terminal -> JR -> Archive transitions to `GuideScene`;
    - direct endgame smoke confirmed the Buckram Gate still reaches `Published FRUS cover complete.` and `PUBLISHED FRUS COVER - HUMAN CERTIFICATION RECORDED`;
    - visual proof: `output/feel-pass-3/after-dismiss.png` and `output/feel-pass-3/inbox-target.png`; route state proof: `output/feel-route/final.json`.
- Play-to-completion blocker pass (2026-07-03):
  - Played the current local build with the browser harness from the opening route into Office, then through Guide/Archive A1, Network routing, and the Buckram Gate publication table.
  - Fixed the first Office quest lane: lower furniture collision was blocking the inbox/cart/terminal route, and the Junior Compiler remained too easy to re-trigger while the objective asked for station checks. The lower lane is now open, JR has a smaller radius during station checks, and the expected station gets a slightly larger active radius.
  - Fixed choice prompts so the primary action button (Space/Enter/gamepad A/touch A) selects option A. This matches the on-screen prompts and makes the repeated FRUS review checks playable without requiring players to discover literal letter-key input.
  - Fixed the Buckram Gate deadlock where `APP SRC`/sources-consulted appeared as the next blocker but the publication table refused to start front-matter assembly. Sources consulted is now treated as part of the front-matter assembly blocker set.
  - Verification:
    - Office route script confirmed JR -> Production Inbox -> FRUS Cart -> Archive Terminal -> return to JR -> Master Declass Key -> Archive Guide transition;
    - Archive route script confirmed Source Note 47 pickup -> research-table route -> provenance verification -> citation stamp -> annotation -> remaining documents -> NetworkScene transition;
    - Network route script confirmed pointer route sequence `A A A B B B B` clears FIREWALL and awards the network stamp; primary action now advances A-choice review prompts;
    - Ending route script confirmed Buckram Gate now advances through front matter, reader aids, index, typesetter corrections, final certification, GPO handoff, funding, ledger, digital release, public citation, release calendar, and publishes the FRUS cover;
    - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=post-fix-harness-ending`;
    - `npm run build` passes with the known Vite large-chunk warning.
- Chrome playtest smoothing pass (2026-07-02):
  - Played the live local build in Chrome from WarningScene through TitleScene, CharacterCreateScene, and the Office Hub opening loop.
  - Found and fixed a one-press scene-skip: pressing Enter on the DANN-E warning could carry through the title and land directly on role select. WarningScene now swallows the transition input, and TitleScene only advances on a fresh press.
  - Found and fixed first-room target confusion: before the Junior Compiler introduction, nearby desks could show or trigger Production Inbox even while the objective said `TALK TO JR`. OfficeScene now filters active interactables to JR only until the introduction completes.
  - Made the tutorial NPC forgiving without stealing later station focus: JR uses an enlarged interaction radius only before the introduction; after that, desks and stations regain normal priority.
  - Replaced the far-away `TALK` marker with a destination-style `JR` marker and hands off to the actionable `A TALK JUNIOR COMPILER` prompt when close.
  - Replaced repeated completed-station wording from a failure-like `Check order matters` with `Already logged. Next: go to ...`.
  - Fixed a global dialog fallthrough issue: closing a dialog now swallows the closing input for one frame, preventing `advance text` from also immediately re-triggering the object underneath.
  - Verification:
    - Chrome screenshots confirmed WarningScene -> TitleScene stops on title, role select still requires its own confirm, Office now shows `A TALK JUNIOR COMPILER`, and post-JR HUD/prompt points to Production Inbox;
    - `npm test -- --run src/scenes/TitleScene.test.ts src/input/InputState.test.ts src/systems/interactionPrompt.test.ts` passes;
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=chrome-playtest-client-smoke` and reported the Office objective/interactable state.
- First-load friction cleanup pass (2026-07-02):
  - Replaced the dense full-art DANN-E warning with a quieter in-engine pixel panel that states the antagonist is fictional and warns about bad shortcuts.
  - Fixed first-load input friction: any tap/click or A/Start press now advances the warning immediately instead of being ignored during the first delay window.
  - Shrank the title-screen warning preference control so it reads as a secondary setting rather than a primary game action.
  - Gated BootScene asset-registry and 16-bit sprite-size console logs behind `?debug=assets`, keeping normal QA/browser sessions clear for real errors.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - focused `npm test -- --run src/scenes/TitleScene.test.ts src/scenes/CharacterCreateScene.test.ts src/input/InputState.test.ts src/systems/interactionPrompt.test.ts` passes (4 files / 34 tests);
    - required web-game client completed against `?v=game-cleanup-client-final`;
    - direct bundled-Playwright probe confirmed first tap advances from WarningScene to TitleScene, no page errors, and no normal asset-log spam;
    - visual proof: `output/game-cleanup/final3/WarningScene-simple.png` and `output/game-cleanup/final3/After-warning-click.png`.
- Opening-screen declutter pass (2026-07-02):
  - Replaced the dense pre-rendered title illustration with a quieter procedural ruby buckram title card: logo, FRUS volume icon, start prompt, and one mission plaque.
  - Removed the title control cheat-sheet from the first screen so it no longer competes with the core goal.
  - Simplified character creation by hiding the workflow relic strip, side ability plaque, and small stage runes; the selected role, role row, and first action now read first.
  - Simplified the first Office tutorial by dimming the room behind it and reducing the copy to one action: `TALK TO JR`, with `A/Space` as the only control cue.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - focused `npm test -- --run src/scenes/TitleScene.test.ts src/scenes/CharacterCreateScene.test.ts src/input/InputState.test.ts src/systems/interactionPrompt.test.ts` passes (4 files / 34 tests);
    - required web-game client completed against `?scene=TitleScene&role=compiler&name=Ruby&v=declutter-client-final`;
    - direct bundled-Playwright probe captured Title, CharacterCreate, and Office with zero page errors;
    - visual proof: `output/declutter-opening/final/TitleScene.png`, `output/declutter-opening/final/CharacterCreateScene.png`, and `output/declutter-opening/final/OfficeScene.png`.
- Onboarding clarity pass (2026-07-02):
  - Added shared player-facing mission copy that explains the opening goal, verb loop, stakes, and first action in plain language.
  - Updated the title mission plaque to state: publish one reliable FRUS volume; talk/carry/verify/stamp; reliability hearts punish bad shortcuts.
  - Updated character creation so players know any role is valid, the quest is shared, and the first task is to talk to the Junior Compiler.
  - Expanded the first Office tutorial card so the opening room says exactly what to do: stand by `JR` and press `A/Space`.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - focused `npm test -- --run src/scenes/TitleScene.test.ts src/scenes/CharacterCreateScene.test.ts src/input/InputState.test.ts src/systems/interactionPrompt.test.ts` passes (4 files / 34 tests);
    - required web-game client completed against `?scene=TitleScene&role=compiler&name=Ruby&v=onboarding-client-final`;
    - direct bundled-Playwright probe captured Title, CharacterCreate, and Office with zero page errors;
    - visual proof: `output/onboarding-clarity/after-final/TitleScene.png`, `output/onboarding-clarity/after-final/CharacterCreateScene.png`, and `output/onboarding-clarity/after-final/OfficeScene.png`.
- First-room HUD cleanup pass (2026-07-02):
  - Simplified the always-on quest band so Office onboarding shows one objective, one action cue, reliability hearts, and the equipped tool instead of stacking pendants, crystals, keys, cover fragments, and production counters.
  - Added a small floating `TALK` cue over the Junior Compiler for the first objective, hidden while tutorial/dialog/choice overlays are active and removed after the Junior Compiler introduction.
  - Hid the dense production/training route board and first-hour relic until the player has met the Junior Compiler, reducing first-screen poster clutter without deleting the later progress display.
  - Fixed the Office tutorial card dismissal so all child text/panel objects are destroyed, and replaced non-ASCII middle-dot separators with ASCII hyphens for predictable pixel-font rendering.
  - Added a summary-visibility switch to `ReliabilityHud` and used it in OfficeScene so the global quest band is the only always-on top HUD there; legacy room-frame HUD chrome is hidden in OfficeScene.
  - Verification:
    - `npm run build` passes with the known Vite large-chunk warning;
    - focused `npm test -- --run src/input/InputState.test.ts src/scenes/CharacterCreateScene.test.ts src/systems/interactionPrompt.test.ts src/scenes/TitleScene.test.ts src/scenes/questBandCue.test.ts` passes (5 files / 38 tests);
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=first-room-cleanup-client-5`;
    - direct SwiftShader Playwright probe confirmed no page/console errors, hidden first-hour/production-board objects, hidden legacy Office HUD, visible `office-first-quest-cue`, and quest-band cue text `GO LEFT - TALK WHEN CLOSE`;
    - visual proof: `output/first-room-cleanup-client/direct-office-after-dismiss.png`; dialog probe: `output/first-room-cleanup-client/direct-office-junior-dialog.png`.
- Archive 16x16 tile-strip pass (2026-07-02):
  - Added an original repo-local `public/assets/sprites/snes-archive-tiles.svg` strip with eight 16x16 room-construction frames: floor base, cracked floor, dotted floor, ruby floor, wall top, wall front, wall side, and floor shadow.
  - Registered `SNES_ARCHIVE_TILE_ASSET` in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and registered named frames after texture load.
  - Updated `addSnesRoomLayer()` in `src/systems/snesPixelArt.ts` so archive/vault/boss/secret room layers prefer real tile sprites for floor and wall-depth construction while preserving the existing rectangle fallback path when texture frames are missing.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts` passes (1 file / 1 test);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=snes-archive-tiles-client`;
    - direct Playwright/Phaser probe confirmed texture `snes-archive-tiles`, all eight named frames, 130 visible archive tile sprites in both A1 and D3, frame coverage for floor/wall variants including ruby boss-room tiles, atlas readout `archiveTiles`, and zero page/console errors;
    - the required client screenshot remains black due to the known WebGL capture artifact, so visual proof comes from the direct SwiftShader probe: `docs/screenshots/snes-archive-tiles/page.png`; JSON proof: `docs/screenshots/snes-archive-tiles/state.json`.
- Archive room-detail sprite-strip pass (2026-07-02):
  - Wired the original repo-local `public/assets/sprites/snes-archive-room-details.svg` strip into live Archive Cavern room rendering.
  - `ArchiveScene` now adds sprite-based floor scuffs, corner shadows, wall caps, and directional route thresholds after the base SNES room layer while preserving primitive fallbacks if the texture or frame is missing.
  - Threshold detail frames reuse the existing traversal checks: open exits show cyan `threshold_open`, locked FRUS process gates show ruby `threshold_locked`, and boss/review routes show `threshold_boss`.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts` passes (1 file / 1 test);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=archive-room-details-client`;
    - direct Playwright/Phaser probe confirmed texture `snes-archive-room-details`, all six named frames, visible frame coverage for `floor_scuff/corner_shadow/wall_cap/threshold_open/threshold_locked/threshold_boss` across rooms A1/B1/D2/D3, atlas readout `archiveRoomDetails`, and zero page/console errors;
    - the required client screenshot remains black due to the known WebGL capture artifact, so visual proof comes from the direct SwiftShader probe: `docs/screenshots/archive-room-details/page.png`; JSON proof: `docs/screenshots/archive-room-details/state.json`.
- One-hour gameplay training current refresh (2026-07-02):
  - Treated `https://www.youtube.com/watch?v=Dq_gUziNZUk` as a high-level gameplay-grammar reference only, not literal model training and not a source for copied maps, sprites, music, names, text, enemies, or exact puzzle layouts.
  - Refreshed the public YouTube metadata and confirmed the title as `Legend of Zelda A LINK TO THE PAST Full Game Walkthrough - No Commentary (A Link to the Past Full)`.
  - Re-verified the existing first-hour training layer in the current tree: `window.render_game_to_text().oneHourTraining` reports `trainingWindowMinutes: 60`, `trainedMinuteMarks: 60`, `coveredDrills: 12`, `totalDrills: 12`, and active drill `hazard_readability` for minute range `45-50`.
  - Confirmed the Office scene visibly renders the one-hour route board, `1HR 45-50 HZ` chip, and `office-first-hour-training-relic` with no page/console errors.
  - Verification:
    - public oEmbed metadata check succeeded for the linked video;
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (2 files / 26 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-train-current-refresh`;
    - direct bundled-Playwright probe confirmed the runtime training readout and visible one-hour objects;
    - visual proof: `docs/screenshots/one-hour-training-current-turn/page.png`; JSON proof: `docs/screenshots/one-hour-training-current-turn/state.json`.
- Archive prop sprite-strip pass (2026-07-02):
  - Added an original repo-local `public/assets/sprites/snes-archive-props.svg` strip with five 64x48 Archive Cavern prop frames: bookcase, desk, document stack, ruby volume stack, and research table.
  - Registered `SNES_ARCHIVE_PROP_ASSET` in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and registered named frames after load.
  - Updated `ArchiveScene` so `drawBookcase()`, `drawDesk()`, `drawDocumentStack()`, `drawRubyVolumeStack()`, and `drawResearchTable()` prefer the new SNES prop frames while preserving the old rectangle/image fallback path and all existing collision/interactable behavior.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts` passes (1 file / 1 test);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=archive-props-client`;
    - direct Playwright/Phaser probe confirmed texture `snes-archive-props`, frames `bookcase/desk/document_stack/ruby_volumes/research_table`, visible named `archive-prop-*` image objects across rooms A1/B1/B2/D1, atlas readout `archiveProps`, and zero page/console errors;
    - the web-game client screenshot remains black due to the known WebGL capture artifact, so visual proof comes from the direct SwiftShader probe: `docs/screenshots/archive-props/page.png`; JSON proof: `docs/screenshots/archive-props/state.json`.
- One-hour source-window training pass (2026-07-02):
  - Treated `https://www.youtube.com/watch?v=Dq_gUziNZUk` as a first-hour gameplay-grammar reference only, not literal model training and not a source to copy maps, art, music, names, enemies, text, or exact puzzle layouts.
  - Confirmed the video metadata identifies a 23,936-second no-commentary full walkthrough; the game now records the trained slice explicitly as minutes 0-60 / 3,600 seconds in `window.render_game_to_text().oneHourTraining`.
  - Extended the one-hour training readout with `sourceDurationSeconds`, `trainedSeconds`, and `trainingWindow` so QA can prove the first-hour scope instead of assuming it from the 60-minute ledger.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (2 files / 26 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-source-window`;
    - direct browser probe confirmed `sourceDurationSeconds: 23936`, `trainedSeconds: 3600`, `trainingWindow: 0-60`, `trainedMinuteMarks: 60`, `coveredDrills: 12`, and `totalDrills: 12`;
    - visual proof: `docs/screenshots/one-hour-source-window-direct/page.png`; JSON proof: `docs/screenshots/one-hour-source-window-direct/state.json`.
- Archive gate glyph pass (2026-07-02):
  - Added an original repo-local `public/assets/sprites/snes-gate-glyphs.svg` strip with five 12x12 gate-state frames: open, locked, sealed, secret, and boss.
  - Registered `SNES_GATE_GLYPH_ASSET` in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and registered named frames after load.
  - Updated shared `addSnesGate()` in `src/systems/snesPixelArt.ts` so Archive room exits now display crisp state glyphs without changing collision, locked-exit checks, labels, or traversal rules.
  - The glyphs make one-screen room exits read more like a 16-bit action-adventure dungeon: closed walls are sealed slabs, locked FRUS workflow gates show ruby locks, open routes show cyan doors, secret routes show gold cracks, and boss routes show a red-gold warning mark.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts` passes (1 file / 1 test);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=archive-gate-glyphs-client-final`;
    - direct Playwright/Phaser probe confirmed texture `snes-gate-glyphs`, frames `open/locked/sealed/secret/boss`, visible named glyph objects such as `snes-gate-glyph-south-secret`, coverage of all five frame states across A1/A3/B3/C3, atlas readout `gateGlyphs`, current room `B3`, and zero page/console errors;
    - visual proof: `docs/screenshots/archive-gate-glyphs/page.png`; JSON proof: `docs/screenshots/archive-gate-glyphs/state.json`.
- Archive wall-map board sprite pass (2026-07-02):
  - Added an original repo-local `public/assets/sprites/snes-archive-wall-map-board.svg` sprite: a 48x30 ruby/cream/gold wall-board prop for Archive Cavern route hints.
  - Registered `SNES_ARCHIVE_WALL_MAP_BOARD_ASSET` in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and exposed it through `window.render_game_to_text().snesAtlas.archiveWallMapBoard`.
  - Updated `ArchiveScene.drawWallMap()` so A3/B3 hint-room wall maps render the new sprite when available, with the existing rectangle-based wall-map drawing retained as a missing-texture fallback.
  - The previous route markers still layer on top, so the board now reads as a single 16-bit prop plus live visited/current/locked/reward/boss state.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts` passes (1 file / 1 test);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=archive-wall-map-board-client`;
    - direct Playwright/Phaser probe confirmed texture `snes-archive-wall-map-board`, visible image `archive-wall-map-board-A3`, marker texture `snes-room-map-markers`, four live route markers, atlas readout `archiveWallMapBoard`, current room `A3`, and zero page/console errors;
    - visual proof: `docs/screenshots/archive-wall-map-board/page-clean.png`; JSON proof: `docs/screenshots/archive-wall-map-board/state-clean.json`.
- Archive hint-room wall-map marker pass (2026-07-02):
  - Reused the repo-local `SNES_ROOM_MAP_MARKER_ASSET` strip inside `ArchiveScene.drawWallMap()` so the A3/B3 in-room hint boards now show sprite-based room-state markers instead of purely primitive decorations.
  - Preserved the existing cream-paper board, labels, and fallback rectangle path; if the marker texture is unavailable, the board still draws colored primitive cells.
  - A3 now displays a compact secret-route map with visited, current, locked, and reward frames; B3 displays locked route nodes plus the boss/review-room marker.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts` passes (1 file / 1 test);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=archive-wall-map-markers`;
    - direct Playwright/Phaser probe confirmed texture `snes-room-map-markers`, frames `visited/current/locked/boss/reward`, A3 marker objects `visited/current/locked/reward`, B3 marker objects `locked/boss`, and zero page/console errors;
    - visual proof: `docs/screenshots/archive-wall-map-markers/page.png` and `docs/screenshots/archive-wall-map-markers-boss/page.png`; JSON proof: `docs/screenshots/archive-wall-map-markers/state.json` and `docs/screenshots/archive-wall-map-markers-boss/state.json`.
- Quest-band room-map marker pass (2026-07-02):
  - Added an original repo-local `public/assets/sprites/snes-room-map-markers.svg` strip with five 6x6 map-marker frames: visited, current, locked, boss, and reward.
  - Registered `SNES_ROOM_MAP_MARKER_ASSET` in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and registered named frames after load.
  - Updated `UIScene.drawQuestBandRoomMap()` so the always-visible HUD room map now uses sprite markers when available, while preserving the old primitive rectangle fallback if the texture is missing.
  - This makes the active room map read more like a 16-bit dungeon map: current room is gold/white, unreached gates are ruby locks, reward rooms are brass/cyan, and boss/review rooms are red/gold.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/input/InputState.test.ts` passes (2 files / 16 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=snes-room-map-marker-client`;
    - direct browser probe confirmed atlas readout `snesAtlas.roomMapMarkers`, texture `snes-room-map-markers`, frames `visited/current/locked/boss/reward`, and visible `quest-band-room-map-marker-*` sprites for current, locked, reward, and boss rooms with no page errors;
    - visual proof: `docs/screenshots/snes-room-map-markers/page.png`; JSON proof: `docs/screenshots/snes-room-map-markers/state.json`.
- Full selectable-role SNES frame-sheet pass (2026-07-02):
  - Added original 32x48, 19-frame SNES-style animation strips for the remaining selectable roles: Proofreader, Declass Coordinator, and Source-note Specialist.
  - Each new strip preserves the existing Compiler/Editor frame layout (`idle-0/1`, four-direction walk cycles, and `read`) while adding role-specific silhouettes: proof stack and glasses glint, mug plus tracker clipboard, and citation-stamp satchel plus source card.
  - Registered the new strips in `SNES_ROLE_FRAME_SHEETS`, so `BootScene` preloads/slices them through the existing typed atlas path and `Player` automatically prefers them for matching role IDs.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/input/InputState.test.ts` passes (2 files / 16 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=source_note_specialist&name=Ruby&v=snes-all-role-frame-sheets-client`;
    - direct browser probe confirmed all five selectable roles use their expected `snes-player-*-frames` texture, start on `idle-*`, advance to `walk-right-*` while moving, return to idle, and expose all five role frame sets through `window.render_game_to_text().snesAtlas.roleFrameSets`;
    - visual proof: `docs/screenshots/snes-all-role-frame-sheets/source-note-specialist-page.png`; JSON proof: `docs/screenshots/snes-all-role-frame-sheets/state.json`.
- Playable compiler/editor SNES frame-sheet priority pass (2026-07-02):
  - Improved the live player sprite path so curated SNES role frame sheets are preferred for roles that have them, instead of defaulting to the imported art-pack sheets whose native cells are documented as fragment-prone and collapsed to frame 0.
  - `Player` now chooses `snesRoleFrame48` first when a valid role frame sheet exists, then falls back to the 32x48 art-pack sheet, then the older SNES/8-bit textures.
  - This makes the Compiler and Editor playable characters use the cleaner original `snes-player-*-frames` textures with idle/read/walk frames, improving the in-play 16-bit silhouette while preserving fallbacks for other roles.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/input/InputState.test.ts` passes (2 files / 16 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=snes-role-frame-player-client`;
    - direct browser probe confirmed the player uses texture `snes-player-compiler-frames`, starts on an idle frame, advances to `walk-right-2` while moving, and returns to idle with no page errors;
    - visual proof: `docs/screenshots/snes-role-frame-player/page.png`; JSON proof: `docs/screenshots/snes-role-frame-player/state.json`.
- Pause subscreen workflow-tool icon pass (2026-07-02):
  - Continued the SNES inventory/map polish by making every FRUS process item in the pause subscreen render as a distinct workflow-tool relic rather than relying on text-only boxes.
  - `SNES_WORKFLOW_TOOL_RELIC_ASSET` is now the typed atlas source for the 128x32 `snes-workflow-tools` strip, with named frames for citation stamp, source-note card, cross-reference thread, terminal, FRUS volume, red pencil, proof pages, and concurrence slip.
  - `BootScene` preloads the strip through the typed atlas metadata and registers named frames after texture load.
  - `InventoryOverlay` now creates seven named `inventory-tool-icon-*` sprites for the Zelda-like FRUS tool grid: citation stamp, red pencil, review folder, clearance token, concurrence slip, proof lens, and buckram key. The old short labels remain as a fallback/readability layer.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureSubscreen.test.ts src/input/InputState.test.ts` passes (3 files / 18 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=workflow-tool-icons-current-client`;
    - direct Chrome/Phaser probe opened the pause subscreen and confirmed texture `snes-workflow-tools`, all eight named frames, seven visible `inventory-tool-icon-*` objects with the expected frames, and `mode: "pause"` with no page errors;
    - visual proof: `docs/screenshots/workflow-tool-icons-current/page.png`; JSON proof: `docs/screenshots/workflow-tool-icons-current/display.json`.
- One-hour gameplay training current verification (2026-07-02):
  - Treated `https://www.youtube.com/watch?v=Dq_gUziNZUk` as high-level action-adventure gameplay grammar only, not literal model training and not a source to copy protected maps, sprites, music, text, enemies, names, or exact puzzle layouts.
  - Reconfirmed the public YouTube oEmbed title as `Legend of Zelda A LINK TO THE PAST Full Game Walkthrough - No Commentary (A Link to the Past Full)`, matching `FIRST_HOUR_REFERENCE.sourceTitle`.
  - Verified the game still exposes the one-hour training model at runtime: `trainingWindowMinutes: 60`, `trainedMinuteMarks: 60`, `coveredDrills: 12`, `totalDrills: 12`, minute 0 start-room affordance, and minute 59 world-change reward.
  - Confirmed the Office scene visibly renders the one-hour training relic, the `1HR 45-50 HZ` chip, and the twelve-node route strip while `window.render_game_to_text().oneHourTraining` reports the same current drill.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/game/snesAtlas.test.ts src/input/InputState.test.ts` passes (3 files / 27 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-training-verify-current`;
    - direct browser probe confirmed no page/console errors, live one-hour training readout, visible `office-first-hour-training-relic`, visible `office-first-hour-chip-label`, and visible twelve-node route strip;
    - visual proof: `docs/screenshots/one-hour-training-current-verify/page.png`; JSON proof: `docs/screenshots/one-hour-training-current-verify/state.json`.
- Pause subscreen progression-relic pass (2026-07-02):
  - Continued the SNES inventory/map polish by replacing the pause-subscreen primitive pendant and crystal drawings with the existing original pixel-art relic strips.
  - BootScene now registers named frames for `SNES_RESEARCH_PENDANT_RELIC_ASSET` (`objectivity/provenance/review`) and `SNES_EQUITY_CRYSTAL_RELIC_ASSET` (`defense/intelligence/diplomatic/foreign/privacy`) after load.
  - `InventoryOverlay` now creates named image objects (`subscreen-research-pendant-*` and `subscreen-equity-crystal-*`) with dim/bright alpha states while preserving the old primitive vector fallback if the textures are unavailable.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureSubscreen.test.ts src/input/InputState.test.ts` passes (3 files / 18 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=subscreen-relics-client`;
    - direct Chrome/Phaser probe against `?scene=OfficeScene&role=compiler&name=Ruby&v=subscreen-relics-focused-probe` opened the pause subscreen and confirmed texture frames for `snes-research-pendants` and `snes-equity-crystals`, visible named subscreen relic image objects, and `mode: "pause"` with no page/console errors;
    - visual proof: `docs/screenshots/subscreen-progression-relics/page-focused.png`; JSON proof: `docs/screenshots/subscreen-progression-relics/display-focused.json`.
- Pause subscreen dungeon-status relic pass (2026-07-02):
  - Added an original repo-local `public/assets/sprites/snes-dungeon-status-relics.svg` strip with four 12x12 chapter-status frames: small key, big key, map, and boss/review completion.
  - Registered `SNES_DUNGEON_STATUS_RELIC_ASSET` in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and registered named texture frames for each status relic.
  - Updated `InventoryOverlay` so the ALttP-style FRUS Quest subscreen now shows active-dungeon status relics for local chapter keys, big-key/stage-gate, map/compass literacy, and boss-review completion, with primitive fallback boxes if the strip is unavailable.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureSubscreen.test.ts src/input/InputState.test.ts` passes (3 files / 18 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=dungeon-status-relic-client`; its key map cannot send `KeyM`, so the feature-specific menu-open proof comes from the direct Chrome probe;
    - direct Chrome/Phaser probe against `?scene=OfficeScene&role=compiler&name=Ruby&v=dungeon-status-relic-probe` opened the pause subscreen and confirmed texture `snes-dungeon-status-relics`, frames `small_key/big_key/map/boss`, four visible `subscreen-dungeon-status-*` images, and active dungeon state `Office Hub`;
    - visual proof: `docs/screenshots/dungeon-status-relics/page.png`; JSON proof: `docs/screenshots/dungeon-status-relics/state.json`.
- One-hour route-arrow relic pass (2026-07-02):
  - Continued the one-hour action-adventure training translation by making selected overworld routes use a reusable original pixel-art cardinal-arrow strip instead of transient primitive cursor triangles.
  - Added `public/assets/sprites/snes-route-arrows.svg` with four 12x12 frames: north, east, south, and west.
  - Registered `SNES_ROUTE_ARROW_RELIC_ASSET` in `src/game/snesAtlas.ts`, preloaded and sliced it in `BootScene`, and exposed it through the SNES atlas readout.
  - Updated `WorldMapScene` so selected district cursors prefer the named route-arrow frames while preserving the old primitive fallback if the texture is unavailable.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (3 files / 27 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - direct Chrome/Phaser probe against `?scene=WorldMapScene&role=compiler&name=Ruby&v=route-arrows-probe2` confirmed texture `snes-route-arrows`, frames `north/east/south/west`, four visible cursor images using those frames, and the atlas `routeArrowRelics` readout;
    - visual proof: `docs/screenshots/world-map-route-arrows/page-recursive.png`; JSON proof: `docs/screenshots/world-map-route-arrows/state-recursive.json`.
- SNES process stamp relic publication pass (2026-07-02):
  - Added an original repo-local `public/assets/sprites/snes-process-stamps.svg` strip with six 12x12 process-stamp frames: rule, archive, network, referral, sop, and proof.
  - Registered `SNES_PROCESS_STAMP_RELIC_ASSET` in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and registered named texture frames for each stamp.
  - Updated the published FRUS reward screen in `EndingScene` so the final process checklist now shows six earned stamp relics with secondary label/status text instead of text-only proof.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (3 files / 27 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=process-stamps-client`;
    - direct Chrome probe invoked publication and confirmed atlas texture `snes-process-stamps`, frames `rule/archive/network/referral/sop/proof`, six visible `published-process-stamp-*` images, six labels, six statuses, and `finalGateCertification.status: "published"`;
    - visual proof: `docs/screenshots/process-stamp-relics/page.png`; JSON proof: `docs/screenshots/process-stamp-relics/state.json`.
- SNES published FRUS prize cover pass (2026-07-02):
  - Registered the existing repo-local `public/assets/sprites/frus-prize-cover.svg` as `SNES_PUBLISHED_FRUS_PRIZE_ASSET` in `src/game/snesAtlas.ts`.
  - Moved the final prize cover preload to the typed SNES atlas path in `BootScene`, removing the duplicate hard-coded loader entry.
  - Updated `EndingScene` so the published-volume payoff prefers the crisp 80x120 ruby buckram pixel-art cover and only falls back to the large art-pack legendary reward if that texture is unavailable.
  - Added the named runtime object `published-frus-snes-prize-art` with `rewardTexture: frus-prize-cover` so browser probes can verify the actual final reward art.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (3 files / 27 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=snes-prize-client`;
    - direct Chrome probe invoked publication and confirmed `finalGateCertification.status: "published"`, atlas texture `frus-prize-cover`, visible `published-frus-snes-prize-art`, and `rewardTexture: frus-prize-cover`;
    - visual proof: `docs/screenshots/snes-published-prize/page.png`; JSON proof: `docs/screenshots/snes-published-prize/state.json`.
- FRUS cover fragment relic quest-band pass (2026-07-02):
  - Added an original repo-local `public/assets/sprites/snes-cover-fragments.svg` strip with five 3x10 cover-piece frames: spine, title band, years panel, seal, and imprint.
  - Registered `SNES_COVER_FRAGMENT_RELIC_ASSET` in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and exposed it through `window.render_game_to_text().snesAtlas.coverFragmentRelics`.
  - Updated `UIScene` so the existing `VOL 0/5` quest-band book slot now uses real cropped cover-piece sprites while keeping the previous procedural fallback if the texture is missing.
  - Added `questBandCoverFragmentSlots()` coverage so the cover fragments use the same five-slot SNES counter grammar as research pendants and equity crystals.
  - Verification:
    - focused `npm test -- --run src/scenes/questBandCue.test.ts src/game/snesAtlas.test.ts src/game/adventureSubscreen.test.ts src/input/InputState.test.ts` passes (4 files / 22 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=cover-fragment-relic-client`;
    - direct Phaser display-list probe confirmed five visible `quest-band-cover-fragment-*` frames (`spine/title/years/seal/imprint`), texture `snes-cover-fragments`, alpha `0.34` at `VOL 0/5`, atlas frame readout, and no page errors;
    - visual proof: `docs/screenshots/cover-fragment-relic-page.png`; JSON proof: `docs/screenshots/cover-fragment-relic-state.json`.
- Equity crystal relic quest-band sync pass (2026-07-02):
  - Finished the SNES-style equity crystal quest-band integration so declassification/equity progress reads as five original 8x10 relic frames instead of generic marks.
  - Added `questBandCrystalSlots()` with unit coverage to cap the strip at five, keep at least one dim future crystal visible, and hide inactive frames when the active equity total is lower than the strip length.
  - Fixed `UIScene` so crystal sprite visibility synchronizes before the quest-band refresh throttle/signature cache can return early; this prevents stale frames from showing all five crystals during Office/HUD refreshes.
  - Verification:
    - focused `npm test -- --run src/scenes/questBandCue.test.ts src/game/snesAtlas.test.ts src/game/frusProgression.test.ts src/game/adventureSubscreen.test.ts src/input/InputState.test.ts` passes (5 files / 26 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=equity-crystal-sync-client`;
    - direct Phaser display-list probe confirmed `visibleCount: 1`, visible relic `quest-band-equity-crystal-defense`, alpha `0.38`, atlas frames `defense/intelligence/diplomatic/foreign/privacy`, and no page errors;
    - visual proof: `docs/screenshots/equity-crystal-sync-page.png`; JSON proof: `docs/screenshots/equity-crystal-sync-state.json`.
- One-hour gameplay training verification refresh (2026-07-02):
  - Treated `https://www.youtube.com/watch?v=Dq_gUziNZUk` as high-level action-adventure gameplay grammar only, not literal model training and not a source to copy maps, sprites, music, names, enemies, text, or exact puzzle layouts.
  - Re-confirmed the YouTube oEmbed title as `Legend of Zelda A LINK TO THE PAST Full Game Walkthrough - No Commentary (A Link to the Past Full)`.
  - Re-verified that the current live implementation already encodes the first hour as a typed 60-minute FRUS Quest training profile in `src/game/firstHourTraining.ts`.
  - Confirmed the runtime `window.render_game_to_text().oneHourTraining` exposes `trainingWindowMinutes: 60`, `trainedMinuteMarks: 60`, `coveredDrills: 12`, `totalDrills: 12`, a minute 0 start-room objective, a minute 59 reward-changes-world objective, and the visible `snes-first-hour-training-relic` object in OfficeScene.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/game/snesAtlas.test.ts src/input/InputState.test.ts` passes (3 files / 27 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-train-verify`;
    - refreshed web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-train-refresh`;
    - direct Chrome probe confirmed `trainingWindowMinutes: 60`, `trainedMinuteMarks: 60`, `coveredDrills: 12`, `totalDrills: 12`, visible `office-first-hour-training-relic`, visible `1HR 45-50 HZ` chip, and the full twelve-node Office route strip;
    - refreshed JSON proof: `docs/screenshots/web-game-one-hour-train-refresh/state-2.json`; direct visual proof: `docs/screenshots/one-hour-train-refresh-direct/page.png`; direct JSON proof: `docs/screenshots/one-hour-train-refresh-direct/state.json`; the required client screenshot remains black because of the known headless WebGL capture artifact.
- Research pendant relic quest-band pass (2026-07-02):
  - Added an original repo-local 30x10 SNES-style pendant strip at `public/assets/sprites/snes-research-pendants.svg`.
  - Registered it in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and rendered three 10x10 cropped frames in `UIScene` for the FRUS research pendants: objectivity, provenance, and SOP/review discipline.
  - Kept the existing `GameState` and `getAdventureSubscreenReadout()` logic intact; the new sprites replace the generic quest-band triangle marks visually while still dimming when the pendant is unearned.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureSubscreen.test.ts src/input/InputState.test.ts` passes (3 files / 18 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=research-pendant-relic-client`;
    - direct browser probe confirmed texture `snes-research-pendants`, visible objects `quest-band-research-pendant-objectivity`, `quest-band-research-pendant-provenance`, and `quest-band-research-pendant-review`, matching frame names, and no page errors;
    - visual proof: `docs/screenshots/research-pendant-relic-clean-page.png`; JSON proof: `docs/screenshots/research-pendant-relic-clean-state.json`.
- World atlas relic training pass (2026-07-02):
  - Continued treating the linked one-hour gameplay reference as high-level action-adventure grammar only, not literal model training and not a source to copy maps, art, music, names, enemies, text, or exact puzzle layouts.
  - Added an original repo-local 24x24 SNES-style world atlas relic at `public/assets/sprites/snes-world-atlas-relic.svg`.
  - Registered it in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, rendered it in `WorldMapScene`, and exposed it through `window.render_game_to_text().snesAtlas.worldAtlasRelic`.
  - Updated `docs/gameplay/first-hour-reference-training.md` so future tuning treats the relic as the visible map-literacy handoff for the first-hour training profile.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/data/regions.test.ts` passes (2 files / 4 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=WorldMapScene&region=europe&role=compiler&name=Ruby&v=world-atlas-relic-final-client`;
    - direct browser probe confirmed texture `snes-world-atlas-relic`, visible objects `world-map-atlas-relic-panel`, `world-map-atlas-relic`, and `world-map-atlas-relic-label`, atlas readout `World Atlas Relic`, and no page errors;
    - visual proof: `docs/screenshots/world-atlas-relic-final-page.png`; JSON proof: `docs/screenshots/world-atlas-relic-final-state.json`.
- Archive compass relic pass (2026-07-02):
  - Added an original repo-local 24x24 SNES-style map/compass relic at `public/assets/sprites/snes-archive-compass-relic.svg`.
  - Registered it in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and rendered it beside the Archive Cavern minimap in `ArchiveScene`.
  - The relic label now reflects the existing dungeon map state: `???` until the Archive Cavern map/compass is revealed, then `MAP`.
  - Added `src/game/snesAtlas.test.ts` so the new original relics remain covered by the typed atlas readout.
  - Verification:
    - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureTraining.test.ts` passes (2 files / 12 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=archive-compass-relic-final-client`;
    - direct browser probe confirmed texture `snes-archive-compass-relic`, visible object `archive-compass-relic`, atlas readout `Archive Compass Relic`, `mapRevealed: false`, label `???`, and no page errors;
    - visual proof: `docs/screenshots/archive-compass-relic-fresh-page.png`; JSON proof: `docs/screenshots/archive-compass-relic-fresh-state.json`.
- Office one-hour route relic pass (2026-07-02):
  - Added an original repo-local 24x24 SNES-style route relic at `public/assets/sprites/snes-first-hour-training-relic.svg`.
  - Registered it in `src/game/snesAtlas.ts`, preloaded it in `BootScene`, and rendered it in `OfficeScene` as a named wall prop beside the FRUS Path board.
  - Extended the one-hour readout with `visualRelic` so `window.render_game_to_text().oneHourTraining` links the 60-minute training model to the visible map prop.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/scenes/questBandCue.test.ts` passes (2 files / 13 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=first-hour-relic-client`;
    - direct browser probe confirmed texture `snes-first-hour-training-relic`, visible object `office-first-hour-training-relic`, `trainingWindowMinutes: 60`, `trainedMinuteMarks: 60`, no page errors, and JSON proof `docs/screenshots/first-hour-relic-state.json`;
    - visual proof: `docs/screenshots/first-hour-relic-page.png`.
- One-hour gameplay training receipt pass (2026-07-02):
  - Treated the linked gameplay video as high-level action-adventure grammar only, not literal model training and not a source to copy protected maps, sprites, music, text, enemies, names, or exact puzzle layouts.
  - Added `docs/gameplay/one-hour-training-receipt.md` so future passes have a concise handoff artifact for what "one hour trained" means in this repo.
  - The receipt points to the existing live training implementation in `src/game/firstHourTraining.ts`, `src/game/adventureTraining.ts`, `docs/gameplay/first-hour-reference-training.md`, and `window.render_game_to_text().oneHourTraining`.
  - Polished the active HUD cue so the SNES verb badge carries `GOAL`/`ACT`/`LOCK` etc. while the cue text no longer repeats the same verb prefix.
  - Verification:
    - focused `npm test -- --run src/scenes/questBandCue.test.ts src/game/adventureTraining.test.ts` passes (2 files / 13 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-training-receipt-clean`;
    - direct browser probe confirmed `trainingWindowMinutes: 60`, `trainedMinuteMarks: 60`, `coveredDrills: 12`, `totalDrills: 12`, visible HUD badge `GOAL`, cue text `NEXT Office Hub loaded.`, and no page errors;
    - visual proof: `docs/screenshots/one-hour-training-receipt-clean-page.png`; JSON proof: `docs/screenshots/one-hour-training-receipt-clean-state.json`.
- Buckram Gate process-checklist copy pass (2026-07-02):
  - Corrected the final publication room so StateChat does not appear to own the final certification checklist.
  - Renamed the left final-room checklist from `STATECHAT CHECKLIST` to `PROCESS CHECKLIST`, keeping `HUMAN SIGN-OFF` as the separate publication authority.
  - Added the named display object `buckram-process-checklist-title` for browser QA.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/standardsDamage.test.ts src/systems/dungeonKeys.test.ts` passes (3 files / 17 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=ending-process-checklist-client`;
    - direct browser probe confirmed visible `buckram-process-checklist-title` text `PROCESS\\nCHECKLIST`, no `STATECHAT` checklist text, no page errors, and JSON proof `docs/screenshots/ending-process-checklist-state.json`;
    - visual proof: `docs/screenshots/ending-process-checklist-page.png`.
- Title start-affordance polish pass (2026-07-02):
  - Preserved the repository-local 16-bit title card while adding live SNES-style start feedback over it.
  - `TitleScene` now draws a named `title-start-affordance` overlay at the art-pack prompt position: gold side arrows, a dark underline backplate, cyan pulse line, and small cyan sparks.
  - Added `TITLE_LAYOUT.artPackStartY` plus a layout test so the art-pack affordance remains in a safe on-screen band above the controls line.
  - Verification:
    - focused `npm test -- --run src/scenes/TitleScene.test.ts src/input/InputState.test.ts` passes (2 files / 25 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=TitleScene&v=title-start-affordance-client`;
    - direct browser probe confirmed `title-start-affordance` visible at `x=128, y=190`, Enter transition to `CharacterCreateScene`, and no page errors;
    - visual proof: `docs/screenshots/title-start-affordance-page.png`; JSON proof: `docs/screenshots/title-start-affordance-state.json`.
- Character creator equal-rank FRUS role pass (2026-07-02):
  - Tightened the first playable screen so it presents equal-rank FRUS production roles instead of a generic/singular historian identity.
  - Replaced the top title with `CREATE YOUR FRUS ROLE`, added `EQUAL RANK · SHARED PUBLICATION DUTY`, and updated the scene objective to `Choose an equal-rank FRUS production role.`
  - Moved the copy constants into Phaser-free `src/scenes/characterCreateCopy.ts` so the role framing is covered by unit tests without importing the Phaser scene in Node.
  - Verification:
    - focused `npm test -- --run src/scenes/CharacterCreateScene.test.ts src/input/InputState.test.ts` passes (2 files / 18 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=CharacterCreateScene&role=editor&name=Ruby&v=character-equal-role-client`;
    - direct browser probe confirmed `CharacterCreateScene`, objective `Choose an equal-rank FRUS production role.`, visible role set, Enter transition to `OfficeScene`, selected Editor profile, and no page errors;
    - visual proof: `docs/screenshots/character-create-equal-role-page.png`; JSON proof: `docs/screenshots/character-create-equal-role-slim-state.json`.
- Office one-hour drill chip pass (2026-07-02):
  - Made the one-hour reference-training state visible in the Office scene instead of only surfacing it through JSON and the tiny node strip.
  - `drawFirstHourTrainingStrip()` now adds a readable `1HR` chip and active minute/drill code such as `45-50 HZ` beside the twelve-node strip on the FRUS Path board.
  - The chip is driven from the live `getAdventureTrainingReadout()` drill, so it stays synchronized with the HUD cue and `window.render_game_to_text().oneHourTraining`.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (2 files / 26 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=office-one-hour-chip-client`;
    - direct browser probe confirmed visible display objects `office-first-hour-chip-label: 1HR` and `office-first-hour-chip-minute: 45-50 HZ`, `trainedMinuteMarks: 60`, no page errors, and JSON proof `docs/screenshots/office-one-hour-chip-state.json`;
    - visual proof: `docs/screenshots/office-one-hour-chip-page.png`.
- Literal one-hour training ledger pass (2026-07-02):
  - Treated the linked gameplay as high-level action-adventure grammar only, not literal model training and not a source to copy maps, sprites, music, text, names, or exact puzzle layouts.
  - Extended `src/game/firstHourTraining.ts` so `window.render_game_to_text().oneHourTraining` now includes `trainedMinuteMarks: 60` and a `minuteMarks[0..59]` ledger.
  - Each minute mark records the phase, drill, primary beat, cue text, FRUS objective, and implementation signal, while the visible Office board keeps its compact twelve-node SNES strip.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts` passes (1 file / 11 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-minute-ledger-client`;
    - direct browser probe confirmed `trainingWindowMinutes: 60`, `trainedMinuteMarks: 60`, `uniqueMinuteCount: 60`, all minutes have implementation signals, and no page errors;
    - visual proof: `docs/screenshots/one-hour-minute-ledger-page.png`; JSON proof: `docs/screenshots/one-hour-minute-ledger-state.json`.
- World Map selected-route cursor pass (2026-07-02):
  - Continued the first-hour action-adventure translation by making the overworld atlas selectable with keyboard/gamepad-style controls instead of relying on pointer hover.
  - `WorldMapScene` now keeps a selected district, draws a named four-arrow SNES cursor around the active cartouche, uses up/down to cycle districts, keeps left/right for region cycling, and activates the selected district with A/Enter/Start.
  - Replaced the redundant bottom tooltip with a single route-preview card showing district, destination, and verb, removing the visual overlap found during screenshot QA.
  - Verification:
    - focused `npm test -- --run src/data/regions.test.ts src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts` passes (3 files / 21 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=WorldMapScene&region=europe&role=compiler&name=Ruby&v=world-map-selected-route-client-2`;
    - direct browser probe confirmed cursor route `3. MANILA`, destination `EMBASSY`, verb `CABLES`, tooltip hidden, Enter route to `GameplayMapScene`, no page errors, and JSON proof `docs/screenshots/world-map-selected-route-probe.json`;
    - visual proof: `docs/screenshots/world-map-selected-route-page.png`.
- Archive Guide first-hour training cue pass (2026-07-02):
  - Treated the linked one-hour gameplay reference as high-level action-adventure grammar only, not literal model training and not a source to copy protected maps, sprites, music, text, enemies, or exact puzzle layouts.
  - Reframed the Historian Office guide interaction from `Historian-in-Chief` to equal-rank `Archive Guide` in the live scene copy, Tiled data, and codex unlock path.
  - Added a visible SNES cue with an evidence map, source token, archive box, equal-rank tag, and `EVIDENCE PATH` caption so the opening safe guide reads as a first-hour start-room affordance rather than text-only instruction.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/interactionPrompt.test.ts src/systems/snesMapDressing.test.ts` passes (3 files / 24 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby&v=archive-guide-cue-client`;
    - direct browser probe confirmed title `ARCHIVE GUIDE`, caption `EVIDENCE PATH`, active first-hour drill `start_room_affordance`, no page errors, and JSON proof `docs/screenshots/archive-guide-cue-probe.json`;
    - visual proof: `docs/screenshots/archive-guide-cue-page.png`.
- FRUS Production Floor phase-cue pass (2026-07-02):
  - Made FRUS Production Floor room triggers show visible SNES milestone cues instead of only bottom dialog.
  - Research, Compilation, Declassification Review, Annotation, and Publication now share a compact phase-cue system with phase-specific title, caption, accent color, and icon art.
  - Verified bookend phases directly: `RESEARCH` / `SOURCE TRAIL` and `PUBLICATION` / `BIND VOLUME`.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/interactionPrompt.test.ts src/systems/snesMapDressing.test.ts` passes (3 files / 24 tests);
    - `npm run build` passes with known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-phase-cue-client`;
    - direct browser probe confirmed Research/Publication cue titles/captions, no page errors, and JSON proof `docs/screenshots/frus-phase-cue-probe.json`;
    - visual proofs: `docs/screenshots/frus-phase-research-cue-page.png` and `docs/screenshots/frus-phase-publication-cue-page.png`.
- Foggy Bottom 23rd Street sign route-cue pass (2026-07-02):
  - Made the 23rd Street Sign interaction show a visible SNES route cue instead of only dialog.
  - First check now shows `ROUTE +1` with a signpost, street/sidewalk split, cyan sidewalk arrow, and `SIDEWALK ONLY` caption.
  - Repeat checks show `ROUTE LOG` / `SIGN LOGGED`.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/interactionPrompt.test.ts src/systems/snesMapDressing.test.ts` passes (3 files / 24 tests);
    - `npm run build` passes with known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=foggy_bottom&role=compiler&name=Ruby&v=street-sign-cue-client`;
    - direct browser probe confirmed first/repeat cue titles/captions, no page errors, and JSON proof `docs/screenshots/street-sign-cue-probe.json`;
    - visual proofs: `docs/screenshots/street-sign-route-cue-page.png` and `docs/screenshots/street-sign-logged-cue-page.png`.
- Historian Office Coffee Station focus-cue pass (2026-07-02):
  - Made the Coffee Station safe starting-room interaction show a visible SNES reward cue instead of only dialog.
  - First check now shows `FOCUS +1` with mug, steam, annotation note, and `ANNOTATION READY` caption.
  - Repeat checks show `FOCUS LOG` / `POT LOGGED`.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/interactionPrompt.test.ts src/systems/snesMapDressing.test.ts` passes (3 files / 24 tests);
    - `npm run build` passes with known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby&v=coffee-station-cue-client`;
    - direct browser probe confirmed first/repeat cue titles/captions, no page errors, and JSON proof `docs/screenshots/coffee-station-cue-probe.json`;
    - visual proofs: `docs/screenshots/coffee-station-focus-cue-page.png` and `docs/screenshots/coffee-station-logged-cue-page.png`.
- Black Vault live-core statutory-clock cue pass (2026-07-02):
  - Made the Black Vault `Obelisk Core` interaction read like a final SNES boss threshold instead of an instant scene jump.
  - Pressing A at the live core now locks the route briefly, shows a `LIVE CORE` cue with a DANN-E obelisk, red eye, chest core, record card, shortcut tag, and `DANN-E / 30YR` caption, then transitions to `BlackVaultLairScene`.
  - Reused the existing `addSnesStatutoryClock()` pixel widget beside the core cue so the boss route visibly ties DANN-E pressure to the FRUS 30-year publication clock.
  - Verification:
    - focused `npm test -- --run src/game/statutoryClock.test.ts src/game/finalPublicationCertification.test.ts src/game/adventureTraining.test.ts src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts` passes (5 files / 35 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=black_vault&role=compiler&name=Ruby&v=black-vault-core-cue-client`;
    - direct browser probe confirmed title `LIVE CORE`, caption `DANN-E\n30YR`, clock title `30-YR CLOCK`, transition to `BlackVaultLairScene`, no page errors, and JSON proof `docs/screenshots/black-vault-core-cue-probe.json`;
    - visual proof: `docs/screenshots/black-vault-core-cue-page.png`.
- Embassy cable and foreign-permission cue pass (2026-07-02):
  - Finished and verified the Embassy Cable Room process loop as readable SNES-style workflow objects.
  - The Chancery Door now shows a floating `CABLE COPIED` cue with a telex terminal, copied cable sheet, red margin bar, context tag, and `COPY + CONTEXT` caption when the field cable is logged.
  - The Consular Queue now shows a locked `NEED CABLE` cue with a red slash and `COPY CABLE` caption before the cable is collected.
  - After the cable is copied, the Consular Queue switches to a `PERMIT NOTE` cue with a permission note, request channel, approval seal, cyan open glow, and `VISIBLE OUTCOME` caption.
  - Verification:
    - focused `npm test -- --run src/game/recordCollection.test.ts src/game/embassyPermissionQueue.test.ts src/game/adventureTraining.test.ts src/systems/interactionPrompt.test.ts` passes (4 files / 27 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=embassy&role=compiler&name=Ruby&v=embassy-cue-client`;
    - direct browser probe confirmed locked title `NEED CABLE`, cable title `CABLE COPIED`, filed title `PERMIT NOTE`, matching captions, no page errors, and JSON proof `docs/screenshots/embassy-cue-probe.json`;
    - visual proofs: `docs/screenshots/embassy-permission-locked-cue-page.png`, `docs/screenshots/embassy-cable-copied-cue-page.png`, and `docs/screenshots/embassy-permission-filed-cue-page.png`.
- One-hour gameplay training coverage pass (2026-07-02):
  - Treated the linked hour of gameplay as high-level action-adventure grammar only, not literal model training and not a source to copy maps, sprites, music, text, names, or exact puzzle layouts.
  - Added a typed `firstHourTrainingCoverageReadout()` in `src/game/firstHourTraining.ts` with all twelve five-minute drills, active drill selection, minute ranges, acceptance signals, and concrete FRUS implementation signals.
  - Exposed the full ladder through `window.render_game_to_text().oneHourTraining`, alongside the existing current `adventureTraining` cue, so browser QA can verify the game has a complete one-hour reference coverage model.
  - Updated `docs/gameplay/first-hour-reference-training.md` to point future tuning at the live `oneHourTraining` readout.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts` passes (1 file / 11 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-training-coverage`;
    - direct browser probe confirmed `oneHourTraining.coveredDrills: 12`, `totalDrills: 12`, all implementation signals present, active drill `hazard_readability`, no page errors, and screenshot `docs/screenshots/one-hour-training-coverage-page.png`.
- Capitol HAC hearing packet and closed-session vault cue pass (2026-07-02):
  - Made the Capitol Hill Hearing map behave more like a SNES review-gate room by adding visible procedural pixel cues to the witness-table and closed-session-vault interactions.
  - When `inspectClosedSessionSample()` blocks the vault, `GameplayMapScene` now draws a floating `NEED HAC` cue with a closed vault wheel, 30-year sample sheet, red slash, and `WITNESS DOCKET` caption.
  - When `fileCapitolHacPacket()` files the witness-table packet, it draws a `HAC DOCKET` cue with a witness table, microphone, process docket, annual finding seal, and treaty-fragment marker.
  - When the closed-session packet is valid, the vault cue switches to `30YR SAMPLE` with an open cyan vault glow, classified-sample sheet, and gold seal.
  - Verification:
    - focused `npm test -- --run src/game/capitolHacPacket.test.ts src/game/adventureTraining.test.ts src/systems/interactionPrompt.test.ts` passes (3 files / 21 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=capitol_hill&role=compiler&name=Ruby&v=capitol-hac-cue-client`;
    - direct browser probe confirmed locked title `NEED HAC`, witness title `HAC DOCKET`, sample title `30YR SAMPLE`, matching captions, and no page errors;
    - visual proofs: `docs/screenshots/capitol-closed-session-locked-cue-page.png`, `docs/screenshots/capitol-hac-witness-docket-cue-page.png`, and `docs/screenshots/capitol-closed-session-sample-cue-page.png`.
- West Wing Oval Office briefing-dossier cue pass (2026-07-02):
  - Continued the White House source-coverage route by making the Oval Office Desk briefing behave like a visible SNES workflow reward/lock instead of only a dialog update.
  - When `fileOvalOfficeBriefing()` blocks the desk, `GameplayMapScene` now draws a floating `NEED NSC` cue with a briefing dossier, red margin, policy-context card, and red slash.
  - When NSC source coverage has been certified and the desk files the packet, the cue switches to `FILED BRIEF` with a chronology/context dossier, cyan/gold approval glow, and `CHRONOLOGY CONTEXT` caption.
  - Added cue cleanup so rapid West Wing interactions do not stack the NSC source gate cue behind the Oval Office dossier cue.
  - Verification:
    - focused `npm test -- --run src/game/ovalOfficeBriefing.test.ts src/game/westWingNsc.test.ts src/game/adventureTraining.test.ts src/systems/interactionPrompt.test.ts` passes (4 files / 23 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=west_wing&role=compiler&name=Ruby&v=oval-briefing-client`;
    - direct browser probe confirmed locked title `NEED NSC`, caption `SOURCE\nGATE`, filed title `FILED BRIEF`, caption `CHRONOLOGY\nCONTEXT`, `nscCount: 0` after cleanup, and no page errors;
    - visual proofs: `docs/screenshots/west-wing-oval-briefing-locked-cue-page.png` and `docs/screenshots/west-wing-oval-briefing-filed-cue-page.png`.
- West Wing NSC source-coverage gate-cue pass (2026-07-02):
  - Made the White House West Wing Secret Service/Situation Room gate behave like a readable SNES item lock instead of only a dialog/state update.
  - When `checkWestWingNscGate()` blocks the route, `GameplayMapScene` now draws a floating `NEED SOURCES` cue with a cream repository/source map, red margin bar, checkpoint badge, and red slash.
  - When the NARA Source Index or repository coverage map certifies the route, the same cue switches to `NSC CLEAR` / `WH/NSC SOURCE MAP` with a cyan/gold open checkpoint glow.
  - The cue is clamped into the West Wing playfield and all pieces are named (`nsc-source-gate-cue`, `nsc-source-gate-map`, `nsc-source-gate-checkpoint`, `nsc-source-gate-open-glow`, etc.) for browser QA.
  - Verification:
    - focused `npm test -- --run src/game/westWingNsc.test.ts src/game/redZoneGate.test.ts src/game/adventureTraining.test.ts src/systems/interactionPrompt.test.ts` passes (4 files / 24 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=west_wing&role=compiler&name=Ruby&v=nsc-source-gate-client`;
    - direct browser probe confirmed blocked title `NEED SOURCES`, caption `REPO MAP\nOR INDEX`, cleared title `NSC CLEAR`, caption `WH/NSC\nSOURCE MAP`, and no page errors;
    - visual proofs: `docs/screenshots/west-wing-nsc-source-gate-locked-cue-page.png` and `docs/screenshots/west-wing-nsc-source-gate-clear-cue-page.png`.
- One-hour reference-training verification (2026-07-02):
  - Treated the linked walkthrough as high-level gameplay grammar only, not a source to copy or literally train a model on.
  - Confirmed the first-hour model is already encoded in `src/game/firstHourTraining.ts`, surfaced through `src/game/adventureTraining.ts`, and documented in `docs/gameplay/first-hour-reference-training.md`.
  - Verified focused tests: `npm test -- --run src/game/adventureTraining.test.ts src/game/gameplayMapFlow.test.ts src/systems/snesMapDressing.test.ts` passes (2 files / 17 tests; duplicate arg collapsed by Vitest).
  - Verified `npm run build` passes with the existing Vite large-chunk warning.
  - Ran the required web-game client against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-training-current`; text state exposes `adventureTraining` metadata from the one-hour training profile.
  - Direct browser proof confirmed the Office hub renders and the HUD cue is visible; screenshot: `docs/screenshots/one-hour-training-local-check.png`.
- Red Zone declassification gate-cue pass (2026-07-02):
  - Made the NARA Stacks Red Zone gate behave like a readable SNES vault lock instead of only a dialog/state update.
  - When `checkRedZoneGate()` blocks the route, `GameplayMapScene` now draws a floating `NEED CLEAR` card with a red vault door, ClassNet token caption, red seal, and lock core.
  - When the Clearance Token or completed E.O. 13526/declassification review opens the gate, the same cue family switches to `RED ZONE OPEN` with a cyan open-gap/glow and `ACCOUNTED REVIEW` caption.
  - The cue is clamped into the NARA Stacks playfield and all pieces are named (`red-zone-gate-cue`, `red-zone-gate-door`, `red-zone-gate-lock-core`, `red-zone-gate-open-glow`, etc.) for browser QA.
  - Verification:
    - focused `npm test -- --run src/game/redZoneGate.test.ts src/game/stackControlManifest.test.ts src/game/naraCatalog.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts` passes (5 files / 26 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - browser probe confirmed the blocked state as title `NEED CLEAR`, caption `CLASSNET TOKEN`, 14 visible `red-zone-gate-*` objects, and no page errors;
    - seeded browser probe through `ReferralVaultScene` confirmed the open state in `GameplayMapScene` as title `RED ZONE OPEN`, caption `ACCOUNTED REVIEW`, 15 visible `red-zone-gate-*` objects, and no page errors;
    - visual proofs: `docs/screenshots/red-zone-gate-locked-cue-page.png` and `docs/screenshots/red-zone-gate-open-cue-page.png`.
- Stack-control manifest reward-cue pass (2026-07-02):
  - Made the NARA Stacks stack-control manifest interaction pay off like a visible SNES archive reward instead of only a dialog/state update.
  - When `fileStackControlManifest()` succeeds after the NARA Source Index is filed, `GameplayMapScene` now draws a floating `MANIFEST+CART` card with original procedural pixel art: cream manifest sheet, red margin bar, archive box, cart rail, and cyan wheels.
  - If the player tries the stack move too early, the same cue family can show `NEED INDEX`, keeping the gate readable as a missing FRUS source-index requirement.
  - The cue is clamped into the playable field so it does not slide under the HUD when the target is near the top of the NARA Stacks map, and all pieces are tagged (`stack-manifest-reward-cue`, `stack-manifest-reward-paper`, `stack-manifest-reward-box`, etc.) for browser QA.
  - Verification:
    - focused `npm test -- --run src/game/stackControlManifest.test.ts src/game/naraCatalog.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts` passes (4 files / 22 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - direct browser probe against `?scene=GameplayMapScene&map=nara_stacks&role=compiler&name=Ruby&v=stack-manifest-reward-final` confirmed 17 visible `stack-manifest-reward-*` objects, title `MANIFEST+CART`, caption `BOXES VISIBLE`, no lingering catalog cue, and no page errors;
    - visual proof: `docs/screenshots/stack-manifest-reward-cue-page.png`.
- NARA catalog microform reward-cue pass (2026-07-02):
  - Made the NARA catalog interaction feel like a SNES item reward instead of only a dialog/state update.
  - When `logNaraCatalog()` awards the `NARA Source Index` and `Microform Supplement Reels`, `GameplayMapScene` now draws a floating `INDEX + REELS` reward card at the catalog desk using a runtime 22x22 nearest-neighbor thumbnail generated from `FRUS_VOLUMES.pickup_microform`.
  - Preserved fallback procedural microform/reel art if the PNG texture is missing, and tagged the reward pieces (`nara-catalog-reward-cue`, `nara-catalog-reward-microform-art`, `nara-catalog-reward-title`, etc.) for browser QA.
  - This links the real FRUS source-index/microform research loop to visible treasure-like feedback in NARA Stacks, continuing the one-hour action-adventure reward grammar without copying reference expression.
  - Verification:
    - focused `npm test -- --run src/game/naraCatalog.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts` passes (3 files / 19 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - direct browser probe against `?scene=GameplayMapScene&map=nara_stacks&role=compiler&name=Ruby&v=nara-catalog-reward` confirmed `pickup_microform` loaded, runtime `nara-catalog-reward-thumb` created, 7 visible `nara-catalog-reward-*` objects, and no page errors;
    - visual proof: `docs/screenshots/nara-catalog-reward-cue-page.png`.
- FRUS Bookshelf reward-cue pass (2026-07-02):
  - Made the Historian Office FRUS Bookshelf interaction feel like a SNES item pickup instead of only a dialog/state update.
  - When `browseFrusBookshelf()` awards `Reference Shelf Fragment`, `GameplayMapScene` now draws a floating `FRAG +1` reward card at the shelf using a runtime 18x28 nearest-neighbor thumbnail generated from `FRUS_VOLUMES.world_standing`.
  - Preserved fallback procedural book art if the PNG texture is missing, and tagged the reward pieces (`frus-bookshelf-reward-cue`, `frus-bookshelf-reward-volume-art`, `frus-bookshelf-reward-title`, etc.) for browser QA.
  - This makes the public-reference shelf visibly connect to the cover-fragment progression used by the pause shelf and Buckram Gate final cover assembly.
  - Verification:
    - focused `npm test -- --run src/game/frusBookshelf.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts` passes (3 files / 19 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby&v=frus-bookshelf-reward-client`;
    - direct browser probe confirmed `world_standing` loaded, runtime `frus-bookshelf-reward-thumb` created, 7 visible `frus-bookshelf-reward-*` objects, and no page errors;
    - visual proof: `docs/screenshots/frus-bookshelf-reward-cue-page.png`.
- FRUS Quest subscreen volume-shelf pass (2026-07-02):
  - Upgraded `InventoryOverlay` with the registered `FRUS_VOLUMES.ui_row_six` art as a cropped ruby buckram shelf strip, keeping the existing process-tool, DANN-E item, dungeon-key, pendant/crystal, and room-map logic intact.
  - Added six small volume-progress lamps tied to `gameState.volumeFragments` plus the `Published FRUS Cover`, so the pause/subscreen now shows the FRUS cover/volume collection as a visible SNES inventory object rather than text alone.
  - Kept a procedural fallback shelf strip if the PNG is missing and tagged the new display objects (`inventory-frus-volume-row-art`, `inventory-frus-volume-slot-light`, `inventory-frus-volume-row-title`, etc.) for browser QA.
  - Tightened the subscreen body copy so the shelf strip does not collide with the dungeon-key readout on the 256x240 canvas.
  - Verification:
    - focused `npm test -- --run src/systems/overlayInput.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts` passes (3 files / 21 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - browser probe against `?scene=OfficeScene&role=compiler&name=Ruby&v=inventory-frus-shelf-final-no-toast` confirmed `ui_row_six` loaded, 16 visible `inventory-frus-volume-*` objects, title `FRUS VOLUME SHELF 0/6`, and no page errors;
    - visual proof: `docs/screenshots/inventory-frus-shelf-page.png`.
- Published FRUS reward-art pass (2026-07-02):
  - Wired the registered PNG art packs into `BootScene.preload()` by calling `preloadDannePack()` and `preloadAllNewArtPack()`, so the DANN-E expansion art, gameplay maps, overworld maps, title screens, and FRUS volume assets load from their typed registries at boot instead of depending on scene-local fallback loads.
  - Upgraded the Buckram Gate published-prize screen to prefer the 16-bit `FRUS_VOLUMES.reward_legendary` texture when available, using an exact 96x64 display target from the 1536x1024 source so the reward art resolves crisply with nearest-neighbor filtering.
  - Preserved the procedural assembled-cover fallback if the reward texture is missing.
  - Added named display-list objects (`published-frus-reward-art`, `published-frus-reward-frame`, `published-frus-reward-spark*`, and caption/title objects) for browser QA.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts src/systems/interaction.test.ts` passes (4 files / 22 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=published-prize-art`;
    - direct browser probe confirmed `reward_legendary` texture loaded, 17 visible `published-frus-reward-*` objects, and no page errors;
    - visual proof: `docs/screenshots/published-prize-art-page.png`.
- Buckram Gate blocker-glyph pass (2026-07-02):
  - Added original pixel-art blocker glyphs to the central Buckram Gate lock panel so the final blocker reads by silhouette as well as text.
  - `buckramBlockerCue()` now carries an icon family (`stamp`, `cover`, `equity`, `map`, `apparatus`, `bracket`, `standards`, `reliability`, `key`, `ready`) alongside the compact label/detail.
  - The current `APP SRC` blocker draws a cream source-list sheet with red margin bar and gold/ink lines, tagged as `buckram-gate-blocker-icon-apparatus-*` for browser QA.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts src/systems/interaction.test.ts` passes (4 files / 22 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=buckram-blocker-glyph`;
    - text state reports `Buckram Gate locked: APP SRC.` and detailed message `Buckram Gate locked: next file Sources consulted list.`;
    - display-list probe confirmed `LOCKED`, `NEXT\nAPP SRC`, and five visible `buckram-gate-blocker-icon-apparatus-*` objects;
    - visual proof: `docs/screenshots/buckram-blocker-glyph-page.png`.
- Buckram Gate central-blocker plaque pass (2026-07-02):
  - Continued the final-room SNES readability pass by moving the compact blocker cue into the central publication gate itself, not only the HUD.
  - The locked gate panel now updates from readiness state with named display-list labels:
    - `buckram-gate-status-label` -> `LOCKED` or `READY`;
    - `buckram-gate-blocker-label` -> `NEXT\nAPP SRC` or the current compact blocker.
  - This makes the win-room blocker read like a dungeon lock: the player can see the missing FRUS process object directly on the gate.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts src/systems/interaction.test.ts` passes (4 files / 22 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=buckram-central-blocker`;
    - direct display-list probe confirmed `buckram-gate-status-label: LOCKED` and `buckram-gate-blocker-label: NEXT\nAPP SRC`;
    - visual proof: `docs/screenshots/buckram-central-blocker-page.png`.
- Buckram Gate compact-blocker cue pass (2026-07-02):
  - Tightened the final gate's blocked-state readability so it behaves more like an SNES dungeon lock: one compact blocker code on screen, fuller explanation in the structured gate message.
  - Added `buckramBlockerCue()` in `EndingScene`, prioritizing blockers as `STAMP <id>`, `COVER xN`, `EQUITY xN`, `REPO MAP`, `APP <shortLabel>`, `BRACKET TEXT`, `STANDARDS`, `REL current/min`, or `BUCKRAM KEY`.
  - Replaced the old long comma-list objective with a short cue such as `Buckram Gate locked: APP SRC.`, preventing bottom-HUD clipping in the win room.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts src/systems/interaction.test.ts` passes (4 files / 22 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=buckram-compact-blocker-final`;
    - text state reports compact objective `Buckram Gate locked: APP SRC.` and detailed `finalGateCertification.message: Buckram Gate locked: next file Sources consulted list.`;
    - full-page visual proof shows the bottom objective fits: `docs/screenshots/buckram-compact-blocker-final-page.png`.
- First-hour action-adventure training verification (2026-07-02):
  - Treated the linked one-hour reference as gameplay grammar only: readable next verb, visible gates, key/tool rhythm, room-map literacy, boss-readiness cues, reward-return, and recoverable standards pressure.
  - Confirmed the typed model is present in `src/game/firstHourTraining.ts`, `src/game/adventureTraining.ts`, and `docs/gameplay/first-hour-reference-training.md`.
  - Fixed a live cue polish bug where fallback objectives could render as `NEXT NEXT ...`; `adventureTraining` now strips leading `NEXT`/`GOAL` before adding its own cue verb.
  - Added a deterministic test covering that duplicated-prefix case.
  - Verification:
    - focused `npm test -- --run src/game/adventureTraining.test.ts src/systems/interaction.test.ts src/game/gameplayMapFlow.test.ts src/systems/snesMapDressing.test.ts` passes (3 files / 23 tests);
    - `npm run build` passes with the known Vite large-chunk warning;
    - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=first-hour-training-fixed`;
    - direct Playwright page probe confirmed the Office scene, the controls card dismissal, clean top cue `NEXT Controls logged.`, `adventureTraining` metadata in `render_game_to_text()`, and screenshot `docs/screenshots/first-hour-training-page-probe.png`.
- FRUS Production Floor Buckram handoff pass (2026-07-02):
  - Made the completed `Gate READY` station act like a real stage threshold instead of a passive instruction dialog.
  - Pressing A at `Gate READY` now records `sceneProgress.frusProductionFloorReadyHandoff`, plays the ruby mosaic `GATE READY` transition, and loads `EndingScene` at the Buckram Gate publication table.
  - Updated the text-state interaction readout to `FRUS FLOOR INTERACT: GATE READY`.
  - Verified focused tests and build: 7 focused test files / 49 tests pass; `npm run build` passes with the existing Vite chunk-size warning.
  - Ran the required web-game client against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-buckram-handoff-client`; the fresh unfinished floor still reports `FRUS FLOOR ROUTE: TO 1 CITE`.
  - Direct Chrome/Phaser probe seeded all five floor gates complete, invoked the `Gate READY` interactable, and confirmed `EndingScene` active, Buckram Gate objective visible, handoff flag set, transition record `GATE READY -> EndingScene`, no page errors, no failed requests, and screenshot `docs/screenshots/frus-floor-buckram-handoff-probe.png`.
- FRUS Production Floor ready-prompt priority pass (2026-07-02):
  - Fixed a completed-floor clarity conflict found in screenshot QA: the route and plaque pointed to `GATE READY`, but the generic return-door hint could still win the bottom prompt.
  - `GameplayMapScene` now prioritizes the active FRUS floor gate as the prompt hint whenever the player is not already in strict interaction range of another target, keeping the final handoff readable.
  - Verified focused tests and build: 7 focused test files / 49 tests pass; `npm run build` passes with the existing Vite chunk-size warning.
  - Direct Chrome/Phaser probe seeded all five gates complete and confirmed `FRUS FLOOR ROUTE: TO GATE READY`, bottom hint `STEP CLOSER: GATE READY`, one ready card, one `GATE READY` label, five `ready` route dots, no page errors, no failed requests, and screenshot `docs/screenshots/frus-floor-ready-prompt-probe.png`.
- FRUS Production Floor ready-marker pass (2026-07-02):
  - Continued the one-hour action-adventure reference training by making the completed Production Floor show a visible final handoff, not only route breadcrumbs.
  - When all five gates are clear, `GameplayMapScene` now replaces the unfinished-gate `NEXT` marker with a green/gold `GATE READY` plaque, arrow, and glow at the publication node.
  - Verified focused tests and build: 7 focused test files / 49 tests pass; `npm run build` passes with the existing Vite chunk-size warning.
  - Ran the required web-game client against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-ready-marker-client`; the fresh state still reports `FRUS FLOOR ROUTE: TO 1 CITE`.
  - Direct Chrome/Phaser probe seeded all five gates complete and confirmed `FRUS FLOOR NEXT GATE: READY`, `FRUS FLOOR ROUTE: TO GATE READY`, one `frus-production-ready-gate-card`, label `GATE READY`, no old next-gate cards, five `ready` route dots, no page errors, no failed requests, and screenshot `docs/screenshots/frus-floor-ready-marker-probe.png`.
- FRUS Production Floor ready-route pass (2026-07-02):
  - Continued the one-hour action-adventure reference training by keeping the completed Production Floor actionable after all five workflow gates are clear.
  - Changed the completion route readout from a passive complete state to `FRUS FLOOR ROUTE: TO GATE READY`, so `window.render_game_to_text()` still names the final publication station.
  - `GameplayMapScene` now draws a gold/cyan breadcrumb trail to the publication node when no unfinished gate remains, with route dots tagged `ready`.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (7 files / 49 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Direct Chrome/Phaser probe confirmed `FRUS FLOOR ROUTE: TO GATE READY`, five `ready` route dots, five shadows, no page errors, no failed requests, and screenshot `docs/screenshots/frus-floor-ready-route-probe.png`.
- FRUS Production Floor next-route pass (2026-07-01):
  - Turned the Production Floor `NEXT` marker into a live route objective by drawing a small cyan/gold breadcrumb trail from the player toward the first unfinished FRUS gate.
  - Added `frusProductionFloorNextGateRouteReadout()` in `src/game/gameplayMapFlow.ts`, exposing first waiting-gate route text such as `FRUS FLOOR ROUTE: TO 1 CITE` through `window.render_game_to_text()`.
  - `GameplayMapScene` now refreshes `frus-production-next-gate-route-dot` objects as the player moves, using the first waiting gate from current `GameState`.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (7 files / 47 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-next-route-client`; text state reports `FRUS FLOOR ROUTE: TO 1 CITE`.
  - Direct Chrome/Phaser probe confirmed six route dots and six shadows targeting gate 1, label `NEXT CITE`, no page errors, and screenshot `docs/screenshots/frus-floor-next-route-probe.png`.
- FRUS Production Floor next-gate pass (2026-07-01):
  - Added a Zelda-like "next unfinished gate" cue to the FRUS Production Floor rail so the player can see not only current status but the next station that needs work.
  - Added typed helpers in `src/game/gameplayMapFlow.ts`: `frusProductionFloorNextGate()` and `frusProductionFloorNextGateReadout()`, with text-state output such as `FRUS FLOOR NEXT GATE: 1 CITE`.
  - `GameplayMapScene` now draws a compact `NEXT <requirement>` card and arrow at the first waiting FRUS gate; in a fresh run this appears as `NEXT CITE` at the provenance/citation station.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (7 files / 47 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-next-gate-client`; text state reports `FRUS FLOOR NEXT GATE: 1 CITE`.
  - Direct Chrome/Phaser probe confirmed one `frus-production-next-gate-card`, label `NEXT CITE`, arrow attached to gate 1, no page errors, and screenshot `docs/screenshots/frus-floor-next-gate-probe.png`.
- FRUS Production Floor gate-status pass (2026-07-01):
  - Made the Production Floor workflow rail behave more like an SNES dungeon/progress dashboard by adding per-station gate status markers for the five FRUS phases.
  - Added typed gate readouts in `src/game/gameplayMapFlow.ts`, exposing `FRUS FLOOR GATES: 1 NEED CITE > 2 NEED SEL > 3 NEED EQ > 4 NEED EDIT > 5 NEED BIND` through `window.render_game_to_text()`.
  - `GameplayMapScene` now derives gate status from current `GameState`: Citation Stamp/provenance, selected-document progress, clearance/referral tools, editorial/proof tools, and Buckram/publication readiness.
  - Added five tiny in-world status lights/cards to the rail, while preserving the current-stage cursor and task card.
  - Fixed a visual overlap issue found during screenshot QA: the floating `STEP CLOSER` prompt can now reserve a bottom band, and the `frus_floor` scene uses that to keep prompts off the workflow rail.
  - Shifted the active task card to the side of the current node so the player sprite no longer covers labels like `ROUTE EQ` while standing on the active station.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (7 files / 47 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-gate-status-client-2`; text state reports the new gate summary.
  - Direct Chrome/Phaser probe confirmed five status lights/cards, waiting labels `CITE`, `SEL`, `EQ`, `EDIT`, `BIND`, prompt y-clamped above the rail, off-player task label placement, no page errors, and screenshot `docs/screenshots/frus-floor-gate-status-probe.png`.
- FRUS Production Floor live task-card pass (2026-07-01):
  - Turned the current-stage cursor into a compact playable task cue, so the production-floor rail now tells the player both where they are and what FRUS verb belongs to that phase.
  - Added typed stage task labels/details to `src/game/gameplayMapFlow.ts`: `VERIFY SRC`, `SELECT DOC`, `ROUTE EQ`, `CHECK NOTE`, and `BIND VOL`, with full `render_game_to_text()` readouts such as `FRUS FLOOR TASK: ROUTE EQUITIES`.
  - Updated `GameplayMapScene` to draw a small SNES-style task card under the active rail node while preserving the existing stage cursor.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (6 files / 40 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-task-card-client`; text state reports the full rail, current stage, and current task.
  - Direct Chrome/Phaser probe moved the player across all five stage ratios and confirmed task labels/readouts: `VERIFY SRC` / `VERIFY SOURCE TRAIL`, `SELECT DOC` / `SELECT DOCUMENTS`, `ROUTE EQ` / `ROUTE EQUITIES`, `CHECK NOTE` / `CHECK ANNOTATION`, and `BIND VOL` / `BIND VOLUME`, with no page/console errors. Screenshot: `docs/screenshots/frus-floor-task-card-probe.png`.
- FRUS Production Floor current-stage cursor pass (2026-07-01):
  - Advanced the SNES/FRUS production-floor map from a static workflow rail into a responsive gameplay guide.
  - Added typed helpers that map the player's x-position on the FRUS Production Floor to the nearest workflow stage and expose `FRUS FLOOR CURRENT: <stage>` through `window.render_game_to_text()`.
  - Added a live pixel cursor over the rail that follows the active stage (`NOW R`, `NOW C`, `NOW D`, `NOW A`, `NOW P`) as the player moves across Research, Compile, Declass, Annotate, and Publish.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (6 files / 40 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-current-stage-client`; text state reports both the full rail and current stage.
  - Direct Chrome/Phaser probe moved the player across all five stage ratios and confirmed labels/readouts: `NOW R` / `1 RESEARCH`, `NOW C` / `2 COMPILE`, `NOW D` / `3 DECLASS`, `NOW A` / `4 ANNOTATE`, and `NOW P` / `5 PUBLISH`, with no page/console errors. Screenshot: `docs/screenshots/frus-floor-current-stage-probe.png`.
- FRUS Production Floor workflow-rail pass (2026-07-01):
  - Continued the one-hour action-adventure reference training by making the FRUS Production Floor teach the whole volume-production sequence as an in-world route, not just a static map label.
  - Added a generated SNES-style `FRUS VOLUME PATH` rail to the `frus_floor` gameplay map with five compact nodes: `SRC`, `COMP`, `DEC`, `ANN`, and `PUB`.
  - Added typed workflow metadata in `src/game/gameplayMapFlow.ts` and exposed the full text-state readout as `FRUS FLOOR RAIL: 1 RESEARCH > 2 COMPILE > 3 DECLASS > 4 ANNOTATE > 5 PUBLISH` so `window.render_game_to_text()` can verify the map's gameplay lesson.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (6 files / 39 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-rail-client-final`; text state reports the new workflow rail readout.
  - Direct Chrome/Phaser probe confirmed one rail, five nodes, four arrows, labels `R/C/D/A/P`, tags `SRC/COMP/DEC/ANN/PUB`, title `FRUS VOLUME PATH`, no page/console errors, and screenshot `docs/screenshots/frus-floor-production-flow-rail-probe.png`.
- Buckram Gate publication-table route-cue pass (2026-07-01):
  - Continued the SNES/FRUS production goal by making the final human publication table behave like a physical action-adventure reward gate instead of relying only on bottom HUD text.
  - Added a live route cue and floating action prompt to `EndingScene`; when a valid Buckram Gate action is available, the cue points from the player to the table and labels the next publication verb (`FRONT MATTER`, `READER AIDS`, `INDEX`, `TYPESET`, `CERTIFY`, `GPO`, `FUNDING`, `LEDGER`, `DIGITAL`, `CITATION`, `CALENDAR`, or `PUBLISH`).
  - The route clears when the player reaches the table, while the prompt remains as the local action cue (`A CERTIFY`, etc.), keeping the final FRUS volume handoff readable in-world.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 36 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=buckram-table-route-client`.
  - Direct Chrome/Phaser probe seeded a lawful publication-ready state and confirmed the cue key `G1:CERTIFY:128,200->128,176`, two route dots, visible prompt, route cleanup at table range, Buckram Gate readiness `1.0`, and no page/console errors. Screenshots are saved at `docs/screenshots/buckram-publication-table-route-certify.png` and `docs/screenshots/buckram-publication-table-route-near.png`.
- Referral Concurrence Slip dynamic route-trail pass (2026-07-01):
  - Continued the one-hour action-adventure reference training by making the Referral Vault reward room point spatially to the Concurrence Slip, not only through HUD text.
  - Added a generated cyan/gold route trail from the player's current position to the Concurrence Slip pedestal in `ReferralVaultScene`, with state labels such as `PERMISSION`, `APPEAL`, `VISIBLE EXCISION`, and `TAKE SLIP`.
  - The cue refreshes as the player moves in R2, clears on room changes or slip collection, and uses named objects (`referral-concurrence-slip-route-*`) for future visual probes.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 36 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ReferralVaultScene&role=compiler&name=Ruby&v=referral-concurrence-route-client`.
  - Direct Chrome/Phaser probe confirmed the R2 Concurrence Slip cue key changed from `R2:PERMISSION:58,178->128,132` to `R2:PERMISSION:116,144->128,132`, route dots moved accordingly, no page/console errors occurred, and screenshots are saved at `docs/screenshots/referral-concurrence-slip-route-permission.png` and `docs/screenshots/referral-concurrence-slip-route-near.png`.
- Network Clearance Token dynamic route-trail pass (2026-07-01):
  - Continued the one-hour action-adventure reference training by making the Two Networks reward room point spatially to the next process tool, not only through HUD text.
  - Added a generated cyan/gold route trail from the player's current position to the Clearance Token pedestal in `NetworkScene`, with state labels such as `VERIFY LANE`, `E.O. REVIEW`, `CLASS REVIEW`, and `TAKE TOKEN`.
  - The cue refreshes as the player moves in N2, clears on room changes or token collection, and uses named objects (`network-clearance-token-route-*`) for future visual probes.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 36 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=NetworkScene&role=compiler&name=Ruby&v=network-clearance-route-client`.
  - Direct Chrome/Phaser probe confirmed the N2 Clearance Token cue key changed from `N2:VERIFY LANE:56,178->128,132` to `N2:VERIFY LANE:116,144->128,132`, route dots moved accordingly, no page/console errors occurred, and screenshots are saved at `docs/screenshots/network-clearance-token-route-lane.png` and `docs/screenshots/network-clearance-token-route-take.png`.
- Archive Source Note dynamic route-trail pass (2026-07-01):
  - Continued the one-hour action-adventure reference training by making the first provenance object behave like a carried room-route task, matching the newer Silent Read route trail.
  - Refactored the `ArchiveScene` Source Note 47 cue so route diamonds originate at the carried note's current position, refresh when the player moves, and retarget the research table instead of using a fixed vertical breadcrumb.
  - Added a route-cue cache key and explicit cue cleanup so the trail clears across rooms/status changes without leaving stale objects.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 36 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=archive-dynamic-route-client`.
  - Direct Chrome/Phaser probe confirmed the carried Source Note 47 cue key changed from `A1:carried:92,155->128,116` to `A1:carried:116,143->128,116`, route dots moved accordingly, no page/console errors occurred, and screenshots are saved at `docs/screenshots/archive-source-note-dynamic-route-carried.png` and `docs/screenshots/archive-source-note-dynamic-route-moved.png`.
- Silent Read physical-verification route-trail pass (2026-07-01):
  - Continued the one-hour action-adventure reference training by turning active Silent Read review-folder routing into a visible spatial cue.
  - Added a generated cyan/gold pixel route trail from the carried review folder or waiting flag to the target workstation in `SilentReadScene`, plus a compact `TO <station>` plaque at the destination.
  - The cue refreshes as the player moves, stays scoped to the current room/active physical flag, and clears when there is no active flag, the flag belongs to another room, or the flag has already been stamped.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 36 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=SilentReadScene&role=compiler&name=Ruby&v=silent-read-route-trail-smoke-2`.
  - Direct Chrome/Phaser probe confirmed the E1 Editor's Labyrinth route cue exists while carrying the mechanical-fix flag, updates when the player moves, produces no page/console errors, and saves screenshots at `docs/screenshots/silent-read-route-trail-carried.png` and `docs/screenshots/silent-read-route-trail-carried-moved.png`.
- Silent Read physical-verification proximity-cue pass (2026-07-01):
  - Continued the one-hour action-adventure reference training by making the proofing outbox/workstation loop teach the same visible approach-then-act grammar as the earlier FRUS production areas.
  - Added the floating `! STEP CLOSER` prompt to active review-folder flags and nearby workstations in `SilentReadScene`, while strict actions still require the original 24px flag pickup radius and 28px workstation action radius.
  - Pressing A/Space just outside range now reports `Step closer to MECH FIX.` or `Step closer to Editor Desk.` and does not carry, route, verify, or stamp early.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 36 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=SilentReadScene&role=compiler&name=Ruby&v=silent-read-step-closer-smoke`.
  - Direct Chrome/Phaser probes confirmed the E1 proofing room rendered, strict nearest remains null at 28px from the waiting flag and 40px from the editor desk, prompt focus cues are visible, flag state remains unchanged after A/Space, and screenshots are saved at `docs/screenshots/silent-read-flag-step-closer-hint.png` and `docs/screenshots/silent-read-station-step-closer-hint.png`.
- Network/Referral reward-pedestal proximity-cue pass (2026-07-01):
  - Continued the one-hour action-adventure reference training as mechanics grammar only by making the Two Networks and Referral Vault reward pedestals teach the same approach-then-act loop as Archive and the DANN-E maps.
  - Added the floating `! STEP CLOSER` prompt to the Clearance Token pedestal in `N2 ClassNet Vault` and the Concurrence Slip pedestal in `R2 Concurrence Chamber`, while strict collection still requires the original 32px action radius.
  - Pressing A/Space just outside the reward radius now reports `Step closer to Clearance Token.` or `Step closer to Concurrence Slip.` and does not collect the process item early.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 36 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=NetworkScene&role=compiler&name=Ruby&v=network-referral-step-closer-smoke`.
  - Direct Chrome/Phaser probes confirmed the reward rooms are actually rendered, strict nearest remains null at 38px from the pedestals, prompt focus cues are visible, neither reward is collected, and screenshots are saved at `docs/screenshots/network-clearance-token-step-closer-hint.png` and `docs/screenshots/referral-concurrence-slip-step-closer-hint.png`.
- Archive source-note proximity-cue training pass (2026-07-01):
  - Re-verified the linked YouTube reference through YouTube oEmbed metadata as `Legend of Zelda A LINK TO THE PAST Full Game Walkthrough - No Commentary (A Link to the Past Full)` and continued to treat it as one-hour gameplay-grammar training only.
  - Extended the honest `! STEP CLOSER` floating prompt into `ArchiveScene`, including the Source Note 47 research-table loop, while preserving the strict verification radius.
  - Pressing A/Space just outside the research-table radius now reports `Step closer to Research Table.` and leaves `Source Note 47` in the carried state instead of routing, verifying, or stamping early.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 36 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=archive-step-closer-smoke`.
  - Direct Chrome/Phaser probe confirmed strict nearest remains null at 50px from the research table, the prompt focus cue is visible, no page/console errors occur, and screenshots are saved at `docs/screenshots/archive-step-closer-prompt-hint.png` and `docs/screenshots/archive-step-closer-prompt-after-a.png`.
- DANN-E expansion proximity-cue consistency pass (2026-07-01):
  - Extended the same honest `! STEP CLOSER` floating prompt into the shared `DanneMapScene`, covering Cherry Blossom Garden, Senate Hearing Chamber, NARA Stacks, Embassy Cable Room, and Black Vault Lair.
  - DANN-E maps now use the wider hint radius only for visible focus cues while strict actions still require `nearestInteractable()` and the existing interaction buffer.
  - Pressing A/Space just outside the Ruby Pen Chest radius now reports `Step closer to Ruby Pen Chest.` and does not open the chest, grant the Ruby Pen, or create a dialog.
  - Verified focused tests: `npm test -- src/systems/interaction.test.ts src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (6 files / 38 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=CherryBlossomGardenScene&role=compiler&name=Ruby&v=danne-step-closer-smoke`.
  - Direct Chrome/Phaser probe in a clean browser context confirmed strict nearest remains null, the prompt focus cue is visible, Ruby Pen `acquired` remains false, no dialog opens, and no page errors occur. Screenshots: `docs/screenshots/danne-map-step-closer-prompt-hint.png`, `docs/screenshots/danne-map-step-closer-prompt-after-a.png`.
- Office/Guide proximity-cue consistency pass (2026-07-01):
  - Extended the honest `! STEP CLOSER` floating prompt from gameplay maps into the Office Hub and Archive Guide route, continuing the one-hour action-adventure readability training without copying expression.
  - Office and Guide still use strict `nearestInteractable()` for actual A-button actions, but now use the wider hint radius only for visible target focus.
  - Pressing A just outside the Office Archive Guide Door radius now nudges with `Step closer to Archive Guide Door.` instead of entering the door or saying nothing.
  - Pressing A just outside the Guide Citation Stamp radius now nudges with `Step closer to Citation Stamp.` and does not collect the stamp.
  - Cleaned the Guide bottom HUD by reserving the bottom objective lane for the objective text and relying on the floating prompt for local action hints.
  - Verified focused tests: `npm test -- src/systems/interaction.test.ts src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (6 files / 38 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against both Office and Guide deep links: `?scene=OfficeScene&role=compiler&name=Ruby&v=office-guide-step-closer-smoke` and `?scene=GuideScene&role=compiler&name=Ruby&v=guide-step-closer-smoke-final`.
  - Direct Chrome/Phaser probes confirmed strict nearest remains null, the prompt focus cue stays visible, A/Space does not activate the target, no page errors occur, and screenshots are saved at `docs/screenshots/office-step-closer-prompt-hint.png` and `docs/screenshots/guide-step-closer-prompt-hint.png`.
- Gameplay-map proximity-cue training pass (2026-07-01):
  - Continued the one-hour action-adventure reference training as mechanics grammar only: readable proximity, honest prompts, and forgiving action feedback without copying art, maps, music, text, enemies, or puzzle layouts.
  - `GameplayMapScene` now uses the wider `nearestInteractableHint()` range for visible focus cues while keeping strict interactions tied to `nearestInteractable()`.
  - Hint-only targets show `STEP CLOSER: <target>` in the command band and the floating plaque now reads `! STEP CLOSER` instead of implying the A action is already live.
  - Pressing A while just outside the strict radius gives `Step closer to <target>.`, temporarily overrides the objective with `Move closer to <target>, then press A.`, and does not trigger doors or interactions.
  - Verified focused tests: `npm test -- src/systems/interaction.test.ts src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (6 files / 38 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby&v=interaction-focus-smoke-3`.
  - Direct Chrome/Phaser probe placed the player just outside the Foggy Bottom strict door radius and confirmed strict nearest remains null, the hint/focus cue is visible, Space does not transition away from `GameplayMapScene`, the step-closer message/objective appears, and no page errors occur. Screenshots: `docs/screenshots/gameplay-map-interaction-focus-hint.png`, `docs/screenshots/gameplay-map-interaction-focus-step-closer.png`.
- Gameplay-map arrival-stamp pass (2026-07-01):
  - Continued the first-hour threshold training by adding a compact SNES-style arrival stamp whenever `GameplayMapScene` loads.
  - The stamp sits top-right, keeps the existing left map-flow plaque readable, shows the stage code/action such as `01 CHARTER` or `03 ENTER`, and auto-clears after a short beat.
  - Door transitions still use the ruby mosaic route card, then the destination map now gets its own arrival stamp, making route changes feel intentional instead of abrupt.
  - Updated `docs/gameplay/first-hour-reference-training.md` to include the destination-arrival stamp in the non-copying gameplay grammar.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 32 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby&v=entry-banner-smoke-compact`.
  - Direct Chrome/Phaser probe confirmed the initial arrival stamp appears and clears, the door transition still records `03 ENTER`, Foggy Bottom loads, and the destination arrival stamp appears with no page/console errors. Screenshots: `docs/screenshots/gameplay-map-entry-banner-initial.png`, `docs/screenshots/gameplay-map-entry-banner-destination.png`.
- First-hour route-transition training pass (2026-07-01):
  - Continued treating the linked one-hour `A Link to the Past` reference as gameplay grammar only, not copied expression.
  - Gameplay-map doors now use the existing ruby mosaic transition before changing maps, locking player input during the cover and recording the SNES transition state.
  - Cleaned route readouts so the Foggy Bottom route displays as `ROUTE 03 ENTER` instead of the doubled `ROUTE 03 ROUTE: ENTER`.
  - Updated `docs/gameplay/first-hour-reference-training.md` to document the route-transition threshold lesson and its non-copying boundary.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 32 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby&v=route-transition-smoke-2`; text-state smoke confirms the gameplay-map scene loads and route readouts are present.
  - Direct Chrome/Phaser probe invoked the Foggy Bottom door and confirmed transition label `03 ENTER`, active ruby mosaic coverage, route readout `ROUTE 03 ENTER`, destination `Foggy Bottom Street`, no page/console errors, and screenshot `docs/screenshots/route-transition-card-visible.png`.
- Dynamic SNES route-badge refresh pass (2026-07-01):
  - Fixed a gameplay-map readability gap: route badges no longer stay stale after a gated doorway opens during play.
  - `GameplayMapScene` now tracks route-badge objects separately from the base door marker, rebuilds them after gate-opening interactions, and refreshes the `visibleEntities` route readouts at the same time.
  - The West Wing Situation Room route now flips immediately from red `LOCK` / `LOCKED 08 FINAL: CERTIFY` to `08 CERTIFY` / `ROUTE 08 FINAL: CERTIFY` after NSC source coverage is certified.
  - The Black Vault blast-door helper also refreshes route badges when west/north doors open after human review.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 32 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=GameplayMapScene&map=west_wing&role=compiler&name=Ruby&v=route-badge-refresh-smoke`; initial readout confirms `LOCKED 08 FINAL: CERTIFY`.
  - Direct Chrome/Phaser probe granted the existing repository-coverage prerequisite, invoked the scene's Secret Service gate handler, and confirmed route labels changed from `LOCK` to `08 CERTIFY`, lock-count changed from `1` to `0`, visible routes changed from `LOCKED 08 FINAL: CERTIFY` to `ROUTE 08 FINAL: CERTIFY`, and no page/console errors. Screenshot: `docs/screenshots/route-badge-refresh-probe.png`.
- SNES gameplay-map route-badge pass (2026-07-01):
  - Added compact original SNES-style route badges to gameplay-map doorways so routes read like deliberate screen transitions instead of generic markers.
  - Door badges now show a cardinal direction plus a destination cue such as `WORLD`, `03 ENTER`, `08 CERTIFY`, or `LOCK` for gated routes.
  - Added Phaser-free helpers `gameplayMapRouteBadgeLabel()` and `gameplayMapRouteReadout()` in `src/game/gameplayMapFlow.ts`, then reused them for both visible door art and `window.render_game_to_text()` state.
  - `GameplayMapScene` now includes route readouts such as `ROUTE WORLD MAP`, `ROUTE 03 ROUTE: ENTER`, and `LOCKED 08 FINAL: CERTIFY` in `visibleEntities`.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 32 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby&v=snes-route-badge-smoke`; `render_game_to_text()` reports `ROUTE WORLD MAP` and `ROUTE 03 ROUTE: ENTER`.
  - Direct Chrome/Phaser probe confirmed route badges and labels in `historian_office`, `nara_stacks`, `west_wing`, and `black_vault`, including locked route badges for gated West Wing and Black Vault doors, with no page/console errors. Screenshot: `docs/screenshots/snes-route-badge-probe.png`.
- SNES gameplay-map flow-plaque pass (2026-07-01):
  - Added a compact original SNES-style flow plaque to the generated gameplay-map dressing so each map visibly declares its FRUS production role, e.g. `01 RESEARCH / CHARTER`, `02 STACKS / CITE`, and `08 FINAL / CERTIFY`.
  - Split the map-flow metadata into Phaser-free `src/game/gameplayMapFlow.ts`, then reused it from both `GameplayMapScene` state readouts and `snesMapDressing` rendering.
  - `GameplayMapScene` now adds the map-flow readout to `visibleEntities`, so `window.render_game_to_text()` confirms the map's production-stage cue alongside the visual plaque.
  - Added `src/systems/snesMapDressing.test.ts` to lock the compact FRUS stage labels.
  - Verified focused tests: `npm test -- src/systems/snesMapDressing.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (5 files / 31 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby&v=snes-map-flow-plaque-smoke`; `render_game_to_text()` reports visible entity `01 RESEARCH: CHARTER`, while the generated screenshot remains black due the known headless WebGL capture artifact.
  - Direct Chrome/Phaser probe across all eight gameplay maps confirmed one `snes-map-flow-plaque`, one code box, one title, one verb, matching readouts for `historian_office`, `nara_stacks`, `foggy_bottom`, `west_wing`, `frus_floor`, `embassy`, `capitol_hill`, and `black_vault`, and no page/console errors. Probe JSON: `docs/screenshots/snes-map-flow-plaque-probe.json`.
- First-hour published-reward training pass (2026-07-01):
  - Treated the linked one-hour gameplay reference as gameplay-grammar training only, not copied expression: the final 55-60 minute lesson is that a major reward visibly changes the world and points the player back outward.
  - Added a published Buckram Gate override to `getAdventureTrainingCue()` so once the FRUS cover is certified, `window.render_game_to_text().adventureTraining` reports the `reward_return` phase and the specific `reward_changes_world` drill.
  - The ending reward screen now drives the live training cue as `RETURN` with detail `Published FRUS cover changed the world: public record complete.`, matching the in-world published cover payoff.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 30 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&v=one-hour-training-published-smoke`; the default scene state remains pre-publication and the generated screenshot remains black due the known headless WebGL capture artifact.
  - Direct Chrome/Phaser probe invoked `publishVolume()` and confirmed `finalGateCertification.status: "published"`, visible threats cleared, adventure-training `drillId: "reward_changes_world"`, `drillMinuteRange: "55-60"`, and no page/console errors. Screenshot: `docs/screenshots/one-hour-training-published-reward-probe.png`.
- Black Vault certification-docket pass (2026-07-01):
  - Added a pre-fight `CERT DOCKET` board to `BlackVaultLairScene` so DANN-E's final publication gate rules are readable before combat instead of only being discovered after a failed defeat attempt.
  - The board reads live `getPublicationReadinessReadout()` state and displays Pendants, Equity Crystals, Buckram Gate, Standards, and Treaty Fragments with red/green readiness lights plus a first missing requirement line such as `NEED PENDANT RULE`.
  - The certification board hides when the DANN-E boss starts so it does not collide with the statutory-clock and boss-HUD combat UI.
  - Fixed DANN-E map scenes to refresh the global objective on create, keeping `window.render_game_to_text()` and the HUD aligned with the active map objective.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=BlackVaultLairScene&role=compiler&name=Ruby&v=publication-board-smoke`; the scripted Space press triggered the valid return route to Archive, and the screenshot remains black due the known headless WebGL capture artifact.
  - Direct Chrome/Phaser probe confirmed the board is visible before the boss, child texts `CERT DOCKET`, `PEND 0/3`, `CRYS 0/1`, `GATE NO`, `STD OK`, `TFRG 0/3`, and `NEED PENDANT RULE`, scene objective `Black Vault Lair: inspect DANN-E core.`, then board hidden after `startDanneBoss()` with objective `Black Vault Lair: defeat DANN-E with human-reviewed tools.`, and no page/console errors. Screenshot: `docs/screenshots/black-vault-publication-board-final.png`.
- First-hour Black Vault enter-cue pass (2026-07-01):
  - Tightened the Archive D3 boss-route payoff so the opened Black Vault threshold now tells the player exactly what to do next.
  - When the route predicate is false, the Black Vault door remains sealed with no enter cue. After the Golden Rule decision, the door redraws as open and adds a persistent SNES-style `A ENTER` cue with gold arrows under the threshold.
  - Updated the Golden Rule gate interaction to set `latestMessage` to `Black Vault route open by Golden Rule decision.` and the objective to `Black Vault route open: press A at the open door.`
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=black-vault-enter-cue-smoke`; its screenshot remains black due the known headless WebGL capture artifact, while the state dump confirms `ArchiveScene`.
  - Direct Chrome/Phaser probe in Archive D3 confirmed pre-decision `enterCueCount: 0` with `SEALED`, post-Golden Rule `enterCueCount: 1`, nested cue text `A ENTER`, two cue arrows, door status `OPEN`, objective `Black Vault route open: press A at the open door.`, visible threats cleared, and no page/console errors. Screenshot: `docs/screenshots/archive-black-vault-enter-cue-clean.png`.
- First-hour Black Vault door-state pass (2026-07-01):
  - Continued the first-hour action-adventure training translation by making the Archive D3 Black Vault door visibly change state when the boss route opens.
  - Replaced the static red `BLACK VAULT` door with a tracked sealed/open render: sealed state shows red lock bars and `SEALED`; open state redraws as a cyan/gold threshold with an `OPEN` status.
  - Centralized route-open logic with `blackVaultRouteOpen()` so the readiness board, door art, and route transition all agree on Treaty Fragments, Golden Rule decision, Buckram Key, or cleared boss state.
  - The door now refreshes immediately after `useGoldenRuleGate()`, matching the `VAULT CHECK` board flip from `SEALED` to `ROUTE OPEN`.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=black-vault-door-smoke`; its screenshot remains black due the known headless WebGL capture artifact, while the state dump confirms `ArchiveScene`.
  - Direct Chrome/Phaser probe in Archive D3 confirmed pre-decision door status `SEALED`, post-Golden Rule door status `OPEN`, route-open predicate `true`, DANN-E queue cleared, objective `Golden Rule decision recorded.`, and no page/console errors. Screenshots: `docs/screenshots/archive-black-vault-door-open-probe.png`, `docs/screenshots/archive-black-vault-door-open-clean.png`.
- First-hour Archive boss-readiness pass (2026-07-01):
  - Continued the SNES action-adventure training translation by making the Archive D3 boss gate communicate readiness before the Black Vault/DANN-E route.
  - Added a compact `VAULT CHECK` board with three live conditions: Treaty Fragments (`FRAG 0/3`), Golden Rule human decision (`RULE YES/NO`), and Buckram Key (`KEY YES/NO`).
  - The board starts as `SEALED` and refreshes immediately to `ROUTE OPEN` when the Golden Rule gate records a human decision, matching the actual `openBlackVaultRoute()` conditions.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=boss-readiness-board-smoke`; its screenshot remains black due the known headless WebGL capture artifact.
  - Direct Chrome/Phaser probe in Archive D3 confirmed sealed board texts `FRAG 0/3`, `RULE NO`, `KEY NO`, `SEALED`, then after `useGoldenRuleGate()` board texts `RULE YES` and `ROUTE OPEN`, visible threats cleared, objective `Golden Rule decision recorded.`, and no page/console errors. Screenshot: `docs/screenshots/archive-boss-readiness-board-clear-final.png`.
- First-hour Archive minimap literacy pass (2026-07-01):
  - Continued translating the first-hour action-adventure map lesson into FRUS grammar by making the Archive Cavern minimap identify high-value room roles, not just visited cells.
  - Added tiny SNES-style minimap glyphs for revealed secret rooms (`?` / `S`), reward room (`R`), and boss gate (`B`) while avoiding low-value clutter on ordinary puzzle rooms.
  - The minimap now honors the Archive dungeon map-revealed state when deciding whether hidden rooms should appear as `?`, keeping the visual map and room-traversal state aligned.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=minimap-markers-final-smoke`; its screenshot remains black due the known headless WebGL capture artifact.
  - Direct Chrome/Phaser probe in Archive A1 confirmed 12 minimap cells, marker text `?R?B`, reward marker present, boss marker present, two secret markers present, zero puzzle clutter markers, and no page/console errors. Screenshot: `docs/screenshots/archive-minimap-role-markers-clean-probe.png`.
- First-hour secret-reward treasure pass (2026-07-01):
  - Continued the one-hour action-adventure training translation by making Archive secret rooms pay off like readable treasure rooms rather than silent state changes.
  - Hidden Source Cache and Hidden Reliability Well rewards now show a short `FRUS FRAGMENT` / `RELIABILITY WELL` cue, trigger the existing SNES reward burst, and update the objective toward the return route.
  - Repeat interactions are now state-honest: the reward is not duplicated, `latestMessage` reports that the secret reward is already filed, and the objective points back to the marked Archive route.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=secret-reward-cue-smoke`; its state dump confirms `ArchiveScene`.
  - Direct Chrome/Phaser probe in Archive C3 confirmed `archive-secret-reward-cue: 1`, cue texts `FRUS FRAGMENT` / `C3 FILED`, reward burst count `1`, fragments `1`, objective `Hidden Source Cache filed; return to the Archive map marker.`, repeat message `C3 secret reward already filed.`, and no page/console errors. Screenshot: `docs/screenshots/archive-secret-reward-cue-probe.png`.
- First-hour secret-reveal feedback pass (2026-07-01):
  - Turned Archive secret discovery into a physical SNES-style room event instead of a silent state update: discovering C3/D2 now flashes the room and briefly displays a `SECRET ROUTE / <room> REVEALED` cue.
  - Made secret-route reveals repeat-safe. Interacting with an already revealed hidden route now reports that the route is already mapped instead of awarding document points again.
  - The reveal cue also updates the objective to follow the newly marked route, keeping the FRUS workflow map and the player-facing prompt in sync.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=secret-reveal-cue-final-smoke`; its state dump confirms `ArchiveScene`.
  - Direct Chrome/Phaser probe in Archive A3 confirmed `archive-secret-reveal-cue: 1`, cue texts `SECRET ROUTE` / `C3 REVEALED`, flash overlay present, objective `Secret route C3 revealed; follow the map marker.`, C3 added to `revealedRoomIds`, repeat reveal reports `C3 secret route already mapped.`, and no page/console errors. Screenshot: `docs/screenshots/archive-secret-reveal-cue-clean.png`.
- First-hour secret-route readability pass (2026-07-01):
  - Added subtle SNES-style secret-exit markers to Archive gates that lead to secret rooms, preserving the existing FRUS reveal mechanics while making hidden routes read more like an action-adventure dungeon.
  - Unrevealed secret exits now show a small `?` / seam marker; after the player triggers the proper evidence/tool reveal, the same gate redraws as a gold `SECRET` route plaque and the locked exit clears.
  - Kept the markers inside the playable field for south-facing exits so they do not disappear under the dialogue chrome.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=secret-marker-final-smoke`; its state dump confirms `ArchiveScene`.
  - Direct Chrome/Phaser probe in Archive B3 confirmed the south secret exit displays `?` while locked, then after revealing C3 displays `SECRET`, clears `lockedExits`, adds `C3` to `revealedRoomIds`, and reports no page/console errors. Screenshot: `docs/screenshots/archive-secret-route-marker-readable-probe.png`.
- First-hour process cue readability pass (2026-07-01):
  - Tightened the ALttP-style process-ready cue placement so solved bureaucratic walls keep their `READY` / action marker inside the playable field instead of drifting under the bottom dialogue box.
  - Added a shared `readyWallCuePosition()` helper that clamps cue x/y positions within the Archive play bounds and lifts bottom-room prompts above the dialogue chrome.
  - Applied the same placement discipline to the special NO REPO Citation Stamp target cue and the generic process-ready wall cues.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=ready-wall-cue-clamp-smoke`; its screenshot remains black due the known headless WebGL artifact, while its state dump confirms `ArchiveScene`.
  - Direct Chrome/Phaser probe in Archive A2 set FIREWALL to `routing ready` and confirmed cue texts `READY` / `ROUTE`, cue position `x=127 y=148`, reliability stayed `80 -> 80`, and no page/console errors. Screenshot: `docs/screenshots/archive-ready-wall-cue-clamped-probe.png`.
- First-hour process-ready reticle pass (2026-07-01):
  - Continued the one-hour action-adventure training pass by making solved bureaucratic walls read like ALttP-style gates: a threat becomes a visible, safe process action once the proper FRUS step is complete.
  - Added a generic `READY` reticle/action badge for process-ready walls beyond NO REPO: FIREWALL (`ROUTE`), PENDING (`MANIFEST`), WAIT (`TIMER`), AMBIGUOUS (`DECIDE`), and DANN-E QUEUE (`RULE`).
  - Preserved the existing special NO REPO `STAMP` target cue while giving the other walls their own process-action marker.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Direct Chrome/Phaser probe in Archive A2 set FIREWALL to `routing ready` and confirmed one `archive-ready-wall-cue`, cue texts `READY` / `ROUTE`, reliability stayed `80 -> 80`, and no page/console errors. Screenshot: `docs/screenshots/archive-ready-wall-cue-safe-probe.png`.
- First-hour process-ready hazard fairness pass (2026-07-01):
  - Fixed an unfair first-hour Archive edge case: once a bureaucratic wall is ready for its human workflow resolution, contact with it no longer damages reliability as a missed 30-year deadline.
  - `updateBureaucraticWalls()` now treats process-ready walls as interactable gates: NO REPO after Citation Stamp, FIREWALL after routing, PENDING after manifest, WAIT after timer, AMBIGUOUS after specialist decision, and DANN-E QUEUE after Golden Rule decision.
  - Contact with a process-ready wall now cues the proper action (`citation stamp`, `network routing`, `referral manifest`, etc.) and asks the player to press A, preserving hazard pressure before the workflow is complete.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=process-ready-wall-smoke`; the generated screenshot remains black due the known WebGL capture artifact.
  - Direct Chrome/Phaser probe completed the Source Note route/verify/stamp chain, placed the player in the stamp-ready NO REPO wall's contact radius, and confirmed reliability stayed at `90`, latest message `NO REPO is ready for citation stamp.`, objective `Press A near the process wall to apply the verified human workflow step.`, visible `archive-no-repo-stamp-target-cue: 1`, NARA stairs `OPEN: 1`, and no page/console errors. Screenshot: `docs/screenshots/archive-process-ready-wall-safe-probe.png`.
- First-hour training cue lock-honesty pass (2026-07-01):
  - Fixed a gameplay-readability bug in the first-hour training HUD: it no longer tells the player to spend a chapter key on exits that actually require a FRUS process tool such as the Citation Stamp.
  - `getAdventureTrainingCue()` now distinguishes true local small-key locks from process-tool gates; process-tool gates keep the `NEED TOOL` cue even when the player holds small keys.
  - `setRoomTraversalState()` now normalizes locked exits against the current process-tool inventory before storing the readout, so `window.render_game_to_text().roomTraversal.lockedExits` does not claim an opened process gate is still locked.
  - Tightened the Archive Source Note gate so provenance verification alone does not open the NARA II route; the actual Citation Stamp/tool acquisition is required.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` (4 files / 29 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=training-cue-lock-final-smoke`; the generated screenshot remains black due the known WebGL capture artifact, while the state dump confirms `ArchiveScene` and the pre-stamp Citation Stamp locks.
  - Direct Chrome/Phaser probe completed the Source Note route/verify/stamp chain in a fresh Vite runtime and confirmed pre-stamp `lockedExits` includes the Citation Stamp gates, post-stamp `lockedExits: {}`, visible NARA stairs `OPEN` label count `1`, lock label count `0`, no page errors, and no console errors. Screenshot: `docs/screenshots/archive-training-cue-lock-fresh-probe.png`.
- First-hour Archive chapter-key payoff pass (2026-07-01):
  - Continued translating the first-hour action-adventure reference into FRUS workflow grammar: after Source Note 47 is verified, stamped, and used to clear the NO REPO wall, the room now gives a brief Zelda-like chapter-key reward cue instead of silently updating hidden state.
  - Added a transient `CHAPTER KEY` card in Archive A1 that reads the live `archive_cavern` dungeon key state, shows the key count, and points the player toward the newly opened NARA II route.
  - The NO REPO clear now also updates the objective to the next route/action, so the player gets immediate "tool earned -> obstacle cleared -> route open" feedback.
  - Verified focused tests: `npm test -- src/systems/dungeonKeys.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` (4 files / 28 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning) and `git diff --check`.
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=chapter-key-reward-smoke`; the generated screenshot remains black due the known WebGL capture artifact, but the state dump confirms `ArchiveScene`.
  - Direct Chrome/Phaser probe completed the Source Note 47 route/verify/stamp chain, cleared NO REPO, and confirmed `archive-chapter-key-reward-cue: 1`, `archive-nara-stairs-open-label: 1`, `visibleThreats: []`, and objective `Archive Cavern: use the Citation Stamp route to enter NARA II or clear the next source lock.` Screenshot: `docs/screenshots/archive-chapter-key-reward-probe.png`.
- Office Hub route-cue readability pass (2026-07-01):
  - Added small SNES-style glints to the Garden/Senate doors and Archive threshold so the first playable room's exits read as intentional adventure-game routes rather than flat labels.
  - Added a low `GDN / ARC / HAC` route-chip strip that stays hidden while the first `FIELD GUIDE` tutorial card is visible, then reveals after the first movement/action logs controls.
  - Preserved all existing Office Hub interaction mechanics, tutorial dismissal behavior, nearest-interactable logic, save state, and scene routing.
  - Verified focused tests: `npm test -- src/systems/overlayInput.test.ts src/input/InputState.test.ts` (2 files / 20 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=office-route-compass-client-final`.
  - Direct Chrome/Phaser probe confirmed `OfficeScene` active; route chips hidden before first movement (`routeVisible: 0/18`), revealed after ArrowRight (`routeVisible: 18/18`, labels `GDN`, `ARC`, `HAC`), 6 route/threshold glints present, no page errors, no console errors, no failed requests, and no 4xx/5xx responses. Screenshot: `docs/screenshots/office-route-compass-final-probe.png`.
- Sharp 16-bit title-card integration (2026-07-01):
  - Converted the repository-local `title_screen_16bit_sharp.png` source into a native 256x240 pixel-art card at `public/assets/art-pack/screens/title_screen_16bit_sharp_256x240.png`, using nearest-neighbor sampling so the live title scene does not downscale a high-resolution image at runtime.
  - Added the new card to the typed `SCREENS` registry and updated `TitleScene` to prefer it at exact `GAME_WIDTH x GAME_HEIGHT`, while keeping the older 256x224 book-box card and procedural title composition as fallbacks.
  - Added a small ruby/gold backplate behind the live `B SKIP WARNING [ ]` toggle so it no longer visually fights the baked label in the sharp title art.
  - Updated `TitleScene.test.ts` to assert the sharp title card is exactly 256x240 and that the legacy 256x224 card remains available as fallback.
  - Verified focused tests: `npm test -- src/scenes/TitleScene.test.ts src/input/InputState.test.ts` (2 files / 24 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=TitleScene&v=sharp-final`.
  - Direct Chrome/Phaser probe confirmed active `TitleScene`, visible `title-art-sharp-card` using texture `title_screen_16bit_sharp_256x240`, visible `title-skip-warning-backplate`, no page errors, no console errors, no failed requests, and no 4xx/5xx responses. Screenshot: `docs/screenshots/title-sharp-card-fixed-probe.png`.
- Office first-playable-screen tutorial plaque polish (2026-07-01):
  - Replaced the large central `FIELD CONTROLS` modal with a compact SNES-style `FIELD GUIDE` plaque tucked under the top HUD, so the Office Hub reads as a playable room immediately instead of being visually blocked by instructions.
  - The plaque now uses short verb cues (`MOVE  ACT  CODEX  MENU`) and keeps the dismiss prompt while preserving the existing non-blocking first-movement behavior.
  - Verified focused tests: `npm test -- src/systems/overlayInput.test.ts src/input/InputState.test.ts` (2 files / 20 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby`.
  - Direct Chrome/Phaser probe confirmed active `OfficeScene`, compact tutorial objects (`office-tutorial-panel`, `office-tutorial-title`, `office-tutorial-body`, `office-tutorial-prompt`), no page errors, no console errors, no failed requests, and no 4xx/5xx responses. Screenshot: `docs/screenshots/office-tutorial-compact-probe.png`.
  - Direct first-move probe confirmed `ArrowRight` both dismisses the plaque and moves the player from `x=128` to `x=135`, with `latestMessage: Controls logged.`
- Character creation SNES role-select layout polish (2026-07-01):
  - Cleaned up the first role-selection screen so it reads more like a deliberate 16-bit character-select panel: remit line, workflow relic row, role cards, and confirm prompts now occupy distinct lanes.
  - Shortened long role-card labels (`DECLASS / COORD`, `SOURCE / NOTE`, `PROOF`) while preserving the full equal-rank role names in the selected-role title and game state.
  - Tightened the remit text to one readable pixel-font line so it no longer collides with the workflow relic strip.
  - Verified focused tests: `npm test -- src/scenes/CharacterCreateScene.test.ts src/input/InputState.test.ts` (2 files / 17 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=CharacterCreateScene&role=proofreader&name=Ruby`.
  - Direct Chrome/Phaser probe confirmed active `CharacterCreateScene`, visible 32x48 role sprites, 5 role-card labels, 5 workflow relic labels, no page errors, no console errors, no failed requests, and no 4xx/5xx responses. Screenshot: `docs/screenshots/character-create-layout-polish-probe.png`.
  - Direct Enter-key probe confirmed the selected profile still transitions to `OfficeScene`, `explore` mode, with objective `Office Hub: talk to the Junior Compiler or enter the Archive Guide.`
- World Map route-preview command-strip polish (2026-07-01):
  - Moved the selected-district route preview out of the map art and into the bottom command band so the SNES atlas reads like an intentional route/map screen instead of a floating opaque card over the parchment map.
  - Kept the map-layer district seals, route threads, and destination glyphs intact while lifting only the live route preview above the bottom chrome.
  - Moved the `A SELECT  < > REGION` legend away from the preview strip and hid the redundant hover tooltip; the preview now carries district number/name, destination map, FRUS verb, and destination glyph.
  - Verified focused tests: `npm test -- src/data/regions.test.ts src/input/InputState.test.ts` (2 files / 18 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=WorldMapScene&region=europe&role=compiler&name=Ruby`.
  - Direct Chrome/Phaser probe confirmed 8 district seals, 9 destination frames (8 map seals plus the preview glyph), 7 route threads, a visible route-preview container at UI depth 904, preview text `1. WEST BERLIN / WEST WING / REVIEW`, and no page errors, console errors, failed requests, or 4xx/5xx responses. Screenshot: `docs/screenshots/world-map-route-preview-polish-probe.png`.
  - Direct click probe converted 256x240 game coordinates to the zoomed canvas and confirmed a district cartouche still transitions to `GameplayMapScene` with a valid destination objective, so the UI strip does not block world-map routing.
- First-hour gameplay training refresh (2026-07-01):
  - Re-verified the linked YouTube reference through oEmbed metadata as `Legend of Zelda A LINK TO THE PAST Full Game Walkthrough - No Commentary (A Link to the Past Full)` and continued to treat it as gameplay-grammar training only: no copied art, maps, music, text, names, enemies, room layouts, or puzzle sequences.
  - Confirmed the existing one-hour training profile remains wired through `src/game/firstHourTraining.ts`, `src/game/adventureTraining.ts`, `getAdventureTrainingReadout()`, `UIScene`, and `window.render_game_to_text().adventureTraining`.
  - Fixed the live HUD training cue so it no longer renders a doubled `NEXT NEXT ...` verb; the quest band now displays the training cue text directly and names the cue text object for future browser probes.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts` (2 files / 22 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby`; a direct Chrome/Phaser probe confirmed `render_game_to_text()` reports `OfficeScene`, `explore` mode, and the active one-hour training cue (`Deadline Pressure` / `Hazards`), while the visible HUD now reads `NEXT OFFICE HUB LOADED.` exactly once. Screenshot: `docs/screenshots/first-hour-training-hud-cue-fix.png`.
- First-hour Citation Stamp gate payoff pass (2026-07-01):
  - Continued the same one-hour action-adventure training translation by tightening the "new tool immediately changes a nearby gate" lesson in Archive A1.
  - NARA II stairs gate art is now tracked separately, so stale `SOURCE LOCK` sprites are destroyed and the cyan `OPEN` marker redraws as soon as Source Note 47 is verified and stamped.
  - The route cue still guides ROUTE -> VERIFY -> STAMP at the research table, then clears after the Citation Stamp reward so the screen reads as a changed room rather than a lingering tutorial overlay.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` (3 files / 25 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=first-hour-training-stamp-gate-smoke`; the generated headless screenshot remains black due the known WebGL capture artifact.
  - Direct Chrome/Phaser probe completed the full Source Note 47 loop with correct A/A/A provenance choices, applied the Citation Stamp, and confirmed `sourceNoteStatus: stamped`, `openLabel: 1`, `lockLabel: 0`, `latestMessage: VERIFIED BY HUMAN REVIEW`, and no page/console/request errors. Screenshots: `docs/screenshots/archive-citation-stamp-opens-nara-gate-probe.png`, `docs/screenshots/archive-citation-stamp-opens-nara-gate-clean-visible.png`.
- First-hour Citation Stamp wall-target pass (2026-07-01):
  - Continued the "new tool immediately solves a nearby obstacle" lesson after the NARA II gate payoff.
  - After Source Note 47 is stamped, the NO REPO bureaucratic stonewall now gets a visible gold `STAMP` target reticle that follows the moving wall and sits above the room-intro dressing.
  - The target cue is removed as soon as the wall clears, keeping the room state honest: target visible only while the newly earned Citation Stamp can act.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` (3 files / 25 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=no-repo-stamp-cue-smoke`; the generated headless screenshot remains black due the known WebGL capture artifact.
  - Direct Chrome/Phaser probes confirmed `cue: 1`, `noRepoStatus: citation stamp ready`, and `sourceNoteStatus: stamped` before wall clearing, then `cue: 0`, `noRepoThreats: 0`, and `latestMessage: NO REPO cleared with citation stamp after source-table verification.` after clearing. Screenshots: `docs/screenshots/archive-no-repo-stamp-cue-visible.png`, `docs/screenshots/archive-no-repo-stamp-cue-cleared-probe.png`.
- World Map SNES route-overlay pass (2026-07-01):
  - Converted the region-select map from invisible hit-zone behavior toward a readable SNES adventure atlas without changing the existing five-region art pack or district routing data.
  - `WorldMapScene` now derives visible brass district seals, numbered cartouches, stitched route threads, destination glyphs, and a compact route legend from the existing `DISTRICTS` bounds and `destinationScene` values.
  - Destination glyphs distinguish archives, embassies, federal review rooms, Black Vault routes, FRUS floor/office routes, and field-office routes; locked districts are ready to render redaction bars.
  - Verified focused tests: `npm test -- src/data/regions.test.ts src/input/InputState.test.ts` (2 files / 18 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=WorldMapScene&region=europe&role=compiler&name=Ruby`; `render_game_to_text()` reports active `WorldMapScene`, objective `Select a FRUS region.`, and all eight Europe district routes.
  - Direct Chrome/Phaser probe confirmed 8 `snes-world-district-seal` objects, 8 destination frames, 7 route-thread graphics, and the route legend with no page errors, failed requests, or 4xx/5xx responses. Screenshot: `docs/screenshots/world-map-route-overlay-probe.png`.
  - Direct click probe against the actual first district hit rectangle still routed to `GameplayMapScene` / White House West Wing, proving the new overlay does not block district selection.
- Cherry Blossom Garden SNES safe-zone readability pass (2026-07-01):
  - Converted the DANN-E expansion safe/save/reward route into an original 16-bit one-screen garden while preserving the existing save point, Historian, Ruby Pen Chest, Office Back Door return, koi pond, pavilion, objective text, collision geometry, and interaction state.
  - Added `addSnesCherryBlossomGardenTileRoom()` to the shared SNES pixel-art helpers: grass and blossom-petal tile variants, cream-paper path network, ruby/gold perimeter tiles, koi pond with fish/ripples, cherry pavilion, blossom trees, save point, historian mat, Ruby Pen chest, and return stair.
  - Wired `CherryBlossomGardenScene` through `DanneMapScene.drawSnesTileRoomLayer()` so it renders the new tile-room layer under the existing player, markers, HUD, and scene logic.
  - Tightened the DANN-E map location-card title sizing/short label so long map names no longer clip at the top of the screen.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` (3 files / 25 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=CherryBlossomGardenScene&role=compiler&name=Ruby`; `render_game_to_text()` reports active `CherryBlossomGardenScene`, objective `Cherry Blossom Garden: rest and save the expedition.`, nearest interactable `Save Point`, and visible entities `Save Point`, `Historian`, `Ruby Pen Chest`, `Office Back Door`, `Koi Pond`, and `Cherry Pavilion`.
  - Direct Chrome/Phaser probe confirmed 454 `snes-cherry-garden-*` objects in the scene, including the tile-room container, koi pond, pavilion, save point, Ruby Pen chest, and return threshold. Network probes reported no failed requests or 4xx/5xx responses. Screenshot: `docs/screenshots/cherry-garden-tile-room-probe.png`.
- Senate Hearing Chamber SNES readability pass (2026-07-01):
  - Converted the HAC / hearing workflow room into an original 16-bit one-screen chamber while preserving the existing witness-table interaction, return route, collision geometry, and FRUS oversight objective.
  - Added `addSnesSenateHearingChamberTileRoom()` to the shared SNES pixel-art helpers: ruby carpet tiles, wood/brass wall tiles, committee dais, seven dossier seats, counsel/review tables, gallery benches, witness table with mic panel and docket, HAC review plaque, and return stair.
  - Wired `SenateHearingChamberScene` to draw that layer beneath the existing player/interactable UI, making the witness table and committee dais readable without relying on poster-style art.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` (3 files / 25 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=SenateHearingChamberScene&role=compiler&name=Ruby`; `render_game_to_text()` reports active `SenateHearingChamberScene`, objective `Senate Hearing Chamber: review the witness table record.`, and visible entities `Witness Table`, `Committee Dais`, and `Office Corridor`.
  - Direct Chrome/Phaser probe confirmed 445 `snes-senate-*` objects in the scene, including the tile-room container, committee dais, witness table, counsel tables, gallery benches, and return threshold. Network probes reported no failed requests or 4xx/5xx responses. Screenshot: `docs/screenshots/senate-hearing-tile-room-probe.png`.
- Black Vault SNES boss-room readability pass (2026-07-01):
  - Converted the final DANN-E space from illustration-first presentation into a readable SNES boss chamber while preserving the existing DANN-E fight, Censorship Wraiths, Treaty Fragment III, return gate, collision geometry, and boss trigger logic.
  - Added `addSnesBlackVaultTileRoom()` to the shared SNES pixel-art helpers: original dark/ruby floor tiles, blast doors, redaction fissures, DANN-E altar/socket, four FRUS review stations, rubble, Treaty Fragment III pedestal, and return stair.
  - Wired `BlackVaultLairScene` to draw that boss-room layer underneath the existing `addSnesDanneArena()` deadline-pressure arena, so the final boss mechanics now sit in a legible one-screen chamber.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` (3 files / 25 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=BlackVaultLairScene&role=compiler&name=Ruby`; `render_game_to_text()` reports active `BlackVaultLairScene`, objective `Black Vault Lair: inspect DANN-E core.`, two visible Censorship Wraith threats, and nearest interactable `Return to Archive`.
  - Direct Chrome/Phaser probe confirmed 455 `snes-black-vault-*` objects plus 43 `snes-danne-arena*` objects, including the tile-room container, altar, fissures, review stations, Treaty Fragment III frame, and DANN-E arena. Network probes reported no failed requests or 4xx/5xx responses. Screenshot: `docs/screenshots/black-vault-tile-room-probe.png`.
- Embassy Cable Room SNES readability pass (2026-07-01):
  - Applied the same first-hour action-adventure room-readability rule to the Embassy Cable Room route.
  - Added `addSnesEmbassyCableRoomTileRoom()` to the shared SNES pixel-art helpers: original 16x16 floor/wall tiles, OpenNet/ClassNet teletype banks, a bronze cipher-machine workstation, cable route lines, cable crates, a red secure door, Marine guard post, and return stair.
  - Wired `EmbassyCableRoomScene` to draw that layer while preserving the existing Marine Security Guard, bronze cipher machine interaction, steel-door blocking logic, collision geometry, and FRUS objective state.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` (3 files / 25 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=EmbassyCableRoomScene&role=declass_reviewer&name=Alex`; `render_game_to_text()` reports active `EmbassyCableRoomScene`, objective `Embassy Cable Room: inspect the bronze cipher machine.`, and visible entities including `Marine Security Guard (blocking)`.
  - Direct Chrome/Phaser probe confirmed 438 `snes-embassy-*` objects in the scene, including the tile-room container, cipher machine, guard post, secure door, and teletype banks. A follow-up network probe reported no failed requests or 4xx/5xx responses. Screenshot: `docs/screenshots/embassy-cable-room-tile-probe.png`.
- NARA Stacks SNES room-readability pass (2026-07-01):
  - Continued the first-hour action-adventure training work by applying its "room readable from the doorway" rule to the DANN-E expansion NARA Stacks route.
  - Added `addSnesNaraStacksTileRoom()` to the shared SNES pixel-art helpers: original 16x16 floor/wall tiles, archive shelf blocks, row plaques, patrol rails, source-note station, treaty fragment pedestal, sealed cartons, and return stair.
  - Wired `NaraStacksScene` to draw that tile-room layer over the map backdrop while preserving the existing collision polygons, drones, interactables, return route, save state, and FRUS objective text.
  - Verified focused tests: `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` (3 files / 25 tests pass).
  - Verified `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client completed against `?scene=NaraStacksScene&role=compiler&name=Ruby`; `render_game_to_text()` reports active `NaraStacksScene`, objective `NARA Stacks: read the classified stack note.`, visible drone patrols, and nearest interactable `Return to Archive`.
  - Direct Chrome/Phaser probe after a clean dev-server restart confirmed 503 `snes-nara-*` objects in the scene, including the tile-room container, shelf blocks, drone patrol rails, treaty-fragment frame, and no console/page errors. Screenshot: `docs/screenshots/nara-stacks-tile-room-probe.png`.
- ALttP reference gameplay translation pass (2026-06-30):
  - Used the supplied six-hour `A Link to the Past` walkthrough only as a mechanics reference, not as copied art/layout/audio/text.
  - Replaced the visible default player action rectangle with a short role-colored FRUS tool swipe/stamp effect so the Citation Stamp, Red Pencil, Proof Lens, and Ruby Pen action window reads like an SNES action-adventure tool use.
  - Kept the real directional collision hitbox and `render_game_to_text().playerCombat.hitbox` intact for enemies, bosses, and QA, while hiding the raw box unless `?debug=hitbox` is set.
  - Verified focused runtime probe in `BlackVaultLairScene`: active attack state, live hitbox readout, trail/edge/stamp visible, raw hitbox hidden by default, and no browser console errors.
  - Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).
- Gameplay error cleanup pass (2026-06-17):
  - Connected the static GameplayMap Black Vault obelisk core to the live `BlackVaultLairScene` DANN-E encounter, and made normal/debug boss-clear paths open the west/north blast-door flags.
  - Reduced the world-exit spawn nudge so `frus_floor` no longer starts by pushing the player into a phase trigger dialog.
  - Converted Coffee Station and 23rd Street Sign from flavor-only false affordances into repeat-safe stateful interactions with objective/latest-message updates and small one-time document-point rewards.
  - Seeded CharacterCreateScene from `?role=` / `?name=` (or restored profile state) while preserving the normal blank-name-to-Sam behavior.
  - Made touch controls less visually invasive at 1x portrait integer zoom, shortened the Black Vault objective, widened DanneGallery cards, and replaced the oversized RenderDebug 4x character sample with single-texel proof chips.
  - Verified full `npm test` (67 files / 323 tests), `npm run build`, `git diff --check`, focused CharacterCreate deep-link/confirm flow, Black Vault boss routing, Coffee Station and 23rd Street interactions, `frus_floor` no-immediate-dialog spawn, RenderDebug single-texel proof output, and in-app Browser local route boot with no console errors.
- Embassy foreign-government permission queue (2026-06-16):
  - Added `src/game/embassyPermissionQueue.ts`, a Phaser-free rule module for the Embassy consular queue, sourced to the official FRUS stages page note that permission may be sought when selected documents include foreign-government information.
  - Replaced the static Consular Queue "later workflow" text with a cable-gated permission route: the queue stays locked until the Chancery Door has copied the embassy cable, then files `sceneProgress.foreignGovernmentPermissionComplete`, advances the permission step to completion, awards `Foreign Permission Note` and `Visible Withholding Note`, and grants 5 document points once.
  - Updated `public/assets/tiled/embassy.tmj` so the Consular Queue uses the new `consular-permission-queue` action rather than fallback text.
  - Added deterministic tests in `src/game/embassyPermissionQueue.test.ts` for locked routing, first permission filing, and repeat-safe inventory recovery.
  - Verified focused `npm test -- src/game/embassyPermissionQueue.test.ts`, full `npm test` (65 files / 317 tests pass), and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client ran against `?scene=GameplayMapScene&map=embassy&role=compiler&name=Ruby`; direct runtime probes confirmed locked queue, chancery cable collection, permission-note filing, repeat-safe points, and no browser errors. Screenshot: `output/web-game/embassy-permission-smoke.png`.
- Capitol Hill HAC witness-table and closed-session loop (2026-06-16):
  - Added `src/game/capitolHacPacket.ts`, a Phaser-free rule module for the Capitol Hill hearing room, sourced to the official HAC description of monitoring FRUS compilation/editing/preparation/declassification, reviewing procedures and guidelines, sampling records still classified after 30 years, and reporting annual findings.
  - Replaced the static Witness Table dialog with a stateful HAC process docket: it files `sceneProgress.senateHacReviewComplete`, advances `senateHacReviewStep` to the full HAC prompt count, awards `HAC Process Docket`, `HAC Annual Findings`, Treaty Fragment II, and 6 document points once.
  - Replaced the static Closed-Session Vault placeholder with a gated follow-up: it stays locked until the HAC docket is filed, then awards a `30-Year Classified Sample`, files `sceneProgress.closedSessionAccess`, and grants 4 document points once.
  - Added deterministic tests in `src/game/capitolHacPacket.test.ts` for first docket filing, repeat recovery, locked sample vault, first sample filing, and repeat-safe sample filing.
  - Verified focused `npm test -- src/game/capitolHacPacket.test.ts`, full `npm test` (64 files / 314 tests pass), and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client ran against `?scene=GameplayMapScene&map=capitol_hill&role=compiler&name=Ruby`; direct runtime probes confirmed locked vault, witness-table docket, Treaty Fragment II, closed-session sample, repeat-safe points, and no browser errors. Screenshot: `output/web-game/capitol-hac-smoke.png`.
- West Wing Situation Room source-coverage gate (2026-06-16):
  - Added `src/game/westWingNsc.ts`, a Phaser-free rule module for the Secret Service / Situation Room gate, sourced to the official About FRUS source-base language naming White House, National Security Council, State, Defense, CIA, other agency, private, and published records.
  - Replaced the static NSC clearance placeholder with a real source-coverage check: the gate opens after the NARA Source Index or repository coverage map proves White House/NSC records are being compared against the wider FRUS source base.
  - The interaction now files `sceneProgress.nsc_clearance`, awards an `NSC Source Briefing`, grants 5 document points once, and remains repeat-safe for older saves missing the briefing item.
  - Added deterministic tests in `src/game/westWingNsc.test.ts` for locked entry, NARA Source Index entry, repository map entry, and repeat-safe inventory recovery.
  - Verified focused `npm test -- src/game/westWingNsc.test.ts`, full `npm test` (63 files / 309 tests pass), and `npm run build` (passes on rerun with the existing Vite chunk-size warning after one transient public-asset copy timeout).
  - Required web-game client ran against `?scene=GameplayMapScene&map=west_wing&role=compiler&name=Ruby`; direct runtime probes confirmed locked and NARA Source Index-opened Situation Room states with no browser errors. Screenshot: `output/web-game/nsc-source-gate-smoke.png`.
- NARA Red Zone declassification gate (2026-06-16):
  - Added `src/game/redZoneGate.ts`, a Phaser-free rule module for the NARA II Red Zone vault door, sourced to the E.O. 13526 FRUS preface language about release, concurrence, and accounting for withheld/excised material.
  - Replaced the static Red Zone placeholder with a real Clearance Token / E.O. review gate: locked interactions show the needed-token prompt; valid declassification authority opens the gate, files `sceneProgress.redZoneDeclassification`, and grants 4 document points once.
  - Added deterministic tests in `src/game/redZoneGate.test.ts` for locked entry, token entry, completed-review entry, and repeat-safe entry.
  - Verified focused `npm test -- src/game/redZoneGate.test.ts`, full `npm test` (62 files / 305 tests pass), and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client ran against `?scene=GameplayMapScene&map=nara_stacks&role=declass_reviewer&name=Alex`; direct runtime probes confirmed locked and Clearance Token-opened Red Zone states with no browser errors. Screenshot: `output/web-game/red-zone-gate-smoke.png`.
- NARA catalog desk gameplay (2026-06-16):
  - Added `src/game/naraCatalog.ts`, a Phaser-free rules module for the NARA II catalog desk and Archivist interaction, sourced to the official history.state.gov FRUS stages page and FRUS history chapter on microform supplements.
  - The NARA Archivist now files a `NARA Source Index`, awards `Microform Supplement Reels`, advances the collection notes to the context-record step, and grants 5 document points once instead of showing a static placeholder.
  - Wired `GameplayMapScene` so the `nara-archivist` Tiled interaction updates `sceneProgress.naraCatalogFiled`, preserves repeat-safety, and keeps later selection/review gates intact.
  - Added deterministic unit coverage in `src/game/naraCatalog.test.ts` for first filing, repeat filing, and older-save inventory recovery.
  - Verified focused `npm test -- src/game/naraCatalog.test.ts`, full `npm test` (61 files / 301 tests pass), and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client ran against `?scene=GameplayMapScene&map=nara_stacks&role=compiler&name=Ruby`; direct runtime probe at the catalog desk reported `sceneProgress.naraCatalogFiled: 1`, `recordCollectionStep: 2`, `documentPoints: 5`, `NARA Source Index`, `Microform Supplement Reels`, repeat-safe points, and no browser errors. Screenshot: `output/web-game/nara-catalog-smoke.png`.
- FRUS public-record bookshelf gameplay (2026-06-16):
  - Added `src/game/frusBookshelf.ts`, a Phaser-free rules module for the Historian Office FRUS bookshelf, sourced to the official history.state.gov About FRUS page.
  - The shelf now awards a one-time `Reference Shelf Fragment`, 4 document points, and dialog explaining the official public record, 20-year access, 30-year publication, and broad source base instead of showing a Phase 7 placeholder.
  - Wired `GameplayMapScene` so the `frus-bookshelf` Tiled interaction updates `sceneProgress.frusBookshelfBrowsed`, refreshes objective/latest-message state, and remains repeat-safe.
  - Added deterministic unit coverage in `src/game/frusBookshelf.test.ts` for first browse, repeat browse, and older-save fragment recovery.
  - Verified focused `npm test -- src/game/frusBookshelf.test.ts`, full `npm test` (60 files / 298 tests pass), and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client ran against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby`; direct runtime probe at the shelf reported `sceneProgress.frusBookshelfBrowsed: 1`, `documentPoints: 4`, one `Reference Shelf Fragment`, repeat-safe points, and no browser errors. Screenshot: `output/web-game/frus-bookshelf-smoke.png`.
- Volume concept coverage breadth prompt (2026-06-16):
  - Expanded `src/game/volumeConcept.ts` with an About-FRUS-backed coverage-breadth prompt so the player must plan for bilateral/regional relations, global issues, and topical policy lanes instead of reducing a volume to one easy file path.
  - Wrong coverage shortcuts now debit standards reliability as omitted material facts or concealed policy defects.
  - Replaced the downstream debug-seed hardcode with `VOLUME_CONCEPT_PROMPTS.length`, keeping `?scene=` deep links coherent as the volume-planning gate grows.
  - Verified focused tests: `npm test -- src/game/volumeConcept.test.ts src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts` (3 files / 34 tests pass).
  - Verified full `npm test` (58 files / 290 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game smoke at `?scene=OfficeScene&role=compiler&name=Ruby` still yields the known black headless WebGL screenshot. Direct runtime state confirms `OfficeScene`, Production Board total `39`, next step `series_concept`, and no console errors.
- Policy coverage audit gate (2026-06-16):
  - Added `src/game/policyCoverageAudit.ts`, a Phaser-free rules module based on the official About FRUS mandate that the series be thorough, accurate, and reliable while omitting no major facts and concealing no policy defects.
  - Inserted `policy_coverage_audit` (`AUD`) into the Production Board after `research_selection` and before `source_notes`, making the Office Scope / Selection Desk certify major decisions, material facts, and policy-defect evidence before the Archive Guide opens source-note verification.
  - Wired the Office desk so Selection Docket completion now hands off to the coverage audit; wrong shortcuts debit standards reliability as omitted material facts, concealed policy defects, or altered text.
  - Preserved later-scene deep-link coherence by seeding `policyCoverageAuditComplete` for Guide/Archive and downstream scenes.
  - Verified focused tests: `npm test -- src/game/policyCoverageAudit.test.ts src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts` (3 files / 32 tests pass).
- Two-pass manuscript review board gates (2026-06-16):
  - Split the Production Board's single manuscript-review bead into three source-backed gates that match the existing FRUS Cart prompt loop: `manuscript_review` (review scope), `front_line_recommendations` (first-pass amendment recommendations), and `general_editor_assessment` (General Editor / series assessment).
  - Preserved old-save compatibility: `sceneProgress.manuscriptReviewComplete` still completes all three gates, while live play now exposes partial progress from `sceneProgress.manuscriptReviewStep`.
  - Updated the clearance phase readout so the Zelda-like board now shows the manuscript review sequence as `REV -> AMN -> GEN -> LANE` before declassification can open.
  - Verified focused tests: `npm test -- src/game/manuscriptReview.test.ts src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts` (3 files / 32 tests pass).
  - Verified full `npm test` (57 files / 286 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning; an initial parallel build hit a transient public-asset copy ENOENT, and a serial rerun passed).
  - Required web-game client smoke at `?scene=OfficeScene&role=compiler&name=Ruby` still yields the known black headless WebGL screenshot. Direct runtime state confirms `OfficeScene` active, Production Board total `38`, and review sequence `annotation -> manuscript_review -> front_line_recommendations -> general_editor_assessment -> clearance_procedure` with no console errors.
- Character-create input smoothing (2026-06-16):
  - Tightened the shared `InputState` navigation edges so buffered ultra-short Arrow/WASD taps now produce the same one-frame `nav*JustPressed` edges as held keyboard, touch D-pad, and gamepad input.
  - Updated the character-create begin prompt to the explicit "TAP AGAIN / PRESS ENTER TO BEGIN" wording while preserving the existing selected-card tap-to-confirm flow and name-field focus model.
  - Added deterministic input tests for buffered navigation taps and touch D-pad navigation edges.
  - Verified focused tests: `npm test -- src/input/InputState.test.ts src/scenes/CharacterCreateScene.test.ts` (2 files / 17 tests pass).
  - Verified full `npm test` (57 files / 285 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client smoke against `?scene=CharacterCreateScene&role=compiler&name=Ruby` still produces a black headless WebGL screenshot as previously documented. Direct runtime probes confirm Enter, Space, and tapping the already-selected role card all transition to `OfficeScene` with no console errors.
- Clearance lane / E.O. 13526 board split (2026-06-16):
  - Promoted the already-playable `clearanceProcedure` and `eo13526Review` NetworkScene loops into first-class Production Board gates: `clearance_procedure` (`LANE`) and `eo13526_review` (`EO`).
  - The clearance arc now reads in the Zelda-style quest map as Manuscript Review -> Clearance Procedure Lane -> E.O. 13526 Release Review -> Declassification Review -> Foreign Permissions -> Withholding Appeals -> Agency Referrals -> HAC.
  - Wired `getProductionBoardReadout()` to the existing `sceneProgress.clearanceProcedureComplete` and `sceneProgress.eo13526ReviewComplete` save flags, so pause/subscreen and `window.render_game_to_text()` agree with the physical NetworkScene progression.
  - Strengthened final publication gating so the 30-year publication step also requires the clearance lane and E.O. release standard to be filed before the Buckram Gate can count as lawful.
  - Verified focused tests: `npm test -- src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts src/game/clearanceProcedure.test.ts src/game/eo13526Review.test.ts` (4 files / 29 tests pass).
  - Verified full `npm test` (56 files / 269 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client smoke at `?scene=NetworkScene&role=declass_reviewer&name=Alex` reports `productionBoard.total: 34`, active next gate `clearance_procedure`, sequence `manuscript_review -> clearance_procedure -> eo13526_review -> declassification_review -> foreign_permissions`, clearance phase `1/8`, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- Repository coverage map gate (2026-06-16):
  - Added `src/game/repositoryCoverageMap.ts`, a Phaser-free rules module that turns the history.state.gov FRUS source-base lanes into a physical Zelda-like source map: White House/NSC, State, Defense, CIA, other agencies, and private papers.
  - Inserted `repository_coverage_map` into the Production Board after Record Collection and before Research Selection, so the player must file the source map before narrowing the printed subset.
  - Wired the Office Hub Scope / Selection Desk so the gameplay flow is now Series Plan -> Volume Concept -> 20-Year Access -> Scope Charter -> Collection -> Repository Coverage Map -> Candidate Selection -> Selection Docket.
  - Added final-gate readiness impact: the Buckram Gate now reports `Repository MAP` as missing if the source map was never filed.
  - Verified focused tests: `npm test -- src/game/repositoryCoverageMap.test.ts src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts src/game/researchCoverage.test.ts` (4 files / 31 tests pass).
  - Verified full `npm test` (56 files / 268 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client smoke at `?scene=OfficeScene&role=compiler&name=Ruby` reports `productionBoard.total: 32`, `repository_coverage_map` between `record_collection` and `research_selection`, research phase total `6`, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- Reader-aid register gate (2026-06-16):
  - Added `src/game/readerAidRegisters.ts`, a Phaser-free rules module based on the official FRUS stages page naming lists of persons mentioned and abbreviations used in the completed front matter.
  - Added a distinct `reader_aid_registers` Production Board gate after Front Matter Assembly and before Index Docket, so the Buckram Gate now requires human filing of persons and abbreviations registers before indexing.
  - Extended the publication apparatus readiness model with a new `AIDS` component and wired `EndingScene` with a three-prompt reader-aid register loop. Unsafe shortcuts now debit standards reliability as omitted material facts, altered text, or concealed policy defects.
  - Updated final publication and standards tests so old completion fixtures must file `sceneProgress.readerAidRegistersComplete` before publication apparatus can complete.
  - Verified focused tests: `npm test -- src/game/readerAidRegisters.test.ts src/game/publicationApparatus.test.ts src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts` (4 files / 34 tests pass).
  - Verified full `npm test` (55 files / 263 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client smoke at `?scene=EndingScene&role=compiler&name=Ruby` reports `productionBoard.total: 31`, `hasReaderAidRegisters: true`, sequence `front_matter_assembly -> reader_aid_registers -> index_docket -> typesetter_corrections`, visible entity `reader-aid registers`, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- Publication funding queue gate (2026-06-16):
  - Added `src/game/publicationFundingQueue.ts`, a Phaser-free rules module based on the official FRUS stages page statement that lack of funding has delayed publication of fully prepared volumes.
  - Split funding-delay handling out of the GPO publication handoff and into a distinct Zelda-like `publication_funding` gate after GPO handoff and before chapter/public release status.
  - Wired `EndingScene` so the Buckram Gate now flows: GPO segment assembly -> GPO publication handoff -> publication funding queue -> chapter release ledger -> digital release -> public citation -> release calendar -> publication.
  - Unsafe shortcuts in the funding queue now apply standards damage: cutting documents is an omitted material fact, hiding the delay is a concealed policy defect, and calling an unpublished queue item published is altered text.
  - Updated `getProductionBoardReadout()` and phase readouts so the Production Board now has 30 gates; the release phase includes `publication_funding` with short label `FND`.
  - Verified focused tests: `npm test -- src/game/publicationFundingQueue.test.ts src/game/gpoPublication.test.ts src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts` (4 files / 27 tests pass).
  - Verified full `npm test` (54 files / 259 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client smoke at `?scene=EndingScene&role=compiler&name=Ruby` reports `productionBoard.total: 30`, `hasPublicationFunding: true`, sequence `gpo_segment_assembly -> gpo_publication -> publication_funding -> chapter_release_status`, visible entity `publication funding queue docket`, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- Office wall FRUS phase board (2026-06-16):
  - Refactored the Office hub wall chart from a dense 29-dot production tracker into six readable FRUS phase rows using `getFrusProductionPhaseReadout()`.
  - The in-room board now shows short phase labels, completion ticks, active-phase highlighting, the current board step, and a gold progress underline while preserving the same state source as the pause/subscreen readout.
  - Shifted the expanded board to the right side of the back wall so it reads as a distinct office reference chart rather than overlapping the wall map and archive banner.
  - Verified focused tests: `npm test -- src/game/frusProductionPhases.test.ts src/game/frusProductionBoard.test.ts` (2 files / 21 tests pass).
  - Verified full `npm test` (53 files / 256 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client smoke at `?scene=OfficeScene&role=compiler&name=Ruby` reports `scene: "OfficeScene"`, `productionBoard.total: 29`, six phase summaries, active phase `PLAN 0/2`, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- FRUS Production Board phase map (2026-06-16):
  - Added `src/game/frusProductionPhases.ts`, a typed phase layer that groups the 29 source-backed board gates into six readable production arcs: series/volume plan, research-selection-annotation, review/declassification, editorial/proof, final apparatus/certification, and print/digital/public release.
  - Extended `getAdventureSubscreenReadout()` so `window.render_game_to_text()` and the pause/subscreen now expose `productionBoard.phases` plus the active phase summary, not just individual board steps.
  - Updated the quest subscreen with six compact phase chips in the right status panel and a `PHASE PLAN 0/2`-style text summary, making the FRUS production arc read more like a Zelda quest map while staying faithful to the official stages.
  - Added deterministic tests in `src/game/frusProductionPhases.test.ts` proving every board step is covered exactly once and phase status advances from planning through research into clearance.
  - Verified focused tests: `npm test -- src/game/frusProductionPhases.test.ts src/game/frusProductionBoard.test.ts` (2 files / 21 tests pass).
  - Verified full `npm test` (53 files / 256 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client smoke at `?scene=OfficeScene&role=compiler&name=Ruby` reports active phase `PLAN 0/2`, six phase summaries, next gate `GRD / Grand conceptualization`, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- Production Board subscreen track (2026-06-16):
  - Added a compact `productionBoard` summary to `getAdventureSubscreenReadout()`, so the ALttP-style pause/subscreen state now carries the FRUS Production Board completion count, active next gate, completion ratio, and all step statuses alongside pendants, crystals, hearts, equipped tools, dungeon keys, and the room map.
  - Updated the FRUS Quest subscreen overlay to render a small SNES-style bead track for all 29 FRUS production gates, with completed gates in green, the active gate in cyan with a white outline, locked gates dimmed, and a gold progress underline.
  - Added board progress and the next gate label to the subscreen text panel, making the current FRUS-production objective visible from the same pause view as tools and dungeon status.
  - Verified focused tests: `npm test -- src/game/frusProductionBoard.test.ts src/systems/dungeonKeys.test.ts` (2 files / 21 tests pass).
  - Verified full `npm test` (52 files / 253 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client smoke at `?scene=OfficeScene&role=compiler&name=Ruby` reports `adventureSubscreen.productionBoard.completed: 0`, `total: 29`, and active next gate `GRD / Grand conceptualization`. The client cannot press `M` because its key map lacks a menu token, and both headless WebGL screenshot capture and the in-app Browser screenshot remain black/timed out as previously documented; browser console check reports no errors.
- Typesetting preparation gate (2026-06-16):
  - Added `src/game/typesettingPreparation.ts`, a Phaser-free rules module based on the official history.state.gov FRUS stages detail that completed text is prepared for typesetting and document-note metadata such as classification, drafting, and dates is carefully reviewed.
  - Split the previous all-in-one typesetter proof pass: `typesetting_preparation` now sits after Modern Typeflow Order and before Typesetter Proof on the FRUS Production Board, while `typesetter_proof` now focuses on comparing typeset pages to originals and flagging remaining textual issues.
  - Wired `SilentReadScene` so the player sequence is now: editorial treatment -> modern manuscript-clearance order -> printer's-copy preparation -> typesetter proof -> Buckram Key.
  - Extended final apparatus readiness so the index/typeset component requires typesetting preparation, proof comparison, and the index docket before final certification can proceed.
  - Verified focused tests: `npm test -- src/game/typesettingPreparation.test.ts src/game/typesetterProof.test.ts src/game/frusProductionBoard.test.ts src/game/publicationApparatus.test.ts src/game/finalPublicationCertification.test.ts src/game/standardsViolations.test.ts` (6 files / 41 tests pass).
  - Verified full `npm test` (52 files / 253 tests pass) and `npm run build` (passes with the existing Vite chunk-size warning).
  - Required web-game client smoke at `?scene=SilentReadScene&role=proofreader&name=Sam` reports the new board order: Modern Typeflow Order locked, Typesetting Preparation locked next, Typesetter Proof locked after that, and Front Matter Assembly locked after proof. No console/error artifact was produced; the generated headless WebGL screenshot remains black as previously documented.
- Typesetter correction docket (2026-06-16):
  - Added `src/game/typesetterCorrections.ts`, a Phaser-free rule module based on the history.state.gov FRUS stages page detail that remaining editing issues are resolved with the typesetter before the volume is finished.
  - Inserted `typesetter_corrections` into the FRUS Production Board after the Index Docket and before Final Kellogg Certification, so a finished volume now requires compiler/typesetter consultation for flagged textual issues.
  - Extended the final publication apparatus with a `FIX` component. The Buckram Gate now gates certification behind front matter, index, and typesetter corrections rather than treating proof flags as automatically resolved.
  - Wired `EndingScene` with a three-prompt typesetter correction loop. Wrong shortcuts apply standards damage (`altered_text`, `omitted_material_fact`, or `missed_30_year_deadline`); correct answers file `sceneProgress.typesetterCorrectionsComplete`, add document points, and unlock final certification.
  - Verified focused tests: `npm test -- src/game/typesetterCorrections.test.ts src/game/publicationApparatus.test.ts src/game/frusProductionBoard.test.ts src/game/finalPublicationCertification.test.ts src/game/standardsViolations.test.ts` (5 files / 38 tests pass).
  - Verified full `npm test`: 51 files / 249 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client smoke at `?scene=EndingScene&role=compiler&name=Ruby` reports the corrected Buckram Gate order: Front Matter Assembly active, Index Docket locked next, Typesetter Correction Docket locked after that, and Final Kellogg Certification locked last, with no console/error artifact; generated headless WebGL screenshot remains black as previously documented.
- Index docket publication gate (2026-06-15):
  - Added `src/game/indexDocket.ts`, a Phaser-free rule module based on the history.state.gov FRUS stages page detail that after typeset pages are compared to original documents, an index is added before publication.
  - Inserted `index_docket` into the FRUS Production Board after Front Matter Assembly and before Final Kellogg Certification, so the Buckram Gate now requires verified index entries, checked cross-references, and human-reviewed headings.
  - Extended the final publication apparatus so the `IDX` component requires the typesetter proof pass plus the new index docket; front matter assembly now hands off into the docket before certification.
  - Wired `EndingScene` with a three-prompt index docket loop. Wrong index shortcuts apply standards damage (`omitted_material_fact`, `altered_text`, or `concealed_policy_defect`); correct answers file `sceneProgress.indexDocketComplete`, add document points, and unlock final certification.
  - Verified focused tests: `npm test -- src/game/indexDocket.test.ts src/game/publicationApparatus.test.ts src/game/frusProductionBoard.test.ts src/game/finalPublicationCertification.test.ts` (4 files / 32 tests pass).
  - Verified full `npm test`: 50 files / 244 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client smoke at `?scene=EndingScene&role=compiler&name=Ruby` reports the corrected Buckram Gate order: Front Matter Assembly active, Index Docket locked next, Final Kellogg Certification locked after that, and no console/error artifact; generated headless WebGL screenshot remains black as previously documented.
- Selection docket supplemental-submissions check (2026-06-15):
  - Added a source-backed selection-docket gate for the official FRUS stages rule that documents already included in Supplemental FRUS Submissions to Congress were not printed again in regular volumes.
  - Expanded `src/game/selectionDocket.ts` with `supplemental_deduplication`: the correct answer avoids reprinting duplicates while preserving the source trail in notes; wrong answers map to `altered_text` or `omitted_material_fact` standards damage.
  - Updated the Production Board's `research_selection` source basis and gameplay task so selected subsets now require a visible rationale, a supplemental-submission duplicate check, and an annotation bridge for omitted context.
  - Replaced the hardcoded later-scene selection docket seed count with `SELECTION_DOCKET_PROMPTS.length`, keeping QA deep links coherent as the selection gate grows.
  - Verified focused tests: `npm test -- src/game/selectionDocket.test.ts src/game/frusProductionBoard.test.ts src/game/documentSelection.test.ts` (3 files / 25 tests pass).
  - Verified full `npm test`: 49 files / 239 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client smoke at `?scene=OfficeScene&role=compiler&name=Ruby` reports the updated `research_selection` source basis and gameplay task in `render_game_to_text()`, with no console/error artifact; generated headless WebGL screenshot remains black as previously documented.
- HAC 30-year sample and annual findings gate (2026-06-15):
  - Strengthened the Senate Hearing HAC gate so it now covers the official process-monitoring scope from history.state.gov: compilation, editing, preparation, declassification procedures/guidelines, representative samples of documents still classified after 30 years, and annual findings/recommendations.
  - Expanded `src/game/hacHearing.ts` from three prompts to five, adding `sample_thirty_year_records` and `annual_findings_report` as required human oversight answers before Treaty Fragment II is awarded.
  - Updated the Production Board's `advisory_monitoring` source basis and gameplay task so the board reflects 30-year classified-record sampling and annual findings rather than a generic SOP review.
  - Updated Senate Hearing completion copy in `DanneMapScene` so the player sees that the HAC record filed oversight, 30-year sampling, annual findings, and Kellogg standards.
  - Verified focused tests: `npm test -- src/game/hacHearing.test.ts src/game/frusProductionBoard.test.ts` (2 files / 23 tests pass).
  - Verified full `npm test`: 49 files / 239 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client smoke at `?scene=SenateHearingChamberScene&role=compiler&name=Ruby` reports the stronger HAC production-board source basis and gameplay task in `render_game_to_text()`, with no console/error artifact; generated headless WebGL screenshot remains black as previously documented.
- DANN-E final publication certification guard (2026-06-15):
  - Fixed the DANN-E endgame route so a lawful boss defeat no longer unconditionally jumps to the true ending. DANN-E now publishes the certified FRUS volume through a shared state-layer final-publication helper, then unlocks `TrueEndingScene` only if the true-ending certificate is actually complete, including the full treaty record.
  - Centralized the last-mile publication side effects previously embedded in `EndingScene`: GPO segment assembly, GPO publication handoff, chapter status, digital release, public citation card, release calendar, published FRUS cover inventory, published final-gate certification, and document publication.
  - Made `finalGateCertification.status === "published"` durable across scene changes and save restoration while preserving transient locked/ready gate prompts as scene-local UI state.
  - Added deterministic coverage in `src/game/finalPublicationCertification.test.ts`: locked Buckram Gate refuses DANN-E certification, lawful publication without all treaty fragments gets the normal certified-volume outcome, and complete treaty record plus completed FRUS production unlocks the true ending.
  - Verified focused tests: `npm test -- src/game/finalPublicationCertification.test.ts src/game/trueEndingCertificate.test.ts` (2 files / 6 tests pass).
  - Verified full `npm test`: 49 files / 238 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client smoke at `?scene=TrueEndingScene&role=compiler&name=Ruby` reports the expected unseeded `FRUS VOLUME REVIEWED` state, `Treaty Record 0/3`, and no console/error artifact; generated headless WebGL screenshot remains black as previously documented.
- Editorial methodology ledger gameplay gate (2026-06-15):
  - Added `src/game/editorialMethodology.ts`, a Phaser-free rule module based on a history.state.gov About-the-Series page: documents are ordered by Washington time, reproduced as exactly as possible with marginalia described in footnotes, first source footnotes carry source/classification/distribution/drafting/background metadata, and editorial notes summarize pertinent material not printed plus related sources and accounts.
  - Inserted `editorial_methodology` into the FRUS Production Board after HAC/process monitoring and before `kellogg_editing`, so proof/editorial treatment no longer satisfies the final methodology standard unless the official editorial-method ledger has been filed.
  - Wired `SilentReadScene` so completed physical verification now flows into Editorial Methodology -> Editorial Treatment -> Typeflow Order -> Typesetter Proof. Wrong methodology shortcuts apply standards damage (`undisclosed_deletion`, `omitted_material_fact`, `altered_text`, or `concealed_policy_defect`); correct answers file `sceneProgress.editorialMethodologyComplete`, add document points, and preserve the existing human editorial-treatment loop.
  - Verified focused tests: `npm test -- src/game/editorialMethodology.test.ts src/game/frusProductionBoard.test.ts src/game/editorialTreatment.test.ts` (3 files / 20 tests pass).
  - Verified full `npm test`: 46 files / 224 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Runtime smoke at `?scene=SilentReadScene&role=proofreader&name=Sam` opened the live Editorial Methodology prompt loop in the Phaser scene, completed it, and reported `sceneProgress.editorialMethodologyComplete: 1`, `editorialMethodologyStep: 4`, then `editorialTreatmentComplete: 1` after the existing follow-on loop. No console or page errors were produced; screenshot `output/web-game/editorial-methodology-smoke.png` shows the proof room and the follow-on Editorial Treatment dialog.
- Release calendar docket gameplay gate (2026-06-15):
  - Added `src/game/releaseCalendar.ts`, a Phaser-free rule module based on the history.state.gov Status of the Series page: the public docket lists current and previous-year releases, anticipated releases later in the current year, and published volumes being digitized.
  - Inserted `release_calendar` into the FRUS Production Board after `public_citation` and before the 30-year publication gate, so a reader-facing citation card still needs public release-calendar/digitization status before publication.
  - Wired `EndingScene` so Public citation card -> Release calendar docket -> final publication. Wrong docket shortcuts apply standards damage (`omitted_material_fact`, `concealed_policy_defect`, or `altered_text`); correct answers file `sceneProgress.releaseCalendarComplete`, add document points, and expose `"public release calendar docket"` in `render_game_to_text()`.
  - Verified focused tests: `npm test -- src/game/releaseCalendar.test.ts src/game/frusProductionBoard.test.ts` (2 files / 17 tests pass).
  - Verified full `npm test`: 45 files / 221 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=EndingScene&role=compiler&name=Ruby` drove front matter -> Kellogg certification -> GPO segments -> GPO handoff -> chapter status -> digital release -> public citation -> release calendar -> publication. Runtime state reports `sceneProgress.releaseCalendarComplete: 1`, `releaseCalendarStep: 3`, Production Board `completed: 19`, `total: 19`, visible entity `"public release calendar docket"`, and `mode: "ending"`. No console-error artifact was produced; the generated headless WebGL screenshot remains black as previously documented.
- Public citation card gameplay gate (2026-06-15):
  - Added `src/game/publicCitationCard.ts`, a Phaser-free rule module based on the history.state.gov guide to citing the FRUS series: document numbers are media-neutral, citations need complete publication components, canonical history.state.gov URLs should be appended for web/eBook use, and earlier digitized volumes need a visible print-citation caution.
  - Inserted `public_citation` into the FRUS Production Board after `digital_release` and before the 30-year publication gate, so final publication now requires reader-facing citation integrity in addition to chapter status and web/eBook release metadata.
  - Wired `EndingScene` so Digital release manifest -> Public citation card -> final publication. Wrong citation shortcuts apply standards damage (`omitted_material_fact`, `concealed_policy_defect`, or `altered_text`); correct answers file `sceneProgress.publicCitationComplete`, add document points, and expose `public FRUS citation card` in `render_game_to_text()`.
  - Verified focused tests: `npm test -- src/game/publicCitationCard.test.ts src/game/digitalRelease.test.ts src/game/frusProductionBoard.test.ts` (3 files / 20 tests pass).
  - Verified full `npm test`: 44 files / 218 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=EndingScene&role=compiler&name=Ruby` drove front matter -> Kellogg certification -> GPO segments -> GPO handoff -> chapter release status -> digital release -> public citation card, then reported `sceneProgress.publicCitationComplete: 1`, `publicCitationStep: 4`, visible entity `"public FRUS citation card"`, and final gate message `"Buckram Key ready: public citation card complete; publish the volume."` No console-error artifact was produced; the generated headless WebGL screenshot remains black as previously documented.
- Chapter release status gameplay gate (2026-06-15):
  - Added `src/game/chapterReleaseStatus.ts`, a Phaser-free rule module based on the history.state.gov Status of the Series page: FRUS volumes move through Planning, Research, Clearance, and Publication, and a growing number of volumes are published incrementally as chapters are cleared while outstanding chapters remain visible.
  - Inserted `chapter_release_status` into the FRUS Production Board after editorial treatment and before the digital edition release, so a GPO-ready volume still needs a public chapter ledger before web/eBook publication.
  - Wired `EndingScene` so GPO handoff now flows into Chapter status ledger -> Digital release manifest -> final publication. Wrong chapter-status shortcuts apply standards damage (`omitted_material_fact`, `concealed_policy_defect`, or `altered_text`); correct answers file `sceneProgress.chapterReleaseComplete`, add document points, and keep outstanding chapters visible rather than hidden.
  - Verified focused tests: `npm test -- src/game/chapterReleaseStatus.test.ts src/game/digitalRelease.test.ts src/game/frusProductionBoard.test.ts` (3 files / 20 tests pass).
  - Verified full `npm test`: 43 files / 215 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=EndingScene&role=compiler&name=Ruby` drove front matter -> Kellogg certification -> GPO segments -> GPO handoff -> chapter release status -> digital release, then reported `sceneProgress.chapterReleaseComplete: 1`, `chapterReleaseStep: 3`, `digitalReleaseComplete: 1`, and visible entity `"chapter release status ledger"`. No console-error artifact was produced; the generated headless WebGL screenshot remains black as previously documented.
- Digital edition release gameplay gate (2026-06-15):
  - Added `src/game/digitalRelease.ts`, a Phaser-free rule module based on history.state.gov FRUS eBook and developer guidance: eBook citations use persistent document numbers rather than page numbers, FRUS digital masters are encoded as TEI, and the eBook catalog uses OPDS.
  - Inserted `digital_release` into the FRUS Production Board after editorial treatment and before the 30-year publication gate, so a bound/GPO-ready volume still needs a public digital manifest before the final published cover.
  - Wired `EndingScene` so GPO handoff now flows into a three-prompt digital release desk before `publishVolume()`. Wrong digital shortcuts apply standards damage (`altered_text`, `omitted_material_fact`, or `concealed_policy_defect`); correct answers file `sceneProgress.digitalReleaseComplete`, add document points, and preserve old-save compatibility once the volume is published.
  - Verified focused tests: `npm test -- src/game/digitalRelease.test.ts src/game/frusProductionBoard.test.ts src/game/gpoPublication.test.ts` (3 files / 20 tests pass).
  - Verified full `npm test`: 42 files / 212 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=EndingScene&role=compiler&name=Ruby` drove front matter -> Kellogg certification -> GPO segments -> GPO handoff -> digital release, then reported `sceneProgress.digitalReleaseComplete: 1`, `digitalReleaseStep: 3`, `nearestInteractable: "CERTIFY FRUS VOLUME"`, and `objective: "Buckram Gate: press Space to publish the public FRUS volume."` No console-error artifact was produced; the generated headless WebGL screenshot remains black as previously documented.
- E.O. 13526 release-standard gameplay gate (2026-06-15):
  - Added `src/game/eo13526Review.ts`, a Phaser-free rule module based on a history.state.gov FRUS preface that says E.O. 13526 reviewers aimed to release all information subject only to current national security requirements, with concurrence from appropriate bureaus/agencies/foreign governments and accounting for withheld or excised material.
  - Wired `NetworkScene` so the ClassNet Vault now flows Clearance Procedure -> E.O. 13526 Review -> ClassNet declassification review -> Clearance Token. The new gate covers release standard, concurrence chain, and visible withholding/excision accounting before the token can move.
  - Updated the FRUS Production Board's `declassification_review` source basis and URL to the E.O. 13526 preface source, so the board's source readout now matches the more precise declassification standard.
  - Wrong EO review shortcuts apply standards damage (`omitted_material_fact`, `concealed_policy_defect`, `undisclosed_deletion`, or `altered_text`), including silent deletion, smooth-gap, terminal-only, and withhold-for-speed shortcuts.
  - Updated later-scene QA seeding so `?scene=ReferralVaultScene`, `?scene=SilentReadScene`, and `?scene=EndingScene` remain coherent with the expanded ClassNet chain.
  - Verified focused tests: `npm test -- src/game/eo13526Review.test.ts src/game/declassificationReview.test.ts src/game/clearanceProcedure.test.ts src/game/frusProductionBoard.test.ts` (4 files / 24 tests pass).
  - Verified full `npm test`: 41 files / 209 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=NetworkScene&role=declass_reviewer&name=Alex` reports `declassification_review.sourceUrl: "https://history.state.gov/historicaldocuments/frus1969-76v22/preface"`, no EO review pre-seeded in `sceneProgress`, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- Typeflow order gameplay gate (2026-06-15):
  - Added `src/game/typeflowOrder.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: until the late 1970s, typesetting preceded declassification review, but since then compilations are cleared in manuscript before typesetting.
  - Wired `SilentReadScene` so completed editorial treatment now flows into a two-prompt Typeflow Order gate before the existing Typesetter Proof sequence. The Buckram Key remains downstream of correct manuscript-clearance order and page proofing.
  - Wrong order shortcuts apply standards damage (`omitted_material_fact`, `concealed_policy_defect`, or `altered_text`), including modern "typeset first" and DANN-E order-inference shortcuts.
  - Updated `?scene=EndingScene` QA seeding so direct final-gate deep links remain coherent with the expanded proofing chain while `SilentReadScene` still exposes the new gate during play.
  - Verified focused tests: `npm test -- src/game/typeflowOrder.test.ts src/game/typesetterProof.test.ts src/game/editorialTreatment.test.ts` (3 files / 9 tests pass).
  - Verified full `npm test`: 40 files / 206 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=SilentReadScene&role=proofreader&name=Sam` reports `scene: "SilentReadScene"`, coherent seeded prior progress, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- Selection docket gameplay gate (2026-06-15):
  - Added `src/game/selectionDocket.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: selection narrows collected records into a printed subset, and expanded annotation mitigates the increasing selectivity of the series.
  - Reframed the Production Board's `research_selection` step as `Selection docket`, so a balanced candidate set no longer completes research/selection until the player files a visible rationale for the printed subset and an annotation bridge for nonprinted context.
  - Wired the Office Hub `Scope / Selection Desk` into a six-stage loop: Series Plan -> Volume Concept -> Scope Charter -> Record Collection -> Candidate Selection -> Selection Docket.
  - Wrong docket shortcuts apply standards damage (`omitted_material_fact`, `altered_text`, or `concealed_policy_defect`), including DANN-E summary and hidden-style-edit shortcuts that fail instead of laundering selection gaps.
  - Updated deep-scene QA seeding so `?scene=GuideScene` and later routes remain coherent with the expanded Office desk chain.
  - Verified focused tests: `npm test -- src/game/selectionDocket.test.ts src/game/frusProductionBoard.test.ts src/game/documentSelection.test.ts` (3 files / 21 tests pass).
  - Verified full `npm test`: 39 files / 203 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=OfficeScene&role=compiler&name=Ruby` reports the Production Board `research_selection.label: "Selection docket"`, stages-page source URL, `complete: false`, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- Clearance procedure lane gameplay gate (2026-06-15):
  - Added `src/game/clearanceProcedure.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: declassification clearance became a distinct function from compilation/review, post-1980 clearance review uses a human reviewer lane, and documents with other agency equities require accountable routing.
  - Wired `NetworkScene` so the ClassNet Vault now requires a three-prompt clearance procedure lane before the existing Clearance Token declassification review can begin. The route text and objective now point players to `CLEARANCE LANE` until the procedure is documented.
  - Wrong procedure shortcuts apply standards damage (`concealed_policy_defect`, `omitted_material_fact`, or `undisclosed_deletion`), including a StateChat final-signoff shortcut that correctly fails because StateChat remains terminal support only.
  - Updated later-scene QA seeding so `?scene=ReferralVaultScene`, `?scene=SilentReadScene`, and `?scene=EndingScene` remain coherent with the expanded ClassNet chain.
  - Verified focused tests: `npm test -- src/game/clearanceProcedure.test.ts src/game/declassificationReview.test.ts` (2 files / 7 tests pass).
  - Verified full `npm test`: 38 files / 200 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=NetworkScene&role=declass_reviewer&name=Alex` reports `scene: "NetworkScene"`, production board `nextStep.id: "declassification_review"`, no `clearanceProcedureComplete` pre-seeded in `sceneProgress`, and no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- GPO segment assembly publication loop (2026-06-15):
  - Added `src/game/gpoSegmentAssembly.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: FRUS volumes can move to GPO in parts, the final segment must arrive with index/apparatus intact, and GPO binds the entire certified volume.
  - Wired `EndingScene` so final Kellogg certification now flows into GPO segment assembly before the existing GPO handoff prompts. Wrong publication-packet shortcuts apply standards damage (`altered_text`, `omitted_material_fact`, or `concealed_policy_defect`); correct answers file `sceneProgress.gpoSegmentAssemblyComplete` and add document points.
  - Preserved old-save compatibility by treating an already completed GPO publication as implying segment assembly complete, and `publishVolume()` now persists both flags.
  - Fixed a real runtime error surfaced during smoke testing: the four DANN-E runtime sprite sheets now load as images and receive numeric grid frames manually in `BootScene`, avoiding Phaser's spritesheet processing failure while preserving the same texture keys and animations.
  - Verified focused tests: `npm test -- src/game/gpoSegmentAssembly.test.ts src/game/gpoPublication.test.ts` (2 files / 6 tests pass).
  - Verified full `npm test`: 37 files / 197 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=EndingScene&role=compiler&name=Ruby` reports a valid Buckram Gate state and, after clearing stale artifacts, no console-error artifact. The generated headless WebGL screenshot remains black as previously documented.
- Editorial treatment consultation gate (2026-06-15):
  - Added `src/game/editorialTreatment.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: remaining textual issues are flagged for consultation with the compiler, and editing must improve readability without altering the documentary record.
  - Reframed the Production Board's `kellogg_editing` step as `Editorial treatment`, sourced to the official stages page, and made it require `sceneProgress.editorialTreatmentComplete` plus the proof stamp, reliability, and no unresolved undisclosed deletions.
  - Wired `SilentReadScene` so completing all physical evidence flags now opens a three-prompt human editorial treatment consultation before the existing typesetter proof can issue the Buckram Key. Wrong shortcuts apply standards damage (`altered_text`, `concealed_policy_defect`, or `undisclosed_deletion`); correct answers file the consultation and add document points.
  - Updated deep-scene QA seeding so `?scene=EndingScene` remains coherent with the expanded final editing/proofing chain.
  - Verified focused tests: `npm test -- src/game/editorialTreatment.test.ts src/game/frusProductionBoard.test.ts src/game/typesetterProof.test.ts` (3 files / 20 tests pass).
  - Verified full `npm test`: 36 files / 194 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=SilentReadScene&role=proofreader&name=Sam` reports `productionBoard.total: 15`, `kellogg_editing.label: "Editorial treatment"`, official stages source URL, `complete: false`, and no console errors. The generated headless WebGL screenshot remains black as previously documented.
- Whole-document withholding appeal gameplay gate (2026-06-15):
  - Added `src/game/withholdingAppeal.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: declassification review may withhold whole documents or excise portions, and contested withholding needs a visible human review outcome before concurrence.
  - Inserted `withholding_appeals` into the FRUS Production Board after `foreign_permissions` and before `agency_referrals`, so a foreign-government permission note no longer jumps straight to referral concurrence or visible excision.
  - Wired `ReferralVaultScene` so foreign-government permission now flows into a three-prompt withholding appeal review before partial excision. Wrong shortcuts apply standards damage (`altered_text`, `omitted_material_fact`, or `concealed_policy_defect`); correct answers record the appeal path, add document points, and preserve the review trail.
  - Updated later-scene QA seeding so `?scene=SilentReadScene` and `?scene=EndingScene` remain coherent with the expanded board.
  - Verified focused tests: `npm test -- src/game/withholdingAppeal.test.ts src/game/frusProductionBoard.test.ts` (2 files / 18 tests pass).
  - Verified full `npm test`: 35 files / 190 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=ReferralVaultScene&role=declass_reviewer&name=Alex` reports `productionBoard.total: 15`, order `declassification_review -> foreign_permissions -> withholding_appeals -> agency_referrals -> advisory_monitoring`, `foreign_permissions` active, `withholding_appeals` locked until the permission step is complete, and no console errors. The generated headless WebGL screenshot remains black as previously documented.
- Front matter assembly gameplay gate (2026-06-15):
  - Added `src/game/frontMatterAssembly.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: final publication apparatus includes preface/scope framing, sources consulted, persons and abbreviations, proofed pages, and the index.
  - Expanded `publicationApparatus` from five to six components by adding `front_matter_assembly`, so recovered fragments and proofing no longer imply the final reader apparatus has been assembled.
  - Wired `EndingScene` so the Buckram Gate can be otherwise ready but still requires a Space-triggered front matter assembly sequence at the human publication table before Kellogg certification and GPO handoff.
  - Wrong apparatus shortcuts apply standards damage (`omitted_material_fact`, `altered_text`, or `concealed_policy_defect`); correct answers file `sceneProgress.frontMatterAssemblyComplete` and add document points.
  - Verified focused tests: `npm test -- src/game/frontMatterAssembly.test.ts src/game/publicationApparatus.test.ts src/game/standardsViolations.test.ts` (3 files / 16 tests pass).
  - Verified full `npm test`: 34 files / 184 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client against production preview at `?scene=EndingScene&role=compiler&name=Ruby` reports `nearestInteractable: "ASSEMBLE FRONT MATTER"`, `publicationApparatus.completed: 5/6`, missing summary `Apparatus ASM`, and `buckramGateOpen: false`. The generated headless WebGL screenshot remains black as previously documented.
- Foreign-government permission gameplay gate (2026-06-15):
  - Added `src/game/foreignGovernmentPermission.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: selected foreign-government information may require permission, and the publication packet must preserve a visible permission or withholding outcome.
  - Inserted `foreign_permissions` into the FRUS Production Board after `declassification_review` and before `agency_referrals`, making the clearance path more faithful to the actual FRUS review sequence.
  - Wired `ReferralVaultScene` so the StateChat-generated manifest no longer jumps straight to visible excision. After human manifest confirmation, the player now clears a three-prompt foreign-government permission note before concurrence can open.
  - Wrong shortcuts apply standards damage (`omitted_material_fact`, `concealed_policy_defect`, or `undisclosed_deletion`); correct answers file the permission note, add document points, and continue to visible withholding language.
  - Updated deep-scene QA seeding so `?scene=SilentReadScene` and `?scene=EndingScene` remain coherent with the expanded board.
  - Verified focused tests: `npm test -- src/game/foreignGovernmentPermission.test.ts src/game/frusProductionBoard.test.ts` (2 files / 17 tests pass).
  - Verified full `npm test`: 33 files / 178 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=ReferralVaultScene&role=declass_reviewer&name=Alex` reports `productionBoard.total: 14`, `declassification_review` complete, `foreign_permissions` active, and `agency_referrals` locked. The generated headless WebGL screenshot remains black as previously documented.
- Annotation drafting gameplay gate (2026-06-15):
  - Added `src/game/annotationDrafting.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: annotation provides provenance for published documents, context about persons/events/policies/references/attachments, and helps mitigate the increasing selectivity of the series.
  - Split the Production Board's old combined source-note/annotation step into `source_notes` (Source Note 47 provenance + Citation Stamp) followed by a separate `annotation` gate before manuscript review.
  - Wired `ArchiveScene` so stamping Source Note 47 now opens a three-prompt expanded-annotation review at the research table. Wrong shortcuts apply standards damage (`omitted_material_fact`, `altered_text`, or `concealed_policy_defect`); correct answers move core documents toward `ready_for_review`.
  - Updated deep-scene QA seeding so `?scene=NetworkScene` and later routes remain coherent with the expanded board.
  - Verified focused tests: `npm test -- src/game/annotationDrafting.test.ts src/game/frusProductionBoard.test.ts src/game/sourceNoteProvenance.test.ts` (3 files / 20 tests pass).
  - Verified full `npm test`: 32 files / 172 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=ArchiveScene&role=compiler&name=Ruby` reports `productionBoard.total: 13`, `source_notes` complete, `annotation` active, and `manuscript_review` locked. The generated headless WebGL screenshot remains black as previously documented.
- Volume conceptualization gameplay gate (2026-06-15):
  - Added `src/game/volumeConcept.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: after grand conceptualization, each compiler or team defines the parameters of the individual volume, consults histories/memoirs/accounts to inform collection and selection, and covers policymaking plus implementation.
  - Inserted `volume_concept` into the FRUS Production Board after `series_concept` and before 20-year access, so whole-series planning no longer stands in for defining the actual volume remit.
  - Wired the Office Hub `Scope / Selection Desk` into a five-stage desk loop: Series Plan -> Volume Concept -> Scope Charter -> Record Collection -> Candidate Selection.
  - Wrong volume-concept shortcuts apply standards damage (`omitted_material_fact`, `altered_text`, or `concealed_policy_defect`) depending on whether the player narrows to easy files, lets a machine claim completeness, or hides implementation defects.
  - Updated deep-scene QA seeding so `?scene=GuideScene` and later routes remain coherent with the expanded board.
  - Verified focused tests: `npm test -- src/game/volumeConcept.test.ts src/game/frusProductionBoard.test.ts src/game/seriesConcept.test.ts src/game/recordCollection.test.ts` (4 files / 25 tests pass).
  - Verified full `npm test`: 31 files / 166 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=OfficeScene&role=compiler&name=Ruby` reports `productionBoard.total: 12` with order `series_concept -> volume_concept -> records_access -> record_collection -> research_selection -> source_notes`, and `volume_concept.sourceUrl` on the FRUS stages page. The generated headless WebGL screenshot remains black as previously documented.
- Record collection gameplay gate (2026-06-15):
  - Added `src/game/recordCollection.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: collection is distinct from selection, requiring compilers to identify important records, search for them, and copy or note likely publication records plus contextual background records.
  - Inserted `record_collection` into the FRUS Production Board after 20-year records access and before research/selection, so selected documents no longer stand in for the collection pass.
  - Wired the Office Hub `Scope / Selection Desk` into a four-stage desk loop: Series Plan -> Scope Charter -> Record Collection -> Candidate Selection. Wrong collection shortcuts now apply standards damage (`omitted_material_fact`, `altered_text`, or `missed_30_year_deadline`) depending on the shortcut.
  - Completing collection marks source-note, cross-reference, annotation, and proof-page records as candidate/context records, adds document points, and then unlocks candidate selection.
  - Updated deep-scene QA seeding so `?scene=GuideScene` and later routes remain coherent with the expanded board.
  - Verified focused tests: `npm test -- src/game/recordCollection.test.ts src/game/frusProductionBoard.test.ts src/game/seriesConcept.test.ts` (3 files / 20 tests pass).
  - Verified full `npm test`: 30 files / 161 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=OfficeScene&role=compiler&name=Ruby` reports `productionBoard.total: 11` with order `series_concept -> records_access -> record_collection -> research_selection -> source_notes`, and `record_collection.sourceUrl` on the FRUS stages page. The generated headless WebGL screenshot remains black as previously documented.
- Grand conceptualization / series architecture gate (2026-06-15):
  - Added `src/game/seriesConcept.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: grand conceptualization comes before a single volume, creates an organizational scheme for the series as a whole, fits individual volumes to that holistic vision, and reserves special editions for topics of sufficient importance.
  - Inserted `series_concept` as the first FRUS Production Board step, before 20-year records access, so a Golden Rule stamp no longer implies the whole-series plan was filed.
  - Wired the Office Hub `Scope / Selection Desk` so it first runs the three-prompt Series Plan sequence, then continues into the existing Scope Charter and balanced candidate-selection workflow. Shortcut answers apply Kellogg standards damage where they would omit context or conceal defects.
  - Updated deep-scene QA seeding so `?scene=GuideScene` and later routes remain coherent with the expanded board.
  - Verified focused tests: `npm test -- src/game/seriesConcept.test.ts src/game/frusProductionBoard.test.ts` (2 files / 14 tests pass).
  - Verified full `npm test`: 29 files / 155 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=OfficeScene&role=compiler&name=Ruby` reports `productionBoard.total: 10`, `nextStep.id: "series_concept"`, source URL `https://history.state.gov/historicaldocuments/frus-history/stages`, and locked `records_access` until the series plan is filed. The generated headless WebGL screenshot remains black as previously documented.
- GPO publication handoff (2026-06-15):
  - Added `src/game/gpoPublication.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: the Department contracts with the Government Printing Office to prepare/publish FRUS volumes, GPO binding turns final segments into the complete volume, and funding delay cannot justify cutting or uncertified publication.
  - `EndingScene` now treats publication as a three-part last mile: Buckram Gate readiness -> final Kellogg certification -> GPO publication handoff -> published FRUS cover. Completing Kellogg certification no longer publishes instantly.
  - Wrong handoff shortcuts apply standards damage (`omitted_material_fact`, `altered_text`, or `concealed_policy_defect`) and reset the GPO handoff, while correct answers persist `sceneProgress.gpoPublicationComplete` before `publishVolume()`.
  - Verified focused tests: `npm test -- src/game/gpoPublication.test.ts src/game/kelloggCertification.test.ts` (2 files / 8 tests pass); `npm run build` passes with the existing Vite chunk-size warning.
  - Verified full `npm test`: 28 files / 149 tests pass. Required web-game client at `?scene=EndingScene&role=compiler&name=Ruby` confirms Space now opens `Final certification: 1/4` instead of publishing immediately; headless WebGL screenshots remain black as previously documented.
- Typesetter proof and final text check (2026-06-15):
  - Added `src/game/typesetterProof.ts`, a Phaser-free proofing rule module based on the history.state.gov FRUS creation stages: cleared text is prepared for typesetting, document notes must correctly render classification/drafting/date information, and typeset pages are compared to originals with remaining textual issues flagged for consultation.
  - The Silent Read Tower no longer awards the Buckram Key immediately after every physical evidence flag is stamped. It now opens a three-prompt TypeSetter Proof sequence; wrong shortcuts apply standards damage, while correct answers file `sceneProgress.typesetterProofComplete`, proof the core documents, add document points, and only then issue the Buckram Key.
  - Strengthened `publicationApparatus.index_typeset_check` so the final assembly gate requires the actual typesetter proof pass in addition to the Proof Fragment and proof stamp. The final readiness readout now reports `Apparatus IDX` until that pass is filed.
  - Verified focused tests: `npm test -- src/game/typesetterProof.test.ts src/game/publicationApparatus.test.ts src/game/standardsViolations.test.ts` (3 files / 13 tests pass).
- Manuscript review production gate (2026-06-15):
  - Added `src/game/manuscriptReview.ts`, a Phaser-free rule module based on the history.state.gov FRUS creation stages: manuscript review checks completeness, cohesion, concision, content appropriateness, and annotation accuracy, then proceeds through first-pass recommendations and a General Editor / series assessment.
  - Inserted a first-class `manuscript_review` step into `src/game/frusProductionBoard.ts` between source notes and declassification review, so the board no longer jumps straight from provenance to clearance routing.
  - Wired the Office Hub FRUS Cart so, after the existing Inbox -> Cart -> Terminal production check and Master Declass Key issuance, it becomes a physical manuscript-review station. Wrong shortcuts apply standards damage; correct answers move the core documents to `ready_for_review`, add document points, and persist `sceneProgress.manuscriptReviewComplete`.
  - Later-scene QA seeds now mark manuscript review complete so `?scene=NetworkScene` and deeper debug links still boot with coherent production-board state.
  - Verified focused tests: `npm test -- src/game/manuscriptReview.test.ts src/game/frusProductionBoard.test.ts` (2 files / 11 tests pass).
- Publication apparatus final-assembly gate (2026-06-15):
  - Added `src/game/publicationApparatus.ts`, a Phaser-free final-assembly rule module based on the history.state.gov FRUS creation stages: preface/scope, sources consulted, persons/abbreviations, declassification accounting, and index/typeset proof check.
  - `getFinalGateReadiness()` and `getPublicationReadinessReadout()` now include `publicationApparatus`; the Buckram Gate remains locked until the apparatus is complete, in addition to stamps, fragments, reliability, standards cleanliness, and Buckram Key readiness.
  - EndingScene's StateChat checklist now includes an `APP` line, and the locked-gate objective names missing apparatus components (for example `apparatus SRC`) instead of treating cover fragments alone as final assembly.
  - Added deterministic coverage in `src/game/publicationApparatus.test.ts` plus a state-layer regression that proves Buckram Gate stays closed when the Source Note front-matter apparatus is missing.
  - Verified focused tests: `npm test -- src/game/publicationApparatus.test.ts src/game/standardsViolations.test.ts src/game/frusProgression.test.ts` (3 files / 13 tests pass).
  - Verified full `npm test`: 25 files / 138 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=EndingScene&role=compiler&name=Ruby&give=publication` reports `finalGate.publicationApparatus.complete: true`, `completed: 5`, `buckramGateOpen: true`, and the 30-year clock still green at 28.5/30. The headless WebGL screenshot remains black as previously documented.
- FRUS research repository coverage gate (2026-06-15):
  - Added `src/game/researchCoverage.ts`, a Phaser-free rule module that maps selected document candidates to the research base named on history.state.gov: White House/NSC records, State records, Defense records, CIA records, other foreign-affairs agency records, and private papers of policymakers.
  - The FRUS Production Board now exposes `researchCoverage` through `render_game_to_text()` and only lets a selected-document set complete `research_selection` when coverage is 6/6; a single selected document no longer satisfies the board by itself.
  - The Office `Scope / Selection Desk` now reports repository coverage in the candidate-selection completion dialog, and the Production Board dialog includes a compact `COVERAGE: x/6` page with missing lanes.
  - Added deterministic tests in `src/game/researchCoverage.test.ts` plus board-regression coverage for partial vs. balanced selections.
  - Verified focused tests: `npm test -- src/game/researchCoverage.test.ts src/game/frusProductionBoard.test.ts src/game/documentSelection.test.ts` (3 files / 16 tests pass).
  - Verified full `npm test`: 24 files / 133 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game client at `?scene=OfficeScene&role=compiler&name=Ruby` reports initial repository coverage `0/6`, all six lanes missing, and the source URL in `productionBoard.researchCoverage`; the headless WebGL screenshot remains black as previously documented.
  - Supplemental paced Playwright smoke completed the Office flow and confirmed balanced candidate selection yields `researchCoverage.complete: true`, `completed: 6`, selected four documents, and marks the Production Board `research_selection` step complete. Screenshot: `docs/screenshots/research-coverage-office-smoke.png`.
- Balanced FRUS document candidate selection gate (2026-06-15):
  - Added `src/game/documentSelection.ts`, a source-backed candidate-selection rule for the history.state.gov FRUS standard that a volume must be thorough, accurate, reliable, and must not omit major facts or conceal policy defects.
  - The Office Hub `Scope / Selection Desk` now runs as a two-step production gate: first file the Scope Charter, then return to select a balanced candidate set. Easy-record shortcuts debit reliability via the standards ledger (`omitted_material_fact` or `concealed_policy_defect`), while the correct balanced set selects `telegram_001`, `source_note_047`, `sbu_annotation_001`, and `proof_page_412`.
  - Tightened the FRUS Production Board so `research_selection` no longer completes from charter points alone; it now requires actual selected documents or later document workflow progress.
  - Verified `npm test`: 23 files / 128 tests pass; focused coverage added in `src/game/documentSelection.test.ts` and `src/game/frusProductionBoard.test.ts`.
  - Verified `npm run build` with the existing Vite chunk-size warning only.
  - Required web-game client reached the Office desk and exercised the charter handoff through answer 2; its virtual-frame timing can stick on dialog pages because the app's short-tap latch uses wall-clock time, and its headless WebGL screenshot remains all black as previously documented.
  - Supplemental paced Playwright smoke (using the same `render_game_to_text()` state) completed the whole Office flow: Scope Charter A/A/B, candidate-selection A, `documentSelectionComplete: 1`, `documentPoints: 20`, selected four balanced records, and Production Board `research_selection` became complete. Screenshot: `docs/screenshots/document-selection-office-smoke.png`.
- Final Kellogg certification gate (2026-06-15):
  - Added `src/game/kelloggCertification.ts`, a source-backed four-prompt final certification sequence for the About-FRUS/Kellogg requirements: thorough/accurate/reliable record, indicated deletions, no omission of material facts, and no concealment of policy defects.
  - Wired `EndingScene` so pressing Space at the ready Buckram Gate now starts final human Kellogg certification instead of immediately publishing. Correct A/A/A/A answers publish the volume and record `kelloggFinalCertificationComplete`.
  - Wrong answers apply the matching standards damage and record an unresolved standards blocker; if that final-certification blocker is the only remaining gate, the publication table reopens a repair certification loop so the player can correct the memo before publication.
  - Verified `npm test`: 22 files / 123 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game smoke: `?scene=EndingScene&role=compiler&name=Ruby` + Space opens `FINAL CERTIFICATION: WHAT MUST THE VOLUME BE?`; Space then A/A/A/A reaches `mode: "ending"` with `PUBLISHED FRUS COVER - HUMAN CERTIFICATION RECORDED`; Space then B records a concealed-policy-defect blocker and reopens the repair prompt. Headless WebGL screenshot remains all black as previously documented.
- Statutory Clock shared FRUS deadline rule (2026-06-15):
  - Added `src/game/statutoryClock.ts`, a Phaser-free rules module for the FRUS 30-year publication mandate from `https://history.state.gov/historicaldocuments/about-frus`.
  - The DANN-E boss fight now uses the shared clock helper for completion pressure, at-risk/deadline-missed status, and the concealed-policy-defect shortcut mapping instead of keeping local clock math inside the entity class.
  - `render_game_to_text()` now includes `statutoryClock` with source basis, years elapsed/remaining, status, missing publication gates, and shortcut violation state, so QA and assistive play can see the same deadline pressure as the boss UI.
  - The Buckram Gate checklist now includes a compact `CLOCK` row, keeping the final publication room tied to the 30-year statutory line without letting StateChat certify the gate.
  - Verified `npm test`: 21 files / 118 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
  - Required web-game smoke at `?scene=EndingScene&role=compiler&name=Ruby` produced `render_game_to_text().statutoryClock.status === "buckram_gate_open"` and label `Buckram Gate open at 28.5 / 30 years`; the generated headless WebGL screenshot remains all black as previously documented.
- AI annotation review SOP gate (2026-06-15):
  - Added `src/game/aiAnnotationReview.ts`, a tested three-question terminal-only SOP sequence: AI/StateChat can propose mechanical fixes, evidence-bound flags must become physical review objects, and humans own final sign-off.
  - Wired `SilentReadScene` so the physical review-folder loop no longer starts immediately after Priya's intro; it first opens the AI Annotation Review ChoicePrompt and persists completion in `sceneProgress.aiAnnotationReviewComplete`.
  - Wrong StateChat/DANN-E sign-off shortcuts cost reliability and re-teach the rule; the final correct answer files the review log and then starts the CARRY -> ROUTE -> VERIFY -> STAMP physical workflow.
  - Verified `npm test`: 20 files / 113 tests pass; `npm run build` passes with the existing Vite chunk-size warning only; required web-game smoke reached `SilentReadScene` with `mode: "choice"` and objective `AI Annotation Review: answer 1/3.` (headless WebGL screenshot remains black as previously documented).
- ClassNet declassification review gate (2026-06-15):
  - Added `src/game/declassificationReview.ts`, a tested three-question Clearance Token review that makes classified-equity routing depend on human agency review, the ClassNet channel, and a documented decision trail.
  - Wired `NetworkScene` so the ClassNet Vault pedestal no longer grants the Clearance Token as a flat pickup: if `sceneProgress.declassificationReviewComplete` is not set, pressing interact starts the review ChoicePrompt; wrong StateChat/shortcut answers cost reliability, and the final correct answer logs the human decision trail before collecting the token.
  - This keeps StateChat terminal-only and reinforces the real FRUS declassification split: StateChat may flag mechanics, but classified equities require human review and visible decisions.
  - Verified `npm test`: 19 files / 109 tests pass; `npm run build` passes with the existing Vite chunk-size warning only; required web-game smoke reached `NetworkScene` with `volumeWorkflowState: "declassification_review"` (headless WebGL screenshot remains black as previously documented).
- Archive source-note provenance challenge (2026-06-15):
  - Added `src/game/sourceNoteProvenance.ts`, a tested three-step Source Note 47 verification sequence that makes the player match repository, collection, and folder evidence before human citation stamping.
  - Wired `ArchiveScene` so the existing CARRY -> ROUTE -> VERIFY -> STAMP loop now pauses on a ChoicePrompt during VERIFY; wrong provenance shortcuts debit reliability and show `PROVENANCE CANNOT BE GUESSED`, while the final correct answer marks `source_note_047` as `citation_verified`.
  - The source-note loop still preserves StateChat as terminal output only: StateChat flags the missing repository, but human verification at the research table earns the citation stamp.
  - Verified `npm test`: 18 files / 105 tests pass; `npm run build` passes with the existing Vite chunk-size warning only.
- Office Hub FRUS Production Board (2026-06-15):
  - Added `src/game/frusProductionBoard.ts`, a typed history.state.gov-backed checklist that turns real FRUS production into the next Zelda-like progression layer: 20-year records access, research/selection, source-note annotation, declassification review, agency referrals, HAC/process monitoring, Kellogg editing standards, and 30-year publication.
  - Exposed the board through `render_game_to_text().productionBoard` so QA and assistive checks can see the same production ladder that appears in-game.
  - Added an interactable `FRUS Production Board` in OfficeScene with a compact 8-step wall display and dialog pages for current progress, next task, and the source-backed reason for that task.
  - Added `src/game/frusProductionBoard.test.ts` covering board order, initial locking, step advancement, unbracketed-deletion blocking, and final Buckram Gate readiness.
- Senate HAC hearing gameplay loop (2026-06-15):
  - Added `src/game/hacHearing.ts` as a tested, source-backed three-question HAC process review about monitoring the compilation/editorial process, declassification procedures/guidelines, and Kellogg publication standards.
  - Wired the Senate Hearing Chamber witness table to `ChoicePrompt`; Treaty Fragment II now requires answering the HAC process review instead of being granted by a single dialog.
  - Wrong hearing posture costs a small reliability correction and retries; completion is persisted in `sceneProgress.senateHacReviewComplete`.
  - The FRUS Production Board now treats the completed Senate HAC hearing as its own advisory-monitoring completion signal, separate from the Silent Read SOP stamp.
- Standards-violation ledger (2026-06-15):
  - Added persistent unresolved Kellogg-standard blockers for concealed policy defects, omitted material facts, altered text, missed 30-year deadline damage, and document-level undisclosed deletions.
  - Final Gate and `render_game_to_text()` now expose those blockers, so DANN-E shortcuts and wrong-network/referral choices cannot hide behind a simple reliability number.
  - Bracketed insertion repairs in Silent Read / Referral Vault clear the corresponding document-level standards blocker before publication.
- Office scope charter gameplay (2026-06-15):
  - Added a source-backed three-question scope charter at the Office Hub SCOPE desk covering volume scope/content planning, 20-year full records access, and Kellogg selection standards.
  - Completing the charter awards the Golden Rule stamp, files candidate documents, and advances the Production Board toward source-note verification.

- Post-PR27 live-QA fixes — ESC overlay close + interact feedback that the cloud browser swallowed (2026-06-15):
  - Two FAILs remained after PR #27: (1) pressing interact away from a target never visibly showed `STEP CLOSER`/`NOTHING TO INTERACT WITH`, and (2) ESC would not close the M inventory or Tab codex (their M/Tab toggles still worked). Both trace to the same root cause class PR27 fixed for *movement*, but for the discrete action/cancel keys, plus a stuck ESC-suppression latch.
  - Root cause (interact feedback): `aJustPressed` is derived from a once-per-`tickInput` sample of the physically-held key set. A too-short A/Space/Z tap — a keydown+keyup that both land between two samples, exactly what a cloud/automation browser emits — was added to and removed from `keyboardDown` before the next sample, so the rising edge never fired and `flashNoTargetHint()`/`nudgeTowardTarget()` never ran. PR27 latched *direction* keys for this; the action buttons were never latched.
  - Root cause (ESC close): `suppressEscEdgesUntilRelease` (added in PR27 to stop a still-held ESC from leaking the overlay-close edge into the pause panel) was cleared *only* by the Escape `keyup` listener. A missed keyup — focus shifting when a scene/overlay closes, or a synthetic automation ESC with no keyup — left the flag stuck `true`, silently killing every future ESC edge (`pauseJustPressed`/`cancelJustPressed`) while M (`menuJustPressed`) and Tab (`selectJustPressed`), which have no suppression, kept working. That asymmetry exactly matches the QA report.
  - Fix (action tap latch): added `actionTapLatch` + `isActionActive()` in `src/input/InputState.ts`, mirroring the movement latch. The A/B/confirm/cancel/start/select derivations now read the latched form, so a too-short tap on Space/Enter/Z (A/confirm), X/Shift (B), Escape (cancel/pause), or Tab (select) still produces a single rising edge (`TAP_ACTION_HOLD_MS = 90`). Held movement keys are never latched as actions; KeyM/E/R/N toggles are unchanged.
  - Fix (ESC self-heal): in `tickInput`, once Escape is no longer physically held on a tick, `suppressEscEdgesUntilRelease` is released regardless of whether the keyup event arrived. ESC can no longer get stuck off. The existing swallow-on-close behaviour and the "don't leak a held-ESC edge into pause" guard are preserved (the guard still gates on the latched `escDown`).
  - This makes the failed-interact toast (`FeedbackToast`, depth 1200, 1600ms hold + 400ms fade) actually fire on an A tap, and makes ESC reliably close the inventory/codex without reintroducing a pause/double-overlay. M/Tab toggles, title art, keyboard progression, movement tap latch, prompt reach/ring, and sprites/shadows are untouched.
  - Tests: added `InputState` regressions for a too-short A tap → single `aJustPressed`/release edge, a too-short Escape tap → single pause/cancel edge, and the ESC suppression self-healing after a missed keyup. New test helpers `tapActionForTests` / `TAP_ACTION_HOLD_MS`.
  - `npm test`: 12 files / 77 tests pass; `npm run build` (tsc + vite) passes with only the pre-existing Vite chunk-size warning. No browser automation was available in this environment, so live frame capture was not re-run; the fixes are covered by deterministic input-edge unit tests.

- Office Hub gameplay/art visibility pass 2 — focus, feedback, prompts, shadow (2026-06-15):
  - Root cause of the live "WASD didn't visibly move in cloud browser" PARTIAL: keyboard input is captured on `window` keydown (`src/input/InputState.ts`), but nothing ever pulled keyboard focus to the game. In an embedded/cloud browser the page can load unfocused, so injected keypresses landed on no focused element and never reached the `window` listener until the user physically clicked. WASD/arrows were already wired identically via `directionKeyMap` (both produce the same `dir` axis) — the issue was focus, not key mapping.
  - Fix (focus): added `installKeyboardFocusGuard()` in `src/main.ts`. It makes the game canvas focusable (`tabindex=0`, `outline:none`), focuses the canvas + `window` once the canvas exists, and re-grabs focus on every `pointerdown`/`touchstart` (capture) and on window `focus`. First WASD/arrow press now reaches the game without an extra click where the embedder allows programmatic focus.
  - Fix (failed-interaction feedback): the old `flashNoTargetHint()` swapped the 6px bottom HUD hint for 900ms — too low-contrast and brief for the auditor to catch. Added `src/systems/feedbackToast.ts#FeedbackToast`, a high-contrast 16-bit panel that floats above the player, holds 1600ms then fades 400ms (total 2000ms), tracking the avatar. Office Hub "A" with no target now shows "NOTHING TO INTERACT WITH" via the toast and also sets the status line. Timing/placement math is isolated in the Phaser-free `src/systems/feedbackToastPlacement.ts` for unit testing.
  - Prompt polish: `InteractionPrompt` now adds a soft filled highlight "glow" square behind the target ring (so the interactable visibly lights up), a thicker 2px gold ring with a stronger pulse, and a downward caret under the floating panel that points at the target.
  - Art: the player ground shadow was a full-opacity black oval (read as a pasted-on disc in the audit). Dropped to alpha 0.34 in `src/entities/Player.ts` so it grounds the sprite without punching a hole in the floor — applies to every scene that uses `Player`.
  - HUD de-clutter: the Office Hub bottom hint dropped the redundant "A INTERACT" (now carried contextually by the floating prompt) and uses a cleaner dotted hierarchy: "MOVE · TAB CODEX · M MENU · ESC PAUSE".
  - Tests: added `src/systems/feedbackToast.test.ts` (placement clamps to both HUD bands and screen edges; alpha holds-then-fades; lifetime exceeds the old 900ms) and an `InputState` case asserting WASD and arrow keys produce the identical movement axis. All prior fixes preserved (title art, no sprite fragments, aligned shadows, overlay ESC behavior, tutorial-card movement dismissal).
  - `npm test`: 12 files / 67 tests pass; `npm run build` (tsc + vite) passes with only the pre-existing Vite chunk-size warning. Note: no browser automation tool was available in this environment, so live frame capture was not performed; the dev server serves index + main.ts (HTTP 200) and the build compiles.

- Office Hub movement restoration + SNES interaction-prompt pass (2026-06-15):
  - Root cause of the live "field movement regressed" audit: the Office Hub controls tutorial card (`tutorialCard`, depth 1800) ran the player update with `canMove=false` and `return`ed early every frame it was up, and the card was only dismissed by confirm / A / cancel / pointer — never by movement keys. A player who pressed only Arrow/WASD (exactly what the auditor did) saw the avatar pose change but no translation, because the scene froze movement until a non-movement key cleared the card. Verified in headless Chromium: fresh load shows the card and the player is pinned at the spawn; arrows-only used to leave it pinned.
  - Fix: extracted the dismissal predicate to a Phaser-free `src/systems/tutorialDismiss.ts#shouldDismissControlsCard`, which now also treats any movement intent (`dir.x !== 0 || dir.y !== 0`) as a dismissal. `OfficeScene.update` no longer freezes the player while the card is up — it lets the normal movement path run and dismisses the card on the same input. Tutorial card copy changed to "MOVE OR PRESS A TO BEGIN". Re-verified headless: arrows-only now dismisses the card (`officeTutorialSeen=1`, "Controls logged.") and moves the player (128,184)→(129,188).
  - SNES improvement pass — in-context interaction cue: added `src/systems/interactionPrompt.ts#InteractionPrompt`, a floating framed "A VERB LABEL" panel with an "A" badge and an animated gold/cream highlight ring that pulses faster on first acquisition, replacing the bare bottom-of-screen hint as the primary cue. Wired into `OfficeScene` and `GameplayMapScene` (the latter at depth 880 to stay under the HUD bands; both keep a verb-aware bottom hint via `promptVerbForKind`). Per-kind verbs: npc=TALK, terminal=USE, document=CHECK, door=ENTER, poster/manuscript=READ. Verified headless: standing next to the FRUS Cart shows the panel floating above the target.
  - Failed-interaction feedback: pressing A with no target in the Office Hub now blips and flashes "NOTHING TO INTERACT WITH HERE" for 900ms before restoring the controls hint, instead of silently doing nothing.
  - Placement math is isolated in the Phaser-free `src/systems/interactionPromptPlacement.ts` (`computePromptPlacement`, `promptVerbForKind`, `DEFAULT_PROMPT_BOUNDS`) so it can be unit-tested without standing up Phaser (importing Phaser in the test env touches `navigator` and crashes the suite). `interactionPrompt.ts` re-exports it for ergonomic imports.
  - Tests: `src/systems/tutorialDismiss.test.ts` (stays up on no input; dismisses on horizontal/vertical movement intent and on confirm/A/cancel/pointer — regression for this audit) and `src/systems/interactionPrompt.test.ts` (verb map; hides when no target; uppercased label + verb floating above the target; X clamp; never above the top HUD band). All preserved fixes (no sprite fragments, aligned shadows, overlay close model) untouched.
  - `npm test`: 11 files / 59 tests pass; `npm run build` (tsc + vite) passes with only the pre-existing Vite chunk-size warning.

- TitleScene art uplift to match the embedded map (2026-06-15):
  - The opening/title screen embeds the high-quality `frus_world_map.jpg` in a small framed panel, but the surrounding art was flat: crude header, flat dotted wallpaper, a blocky gold title colliding with the map bottom, plain relic-bar icons, and flat border tiles.
  - Reworked `src/scenes/TitleScene.ts` to a handcrafted "mounted archival display" look using procedural Phaser graphics only (no new asset files, GitHub-Pages safe):
    - `drawWallpaper()` bakes a single deep-ruby buckram texture with a gold damask diamond motif and weave threads, then adds a black edge vignette so the bright center reads first.
    - `goldFrame()` draws an ornate double gold/bronze frame with a sepia reveal and corner rivets; used to mount the map, the title, and the relic shelf so the whole screen shares one frame language.
    - `bevelPanel()` gives the header plaque and mini-map readout raised/recessed edges; the header now has a brass plaque, beveled readout screen with scanline, "ARCHIVE TERMINAL" subline, and a red classification stamp strip.
    - `drawFilmstrip()` replaces the flat border tiles with a brass rail of beveled sprocket holes and gold trim, top and bottom.
    - `RUBY RULE` is now a layered beveled logo (black shadow / ruby outline / gold face) on its own framed plate, and `THE FRUS QUEST` sits inside the plate.
    - The relic rack is wrapped in a framed display case.
  - Fixed the title/map visual collision by moving the title onto its own plate below the map. Extracted the vertical layout to `src/scenes/titleLayout.ts` (`TITLE_LAYOUT` + `framedPlateBounds()`), and added `src/scenes/TitleScene.test.ts` asserting the map/title/relic plates never overlap and stay within the filmstrip borders.
  - Added semantic palette aliases (`bronze`, `oldGold`, `paleGold`, `mutedRuby`, `deepBrown`) in `src/game/constants.ts`.
  - Verified `npm test` (9 files, 37 tests passed) and `npm run build`.

- Office Hub orphan-oval final fix, pass 4 (2026-06-15):
  - Live QA after PR #19 confirmed the green plant and JR sprite alignment were fixed but a standalone black oval still sat below the JR sprite, near the JR COMP/IN label, attached to nothing.
  - Root cause: the pass-3 foot-offset formula was wrong. For a sprite with vertical origin `o`, the feet sit `height*(1-o)` below the origin, not `height*(o-0.5)`. With origin 0.9 the feet are `48*0.1 ≈ 5px` below the origin, but pass-3 computed `48*0.4 = 19` and placed the single NPC/Player ground shadow ~14px BELOW the feet. That detached shadow is the orphan oval. (Pass-2's original "5" was geometrically correct; pass-3 over-corrected it.)
  - Fixed `ART_PACK_FOOT_OFFSET_Y` to `round(height*(1-origin)) = 5` (label `8`) in `src/art/characters.ts`; `Player` and every `DanneNpc` already consume the shared constant, so the shadow returns to the feet for the Junior Compiler, Marine Security Guard, and the player. No standalone black oval remains in the Office Hub; the only ellipses there are attached entity shadows and the intentional gold lamp-glow.
  - Updated the regression test to assert the offset equals `height*(1-origin)=5` and added a guard that it never exceeds the feet (catching the 19-px regression). The blocky potted-plant art from pass-3 is unchanged.
  - `npm test`: 8 files / 34 tests pass; `npm run build` (tsc + vite) passes with only the pre-existing Vite chunk-size warning.

- Office Hub orphan-shadow + green-blob visual fix, pass 3 (2026-06-15):
  - Root cause of the live "detached black oval near JR" + "JR sprite looks fragmented/detached": the art-pack 32x48 sprite is drawn at scale 1 with origin (0.5, 0.9), so its feet sit `48*(0.9-0.5) = 19px` below the world origin, but `DanneNpc`/`Player` placed the ground shadow only 5px below origin. The shadow therefore floated at the body's waist and read as a standalone oval with the sprite hanging below it. Corrected the art-pack shadow offset to the feet (19) and the label to just below (22). Pass-2's "shadow y=5" was the actual bug, not a fix.
  - Extracted the geometry into shared exported constants in `src/art/characters.ts` (`ART_PACK_SPRITE_ORIGIN_Y`, `ART_PACK_FOOT_OFFSET_Y`, `ART_PACK_LABEL_OFFSET_Y`) so `Player` and every `DanneNpc` (Junior Compiler, Marine Security Guard) use one source of truth and cannot drift apart again.
  - Root cause of the live "green blob near TERM": `drawPottedPlant` still stacked seven green ellipses, which merge into one flat green mass at 256x240. Rebuilt it from outlined rectangles — terracotta pot body + rim, a dark soil line, and discrete angled leaf blades with sepia outlines — so it reads as an intentional NES plant prop, not a sprite-bug blob.
  - Added regression tests in `src/art/characterSprites.test.ts` asserting the foot offset matches the sprite geometry (height*(origin-0.5)=19) and that the label sits below the feet.
  - Preserved the pass-2 overlay/input fixes (handleOpenOverlays, Codex close swallow, REL modal, warning prompt) unchanged.
  - `npm test`: 8 files / 33 tests pass; `npm run build` (tsc + vite) passes with only the pre-existing Vite chunk-size warning.

- Live-QA overlay/input + Office art pass (2026-06-15):
  - Office Hub green-blob fix: the lower-right "potted plant" was three flat neon `openNetGreen` ellipses that read as a placeholder blob. Added shaded foliage palette entries (`plantLeaf`/`plantLeafShade`/`plantLeafDark`) and a `drawOfficeProps` → `drawPottedPlant` that draws a terracotta pot with layered shaded leaves and a couple of highlight fronds.
  - Codex / inventory / reliability close model rebuilt deterministically. Removed the racy `keydown-ESC` DOM listener on `InventoryOverlay` (it fired outside the update tick and could leak a pause edge). Added `src/systems/overlayInput.ts#handleOpenOverlays`, called from every gameplay scene's "overlay open" branch (Office, Guide, Archive, Network, Referral, SilentRead, Ending, DanneMap). ESC / B / Tab now close the inventory subscreen and the reliability detail in-loop and `swallowNextInputFrame()` so the still-held key cannot re-trigger the pause panel ("THE OFFICE ROUTE IS PAUSED.").
  - `CodexScene.close()` now swallows the next input frame so a still-held ESC/Tab does not fire the pause panel in the scene it returns to. With the inventory DOM ESC listener gone, the stale `suppressEscEdgesUntilRelease` latch no longer bleeds into a freshly opened Codex, so its documented `TAB/ESC CLOSE` works.
  - `ReliabilityHud` detail panel ("REL") was a small 224x86 box while its ~17 lines of text overflowed below it onto the live scene (the reported bleed-through). Reworked into a proper modal: full-screen dim, a 236x210 framed panel, 6px body text that fits inside, a heading, and an `R / ESC CLOSE` footer. Added `hideDetails()` for the shared close path.
  - Warning screen duplicate prompt removed: the warning card PNG already carries a baked-in "PRESS A TO BEGIN" banner, and the scene drew a second prompt text on top. Removed the overlay text (and its unused field/tween); input handling and 8s auto-advance are unchanged.
  - Added `src/systems/overlayInput.test.ts` covering: no-op when no overlay open, freeze-without-close when no key pressed, ESC-close + held-edge swallow, and Tab-close of the reliability detail.
  - Verified `npm test`: 8 files / 31 tests pass; `npm run build` (tsc + vite) passes with only the pre-existing Vite chunk-size warning.

- Character sprite verification + NPC offset fix (2026-06-15):
  - Verified the ten native art-pack character spritesheets (`public/assets/art-pack/sprites/native/*.png`) are valid 128x192 RGBA images sliced into a clean 4x4 / 32x48 grid (16 cells, 15 used). Confirmed `character_anims.ts` frame indices (0-14) all stay in bounds, the boot loader filters every texture to NEAREST, and `config.ts` keeps `pixelArt`/`roundPixels` on — so the sprites themselves are not corrupt.
  - Root-caused the lingering "detached shadow / mislabelled NPC" artifact: `DanneNpc` still positioned its ground shadow at `shadowY:16` and name label at `labelY:22` even when rendering the crisp 32x48 art-pack sprite (feet sit ~5px below the container origin). Those values were tuned for the legacy scaled-down DANN-E photo fallback. `DanneNpc` now picks shadow/label offsets per render mode (art-pack: shadow y=5, label y=8 — matching `Player`/`HistorianNPC`; legacy fallback keeps the caller-supplied offsets), so the Junior Compiler and Marine Security Guard shadows stay attached to their feet.
  - `HistorianNPC` now plays `idle-down` instead of a looping `walk-down` while standing still, matching the documented idle-NPC intent.
  - Added `src/art/characterSprites.test.ts` regression suite locking the 4x4/32x48 frame grid, in-bounds + gapless animation frame indices, and role/NPC/colleague -> character-key selection.
  - Swept the live QA list (title/map clipping, character-create layout, control prompts, ESC/menu, boot loader, HUD/codex, scene re-entry, responsive/touch) and found them already correct; no further changes needed.
  - Verified `npm test`: 7 files / 27 tests pass; `npm run build` (tsc + vite) passes with only the pre-existing Vite chunk-size warning.

- Visual/gameplay polish + art pass (2026-06-15):
  - Fixed corrupted Office NPC rendering: `JuniorCompiler` and `MarineSecurityGuard` now use the crisp 32x48 character spritesheets via a new `characterKey` option on `DanneNpc` instead of scaling large photographic runtime PNGs down to noise; shadow/label offsets and NPC placement adjusted so sprites no longer overlap the desk.
  - HUD `REL` readout now shows a numeric `REL nnn%` value instead of the block-glyph meter that rendered as tofu boxes in the small monospace HUD font.
  - `InventoryOverlay` now closes on `ESC` (keyboard) in every scene, with a one-frame input swallow so the same press does not re-trigger pause.
  - Title screen: split `CONTROLS_TEXT` into two centered lines and slightly reduced the `RUBY RULE` logo size so neither the logo nor the controls bar clip at the canvas edges.
  - Character create: even 5-card layout (`startX`/`stepX`) with word-wrapped role labels, and a narrower remit wrap width so the rightmost card label ("SOURCE NOTE SPECIALIST") and descriptions no longer truncate.
  - Added an HTML/CSS `#boot-loader` shown during initial boot and dismissed once the first non-Boot scene renders (8s fallback), replacing the blank dark-maroon canvas.
  - Enlivened the Office Hub: floor checker pattern, archive runner rug, framed wall map/charts, hanging banner, stacked archive boxes, document stacks, potted plant, and a terminal desk lamp glow — all behind the player and clear of doors/interactables.
  - Incorporated the supplied DC overworld map (`public/assets/art-pack/screens/frus_world_map.jpg`, downscaled to 768x512 / ~159 KB) as a framed "FRUS PRODUCTION MAP" briefing centerpiece on the TitleScene; registered via a new `SCREENS` art registry.
  - Movement evaluated: the slow single-keypress feel is the intended hold-to-move acceleration model (speed 58, accel 720); left unchanged to avoid regressions, controls now clarify "ARROWS/WASD MOVE".
  - Fixed ESC-close pause-dialog regression: closing the inventory/menu with a still-held Escape no longer re-opens the pause dialog. `swallowNextInputFrame()` now latches `suppressEscEdgesUntilRelease` while Escape is physically held; the latch is cleared authoritatively by the Escape `keyup` listener (and on any `resetInput()`), so the synthetic `pause`/`cancel` rising edge created by zeroing `currentState` is suppressed until the key is released. Added `InputState` regression tests for the held-Escape-after-swallow case and the post-release fresh edge.
  - Verified `npm test`: 6 files / 21 tests pass; `npm run build` passes with only the pre-existing Vite chunk-size warning.

- Scene re-entry bug pass:
  - `WorldMapScene` now resets `numberKeysInstalled` on `SHUTDOWN` so the region `1`-`5` shortcuts keep working after returning from a gameplay map (previously they broke permanently on the first revisit because the keydown handler was removed but the install flag was never cleared)
  - `CharacterCreateScene.create()` now resets `roleIndex`, `displayName`, `locked`, `nameFocused`, and the `cards` array; re-entering after any ending returned the reused scene instance with `locked === true` (soft-locking confirm) and stacked duplicate role cards
  - verified `npm test`: 6 files passed, 19 tests passed; `npm run build` passes with the pre-existing Vite chunk-size warning only

- Gameplay smoothing/input pass:
  - wired `CharacterCreateScene.confirm()` to the shared confirm edge and guarded it with the existing `locked` flag
  - role cards now support first-click select and second-click/tap confirm, with a visible `PRESS ENTER / TAP AGAIN TO BEGIN` prompt
  - added a name-field focus model: clicking the name field captures typed letters/backspace, Enter blurs, and an empty typed value still confirms as `Sam`
  - expanded `InputState` with one-frame nav up/down, confirm, and cancel edges; role navigation now honors arrows and WASD
  - added a one-frame input swallow hook for the mobile `TAP TO RESUME` overlay so the dismiss input cannot fall through into gameplay
  - normalized diagonal movement speed, preserved acceleration/deceleration, and added a small corner nudge around solid tiles while keeping rendered positions pixel-snapped
  - added a 120 ms action buffer and 80 ms interaction coyote helper, then wired it into Office, Guide, Archive, DANN-E map, and gameplay-map interactions with `A:` prompts
  - added a one-time Office control card persisted via `sceneProgress.officeTutorialSeen`
  - added deterministic Vitest coverage for input edges and CharacterCreate confirm/default-name helpers
  - verified `npm test`: 6 files passed, 19 tests passed
  - verified `npm run build` with the existing Vite chunk-size warning only
  - required web-game client verified direct `CharacterCreateScene -> OfficeScene` state, though its WebGL screenshot remains black as previously documented
  - direct Phaser renderer snapshot verified the Office control-card visual at `docs/screenshots/gameplay-smoothing-character-create/clean-held-key-phaser-snapshot.png`
  - Playwright smoke verified second-click role-card confirmation and focused name typing (`Ruby`) into OfficeScene
- Extended the pixel-proof debug tooling:
  - `RenderDebugScene` now draws a 16x16 logical-pixel checkerboard at screen origin and a 1x1 red single-texel sprite at logical coordinate 0,0
  - compact on-screen readout now reports raw/rounded DPR, canvas CSS size, backing size, internal resolution, integer zoom, expected device pixels per game pixel, backing-buffer ratio, and pass/check status
  - F8 / `?pixelProof=1` DOM overlay now uses the same origin checkerboard and red single-texel proof mark
  - `pixelProofVisible` is set while the proof scene/overlay is visible
  - verified `npm test`: 4 files passed, 14 tests passed
  - verified `npm run build` with the existing Vite chunk-size warning only
  - required web-game client reached `RenderDebugScene` and produced valid `render_game_to_text()` state, but its WebGL screenshot remains black as in earlier local capture runs
  - direct Playwright DPR-2 verification: CSS canvas 768x720, backing 1536x1440, computed integer zoom 3, rounded DPR 2, and the red 1x1 origin texel measured exactly 6x6 device pixels (`zoom * round(dpr)`)
  - checkpoint screenshots: `docs/screenshots/pixel-proof-render-debug-dpr2.png`, `docs/screenshots/pixel-proof-origin-dpr2.png`
- Added integer-zoom enforcement for the WebGL/AUTO renderer path:
  - created `computeIntegerZoom(viewW, viewH)` and `applyIntegerZoom(game)` in `src/systems/pixelPerfect.ts`
  - `applyIntegerZoom()` sets Phaser scale zoom, CSS canvas size, backing-buffer size using rounded DPR, WebGL viewport/projection, and active camera viewports while keeping the logical game size at 256x240
  - wired `src/main.ts` boot, resize, orientation, and visual-viewport refresh paths to call the helper and feed `MobileDebugMetrics` (`computedZoom`, `integerZoomTarget`, `integerZoom`, DPR, CSS size, and backing size)
  - verified `npm test`: 4 files passed, 14 tests passed
  - verified `npm run build` with the existing Vite chunk-size warning only
  - verified a browser smoke at `?scene=OfficeScene&role=compiler&name=Ruby`: CSS 768x720, backing 768x720 at DPR 1, logical game size 256x240, WebGL renderer, full-frame render restored after the backing-buffer change
  - checkpoint screenshot: `docs/screenshots/integer-zoom-smoke.png`
- Handed final shell sizing to the integer-zoom JS:
  - changed `#game-shell` from fixed 768x720 CSS dimensions to `width: auto; height: auto`
  - preserved `max-width: 100vw` and `max-height: 100dvh`
  - added an explicit `#game-shell canvas` nearest-neighbor rendering rule
  - verified `npm run build`
  - verified direct browser metrics at `?scene=OfficeScene&role=compiler&name=Ruby`: shell and canvas settle at 768x720 CSS with 768x720 backing at DPR 1 and WebGL still renders full-frame
- Added explicit camera/entity pixel snapping for smooth movement:
  - set `cameras.main.roundPixels = true` in `BootScene`
  - added `snapRenderedPosition()` and `setRenderedPosition()` to `src/systems/smoothMovement.ts`
  - routed Player, Enemy base, DANN-E NPCs, production colleagues, and historian NPC tween updates through the render-position snapping helpers
  - UIScene now refreshes active camera viewports through `applyIntegerZoom()` when active scene membership changes, so newly started scenes inherit integer backing-buffer camera sizes
  - verified `npm test`: 4 files passed, 14 tests passed
  - verified `npm run build`
  - verified Office simultaneous Right+Down input across 36 animation frames: sprite, shadow, state, and camera coordinates stayed integer with zero fractional samples
  - verified NARA Stacks drone diagonal/hover movement across 48 animation frames: 4 drones, zero fractional rendered coordinates, `cameraRoundPixels === true`
  - checkpoint screenshots: `docs/screenshots/diagonal-pixel-snap-smoke.png` and `docs/screenshots/diagonal-enemy-pixel-snap-smoke.png`
- Added Kellogg-standard damage as Zelda-like reliability heart loss:
  - created `src/systems/standardsDamage.ts` with typed standard violations, damage values, plain-English labels, excision-specific damage, and clamped reliability math
  - added `applyStandardsViolation()` to the reliability system so damage updates state, plays warning audio, and keeps quest readouts fresh
  - wired standard violations into process-wall contact, unsafe network routing, unchecked referral decisions, and unbracketed excision choices
  - surfaced standard labels in dialog for unsafe routing/referral/excision outcomes
  - verified `npm run build` passes with the existing Vite chunk-size warning only
  - verified with the required web-game Playwright client at `?scene=ReferralVaultScene`: unsafe manifest acceptance opens a `STANDARD VIOLATION` dialog and `render_game_to_text()` reports the concealed-policy-defect reliability debit
- Added Zelda-like workflow action gating:
  - extended `src/game/documentWorkflow.ts` with `ACTION_REQUIRED_ITEM`, `canPerformAction()`, and `tryWorkflowAction()`
  - mapped citation verification, referral, clearance, excision, proofing, and publication actions to the matching FRUS process items from `ITEM_REGISTRY`
  - routed `advanceDocumentWorkflow()` and exported workflow helper functions through `tryWorkflowAction()`
  - missing tools now leave the document unchanged and push a locked reason into `latestMessage` and the HUD objective
  - verified `npm run build` and a required web-game smoke at `?scene=ArchiveScene`
- Added ALttP-style dungeon key state for FRUS chapter compilation:
  - created `src/systems/dungeonKeys.ts` with `DungeonState`, small-key helpers, big-key/boss-door checks, and boss-completion checks
  - persisted `Record<AreaId, DungeonState>` in `GameState`, with reset/restore normalization for old saves
  - document sub-task state changes such as source-note discovery and citation verification now earn chapter small keys and reveal the chapter map/compass
  - process-item rewards mark each chapter's big key, process stamps mark the matching chapter boss hurdle complete, and DANN-E defeat completes the Buckram Gate dungeon
  - `render_game_to_text()` now exposes dungeon state and room-graph locked-exit gate status
  - verified `npm run build` and a required web-game smoke at `?scene=ArchiveScene`; state showed `archive_cavern.smallKeys: 1` and locked-exit readiness
- Added progressive ALttP-style overworld traversal gates:
  - added `canTraverseExit(roomId, direction, inventory)`, `blockedExitPrompt()`, and shortcut reveal helpers to `src/game/questArchitecture.ts`
  - updated `FRUS_ROOM_GRAPH` so Citation Stamp opens Archive source-note shortcuts, Clearance Token opens the red vault exit, Concurrence Slip opens the referral handoff, Red Pencil gates the editor/proof handoff, Proof Lens opens the proof-chamber shortcut, and Buckram Key remains the publication gate
  - routed Archive, Network, Referral Vault, and Silent Read exits through the shared traversal helper with Zelda-style prompts such as `You need the Clearance Token.`
  - newly acquired process tools now add their corresponding shortcut rooms to traversal reveal state and `render_game_to_text().roomGraph`
  - verified `npm run build`, required web-game Playwright smoke at `?scene=ArchiveScene`, and in-app browser local load with no console errors; room graph reported item-gated prompts and immediate Citation Stamp shortcut readiness
- Started `feature/wire-16bit-sprites` Phase 0 from `main`.
- Audited current character sprite wiring against `public/assets/art-pack/MANIFEST.md`:
  - all ten canonical 16-bit character PNG sheets exist under `public/assets/art-pack/sprites/`
  - live code still loads/renderers character art through SVG stills and manual texture-frame registration
  - no direct `this.load.image/spritesheet/atlas(...)` or `anims.create(...)` calls currently exist for character art in `src/`
  - documented the required path, key, frame, and entity wiring changes in `docs/art/sprite_audit.md`
  - verified `npm run build` and captured the current baseline at `docs/screenshots/16bit-wire-phase0.png`
- Completed `feature/wire-16bit-sprites` Phase 1 central loading:
  - generated native 128x192 versions of all ten art-pack character sheets under `public/assets/art-pack/sprites/native/`
  - added `src/art/characters.ts` with the canonical character key registry and `CHARACTER_FRAME` set to 32x48
  - called `preloadCharacters(this)` from `BootScene` and logged each loaded texture's source size and frame size on loader completion
  - confirmed all ten logs report `source 128x192; frame 32x48`
  - found no old placeholder character PNGs outside the art pack to move; SVG fallbacks remain for later phases until entity constructors are swapped
  - verified `npm run build` and captured `docs/screenshots/16bit-wire-phase1.png`
- Completed `feature/wire-16bit-sprites` Phase 2 animation centralization:
  - added `src/art/character_anims.ts` with the manifest frame-order map and generated idle/walk/interact/reading/approval animations for all ten canonical character keys
  - registered character animations from `BootScene` after textures are available
  - updated `Player`, `HistorianNPC`, and `ProductionColleague` to prefer the art-pack 32x48 spritesheets while retaining SVG fallbacks
  - updated the player foot collision readout/box to a small 16x8 bottom-foot area for the taller sheet
  - updated `render_game_to_text()` so `activePlayerSprite` reports `mode: artPack32x48`, the canonical texture key, and 32x48 frame metadata
  - verified `npm run build` and captured `docs/screenshots/16bit-wire-phase2.png`
- Scaffolded a Vite + TypeScript + Phaser 3 app in `ruby-rule-frus-quest`.
- Added a role-crafting flow so players can choose a FRUS production role before entering the office.
- Added generated placeholder pixel textures for characters, tiles, UI panels, documents, and the FRUS volume.
- Implemented title, character creation, office hub, archive verification, network routing, referral vault, silent read, and ending scenes.
- Adjusted the character creator so typed names can use all letters while role selection stays on Left/Right.
- Ran `npm install` successfully; npm reported two moderate audit findings in dependencies.
- Ran `npm run build` successfully; Vite reported a large Phaser chunk warning only.
- Switched Phaser to the Canvas renderer after Playwright showed black WebGL canvas captures.
- Fixed title-screen start handling so early key presses are not consumed.
- Verified with Playwright screenshots/state:
  - title to character creator
  - default role confirmation into OfficeScene
  - custom role/name confirmation into OfficeScene
  - office interaction chain into ArchiveScene
  - archive document collection and Source Note 47 verification, raising reliability from 80 to 90
- Added process stamps for Rule, Source, Network, Referral, and Read milestones.
- Added role-specific `E` abilities with visible NES-style hint banners.
- Added direct scene-start query parameters for QA, with seeded prior progress.
- Improved choice prompts with full-row click targets.
- Verified direct scene starts with Playwright screenshots/state:
  - NetworkScene routing clears and awards the Network stamp.
  - ReferralVaultScene equity matching, human manifest confirmation, and visible excision award the Referral stamp.
  - SilentReadScene factual-date catch awards the Proof/Read stamp.
  - Declass Reviewer `E` ability displays an Equity Map hint and updates `render_game_to_text`.
- Added generated Web Audio chiptune music and feedback:
  - scene background patterns
  - dialog blips
  - decision confirm chimes
  - warning tones
  - process-stamp jingles
  - ending fanfare
- Reworked EndingScene into a completion card showing role, reliability, process stamps, team sign-off, and the core FRUS production lessons practiced.
- Verified the EndingScene recap with Playwright screenshot/state; `audioStatus` reported `ending fanfare`.
- Re-verified NetworkScene routing after audio integration; `audioStatus` reported `process stamp chime`.
- Added original repository-local SVG pixel assets for player roles, NPCs, manuscript, FRUS volume, room tiles, and UI panels.
- Updated BootScene to load SVG assets first and fall back to generated textures if an asset is missing.
- Added `N` sound toggle during title/gameplay/ending screens, plus an `SND ON/OFF` HUD label.
- Verified OfficeScene renders the SVG assets in Playwright; state reported `audioStatus: music OfficeScene`.
- Verified `N` toggle in NetworkScene; HUD showed `SND OFF` and state reported `audioStatus: audio muted`.
- Added reusable room-dressing helpers for desks, bookcases, document stacks, ruby FRUS volume stacks, archive shelves, network cables, vault blocks, proofing tables, and small sparkle effects.
- Added player shadow, facing flip, and simple walk-bob movement polish.
- Dressed the Office, Archive, Network, Referral Vault, and Silent Read scenes with workflow-specific visual cues.
- Verified dressed OfficeScene, NetworkScene, and SilentReadScene with Playwright screenshots/state.
- Added a stronger ruby-red FRUS buckram/NES adventure aesthetic:
  - top HUD band with minimap, item boxes, and life markers
  - one-screen dungeon wall framing around playable rooms
  - richer 16x16 tile SVGs for office, archive, network, and vault rooms
  - parchment wall maps as room dressing
  - title-screen HUD/map/stone-frame treatment
- Added original `bureaucratic-wall` enemy sprite plus Phaser fallback texture.
- Added literal stone bureaucracy enemies in Archive, Network, and Referral Vault rooms; archive walls can be cracked and cleared by interaction.
- Downloaded public-domain MIDI source clips into `public/assets/audio/midi/` and added `public/assets/audio/ATTRIBUTION.md`.
- Reworked scene music to use short Web Audio motifs derived from the public-domain Bach/Satie MIDI clips.
- Added active stonewall pressure mechanics:
  - archive bureaucratic walls patrol toward the player when nearby
  - contact knocks the player back and reduces reliability
  - nearby `Space`/`Enter` verification cracks and clears a wall
  - `render_game_to_text()` now reports `visibleThreats` with stonewall labels and coordinates
- Added NES cave/dialogue-inspired `GuideScene` with original Ruby Rule art:
  - equal-rank Archive Colleague NPC
  - archive lamp props
  - Citation Stamp pickup
  - first FRUS volume fragment pickup
  - Verification Gate into the Office hub
  - visible 30-Year Line and DANN-E Queue antagonists
- Added document points and FRUS volume fragments to global state, inventory, `render_game_to_text()`, direct-scene seeding, and the ending recap.
- Recast Zelda-like symbols into FRUS production equivalents: citation stamp, clearance token, concurrence slip, red pencil mark, source-note/document points, confidence status, and FRUS volume fragments.
- Updated the archive-room tutorial for equal-rank framing:
  - uses an Archive Colleague as a peer NPC
  - uses Archive Room as the visible room title
  - verified the citation-stamp pickup after the rename
- Sharpened the human character sprite set with more expressive 16x16 pixel portraits:
  - added clearer hairlines, face detail, arms, shoes, and role props
  - refined Sam, Elena, Marcus, Priya, all selectable player-role sprites, and the Archive Colleague
  - updated BootScene fallback character textures to match the more detailed silhouette
  - slightly enlarged role-card previews in the character creator so the refined sprites read at game scale
- Added a second sprite polish pass:
  - sharpened manuscript, citation stamp, volume fragment, FRUS volume, and bureaucratic-wall SVGs
  - added stepped idle bob/shadow motion to NPCs, manuscript pickups, the Archive Colleague, and guide-room collectibles
- Added the new FRUS production SOP around an AI annotation review tool:
  - introduced an in-game SOP gate in `SilentReadScene`
  - the AI tool returns a schema-style review plan, not a publication decision
  - mechanical issues can auto-apply, while source/status/provenance/classification claims route comment-only to human review
  - added a `SOP` process stamp, inventory log, README coverage, and ending recap language
- Added a final FRUS cover prize system:
  - created an original ruby-and-gold cover sprite inspired by FRUS volume design
  - mapped the five existing FRUS fragments to cover regions
  - updated the ending scene so the earned fragments assemble into the final cover prize
  - added `render_game_to_text().frusPrize` for QA and accessibility
- Verified the FRUS cover prize:
  - `npm run build` passed with the existing Phaser chunk-size warning
  - Playwright direct `EndingScene` screenshot showed the assembled cover and all process stamps
  - `state-0.json` reported `frusPrize.assembled: true` with five earned pieces
  - in-app browser screenshot rendered the local ending page without console errors
- Added an asset-cleanup pass for the existing SVG image set:
  - confirmed there are no PNG assets in the current game art set
  - backed up current SVG sprites, tiles, and UI panels to `public/assets/_originals/`
  - snapped off-palette SVG colors back to the existing game palette
  - replaced soft SVG text/circle/stroke elements with rect-only pixel forms
  - added `public/assets/asset_improvement_report.md`
  - added `public/assets/asset_debug.html` for original/current comparisons
- Added `scripts/improve-existing-assets.py` for future PNG cleanup:
  - walks `public/assets/` while excluding `_originals`
  - backs up PNGs under `public/assets/_originals/`
  - thresholds alpha, quantizes visible pixels to the Ruby Rule PNG palette, and writes `asset_improvement_report.md`
  - package script added as requested: `npm run improve:assets`
- Audited and fixed existing image rendering:
  - made Phaser pixel-art settings explicit with antialiasing disabled and rounded pixels
  - constrained the game shell to whole-number display scaling when the viewport allows it
  - rounded sprite/container render positions and removed fractional sprite scale animations
  - expanded CSS pixel-rendering coverage for canvas, images, game containers, `#game`, and `#app`
  - added `RenderDebugScene` at `?scene=RenderDebugScene` with live canvas/scale metrics and 1x/2x/3x/4x samples
  - verified the debug scene in the in-app browser at 256x240 internal resolution displayed at a clean 3x integer scale
- Improved the existing sprite sheets only:
  - treated each SVG loaded in `BootScene.preloadSvgAssets()` as a one-frame sheet and preserved every frame size/order
  - normalized all used sprite colors to the Ruby Rule project palette
  - removed off-palette colors and confirmed no semi-transparent sprite pixels/opacity attributes remain
  - strengthened implied outlines and contrast without adding characters, frames, or animation states
  - rebuilt `public/assets/asset_debug.html` as a sprite-only before/after viewer with originals from `_originals/sprites/`, current sprites at 4x, and a checkerboard toggle
  - verified CharacterCreateScene, GuideScene, EndingScene, and the comparison page with browser/Playwright screenshots
- Improved existing tilesets and HUD icons without changing meanings:
  - preserved the four 16x16 tile texture files and the three 32x16 UI/HUD SVG paths
  - cleaned tile/UI colors to the Ruby Rule project palette, with no opacity attributes or non-rect primitives
  - made office/archive/network/vault walkable floor repeats quieter while keeping crisp 16x16 boundaries
  - made the procedural HUD item boxes and dungeon blocking blocks read with stronger silhouettes at native scale
  - confirmed the repo still uses direct SVG texture keys and no atlas/tilemap ID references
  - verified OfficeScene, ArchiveScene, NetworkScene, and ReferralVaultScene with Playwright screenshots/state plus an in-app browser canvas/log check
- Improved interactable object readability:
  - added distinct 24x24 pixel silhouettes for citation stamp, FRUS volume fragment, telegram, source note, cross-reference, OpenNet terminal, ClassNet terminal, proof page, red pencil, and concurrence slip
  - preserved existing labels as secondary reinforcement while making the objects readable by shape and palette at native game scale
  - updated loader dimensions, fallback stamp/book textures, debug comparison metadata, and terminal/document entity texture selection
- Added role-specific character cue and animation polish:
  - updated the five selectable role sprites with cardigan/folder/glasses, mug/clipboard, pencil-behind-ear, two-page stack, and citation-stamp satchel cues
  - renamed the visible declassification role label to Declass Coordinator while preserving the existing internal role id
  - added pixel-snapped idle cues for folder checking, mug steam, pencil tapping, proof page reading, and stamp bouncing
  - expanded the shared `E` ability into visible role-specific bursts for Archive Sense, Equity Map, Red Pencil, Silent Read, and Provenance Check
- Added physical verification loops in `SilentReadScene`:
  - replaced the old multiple-choice SOP/proof gates with CARRY, ROUTE, VERIFY, and STAMP interactions
  - StateChat now emits one mechanical proposal plus four evidence-bound physical flags
  - flags must be carried to OpenNet, ClassNet, editor desk, referral tray, or proof table before human verification and visible process stamping
  - `render_game_to_text()` now reports physical verification verb, carried item, nearest station, completion count, and per-flag status
  - verified with Playwright: direct SilentReadScene smoke test shows the CARRY state, and full route test stamped all five flags with no console errors
- Added a production status HUD:
  - top-right HUD now renders `ROLE`, block-style `RELIABILITY`, `HELD`, `STAMPS`, and `OBJECTIVE` lines
  - process stamps display as RULE, SOURCE, NET, REF, SOP, and READ
  - added `heldItem` and `productionHud` to `render_game_to_text()`
  - Archive Source Note 47 now sets held item and the objective `Verify provenance at research table.`
  - verified Archive and SilentReadScene HUD screenshots/state with Playwright and no console errors
- Improved sprites, art readability, and verification gameplay:
  - added original 24x24 agency equity seal, referral manifest, and excision bracket marker SVG sprites
  - added subtle 2x2 buckram texture to FRUS volume covers and ruby vault tiles
  - replaced referral-room label-only seal/manifest placeholders with loaded sprite silhouettes
  - added a two-step walk cue and role-ability pose pulse to the player sprite system
  - converted Archive Source Note 47 into a physical carry, route, verify, stamp loop at the research table
  - Source Note 47 now receives its citation stamp only after human provenance verification
  - changed Office terminal dialog labels so StateChat remains terminal-only rather than a speech-bubble speaker
  - added exact feedback messages for human verification, mechanical acceptance, evidence-bound checks, wrong network, and provenance guessing
- Added mobile-friendly play support:
  - added safe-area viewport handling and a responsive game shell that reserves space for touch controls
  - added a pixel-styled on-screen D-pad plus A/E/M/R/N buttons for act, ability, inventory, reliability, and sound
  - bridged touch buttons into Phaser key codes while preserving keyboard controls
  - kept player movement pixel-snapped by feeding D-pad state into the existing player movement code
  - verified `npm run build`, the required web-game Playwright client, mobile portrait touch movement, mobile landscape layout, and a mobile title/character-create flow
- Refactored Archive movement and traversal toward NES-style one-screen rooms:
  - made player movement cardinal-only with no diagonal vector normalization
  - added optional tile-aligned solid rectangles for smoother movement with tile-feeling collision
  - converted ArchiveScene into a 2x2 room graph with stable room IDs `A1`, `A2`, `B1`, and `B2`
  - added fixed-HUD room labels and a small visited-room minimap that reveals rooms after entry
  - added edge exits at the room borders with hard-cut/fade transitions and no scrolling camera
  - preserved the Source Note 47 human verification loop in `A1`
  - verified `npm run build`, required web-game smoke, `A1 -> A2`, `A1 -> B1`, cardinal-only input, tile blocker collision, minimap visited-state, and Source Note 47 stamping
- Added process-wall enemy archetypes and defeat loops:
  - implemented NO REPO, FIREWALL, PENDING, WAIT, AMBIGUOUS, and DANN-E QUEUE as named bureaucratic stone-wall threats
  - added per-enemy behaviors: slow chase, terminal-door block, random wander, temporary exit freeze, split flags, and backward push
  - wired defeat methods to existing human-process stations: source table/citation stamp, OpenNet routing, referral tray, human specialist, and Golden Rule gate
  - extended `render_game_to_text()` threat output with behavior, defeat method, and status fields
  - fixed Archive room traversal blockers so A1 east, B1 north/center, A2 south, and B2 north lanes stay playable
  - verified with `npm run build`, required web-game client smoke, and a custom Playwright route probe covering all six enemy loops with screenshot inspection
- Added FRUS process item toolbelt:
  - added a shared seven-item catalog for Citation Stamp, Red Pencil, Review Folder, Clearance Token, Concurrence Slip, Proof Lens, and Buckram Key
  - exposed each item's Zelda-like function and FRUS meaning in `render_game_to_text()`
  - added new original 24x24 SVG sprites for Review Folder, Clearance Token, Proof Lens, and Buckram Key
  - changed the inventory overlay into a compact FRUS toolbelt readout with acquired/locked item states
  - wired item acquisition to existing loops: source-note locks, network/vault access, referral gates, Silent Read review routing, and final publication certification
  - verified `npm run build`, required web-game smoke, Silent Read carry state (`Review Folder: MECH FIX`), inventory overlay screenshot, direct scene item progression, and EndingScene Buckram Key rendering
- Added Zelda-like item gating metadata:
  - promoted the seven FRUS tools into an item registry with `displayName`, `icon`, `roomUnlocks`, `blockerWeaknesses`, `pickupDialog`, and `hudSlot`
  - added registered item award/readout helpers so the text renderer exposes unlock and blocker-weakness data
  - wired the fixed top HUD to show a compact collected-item strip across scenes
  - verified `npm run build`, required web-game client SilentReadScene screenshot/state, and a direct Playwright probe checking all seven registry entries, unique HUD slots, and EndingScene Buckram Key acquisition
- Added Zelda-like area progression:
  - added an area registry for Office Hub, Archive Cavern, Two Networks, Referral Vault, Editor's Labyrinth, Silent Read Tower, and Buckram Gate with Zelda-role and reward metadata
  - changed the start flow to Character Create -> Office Hub -> Archive Cavern -> Archive rooms, matching the requested progression
  - moved Red Pencil and Proof Lens from pre-granted Silent Read tools into earned dungeon rewards
  - exposed `areaProgress` and `currentArea` through `render_game_to_text()` and added a compact quest-route readout to the inventory overlay
- Completed mobile Phase 3 input architecture:
  - added `src/input/InputState.ts` as the single keyboard/touch/pointer/gamepad input adapter
  - moved gameplay scenes to `tickInput()` plus `getInput()` at the top of `update()`
  - removed direct `input.keyboard`, `Phaser.Input.Keyboard`, `KeyboardMap`, and pointer event reads outside `src/input/`
  - rewired touch buttons away from synthetic `KeyboardEvent`s and into shared touch state
  - preserved character-name typing by separating role-card navigation from WASD letter typing
  - verified `npm run build`, required web-game client input bursts, GuideScene movement/pickup, in-app browser canvas load, and iPhone/Pixel portrait/landscape screenshots
- Completed mobile Phase 4 touch controls and audio start gate:
  - added `TapToStartScene` so first tap/press unlocks and pre-warms the Web Audio context before TitleScene
  - added `UIScene` plus `src/input/TouchControls.ts` for a canvas-drawn floating D-pad, A/B/Start/Select buttons, haptic press feedback, and F10 force-show debug toggle
  - routed touch through direct canvas pointer listeners inside `src/input/` so D-pad and A can be held simultaneously without synthetic keyboard events
  - kept controls semi-transparent at rest, brighter/compressed on press, and scene-independent through the overlay scene
  - verified `npm run build`, a Playwright tap-gate/control probe, `GuideScene` A/dialog advance, D-pad movement north from `y=160` to `y=113`, held D-pad plus A state, video capture, in-app browser no-console-error smoke, and iPhone/Pixel portrait/landscape Playwright device-profile screenshots
  - noted that real-device QA remains for Phase 10; Phase 4 artifacts are local/emulated-device verification
  - verified `npm run build`, required web-game client OfficeScene screenshot/state, and a direct Playwright probe covering route order, direct-scene seeding, reward gating, and Buckram Gate completion
- Refined the NES-style dungeon grammar:
  - added a shared FRUS room graph with stable room IDs, room types, locked exits, required items, secret rooms, and Buckram Gate metadata
  - expanded Archive Cavern into a 12-room one-screen dungeon with hint rooms, puzzle chambers, reward rooms, two hidden rooms, and a DANN-E Queue boss gate
  - updated player movement so keyboard and touch input are four-direction-only, prefer the newest held direction, and expose a facing direction in text state
  - made FIREWALL a horizontal patrol and added a HOLD doorway blocker, while preserving existing wall enemy identities
  - changed the production HUD toward NES grammar with role, reliability, document points, selected item, stamps, room/map, fragments, and objective
  - added final Buckram Gate readiness checks for required stamps, five FRUS fragments, and reliability, with StateChat limited to a checklist
  - verified `git diff --check`, `npm run build`, the required web-game client smoke, Archive screenshot/state, and direct EndingScene readiness screenshot/state
- Enforced stricter NES visual discipline:
  - added `src/art/palette.ts` as a single 56-color NES-style master palette and wired the semantic game palette to it
  - remapped every SVG under `public/assets` to master-palette colors, with sprite SVGs capped at 3 visible colors plus transparency and 16x16 tile SVGs capped at 4 visible colors
  - removed SVG gradient/opacity risk and flattened BootScene fallback fills/strokes to fully opaque master-palette colors
  - removed old hardcoded `0x` color literals and partial-alpha generated fills from shared UI/entity drawing paths
  - replaced the fractional-scale HUD item sprites with native pixel text markers so sprite rendering stays integer-scaled
  - verified SVG discipline, `git diff --check`, `npm run build`, all ten `?scene=` deep links, and the required web-game client Archive screenshot/state
- Implemented a compact Zelda-style FRUS Quest architecture layer:
  - added explicit volume/document workflow states, volume metrics, fixed object slots, tile-grid room definitions, NPC behavior states, tool-priority rules, and quest milestone counters
  - exposed the architecture through `render_game_to_text()` as additive `volumeWorkflowState`, `documentWorkflow`, `volumeMetrics`, `questCounters`, and `questWorkflow` fields without removing existing keys
  - kept the current scene art/mechanics intact while making the existing room graph, item gating, physical verification loops, and StateChat terminal rules inspectable as data
  - added half-tile movement correction for cardinal player movement when the player catches a solid edge
- Incorporated a dedicated Compiler animation strip:
  - added an original repository-local 32x48 SVG frame set for idle, four-direction walking, and document reading
  - registered named compiler frames at boot while preserving the existing 32x32 role sprite and generated fallback path
  - updated the player renderer so only the Compiler role swaps to the taller frame set, with `render_game_to_text()` reporting the active frame metadata
  - verified `npm run build`, compiler OfficeScene movement screenshots/state, the document-reading ability frame, RenderDebugScene samples, all ten `?scene=` deep links, and the in-app browser local smoke view
- Refined the architecture object registry around a fixed `GameObjectSlot` union:
  - added named screen slots for player, four NPCs, active/secondary tools, five document slots, room rewards/gates, terminal, manuscript, transition marker, UI prompt, and reserved capacity
  - changed quest object registry rows from numeric slots to named slot assignments while preserving object kind, room, position, rewards, and gate metadata
  - updated `render_game_to_text().questWorkflow.architecture.objectRegistry` to report per-screen slot occupancy, slot order, catalog size, and active room slots
- Added a lightweight runtime `QuestObject` shape:
  - includes `id`, named `slot`, `kind`, pixel `x/y`, optional four-way `facing`, optional `state`, and active/interactable booleans
  - derives `activeQuestObjects` from the architecture registry plus live player position/facing for `render_game_to_text()` consumers
  - verified `npm run build`, `git diff --check`, and an ArchiveScene browser text-state probe
- Built a data-driven FRUS document workflow state machine:
  - added `ReviewStatus`, `AgencyEquity`, and `DocumentCandidate` types plus a transition table covering found, candidate, selected, source-note, citation, annotation, review, referral, clearance/excision/denial/appeal, proof, and publication states
  - added `src/game/documentWorkflow.ts` with five seeded FRUS-like document candidates and reducer helpers for workflow actions, direct state transitions, and agency equity responses
  - made `gameState.documentCandidates` the source of truth for `documentWorkflow`, volume metrics, counters, and `render_game_to_text().questWorkflow`
  - wired Archive pickup/provenance, Network routing, Referral equity/excision, Silent Read proofing, and Ending publication into the workflow helpers
  - expanded `public/assets/data/items.json` to mirror the document-candidate metadata loaded by BootScene
- Started `feature/mobile-snes-quality` Phase 0 from updated `main`:
  - confirmed the current base resolution remains 256x240 with Canvas renderer, `pixelArt: true`, `roundPixels: true`, antialiasing disabled, `Phaser.Scale.FIT`, and `zoom: 3`
  - added a hidden `?mobileDebug=1` / F11 debug HUD reporting FPS, pointer latency probe, pointer count, DPR, canvas CSS/backing size, computed zoom, integer-zoom status, and first-frame timing
  - audited direct keyboard/pointer/touch paths and recorded that input still bypasses a unified `src/input/` architecture
  - audited fixed-pixel HUD/dialogue/menu surfaces and the current HTML/CSS mobile shell
  - measured local Vite preview under Playwright iPhone 14 Pro and Pixel 7 portrait/landscape profiles, captured screenshots and recordings, and documented the fractional zoom failure in `docs/mobile/baseline.md`
  - verified `npm run build` after adding the debug HUD; only the existing Phaser chunk-size warning remains
- Completed `feature/mobile-snes-quality` Phase 1 render lock:
  - kept the sacred 256x240 base resolution while forcing the displayed game shell to whole-number CSS zoom only
  - added a resize/orientation guard that refreshes Phaser scale and corrects canvas CSS drift if computed zoom differs from the integer target by more than 0.001
  - added a `?pixelProof=1` / F8 checkerboard, diagonal-line, and stripe overlay for visual pixel proof
  - extended the debug HUD with integer target zoom, proof-overlay status, and guard correction count
  - converted a few debug/gallery/prop fractional scales to 1x, leaving the compact character-create thumbnails for a later UI redesign
  - verified local preview mobile profiles for iPhone 14 Pro and Pixel 7 portrait/landscape; all reported 256x240 CSS canvas, 256x240 backing store, computed zoom 1.000, integer zoom true, and zero console errors
  - verified the in-app browser at a desktop-style viewport reports a 512x480 canvas for a 2x shell with the proof overlay visible
  - verified `npm run build`; only the existing Phaser chunk-size warning remains
- Completed `feature/mobile-snes-quality` Phase 2 mobile shell:
  - updated viewport/PWA meta tags, black theme color, Apple status-bar behavior, and telephone-format detection
  - moved the outer shell to black `100dvw`/`100dvh` with hidden overflow, no overscroll, no selection, no tap highlight, and safe-area padding
  - added dynamic viewport CSS vars, debounced resize/orientation refresh, and visualViewport resize handling before reapplying the integer zoom guard
  - added canvas-only `touchmove` prevention while leaving body touchmove uncanceled by JavaScript
  - added a dismissible iOS Add-to-Home hint and Android/Chrome fullscreen affordance
  - verified iPhone 14 Pro and Pixel 7 portrait/landscape profiles: integer zoom stayed true, iOS hint appeared only on iPhone profiles, fullscreen affordance appeared only on Pixel profiles and hid after tap, canvas touchmove was prevented, body touchmove was not, and console errors stayed at zero
  - verified the in-app browser reports the updated viewport meta, hidden overflow, `touch-action: none`, and a clean 2x integer shell
  - added exact `TILE_SIZE`, `HALF_TILE`, and `PLAYER_GRID_CORRECTION` exports to the quest architecture layer
  - verified `npm run build`, `git diff --check`, direct scene text-state probes, and the bundled web-game Playwright client with screenshot inspection
- Added a sixth seeded document candidate:
  - inserted `doc-001`, a fictional 1969 memorandum of conversation on alliance consultation, into `src/game/documentWorkflow.ts` and `public/assets/data/items.json`
  - mapped it to Archive A1 as a found, unselected candidate with incomplete citation, annotation needed, low sensitivity risk, and a fictional defense equity response pending
  - verified `npm run build`, `git diff --check`, and an ArchiveScene browser text-state probe showing six document candidates
- Added named document workflow API helpers:
  - exported `markAsCandidate`, `selectDocument`, `verifyCitation`, `addAnnotation`, `submitForReview`, `routeReferral`, `resolveReview`, `markReadyForProof`, `proofDocument`, and `publishDocument` from `src/game/state.ts`
  - kept the functions thin over the reducer-backed state machine so callers update document candidates, workflow readouts, metrics, and event logs consistently
  - changed ready-for-review transitions to clear `annotationNeeded`, matching `addAnnotation()` semantics
  - verified `npm run build` and `git diff --check`
- Converted interaction tools into prioritized FRUS workflow tools:
  - added the `WorkflowTool` union for Citation Stamp, Source Note Card, Cross-Reference Thread, Referral Manifest, Excision Bracket Marker, Red Pencil, Proof Lens, and Buckram Key
  - added `src/game/workflowTools.ts` with the fixed priority order, display metadata, target kinds, and an interaction resolver
  - replaced architecture tool-priority rules with the eight scholarly workflow tools in priority order
  - exposed `workflowTools` in `render_game_to_text()` and `questWorkflow`, including acquired/locked status
  - updated the inventory overlay to show `WORKFLOW TOOLS` instead of older process-item/gate rewards
  - switched ArchiveScene's interaction loop to resolve the nearest interaction through the workflow-tool priority order and show the selected tool cue
  - verified `npm run build`, `git diff --check`, direct browser state probe for the exact priority order, and the bundled web-game client with screenshot inspection
- Began the SNES/16-bit FRUS Quest visual upgrade while preserving the static Phaser/Vite workflow architecture:
  - added original local SVG assets for a compact FRUS world atlas, a workflow-tool relic strip, and five 32x32 role portrait sprites
  - added `src/game/snesAtlas.ts` so `render_game_to_text()` reports the SNES art-direction constraints, role portrait sprites, map areas, and workflow relics
  - added `src/systems/snesPixelArt.ts` for raised floor layers, room shadows, buckram texture, atlas panels, and workflow relic displays drawn with crisp pixel geometry
  - wired the new 32x32 role portraits into character creation while keeping existing 16x16 gameplay sprites and animation cues intact
  - added the FRUS atlas/tool display to the title screen and richer 16-bit room layers to Office Hub, Archive Cavern, Two Networks, Referral Vault, and Silent Read
  - added explicit `E1` Editor's Labyrinth and `S1` Silent Read Tower map nodes so every named quest area has atlas room IDs
  - verified `npm run build`, `git diff --check`, title/character/room screenshots through the bundled web-game Playwright client, and all ten `?scene=` deep links with no console errors
- Expanded the SNES/16-bit map pass with area-specific production maps:
  - added original 80x56 SVG panels for Office Hub, Two Networks, Referral Vault, Editor's Labyrinth, Silent Read Tower, and Buckram Gate
  - promoted those maps into the SNES atlas registry so `render_game_to_text().snesAtlas.maps` reports a `mapTexture` for every named FRUS quest area
  - updated BootScene to preload every map panel and generate palette-safe fallback textures if any SVG is missing
  - wired visible area maps into Office Hub, Two Networks, Referral Vault, and the Buckram Gate lock screen while leaving the dense Silent Read proof pages uncluttered
  - verified `git diff --check`, `npm run build`, web-game screenshots for Office/Network/Referral/Silent Read, an in-app browser no-console-error canvas check, and all ten `?scene=` deep links with 13 SNES assets and seven map textures reported
- Promoted the larger SNES role sprites into live gameplay:
  - added `snesSpriteKey` to the player profile and made query-selected roles preserve both the 16x16 fallback key and the 32x32 SNES role key
  - switched the Player renderer to use the 32x32 SNES role sprite when available, with a foot-point origin so movement, collision, interaction, and text-state coordinates keep the existing logical anchor
  - resized the player shadow, walk feet, and role idle cue overlays for the larger sprites while keeping the existing 16x16 fallback path intact
  - exposed `render_game_to_text().activePlayerSprite` with the SNES texture, fallback texture, dimensions, logical anchor, and collision-box summary
  - verified `git diff --check`, `npm run build`, bundled web-game screenshots for Office/Archive/Network/Silent Read, a `role=compiler` deep-link probe showing `snes-player-compiler`, and all ten configured `?scene=` shortcuts with no console errors and 13 SNES assets reported
- Added an authored SNES-style transition layer:
  - replaced plain camera fades with a fully opaque 16x16 ruby/black mosaic wipe and compact gold transition card for scene changes
  - reused the same transition system for Archive Cavern room exits so A1 -> A2 and other doorway cuts feel like a 16-bit adventure screen change rather than a generic fade
  - added `snesTransition` to `render_game_to_text()` with active/current/last transition metadata, including scene, room IDs, direction, label, style, and cell size
  - kept direct `?scene=` QA starts stable by completing transition state before scene handoff and preserving direct boot behavior
  - verified `npm run build`, Archive A1 -> A2 movement with the bundled web-game client, title-to-character transition screenshots showing the mosaic/card, all ten configured scene deep links, and an in-app browser local load with no console errors
- Expanded Two Networks into a two-room SNES dungeon slice:
  - refactored `NetworkScene` into `N1 Network Split` and `N2 ClassNet Vault` rooms with fixed room IDs, a two-cell minimap, room traversal state, and ruby-mosaic doorway transitions
  - preserved the OpenNet/ClassNet routing puzzle in N1 while changing the successful outcome to clear the FIREWALL and open the east vault door instead of immediately jumping scenes
  - made the Clearance Token a physical N2 vault reward that the player must stand near and pick up after correct routing, then use to exit east to Referral Vault
  - made network cable dressing trackable so N1 art clears cleanly when N2 renders
  - verified `npm run build`, `git diff --check`, N1 routing -> N2 transition screenshots, N2 token pickup screenshot/state, full N2 -> ReferralVaultScene handoff, all ten configured `?scene=` deep links, and an in-app browser local load with no console errors
- Expanded Referral Vault into a two-room SNES dungeon slice:
  - refactored `ReferralVaultScene` into `R1 Equity Gate` and `R2 Concurrence Chamber` with fixed room IDs, a two-cell minimap, room traversal state, and ruby-mosaic doorway transitions
  - preserved the agency-equity matching, StateChat manifest confirmation, and visible-excision puzzle in R1 while changing the outcome to open the east concurrence gate instead of jumping directly to Silent Read
  - made the Concurrence Slip a physical R2 reward that the player must stand near and pick up after human referral review, then use to exit east to Silent Read Tower
  - made vault room dressing trackable so R1 and R2 redraw cleanly during room transitions
  - verified `npm run build`, required web-game client R1 smoke, and a full Playwright route covering R1 puzzle -> R2 transition -> Concurrence Slip pickup -> SilentReadScene handoff with screenshot inspection and no console errors
- Split the late-game proofing flow into a two-room SNES dungeon sequence:
  - refactored `SilentReadScene` into `E1 Editor's Labyrinth` and `S1 Silent Read Tower` with fixed room IDs, a two-cell minimap, room traversal state, and ruby-mosaic doorway transitions
  - made the first mechanical StateChat proposal resolve at the E1 editor desk, awarding the Red Pencil before the east tower gate opens
  - moved the evidence-bound OpenNet, ClassNet, referral, and proof-date flags into S1, where the player routes, verifies, and stamps each physical object at the correct human workstation
  - changed completion from an automatic jump to an earned Buckram Key gate: after the Proof Lens/Buckram Key rewards, the player exits east to the Buckram Gate/EndingScene
  - verified `git diff --check`, `npm run build`, required web-game client SilentReadScene smoke, all ten `?scene=` deep links, an in-app browser local canvas/error smoke, and a full Playwright route covering E1 Red Pencil -> S1 evidence flags -> Proof Lens -> Buckram Key -> EndingScene
- Made the Buckram Gate into a playable final SNES room:
  - replaced the immediate EndingScene completion card with a walkable `G1 Buckram Gate` room, final minimap/readiness panels, a human publication table, and literal stone blockers for the 30-year line and DANN-E queue
  - added `finalGateCertification` state so `render_game_to_text()` distinguishes locked/ready/published gate states; ready assembled volumes now report `final_assembly` until the player certifies at the table
  - changed direct `?scene=EndingScene` seeding to proofed/final-assembly documents instead of pre-published documents, preserving the QA shortcut while requiring the final Space/Enter certification action
  - publishing now records the final human certification, marks selected workflow documents as `published`, adds a `Published FRUS Cover` inventory prize, and then shows the ruby-and-gold completion card
  - verified `npm run build`, `git diff --check`, direct EndingScene ready and publish states/screenshots, all ten `?scene=` deep links, and an in-app browser local canvas/error smoke
- Upgraded bureaucratic wall enemies into distinct 16-bit sprites:
  - added seven original 32x32 SVG wall sprites for NO REPO, FIREWALL, PENDING, WAIT, HOLD, AMBIGUOUS, and DANN-E QUEUE using the existing NES/SNES palette and no external assets
  - registered the wall sprite set in the SNES atlas readout and BootScene preload/fallback pipeline
  - changed `BureaucraticWall` to select the correct sprite by label/behavior while preserving the existing movement, pushback, and defeat loops
  - exposed `spriteKey` on active `visibleThreats` so `render_game_to_text()` proves which blocker sprite is currently on screen
  - added a seven-sprite wall rack to `RenderDebugScene` for stable visual QA
  - verified `npm run build`, `git diff --check`, Archive/Network/Ending wall screenshots, RenderDebugScene wall-rack screenshot, and all ten `?scene=` deep links
- Added a dedicated SNES-style Archive Cavern dungeon map:
  - created `public/assets/maps/archive-cavern-map.svg` as an original 80x56 palette-safe one-screen dungeon map for the 12-room Archive Cavern
  - changed the SNES atlas registry so Archive Cavern reports `archive-cavern-map` instead of the generic world atlas
  - added a BootScene fallback renderer for the Archive Cavern map so fallback textures keep working if the SVG fails to load
  - placed the map as a visible A1 room panel while preserving the existing Source Note 47 verification loop and room traversal
- Upgraded human specialist NPCs into true 32x32 SNES-style sprites:
  - added original rect-only SVG sprites for Sam, Elena, Marcus, Priya, and the equal-rank Archive Colleague
  - preserved existing NPC identities while adding readable proof pages, compiler folder/glasses, declass clipboard/ClassNet red, editor red pencil, and citation-stamp guide cues
  - added SNES NPC metadata to the atlas readout, BootScene preload/fallback generation, and RenderDebugScene visible-entity reporting
  - changed `HistorianNPC` and GuideScene to prefer the new SNES textures while keeping the old 16x16 assets as fallback paths
  - verified `npm run build`, `git diff --check`, bundled web-game screenshots for Office/Guide/Network/Referral/Silent Read, all ten `?scene=` deep links, and an in-app browser local canvas/error smoke
- Introduced a roaming HAC member antagonist in the Office Hub:
  - added an original 32x32 `snes-hac-member.svg` sprite with committee paper/badge cues and no external assets
  - added `HacMember` as a waypoint-roaming antagonist that displays a distraction cue and lightly reduces reliability when the player gets too close
  - registered the HAC sprite in the SNES atlas readout and BootScene preload/fallback pipeline
  - exposed the HAC member through `visibleThreats` with sprite key, behavior, counterplay, and roaming/distracting status
  - verified `npm run build`, `git diff --check`, OfficeScene distraction state/screenshot, all ten `?scene=` deep links, and an in-app browser local canvas/error smoke
- Introduced a federal government shutdown antagonist in the Office Hub:
  - added an original 32x32 `snes-federal-shutdown.svg` stop-work barricade sprite with no external assets
  - added `FederalShutdown` as a waypoint-roaming antagonist that posts a short closure notice and briefly halts player movement when it catches the player
  - registered the shutdown sprite in the SNES atlas readout and BootScene preload/fallback pipeline
  - exposed the shutdown through `visibleThreats` with sprite key, behavior, counterplay, and roaming/stop-work status
- Populated the Office Hub with a full equal-rank FRUS production cast inspired by the supplied character sheet:
  - added original 32x32 repository-local SVG sprites for Compiler, Declass Coordinator, Reviewer, Editor, and Review Specialist using only the project palette and no raster imports
  - intentionally translated the reference's hierarchical "Senior Reviewer" cue into equal-rank `Review Specialist` naming
  - added `ProductionColleague` for role-cue room population while preserving existing named NPC dialog roles
  - registered the production-colleague sprite set in the SNES atlas readout, BootScene preload/fallback pipeline, OfficeScene, and RenderDebugScene
  - verified `npm run build`, `git diff --check`, OfficeScene and RenderDebugScene screenshots/state, all ten `?scene=` deep links, and in-app browser local rendering
- Added bees as an Office Hub avoidance antagonist:
  - created an original 32x32 `snes-frus-bees.svg` swarm sprite and BootScene fallback texture with no external assets
  - added `BeeSwarm` as a buzzing waypoint hazard that briefly disrupts concentration if the player gets too close
  - registered the swarm in the SNES atlas readout, OfficeScene threat loop, `visibleThreats`, and RenderDebugScene
- Smoothed character and roaming-antagonist movement:
  - added shared `approach()` / frame-delta helpers for integer-rendered but less abrupt movement
  - gave the player short acceleration/deceleration while preserving four-direction-only movement and no diagonal drift
  - eased HAC member, federal shutdown, and bee swarm waypoint steering to reduce turn jitter while keeping pixel-perfect render positions
  - verified `npm run build`, `git diff --check`, OfficeScene movement screenshot/state, direct position samples, and all ten `?scene=` deep links
- Added Navy Hill mice as an Office Hub antagonist:
  - created an original 32x32 `snes-navy-hill-mice.svg` patrol sprite with hard-edged palette-safe rectangles and no external assets
  - added a compact Navy Hill landmark on the Office production floor and a source-note-scattering mouse patrol around it
  - registered the mice in the SNES atlas readout, BootScene preload/fallback pipeline, OfficeScene visible-threat loop, and RenderDebugScene antagonist rack
- Incorporated the supplied main-map concept as an original repository-local SVG:
  - redrew `public/assets/maps/frus-snes-atlas.svg` as a large 240x168 regional main game map with Navy Hill, NARA I/II, Foggy Bottom, Capitol Hill, White House, Newington, Little Rock, Springfield, Potomac River, and an undisclosed locked location
  - added `SNES_MAIN_MAP_ASSET` metadata and landmark readouts to the SNES atlas state for accessible QA
  - explicitly preloaded the main map in BootScene and added a matching fallback texture path
  - added 1x viewport support to the SNES map renderer so larger maps can be cropped into room panels without compressing the whole district into one tiny view
  - changed TitleScene to show a western `WEST MAP` excerpt and the Office Hub to show a larger central `DISTRICT MAP` excerpt
  - verified SVG palette/opacity discipline, `git diff --check`, `npm run build`, Office/Title screenshots, and all ten `?scene=` direct links on the local dev server
- Incorporated the supplied production-character sprite-sheet concept as original SVG frames:
  - added `public/assets/sprites/snes-production-colleague-frames.svg` with six 32x32 poses per equal-rank production role: front, back, side, walk, workstation, and approval
  - kept the hierarchy-free naming by translating the supplied "Senior Reviewer" row into the existing equal-rank `Review Specialist`
  - registered the sheet as `SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET`, exposed it through `render_game_to_text().snesAtlas`, and added a BootScene fallback/registration path
  - updated OfficeScene colleagues to use the new workstation frames while preserving the earlier single-role SVGs as fallback textures
  - updated RenderDebugScene to show the new frame-sheet work poses for visual QA
- Integrated the supplied in-play Compiler sprite-sheet concept into the live playable Compiler frame strip:
  - redrew `public/assets/sprites/snes-player-compiler-frames.svg` in place as an original SVG with gray suit, blue tie, brown briefcase, front/side/back walking, idle, and document-reading poses
  - preserved the existing 608x48 strip dimensions, 32x48 frame size, filename, texture key, and all 19 frame names used by Player and BootScene
  - updated the SNES atlas compiler frame cue so `render_game_to_text()` describes the new in-play art
  - verified palette/opacity discipline, `npm run build`, OfficeScene movement/ability screenshot/state, and RenderDebugScene frame samples
- Integrated the supplied in-play Editor sprite-sheet concept into a live playable Editor frame strip:
  - added `public/assets/sprites/snes-player-editor-frames.svg` as original repository-local SVG art with glasses, proof pages, red pencil, front/side/back walking, idle, and document-marking poses
  - generalized the player frame-strip pipeline from compiler-only to role-frame sheets while preserving the same 608x48 dimensions, 32x48 frame size, and 19 frame names
  - exposed the Editor sheet through the SNES atlas readout, BootScene loading/registration, `render_game_to_text().activePlayerSprite`, and RenderDebugScene samples
  - verified SVG opacity/raster discipline, `git diff --check`, `npm run build`, OfficeScene free movement, Red Pencil ability pose, RenderDebugScene samples, and all ten direct `?scene=` links with the editor role

## TODO

- Improve full end-to-end traversal coverage from TitleScene to EndingScene; direct scene QA now covers the later scenes reliably.
- Consider a later non-combat `B` item such as a source-note stamp or routing card for clearing stonewalls at range.
- Add full manual route QA for every new Archive Cavern room once the public build is deployed.
- Continue the SNES upgrade with larger original in-game sprite sheets, richer non-Archive room graphs/transitions, and more authored room-to-room transition visuals, while keeping StateChat terminal-only and the FRUS workflow as the win path.

## 2026-06-11 Cleanup branch Phase 4

- Refactored the player movement resolver toward LttP-style 8-direction input while keeping cardinal facing/animation labels and pixel-snapped rendering.
- Added `playerAnimationState` to the text-state readout so movement QA can confirm idle/walk direction without relying only on screenshots.

## 2026-06-11 Cleanup branch Phase 5

- Added a compact player action-hitbox window for resolving bureaucratic wall blockers, keeping the FRUS process metaphor while matching the active-frame interaction pattern.
- Added player i-frame and hurt-state readouts after wall contact, with knockback routed through the player controller and exposed in `render_game_to_text()`.

## 2026-06-11 Cleanup branch Phase 6

- Added a shared enemy base for coherent roaming hazards with waypoint movement, damage, knockback, and death hooks.
- Retained the existing patrol-style HAC member, shutdown, bee swarm, and Navy Hill mice hazards while leaving specialized bureaucratic stonewalls in their process-gate class.

## 2026-06-11 Cleanup branch Phase 7

- Added a typed adventure HUD readout that maps FRUS confidence, clarity, document points, stamps, fragments, and process tools onto a compact action-adventure status model.
- Added an equipped secondary process-item slot and highlighted it in both the top HUD strip and manuscript inventory without changing existing pickup or gate mechanics.

## 2026-06-12 Cleanup branch Phase 8

- Quarantined the dirty overworld/art-pack working tree under `experiments/overworld-wip/`, including untracked source/assets plus copies and a binary patch for dirty tracked files.
- Restored the runnable source tree to the Phase 7 branch state so incomplete `WorldScene`, art-pack, screen-manager, interior-map, and tilemap experiments no longer affect the cleanup branch.
- Added experiment README guardrails for promoting quarantined work back into `src/` or `public/` only as focused, buildable commits.

## 2026-06-12 Cleanup branch Phase 9

- Updated `README.md` with current cleanup scope, Phaser 3 engine rationale, controls, pillar status, experiment quarantine notes, and a roadmap tied to the LttP cleanup rubric.
- Kept the active docs honest that the large overworld/art-pack work is preserved under `experiments/overworld-wip/` but is not live game code.

## 2026-06-12 16-bit sprite wiring Phase 3

- Swapped the character creator's main preview and role cards from old role SVG keys to the centralized 32x48 art-pack character sheets.
- Swapped the GuideScene Archive Colleague from the old still-image fallback to the `archivist` 32x48 sheet and updated its interaction point for the taller sprite.
- Reworked RenderDebugScene's character racks to sample the canonical `CHARACTER_KEYS` sheets and animations instead of the old role/NPC SVG frame systems.
- Tightened the production-colleague final fallback so it prefers a canonical `reviewer` sheet when available.
- Verified `npm run build` and captured Phase 3 screenshots for CharacterCreateScene, the current OfficeScene->GuideScene path, NetworkScene interior, and a before/after comparison sheet.
- Note: current `main` has no live Navy Hill/WorldScene path after the cleanup quarantine; OfficeScene routes to GuideScene, so Phase 3 visual QA uses that live office path plus NetworkScene as the interior sample.

## 2026-06-12 16-bit sprite wiring Phase 4

- Added `SpriteGallery`, a hidden visual-QA scene that renders all ten canonical 32x48 character sheets in a grid.
- The gallery cycles through idle, walk, interact/use-tool, reading, and approval animations every 1.5 seconds.
- Registered `SpriteGallery` in the Phaser scene list and `SCENE_ORDER` so `?scene=SpriteGallery` works for deep-link QA.
- Added a global F9 shortcut from `main.ts` to open the gallery from normal game flow.
- Captured `docs/screenshots/16bit-wire-gallery.png`, `docs/screenshots/16bit-wire-phase4.png`, and an F9 shortcut screenshot.
- Ran `npm run palette:check --if-present`; no palette script is configured, so `tools/palette_report.md` records the skipped check and follow-up.

## 2026-06-12 16-bit sprite wiring Phase 5

- Confirmed there is no `experiments/old-8bit/` directory in this branch, so there were no old placeholder PNG files to delete.
- Updated the art-pack manifest with the native 128x192 runtime-sheet note for the ten canonical 32x48 character sprites.
- Added `docs/art/16bit_sprite_wiring_final_report.md` with branch log, cleanup result, centralized loading confirmation, frame-order result, screenshot evidence, validation notes, and PR status.
- Verified that character spritesheet loading is centralized through `src/art/characters.ts` and `BootScene.preloadCharacters(this)`.
- Pushed `feature/wire-16bit-sprites` to origin.
- PR creation is blocked locally because `gh` is not installed and the GitHub connector returned `token_expired`; the PR creation URL and requested title are recorded in the final report.

## 2026-06-12 Mobile SNES Quality Phase 5

- Added tap-to-advance and long-press fast-forward routing for dialogue through the unified input layer.
- Reworked the manuscript inventory into a pause-mode modal with tappable tool slots, a 44px-class close target, outside-dismiss behavior, and locked/equipped tool feedback.
- Fixed HUD, dialogue, inventory, and objective overlays to the camera so mobile scaling and scene movement do not drag UI with the map.
- Verified the phase with touch probes, the web-game Playwright client, and iPhone 14 Pro / Pixel 7 portrait and landscape viewport screenshots.

## 2026-06-12 Mobile SNES Quality Phase 6

- Hardened the oscillator-only Web Audio path with first-gesture unlock/prewarm, queued score start for direct scene links, same-theme music continuity, and a shared master gain node.
- Added visibility/page lifecycle handling so backgrounding suspends audio and foregrounding resumes the active score with a short fade-in.
- Added context state-change handling for iOS-style audio interruptions plus a `window.rubyRuleAudioDebug()` QA readout.
- Verified the phase with an audio lifecycle probe, the standard web-game client, Playwright iPhone/Pixel device-profile screenshots, and an in-app browser console-error smoke.

## 2026-06-12 Mobile SNES Quality Phase 7

- Added a tiny `F7` / `?fps=1` performance overlay and expanded the `F11` mobile debug HUD with frame p99, max frame time, sample count, and histogram buckets.
- Reworked the frame sampler to avoid per-frame array filter/map/reduce allocations while measuring the game.
- Added `npm run perf:profile` for repeatable local/deployed browser performance sampling with JSON output and optional screenshots.
- Verified the phase with `npm run build`, local 60 FPS profile artifacts, Playwright iPhone/Pixel device-profile screenshots, and an in-app browser load/log check.

## 2026-06-12 Mobile SNES Quality Phase 8

- Added versioned save/resume state with localStorage primary persistence and sessionStorage fallback.
- Autosaves now run on scene transitions, every 30 seconds during active play, `visibilitychange -> hidden`, and `pagehide`.
- Added a Continue/New Game boot choice when a save exists, plus a tap-to-resume overlay after backgrounding.
- Verified Continue restores scene/profile/inventory/stamps/document points, non-default Archive position/facing, New Game save clearing, and tap-to-resume behavior with Playwright probes.

## 2026-06-12 Mobile SNES Quality Phase 9

- Added Bluetooth gamepad support through the unified input state, mapping D-pad/stick, A, B, ability, Start, and Select without direct gameplay reads outside `src/input/`.
- Added gamepad connect/disconnect listeners so the touch overlay fades away when a controller is active and returns when it disconnects.
- Added a small controller toast plus `window.rubyRuleGamepadDebug()` and mobile debug HUD readout for QA.

## DANN-E warning, variants, and expansion art integration

- Started `feature/integrate-danne-pack` from `origin/main`, after confirming PR #7 and PR #8 assets are present on `origin/main`.
- Completed Phase 1 asset registry and preload wiring:
  - added `src/game/danneAtlas.ts` with typed registry entries for the DANN-E warning screen, five maps, four portraits, four 4x4 sprite sheets, three item cards, three UI sheets, the ego-bolt VFX sheet, and eight DANN-E variants
  - added `src/art/danne_anims.ts` to register row-based DANN-E sprite walk/attack animations and an 8-frame ego-bolt fly animation
  - added `BootScene.preloadDannePack()` and nearest-neighbor filtering for all DANN-E PNG textures
  - added `DanneGallery` at `?scene=DanneGallery` with a scrollable labeled preview grid for all 29 registered assets
  - registered `DanneGallery` in `gameConfig.scene`, `SCENE_ORDER`, transient-save handling, and touch-overlay hiding
- Verified Phase 1:
  - `npm run build` passes with only the existing Phaser chunk-size warning
  - captured and committed `docs/screenshots/danne-phase1.png`
  - `render_game_to_text()` for `DanneGallery` lists all 29 DANN-E assets in `visibleEntities`
  - direct scene smokes passed for Title, CharacterCreate, Guide, Office, Archive, Network, ReferralVault, SilentRead, and Ending with no captured console/page errors
- Completed Phase 2 warning-screen wiring:
  - added `WarningScene` as the default post-boot route before `TitleScene`, using the registered DANN-E warning card on a black background with integer-fit scaling
  - preserved `?scene=` deep links; the direct Office route still bypasses the warning and keeps its existing GuideScene handoff
  - added the persisted `localStorage["ruby-rule.skipWarning"]` preference plus a small TitleScene checkbox/`B` toggle
  - hid mobile touch controls while `WarningScene` is active and fixed disabled-control text persistence
- Verified Phase 2:
  - fresh default load reaches `WarningScene`; pressing Space/A fades to `TitleScene`
  - setting `ruby-rule.skipWarning=true` reloads directly to `TitleScene`
  - direct scene smokes passed for Title, CharacterCreate, Guide, Office, Archive, Network, ReferralVault, SilentRead, Ending, and DanneGallery with no captured console/page errors
  - captured `docs/screenshots/danne-phase2.png` and `docs/screenshots/danne-phase2-title.png`
- Completed Phase 3 map-scene scaffolding:
  - added five new DANN-E pack map scenes: Cherry Blossom Garden, Black Vault Lair, Senate Hearing Chamber, NARA Stacks, and Embassy Cable Room
  - added a shared `DanneMapScene` base that renders the registered map PNGs, uses hand-authored walkable polygons/solid rectangles, spawns the existing player, provides nearest-interaction prompts, and returns to the current OfficeScene path
  - added `src/game/danneSceneCollisions.ts` as the scene geometry source of truth, including NARA Stacks patrol-route placeholders for Phase 4
  - wired the Cherry Blossom Garden save point to the existing save system and added simple trigger/dialog interactions for the vault core, witness table, stacks note, and cipher machine
  - registered all five scenes in `gameConfig.scene` and `SCENE_ORDER`
- Verified Phase 3:
  - `npm run build` passes with only the existing Phaser chunk-size warning
  - captured each new map with the web-game Playwright client
  - verified the garden SavePoint dialog, return-exit transition through the existing OfficeScene route, and `?debug=collision` overlays
  - direct route smokes passed for Warning, Title, CharacterCreate, Guide, Office, Archive, all five DANN-E map scenes, Network, ReferralVault, SilentRead, Ending, and DanneGallery with no captured console/page errors
  - captured `docs/screenshots/danne-phase3-*.png`
- Completed Phase 4 enemy and ally sprite wiring:
  - generated transparent runtime 4x4 sheets from the DANN-E source presentation art for Redactor Drone, Censorship Wraith, Junior Compiler, and Marine Security Guard
  - added `DANNE_RUNTIME_SPRITE_ASSETS` while preserving the original source-sheet registry and gallery entries
  - added `RedactorDrone` and `CensorshipWraith` enemies with patrol/hover behavior, black-bar stamp drops, and ink-swipe pressure
  - added `JuniorCompiler` and `MarineSecurityGuard` NPCs with idle animation and concise FRUS workflow dialogue
  - changed `OfficeScene` from a redirect shim into a small playable office hub with Junior Compiler dialogue and an Archive Guide door, preserving the existing guide route
  - wired four Redactor Drone patrols into NARA Stacks, two Censorship Wraiths into Black Vault Lair, and Marine Guard blocking/cleared checks into Embassy Cable Room
  - added the `?give=declass-key` QA grant for verifying the Marine Guard cleared branch before Phase 5 item wiring
- Verified Phase 4:
  - `npm run build` passes with only the existing Phaser chunk-size warning
  - web-game Playwright screenshots confirm Junior Compiler dialogue, NARA drone patrols, Black Vault wraiths, and Embassy Marine Guard blocked/cleared states
  - `render_game_to_text()` reports four Redactor Drones with `danne-runtime-redactor-drone`, two Censorship Wraiths with `danne-runtime-censorship-wraith`, and Marine Guard blocking/cleared state
  - direct route smokes passed for Warning, Title, CharacterCreate, Guide, Office, Archive, Network, ReferralVault, SilentRead, Ending, DanneGallery, and all five DANN-E map scenes with no captured console/page errors
  - captured `docs/screenshots/danne-phase4-*.png`
- Completed Phase 5 item integration:
  - added a typed DANN-E item catalog for Ruby Pen, Master Declass Key, and Treaty Fragments, then derived the BootScene item asset registry from it
  - extended game state with acquired/equipped DANN-E item readouts, Treaty Fragment counting, Ruby Pen auto-equip, and `sceneProgress` QA output
  - added DANN-E item thumbnails and full-card popovers to the manuscript inventory overlay
  - wired Ruby Pen through the Cherry Blossom Historian/chest loop and added a B/Shift red-ink trail action with +5 attack readout
  - wired the Office production sequence (Production Inbox -> FRUS Cart -> Archive Terminal -> Junior Compiler) to award the Master Declass Key
  - wired Treaty Fragments to NARA Stacks, Senate Hearing Chamber, and the Black Vault boss-cleared drop path
  - widened the Archive Terminal and Marine Guard interaction radii after playtesting showed the art collision kept the closest walkable tile just outside range
- Verified Phase 5:
  - `npm run build` passes with only the existing Phaser chunk-size warning
  - web-game Playwright client confirms the Cherry Blossom Historian/chest loop awards and equips Ruby Pen
  - custom Playwright probes confirm the Ruby Pen inventory card/popover, the red-ink B/Shift trail, the Office fetch sequence, Marine Guard Master Declass Key clearance, and all three Treaty Fragment placements
  - in-app browser local smoke reached the local game canvases with no captured console errors
  - captured `docs/screenshots/danne-phase5-ruby-pen.png`, `docs/screenshots/danne-phase5-inventory.png`, `docs/screenshots/danne-phase5-ruby-pen-action.png`, `docs/screenshots/danne-phase5-master-key.png`, and `docs/screenshots/danne-phase5-treaty-fragments.png`
- Completed Phase 6 DANN-E UI integration:
  - added `src/game/danneUiSlices.ts` to create guarded runtime slices from the DANN-E scroll-corner, letterbox, and boss-healthbar sheets while preserving rectangle fallbacks
  - replaced the existing dialog-box chrome with the scroll-corner frame without changing dialog text flow or input handling
  - added `src/systems/cutscene.ts` with `enterCutscene`, `exitCutscene`, and `playLine` helpers that slide in letterbox bars and lock DANN-E map player input while active
  - added `src/systems/bossHud.ts` with `showBossHud`, `setBossHp`, and `hideBossHud`, using the DANN-E healthbar art, red fill, phase gems, and critical glow support
  - added a `?debug=ui` route for DANN-E map scenes with H/J/B debug controls and an automatic UI preview for screenshots
- Verified Phase 6:
  - `npm run build` passes with only the existing Phaser chunk-size warning
  - web-game Playwright screenshots confirm the scroll-corner dialog frame, cutscene letterbox with test line, and 75% DANN-E boss HUD with phase gem
  - in-app browser local smoke reached the UI-debug route with two canvases and no captured console errors
  - captured `docs/screenshots/danne-phase6-dialog.png`, `docs/screenshots/danne-phase6-cutscene.png`, and `docs/screenshots/danne-phase6-boss-hud.png`
- Physical iOS/Android controller testing remains for the Phase 10 device matrix; this phase uses a mocked Gamepad API probe for automated verification.

## 2026-06-12 Mobile SNES Quality Phase 10

- Added `docs/mobile/qa_matrix.md` with the requested device/browser/orientation matrix.
- Ran automated Chromium device-profile proxy checks for iPhone 14/15 Pro, iPhone SE 2, Pixel 7/8, older Android, iPad Air, and an iPhone + mocked 8BitDo controller row.
- Proxy rows passed for integer zoom, roughly 60 FPS, sub-50ms latency where touch applies, first-gesture audio unlock, pagehide save, and zero page errors.
- Captured Phase 10 screenshots and four short WebM recordings for iPhone/Pixel portrait and landscape.
- Real physical-device QA is still pending and explicitly not marked as passed.

## 2026-06-13 DANN-E Integration Phase 8

- Added the FRUS Field Codex overlay with Enemies, NPCs, DANN-E Variants, and Items categories.
- Stored unlock state in `localStorage["ruby-rule.codexUnlocks"]` and exposed the readout through `window.render_game_to_text()`.
- Wired encounter unlocks for DANN-E enemies, roaming antagonists, DANN-E boss variants, DANN-E items, and new NPCs while preserving locked silhouettes for undiscovered entries.
- Bound the Codex to Tab/Select and added a CODEX button to the inventory overlay, including a pause-touch hit test so the button works with the always-on mobile UI scene.
- Verified `npm run build`, direct `?scene=CodexScene` loading, Tab-open from Office, inventory-button open, and Censorship Wraith encounter unlock.
- Captured Phase 8 screenshots: `danne-phase8-codex-variants-locked.png`, `danne-phase8-codex-wraith-unlocked.png`, `danne-phase8-codex-tab-open.png`, and `danne-phase8-codex-inventory-button.png`.

## 2026-06-13 DANN-E Integration Phase 9

- Wired the five DANN-E map scenes into the world atlas and room graph:
  - Office Hub now routes to Cherry Blossom Garden and Senate Hearing Chamber.
  - Archive Cavern now routes to NARA Stacks and Embassy Cable Room.
  - Queue Boss Gate now owns the gated Black Vault Lair route.
- Added atlas landmarks and room-graph IDs `DG1`, `DH1`, `DN1`, `DE1`, and `DV1` for the new expansion spaces.
- Added visible door markers in OfficeScene and ArchiveScene, with return spawn preservation through `sceneProgress`.
- Fixed Archive interaction priority so a selected door or document is not preempted by a nearby/facing process-wall enemy; this keeps the Embassy Cable Room doorway usable beside the FIREWALL.
- Updated `docs/danne-world-routes.md` with route notes and verification steps.
- Verified `npm run build`, the required web-game Playwright client smoke, Office routes to Cherry/Senate, Archive routes to NARA/Embassy, direct Black Vault load/return, and pagehide save preservation from NARA Stacks.
- Captured Phase 9 screenshots and state artifacts under `docs/screenshots/danne-phase9-*`.

## 2026-06-13 DANN-E Integration Phase 10

- Added dedicated procedural oscillator stems for Cherry Blossom Garden, Black Vault Lair, Senate Hearing Chamber, NARA Stacks, Embassy Cable Room, and the DANN-E boss loop.
- Added named DANN-E SFX for ego bolt fire/impact, boast glitch, phase transition, Ruby Pen pickup, Master Declass Key pickup, and Treaty Fragment pickups.
- Wired expansion map scenes to their own music keys and switched the boss encounter to the DANN-E boss loop when the fight starts.
- Verified the normal WarningScene first-tap path unlocks WebAudio and starts title music in mobile simulation.
- Verified the DANN-E boss mobile simulation at iPhone-style portrait size and 320px width: letterbox bars, touch overlay, boss HUD, integer scaling, and D-pad movement all remained readable/functional.
- Verified `npm run build`, `npm run preview`, required web-game boss smoke, and a direct scene smoke sweep with no captured page/console errors.
- Documented Phase 10 in `docs/danne-phase10-polish.md`; captured screenshots/state under `docs/screenshots/danne-phase10-*`.

## 2026-06-13 All-New-Art Integration Phase 0

- Created branch `integrate/all-new-art` from fast-forwarded `main`.
- Checked prerequisite PRs:
  - PR #11 and PR #12 were already merged into `main`.
  - PR #9 was still open and not mergeable on GitHub, so its asset branch was merged locally into `integrate/all-new-art` to make the required map assets available without touching `main`.
- Verified required source asset counts:
  - `public/assets/art-pack/overworld_maps/`: 5 files.
  - `public/assets/art-pack/gameplay_maps/`: 8 files.
  - `public/assets/art-pack/frus_volumes/`: 16 PNG files.
- Added `src/assets/registry.ts` as the single source of truth for `OVERWORLD_REGIONS`, `GAMEPLAY_MAPS`, and `FRUS_VOLUMES`.
- Wired `BootScene` to preload all three registries and log grouped registry output; exposed `window.game` so the requested dev-console texture checks work exactly.
- Verified `npm run build`.
- Checkpoint screenshot: `docs/screenshots/all-new-art-phase0-console.png`, showing `game.textures.exists('historian_office') === true` and `game.textures.exists('reward_legendary') === true`.

## 2026-06-13 All-New-Art Integration Phase 1

- Added `WorldMapScene` as the all-new-art region-select hub using the five overworld map assets from the registry.
- Added `src/data/regions.ts` with all 40 district hot-zones, their source-image bounds, region labels, and initial destination mappings.
- Added a Phase 1 `GameplayMapScene` preview shell so destination districts can route to the eight gameplay map assets before Phase 2 collision/spawn authoring.
- Registered `WorldMapScene` and `GameplayMapScene` in `gameConfig.scene` and `SCENE_ORDER` while preserving existing debug scene routes.
- Verified `npm run build`.
- Verified the region selector cycles through all five regions, hover overlays and tooltips work for all 40 cartouches, and destination clicks route correctly for West Berlin, Vienna, and Havana.
- Checkpoint screenshot: `docs/screenshots/all-new-art-phase1-europe-west-berlin-tooltip.png`, showing the Europe map with the West Berlin tooltip visible and the parchment border unobstructed.
- Phase 2 still needs true gameplay-map collision, doors, spawns, and map-specific NPC logic.

## 2026-06-13 All-New-Art Integration Phase 2

- Added `GAMEPLAY_TILED_MAPS` to the asset registry and BootScene JSON preload so each gameplay-map object layer is loaded from `public/assets/tiled/*.tmj`.
- Replaced the Phase 1 preview-only `GameplayMapScene` with a playable static-map scene that:
  - renders each gameplay PNG inside a safe rectangle without covering the parchment border;
  - reads Tiled-style `collisions`, `doors`, `spawns`, `interactions`, `npcs`, and `triggers` object layers;
  - maps source-pixel object coordinates into the 256x240 logical canvas;
  - uses the existing `Player` rectangle-solid movement path;
  - supports `?debug=collision` overlays;
  - routes doors to `WorldMapScene` or another `GameplayMapScene` map plus spawn point;
  - shows compact map dialogue in the bottom safe band instead of covering the map art.
- Authored first-pass `.tmj` object maps for all eight gameplay maps:
  - Office of the Historian
  - NARA II Stacks
  - Foggy Bottom Street
  - White House West Wing
  - Black Vault Lair
  - FRUS Production Floor
  - Embassy Compound
  - Capitol Hill Hearing
- Verified `npm run build`.
- Verified all eight maps boot, every map has collision objects and at least one door, every door path either routes or shows its required locked dialog, and representative interactions open dialogue: Historian-in-Chief, FRUS Bookshelf, NARA Archivist, Chancery Door, and Witness Table.
- Checkpoint screenshot: `docs/screenshots/all-new-art-phase2-historian-office.png`, showing the player in the Historian-in-Chief room.
- The `.tmj` collision layers are intentionally broad first-pass rectangles; later Tiled refinement can add tighter chair/furniture polygons without changing the scene contract.

## 2026-06-14 Bracketed Excision Standards Loop

- Added `undisclosedDeletion` to document candidates/workflow documents and normalized the flag when loading older save data.
- Blocked publication for any document with an undisclosed deletion; the final gate now reports the flagged document and `needsHumanReview` treats the flag as an active human-review blocker.
- Wired Red Pencil excision in SilentReadScene to require a follow-up bracketed insertion choice.
- If the player skips the bracket, SilentReadScene marks the document, applies `applyStandardsDamage(..., "undisclosed_deletion")` through the reliability system, shows the plain-English Kellogg/About-the-Series violation label, and reopens the bracket correction prompt.
- Choosing the bracketed insertion clears `undisclosedDeletion`, returns the document to the proof path, and lets the physical-verification loop continue.
- Updated ReferralVaultScene so unbracketed excision choices also set `undisclosedDeletion`, while the visible/bracketed excision choice clears it.
- Verified `npm run build`.
- Verified with the required web-game Playwright client:
  - skip path: reliability debited, `source_note_047.undisclosedDeletion === true`, `needsHumanReview === true`, and the final gate is blocked;
  - correction path: bracket choice clears `undisclosedDeletion`, removes the final-gate deletion blocker, and advances the proof route.

## 2026-06-14 DANN-E Statutory Clock Reframe

- Reframed `DanneBoss` around the 30-year publication deadline:
  - added a visible `STATUTORY CLOCK` HUD row beneath the boss healthbar;
  - the clock applies pressure based on completion readiness and advances during the fight unless the Buckram Gate is open;
  - if the clock reaches 30 years before `buckramGateOpen`, the player takes `missed_30_year_deadline` standards damage.
- Added a publication-readiness readout that treats process stamps as pendants, FRUS cover fragments as crystals, the Buckram Key as the gate item, and unresolved standard violations as blockers.
- DANN-E now offers an unlawful shortcut after deadline failure or blocked defeat:
  - accepting it applies `concealed_policy_defect` damage, records the shortcut in `sceneProgress`, and routes to `BadEndingScene`;
  - rejecting it keeps the fight alive and tells the player to open the Buckram Gate lawfully.
- Legitimate DANN-E defeat now requires `buckramGateOpen === true`: all required pendants, all crystals, Buckram Key, reliability readiness, and zero unresolved standards violations. Legitimate defeat routes to `TrueEndingScene`.
- Added `BadEndingScene` for the concealed-material shortcut outcome.
- Added a `give=publication` debug grant for QA seeding of all pendants, crystals, and the Buckram Key.
- Verified `npm run build`.
- Verified with the required web-game Playwright client:
  - expired-clock path: clock reaches 30/30, reliability loses missed-deadline damage, and the shortcut A/B prompt appears;
  - shortcut path: accepting the prompt applies concealed-policy-defect damage and loads `BadEndingScene`;
  - lawful-readiness path: `publicationReadiness.buckramGateOpen === true`, pendants/crystals are complete, standards are clear, and the clock stays green at 28.5/30.

## 2026-06-14 ALttP-Style Pause Subscreen

- Added a GameState-backed adventure subscreen readout in `src/game/state.ts`.
- The readout exposes:
  - three research-provenance pendants from process stamps (`OBJ`, `SRC`, `SOP`);
  - declassification crystals earned vs. total agency equities;
  - equipped FRUS process tool;
  - reliability as a 10-heart meter;
  - per-area dungeon status from `dungeonKeys.ts` (`smallKeys`, required keys, big key, boss, map reveal);
  - current-area room-map cells from `FRUS_ROOM_GRAPH`.
- Updated `window.render_game_to_text()` to include `adventureSubscreen` for automated QA and browser inspection.
- Reworked `InventoryOverlay` into an ALttP-style pause/map subscreen:
  - left-side process-tool inventory strip still supports tap/click equip;
  - right-side pendant, crystal, equipped-tool, and reliability-heart glyphs use the existing pixel palette;
  - lower section shows dungeon key/big-key/map/boss status and a compact current-area minimap.
- Verified `npm run build`.
- Verified with the required web-game Playwright client after the final layout patch.
- Verified with a direct Playwright pause capture:
  - holding `M` opens the subscreen and sets `mode: "pause"`;
  - `adventureSubscreen` reports pendants, crystals, equipped tool, reliability hearts, seven dungeon rows, and room-map data;
  - no console errors were emitted.
- Checkpoint screenshot: `docs/screenshots/alttp-subscreen-focused.png`.

## 2026-06-14 FRUS/Zelda Unit Tests

- Added Vitest as the deterministic unit-test runner and a `npm test` script.
- Added `src/game/frusProgression.ts` as the pure progression helper used by tests and the pause subscreen:
  - exports the prompt-facing `PendantId` type and `PENDANTS` registry;
  - `compilationIsComplete()` checks the three research pendants (`rule`, `archive`, `sop`);
  - `crystalsEarned()` and `totalEquities()` count distinct agency equities;
  - `buckramGateOpen()` requires complete pendants and every distinct equity crystal earned.
- Added `src/game/frusProgression.test.ts` for pendant completion, distinct-equity crystal counts, and Buckram Gate gating.
- Added `src/systems/standardsDamage.test.ts` for all Kellogg-standard reliability debits, zero clamp behavior, and bracketed/unbracketed excision damage.
- Added `src/game/documentWorkflow.test.ts` for gated workflow actions, locked reasons, direct-wrapper parity with `applyDocumentWorkflowAction()`, and a full found-to-published path with required tools.
- Added `src/systems/dungeonKeys.test.ts` for small-key earn/use, locked-door behavior, boss-door big-key gating, and boss completion state.
- Verified `npm test`: 4 files passed, 14 tests passed.
- Verified `npm run build`.

## 2026-06-14 WebGL AUTO Renderer Config

- Updated `src/game/config.ts` to prefer `Phaser.AUTO` instead of forcing `Phaser.CANVAS`.
- Removed the top-level fixed `zoom: 3`.
- Set `scale.mode` to `Phaser.Scale.NONE` and `scale.zoom` to `1`, leaving `GAME_WIDTH`/`GAME_HEIGHT` unchanged at 256x240 so scene dimension reads stay stable.
- Kept pixel discipline flags enabled: `pixelArt`, `antialias: false`, `antialiasGL: false`, and `roundPixels`.
- Verified `npm test`: 4 files passed, 14 tests passed.
- Verified `npm run build`.
- Verified local runtime at `?scene=OfficeScene&role=compiler&name=Ruby`:
  - Phaser reports `WebGL | Web Audio`;
  - backing canvas remains 256x240;
  - CSS-scaled rect remains 768x720 at 3x shell scale;
  - Office scene renders correctly under the AUTO/WebGL path.
- Checkpoint screenshot: `docs/screenshots/renderer-auto-smoke.png`.
- Input-only Part 1 hardening pass:
  - changed the Character Create begin prompt to `TAP AGAIN / PRESS ENTER TO BEGIN`
  - added an explicit name-field hit zone so pointer/touch focus reliably captures typed names
  - buffered non-repeat keyboard presses until the next `tickInput()` so fast Enter/Space/WASD taps are not missed between Phaser frames
  - buffered touch-control presses the same way so quick on-screen A/B/D-pad taps still produce one-frame edges
  - expanded Vitest coverage for fast keyboard taps, touch confirm/cancel, gamepad A/B, and resume-input swallowing
  - verified `npm test`: 6 files passed, 23 tests passed
  - verified `npm run build` with only the existing Vite chunk-size warning
  - verified direct Playwright full flow: TitleScene -> CharacterCreateScene -> OfficeScene via keyboard, mouse, and touch-style A button
  - verified resume overlay fallthrough: first Enter dismisses `TAP TO RESUME` and is swallowed; the next Enter confirms normally

## 2026-06-15 Office Hub Stray Sprite Fragment Fix

- Root cause: the art-pack `FRAMES.action` map (`interact: 12`, `reading: 13`, `approval: 14`) referenced spritesheet row 3 of the 4x4 32x48 native sheets. Only rows 0-2 (idle 0-3, walk 4-11) hold complete poses on every sheet; row 3 is empty or only stray top-edge pixels on several sheets (notably `sprite_compiler`). Playing those cells rendered a detached ~5px horizontal sliver above the body — the stray fragments on the JR desk and the rug near the player's shadow in Office Hub (JuniorCompiler plays `attack`→`reading`; Player plays `reading`/`interact` on ability/interact frames).
- Fix: remapped action poses to complete idle frames (`interact: 0`, `reading: 0`, `approval: 1`) in `src/art/character_anims.ts` so every pose is guaranteed to be a full, correctly oriented sprite regardless of sheet. No behavioral regression: action poses already render as static single frames.
- Regression coverage in `src/art/characterSprites.test.ts`:
  - asserts action poses are drawn only from row-0 idle frames (never row 3);
  - decodes every shipped native PNG and verifies each referenced animation frame is a complete body (opaque pixel count and covered height), failing on thin slivers/empty cells. Confirmed the suite fails (8 tests) when action frames are pointed back at row 3.
- Verified `npm test`: 8 files passed, 46 tests passed.
- Verified `npm run build`.

## 2026-06-15 Restore ESC overlay close in GuideScene

- Live QA after PRs #21/#22 reported ESC no longer closing the M inventory and the Tab codex overlay in the Office Hub/gameplay area. Title art, sprite fragments, shadows, and plant all passed.
- Root cause: `GuideScene.update` (the Archive Guide room reached from the Office Hub) imported the shared `handleOpenOverlays` helper but bypassed it with a bare `if (this.inventory.active || this.reliability.active) { ...; return; }` guard. That froze the scene while an overlay was open but never routed ESC/B/Tab through the close path, so the overlay could not be dismissed — exactly the PR #18 behavior the helper was introduced to guarantee. OfficeScene/ArchiveScene/etc. were already wired correctly.
- Fix: route the frozen frame through `handleOpenOverlays(this.inventory, this.reliability)` in `GuideScene`, matching every other gameplay scene. ESC/B/Tab now close the inventory and reliability detail and swallow the still-held edge so it cannot leak into the pause panel.
- Hardening: `resetInput()` (run on window blur / tab visibility change) now also clears the pending `swallowNextFrame` latch, and `swallowNextInputFrame()` arms the latch after the internal `resetInput()` rather than before. Previously a swallow armed just before a blur survived the reset and silently dropped the first real input frame after refocus.
- Regression coverage:
  - `src/systems/overlayInput.test.ts`: a frozen-scene overlay must close on ESC via the helper, not merely freeze.
  - `src/input/InputState.test.ts`: `resetInput()` clears a pending swallow so the next frame is live.
- No art changed; visual fixes from PRs #21/#22 are preserved.
- Verified `npm test`: 9 files passed, 51 tests passed.
- Verified `npm run build`.

## 2026-06-15 JR detached feet fragment — split-frame source art

- Live QA after PRs #21-#23 still saw a small black/orange fragment near the Junior Compiler's shadow in Office Hub, despite PR #21 already moving action poses off row 3.
- Deeper root cause (separate from PR #21): the native art-pack sheets are misassembled. In nearly every 32x48 cell the character body is split by a horizontal transparent band that leaves the legs/feet as a detached lower segment; many cells also carry stray pixel columns on a cell edge. Reproduced from real pixels with a CPU compositor at the real engine geometry (origin 0.5/0.9, foot offset 5): the detached feet segment of `sprite_compiler` frame 0 lands directly on the shadow line and renders as the free-floating orange/black fragment. JuniorCompiler maps walk-down/attack -> idle-down -> frame 0, so it always showed this. The player walks frames 0-11, all similarly split.
- Idle-down (frame 0) is the only cell that is edge-clean (no stray columns) on every sheet, with at most one closeable vertical gap. Fix:
  - Closed the single vertical gap in frame 0 by sliding the lower segment up to rejoin the body, regenerating the PNGs for the 5 sheets that had a frame-0 gap (`sprite_compiler`, `sprite_editor`, `sprite_records_officer`, `sprite_reviewer`, `sprite_security_officer`). The other sheets' frame 0 was already contiguous and untouched.
  - Remapped every direction and action pose to frame 0 in `src/art/character_anims.ts`, extending PR #21's "reuse complete frames" principle to its conclusion so no character ever plays a split/stray cell. Characters convey motion by position/bob, so no visible animation is lost.
- Regression coverage in `src/art/characterSprites.test.ts`:
  - asserts every direction and action pose resolves to frame 0 (the clean cell);
  - decodes every shipped native PNG and asserts each referenced frame has no interior transparent row-band (`largestInteriorRowGap <= 1`), i.e. the body is one contiguous piece — failing on the detached-feet defect.
- Did not touch TitleScene or overlay-input code. Verified `npm test`: 9 files, 50 tests passed. Verified `npm run build`.

## 2026-06-15 Live-QA fix pass: title keyboard advance, tap movement, prompt reach, failed-interaction feedback

Live QA after PR #26 still failed on four interaction/feel issues. Root causes and fixes:

- **Title would not advance from the keyboard after the warning.** The WarningScene advances on a *held* A/start, then hands off to the title with that key still physically down. The title's rising-edge-only check (`aJustPressed`) never fired until the player released and re-pressed, so the title looked stuck and required a pointer click.
  - Fix: extracted a Phaser-free `shouldStartTitle(input, inputReady)` into `src/scenes/titleLayout.ts`. It accepts a fresh A/start/pointer rising edge always, plus a *held* A/start once a short input-ready grace (~350ms) has elapsed, so a continuously-held key carries straight through warning -> title -> next scene. `TitleScene` sets `inputReadyAt = time.now + 350` in `create()` and calls the helper in `update()`.
  - Added `KeyZ` (A/confirm) and `KeyX` (B) mappings in `InputState` — the classic SNES faces a browser-emulator tester reaches for first. `KeyA/KeyS` stay movement-only so WASD is unaffected.

- **Short taps produced no visible movement.** A too-short tap (keydown+keyup inside one frame, or a synthetic keypress from a cloud/automation browser) is added to and removed from `keyboardDown` between two `tickInput()` samples, so the held check never saw it.
  - Fix: `directionTapLatch` records each direction code's most-recent keydown time; new `isDirectionActive()` treats a direction as down while its latch is fresh (`TAP_MOVEMENT_HOLD_MS = 110`). Turns an imperceptible tap into a small visible nudge. Held movement and collision are unchanged (the held path still short-circuits via `isKeyboardDown`). `nav*` edges still use the strict held check, so menu navigation is unaffected. Latch is cleared in `resetInput()`.

- **Office Hub proximity prompt was easy to miss.** Nothing was inside the strict interact radius during the audit, so no ring/plaque ever showed.
  - Fix: `nearestInteractableHint()` (interaction.ts) shows the prompt from `radius + 14px`, while interaction still requires the strict radius. `OfficeScene` drives the prompt off the hint target; pressing A on a hint target just out of strict range shows a `STEP CLOSER TO <TARGET>` info toast instead of the misleading "nothing to interact with". Ring/glow enlarged and brightened in `interactionPrompt.ts`.

- **Failed-interaction feedback** already meets the ~1.5s+ visible requirement (1600ms hold + 400ms fade, depth above HUD); verified and reused for the new step-closer cue.

- Regression coverage:
  - `src/scenes/TitleScene.test.ts`: `shouldStartTitle` accepts fresh edges always, held A/start only once input-ready, nothing otherwise.
  - `src/input/InputState.test.ts`: Z->A/confirm and X->B mapping; a too-short tap becomes a brief visible hold then releases; WASD taps equal arrow taps.
- Preserved all prior fixes (title art, sprite fragments, shadows, ESC overlay close) — no art or overlay code touched.
- Verified `npm test`: 12 files, 74 tests passed. Verified `npm run build`.

## Failed-interaction feedback not verifiable in live play (post PR #28)

Live QA after PR #28 still could not observe `STEP CLOSER` or `NOTHING TO INTERACT WITH`; prompts kept attaching to nearby targets.

- **Root cause:** PR #28 wired the `FeedbackToast` (STEP CLOSER / NOTHING TO INTERACT WITH) and the `radius + margin` prompt hint *only into `OfficeScene`*. The first scene a player actually explores after the title — `GuideScene` (Archive Cavern) — still used the old `nearestInteractable` + low-contrast bottom `hintText` path with no toast and no hint margin. Its four interactables (radii 28–30px) are packed in a small room, so `nearestInteractable` almost always matched and pressing A away from a target produced no observable feedback. QA started in this room, so the cue under test was unreachable.
- **Fix:**
  - Extracted a pure, Phaser-free `decideInteractionFeedback(actable, hint)` into `src/systems/interaction.ts` returning `act` / `step-closer` / `nothing`. Single-sourced the decision so both scenes agree and it is unit-testable.
  - Wired `FeedbackToast` + `nearestInteractableHint` into `GuideScene`: the floating prompt now shows from `radius + 14px`, acting still requires the strict radius, and pressing A produces a prominent toast — `STEP CLOSER TO <TARGET>` when a hint is nearby but out of strict range, `NOTHING TO INTERACT WITH` when no target/hint exists. Toast keeps ticking/fading on the dialog and overlay early-return branches.
  - Refactored `OfficeScene` to consume the same `decideInteractionFeedback` (behavior unchanged, duplicate inline logic removed).
- **Toast spec reused from PR #28:** 1600ms hold + 400ms fade (>1.5s), depth 1200 (above HUD/world), floats above the player, clamped clear of both HUD bands.
- **Out of scope (caveat):** `ArchiveScene`, `GameplayMapScene`, and `DanneMapScene` still use the legacy hint path. `ArchiveScene`'s interact loop is combat/workflow-aware (enemy actions, source-note verification), so reusing the simple explore decision there would risk regressions; left untouched.
- Tests: added `src/systems/interaction.test.ts` covering the decision logic and the live-verifiable band (hint shows but cannot act just outside strict radius; acts inside; nothing beyond hint radius). `npm test`: 13 files, 83 tests passed. `npm run build` passed.

## 2026-06-15 First-class 20-year records access gate

- Split the Office Hub early progression so `records_access` is no longer just implied by the Scope Charter. The desk route now flows: Series Plan -> Volume Concept -> 20-Year Access -> Scope Charter -> Collection -> Candidate Selection -> Selection Docket.
- Added `src/game/recordsAccess.ts`, a Phaser-free gate module grounded in the official About FRUS page. It checks:
  - 20-year access timing for OH historians;
  - full and complete pertinent-records scope;
  - the relationship between 20-year access and the 30-year publication clock.
- Bad shortcuts now map to standards damage categories: public/easy narrowing (`omitted_material_fact`), machine readiness (`altered_text`), clean-story narrowing (`concealed_policy_defect`), and late-start deadline confusion (`missed_30_year_deadline`).
- `src/game/frusProductionBoard.ts` now carries `recordsAccessComplete` in the board context; old saves with the Golden Rule stamp remain compatible, but new Office play records the milestone explicitly in `sceneProgress.recordsAccessComplete`.
- `src/scenes/OfficeScene.ts` now awards the Golden Rule stamp on completing the 20-year access authorization. The Scope Charter now focuses on scope, source route, and Kellogg selection discipline instead of re-asking the access question.
- Deep-link seeding in `src/game/state.ts` now marks records access complete for Guide/Archive/later scenes so QA shortcuts do not get trapped behind the new early gate.
- Tests:
  - Focused: `npm test -- src/game/recordsAccess.test.ts src/game/researchCharter.test.ts src/game/frusProductionBoard.test.ts` -> 3 files / 23 tests passed.
  - Full: `npm test` -> 47 files / 229 tests passed.
  - Build: `npm run build` passed.
- Runtime smoke:
  - Started local dev server on `http://127.0.0.1:5187/?scene=OfficeScene&role=compiler&name=Ruby`.
  - Ran the required web-game Playwright client. `render_game_to_text()` reported `productionBoard.total: 20`, `nextStep.id: "series_concept"`, and `records_access` locked/incomplete with source URL `https://history.state.gov/historicaldocuments/about-frus`.
  - Screenshot artifact `output/web-game/shot-0.png` is black due to the already-known headless WebGL capture issue; text state was valid and no console-error artifact was present.

## 2026-06-15 GPO publication steps promoted to the Production Board

- Promoted two already-playable EndingScene publication tasks into `src/game/frusProductionBoard.ts`:
  - `gpo_segment_assembly`: prepared segments move to GPO, the final segment carries index/apparatus, and GPO binds the complete certified volume.
  - `gpo_publication`: Department/GPO publication handoff, final binding, and funding-delay handling without altering the record.
- Both steps are sourced to the official FRUS history stages page and now sit between `kellogg_editing` and `chapter_release_status`, so the public chapter ledger no longer appears as the next board task immediately after editorial treatment.
- `getProductionBoardReadout()` now passes `sceneProgress.gpoSegmentAssemblyComplete` and `sceneProgress.gpoPublicationComplete` into the board context. Existing EndingScene gameplay already sets those flags through the GPO prompts.
- Regression coverage:
  - Board order now includes `gpo_segment_assembly` and `gpo_publication`.
  - A proof-ready volume exposes GPO segment assembly as the active next step.
  - Chapter status stays locked until both GPO segment assembly and GPO publication handoff are complete.
- Verified focused tests: `npm test -- src/game/frusProductionBoard.test.ts src/game/gpoSegmentAssembly.test.ts src/game/gpoPublication.test.ts` -> 3 files / 22 tests passed.
- Verified full `npm test` -> 47 files / 230 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Started local dev server on `http://127.0.0.1:5188/?scene=EndingScene&role=compiler&name=Ruby`.
  - Required web-game Playwright client reported `productionBoard.total: 22`, `completed: 15`, `nextStep.id: "gpo_segment_assembly"`, `gpo_publication.status: "locked"`, and `chapter_release_status.status: "locked"`.
  - Screenshot artifact remains black due to the known headless WebGL capture issue; text state was valid and no console-error artifact was present.

## 2026-06-15 Front matter and final certification promoted to the Production Board

- Promoted two already-playable EndingScene publication tasks into `src/game/frusProductionBoard.ts`:
  - `front_matter_assembly`: the Buckram Gate publication apparatus step for preface/scope, sources consulted, persons and abbreviations lists, proofed pages, and index handoff.
  - `kellogg_final_certification`: the final human certification that the volume is thorough, accurate, reliable, and contains no undisclosed deletions, material omissions, or concealed policy defects.
- The steps are sourced to the official FRUS history stages page and About FRUS/Kellogg standards page, and now sit between `kellogg_editing` and `gpo_segment_assembly`, so the GPO packet cannot appear before the publication apparatus and final Kellogg check.
- `getProductionBoardReadout()` now passes `sceneProgress.frontMatterAssemblyComplete` and `sceneProgress.kelloggFinalCertificationComplete` into the board context. Existing EndingScene gameplay already sets those flags through the front matter and certification prompts.
- Final `publication_30_year` completion now requires front matter assembly, final certification, GPO segment assembly, GPO publication handoff, chapter release status, digital release, public citation, release calendar, reliability >= 70, the proof stamp, and no unresolved undisclosed deletions.
- Regression coverage:
  - Board order now includes `front_matter_assembly` and `kellogg_final_certification`.
  - A proof-ready volume exposes front matter assembly as the active next step before final certification and GPO.
  - Final publication stays locked until publication apparatus, certification, GPO, chapter ledger, digital release, public citation, and release calendar are complete.
- Verified focused tests: `npm test -- src/game/frusProductionBoard.test.ts src/game/frontMatterAssembly.test.ts src/game/kelloggCertification.test.ts src/game/publicationApparatus.test.ts` -> 4 files / 33 tests passed.
- Verified full `npm test` -> 47 files / 231 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Started local dev server on `http://127.0.0.1:5189/?scene=EndingScene&role=compiler&name=Ruby`.
  - Required web-game Playwright client reported `productionBoard.total: 24`, with `front_matter_assembly` surfaced before `kellogg_final_certification`, `gpo_segment_assembly`, `gpo_publication`, and `chapter_release_status`.
  - Screenshot artifact remains black due to the known headless WebGL capture issue; text state was valid and no console-error artifact was present.

## 2026-06-15 Typeflow and typesetter proof promoted to the Production Board

- Promoted the existing Silent Read Tower editing loops into `src/game/frusProductionBoard.ts`:
  - `modern_typeflow_order`: since the late 1970s, manuscript clearance comes before typesetting.
  - `typesetter_proof`: after typesetting, pages are compared with original documents and remaining textual issues are flagged for compiler consultation.
- Both steps are sourced to the official FRUS history stages page and now sit between `kellogg_editing` and `front_matter_assembly`, making the late editing path visible before publication apparatus work begins.
- `getProductionBoardReadout()` now passes `sceneProgress.typeflowOrderComplete` and `sceneProgress.typesetterProofComplete` into the board context. Existing SilentReadScene gameplay already sets those flags through the typeflow and proof prompts.
- Final `publication_30_year` completion now explicitly requires the modern typeflow order and typesetter proof gates as well as front matter, final certification, GPO handoff, chapter ledger, digital release, public citation, release calendar, reliability >= 70, proof stamp, and no unresolved undisclosed deletions.
- Regression coverage:
  - Board order now includes `modern_typeflow_order` and `typesetter_proof`.
  - A proof-ready volume exposes modern typeflow, then typesetter proof, then front matter assembly.
  - Final publication stays locked after typeflow alone and after typesetter proof alone.
- Verified focused tests: `npm test -- src/game/frusProductionBoard.test.ts src/game/typeflowOrder.test.ts src/game/typesetterProof.test.ts src/game/publicationApparatus.test.ts` -> 4 files / 30 tests passed.
- Verified full `npm test` -> 47 files / 232 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Started local dev server on `http://127.0.0.1:5192/?scene=EndingScene&role=compiler&name=Ruby`.
  - Required web-game Playwright client reported `productionBoard.total: 26`; `modern_typeflow_order` and `typesetter_proof` were complete, `front_matter_assembly` was active, and later certification/GPO steps were locked.
  - Screenshot artifact remains black due to the known headless WebGL capture issue; text state was valid and no console-error artifact was present.

## 2026-06-15 True Ending certification screen replaces placeholder

- Replaced the `TrueEndingScene` placeholder copy (`TRUE ENDING - TO BE WRITTEN`) with a full ruby-buckram certification tableau:
  - certified/uncertified title state based on live quest data;
  - final FRUS hardback cover drawn in the existing pixel palette;
  - certification ledger for pendants, equity crystals, cover fragments, treaty record, publication apparatus, Production Board, reliability, and Kellogg standards;
  - concise final summary text that keeps human review, provenance, declassification judgment, and public-record publication at the center.
- Added `src/game/trueEndingCertificate.ts`, a pure certificate readout that derives the true-ending state from process stamps, document equities, cover fragments, treaty fragments, publication apparatus, Production Board progress, reliability, Buckram Gate state, and standards-clear status.
- Added deterministic tests in `src/game/trueEndingCertificate.test.ts`:
  - certifies only when the FRUS production packet and treaty record are complete;
  - blocks certification when treaty fragments are missing;
  - blocks certification when standards, apparatus, or board gates remain open.
- Verified focused tests: `npm test -- src/game/trueEndingCertificate.test.ts` -> 1 file / 3 tests passed.
- Verified full `npm test` -> 48 files / 235 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Started local dev server on `http://127.0.0.1:5193/?scene=TrueEndingScene&role=compiler&name=Ruby`.
  - Required web-game Playwright client reported `scene: "TrueEndingScene"`, `mode: "ending"`, no visible threats, no placeholder text, `visibleEntities` led by `FRUS VOLUME REVIEWED` for a direct unseeded deep link, and the expected missing publication gates in `publicationReadiness`.
  - A targeted Playwright request-failure probe reported no 4xx/console errors for the TrueEndingScene route.
  - Headless and headed screenshot artifacts remain black due to the known WebGL capture issue; text state was valid.

## 2026-06-16 Scope Charter promoted to the Production Board

- Promoted the existing OfficeScene Scope Charter loop into `src/game/frusProductionBoard.ts` as `research_charter`, placed after `records_access` and before `record_collection`.
- The new board step is sourced to the About FRUS page and describes the existing gameplay task: file scope, source route, and Kellogg standards at the Scope / Selection Desk before collection begins.
- `getProductionBoardReadout()` now passes `sceneProgress.researchCharterComplete`, and `seedProgressForScene()` files the charter for later-scene deep links so QA routes do not strand the player behind an early gate.
- The research phase readout now includes seven steps: access, scope charter, collection, repository coverage map, selection, source notes, and annotation.
- Final `publication_30_year` completion now requires the scope charter, with backward-compatible inference when a saved state already has later collection work filed.
- Regression coverage:
  - Board order now includes `research_charter`.
  - 20-year access no longer jumps directly to collection; the Scope Charter becomes the next active board task.
  - ArchiveScene seeding marks the charter complete before source-note and annotation play.
- Verified focused tests: `npm test -- src/game/researchCharter.test.ts src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts src/game/finalPublicationCertification.test.ts` -> 4 files / 30 tests passed.
- Verified full `npm test` -> 56 files / 269 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Started local dev server on `http://127.0.0.1:5173/`.
  - Required web-game Playwright client completed against `?scene=OfficeScene&role=compiler&name=Ruby`; the screenshot artifact remains black due to the known headless WebGL capture issue.
  - Direct Playwright text-state probe for OfficeScene reported `productionBoard.total: 35` and the first steps `series_concept`, `volume_concept`, `records_access`, `research_charter`, `record_collection`, `repository_coverage_map`, `research_selection`, `source_notes`.
  - Direct Playwright text-state probe for ArchiveScene reported `research_charter` complete with `sceneProgress.researchCharterComplete: 1`, `researchCharterStep: 3`, and no console/page errors.

## 2026-06-16 AI Annotation Review promoted to the Production Board

- Promoted the already-playable SilentReadScene AI Annotation Review SOP loop into `src/game/frusProductionBoard.ts` as `ai_annotation_review`, placed after HAC/process monitoring and before Editorial Methodology.
- The new board step keeps StateChat terminal-only: it can flag mechanical annotation issues, while evidence-bound issues and final sign-off remain accountable human decisions.
- `getProductionBoardReadout()` now passes `sceneProgress.aiAnnotationReviewComplete`; EndingScene deep links file the AI review log, and SilentReadScene deep links seed HAC oversight so the board can surface AI review as the active editing gate.
- The editing phase readout now starts with AI Annotation Review before methodology, editorial treatment, typeflow, printer's-copy preparation, and typesetter proof.
- Final `publication_30_year` completion now requires the AI review SOP through either `sceneProgress.aiAnnotationReviewComplete` or the backward-compatible SOP stamp.
- Fixed the SilentReadScene editor-room objective so it says to run AI annotation review before carrying flags until the SOP is filed.
- Regression coverage:
  - Board order now includes `ai_annotation_review`.
  - HAC completion exposes AI Annotation Review as the next active step and locks Editorial Methodology behind it.
  - The editing phase begins with `AIR` and totals six steps.
- Verified focused tests: `npm test -- src/game/aiAnnotationReview.test.ts src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts src/game/finalPublicationCertification.test.ts` -> 4 files / 32 tests passed.
- Verified full `npm test` -> 56 files / 271 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Restarted local dev server on `http://127.0.0.1:5173/`.
  - Required web-game Playwright client completed against `?scene=SilentReadScene&role=proofreader&name=Sam`; the generated screenshot remains black due to the known headless WebGL artifact.
  - Direct Playwright text-state probe for SilentReadScene reported `productionBoard.total: 36`, `ai_annotation_review` active, `advisory_monitoring` complete, `editorial_methodology` locked, active editing phase `AIR`, objective `Editor's Labyrinth: run AI annotation review before carrying flags.`, and no console/page errors.

## 2026-06-16 Source Note provenance state wired to the Production Board

- Tightened the existing `source_notes` Production Board gate so it now uses `SOURCE_NOTE_PROVENANCE_SOURCE_URL` and the explicit Source Note 47 repository/collection/folder gameplay task instead of a generic About FRUS label.
- `getProductionBoardReadout()` now accepts `sceneProgress.sourceNoteProvenanceComplete`, while remaining backward-compatible with the existing Archive stamp, Citation Stamp item, and citation-verified document states.
- Final `publication_30_year` completion now explicitly requires source-note provenance through either the saved provenance flag or the Archive stamp.
- Split ArchiveScene deep-link seeding from later-scene seeding: Archive starts with selected candidate records but no pre-granted Citation Stamp or citation-verified Source Note 47, so the player and board both begin at the actual provenance loop. NetworkScene and later still seed the completed source-note state.
- Regression coverage:
  - A selected, coverage-complete document set now stops at `source_notes` until `sourceNoteProvenanceComplete` is filed.
  - Source-note provenance completion opens annotation and keeps manuscript review locked until annotation is drafted.
- Verified focused tests: `npm test -- src/game/sourceNoteProvenance.test.ts src/game/frusProductionBoard.test.ts src/game/frusProductionPhases.test.ts src/game/finalPublicationCertification.test.ts` -> 4 files / 33 tests passed.
- Verified full `npm test` -> 56 files / 272 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Restarted local dev server on `http://127.0.0.1:5173/`.
  - Required web-game Playwright client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`; the generated screenshot remains black due to the known headless WebGL artifact.
  - Direct Playwright text-state probe for ArchiveScene reported `productionBoard.total: 36`, `source_notes` active, `research_selection` complete, `annotation` locked, objective `Archive Cavern: collect Source Note 47 in A1.`, no seeded `sourceNoteProvenanceComplete`, and no console/page errors.

## 2026-06-16 Agency equity crystals made a real Production Board gate

- Tightened `agency_referrals` in `src/game/frusProductionBoard.ts` so one resolved agency equity no longer completes the referral gate by itself.
- The board now requires the Referral stamp, the Concurrence Slip, or all distinct agency-equity crystals resolved via `crystalsEarned(...) === totalEquities(...)`, matching the Zelda-like crystal loop and the step text that says every distinct agency equity must resolve cleanly.
- Added a regression in `src/game/frusProductionBoard.test.ts` proving partial crystal collection keeps `agency_referrals` active and `advisory_monitoring` locked until all distinct equities are resolved.
- Verified focused tests: `npm test -- src/game/frusProductionBoard.test.ts src/game/frusProgression.test.ts` -> 2 files / 27 tests passed.
- Verified full `npm test` -> 56 files / 273 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Started local dev server on `http://127.0.0.1:5173/`.
  - Required web-game Playwright client completed against `?scene=ReferralVaultScene&role=declass_coordinator&name=Ruby`; the generated screenshot remains black due to the known headless WebGL artifact.
  - Direct Playwright text-state probe for ReferralVaultScene reported `foreign_permissions` active, `withholding_appeals`, `agency_referrals`, and `advisory_monitoring` locked, visible referral walls active, and no console/page errors.

## 2026-06-16 Equity crystals scoped to the active volume packet

- Refined `src/game/frusProgression.ts` so equity crystals count only active selected/reviewed documents when workflow metadata is present; anonymous unit-test fixtures without workflow metadata still count all supplied equities.
- Removed the old Source Note 47 pseudo-equity from `src/game/documentWorkflow.ts`; source-note provenance is now represented by the dedicated `source_notes` board gate rather than a declassification crystal.
- Updated the adventure subscreen crystal readout to use the same active-packet filter, keeping HUD/map status aligned with the board and Buckram Gate logic.
- Regression coverage now proves unselected found candidates and selected-but-not-submitted provenance notes do not count as agency-equity crystals, while submitted/proofed review documents do.
- Verified focused tests: `npm test -- src/game/frusProgression.test.ts src/game/frusProductionBoard.test.ts src/game/finalPublicationCertification.test.ts src/game/trueEndingCertificate.test.ts` -> 4 files / 34 tests passed.
- Verified full `npm test` -> 56 files / 274 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Started local dev server on `http://127.0.0.1:5173/`.
  - Required web-game Playwright client completed against `?scene=ReferralVaultScene&role=declass_coordinator&name=Ruby`; the generated screenshot remains black due to the known headless WebGL artifact.
  - Direct Playwright text-state probe for ReferralVaultScene reported crystal scope `earned: 0`, `total: 2`, only `sbu_annotation_001` in `byDocument`, `foreign_permissions` active, `agency_referrals` locked, and no console/page errors.

## 2026-06-16 Buckram Gate readiness separates equity crystals from cover fragments

- Updated `getPublicationReadinessReadout()` so final readiness now reports agency-equity `crystals` separately from ruby-cover `coverFragments`.
- The Buckram Gate now requires cleared active equity crystals in addition to the five cover fragments, required process stamps, repository map, publication apparatus, reliability, Buckram Key, and clean standards ledger.
- DANN-E's statutory clock `C` counter now reads declassification equity crystals rather than cover fragments, while the EndingScene checklist continues to show `FRAG` for the cover pieces.
- Added a final-publication regression proving five cover fragments do not open the Buckram Gate when one active agency equity remains referred.
- Verified focused tests: `npm test -- src/game/finalPublicationCertification.test.ts src/game/statutoryClock.test.ts src/game/standardsViolations.test.ts src/game/trueEndingCertificate.test.ts` -> 4 files / 17 tests passed.
- Verified full `npm test` -> 56 files / 275 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Started local dev server on `http://127.0.0.1:5173/`.
  - Required web-game Playwright client completed against `?scene=EndingScene&role=compiler&name=Ruby` with no input; the generated screenshot remains black due to the known headless WebGL artifact. A Space-input variant navigated during the state read, so the no-input route is the stable smoke for this scene.
  - Direct Playwright text-state probe for EndingScene reported `crystals: 2/2`, `coverFragments: 5/5`, Buckram Key held, Buckram Gate still locked by publication apparatus only, and no console/page errors.

## 2026-06-16 Publication readiness separates research pendants from process stamps

- Corrected `getPublicationReadinessReadout()` so the DANN-E statutory clock and final-readiness HUD now report only the three FRUS/Zelda research pendants (`RULE`, `ARCHIVE`, `SOP`) as `P`.
- Added a parallel `processStamps` readout for the broader Buckram Gate process stamps (`RULE`, `ARCHIVE`, `NETWORK`, `REFERRAL`, `PROOF`) so non-pendant gates still block certification visibly.
- Missing summaries now distinguish `Pendant SOP` from non-pendant blockers such as `Process NETWORK`, avoiding the old misleading `Pendant NETWORK` label.
- The Buckram Gate now stays closed when the SOP pendant is missing, even if all five process stamps and other publication gates are otherwise complete.
- Regression coverage:
  - Three research pendants can be complete while network/referral/proof process gates remain locked.
  - Missing SOP is surfaced as a pendant blocker and blocks publication readiness.

## 2026-06-16 Production Board source card exposed in play state

- Added the active FRUS Production Board step's `sourceBasis` and `sourceUrl` to the ALttP-style adventure subscreen readout and therefore to `render_game_to_text()`.
- The pause/subscreen panel now shows a compact `SOURCE: history.state.gov/...` line under the next board gate, while the Office Hub FRUS Production Board dialog includes a full `SOURCE:` page after the `WHY:` page.
- This keeps every current gameplay task visibly tied to the official FRUS source path while preserving StateChat as terminal/system output only.
- Regression coverage:
  - `src/game/adventureSubscreen.test.ts` proves the active board task carries its source basis and URL through both `getAdventureSubscreenReadout()` and `renderGameToText()`.
- Verified focused tests: `npm test -- src/game/adventureSubscreen.test.ts src/game/frusProductionBoard.test.ts` -> 2 files / 25 tests passed.

## 2026-06-16 Manuscript review remains a human gate after annotation

- Tightened the FRUS Production Board so documents in `ready_for_review` no longer count as completed manuscript review by themselves.
- Annotation now leads the player to the FRUS Cart manuscript-review station; only `sceneProgress.manuscriptReviewComplete` or an already-advanced declassification save can complete the `manuscript_review` board gate.
- This preserves the official FRUS stages distinction between drafting annotation and the later human manuscript review for completeness, cohesion, concision, content appropriateness, and annotation accuracy.
- Regression coverage:
  - A balanced selected packet with drafted annotations and documents at `ready_for_review` now keeps `manuscript_review` active and `clearance_procedure` locked.
- Verified focused tests: `npm test -- src/game/frusProductionBoard.test.ts src/game/manuscriptReview.test.ts src/game/frusProductionPhases.test.ts` -> 3 files / 31 tests passed.
- Verified full `npm test` -> 57 files / 280 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Required web-game Playwright client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`; generated screenshot remains black due to the known headless WebGL artifact.
  - Direct Playwright text-state probe with annotation drafted and documents at `ready_for_review` reported `manuscript_review` active, `clearance_procedure` locked, source URL `https://history.state.gov/historicaldocuments/frus-history/stages`, and no console/page errors.

## 2026-06-16 Sources consulted list made a filed front-matter component

- Tightened `publicationApparatus.sources_consulted` so it now requires the Source Note Fragment, complete repository coverage, and a filed sources-consulted front-matter step.
- `getFinalGateReadiness()` now passes `sourcesConsultedListComplete` from `frontMatterAssemblyStep >= 2` or completed front-matter assembly, so partial front-matter progress can satisfy the source-list component while full assembly remains its own apparatus gate.
- This keeps the official FRUS stages distinction visible: the research coverage map proves the source base, but the publication apparatus still needs a reader-facing sources-consulted list.
- Regression coverage:
  - `src/game/publicationApparatus.test.ts` proves the sources-consulted component stays missing until the front-matter source-list prompt is filed.
- Verified focused tests: `npm test -- src/game/publicationApparatus.test.ts src/game/frontMatterAssembly.test.ts src/game/finalPublicationCertification.test.ts src/game/standardsViolations.test.ts` -> 4 files / 27 tests passed.

## 2026-06-16 True ending now requires a reader-facing public record

- Added an explicit `PUBLIC RECORD` line to the true-ending certificate so the final ending no longer infers public transparency only from broad Production Board counts.
- `buildTrueEndingCertificate()` now requires `publicRecordComplete`, sourced from the official About FRUS mission of a public documentary record.
- `certifyFinalPublicationAfterDanne()` and `TrueEndingScene` now pass `publicRecordComplete` only when the public citation card, release-calendar docket, and published final-gate certification are all present.
- Regression coverage:
  - `src/game/trueEndingCertificate.test.ts` proves the true ending stays reviewed-but-uncertified until the public-record handoff is filed.
- Verified focused tests: `npm test -- src/game/trueEndingCertificate.test.ts src/game/finalPublicationCertification.test.ts` -> 2 files / 10 tests passed.
- Verified full `npm test` -> 57 files / 282 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Required web-game Playwright client completed against `?scene=TrueEndingScene&role=compiler&name=Ruby`; the generated screenshot remains black due to the known headless WebGL artifact.
  - Direct Playwright text-state probe for TrueEndingScene reported `mode: "ending"`, objective `True ending review: certification packet still has visible open work.`, visible certificate title `FRUS VOLUME REVIEWED`, `Production Board 0/36`, and no console/page errors.

## 2026-06-16 Native 16-bit title card promoted into the live title scene

- Added the repository-local `title_screen_256x224.png` art-pack image to the typed screen registry so BootScene preloads it with the rest of the local art pack.
- `TitleScene` now renders the native-resolution 16-bit title card at 1x when it is loaded and falls back to the procedural title screen if the art pack is missing.
- Kept a small bottom command strip for `A / ENTER START` and the existing skip-warning toggle without cropping or scaling the 256x224 title art.
- Regression coverage:
  - `src/scenes/TitleScene.test.ts` proves the live title asset path points at the native 256x224 PNG, preventing accidental downscaled high-res use.
- Verified focused tests: `npm test -- src/scenes/TitleScene.test.ts` -> 1 file / 8 tests passed.
- Verified full `npm test` -> 57 files / 283 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Required web-game Playwright client completed against `?scene=TitleScene&role=compiler&name=Ruby`; the generated screenshot remains black due to the known headless WebGL artifact.
  - Direct Playwright probe reported `scene: "TitleScene"`, `mode: "title"`, `title_screen_256x224` loaded at `256x224`, no console/page errors, and pointer start advanced to `CharacterCreateScene`.

## 2026-06-16 World atlas cartouches all route to playable FRUS rooms

- Filled every previously un-routed overworld district in `src/data/regions.ts` with an existing gameplay-map destination, so all 40 cartouches now lead to playable FRUS spaces instead of placeholder "coming soon" modals.
- Kept the routes thematic: embassy/cable tasks go to `embassy`, evidence and archive work goes to `nara_stacks`, review decisions go to `west_wing` or `capitol_hill`, production walkthroughs go to `frus_floor`, and restricted corridors go to `black_vault`.
- Updated `WorldMapScene` text-state and hover copy so the region map reports playable destinations and only uses "unrouted" as a safety fallback.
- Added `src/data/regions.test.ts` to prove each region still has eight numbered districts, every district has a registered gameplay-map destination, and every current gameplay map is reachable from the atlas.

## 2026-06-16 Embassy Chancery cable collection made playable

- Replaced the Embassy `Chancery Door` placeholder text with a stateful field-collection interaction sourced to the official FRUS stages page: compilers identify important records, search for them, and make copies or notes for publication/context.
- Added `logFieldCableCollection()` to `src/game/recordCollection.ts` so the side-room cable action advances the collection step to the field-note point, awards document points once, and cannot be farmed on repeat interactions.
- Wired `GameplayMapScene` so the first Chancery interaction logs `embassyCableLogged`, promotes `telegram_001` from `found` to `candidate`, awards 3 document points, and tells the player the formal Office Collection board gate still needs review.
- Fixed `GameplayMapScene.update()` so an interaction-specific objective survives while the dialog is open instead of being immediately reset to the map's default objective.
- Added record-collection regression tests proving the cable log records the source-backed field note and repeat interactions do not rewind progress or add more points.
- Verified focused tests: `npm test -- src/game/recordCollection.test.ts` -> 1 file / 7 tests passed.
- Verified full `npm test` -> 59 files / 295 tests passed.
- Verified `npm run build` passed with the existing Vite chunk-size warning.
- Runtime smoke:
  - Required web-game Playwright client completed against `?scene=GameplayMapScene&map=embassy&role=compiler&name=Ruby`; the generated screenshot remains black due to the known headless WebGL artifact.
  - Direct Playwright interaction probe moved the player to the Chancery interaction, pressed Space, and reported `embassyCableLogged: 1`, `recordCollectionStep: 1`, `documentPoints: 3`, `telegram_001.workflowState: "candidate"`, the objective `Embassy cable copied into the collection notes...`, and no console/page errors.
  - Repeat-interaction probe reported the already-logged message, kept `documentPoints: 3`, and kept a single workflow-log entry.
- Gameplay-map interaction smoothing pass (2026-06-16):
  - Fixed the NARA II and West Wing gameplay-map flow where pressing Space immediately after spawn could accidentally activate a world-exit door. `GameplayMapScene` now nudges spawn points away from world-map exits while preserving the same Tiled door definitions.
  - Turned the NARA Stack Control Note and Oval Office Desk from static sign text into stateful FRUS production gates: Stack Control now requires the NARA Source Index before filing a Stack Transfer Manifest and Document Cart Route; the Oval Office desk now requires NSC source coverage before filing a Chronology Briefing Memo and Policy Context Note.
  - Removed visible WIP/phase copy from older DANN-E map routes and threat readouts, replacing it with in-world instructions for manifest routing, treaty fragment gating, Ruby Pen use, and human review.
  - Reduced the Office Hub first-run controls card, hid proximity prompts/bottom hints while it is visible, and swallowed confirm/cancel dismissal so a first Space/A press no longer triggers a stray step-closer toast or interaction.
  - Verified focused tests for `stackControlManifest` and `ovalOfficeBriefing` (2 files / 6 tests), full `npm test` (67 files / 323 tests), and `npm run build` (passes with existing Vite chunk-size warning only).
  - Required web-game client ran against `?scene=GameplayMapScene&map=nara_stacks&role=compiler&name=Ruby`; direct runtime probes confirmed NARA spawn no longer auto-exits, Stack Control locked/unlocked states, catalog filing, Stack Transfer Manifest filing, West Wing spawn safety, Secret Service source-coverage clearing, Oval Office briefing filing, and no console/page errors. Screenshots: `output/web-game/office-tutorial-compact-page-2.png`, `output/web-game/office-tutorial-dismissed-page-2.png`.

## 2026-06-30 First-hour SNES adventure readability pass

- Treated the supplied A Link to the Past walkthrough as mechanics reference only: screen readability, tile blocking, landmarks, and interactable cues were translated into original FRUS production spaces without copying Nintendo assets, maps, text, audio, or sprites.
- Added `src/systems/snesMapDressing.ts`, a runtime-generated 16x16 SNES-style dressing layer for gameplay-map scenes using original floor, blocker, door, NPC, and document-marker textures.
- `GameplayMapScene` now draws map-specific floor tiles, collision-blocker tiles, and feature markers from the existing Tiled object layers while preserving the static map art, collision data, and interactable behavior.
- NARA Stacks runtime probe confirmed 176 archive floor tiles, 110 shelf/blocker tiles, 2 door markers, 1 NPC marker, 2 document markers, the visible readout `SNES archive dungeon shelves and catalog path`, and no console/page errors.
- Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).

## 2026-06-30 SNES map-dressing variant and silhouette upgrade

- Expanded the generated gameplay-map dressing into a richer SNES-style layer:
  - 4 deterministic floor variants per map surface.
  - 3 deterministic blocker variants per collision material.
  - Distinct 16x16 silhouettes for doors, locked gates, NPCs, document notes, and workstations.
  - A thin map-local frame and stepped pulsing on important feature markers.
- `GameplayMapScene` now passes richer feature metadata from existing Tiled object layers into the dressing system, so red-zone gates, vaults, doors, desks, queues, tables, stations, NPCs, and documents read differently without adding parallel gameplay data.
- Runtime probe across `nara_stacks`, `historian_office`, `black_vault`, and `embassy` confirmed:
  - all sampled maps emitted 4 floor variants and 3 blocker variants;
  - NARA Stacks showed door, NPC, gate, and workstation icons;
  - Historian Office showed door, NPC, document, and workstation icons;
  - Black Vault showed door and gate icons;
  - Embassy showed door, gate, and workstation icons;
  - no console/page errors.
- Required web-game client completed against `?scene=GameplayMapScene&map=nara_stacks&role=compiler&name=Ruby`; screenshot capture remains black due to the known headless WebGL artifact, but `render_game_to_text()` and direct Phaser display-list probes verified the scene.
- Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).

## 2026-06-30 FRUS-specific 16-bit interaction sprites

- Extended `src/systems/snesMapDressing.ts` with original 16x16 silhouettes for the actual FRUS production loop:
  - ruby FRUS bookshelf;
  - source-index / manifest papers;
  - red declassification gate;
  - review desk with red pencil;
  - Black Vault obelisk core;
  - Embassy cable machine;
  - Capitol Hill witness table;
  - Foggy Bottom street sign;
  - office coffee station;
  - FRUS production phase markers.
- `GameplayMapScene` now maps existing Tiled actions to those sprites, so the current maps visually distinguish FRUS tasks without inventing new gameplay data or breaking the object-layer source of truth.
- Runtime all-map probe confirmed the expected sprites:
  - `historian_office`: FRUS shelf + coffee;
  - `nara_stacks`: declass gate + source index;
  - `west_wing`: review desk + gate;
  - `black_vault`: vault core + blast doors;
  - `embassy`: cable machine + review desk;
  - `capitol_hill`: witness table + declass gate;
  - `foggy_bottom`: street sign;
  - `frus_floor`: five phase markers.
- Required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby`; screenshot capture remains black due to the known headless WebGL artifact, but direct Phaser display-list probes verified all feature textures and reported no console/page errors.
- Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).

## 2026-06-30 32x48 role actors placed on gameplay-map NPCs

- `GameplayMapScene` now renders actual 32x48 art-pack character sprites for Tiled NPC interaction objects, using the same pixel-art family as the player instead of relying only on small markers.
- NPC actor mapping stays tied to existing object-layer labels/actions:
  - office historian interaction -> `general_editor`;
  - NARA Archivist -> `archivist`;
  - Secret Service gatekeeper -> `security_officer`;
  - fallback review NPC -> `reviewer`.
- Added matching ground shadows and small gold foot markers so actors sit in the room rather than floating over the map art.
- Runtime probe confirmed:
  - `historian_office` renders one `general_editor` actor at the historian interaction;
  - `nara_stacks` renders one `archivist` actor at the catalog desk;
  - `west_wing` renders one `security_officer` actor at the gatekeeper interaction;
  - `embassy` correctly renders no NPC actors because it has no NPC object-layer entries;
  - no console/page errors.
- Required web-game client completed against `?scene=GameplayMapScene&map=historian_office&role=compiler&name=Ruby`; screenshot capture remains black due to the known headless WebGL artifact, but direct Phaser display-list probes verified the actor sprites.
- Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).

## 2026-06-30 Always-on SNES quest-status band

- Added a compact 16-bit quest-status band to `UIScene` for active gameplay scenes.
- The band reads only from existing `GameState` helpers:
  - reliability hearts from `getAdventureSubscreenReadout().reliabilityHearts`;
  - three FRUS research pendants;
  - declassification equity crystals;
  - active FRUS Production Board phase and document points;
  - currently equipped process tool.
- The band hides on Boot, tap-to-start, warning, title, character creation, render-debug, gallery, and Codex scenes so it does not clutter menus or debug pages.
- Runtime UI probe confirmed:
  - `GameplayMapScene` shows the band graphics plus `PH PLAN 0/2  DP 0` and `TOOL NONE`;
  - `TitleScene` keeps the band hidden;
  - no console/page errors.
- Required web-game client completed against `?scene=GameplayMapScene&map=nara_stacks&role=compiler&name=Ruby`; screenshot capture remains black due to the known headless WebGL artifact, but direct UIScene probes verified the band.
- Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).

## 2026-06-30 First-hour top-down adventure training pass

- Treated the linked first-hour adventure reference as a high-level gameplay lesson, not a source to copy. The reusable lesson for FRUS Quest is constant dungeon literacy: the player should always know current room, revealed/visited rooms, and key/big-key/map status without pausing.
- Extended the active-gameplay SNES quest-status band with:
  - a tiny room-map/compass chip sourced from `getAdventureSubscreenReadout().roomMap`;
  - current-room highlight, visited-room cyan cells, unreached revealed-room slate cells, and boss-room red cells;
  - active dungeon small-key / big-key / map status iconography sourced from `getAdventureSubscreenReadout().dungeons`.
- Kept the change purely in `UIScene`, so no room data, save data, combat, or traversal code was rewritten.
- Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`; screenshot capture remains black due to the known headless WebGL artifact, but direct Phaser probes confirmed:
  - `ArchiveScene` + `UIScene` active;
  - quest band visible;
  - room traversal set to `A1 SOURCE ROOM`;
  - quest-band signature includes room-map and dungeon-key state;
  - no console/page errors.
- Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).

## 2026-06-30 Stonewall hit-feedback pass

- Improved the literal bureaucratic stonewall enemies so they now respond to player tool/action hits with SNES-style tactile feedback:
  - a snapped ruby/gold impact flash;
  - short-lived stone-chip particles;
  - a larger burst on process-wall clearance.
- Kept all FRUS gate logic in the existing scenes: the effect is purely presentation inside `BureaucraticWall`, so source-note, routing, referral, and Golden Rule requirements are unchanged.
- Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`; screenshot capture remains black due to the known headless WebGL artifact.
- Direct Phaser probe confirmed a `repo-wall` hit creates the expected transient effect objects (7 chip rectangles + 1 flash container), keeps the wall uncleared when the source-note requirement is unmet, and reports no console/page errors.
- Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).

## 2026-06-30 16-bit dungeon room-depth pass

- Upgraded the shared `addSnesRoomLayer` renderer so active FRUS dungeon rooms read less like flat panels and more like 16-bit chambers:
  - deterministic 16x16 floor variants, cracks, and specks;
  - separate wall-top, wall-front, side-wall, brass-corner, and shadow tiles;
  - room-type landmarks for source rooms, puzzle tables, hint boards, reward plinths, and boss cores;
  - theme landmarks for Two Networks terminals, Referral Vault trays/seals, Silent Read proof pages, and office desks.
- The renderer tags every new dressing object with `snes-room-*` names for runtime QA.
- Because Archive, Network, Referral Vault, Silent Read, and Ending already share this renderer, the pass improves multiple FRUS production dungeons without changing traversal, saves, combat, or workflow gates.
- Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`; screenshot capture remains black due to the known headless WebGL artifact.
- Direct Phaser display-list probe confirmed:
  - Archive, Network, Referral Vault, and Silent Read scenes all boot with no console/page errors;
  - each sampled room contains 88 `snes-room-floor-variant` tiles plus wall-top/front/side depth tiles;
  - Archive source-room landmarks, Network terminal glows, Referral Vault trays/seals, and Silent Read proof pages render through the shared room layer.
- Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).

## 2026-06-30 16-bit dungeon gate pass

- Added a reusable `addSnesGate` helper to `snesPixelArt.ts`.
- The helper renders directional SNES-style gates with:
  - arch shadow/opening;
  - stone gateposts;
  - brass/cyan/ruby threshold trim;
  - red locked bars;
  - compact process-tool seal labels.
- Replaced simple strip doors in:
  - `ArchiveScene` room exits;
  - `NetworkScene` Two Networks doors;
  - `ReferralVaultScene` referral gates;
  - `SilentReadScene` editor/proof gates.
- Gate visuals now communicate FRUS/Zelda requirements directly: `CITA`, `ROUT`, `EQTY`, `PENC`, etc., while preserving all existing room-exit logic and locked-exit prompts.
- Required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`; screenshot capture remains black due to the known headless WebGL artifact.
- Direct Phaser display-list probe confirmed:
  - Archive A1 renders four gates with two `CITA` lock seals;
  - Network N1 renders the locked `ROUT` gate;
  - Referral Vault R1 renders the locked `EQTY` gate;
  - Silent Read E1 renders the locked `PENC` gate;
  - no console/page errors.
- Verified full `npm test` (67 files / 323 tests) and `npm run build` (passes with the existing Vite chunk-size warning).

## 2026-06-30 First-hour reference training cue pass

- Treated the linked hour of classic top-down adventure gameplay as a high-level grammar reference only: no copied maps, art, music, enemy designs, or puzzle layouts.
- Added `src/game/adventureTraining.ts`, a pure helper that turns live FRUS Quest state into an immediate adventure verb:
  - dialog -> `READ`;
  - choices -> `CHOOSE`;
  - nearby interactable -> `ACT`;
  - unvisited exits -> `EXPLORE`;
  - locked gates -> `UNLOCK` with the required FRUS process tool;
  - fallback objective -> `GOAL`.
- Exposed the cue through `getAdventureTrainingReadout()` and `window.render_game_to_text()` so the visible HUD and automated text-state QA agree.
- Extended `UIScene` with a tiny second quest-band line showing `NEXT ...`, keeping the moment-to-moment objective visible during live play.
- Added `docs/gameplay/first-hour-reference-training.md` documenting the transfer rules and non-copying boundary.
- Added deterministic tests in `src/game/adventureTraining.test.ts`.
- Verified:
  - `npm test` passes (68 files / 327 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - `render_game_to_text()` reports `READ -> A ADVANCE` during dialog and `ACT -> A NARA II STACKS` when exploring near the stacks;
  - direct Phaser display-list probe confirmed the visible `NEXT A ADVANCE` BitmapText in `UIScene` and no console/page errors.

## 2026-06-30 SNES reward pedestal pass

- Added `addSnesTreasurePedestal()` and `addSnesRewardBurst()` to `src/systems/snesPixelArt.ts`.
- The new helper renders original SNES-style FRUS treasure presentation:
  - shadowed pedestal;
  - ruby/gold case and lid;
  - actual process-tool icon;
  - compact label plaque;
  - small pixel sparkle accents.
- Wired the helper into major FRUS dungeon rewards:
  - Archive D1 Citation Stamp reward room;
  - hidden Archive secret rewards;
  - Network N2 Clearance Token vault;
  - Referral Vault R2 Concurrence Slip chamber;
  - Silent Read red-pencil/proof-lens/Buckram Key reward displays.
- Added reward-burst feedback when major tools are earned:
  - Source Note Citation Stamp;
  - Clearance Token;
  - Concurrence Slip;
  - Red Pencil;
  - Proof Lens;
  - Buckram Key.
- Verified:
  - `npm test` passes (68 files / 327 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=NetworkScene&role=declass_reviewer&name=Alex`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - direct Phaser display-list probe confirmed reward pedestals in Archive D1, Network N2, Referral R2, and Silent Read S1 with the expected tool textures;
  - direct collection probe confirmed Clearance Token acquisition creates one `snes-reward-burst`, updates inventory, and reports `Clearance Token opens red vault doors.`;
  - no console/page errors in the probes.

## 2026-06-30 SNES exit-plaque pass

- Extended `addSnesGate()` with optional unlocked-route plaques.
- Locked gates still show red process seals (`CITA`, `PENC`, `ROUT`, `EQTY`, etc.); open gates now show short destination plaques such as `VAULT`, `SLIP`, `READ`, `GATE`, `PUZZLE`, `REWARD`, or `BOSS`.
- Wired route labels into:
  - Archive room graph exits;
  - Two Networks doors;
  - Referral Vault doors;
  - Silent Read / Editor's Labyrinth doors.
- This keeps door art doing gameplay work: locked exits explain what process tool is missing, while open exits tell the player where the next workflow room leads.
- Verified:
  - `npm test` passes (68 files / 327 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - direct Phaser display-list probe confirmed locked labels in Archive A1 (`CITA`, `CITA`) and Silent Read E1 (`PENC`);
  - direct Phaser display-list probe confirmed route plaques in Network N1 (`VAULT`), Referral R1 (`SLIP`), and Archive D1 (`PUZZLE`);
  - no console/page errors in the probes.

## 2026-06-30 First-hour gameplay training profile

- Treated the linked first hour of the `A Link to the Past` walkthrough as systems training only, using YouTube oEmbed metadata to identify the reference and avoiding any copied art, maps, music, text, names, or exact puzzle layouts.
- Added `src/game/firstHourTraining.ts`, a typed first-hour training profile that translates action-adventure lessons into FRUS Quest rules: readable rooms, unvisited exits, visible gates, small-key spending, map/compass literacy, boss gates, reward-return loops, and standards-pressure clarity.
- Extended `src/game/adventureTraining.ts` so the HUD cue now reads live dungeon state as well as room state:
  - `USE KEY` when a chapter small key can open the visible gate.
  - `FIND MAP` when a contested-equity map/compass cue is still missing.
  - `BOSS GATE` when a boss-room review hurdle is ready.
  - `RETURN` after a boss/stamp reward opens new routes.
  - `GO EXIT N/E/S/W` for unvisited room edges.
- Updated the deterministic Vitest coverage for the first-hour training cues.

## 2026-06-30 SNES room-intro banner pass

- Added `addSnesRoomIntroBanner()` to `src/systems/snesPixelArt.ts`.
- The helper draws a short-lived SNES-style room-entry card with:
  - black title panel;
  - gold/ruby/cyan side rules;
  - room title;
  - chapter/area subtitle;
  - a quick fade/slide-out tween.
- Wired the banner into:
  - Archive Cavern rooms;
  - Two Networks rooms;
  - Referral Vault rooms;
  - Editor's Labyrinth / Silent Read Tower rooms.
- This strengthens one-screen-room readability without changing traversal, saves, collisions, enemies, workflow gates, or map data.
- Verified:
  - focused `src/game/adventureTraining.test.ts` passes;
  - full `npm test` passes (68 files / 329 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - direct Phaser display-list probe confirmed one `snes-room-intro-banner` with panel, rule, title, and subtitle children in Archive, Network, Referral Vault, and Silent Read scenes;
  - no console/page errors in the probes.

## 2026-06-30 SNES ambient-room animation pass

- Added a tiny ambient animation layer to `addSnesRoomLayer()` in `src/systems/snesPixelArt.ts`.
- The layer creates original procedural 16-bit room-life sprites:
  - Archive rooms: lamp glint plus drifting dust motes.
  - Two Networks: cyan terminal cursor pulses.
  - Referral Vault / boss / secret rooms: red-gold torch flickers.
  - Silent Read / proof rooms: proof-page shimmer marks.
  - Office-themed rooms: mug-steam pulse plus dust motes.
- Looping tweens are stopped when tracked room objects are destroyed, so room transitions do not leave stray animation work behind.
- Verified:
  - focused `src/game/adventureTraining.test.ts` passes;
  - full `npm test` passes (68 files / 329 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - direct Phaser display-list probe confirmed ambient sprites in Archive (`dust`, `lamp-glint`), Network (`terminal-pulse`), Referral Vault (`torch`), and Silent Read (`proof-shimmer`);
  - no console/page errors in the probes.

## 2026-06-30 FRUS volume assembly HUD pass

- Added a compact ruby-buckram FRUS volume assembly indicator to the active-gameplay quest band in `UIScene`.
- The indicator reads existing `getAdventureHudReadout().fragments` state instead of creating a parallel counter:
  - the top-band graphic shows a tiny assembled book cover with five fragment slats;
  - the lower-right HUD line shows `VOL x/5`;
  - the quest-band signature now includes fragment progress so it refreshes immediately when a volume fragment is earned.
- This makes the actual win object (a completed FRUS volume) visible during play, alongside hearts/reliability, pendants, crystals, keys, map, and equipped tool.
- Verified:
  - focused `src/game/adventureTraining.test.ts` passes;
  - full `npm test` passes (68 files / 329 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - direct Phaser probe confirmed `quest-band-volume-text` is visible as `VOL 0/5`, then updates to `VOL 3/5` when three existing volume fragments are injected into live `GameState`;
  - `render_game_to_text()` reports matching `adventureHud.fragments` values and no console/page errors.

## 2026-06-30 One-hour reference gameplay training profile expansion

- Treated the linked one-hour gameplay reference as high-level systems training only; no maps, sprites, music, text, room layouts, enemies, or puzzle sequences were copied.
- Expanded `src/game/firstHourTraining.ts` from individual beats into a full one-hour segment model:
  - 0-8 minutes: orientation;
  - 8-18 minutes: overworld loop;
  - 18-28 minutes: dungeon entry;
  - 28-38 minutes: item mastery;
  - 38-48 minutes: key-lock loop;
  - 48-56 minutes: boss readiness;
  - 56-60 minutes: reward return.
- Each segment now maps the reference gameplay grammar into a FRUS production mechanic, e.g. source-note locks, chapter keys, contested-equity map literacy, process-tool gates, and stamp-driven return shortcuts.
- Extended `AdventureTrainingReadout` so `window.render_game_to_text().adventureTraining` exposes `sourceBeatId`, `phase`, and `phaseLabel`, making the live HUD cue auditable against the one-hour training model.
- Updated `docs/gameplay/first-hour-reference-training.md` with the one-hour segment table and the non-copying boundary.
- Verified:
  - focused `src/game/adventureTraining.test.ts` passes (7 tests);
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - generated state JSON reports `adventureTraining.sourceBeatId: "room_readability"`, `phase: "orientation"`, and `phaseLabel: "Orientation"` with no console/page errors.

## 2026-06-30 SNES FRUS cover assembly pass

- Added `addSnesFrusCoverAssembly()` to `src/systems/snesPixelArt.ts`.
- The helper procedurally renders an original ruby-buckram FRUS volume with:
  - gold spine bands and title rules;
  - a generic circular publication seal;
  - subtle buckram texture dots;
  - five state-driven physical cover-piece regions;
  - missing-piece masks/labels and complete-state sparkles.
- Replaced the older `EndingScene` assembled-prize renderer with the new helper while preserving the existing `COVER_PIECES` fragment list, Buckram Gate readiness checks, publication flow, and save/game state.
- The final Buckram Gate now makes the actual win object — a physically assembled, human-certified FRUS volume — visible as SNES-style game art instead of only a text counter.
- Verified:
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - generated state JSON reports `EndingScene`, `FRUS cover prize`, five volume fragments, and no console/page errors;
  - direct Phaser display-list probe confirmed one `snes-frus-cover-assembly`, five `snes-frus-cover-piece-earned` children, one cover label, and four complete spark objects.

## 2026-06-30 Equal-rank publication ceremony pass

- Added `addSnesPublicationTeam()` to `src/systems/snesPixelArt.ts`.
- The helper renders a small SNES-style equal-rank review circle using existing 32x48 role sprite sheets when available, with procedural pixel fallbacks if a sheet is missing.
- Wired the helper into `EndingScene` around the human publication table with five visible FRUS production roles:
  - Compiler / selection;
  - Editor / text;
  - Declassification Coordinator / equity;
  - Records Officer / source notes;
  - Reviewer / proof read.
- Added `Equal-rank publication team` to the final scene's visible entity readout so `render_game_to_text()` and accessibility/QA state match the visual ceremony.
- The ceremony is presentation-only: it does not add hierarchy, collision blockers, new gates, or save-state changes, and it preserves the existing human certification flow.
- Verified:
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - `render_game_to_text()` reports `Equal-rank publication team` with no console/page errors;
  - direct Phaser display-list probe confirmed one `snes-publication-team`, five `snes-publication-team-sprite` children, five labels, no fallback sprites, and the expected `compiler`, `editor`, `declassification_coordinator`, `records_officer`, and `reviewer` textures.

## 2026-06-30 SNES title quest-route strip pass

- Added a compact original pixel-art FRUS quest-route strip to `TitleScene`.
- The route strip overlays both the loaded native art-pack title card and the procedural fallback title, showing the core adventure path:
  - ARCH: Archive/source-note start;
  - NET: OpenNet/ClassNet routing;
  - REF: referral/equity gate;
  - READ: proof/silent-read gate;
  - GATE: final Buckram Gate volume publication.
- The strip uses only Phaser-drawn local pixel shapes and the existing ruby/gold/cream/cyan palette, with no imported or copied assets.
- Kept the existing title art-pack preference and title-start flow intact; this is additive presentation only.
- Verified:
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=TitleScene`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - direct Phaser display-list probe confirmed the native `title_screen_256x224` texture is loaded, one `title-quest-route-strip`, five route nodes, four route links, five labels, and route labels `ARCH`, `NET`, `REF`, `READ`, and `GATE`;
  - start-flow smoke from `TitleScene` with Enter reached `CharacterCreateScene` and then `OfficeScene` with no console/page errors.

## 2026-06-30 Office first-hour training route-board pass

- Treated the linked first hour of the action-adventure reference as high-level gameplay grammar only; no maps, sprites, music, text, room layouts, enemies, or puzzle sequences were copied.
- Upgraded the Office Hub `FRUS Production Board` so the start room now physically shows the live one-hour training model alongside the FRUS production phases.
- Added stable display-list object names for automated visual QA:
  - `office-production-route-board`;
  - `office-production-route-phase-label`;
  - `office-production-route-phase-tick`;
  - `office-first-hour-route-node`;
  - `office-first-hour-route-link`;
  - `office-first-hour-route-label`;
  - `office-production-route-next-label`.
- The first-hour strip now contains eight readable cue nodes:
  - `RM`: room readability;
  - `EX`: unvisited exit;
  - `GT`: visible tool gate;
  - `KY`: small-key loop;
  - `MP`: map/compass literacy;
  - `BS`: boss gate;
  - `RT`: reward return;
  - `RL`: Kellogg/standards pressure.
- The active node is driven by `getAdventureTrainingReadout().sourceBeatId`, and the board's bottom label shows the live training phase plus current FRUS Production Board step.
- Verified:
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - generated state JSON reports `OfficeScene`, `FRUS Production Board`, and `adventureTraining.sourceBeatId: "standards_pressure"`;
  - direct Phaser display-list probe confirmed one `office-production-route-board`, six phase labels, 39 phase ticks, eight first-hour nodes, seven links, eight labels (`RM`, `EX`, `GT`, `KY`, `MP`, `BS`, `RT`, `RL`), and no console/page errors.

## 2026-06-30 Office Hub 16-bit dressing pass

- Added an original procedural SNES dressing layer to the Office Hub, the first playable room:
  - 16x16-feeling floor tile variation and small pixel details;
  - back-wall bookshelves and book-spine silhouettes;
  - gold workflow-route inlays that lead from desks toward the FRUS cart and Archive exit;
  - small workflow station icons for the Scope desk, Production Inbox, Archive Terminal, and FRUS Cart.
- Kept the change presentation-only:
  - no collision bounds changed;
  - no interaction radii changed;
  - no save-state shape changed;
  - the existing Junior Compiler, desks, terminal, doors, FRUS Production Board, and Danne map doors remain the same interactables.
- Added stable display-list names for QA:
  - `office-snes-floor-tile`;
  - `office-snes-floor-detail`;
  - `office-snes-wall-shelf`;
  - `office-snes-wall-book`;
  - `office-snes-route-inlay`;
  - `office-snes-workflow-shadow`;
  - `office-snes-workflow-icon`.
- Verified:
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - generated state JSON reports `OfficeScene`, `explore`, and the live adventure-training readout;
  - direct Phaser display-list probe confirmed 96 floor tiles, 72 floor details, 4 shelves, 12 book sprites, 4 route inlays, 4 workflow shadows, 11 workflow icon pieces, the existing production board, eight first-hour route nodes, and no console/page errors.

## 2026-06-30 SNES dungeon map-tablet pass

- Added `addSnesMapTablet()` to `src/systems/snesPixelArt.ts`.
- The helper procedurally renders an original 16-bit map/compass-style tablet:
  - shadowed tablet body;
  - cream paper inset;
  - ruby heading band;
  - linked route cells;
  - compact two-letter room/process node labels;
  - active-route beacon.
- Wired map tablets into route-literacy rooms:
  - Archive A3: `SECRET MAP` with `A1 -> A3 -> C3 -> D1`;
  - Archive B3: `GATE MAP` with `B1 -> B2 -> C2 -> D3`;
  - Two Networks N1: `NET ROUTE` with OpenNet/routing/ClassNet/vault nodes;
  - Referral Vault R1: `EQUITY` with manifest/agency/slip nodes;
  - Editor's Labyrinth E1: `EDIT MAP` with AI/desk/pencil/read nodes;
  - Silent Read Tower S1: `PROOF MAP` with read/lens/stamp/buckram nodes.
- The pass makes the map/compass lesson physically visible in rooms rather than only in the HUD, while keeping traversal, collision, save state, and FRUS workflow logic unchanged.
- Verified:
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite chunk-size warning;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby`;
  - screenshot capture remains black due to the known headless WebGL artifact;
  - generated state JSON reports `ArchiveScene`, `dialog`, and `adventureTraining.sourceBeatId: "room_readability"`;
  - recursive Phaser display-list probe confirmed one `snes-map-tablet` per sampled room, with route/cell/beacon children and labels `SECRET MAP`, `GATE MAP`, `NET ROUTE`, `EQUITY`, `EDIT MAP`, and `PROOF MAP`;
  - no console/page errors in the probes.

## 2026-06-30 One-hour gameplay training ladder

- Treated the linked one-hour slice of `Legend of Zelda A LINK TO THE PAST Full Game Walkthrough - No Commentary (A Link to the Past Full)` as gameplay-grammar training only, verified through YouTube oEmbed metadata, with no copied maps, sprites, music, text, names, enemies, room layouts, or puzzle sequences.
- Expanded `src/game/firstHourTraining.ts` from broad first-hour phases into a twelve-drill five-minute ladder:
  - `0-5` Start Room: obvious first verb;
  - `5-10` Edges: clean unvisited exits;
  - `10-15` Tease Gate: visible missing-tool blockers;
  - `15-20` Threshold: overworld-to-chapter transition;
  - `20-25` Map Chip: dungeon-map literacy before blind key spending;
  - `25-30` Local Key: document subtask earns a local chapter key;
  - `30-35` Use Reward: newly earned tool solves a nearby gate;
  - `35-40` Shortcut: reward points back to changed routes;
  - `40-45` Cadence: repeated earn/spend key rhythm;
  - `45-50` Hazards: visible standards/deadline pressure before damage;
  - `50-55` Boss Gate: stage tool checks hardest review hurdle;
  - `55-60` World Change: reward opens a new route or workflow shortcut.
- Added the cross-cutting `deadline_pressure` first-hour segment so standards-pressure cues no longer fall back to Orientation.
- Extended the live adventure-training readout with `drillId`, `drillLabel`, `drillMinuteRange`, and `drillObjective`; `window.render_game_to_text().adventureTraining` now exposes the active drill for QA and future tuning.
- Updated the Office Hub production board to use the tighter drill label in its active route-band text.
- Updated `docs/gameplay/first-hour-reference-training.md` with the drill ladder and the expanded `render_game_to_text()` contract.
- Verification:
  - focused `npm test -- src/game/adventureTraining.test.ts` passes (7 tests);
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite large-chunk warning;
  - required web-game client ran against `?scene=OfficeScene&role=compiler&name=Ruby`;
  - state JSON reported `phase: "deadline_pressure"`, `drillId: "hazard_readability"`, `drillMinuteRange: "45-50"`, and no page/console error artifact;
  - screenshot capture remains black due to the known headless WebGL artifact.

## 2026-06-30 Office twelve-drill training route pass

- Replaced the Office Hub's older eight-node first-hour strip with the full twelve-drill one-hour ladder from `FIRST_HOUR_TRAINING_DRILLS`.
- The `FRUS PATH` board now physically shows the 0-60 minute training route:
  - `ST`: start-room affordance;
  - `ED`: edge/exit memory;
  - `GT`: visible gate tease;
  - `TH`: dungeon threshold;
  - `MP`: map-chip orientation;
  - `KY`: local key task;
  - `TL`: tool reward use;
  - `SC`: shortcut return;
  - `KD`: key-lock cadence;
  - `HZ`: hazard readability;
  - `BS`: boss gate check;
  - `RW`: reward changes world.
- Added compact minute markers (`00`, `10`, `20`, `30`, `40`, `50`) below alternating nodes, so the start room now presents the one-hour training pass as an in-world SNES route board rather than hidden telemetry.
- The active route-band text now uses `training.drillLabel`, so the board can show concrete drill state such as `HAZARDS GRD`.
- Verification:
  - focused `npm test -- src/game/adventureTraining.test.ts` passes (7 tests);
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite large-chunk warning;
  - required web-game client ran against `?scene=OfficeScene&role=compiler&name=Ruby`;
  - direct Phaser display-list probe confirmed one `office-production-route-board`, 12 `office-first-hour-route-node` objects, 11 route links, 12 drill labels (`ST`, `ED`, `GT`, `TH`, `MP`, `KY`, `TL`, `SC`, `KD`, `HZ`, `BS`, `RW`), six minute labels, next label `HAZARDS GRD`, and no console/page errors;
  - screenshot capture remains black due to the known headless WebGL artifact.

## 2026-06-30 Buckram Gate publication-shrine pass

- Added `addSnesPublicationShrine()` to `src/systems/snesPixelArt.ts`.
- The helper renders an original 16-bit final-publication shrine around the FRUS cover:
  - raised ruby/gold publication dais;
  - press rails and posts;
  - five FRUS fragment sockets with source/annotation/equity/proof/index-style labels;
  - status lamps for stamps, apparatus, reliability, and key readiness;
  - a StateChat checklist tower kept visually separate from a human-review seal tower;
  - ready/public-record sparks and public-record lines once the gate is clear.
- Wired the shrine behind the assembled FRUS cover in `EndingScene`'s Buckram Gate room.
- Wired the same shrine in published mode behind the final `PUBLISHED FRUS COVER` prize overlay, so the win state now reads as a SNES-style public-record altar rather than just a text panel.
- Kept gameplay and save logic unchanged; the shrine reads the existing `getFinalGateReadiness()` state and is presentation-only.
- Verification:
  - focused `npm test -- src/game/adventureTraining.test.ts` passes (7 tests);
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite large-chunk warning;
  - required web-game client ran against `?scene=EndingScene&role=compiler&name=Ruby`;
  - direct Phaser display-list probe confirmed one `snes-publication-shrine`, five fragment sockets, five visible fragment pages, four status frames/labels, one StateChat tower, one human-review tower, one FRUS cover assembly, locked shrine title `ASSEMBLY LOCK`, and no console/page errors;
  - screenshot capture remains black due to the known headless WebGL artifact.

## 2026-06-30 Buckram Gate statutory-clock sprite pass

- Added `addSnesStatutoryClock()` to `src/systems/snesPixelArt.ts`.
- The helper renders an original 16-bit Statutory Clock widget:
  - raised ruby/gold clock cabinet;
  - 30 tick marks for the thirty-year publication mandate;
  - a rotating hand tied to elapsed statutory time;
  - progress bar, elapsed-year label, and status label;
  - warning bars for at-risk or missed-deadline states;
  - public-record spark lines once the Buckram Gate is open or the volume is published.
- Wired the clock into the Buckram Gate room so deadline pressure is visible next to the publication shrine and route map.
- Wired a published-state version into the final `PUBLISHED FRUS COVER` prize overlay.
- The display reads `getStatutoryClockStateReadout()` and remains presentation-only; gameplay, save state, DANN-E deadline logic, and publication checks are unchanged.
- Verification:
  - focused `npm test -- src/game/statutoryClock.test.ts` passes (5 tests);
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite large-chunk warning;
  - required web-game client ran against `?scene=EndingScene&role=compiler&name=Ruby`;
  - direct Phaser display-list probe confirmed one `snes-statutory-clock`, 30 tick marks, one hand, one progress fill, one year label, one status label, `statutoryClock.status: "running"`, and no console/page errors;
  - screenshot capture remains black due to the known headless WebGL artifact.

## 2026-06-30 Buckram Gate pendant-and-crystal mural pass

- Added `addSnesProgressMural()` to `src/systems/snesPixelArt.ts`.
- The helper turns final-publication readiness into original SNES wall art:
  - three research pendants for objectivity/provenance/review discipline;
  - equity crystals for declassification progress;
  - five cover-fragment sockets;
  - MAP, APP, STD, and KEY status lamps;
  - a compact completion gauge and open-gate highlight lines.
- Wired the mural into the Buckram Gate room beside the map, relic rack, statutory clock, and publication shrine.
- The mural reads `getPublicationReadinessReadout()` and is presentation-only; final-gate logic, save state, publication certification, DANN-E deadline pressure, and standards checks are unchanged.
- Verification:
  - focused `npm test -- src/game/frusProgression.test.ts src/game/finalPublicationCertification.test.ts` passes (2 files / 11 tests);
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite large-chunk warning;
  - required web-game client ran against `?scene=EndingScene&role=compiler&name=Ruby`;
  - direct Phaser display-list probe confirmed one `snes-progress-mural`, three pendant glyphs, two equity-crystal glyphs, five cover-fragment glyphs, four status lamps, one completion fill, the title/pendant/crystal/fragment labels, and no console/page errors;
  - the live `publicationReadiness` payload showed pendants `3/3`, crystals `2/2`, cover fragments `5/5`, Buckram Key held, and the gate still blocked by apparatus `SRC/AIDS/IDX/ASM/FIX`, matching the mural state;
  - screenshot capture remains black due to the known headless WebGL artifact.

## 2026-06-30 Black Vault DANN-E arena readability pass

- Added `addSnesDanneArena()` to `src/systems/snesPixelArt.ts`.
- The helper renders an original 16-bit boss-arena layer for the Black Vault:
  - ruby/black vault floor seal around DANN-E's core;
  - four FRUS review stations labeled `SRC`, `EQ`, `PRF`, and `STD`;
  - visible ego-bolt lanes crossing the arena;
  - DANN-E core-eye/chest glyph;
  - phase-band and phase lamps for the live boss fight;
  - optional shortcut-warning frame for bad-ending pressure.
- Wired the arena into `BlackVaultLairScene` through `DanneMapScene`, where it draws only on the Black Vault map and refreshes when DANN-E changes phase.
- The layer is presentation-only; boss HP, statutory-clock pressure, standards-damage logic, treaty-fragment gating, and scene transitions are unchanged.
- Verification:
  - focused `npm test -- src/game/statutoryClock.test.ts src/game/frusProgression.test.ts` passes (2 files / 10 tests);
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite large-chunk warning;
  - required web-game client ran against `?scene=BlackVaultLairScene&role=compiler&name=Ruby`;
  - direct Phaser display-list probe confirmed one `snes-danne-arena`, four review stations, four station labels, four ego-bolt lanes, three phase lamps, one core, and one core eye in the resting Black Vault scene;
  - quick boss probe with `?scene=BlackVaultLairScene&role=compiler&name=Ruby&bossQuick=1&give=fragments` confirmed the arena redraws during the DANN-E colossus phase with four phase lamps for the secret phase path, one phase band, one live DANN-E threat, and no console/page errors;
  - screenshot capture remains black due to the known headless WebGL artifact.

## 2026-06-30 Dungeon room-compass readability pass

- Added `addSnesRoomCompass()` to `src/systems/snesPixelArt.ts`.
- The helper renders a compact 16-bit room compass with:
  - room ID and room-title footer;
  - north/south/east/west exit arrows;
  - red lock seals for blocked exits;
  - short item/route lock labels;
  - a small source-document chip at the center.
- Wired the compass into the main FRUS dungeon chain:
  - Archive Cavern / NARA rooms;
  - Two Networks;
  - Referral Vault;
  - Editor's Labyrinth / Silent Read Tower.
- Each scene computes live locked exits from its existing traversal and process-tool state, so the compass mirrors current gates without changing traversal, save state, enemy logic, or workflow locks.
- Verification:
  - focused `npm test -- src/game/adventureSubscreen.test.ts src/systems/dungeonKeys.test.ts src/game/frusProgression.test.ts` passes (3 files / 10 tests);
  - full `npm test` passes (68 files / 330 tests);
  - `npm run build` passes with the existing Vite large-chunk warning;
  - required web-game client ran against `?scene=ArchiveScene&role=compiler&name=Ruby`;
  - direct Phaser display-list probe confirmed one `snes-room-compass` in `ArchiveScene`, `NetworkScene`, `ReferralVaultScene`, and `SilentReadScene`;
  - Archive A1 probe confirmed four compass arrows, two direction labels, two lock seals/labels, and matching live `roomTraversal` locks for citation-stamp east/south exits;
  - Network N1, Referral R1, and Silent E1 probes each confirmed one compass, one live locked east route, one lock seal/label, and no console/page errors;
  - screenshot capture remains black due to the known headless WebGL artifact.

## 2026-06-30 Character-create role ability crest pass

- Added a selected-role 16-bit ability crest to `CharacterCreateScene`.
- The crest makes each equal-rank FRUS production role readable by silhouette and tool cue, not just by text:
  - Compiler: archive folder, glasses bridge, and cyan glint for Archive Sense;
  - Declassification Coordinator: tracker clipboard, mug, and agency-seal pixels for Equity Map;
  - Editor: proof copy with diagonal red pencil and red mark for Red Pencil;
  - Proofreader: two-page proof stack with lens for Silent Read;
  - Source-note specialist: source-note card, margin bar, stamp handle/base, and red ink pad for Provenance Check.
- Kept the change presentation-only:
  - no role IDs changed;
  - no save-state fields changed;
  - no confirm/input behavior changed;
  - no Office transition logic changed.
- Added stable display-list names for QA:
  - `character-create-role-ability-crest`;
  - `character-create-role-ability-folder`;
  - `character-create-role-ability-pencil`;
  - `character-create-role-ability-proof-left`;
  - `character-create-role-ability-stamp-base`;
  - `character-create-role-ability-code`.
- Verification:
  - `npm run build` passes with the existing Vite large-chunk warning;
  - focused `npm test -- src/scenes/characterCreateInput.test.ts src/input/InputState.test.ts` passes (15 tests);
  - focused `npm test -- src/game/adventureTraining.test.ts` passes (7 tests);
  - required web-game client completed against `?scene=CharacterCreateScene&role=compiler&name=Ruby`;
  - generated state JSON confirmed Enter still transitions to `OfficeScene`;
  - direct Phaser display-list probe confirmed one ability crest, one compiler folder/glasses crest on load, one editor pencil/copy crest after ArrowRight, five role cards, and no console/page errors;
  - screenshot capture remains black due to the known headless WebGL artifact.

## 2026-06-30 Live role-ability SNES burst pass

- Upgraded `activateRoleAbility()` in `src/systems/roleAbility.ts` so the selected character role now produces a more SNES-like item-use burst during actual gameplay.
- The ability effect now draws:
  - a shadowed ruby/black burst panel around the player;
  - role-coded header text (`ARCH`, `EDIT`, `EQTY`, `READ`, `SRC`);
  - six flickering spark pixels;
  - four scanline/pulse bars;
  - the existing role-specific tool glyph inside the stronger burst frame.
- Added stable display-list names for browser QA:
  - `role-ability-visual`;
  - `role-ability-snes-burst`;
  - `role-ability-snes-spark`;
  - `role-ability-snes-pulse`;
  - `role-ability-snes-code`;
  - `role-ability-banner`;
  - `role-ability-banner-text`;
  - role-specific glyph names such as `role-ability-editor-red-pencil`, `role-ability-equity-seal`, `role-ability-proof-lens`, and `role-ability-provenance-lock-body`.
- Kept the change behavior-compatible:
  - same `role-ability-frame` event;
  - same `latestAbility` / `latestMessage` update;
  - same short timed visual lifetime;
  - no save-state or role-profile changes.
- Verification:
  - `npm run build` passes with the existing Vite large-chunk warning;
  - focused `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (22 tests);
  - required web-game client completed against `?scene=OfficeScene&role=editor&name=Ruby`;
  - direct Phaser display-list probe after pressing `E` confirmed one role-ability visual, one SNES burst, six sparks, four pulses, one code label, one editor red pencil, one editor copy sheet, one editor red mark, one banner, one banner text, and no console/page errors;
  - `render_game_to_text()` reported `latestAbility: "RED PENCIL: Style can clarify, but never decide facts."`;
  - screenshot capture remains black due to the known headless WebGL artifact.

## 2026-07-01 First-hour adventure-training + lean boot pass

- Treated the linked first hour of *A Link to the Past* gameplay as a legal gameplay-grammar reference only:
  - no copied art, maps, text, puzzles, music, names, or exact room layouts;
  - retained the existing typed first-hour training model in `src/game/firstHourTraining.ts`;
  - verified the model drives live `adventureTraining` cues through `window.render_game_to_text()`.
- Finished the bureaucratic-wall readability pass in `src/entities/BureaucraticWall.ts`:
  - added a ruby/gold pressure halo;
  - added eye glints;
  - added behavior-code plaques such as `CITE`, `NET`, `REF`, `WAIT`, and `RULE`;
  - added a directional pressure arrow for active player-facing blockers.
- Unblocked normal scene boot by making expansion art loading lazy:
  - stopped `BootScene` from preloading the giant DANN-E and all-new-art packs;
  - added scene-owned preloads for `WarningScene`, `TitleScene`, `WorldMapScene`, `GameplayMapScene`, `DanneMapScene`, and `DanneGallery`;
  - normal `ArchiveScene` deep links now reach gameplay instead of remaining stuck on the loader.
- Verification:
  - `npx tsc --noEmit` passes;
  - focused browser probe against `?scene=ArchiveScene&role=compiler&name=Ruby` reaches `ArchiveScene` with active `UIScene`;
  - after dialog, `render_game_to_text().adventureTraining` reports `ACT / A NARA II STACKS`, matching the first-hour "obvious next verb" training model;
  - direct display-list probe confirms `bureaucratic-wall-threat-halo`, `bureaucratic-wall-eye-glow`, `bureaucratic-wall-behavior-code`, and `bureaucratic-wall-pressure-arrow` are present;
  - screenshot `docs/screenshots/archive-wall-training-probe.png` rendered the Archive scene correctly in headless Chrome.
- Remaining blocker:
  - `npm run build` currently hangs after Vite transforms 150 modules, although TypeScript completes cleanly;
  - the latest focused Vitest command hit a local dependency startup error: `TypeError: pico is not a function` inside `picomatch`.

## 2026-07-01 Build pipeline recovery for SNES asset pack

- Repaired the local dependency tree with `npm ci`; this resolved the Vitest startup failure where `picomatch` was not callable.
- Confirmed the build hang was tied to Vite's default public-directory copy/tree-shaking path against the large 225 MB SNES art pack.
- Updated the build pipeline:
  - `vite.config.ts` now disables Rollup tree-shaking for this prototype bundle and skips Vite's built-in public copy;
  - `package.json` now runs `node scripts/copy-public-assets.mjs` after Vite emits JS/CSS;
  - `scripts/copy-public-assets.mjs` uses `rsync` to merge `public/assets` into `dist/assets` without deleting Vite's generated `index-*.js` and `index-*.css`.
- Verification:
  - `npm test` passes: 68 files / 330 tests;
  - `npm run build` passes in about five seconds with the known large-chunk warning;
  - `dist/assets/index-*.js`, `dist/assets/index-*.css`, and `dist/assets/art-pack/manifest.json` coexist after the post-build copy;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby` and wrote `output/web-game-build-fix/state-0.json`;
  - direct Chrome probe against the dev server confirms `ArchiveScene` reaches explore mode, `adventureTraining` reports `ACT / A NARA II STACKS`, and the bureaucratic wall telegraph display-list names are present;
  - production preview at `http://127.0.0.1:4173/?scene=ArchiveScene&role=compiler&name=Ruby` reaches `ArchiveScene`, exposes `window.render_game_to_text()`, and reports no network errors.
- Remaining follow-up:
  - the bundle is still a single 2.2 MB JS chunk; future SNES-art work should split optional expansion scenes and debug galleries into dynamic imports once the gameplay loop is more stable.

## 2026-07-01 First-hour dialog-footprint polish

- Continued treating the linked first hour of *A Link to the Past* as a gameplay-grammar reference only: compact readable chrome, visible room objects, immediate action cues, and no copied expression.
- Reduced the shared `DialogBox` footprint from a 64px/68px bottom panel to a 50px desktop panel and 56px touch panel, preserving the same advance, fast-forward, dialog-state, and touch behavior.
- The Archive Source Room now keeps more of the shelf/table/source-note playfield visible while Elena's opening line remains readable.
- Verification:
  - focused `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` passes (3 files / 25 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=compact-dialog-client`;
  - the client screenshot remains black due to the known headless WebGL artifact, so a direct Chromium/Phaser probe captured `docs/screenshots/archive-compact-dialog-probe.png`;
  - direct probe reported `ArchiveScene`, active `ELENA` dialog, `adventureTraining` cue `READ / A ADVANCE`, no page errors, no console errors, no failed requests, and no 4xx/5xx responses.

## 2026-07-01 Archive first-room source-note gate polish

- Tightened the first Archive Cavern room around the FRUS production loop instead of letting the optional NARA II route steal the first interaction.
- The NARA II Stacks stair remains visible as a future route, but now has:
  - a smaller interaction radius so the spawn prompt chooses `Source Note 47`;
  - a named `SOURCE LOCK` seal (`archive-nara-stairs-source-lock-*`) until Source Note 47 is stamped;
  - a Zelda-style blocked-route dialog explaining that the next archive wing opens after the first citation stamp.
- The route gate keys off both local source-note state and persisted process state (`sourceNoteProvenanceComplete` / `citation_stamp`) so restore/deep-link cases are not stranded.
- Verification:
  - focused `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` passes (3 files / 25 tests);
  - `npm run build` passes with the known large-chunk warning;
  - `git diff --check` passes;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=source-note-gate-client`;
  - direct probe after dismissing Elena's dialog reported `nearestInteractable: Source Note 47`, adventure cue `A SOURCE NOTE 47`, and four visible named NARA stair source-lock objects;
  - pressing the action key at spawn picks up Source Note 47 and enters the physical `ROUTE` state;
  - walking down to the stairs before stamping stays in `ArchiveScene` and opens the `NARA II STAIRS` blocked-route dialog instead of leaving the room;
  - screenshot: `docs/screenshots/archive-source-note-gate-final-probe.png`.

## 2026-07-01 Archive Source Note physical-route cue pass

- Added a visible SNES-style physical-route cue for the Source Note 47 loop:
  - dotted route diamonds from the carried source note toward the research table;
  - a table-edge glow;
  - state-specific labels (`ROUTE HERE`, `VERIFY HERE`, `STAMP HERE`) tied to the existing physical-verification state.
- Widened the research-table interaction radius from 32px to 44px so the player can actually route the note from the natural collision edge of the table.
- Shortened the command-band prompt from `VERIFY SOURCE NOTE 47` to `VERIFY SRC NOTE 47`, preserving the full Source Note 47 labels in document state and verification state while avoiding HUD clipping.
- Verification:
  - focused `npm test -- src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/standardsDamage.test.ts` passes (3 files / 25 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=ArchiveScene&role=compiler&name=Ruby&v=source-route-cue-client-final`;
  - direct probe confirmed pickup -> carry -> table-edge route works: before route, `nearestInteractable: ROUTE Source Note 47` and `nearestStation: Research Table`; after route, `physicalVerification.verb: VERIFY`, `status: routed`, `nearestInteractable: VERIFY SRC NOTE 47`, and visible `archive-source-note-route-*` cue objects;
  - screenshot: `docs/screenshots/archive-source-note-route-cue-final-probe.png`.

## 2026-07-01 FRUS Production Floor next-gate interaction pass

- Turned the FRUS Production Floor's `NEXT` workflow node from pure decoration into a live gate station.
- Added a dynamic `Gate CITE` / `Gate SEL` / `Gate EQ` / `Gate EDIT` / `Gate BIND` interactable at the first unfinished node on the production rail.
- Added concise FRUS-specific gate instructions:
  - Citation Stamp / Source Note 47 for `CITE`;
  - selection docket / policy coverage audit for `SEL`;
  - Clearance Token / Concurrence Slip for `EQ`;
  - Red Pencil / Proof Lens for `EDIT`;
  - Buckram Key / final certification for `BIND`.
- Mirrored the interactable in text state as `FRUS FLOOR INTERACT: GATE 1 CITE`, so browser QA can confirm the active node without relying on screenshots.
- Verification:
  - focused `npm test -- src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` passes (7 files / 48 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-gate-interact-client`;
  - client text state includes `FRUS FLOOR INTERACT: GATE 1 CITE` and `Gate CITE`;
  - direct browser probe confirmed `Gate CITE` is the nearest interactable and its interaction opens the `GATE 1 CITE` dialog: `Citation gate needs the Citation Stamp.`;
  - screenshot: `docs/screenshots/frus-floor-gate-interaction-probe.png`.

## 2026-07-02 FRUS Production Floor ready-gate pass

- Closed the production-rail edge case where all workflow gates were complete but the last station went silent.
- When the gate context is fully satisfied, the dynamic rail interactable now moves to the publication node as `Gate READY`.
- Interacting with `Gate READY` opens a final instruction dialog: carry the certified record toward the Buckram Gate, preserving the FRUS volume handoff as a physical step.
- Verification:
  - focused `npm test -- src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` passes (7 files / 48 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-ready-client`;
  - browser text state for the completed floor reports `FRUS FLOOR NEXT GATE: READY`, `FRUS FLOOR ROUTE: COMPLETE`, `FRUS FLOOR INTERACT: ALL GATES CLEAR`, and `Gate READY`;
  - direct probe confirmed the `Gate READY` dialog and visual proof in `docs/screenshots/frus-floor-ready-gate-probe.png`.

## 2026-07-02 FRUS Production Floor tool-lock icon pass

- Added a typed gate-to-tool cue for the production rail:
  - `CITE` -> Citation Stamp;
  - `SEL` -> Review Folder;
  - `EQ` -> Clearance Token;
  - `EDIT` -> Red Pencil;
  - `BIND` -> Buckram Key.
- The active unfinished gate now displays a tiny original pixel-art tool icon beside the `NEXT` card. The first gate uses a squat citation-stamp silhouette with handle, base, and ink pad.
- `render_game_to_text()` mirrors the lock as `FRUS FLOOR TOOL: CITE Citation Stamp`, making the Zelda-like tool gate auditable without a screenshot.
- Verification:
  - focused `npm test -- src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` passes (7 files / 49 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-tool-icon-client`;
  - direct browser probe found five named `frus-production-gate-tool-icon-*` display objects for `citation_stamp`;
  - screenshot: `docs/screenshots/frus-floor-tool-icon-probe.png`.

## 2026-07-02 FRUS Production Floor full lock-strip pass

- Expanded the single active-gate icon into a full five-gate tool-lock strip.
- Each gate now has a mini original pixel icon keyed to its required FRUS process tool:
  - Citation Stamp for citation/provenance;
  - Review Folder for selection/human review queue;
  - Clearance Token for equity routing;
  - Red Pencil for editorial treatment;
  - Buckram Key for final binding.
- Missing gates render dimmed, while satisfied gates render bright, preserving the SNES item-lock grammar across the whole rail.
- `render_game_to_text()` now mirrors the strip as `FRUS FLOOR LOCKS: 1 CITE Citation Stamp NEED > ...`, so automated QA can verify each gate/tool pairing.
- Verification:
  - focused `npm test -- src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` passes (7 files / 49 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-lock-strip-client`;
  - direct browser probe found five `mini` tool-icon frames, one for each gate, plus the active full Citation Stamp icon;
  - screenshot: `docs/screenshots/frus-floor-lock-strip-probe.png`.

## 2026-07-02 FRUS Production Floor gate-count plaque pass

- Added a compact `GATE COUNT` readout for the Production Floor rail.
- `render_game_to_text()` now mirrors gate progress as `FRUS FLOOR GATE COUNT: 0/5` through `5/5`.
- The map now draws a small ruby/gold `0/5 GATE` plaque with five pips. Pips brighten as gates are satisfied, giving the rail a dungeon-progress meter that stays separate from the detailed lock strip.
- Verification:
  - focused `npm test -- src/systems/snesMapDressing.test.ts src/systems/interactionPrompt.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts src/systems/interaction.test.ts src/systems/dungeonKeys.test.ts src/systems/standardsDamage.test.ts` passes (7 files / 49 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=GameplayMapScene&map=frus_floor&role=compiler&name=Ruby&v=frus-floor-gate-count-client`;
  - direct browser probe confirmed the count card, label, title, and five pips exist with `complete: 0`, `total: 5`;
  - screenshot: `docs/screenshots/frus-floor-gate-count-probe.png`.

## 2026-07-02 One-hour reference training + Office tile-strip verification

- Treated the linked action-adventure video as first-hour gameplay grammar only, not literal model training and not a source for copied maps, sprites, music, room layouts, enemies, names, text, or puzzle sequences.
- Reconfirmed the live first-hour model:
  - `src/game/firstHourTraining.ts` encodes 12 five-minute drills and a 60-entry minute ledger;
  - `src/game/adventureTraining.ts` converts live game state into next-verb cues;
  - `docs/gameplay/first-hour-reference-training.md` and `docs/gameplay/one-hour-training-receipt.md` document the FRUS transfer.
- Finished wiring the new reusable `snes-office-tiles` strip into OfficeScene so the visible one-hour training board now sits inside a sharper 16x16 office-room language.
- OfficeScene now uses all eight office tile frames: floor base, shadow, scuff, rug center, rug edge, wall top, wall bookcase, and desk top.
- Verification:
  - focused `npm test -- --run src/game/adventureTraining.test.ts src/game/snesAtlas.test.ts src/input/InputState.test.ts` passes (3 files / 27 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=one-hour-office-tiles-client`;
  - direct browser probe confirmed `trainedMinuteMarks: 60`, `coveredDrills: 12`, `totalDrills: 12`, visible `office-first-hour-training-relic`, visible `1HR 45-50 HZ` chip, 12 visible route nodes, and 147 office tile sprites using all eight frames;
  - clean visual proof: `docs/screenshots/one-hour-office-tiles-clean/page.png`; JSON proof: `docs/screenshots/one-hour-office-tiles-clean/state.json`;
  - only browser console noise was the pre-existing missing `favicon.ico` 404, not a game asset failure.

## 2026-07-02 Archive Guide cavern tile-strip pass

- Added an original `snes-guide-cavern-tiles` SVG strip for the first dungeon-threshold room:
  - floor base;
  - floor scuff;
  - ruby inlay floor;
  - wall top;
  - wall front;
  - side shadow;
  - verification-gate threshold;
  - reward pedestal.
- Registered the strip in `snesAtlas`, BootScene preload/frame registration, and atlas readout/tests.
- Rebuilt GuideScene's `drawCaveInterior()` around the strip with a safe fallback to the older rectangle cave if the texture or frames are missing.
- The Guide room now reads more like a 16-bit dungeon threshold: visible wall depth, patterned floor, two reward pedestals, and a physical gate tile at the south exit.
- Verification:
  - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (3 files / 27 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=GuideScene&role=compiler&name=Ruby&v=guide-cavern-tiles-client`;
  - direct browser probe confirmed `GuideScene`, 140 `snes-guide-cavern-tiles` sprites, all eight frames visible, and no asset/page errors after ignoring the browser favicon lookup;
  - focused interaction probe confirmed the opening dialog advances to explore mode after explicit canvas focus and the `STEP CLOSER` cue still works;
  - visual proof: `docs/screenshots/guide-cavern-tiles-direct/page.png` and `docs/screenshots/guide-cavern-tiles-focus-check/page.png`; JSON proof: `docs/screenshots/guide-cavern-tiles-direct/state.json`.

## 2026-07-02 Two Networks tile-strip pass

- Applied the one-hour action-adventure training model to the Two Networks dungeon room language.
- Added an original `snes-network-tiles` SVG strip:
  - OpenNet floor;
  - ClassNet floor;
  - cable crossing;
  - OpenNet terminal pad;
  - ClassNet terminal pad;
  - firewall gate;
  - vault wall;
  - clearance-token plinth.
- Registered the strip in `snesAtlas`, BootScene preload/frame registration, and the atlas readout/test.
- Rebuilt `NetworkScene` room dressing with guarded tile rendering so the older rectangle/SVG drawing remains a fallback if the strip is missing.
- N1 now reads as a split OpenNet/ClassNet room with cable crossings, terminal pads, and firewall gates; N2 reads as a red ClassNet vault with wall tiles and a physical token plinth.
- Verification:
  - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (3 files / 27 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=NetworkScene&role=compiler&name=Ruby&v=network-tiles-client`;
  - direct browser probe confirmed `snes-network-tiles` exists, all eight frames are registered, N1 renders 100 visible network-tile sprites, and N2 renders 105 visible network-tile sprites including `vault_wall` and `token_plinth`;
  - one-hour training proof remains live through `render_game_to_text()` with `trainedSeconds: 3600`, `trainedMinuteMarks: 60`, and `coveredDrills: 12/12`;
  - visual proof: `docs/screenshots/network-tiles-direct/n1-page.png` and `docs/screenshots/network-tiles-direct/n2-page.png`; JSON proof: `docs/screenshots/network-tiles-direct/state.json`.

## 2026-07-02 Referral Vault tile-strip pass

- Applied the same first-hour room-readability model to the Referral Vault stage.
- Added an original `snes-referral-vault-tiles` SVG strip:
  - equity floor;
  - referral channel;
  - agency seal tile;
  - manifest desk;
  - excision gate;
  - concurrence wall;
  - slip plinth;
  - archive floor.
- Registered the strip in `snesAtlas`, BootScene preload/frame registration, and atlas readout/tests.
- Rebuilt `ReferralVaultScene` room dressing with guarded tile rendering so the previous vault/rectangle drawing remains available as fallback.
- R1 now reads as an agency-equity gate room with referral channels, manifest desk tiles, seal tiles, and a visible excision gate; R2 now reads as a concurrence chamber with wall tiles and a physical Concurrence Slip plinth.
- Verification:
  - focused `npm test -- --run src/game/snesAtlas.test.ts src/game/adventureTraining.test.ts src/input/InputState.test.ts` passes (3 files / 27 tests);
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed against `?scene=ReferralVaultScene&role=compiler&name=Ruby&v=referral-tiles-client`;
  - direct browser probe confirmed `snes-referral-vault-tiles` exists, all eight frames are registered, R1 renders 101 visible referral-vault tile sprites, and R2 renders 106 visible referral-vault tile sprites including `concurrence_wall` and `slip_plinth`;
  - one-hour training proof remains live through `render_game_to_text()` with `trainedSeconds: 3600`, `trainedMinuteMarks: 60`, and `coveredDrills: 12/12`;
  - visual proof: `docs/screenshots/referral-vault-tiles-direct/r1-page.png` and `docs/screenshots/referral-vault-tiles-direct/r2-page.png`; JSON proof: `docs/screenshots/referral-vault-tiles-direct/state.json`.

## 2026-07-02 Chrome gameplay smoke pass

- Tested the current game in system Chrome via Playwright-core against:
  - default start flow through title/character creation into `OfficeScene`;
  - deep links for `OfficeScene`, `ArchiveScene`, `NetworkScene`, `ReferralVaultScene`, `SilentReadScene`, `WorldMapScene`, `GameplayMapScene`, and `EndingScene`;
  - targeted gameplay-map checks for `frus_floor` and `embassy`.
- Confirmed there were no JavaScript page errors in the final Chrome pass.
- Fixed two Chrome-visible issues:
  - reduced `drawSnesMapDressing` floor opacity and changed collision dressing to edge-only so imported gameplay maps are no longer covered by large solid collision blocks;
  - added a boot-loader fallback hide after Phaser ready frames so `?scene=GameplayMapScene&map=frus_floor` cannot leave the DOM loader over the playable canvas.
- Added an inline favicon so Chrome no longer emits a missing-resource console error during smoke tests.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - focused `npm test -- --run src/input/InputState.test.ts src/scenes/CharacterCreateScene.test.ts src/systems/interactionPrompt.test.ts` passes (3 files / 24 tests);
  - final Chrome targeted pass reports zero console warnings/errors, zero page errors, zero bad HTTP responses, `loaderHidden: true`, and correct scene states for `frus_floor`, `embassy`, and default start flow;
  - visual proof: `docs/screenshots/chrome-gameplay-sweep/frus_floor_final.png`, `docs/screenshots/chrome-gameplay-sweep/embassy_final.png`, and `docs/screenshots/chrome-gameplay-sweep/start_flow_final.png`.

## 2026-07-02 Mission clarity pass

- Made the core point of the game explicit in the first screens: publish a reliable FRUS volume before the 30-year deadline.
- Added a shared mission copy module so TitleScene, CharacterCreateScene, OfficeScene, and `window.render_game_to_text()` present the same goal, loop, and stakes.
- Updated the title card with a mission plaque, the role creator with a mission line, and the Office opening tutorial with a concise mission card.
- Preserved the existing three-line production HUD while exposing the fuller mission text through scene state and `render_game_to_text()`.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - focused `npm test -- --run src/scenes/TitleScene.test.ts src/scenes/CharacterCreateScene.test.ts src/input/InputState.test.ts src/systems/interactionPrompt.test.ts` passes (4 files / 34 tests);
  - required web-game client reached `OfficeScene` with `gameGoal`, mission objective, and no browser errors;
  - direct system Chrome pass captured title, character creation, and Office tutorial proof with zero page errors;
  - visual proof: `docs/screenshots/mission-clarity-direct/title.png`, `docs/screenshots/mission-clarity-direct/character-create.png`, and `docs/screenshots/mission-clarity-direct/office-tutorial.png`.

## 2026-07-02 Mess triage pass

- Responded to the live gameplay critique by tightening the first playable surface instead of adding new systems.
- Fixed the DOM boot loader so it no longer hides before a non-Boot Phaser scene is active; this prevents the blank ruby canvas during slower art-pack loads.
- Shrunk the Office opening mission card and changed its copy from broad mission exposition to a direct first action: talk to the Junior Compiler, A = interact, movement begins play.
- Restored a visible basic-control reminder in the Office bottom hint: `MOVE · A INTERACT · M MENU`.
- Made `window.render_game_to_text()` concise by default so gameplay QA sees scene, objective, player, target, dialog, inventory, and counters instead of a huge internal-state dump. The complete dump remains available with `?text=full` or `?debugState=full`.
- Verification in progress:
  - `npm run build` passed with the known large-chunk warning;
  - direct Playwright probe confirmed `OfficeScene` active, no page errors, concise 1.2KB text state, and no blank canvas after load;
  - required web-game client completed against `?scene=OfficeScene&role=compiler&name=Ruby&v=mess-fix-client` with no error artifact.

## 2026-07-05 HUD/prompt/interactability cleanup

- Applied the five highest-priority smoothness fixes from the live gameplay audit:
  - global objective HUD text now compacts and clamps through `addObjectiveText()`, including all later `objectiveText.setText(gameState.objective)` calls;
  - `ChoicePrompt` now uses a taller fixed panel with separated question/source/option zones so long questions cannot collide with answer rows;
  - document/manuscript, terminal, and door interactions now get forgiving effective radii, with wider explicit Source Note table and Clearance Token hit ranges;
  - Guide and Archive routine pickups now use short `FeedbackToast` cues instead of modal dialogs, reserving modal choice/dialog flow for actual workflow decisions;
  - NetworkScene route status moved from a large central label into a small top-right status chip with concise route/progress text.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - focused `npm test -- --run src/systems/interaction.test.ts` passes (1 file / 6 tests);
  - full `npm test -- --run` passes (71 files / 349 tests);
  - required web-game client completed against `?scene=GuideScene&role=compiler&name=Ruby&v=hudfix-client` and reported active `GuideScene`;
  - direct Playwright screenshots verified Guide, Archive, and Network, plus a forced live `ChoicePrompt` in Network;
  - visual proof: `docs/screenshots/hud-prompt-cleanup/guide-final.png`, `docs/screenshots/hud-prompt-cleanup/archive-final.png`, and `docs/screenshots/hud-prompt-cleanup/network-choice-final.png`;
  - browser pass reported only WebGL `ReadPixels` warnings caused by screenshot capture, with no page errors.

## 2026-07-06 Equipped-tool swing state machine

- Replaced the player action-hitbox timer with a real equipped-tool state machine for Citation Stamp, Red Pencil, and Review Folder.
- Added windup, active, and cooldown windows per tool; damaging hitboxes now exist only during active frames, and repeated swings are blocked until cooldown ends.
- Added tool-specific movement slowdown during windup/active, art-pack effects-sheet VFX with rectangle fallback, distinct oscillator windup/hit cues, and a HUD cooldown meter beside the equipped tool slot.
- Kept legacy Archive stonewall interactions responsive through facing checks while DANN-E enemies use the strict active-frame hitbox.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - focused `npx vitest run src/systems/weaponState.test.ts --reporter=dot` passes (1 file / 3 tests);
  - required web-game client completed against Black Vault with debug hitbox enabled and no page errors;
  - direct Playwright probe confirmed no hitbox during windup/cooldown, an active hitbox during Red Pencil active frames, and failed re-swing attempts until idle;
  - direct DANN-E probe confirmed wrong tools knock back without HP loss, while Citation Stamp, Red Pencil, and Review Folder each reduce HP on matching variants.

## 2026-07-06 FRUS volume assembly arc

- Added a persistent five-piece FRUS binding arc: spine, front board, title plate, ribbon marker, and seal/stamp.
- Boss-tier DANN-E defeats now award binding pieces while preserving the older cover-fragment labels for existing saves and Buckram Gate readiness.
- Added original local volume-assembly art: HUD tracker, six-frame binding animation sheet, and completed-volume hero sprite.
- UIScene now shows a five-segment binding tracker in the compact quest band; `window.render_game_to_text()` and full debug state report volume assembly progress.
- EndingScene now plays the binding ceremony, marks it as played in saved state, and displays the completed-volume hero with a skills-practiced summary.
- Verification:
  - focused `npm test -- --run src/systems/volumeAssembly.test.ts src/entities/danneVariants.test.ts src/systems/roomClear.test.ts` passes (3 files / 10 tests);
  - `npx tsc --noEmit --pretty false` passes;
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client completed and captured `render_game_to_text()` with the new `volumeAssembly` field;
  - direct Playwright probe confirmed Black Vault DANN-E enemies are active and reported by `render_game_to_text()`;
  - direct Playwright reward probe defeated the boss-tier DANN-E variants across Black Vault, NARA Stacks, and Capitol Hill, producing `VOLUME 5/5` with `missingFragments: 0`;
  - direct ending probe confirmed `ceremonyPlayed: true` and final certification status `published`;
  - full `npm test` still has the pre-existing base-branch character sprite frame-layout assertion mismatch in `src/art/characterSprites.test.ts`.

## 2026-07-06 Consistent 16-bit visual pipeline pass

- Audited BootScene fallback generation and the committed art pack, then documented remaining gaps in `docs/ASSET_GAPS.md`.
- Added the art-pack UI sheets to the central asset registry and registered named HUD slices in BootScene.
- Switched TitleScene to prefer the native `title_screen_16bit_sharp_256x240.png` title card, with the procedural title retained as a missing-asset fallback.
- Updated UIScene's compact quest band to use art-pack HUD chrome, verification-heart, equipped-tool slot, and action-badge slices where available.
- Updated EndingScene to use `intro_screen_256x224.png` as a polished published-volume backdrop while keeping the completed-volume hero/binding ceremony art.
- Confirmed the render config still uses Phaser.AUTO, `pixelArt: true`, `roundPixels: true`, `antialias: false`, `antialiasGL: false`, and nearest texture filtering.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client was run against `?scene=TitleScene`;
  - direct Playwright probes verified TitleScene and OfficeScene render with no page or console errors and intact `window.render_game_to_text()`;
  - visual proof: `docs/screenshots/consistent-16bit-visual-pipeline/title-before.png`, `title-after.png`, `office-before.png`, and `office-hud-after.png`.

## 2026-07-06 Mobile DANN-E combat and volume parity

- Confirmed the touch path for DANN-E combat: floating D-pad feeds directional movement, touch `B` feeds the equipped-tool swing path, and touch `A` remains reserved for confirm/interact.
- Added a touch-friendly cooldown meter beside the on-screen `B` button, using the same weapon phase and cooldown data as the desktop HUD.
- Extended `window.rubyRuleTouchControls` with weapon phase, cooldown ratio, and equipped tool so mobile combat QA can inspect the same state used by `weaponState` and `DanneEnemy` hit detection.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client was run against Black Vault on the local dev build;
  - direct mobile Playwright probe at 375 x 667 confirmed integer zoom 1, DPR 2, 256 x 240 CSS canvas, 512 x 480 backing buffer, and no page errors;
  - simulated touch movement and touch `B` swing reached `weaponPhase: active` with `weaponTool: red_pencil`;
  - repeated touch `B` swings defeated DANN-E Colossus, advanced `volumeAssembly` from 0/5 to 1/5, and left `render_game_to_text()` reporting active enemy HP and room-clear status;
  - visual proof: `docs/screenshots/mobile-danne-volume-parity/combat-touch-before.png`, `combat-cooldown-visible.png`, and `volume-piece-award.png`.

## 2026-07-06 Region and DANN-E combat audio

- Registered new named Web Audio chiptune tracks derived from the public-domain MIDI stems in `public/assets/audio/midi/`, including Office Hub, dungeon-region themes, DANN-E miniboss/combat tracks, and an ending fanfare.
- `window.rubyRuleAudioDebug()` now reports the active track's source note and MIDI stem path, making track routing testable without relying on browser audio capture.
- Gameplay maps now select ambient music by map key, switch to DANN-E combat/miniboss music while live `DanneEnemy` instances remain in the room, and crossfade back to ambient once the room is cleared.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client was run against Black Vault;
  - direct Playwright probe confirmed Office -> `officeHub`, NARA DANN-E room -> `danneMiniboss`, Black Vault active room -> `danneCombat`, Black Vault after forced room clear -> `blackVault`, and Ending -> `endingFanfare`;
  - direct Playwright probe confirmed the existing `N` key sound toggle still stops and resumes music while preserving the selected track;
  - details are recorded in `docs/REGION_COMBAT_AUDIO_QA.md`.

## 2026-07-06 DANN-E combat taunts

- Reused the existing `danneBoasts.ts` phase lines for live `DanneEnemy` combat bubbles, keyed by each DANN-E variant phase.
- Added aggro and damage taunt triggers with a per-enemy 4-6 second throttle plus a short scene-level anti-spam throttle so crowded rooms stay readable.
- Styled the floating bubbles in the same black, ruby, cream, and gold language as the dialog chrome.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client was run against Black Vault;
  - direct Playwright probe confirmed a readable aggro taunt bubble with no page errors;
  - direct Playwright damage probe confirmed the Colossus dropped from 4 HP to 3 HP, entered `stunned`, and showed a single readable taunt bubble;
  - visual proof: `output/danne-taunt-dialogue-throttled.png` and `output/danne-taunt-damage-final.png`.

## 2026-07-06 Hidden reading-room secret

- Imported the secret reading-room art pack: native 16x16 tileset, display tileset, manifest, and animated 32x32 first-edition FRUS collectible.
- Added a concealed wall seam in NARA Stacks that opens only when the Review Folder has been acquired, following the existing Zelda-style secret route grammar.
- Added `HiddenReadingRoomScene`, a compact tile-based bonus room with the rare first-edition pickup and return threshold to NARA Stacks.
- Persisted collection through `sceneProgress.hiddenFirstEditionFound`, added the first edition to inventory, awarded document points, and exposed the bonus in `window.render_game_to_text()`.
- EndingScene and TrueEndingScene now surface the final bonus stat: `Hidden first edition: yes/no`.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - required web-game client was run against `?scene=HiddenReadingRoomScene`;
  - direct Playwright route confirmed NARA Stacks + Review Folder -> hidden room -> first edition pickup -> inventory and secret readout -> EndingScene bonus stat, with no page errors;
  - visual proof: `output/hidden-reading-room-entry-fixed.png`, `output/hidden-reading-room-collected-fixed.png`, and `output/hidden-reading-room-final-qa-2.png`.
## 2026-07-06 Completion stats tracking

- Added a lightweight completion-stats tracker to `GameState` for replayability/trailer-ready completion summaries.
- The tracker now reports:
  - total play time;
  - DANN-E variant defeats by type;
  - FRUS cover/volume pieces collected;
  - hidden collectible discovery status;
  - final reliability score once the run is finalized.
- Wired stats into:
  - volume-fragment pickup tracking;
  - Archive hidden-room rewards;
  - DANN-E boss phase completion;
  - final publication certification;
  - `window.render_game_to_text()` full debug payload;
  - the EndingScene published-prize stat block.
- Verification:
  - `npm run build` passes with the known large-chunk warning;
  - focused `npm test -- completionStats.test.ts` passes (1 file / 3 tests);
  - full `npm test` still has the pre-existing unrelated `src/art/characterSprites.test.ts` frame-layout failure;
  - required web-game client completed against `?scene=EndingScene&role=compiler&name=Ruby&text=full` with no error artifacts and `completionStats` present in the text payload;
  - direct Playwright visual proof captured the completion stat block in `/tmp/ruby-rule-stats/web-game-stats/page-published-stats-2.png`.

## 2026-07-06 Promo storyboard frames for demo trailer

- Added six storyboard-style 16-bit scene frames under `docs/promo/` for the demo trailer / GIF and consulting pitch decks: title reveal, character creation, first DANN-E encounter, volume-assembly progress, miniboss fight, and binding-ceremony ending.
- Each frame is an exact 256x224 indexed-color PNG with no anti-aliasing, built on a single fixed 38-color palette curated from the existing FRUS art pack (archive browns, gold leaf, ruby buckram red, navy, cherry-blossom pink) so they match the shipped title/DANN-E/volume/garden art.
- Frames are generated deterministically by `docs/promo/generate_frames.py` (hand-coded 5x7 pixel font, ordered Bayer dithering, no smoothing); added `docs/promo/MANIFEST.md` with per-file path, dimensions, scene label, trailer order, and palette/source notes.
- Verification: all six PNGs confirmed `(256, 224)` mode `P`, 13-23 colors each, and 0 stray colors outside the palette (no anti-aliasing).

## 2026-07-06 DANN-E combat & pickup VFX sprite sheets

- Added seven original 16-bit SNES/ALttP-style VFX sprite strips under `public/assets/art-pack/vfx/`, generated deterministically by `scripts/generate-vfx-sprites.py`:
  - `vfx_hit_spark_strip.png` — 4 frames, 16x16 (hit-spark burst);
  - `vfx_defeat_dissolve_strip.png` — 5 frames, 32x32 (defeat pixel-scatter);
  - `vfx_doc_point_sparkle_strip.png` — 3 frames, 8x8 (document-point pickup sparkle);
  - `vfx_frus_fragment_glow_strip.png` — 4 frames, 16x16 (ruby-red buckram FRUS volume fragment glow/pickup);
  - `vfx_citation_stamp_swing_strip.png`, `vfx_red_pencil_swing_strip.png`, `vfx_review_folder_swing_strip.png` — 3 frames each, 24x24, arcs colored to match the Citation Stamp / Red Pencil / Review Folder weapon icons in the item registry.
- Palette matched to the existing sprite frames and FRUS volume art (`#0F0F0F` outline, `#7A1020` ruby buckram, `#D6A23A` brass, `#B89A5A` manila). All output is hard-edged pixel art: every pixel is fully transparent or fully opaque, no anti-aliasing, transparent background, limited palette.
- Documented frame size/count/speed for each strip in `public/assets/art-pack/vfx/MANIFEST.md`.
- Verification: independent PIL check confirmed exact dimensions, zero soft-alpha pixels, and zero off-palette colors across all seven strips.
## 2026-07-06 DANN-E miniboss arena tileset

- Added `public/assets/art-pack/tilesets/gameplay/tileset_miniboss_arena_16x16.png` (1024×1024 display) plus its `*_native.png` (128×128) source, matching the `tileset_interiors_16x16` conventions exactly: 8×8 grid, 16px native tiles, 128px display cells, crisp 8× nearest-neighbor upscale, near-black 1px outlines, federal palette family (ruby red, federal blue, cream paper, gray stone, brass).
- Theme: a federal office floor overtaken by a shutdown/stop-work antagonist. Tiles cover walls, office + cracked-tile floors, hazard floors (paper debris, red-glow seams, warning chevrons, scorch, grate), scattered paper stacks + file boxes, overhead light fixtures (on/flicker/off/broken-spark), a full caution-tape border set (4 edges + 4 corners + cross), and a locked vault door with 2×2 CLOSED and OPEN-on-clear states plus single-tile variants.
- Floors/walls are opaque; props, lights, tape, and vault tiles use transparent backgrounds so they drop into Phaser tilemaps as overlay layers without rescaling.
- Documented in `MANIFEST.md` (section 2a) and `manifest.json` (`tilesets.tileset_miniboss_arena_16x16`).
- Verification: dimensions confirmed multiples of 16; display is an exact 8× nearest upscale of native (0 pixel mismatches → no anti-aliasing); tight 66-color palette; floor/wall tiles fully opaque, prop tiles transparent-backed; `manifest.json` re-parses as valid JSON.
## 2026-07-06 — FRUS volume assembly art sequence
Added `public/assets/art-pack/volume-assembly/`: five cover-piece sprites (spine,
front board, title plate, ribbon marker, seal/stamp) each as a 32×32 pickup + a
64×64 equipped/glow variant, a 6-frame 384×64 assembly animation sheet (64×64
frames, ~8 fps) showing the pieces binding into one ruby volume, and a 128×128
completed-volume hero sprite for the ending. Deterministic generator at
`scripts/generate-volume-assembly.py`; palette-locked to `src/art/palette.ts`;
verified for exact dimensions, transparent corners, and strict palette membership.
## 2026-07-06 Hidden reading-room secret art

- Added an optional hidden reading-room bonus area and its rare collectible reward, generated as original SNES-style pixel art (hard edges, locked limited palette, no anti-aliasing).
- New assets under `public/assets/art-pack/secrets/`:
  - `tileset_reading_room_16x16_native.png` (112×112, 7×7 grid of 16px tiles) and its exact 8× nearest-neighbor display upscale `tileset_reading_room_16x16.png` (896×896). Includes stone floors/walls, a disguised hidden-passage wall + its revealed edge, doorway/arch, bookshelves, reading table/chair/pedestal, globe, candle + green banker lamp with glow overlays, wall sconce, framed map, brass FRUS placard, and seamless fill rows.
  - `collectible_first_edition_frus_32x32.png` (128×32, 4 frames of 32×32) — a gilded "first edition" FRUS volume with a rotating gold sparkle animation (~8fps / ~500ms loop).
- Palette style-locked to the archive / stone-dungeon pack (federal stone, ruby buckram, gold stamp, cream paper, archival wood, reading-room green, warm candle glow).
- Documented in a new `secrets/MANIFEST.md` plus a new section 9 in the top-level `art-pack/MANIFEST.md`.
- Verification: PIL checks confirmed exact dimensions, RGBA with only alpha 0/255 (no anti-aliasing), 29-color tileset / 12-color collectible limited palettes, the display tileset is a pixel-exact ×8 nearest-neighbor upscale (identical color count), and each of the 4 collectible frames contains the volume plus distinct sparkles.
## 2026-07-06 HUD icon polish pack

- Added an original 16-bit HUD icon set under `public/assets/art-pack/hud/`,
  generated deterministically by `scripts/generate-hud-icon-pack.py` (PIL,
  hard-edged pixel grid, no anti-aliasing, transparent backgrounds, project NES
  palette from `src/art/palette.ts`), matching the `UIScene` quest-band look:
  - reliability/confidence meter frame;
  - document-points counter icon;
  - process stamp icons: Rule, Source, Network, Referral, Read;
  - equipped-tool slot frames (empty + active);
  - 5-segment volume-assembly progress tracker bar (spine, front board, title
    plate, ribbon marker, seal/stamp) plus per-segment icons.
- Each icon ships as a 16×16 master and a crisp 2× nearest-neighbour 32×32
  variant; the tracker bar ships at 80×16 and 160×32.
- Documented every file in `public/assets/art-pack/MANIFEST.md` (new section 9).
- Verification: automated check confirmed all 32 PNGs are RGBA with exact
  dimensions, binary alpha (0/255 only, no AA), and colors strictly within the
  NES palette; visual montage inspected for readability.
## 2026-07-06 Colorblind-accessible UI overlays

- Audited `public/assets/art-pack/` and HUD code (`src/scenes/UIScene.ts`, `src/systems/reliability.ts`, `NetworkScene`, `danne-pack/ui/18_ui_boss_healthbar.png`) for state cues conveyed by color alone: verification/HP cells (red vs slate), confidence/clarity meter tiers, inventory-slot equipped/acquired/locked, process-stamp earned/pending, dungeon-key held, minimap room current/cleared/locked, boss critical + phase gems, OpenNet/ClassNet routing, and enemy weakness.
- Added 21 shape/pattern overlay assets under `public/assets/art-pack/accessibility/` (8×8 and 16×16) so each state reads without color — stripes/hatch/dots for meters, padlock/star/dot for slots, check/ring for stamps, chevron/check/X for rooms, diamond/exclamation for boss state, ring/cross for network, crosshair for weakness. Every glyph has a black outline over a light palette fill for contrast on any background.
- Documented each file (path, dimensions, state/use, shape meaning, placement/animation) in `public/assets/art-pack/accessibility/MANIFEST.md`; linked it from the top-level art-pack `MANIFEST.md`.
- Verification: Python/PIL checks confirmed all 21 PNGs are RGBA with a transparent region, no partial-alpha (no smoothing artifacts), correct 8×8/16×16 dimensions, and only palette-consistent colors; scaled montage visually confirmed each glyph is legible and distinct.
## 2026-07-06 New Game+ veteran editor cosmetic pack

- Added a cosmetic palette-swap sprite pack under `public/assets/art-pack/ng-plus/` for the five production player roles (Proofreader, Compiler, Editor, Declass Reviewer, Source Note Specialist), intended as a New Game+ unlock reward.
- Each veteran variant is a strict per-role color-lookup recolor of its production native sheet (Proofreader←`sprite_reviewer`, Compiler←`sprite_compiler`, Editor←`sprite_editor`, Declass Reviewer←`sprite_declassification_coordinator`, Source Note Specialist←`sprite_records_officer`), following the `getCharacterKeyForProcessRole()` mapping.
- Distinguished ruby-buckram base with sparing gold/silver trim; skin, hair, held documents, and outlines preserved for readability. Exact 128×192 4×4 / 32×48 frame layout, animation ordering, and transparency retained; 1024×1536 8× nearest masters mirror the base masters + `native/` convention.
- Reproducible via `scripts/generate-ng-plus-veteran-pack.py`. Manifest metadata in `ng-plus/MANIFEST.md` plus a section 9 pointer in the top-level `art-pack/MANIFEST.md`.
- Verification (Python/PIL + ImageMagick, no code paths touched):
  - all native sheets exactly 128×192, masters exactly 1024×1536;
  - alpha mask identical to each source (transparency preserved), zero partial-alpha pixels (no anti-aliasing / hard pixel edges);
  - output opaque-palette count ≤ source for every role (palette-limited);
  - each master is a byte-for-byte 8× nearest-neighbor upscale of its native sheet (no smoothing);
  - side-by-side visual review of all five recolors confirmed retained silhouette/identity with the ruby-buckram + gold/silver treatment.
## 2026-07-06 Refreshed title & ending screen art

- Added a deterministic Pillow generator `scripts/generate-screen-art.py` that renders two native 256×240, limited-palette, no-AA backgrounds from the game palette (`src/art/palette.ts` / `PALETTE`).
  - `public/assets/art-pack/screens/title_screen_frus_chest_256x240.png` — ruby buckram FRUS volume opening like a treasure chest with a gold light burst and a framed gold title plate carrying `RUBY RULE:` / `THE FRUS QUEST` (14 colors).
  - `public/assets/art-pack/screens/ending_binding_ceremony_256x240.png` — true ending / binding ceremony: human publication table, glowing assembled FRUS volume, Office of the Historian staff in celebration poses (16 colors).
- Registered both under `SCREENS` in `src/assets/registry.ts` so they load through the existing screen pipeline; documented dimensions, intended scene, palette notes, and reserved text/safe areas in `public/assets/art-pack/MANIFEST.md`.
- Verification:
  - both PNGs confirmed at exactly 256×240, RGB, with every color inside the palette and no anti-aliasing (14 / 16 unique colors);
  - `tsc --noEmit` passes clean;
  - `vitest run src/scenes/TitleScene.test.ts` passes (9 tests); full suite is 352/353 with the one pre-existing, unrelated `src/art/characterSprites.test.ts` failure present on the base commit.
## 2026-07-06 — Second FRUS volume world map (Overseas Post)
- Added a sixth regional overworld board: `public/assets/art-pack/world2/01_overseas_post_region.png` (1536×1024) with 384×256 native master and a deterministic Python/Pillow generator (`generate_overseas_post.py`).
- Theme: overseas diplomatic post / embassy subject area — 8 numbered, politically-neutral nodes (Regional Bureau, Chancery, Consular Section, Classified Pouch Room, Communications Vault, Foreign Ministry Liaison Office, Records & Archives Annex, Marine Security Post). No real countries/officials/flags.
- Style-matched the existing overworld boards' fixed-viewport composition (brass title cartouche, deckled parchment border, sea + dashed pouch routes, compass rose, neutral pennant margin) but rendered as original 16-bit pixel art: limited 34-color palette, ×4 nearest-neighbor, no anti-aliasing (verified every 4×4 block uniform).
- Wired in as region key `overseas_post`: `src/assets/registry.ts` (`OVERWORLD_REGIONS`), `src/data/regions.ts` (`REGION_ORDER`, `REGION_LABELS`, 8 districts), and made the WorldMapScene region hint `[1-N]` dynamic. Auto-preloaded by `BootScene`.
- Manifests: new `world2/MANIFEST.md` plus a cross-reference section/row and asset-key in `MANIFEST_overworld_and_gameplay.md`.
- Verification: `tsc --noEmit` clean; `vite build` passes (known large-chunk warning; post-build asset-copy script absent from this sparse worktree); `vitest run src/data/regions.test.ts` 3/3 pass; full suite 352/353 (the single failure, `src/art/characterSprites.test.ts`, is pre-existing on the untouched base commit and unrelated).
## 2026-07-07 — Post-merge fix: stale character-sprite idle-frame test
- Fixed the lone failing test after the #42–#57 merge wave: `src/art/characterSprites.test.ts` "resolves every direction and action pose to the clean idle-down frame 0". It asserted every animation frame index in `FRAMES` (idle/walk/action) must equal `0`, a workaround from when the native sheets were misassembled and only frame 0 rendered a clean body.
- The shipped assets are no longer broken: the sibling suite "native sprite sheet frame content" decodes all 10 native PNGs (`public/assets/art-pack/sprites/native/`) and independently verifies every referenced frame 0–14 is a complete, contiguous body (opaque area, covered height, ≤1-row interior gap). That directly contradicts the old test's premise, so the "all frames must be 0" assertion was the outdated artifact — not the art or `character_anims.ts`.
- Replaced the stale assertion with one matching the current multi-frame design: idle-down anchored at frame 0, and all 15 referenced poses are unique, integer, in-bounds cell indices. Preserves the regression guard against a merge scrambling the frame table without re-imposing the obsolete single-frame constraint. No implementation or asset changes.
- Scanned for other merge artifacts: no conflict markers in `src`/`public`/`index.html`; all JSON under `src`/`public` parses; no duplicate/out-of-range frame keys.
- Verification: `tsc --noEmit` clean; full `vitest run` now 353/353; `vite build` succeeds (known large-chunk warning only).
## 2026-07-07 — Game + iPhone audit follow-ups (mobile scaling, boot load, asset/data cleanup)
- **Mobile scaling (device-pixel integer zoom):** the Phase 1 render lock computed integer zoom in CSS pixels, which capped a high-DPR iPhone (dpr 3, ~393 CSS px) at 1x — a 256 px canvas on a 393 px screen. Added `computeDeviceIntegerZoom` (`src/systems/pixelPerfect.ts`) that snaps to an integer number of *device* pixels; the backing store is always an exact integer multiple of the 256×240 base, so every game pixel maps to a whole number of physical pixels (crisp) while the CSS zoom may be fractional so the canvas fills more of the screen. `main.ts` shell/canvas sizing, `applyIntegerZoom`, and the `RenderDebugScene` crispness check now assert "backing store is an integer multiple of the base resolution" instead of "integer CSS scale". On dpr=1 desktops the result is identical to the old CSS-integer zoom, so desktop behavior is unchanged. Documented in `docs/mobile/phase1-render-lock.md`; covered by `src/systems/pixelPerfect.test.ts`.
- **Boot payload (lazy map loading):** `BootScene` was eager-loading `ALL_NEW_ART_REGISTRIES` images + `GAMEPLAY_TILED_MAPS` json (~75 MB) before the first scene. Removed `preloadAllNewArtPack()`/`applyAllNewArtTextureFilters()` and their imports; the `installNearestTextureFilterGuard` (Textures ADD listener) keeps lazily-loaded textures crisp. The scenes that consume registry art already lazy-load it; wired the only 4 referenced `FRUS_VOLUMES` textures via per-scene `preload()` guards (`GameplayMapScene` → `world_standing`, `pickup_microform`; `UIScene` → `ui_row_six`). `reward_legendary` is a never-hit `EndingScene` fallback (the SVG prize always loads), left unloaded to avoid dead payload. 12 unused FRUS volumes (~19 MB) + 2 unused screens are no longer loaded at boot. Guarded by `src/scenes/bootLazyLoad.test.ts`.
- **Gallery DANN-E sheets (grid-perfect):** `11_sprite_redactor_drone.png` and `13_sprite_junior_compiler.png` were 1254×1254 but declared 4×4 @ 313 px (1254/4 = 313.5 → ~1.5 px sub-pixel drift on later frames). Added deterministic `scripts/fix-danne-gallery-sheet-grid.py` (Pillow, `Image.Resampling.NEAREST` — no interpolation/anti-aliasing) resampling both to 1252×1252 (4×313 exact); color counts *decreased* (167760→167522, 157642→157377), confirming no new colors. Originals backed up under `public/assets/_originals/…`; report in `docs/art/danne_gallery_sheet_grid.md`. No `danneAtlas.ts` change needed (313 already divides 1252). These sheets are gallery-preview only; gameplay uses the separate `runtime_*` sheets. Guarded by `src/game/danneAtlas.test.ts`.
- **Dead data cleanup:** removed orphaned `src/data/danneBoasts.ts` (variant-keyed `DANNE_VARIANT_BOASTS`, imported nowhere; its exports were self-referential only). The live boast module `src/game/danneBoasts.ts` (phase-keyed, used by `DanneBoss`/`DanneLurker`) is the single source of truth.
- **Dead i18n cleanup:** `es.json`/`fr.json` carried 10 sections with no English counterpart and no `getString` usage (`characterCreate, codex, controls, ending, guide, items, office, roles, tapToStart, warning`) plus extra dead `mission` keys. All `getString` calls use string literals (no dynamic keys), so these were truly dead. Normalized both locales to mirror the English baseline (`hud, language, mission, pause, title`) exactly, preserving every live translation. Added a key-parity guard to `src/systems/i18n.test.ts` so ES/FR stay in sync with EN.
- **Harmonization browser QA:** made fractional-CSS/device-integer zoom application idempotent and tolerated the browser's harmless 1/64px layout quantization, eliminating a self-triggering resize loop. A Chromium iPhone profile (393x852 CSS, DPR 3) rendered a 341.328x320 CSS canvas backed by 1024x960 pixels (exactly 4 physical pixels per game pixel), reached 60 fps after load, reported zero scale-guard adjustments, lazy-loaded `GameplayMapScene`, and produced no console errors.
- Verification: `tsc --noEmit` clean; full `vitest run` 369/369 (was 353 pre-change; +16 from new guard tests); `npm run build` succeeds (known large-chunk warning only). Desktop integer-zoom behavior preserved (dpr=1 identical to prior).
## 2026-07-07 — Sword feel: ALTTP-style hitstop + primary-action buffer
- Added `src/systems/hitstop.ts`, a pure/testable timing module (no Phaser coupling): `HitstopController` (freeze/isFrozen/remainingMs/freezeFor, extend-only overlap, NaN/negative guards, reset) and `AttackBuffer` (single-fire input grace, `canAct` gated), plus frame math (`framesToMs`, `resolveHitstopMs`) clamped to the 2–4 frame SNES range (normal sword hit = 3 frames ≈ 50ms, heavy/Ruby-Pen = 4 frames ≈ 67ms).
- `DanneBoss` now exposes an optional `onPlayerHit(heavy)` callback fired from `checkPlayerActionHit` alongside the existing `boss-hit` camera shake; `heavy` is true on a Ruby-Pen (critical) connect.
- `DanneMapScene` owns a `HitstopController` + `AttackBuffer`. On a clean boss hit it freezes gameplay for a few frames by skipping actor advancement (`updateDanneEntities`, player movement) while still ticking prompts/reliability/HUD and rendering — the camera shake and boss flash tween run on Phaser's own systems and play through the freeze, so the UI scene and Phaser timers/tweens are never touched or left paused. Primary-action (B) presses now route through the attack buffer so a swing pressed a hair early or during the freeze fires the instant play resumes instead of being dropped.
- Builds on the PR #77 combat-feedback system (screen shake); hitstop reuses the same hit sites for a coherent shake-plus-freeze crunch.
- Added `src/systems/hitstop.test.ts` (18 cases): frame math edge cases, freeze windows/overlap/reset, and attack-buffer window/single-fire/hold-until-can-act behavior.
- Verification: `tsc --noEmit` clean; full `vitest run` 378/378; `npm run build` succeeds (pre-existing large-chunk warning only).
## 2026-07-08 — Enemy behavior: strikeable overworld enemies + fair, telegraphed attacks
- Overworld enemies could not be hit before: `RedactorDrone` (hp 2) and `CensorshipWraith` (hp 3) carried health and inherited `Enemy.takeDamage` knockback/flinch, and their codex defeat notes say to "strike" / "use the Ruby Pen", but nothing ever connected the player's action hitbox to them — only the DANN-E boss reacted to sword hits. Wired the player's active Ruby-Pen/sword hitbox to damage them so they flinch, take knockback, and die, closing the core ALTTP loop.
  - `Enemy` base: added `bodyBounds()` (AABB for hit tests) and `tryPlayerHit(now, amount, source, knockback, cooldownMs)` with a per-enemy 320ms hit-gate so one swing that overlaps for several frames connects once (one swing, one flinch); returns `"miss" | "hit" | "kill"`.
  - `DanneMapScene.resolvePlayerMeleeHits` runs each active frame while `player.activeActionHitbox` is live, strikes intersecting drones/wraiths, prunes the dead from their arrays, and adds a light `boss-hit` shake + impact/confirm SFX and a review-themed message. Gated out during hitstop/dialog/cutscene/boss-lock.
- Fair, readable attacks (pure timing, no Phaser coupling): new `src/systems/enemyCombat.ts` models an attack as windup → active → recovery via `telegraphPhase` / `isTelegraphActive` / `isTelegraphVisible` / `telegraphDurationMs`.
  - `CensorshipWraith` ink-sweep no longer deals damage on frame 0 alongside the cue. It now telegraphs a 240ms windup (gold tint tell, arc/cue up), deals damage only during a 170ms active window (once), then a 240ms recovery; the wraith plants itself for the whole swing instead of sliding into the player. ~650ms total, ~1.65s rest between swings.
  - `RedactorDrone` black-bar stamp now arms after a 260ms delay, so a player standing on the drop has a fair window to step clear before it can redact them.
  - Cleaned up leaked scene objects on death: drone projectiles and the wraith swipe arc are destroyed in `onDeath` (the scene stops updating a dead enemy).
- Preserved FRUS theme/content, boss phases, movement, and the directional hitbox untouched. No enemy hp/spacing retuning beyond the fairness windows.
- Added `src/systems/enemyCombat.test.ts` (telegraph phase ordering, active-window fairness, visibility across the swing, duration/negative clamping).
- Verification: `tsc --noEmit` clean; full `vitest run` 403/403 (77 files); `npm run build` succeeds (pre-existing large-chunk warning only). No in-browser playtest — no Puppeteer/Playwright/Chromium available in this worktree; validated via the pure telegraph unit tests, the existing suite, and static inspection of the DanneMapScene update path.
## 2026-07-08 — Level flow/pacing: read-before-threat briefing + patrol pacing guards
- NARA Stacks first-enemy room: the Stack Control Note (the note that *warns* "four redactor-drone patrol routes cross the stack aisle") sat at (128,92) — 0px from drone-route-a, i.e. literally on the sweep line, and past the first patrols so the player only read the drone warning after already walking into them. Moved it to (128,178) in the lower entry aisle by the spawn (128,205): 26px clear of every patrol lane, read before wading into the drones (ALTTP "read the room before the threat"). Treaty Fragment I stays intentionally drone-guarded at (204,184).
- New pure, Phaser-free `src/game/levelPacing.ts`: shared enemy engagement ranges (`REDACTOR_DRONE_STAMP_TRIGGER_RADIUS` = 44, `CENSORSHIP_WRAITH_SWIPE_TRIGGER_RADIUS` = 34) plus `distancePointToSegment`, `minDistanceToPatrolRoutes`, `spawnPatrolClearance`, and `patrolHotspotViolations`. `RedactorDrone`/`CensorshipWraith` now read their trigger radius from these constants (one source of truth; the magic numbers can't drift from the pacing checks).
- Added `src/game/levelPacing.test.ts` (10 cases): segment-distance math, and pacing invariants over `DANNE_SCENE_GEOMETRY` — no readable hotspot sits on a patrol lane (would have failed on the old note), the drone-warning note reads nearer the spawn than the first sweep lane, and the spawn stays outside drone stamp range so arrival is never a free hit (no surprise damage on transition).
- Verified the DANN-E boss opening is already fair (first ego bolt fires 650ms after the post-cutscene colossus phase; wraiths are cleared when the boss starts) — left unchanged.
- Preserved FRUS theme/content, room dressing, enemy counts, and boss design. Only the one note coordinate changed in map data.
- Verification: `tsc --noEmit` clean; full `vitest run` 413/413 (78 files, +10); `npm run build` succeeds (pre-existing large-chunk warning only). No in-browser playtest — no Puppeteer/Playwright/Chromium in this worktree; validated via the pure pacing unit tests over the real scene geometry, a numeric clearance check, and static inspection of the DanneMapScene spawn/entity setup and boss opening path.
## 2026-07-08 — Pickups/recovery: front-loaded heart top-up before the boss spike
- Recovery cadence gap: the Black Vault Lair (the DANN-E boss room) had no recovery pickup at all — a player who arrived low on reliability (the 10-heart health analogue) had no fair way to top up before the game's biggest difficulty spike, pure attrition frustration. ALTTP always gives you a way to refill at the boss door. Added a one-time "Human Review Cache" pickup on the entry side of the lair at (128,182) — below the DANN-E core trigger (128,122) and just above the spawn (128,202) — so the player passes recovery on the way in, not mid-fight. It restores +20 reliability (2 hearts; `adjustReliability` clamps to 100), fires once (gated by `sceneProgress.blackVaultReliabilityCacheUsed`), and reads as human-review notes steadying your hand — on-theme (human review restores reliability) and not a wall of text. One-time + capped so it softens attrition without erasing the fight.
- New `reliability-cache` interaction action wired through the existing generic geometry pipeline (`danneSceneCollisions.ts` union + `BlackVaultLairScene` interaction + `visibleEntities`; rendered by `drawInteractionMarkers` and dispatched by `handleInteraction` — no new render/wiring paths). Accent is `openNetGreen` so the restorative reads as friendly against the red boss cues.
- Extended the pure, Phaser-free `src/game/levelPacing.ts` with recovery-cadence helpers (one source of truth shared by the guard and the scene): `RECOVERY_INTERACTION_ACTIONS`, `BOSS_TRIGGER_ACTION`, `recoveryInteractions`, `bossTriggerInteraction`, and `recoveryReachableBeforeBoss` — a boss scene must offer a recovery pickup no farther from the spawn than the boss trigger (read-before-threat), non-boss scenes are unconstrained.
- Added 5 `levelPacing.test.ts` cases: the Black Vault is the boss scene under test, its cache reads before the boss trigger and clears any patrol lanes, every boss scene front-loads a reachable recovery pickup, and non-boss scenes (Cherry Blossom Garden) stay unconstrained.
- Preserved FRUS theme/content, room dressing, enemy/boss design, and all existing pickups (Ruby Pen chest, treaty fragments, hidden reliability well) untouched. Only additive map data + one handler case + pure helpers.
- Verification: `tsc --noEmit` clean; full `vitest run` 418/418 (78 files, +5); `npm run build` succeeds (pre-existing large-chunk warning only). No in-browser playtest — no Puppeteer/Playwright/Chromium in this worktree; validated via the pure recovery-pacing unit tests over the real scene geometry (spawn/boss/recovery distances) and static inspection of the DanneMapScene interaction dispatch.
## 2026-07-08 — Audio/visual juice: fill silent hit cues (player hurt, boss hit/defeat)
- Audited every combat/pickup/interaction feedback path on the PR #77 branch. Found three high-frequency actions that fired camera shake + sprite flash but had no SFX at all: the player taking a hit, the player's sword connecting with DANN-E, and the DANN-E defeat moment. Also found the two ego-bolt player-impact SFX (`DanneLurker`, `DanneBoss`) fired from the collision loop independent of i-frames, so they could re-trigger during the damage cooldown.
- Added three restrained original Web Audio cues to `RetroAudio` (`src/systems/audio.ts`): `playerHurt(heavy?)` (short descending sawtooth, beefier variant on knockback ≥15px), `bossHit()` (two-tone square "chk"), and `bossDefeat()` (falling five-note sawtooth sting). Removed the now-superseded `egoBoltImpact()` method.
- Wired `retroAudio.playerHurt(heavy)` into `Player.takeHit()` after the i-frame guard, so exactly one hurt cue plays per real hit and none play during the invulnerability/contact cooldown. This gives a consistent ALTTP-style flinch to every damage source — including previously silent ones (redactor-drone bolts, censorship-wraith/mini-DANN-E contact, melee).
- Wired `retroAudio.bossHit()` into `DanneBoss.checkPlayerActionHit` (gated by the existing 260ms hit cooldown, no spam) and `retroAudio.bossDefeat()` into `finishFight`. Removed the redundant `egoBoltImpact()` calls at the two bolt-collision sites so the universal `takeHit` cue is the single hurt signal.
- Unified the overworld melee non-kill cue: `DanneMapScene.resolvePlayerMeleeHits` (from the strikeable-enemies commit) previously used the bolt-impact thud for a sword connect; it now uses the same `bossHit()` chk it already pairs with the `boss-hit` shake, so striking a drone/wraith and striking DANN-E share one consistent sword-connect sound. Enemy defeat keeps its rising `confirm()` "cleared" sting.
- Playtest method: static inspection + type/test/build verification only. Browser automation was unavailable in this sparse worktree; the changes are additive audio hooks at existing, test-covered hit sites (i-frame and hit-cooldown gating already unit-tested via `combat`/`hitstop`), so gameplay logic is unchanged.
- Verification: `tsc --noEmit` clean; full `vitest run` 418/418; `npm run build` succeeds (pre-existing large-chunk warning only).

## 2026-07-11 — Playable DANN-E counter-room integration

- Reconciled the repaired DANN-E enemy/room-clear branch with current `main` after the
  PR #77 movement, hit-stop, telegraph, and audio-feedback merge.
- Replaced live use of the eight 1024x1536 variant presentation cards with the shared
  animated `danne-boss-combat` sheet; the variant cards remain codex/cutscene stills.
- Made chase forms stop at a readable distance and use a gold windup, one active damage
  window, and a recovery window instead of overlapping the player.
- Added first-attack grace, safer room placements, destruction-safe combat readouts,
  per-swing hit deduplication, HP bars, correct/wrong tool behavior, loot, and persistent
  room-clear flags.
- Added a usable gameplay-map tool loop: `M` opens the inventory, arrows select acquired
  tools, `A` equips, and `B`/`X`/Shift attacks. HUD and lower-screen cues name the nearest
  DANN-E weakness and room-clear count.
- Kept DANN-E visibly roaming in the Office but delayed damaging pressure until the player
  has talked to JR and picked up the first memo, preserving the onboarding read-before-threat
  window.
- Browser QA:
  - wrong Citation Stamp against Embassy Prime: knockback/stun, HP stayed `2/2`, HUD named
    Review Folder;
  - correct Review Folder: exactly two swings, HP `2/2 -> 1/2 -> 0/2`, +4 document points,
    no reliability loss, room clear `1/1`, zero page/console errors;
  - keyboard inventory switched Citation Stamp -> Review Folder and returned to play;
  - Office idle onboarding remained at reliability 80 with DANN-E lurking but not firing.
- Proof artifacts: `docs/screenshots/danne-embassy-paced/telegraph-256.png`,
  `docs/screenshots/danne-embassy-paced/room-cleared-fixed-state.json`, and
  `docs/screenshots/office-danne-safe-onboarding/state-0.json`.

## 2026-07-11 — DANN-E encounter pacing and combat-focus pass

- Split the first NARA counter room into two one-enemy waves (Mark I, then
  Swarm) and the Black Vault finale into two two-enemy waves (Colossus/Cloud,
  then Ascendant/decoy). Room-clear progress still counts the complete 2- or
  4-enemy encounter, so wave staging cannot open a gate early.
- Added a small pure `encounterWaves` queue with deterministic tests, including
  the saved-clear case where totals remain available for QA while pending waves
  are exhausted.
- While DANN-E is active, chapter plaques, route badges, distant `STEP CLOSER`
  coaching, and spawn-point door prompts now recede. The screen instead gives
  one combat instruction: the nearest target, matching FRUS tool, and B action.
  Navigation plaques and door prompts return immediately after room clearance.
- Defeated enemies no longer remain in live entity/threat readouts; the current
  wave is the only on-screen enemy roster while room-clear reporting retains the
  full encounter denominator.
- Live QA:
  - automated keyboard play defeated NARA Mark I with two Review Folder swings,
    awarded 4 document points, spawned Swarm, and reported `1/2` cleared;
  - Black Vault reported two active enemies and `0/4` cleared with routes hidden;
  - a saved-cleared Black Vault restored its three route badges and chapter plaque;
  - iPhone 14-sized Chromium (393x852, DPR 3) held ~60 fps after load, showed two
    active Black Vault enemies, exact `0/4` gate status, crisp integer device-pixel
    mapping, and no console/page errors.
- Verification: full Vitest suite `465/465`; `npm run build` passes (known Vite
  large-chunk warning only). Visual artifacts: `output/black-vault-wave-mobile.png`,
  and `output/nara-wave-transition/state-0.json`.

## 2026-07-11 — DANN-E native sprite and target-readability repair

- Found the cause of the chopped/tiny live DANN-E art: the 1024×1536
  `sprite_dann_e.png` master is an illustrated 3×4 pose board, but runtime
  metadata sliced it as a packed 4×4 sheet at 256×384. Every live frame mixed
  pieces of adjacent poses.
- Added deterministic `scripts/build-danne-runtime-sheet.py` and generated
  `public/assets/art-pack/sprites/runtime/sprite_dann_e.png`: a true 128×192
  4×4 sheet of complete 32×48 poses. It uses only the existing master art,
  nearest-neighbor resampling, nine colors, and binary alpha. The illustrated
  master and eight variant cards remain untouched for cutscenes/codex use.
- Pointed `DANNE_BOSS_SPRITE_ASSET` at the native sheet and retuned DANN-E
  counter enemies, the recurring lurker, boss, and mini-DANN-Es to native
  scales. The final boss now occupies roughly the same visual footprint as its
  previous intended 36×54 rendering rather than collapsing to a few pixels.
- Added persistent shape-coded tool cues at enemy feet: stamp silhouette in
  cyan, diagonal pencil in ruby/gold, and folder silhouette in gold. Attack
  windups/projectile launches now play the native action poses; right-facing
  movement mirrors the left-facing frames correctly.
- During active DANN-E waves, all nearby interaction prompts are now sealed.
  The final Black Vault boss also hides return-route prompts, publication
  markers, and interaction markers until combat ends, keeping focus on the
  statutory clock, boss, player, and ego bolts.
- Visual QA confirmed complete, recognizable bodies in NARA, Black Vault
  counter waves, and the final multi-phase boss; the Office remained clean
  during its protected pre-pressure onboarding window. A real Review Folder
  strike changed Mark I from `2/2` to `1/2` HP with no
  overlapping archival prompt. iPhone-sized Chromium (393×852, DPR 3) held
  ~60 fps, retained integer device-pixel scaling, and showed both wave-one
  enemies and their distinct tool glyphs without errors.
- Verification: runtime asset 128×192, 9 RGBA colors, alpha values only 0/255;
  full Vitest suite `466/466`; production build passes; all 25 `?scene=` QA
  routes booted their requested scene with zero console/page errors. Visual
  artifacts: `output/danne-native-attack-focused.png` and
  `output/danne-native-mobile.png`.

## 2026-07-11 — Codex + Perplexity harmonization and counter-room cadence

- Re-audited the GitHub pull-request graph after the later Perplexity drops:
  every one of the 21 source PR heads remains an ancestor of
  `codex/gameplay-integration`. The only closed-unmerged PR is the deliberately
  superseded five-variant DANN-E design draft (#41); the canonical eight-form
  roster is preserved.
- Added three-frame normal and four-frame heavy hit-stop plus restrained camera
  shake to correct-tool DANN-E impacts. A short action buffer retains a B press
  made during hit-stop without allowing weapon cooldown cancellation.
- Added a 900 ms review pause between staged waves. The room stays locked and
  reports `1/2, cleared: false` during the pause, then announces the next review
  file. The dedicated DANN-E QA readout now preserves room-clear state even when
  the between-wave active enemy count is zero.
- Added compact `WAVE CLEARED` and `RECORD CLEARED / ROUTES UNLOCKED` banners.
  Ordinary archival prompts remain suppressed through the celebration so the
  reward beat stays legible on desktop and mobile.
- Live-played the complete NARA counter room: Review Folder defeated Mark I,
  Citation Stamp defeated Swarm, the tool was switched through the real pause
  inventory, and the route opened only at `2/2`. The same route passed at
  393×852 / DPR 3 with touch controls visible and no console/page errors.
- Verification: full Vitest suite `471/471` across 89 files; production build
  passes (known Vite large-chunk warning only); all 25 registered `?scene=`
  routes reached the requested scene with zero console/page errors. Visual
  artifacts: `output/danne-wave-review-pause.png`,
  `output/danne-wave-two-active.png`, `output/danne-room-cleared.png`, and their
  `mobile-` counterparts.

## 2026-07-11 — Physical Source Note provenance trail

- Replaced Archive A1's blocking three-question Source Note 47 quiz with a
  physical one-screen puzzle. The player now carries SN47 to the research
  table, follows a gold trail through Repository Ledger, Collection Register,
  and Folder Tab stations, returns to the table, and applies the Citation Stamp.
- Preserved the same defensible FRUS provenance sequence and existing
  `sourceNoteProvenanceStep` / completion save fields. Inspecting a later station
  early gives a concise route correction without reliability damage or a modal.
- Added distinct numbered paper-station silhouettes, active/queued/matched
  states, dotted route guidance, contextual A prompts, and accessible
  `visibleEntities` status for all three checks.
- Removed duplicated lower-screen instructions during this loop. The fixed HUD
  carries the objective, the room carries the route, and the interaction prompt
  appears only at the physical target.
- Stamping no longer throws the player directly into the next annotation quiz.
  Control returns immediately with `ANNOTATE` as the next voluntary table action.
- Live desktop QA completed the full carry -> route -> repository -> collection
  -> folder -> stamp sequence with `choice: null` throughout. iPhone 393x852 / DPR
  3 completed the same sequence using the real on-screen A touch target; no
  console or page errors occurred.
- Verification: full Vitest suite `473/473` across 89 files; production build
  passes (known Vite large-chunk warning only); all 25 direct scene routes boot
  cleanly. Visual artifacts: `output/archive-provenance-routed.png`,
  `output/archive-provenance-collection.png`,
  `output/archive-provenance-stamped.png`, and their `mobile-` counterparts.
