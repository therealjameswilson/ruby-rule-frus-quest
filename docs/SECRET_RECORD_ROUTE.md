# Complete Treaty Record Route

## Player-Facing Changes

- The two optional pre-boss records still come from the Senate hearing and NARA Stacks. Collecting either now saves immediately, and its room points toward the return exit after collection.
- A completed older hearing can issue its missing fragment once, without repeating the six-point reliability reward.
- The secret finale now shares the ordinary ending's readable volume presentation. Its three pages are Volume, Certificate, and Record. One action advances a page; returning to the title requires the explicit Title button. The arrival input is guarded.
- All nine certificate checks use eight-pixel text, separated from the reward art. Incomplete records remain visibly incomplete. Certification now requires every production-board step, not all but one.
- Touch gameplay buttons are hidden on the secret reward screen. Previously the floating A button overlapped Title and one tap could dismiss the entire reward.
- The defeated cutscene portrait no longer increments combat victories. Playable phases still count once each; the portrait's codex unlock is preserved. Already saved completion statistics are not rewritten.
- Continue rebases an unfinished run's session clock after loading its saved total. Closed-browser time no longer inflates the completion result, and finalized records remain unchanged.
- Long interaction panels now use measured text width to stay inside the canvas. The NARA fragment prompt retains its complete name at eight pixels; exceptionally long names use an ellipsis instead of a smaller font. The target highlight stays on the object and the caret points back toward it.

## Guided-Route Evidence

The current opening gives the compiler a supplied assignment, not a blank series-planning exercise. Its physical memo now names the late Cold War series and the fictional Opening Contacts, 1989-1992 remit before the human approval stamp.

The production-board readout accepts that stamped assignment as the supplied series/volume plan, and the physically completed three-document Archive packet as collection evidence. An unapproved memo, first document pickup, or key alone cannot provide this credit. The older planning-desk route remains supported. No new individual-question completion flags are invented in existing saves.

This fixes a mismatch found by actual play: the legal guided route reached publication but the certificate still demanded three steps belonging to the older optional desk sequence. This remains a simplified teaching game, not a claim to simulate each professional production task separately.

## Verification

- A keyboard playthrough began at the Office debug entry with no granted progress. It completed the memo, hearing, Guide counter lesson, NARA discovery, Archive research, Networks, Referral, all proof desks, normal-HP Colossus/Swarm/Cloud/Ascendant, and physical binding. The two pre-boss fragments were earned through interactions, not the fragment debug grant.
- That run exposed the production-board mismatch above. Its preserved pre-boss and pre-bindery saves allow regression replays without fabricating items or changing enemy HP.
- Certificate row bounds are measured in the browser, and page changes, save/Continue, unchanged completion statistics, and one-time volume counting are checked through actual input.
- Deterministic tests cover the guided production evidence, partial/incomplete certificates, optional objectives, shared reward navigation, scene lifecycle, and touch visibility.
- Production Chromium keyboard and 375x667/DPR-3 touch runs completed the normal-health four-phase fight and physical bindery from the legitimately earned pre-boss checkpoint. Both reached the certified secret reward, paged through it, continued the saved result, and deliberately returned to Title. The last keyboard run records four combat victories and 39/39 board steps. Earlier completed QA saves retain their original statistics.
- Fresh touch opening replays completed the memo, five hearing decisions, counter lesson, NARA fragment, return cues, and Continue. A final browser check restored NARA and the pre-boss checkpoint on both desktop and touch, adding only 818-855 ms to saved play time rather than the offline gap. It also measured the NARA prompt at x96..248, with the full label at eight pixels. Six other affected scene entrances loaded without console/page errors.
- Twelve actual touch page turns retained the reward and unchanged saved stats. Every native certificate frame was pixel-identical. A misleading image-preview issue initially looked like missing game content: the supposedly complete and partial screenshots had identical SHA-256 hashes and identical image payloads. The speculative page-cache rewrite was removed; no renderer workaround ships. Native in-frame captures and separately displayed compositor captures verify the finished page.
- Final verification: 147 test files / 916 tests pass; TypeScript and production build pass. Main JS is 2,695.52 KB with the existing large-chunk warning. Exact local evidence paths and retained screenshots are in `progress.md`.

## Remaining Work

- Real iPhone Safari behavior and transition-frame stalls still need device testing.
- The session clock still counts an open tab's paused/idle time. This pass fixes closed-session Continue inflation, not a complete active-play-only timer.
- Optional destinations are reachable before leaving their chapters; a broader backtracking/shortcut pass remains worthwhile.
- The completed-volume art is reused unchanged. No new asset family, renderer change, save schema, or external dependency is introduced.
- No public deployment is included in this pass.
