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
