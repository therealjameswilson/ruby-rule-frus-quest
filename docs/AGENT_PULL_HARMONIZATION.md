# Codex and Perplexity Pull Harmonization

Audit date: 2026-07-12 (America/New_York)

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
| #79-#87 | Physical Archive, Network, ClassNet, Referral, Silent Read, Buckram Gate, and harmonization follow-ups merged on top of the integrated line. |
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

The audit was rerun after PR #87 and again while preparing the mandatory Black Vault climax follow-up:

- GitHub reported 86 pull-request records through PR #87 and no open pull requests.
- All 10 closed integration-component heads (#59-#67 and #72) are exact
  ancestors of `main` through PR #78.
- All 112 binary assets touched by the 16 squash-merged art/data pulls
  (#42-#57) exist on `main` with identical Git blob IDs.
- None of the 60 surviving source branches has a commit newer than its pull
  request head. No unreviewed post-merge branch payload is waiting to land.
- The two surviving source branches without a standalone PR,
  `codex/add-new-files` and `integrate/all-new-art`, are exact ancestors of
  `main` through the integration history.
- PR #41 remains the only non-ancestor, non-merged source head and remains
  intentionally superseded by the canonical eight-form DANN-E design.
- The physical Buckram Gate preserves all 38 final apparatus checks in typed
  metadata while replacing their modal question chain with a five-packet
  carry, route, seal, and publish loop. This follow-up does not introduce a
  competing save schema or duplicate any agent-owned art payload.

## Final Route Reconciliation

The post-integration route now uses one authoritative version of each agent-built system:

- Silent Read awards the existing Red Pencil and Buckram Key, then routes to
  the existing eight-form DANN-E Black Vault instead of skipping directly to
  publication.
- DANN-E validates the existing stamps, equities, cover pieces, proof, and
  standards ledger. Defeat clears room `DV1`; it does not publish the volume.
- The existing five-packet Buckram Gate remains the only publication action,
  preserving human routing, sealing, and final certification.
- Rejecting DANN-E's deadline shortcut resolves the deadline ledger finding
  without restoring lost reliability. Accepting it still follows the existing
  concealed-policy-defect bad-ending path.
- Shared touch/controller B input now selects a displayed B choice, Cloud Form
  teleports only to collision-safe floor, and hostile knockback cannot save an
  obstacle interior as the player's last valid position.

This is a composition of the merged Codex gameplay stack and Perplexity art/data
payloads, not a parallel boss, input layer, save schema, or ending system.
