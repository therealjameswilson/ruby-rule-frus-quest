# Vault reward reveal

The ClassNet room used to display a large Clearance Token case and label before
the player could earn it. The label competed with the review-batch pickup toast
and suggested the future reward was the current task.

The center now has three readable states:

1. Review underway: a small inbox and the current docket. No token case or label.
2. Review deliberately filed: the existing treasure case, token and sparkles
   replace the inbox. The player still walks over and collects the reward.
3. Token collected: an empty inbox, with no ghost collectible left behind.

The renderer reads the existing review-complete and token-collected state;
there are no additional save flags, rewards or automatic decisions. A corrected
but unfiled withholding entry remains in state 1. Continue and backtracking use
the same state. The debug visible-entity list describes the actual center.

The existing treasure helper and missing-texture fallback remain intact. Its
objects are owned by one room container and sorted by their existing depth;
the review inbox uses original native-sized primitives. Room collision, input,
human review, DANN-E pressure and exit requirements are unchanged.

## Verification (2026-09-09)

- Production build passes (251 modules, 2,792.94 KB main JS; existing chunk warning).
- All 188 test files / 1,380 tests pass.
- Full earned keyboard and simulated 375x667 touch routes reach Referral Vault
  without console errors. At every N2 checkpoint, the browser asserts that the
  inbox and reward are mutually exclusive and the reward is visible only when
  review is complete and the token remains uncollected.
- Both routes keep a corrected-but-unfiled draft through Continue, explicitly
  file it, reveal the token, collect it and open the exit.
- A separate completed-save return checks that visiting the vault does not
  recreate the collectible or award inventory, document points or approvals.
- Installed gameplay client, native snapshots and compositor captures inspected.

Evidence: /private/tmp/frus-vault-reveal-desktop-0909,
/private/tmp/frus-vault-reveal-touch-0909,
/private/tmp/frus-vault-reveal-client-0909 and
/private/tmp/frus-vault-reveal-return-0909.

This is a clearer task-to-reward sequence, not proof of whole-game enjoyment or
real iPhone Safari certification. Next, test how much classification reasoning
the routing chapter actually asks of a new player; do not merely hide useful
directions to manufacture difficulty.
