# Referral R2 Tilemap Promotion

Referral R2 completes the Referral Vault's move to real Phaser tilemaps. The
Concurrence Slip reward, west return, east Silent Read handoff, DANN-E pressure,
save state, and locked-exit rules remain unchanged.

## Layer Map

R2 uses the native interiors sheet and shared `firstgid: 1` / source-index-plus-
one contract. The room is 16 columns x 12 rows at `(0, 32)`.

| Layer | Source indices | Purpose |
| --- | --- | --- |
| Ground | `0`, `2`, `5`, `7` | Warm reward floor, ruby process aisle, five resolved-equity marks, and parquet Concurrence Slip pad. |
| Walls | `8`, `10`, `12`, `14` | Panel, metal, brick, and blue secure perimeter. |
| Decoration | `24`, `28` | Sparse safe and bulletin-board wall cues. |

Both west and east exits remain open at rows `4..6`; every other perimeter
cell is collision. The player can therefore return to R1 or approach the locked
Silent Read handoff without colliding with decorative geometry.

## Conditional Declutter

When the packed map succeeds, R2 omits the fallback room layer, procedural
referral field, compass, vault-block mosaic, and five freestanding seal plaques.
The five concurrences become quiet floor marks, leaving the central reward,
both gates, player, and DANN-E readable at a glance. If the packed texture is
absent, the previous composition returns unchanged.

## Verification

- Focused R2 layer/collision contract: 4 tests.
- Full suite: 111 files / 573 tests.
- Production TypeScript/Vite build: pass.
- Complete R1/R2/Silent Read route: desktop and DPR-3 iPhone touch.
- Intentional wrong-agency and wrong-treatment-station retries: pass.
