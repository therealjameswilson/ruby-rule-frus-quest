# Referral R1 Tilemap Promotion

Referral R1 is the fourth main-path room promoted to a real Phaser tilemap.
Its three-file agency routing loop, StateChat-to-human manifest handoff,
permission/appeal/visible-excision review, DANN-E pressure, room-clear gate,
save fields, and R2 transition remain unchanged.

## Layer Map

R1 uses the manifest-backed native interiors sheet and explicit `firstgid: 1`
contract shared by the Two Networks rooms. The room is 16 columns x 12 rows at
`(0, 32)`.

| Layer | Source indices | Purpose |
| --- | --- | --- |
| Ground | `0`, `2`, `3`, `4`, `5`, `7` | Quiet colleague/StateChat pads, ruby process lane, dark wood floor, three checker agency pads, and parquet intake tray. |
| Walls | `8`, `10`, `12`, `14` | Panel, metal, brick, and blue referral-vault perimeter. |
| Decoration | `24`, `28` | Compact safe and bulletin-board wall cues. |

The east exit remains open at rows `4..6`; every other perimeter cell is
collision. The locked equity gate is therefore physically reachable, allowing
the existing process prompt to explain the remaining review work.

## Conditional Declutter

When the packed map succeeds, R1 omits the fallback room layer, procedural
referral tile field, room compass, giant equity map, vault-block dressing, and
stage tablet. The physical intake tray, agency/human/treatment stations, route
cues, Marcus, StateChat, DANN-E, delay walls, and gate remain. If the packed
texture is absent, the previous composition returns unchanged.

## Verification

- Focused R1 layer/collision contract: 4 tests.
- Full suite: 110 files / 569 tests.
- Production TypeScript/Vite build: pass.
- All 25 `?scene=` routes: pass with no browser errors.
- Complete R1 route on desktop and DPR-3 iPhone touch, including intentional
  wrong-agency and wrong-treatment-station retries.
- R2 Concurrence Slip pickup and Silent Read transition: desktop and touch.
