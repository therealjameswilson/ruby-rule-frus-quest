# Codex and Perplexity Pull Harmonization

Audit date: 2026-07-11 (America/New_York)

## Result

The live `main` line contains the compatible work from the Codex gameplay
stack and the later agent-authored art/data drops. There are no open component
pull requests. Closed component pulls are either represented by their exact
head commits in integration PR #78 or documented below as intentionally
superseded.

## Pull Request Resolution

| Pulls | Resolution |
| --- | --- |
| #5, #6, #15, #16, #58-#73, #76 | Composed in PR #78. Every source head commit is an ancestor of `main`; closed PRs #59-#67 and #72 are superseded integration inputs, not missing work. |
| #42-#57 | Asset/data wave merged before PR #78. GitHub used squash merges for several heads, so branch ancestry alone is misleading. Every added binary asset remains on `main` byte-for-byte; registry, audio, manifest, localization, and test files have since evolved. |
| #75, #77 | Localization runtime and combat feedback merged and retained. |
| #79-#84 | Physical Archive, Network, ClassNet, and Referral workflow follow-ups merged on top of the integrated line. |
| #41 | Intentionally excluded. Its five-form DANN-E draft was replaced by the canonical eight-form design in #43 and the live eight-variant registry. |

## Reconciled Payloads

Two payloads had been narrowed during later implementation even though their
source pulls were merged:

1. The full eight-form DANN-E boast catalog from the data drop was replaced by
   a smaller boss-phase table. `src/game/danneBoasts.ts` now retains both: the
   full variant-specific catalog drives ordinary enemy taunts, while the short
   phase table continues to drive scripted boss transitions.
2. The original Spanish and French catalogs contained 181 translated scene
   keys each, but the first runtime integration retained only the title, HUD,
   mission, and pause subset. The catalogs are now merged as supersets: all
   live English baseline keys remain covered, and all earlier translated scene
   strings remain available for incremental scene wiring.

No duplicate DANN-E variants, alternate save schemas, competing room-clear
systems, or duplicate asset paths were introduced.

## Evidence Checks

- `gh pr list --state open` returned no component pull requests before this
  reconciliation branch was opened.
- Every surviving non-ancestral asset branch has a tip timestamp before its
  merged PR and no post-merge commits.
- Added PNG/audio payloads from those squash-merged branches match the blobs on
  `main`; no asset path is missing.
- All region-combat MIDI paths from the source audio pull remain registered.
- The overseas-post world asset and unlock path remain registered.
- Spanish and French contain every current English runtime key plus the
  restored scene-catalog keys.
- Vitest, TypeScript, Vite production build, scene-route smoke tests, and the
  live desktop/touch route remain the final acceptance gates.

## Verification Refresh

The audit was rerun after PR #85 and before the next gameplay branch landed:

- GitHub reported 84 historical pull requests and no open pull requests.
- All 10 closed integration-component heads (#59-#67 and #72) are exact
  ancestors of `main` through PR #78.
- All 112 binary assets touched by the 16 squash-merged art/data pulls
  (#42-#57) exist on `main` with identical Git blob IDs.
- None of the 60 surviving source branches has a commit newer than its pull
  request head. No unreviewed post-merge branch payload is waiting to land.
- PR #41 remains the only non-ancestor, non-merged source head and remains
  intentionally superseded by the canonical eight-form DANN-E design.
