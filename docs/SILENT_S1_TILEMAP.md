# Silent Read S1 Tilemap Promotion

Silent Read Tower S1 completes the two-room proofing sequence's move to real
Phaser tilemaps. One stable room layout now supports both evidence review and
publication-docket phases without changing their state machine.

## Layer Map

S1 uses the native interiors sheet and shared `firstgid: 1` contract. The room
is 16 columns x 12 rows at `(0, 32)`.

| Layer | Source indices | Purpose |
| --- | --- | --- |
| Ground | `4`, `5`, `6`, `7` | Quiet dark proof floor, concrete central lane, checker OpenNet/ClassNet/outbox pads, and parquet human-workstation pads. |
| Walls | `8`, `10`, `12`, `14` | Panel, metal, brick, and blue proofing perimeter. |
| Decoration | `24`, `28` | Sparse safe and bulletin-board wall cues. |

West and east exits remain open at rows `4..6`; every other perimeter cell is
collision. This preserves the E1 return and the physically reachable Buckram
Key gate into the mandatory Black Vault climax.

## One Room, Two Phases

The evidence phase keeps OpenNet, ClassNet, Referral Tray, Proof Table, and the
review outbox. The publication phase reuses the same floor pads for Consult
Desk, Typeflow Rail, Proof Table, and the publication outbox. Only the real
workstation sprites and carried files change; no alternate decorative map is
drawn.

When the packed map succeeds, S1 omits the fallback room layer, compass, giant
manuscript/proof pages, phase panel, and three duplicate production-lane cards.
If the packed texture is absent, the previous composition returns unchanged.

## Mobile Feedback

`computeToastPlacement()` now accepts the toast half-width and clamps the whole
panel inside room bounds. Long DANN-E messages therefore remain readable near
screen edges instead of clamping only their center and clipping on mobile.

## Verification

- Focused S1 layer/collision contract: 4 tests.
- Width-aware toast placement: 2 new tests.
- Full suite: 113 files / 583 tests.
- Production TypeScript/Vite build: pass.
- Complete E1/S1 route through Red Pencil, four evidence files, three
  publication dockets, Proof Lens, Buckram Key, and Black Vault: desktop and
  DPR-3 iPhone touch.
- Wrong-desk retry, carried-file restart, and full-width mobile Ego-bolt toast:
  pass.
