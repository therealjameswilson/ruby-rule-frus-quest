# Direct Adventure Movement

Updated September 12, 2026 in response to the request for smoother,
Link-inspired hero control. This is original movement tuning, not a claim
of reproducing Nintendo's controller code.

## Changes

- Walking speed: 58 to 72 logical pixels per second.
- Immediate starts, stops and reversals replace acceleration and release glide.
- Diagonals retain equal total speed and sticky cardinal facing.
- Tool swings retain their movement slowdown.
- Nearby open corners guide the hero sideways at most one pixel per frame,
  rather than snapping three pixels sideways. Solid walls no longer attract
  the hero toward unrelated half-tile grid lines.
- Diagonal input slides along terrain without opposite-direction corner assists.
- Walk animation reflects actual movement, not walking in place against a desk.
- Subpixel logical positions and pixel-snapped rendering remain separate.

## Verification

- Full suite: 196 files / 1,468 tests passing, including live Player start,
  reversal, release, collision, corner and 30/60/120 FPS distance tests.
- Production build passes. Existing large JavaScript chunk warning remains.
- `tools/qa-player-movement.mjs`: keyboard and simulated touch at 375x667.
  Actual directional input moves around the Office; release holds position;
  solid desks stop movement without sideways drift; feet never overlap desks;
  sampled render positions remain integers. No browser errors.
- Standard installed game client exercised the same route. Its initial WebGL
  canvas export was black; a headed rerun with native renderer capture was
  inspected successfully alongside the mobile native capture.
- Debug Office fixtures test movement, not an earned campaign completion.
  This is not a physical-iPhone test or proof of subjective enjoyment.

The first interrupted build/test attempt ran out of disk space. Only the
regenerable Node compilation cache was removed, then verification reran.
Source assets, saves and screenshots were preserved.

Local preview: http://127.0.0.1:5195/. Not deployed.

## Fresh Opening Regression

After the movement commit, `qa-guide-counter.mjs` passed on both keyboard
(`--coaching`) and simulated touch (`--mobile`). Both start without a save,
create a compiler, talk to JR, collect the memo, deliver it, enter Guide,
complete the counter lesson, collect the Front Matter Fragment, reload,
Continue and enter ArchiveScene. No progress was injected.

- Touch: 17 checkpoints, including a harmless miss, frozen projectile during
  pause, returned bolt and persistent reward. No browser errors.
- Keyboard: also checks opposite room boundaries, intentionally faces away,
  then follows the displayed facing/timing cues for the counter. No browser
  errors. Reliability remains 80 on both routes.
- Native screenshots inspected: saved gate on touch, coached counter on
  keyboard, and Archive entry. Retained in `screenshots/movement-opening-*.png`.

This verifies that faster movement preserves the opening interactions and
first room transition. The scripts know the route, so this is not evidence
that an unaided new player understands the adventure, nor a full-campaign
completion or physical-device test. No gameplay retuning was needed here.

## Earned Archive Regression

The simulated-touch `qa-archive-wall.mjs --mobile` run continued from the
fresh opening save after the movement change. All 39 checkpoints passed
and reached NetworkScene with 55 document points and 73 reliability.
The run starts with 20 points and 80 reliability; deliberate wrong-route
and early-swing checks take time under live enemy pressure.

Verified: locked stairs; no unreviewed stamp bypass; all source-trail clues;
refusal to file unsupported readership; corrected-but-unfiled Continue;
source approval and wall clearing; repeated-swing reward protection;
annotation-stack entry; partial-packet Continue; cart contact collision;
four deliberate cart pushes and intermediate-position Continue; parked-cart
context access; three-note packet return/filing; telegram/cross-reference
pickups; east exit to Two Networks. No browser errors or injected progress.

Native cart-contact and Network-entry images were inspected and retained as
`screenshots/movement-archive-cart.png` and
`screenshots/movement-network-entry.png`. The earned continuation is at
`/private/tmp/frus-faster-archive-touch/earned-storage.json` for subsequent
local QA. It is temporary, not a shipped save. No gameplay edits were needed.
Next: Network traversal, choices and gated exits with this controller.
