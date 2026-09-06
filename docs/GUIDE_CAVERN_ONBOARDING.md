# Guide Cavern onboarding contract

`GuideScene` is the first compact dungeon threshold after the Office Hub. It
teaches one reusable adventure rule without a modal explanation:

1. take the glowing Citation Stamp;
2. face a moving practice Ego bolt and return it with an active Citation Stamp swing;
3. take the revealed FRUS volume fragment;
4. open the south Verification Gate.

Only the current mandatory target participates in proximity hints and action
selection. The equal-rank Archive Colleague remains optional during the opening
beat, but cannot compete with the fragment or gate after the route begins.

The next reward remains visible but dormant before the stamp pickup. The
projection takes its place during training; the fragment appears after a
returned bolt reaches the source. Completed pedestal labels disappear, and the
gate changes from ruby `LOCKED` to green `OPEN GATE` only after the fragment is
filed. The persistent quest band carries the current objective and action cue;
the old duplicate room-floor objective is hidden.

Stage restoration is derived from the existing save contracts rather than a
parallel flag:

- Citation Stamp ownership comes from `ITEM_REGISTRY` inventory aliases through
  `hasProcessItem("citation_stamp")`.
- Fragment ownership comes from the existing `volumeFragments` entry,
  `Front Matter Fragment`.
- Counter completion uses `sceneProgress.guideCitationCounterTrained`. Older
  saves already holding the fragment skip the new lesson.

This makes a restarted Guide scene resume at training, the fragment or gate without
duplicating rewards. `src/game/guideCavernFlow.ts` is the pure stage contract
used by both `GuideScene` and `UIScene`; its focused test covers all four
states.

## Counter coaching and room containment

The baseline opening replay found the player facing away from an incoming bolt
while the HUD said to swing. A perimeter replay also put the player at (242,220),
outside the drawn cavern and beyond the practice bolt's bounds.

- `guideCounterCoaching.ts` names the needed facing direction and changes from
  wait to swing when the bolt's predicted path intersects the actual Citation
  Stamp active-window hitbox. It accounts for windup and cooldown. This is a
  tutorial prompt only: no auto-face, automatic hit, extra damage, or changed
  weapon timing. Four directional simulation tests turn its cue into real returns.
- The existing HUD action band carries the localized cue and the existing X/B
  badge. A thin floor outline shows the current stamp reach. Misses remain
  harmless; dialogs, pause and interruptions freeze the lesson.
- `guideCavernRoom.ts` defines the 14x10 room at (16,42). Feet stay within
  x40..216, y70..180 in both native and fallback rendering. Old outside-wall save
  positions are clamped on entry without changing inventory, rewards or progress.
- The packed native archive tiles use a 7x7 grid, 16px cells, zero margin/spacing,
  and source index + 1 for Phaser GIDs. Floors: 0 (base), 5/1/2 (four sparse
  accents total). Walls: 8, corners: 7, torches: 21. Later fill-row tiles were
  rejected during screenshot review because their bottom shading made stripes.
  The former SVG/rectangle room remains available when the native texture is absent.

## Verification

- `tools/qa-guide-counter.mjs --coaching [--mobile]`: fresh Warning -> Title ->
  CharacterCreate -> Office -> Guide -> Archive; all room edges, a wrong-facing
  swing, harmless miss, pause, displayed-cue counter from the pickup position,
  one-time fragment reward and Continue. No progress is injected.
- `tools/qa-guide-room-safety.mjs`: consumes the preceding replay's
  `earned-guide-storage.json` via `FRUS_STORAGE`. One isolated fixture changes
  only the saved position to the old outside-wall coordinate; another removes
  only the native texture before entry. Both retain earned progress and exit to
  Archive with no duplicate rewards.
- The required web-game client exercises pickup and facing feedback. Its direct
  WebGL-buffer screenshot is black in this environment; renderer snapshots and
  browser-compositor screenshots are inspected separately.

This improves the first tool lesson, not the entire game's fun/quality bar.
Older character-art consistency, uninterrupted whole-game pacing and real
iPhone Safari remain open checks.

Retained evidence: `screenshots/guide-counter-coaching.png`,
`screenshots/guide-counter-coaching-touch.png`, and
`screenshots/guide-cavern-restored-position.png`.
