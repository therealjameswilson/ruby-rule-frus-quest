# Editor E1 Tilemap Promotion

Editor's Labyrinth E1 is the first Silent Read room promoted to a real Phaser
tilemap. Its StateChat-draft pickup, human editor verification, visible bracket,
Red Pencil reward, DANN-E pressure, save fields, and S1 gate remain unchanged.

## Layer Map

E1 uses the manifest-backed native interiors sheet and explicit `firstgid: 1`
contract. The room is 16 columns x 12 rows at `(0, 32)`.

| Layer | Source indices | Purpose |
| --- | --- | --- |
| Ground | `0`, `2`, `5`, `7` | Warm office floor, ruby human-review lane, checker editor-desk pad, and parquet StateChat outbox pad. |
| Walls | `8`, `10`, `12`, `14` | Panel, metal, brick, and blue editorial perimeter. |
| Decoration | `24`, `28` | Sparse safe and bulletin-board wall cues. |

The east query gate remains open at rows `4..6`; every other perimeter cell is
collision. The locked gate stays physically reachable so the Red Pencil prompt
remains the authoritative progression rule.

## Conditional Declutter

When the packed map succeeds, E1 omits the fallback room layer, compass, large
StateChat panel, and two giant explanatory pages. A compact StateChat terminal,
Priya, DANN-E, one outbox, one editor desk, the physical route cue, and the east
gate remain. If the packed texture is absent, the previous composition returns
unchanged.

The strict workstation action radius is 32 pixels, with the existing additional
eight-pixel margin for the intended desk. This prevents a small DANN-E knockback
from turning an adjacent action into a one-pixel "step closer" failure while
keeping neighboring workstations distinguishable.

## Verification

- Focused E1 layer/collision contract: 4 tests.
- Full suite: 112 files / 577 tests.
- Production TypeScript/Vite build: pass.
- Complete E1 human-bracket route, S1 evidence and publication routes, and
  mandatory Black Vault handoff: desktop and DPR-3 iPhone touch.
- Deliberate wrong-publication-desk retry and carried-file scene restart: pass.
