# Guide Cavern onboarding contract

`GuideScene` is the first compact dungeon threshold after the Office Hub. It
teaches one reusable adventure rule without a modal explanation:

1. take the glowing Citation Stamp;
2. use that tool to claim the FRUS volume fragment;
3. open the south Verification Gate.

Only the current mandatory target participates in proximity hints and action
selection. The equal-rank Archive Colleague remains optional during the opening
beat, but cannot compete with the fragment or gate after the route begins.

The next reward remains visible but dormant: the fragment is dimmed and marked
`LOCK` until the stamp is held. Completed pedestal labels disappear, and the
gate changes from ruby `LOCKED` to green `OPEN GATE` only after the fragment is
filed. The persistent quest band carries the current objective and action cue;
the old duplicate room-floor objective is hidden.

Stage restoration is derived from the existing save contracts rather than a
parallel flag:

- Citation Stamp ownership comes from `ITEM_REGISTRY` inventory aliases through
  `hasProcessItem("citation_stamp")`.
- Fragment ownership comes from the existing `volumeFragments` entry,
  `Front Matter Fragment`.

This makes a restarted Guide scene resume at the fragment or gate without
duplicating rewards. `src/game/guideCavernFlow.ts` is the pure stage contract
used by both `GuideScene` and `UIScene`; its focused test covers all three
states.

The 30-year line and DANN-E remain as subdued wall warnings. They establish the
later pressure without presenting false interactable-sized panels during the
first movement lesson.
