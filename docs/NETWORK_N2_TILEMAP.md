# Network N2 Tilemap Promotion

Network N2 completes the Two Networks dungeon's move to real Phaser tilemaps.
The three-docket human review loop, Clearance Token reward, DANN-E pressure,
save fields, and Referral Vault exit remain unchanged.

## Layer Map

N2 uses the same manifest-backed native interiors sheet and explicit
`firstgid: 1` contract as N1. The room is 16 columns x 12 rows at `(0, 32)`.

| Layer | Source indices | Purpose |
| --- | --- | --- |
| Ground | `2`, `3`, `4`, `5`, `6`, `7` | Ruby center aisle, dark vault floor, side bands, checker review pads, concrete token pad, and parquet release-board pad. |
| Walls | `8`, `10`, `12`, `14` | Panel, metal, brick, and blue secure perimeter. |
| Decoration | `24`, `28` | Two wall safes and a compact bulletin-board cue. |

The west and east exits are open at rows `4..6`; every other perimeter cell
is collision. This keeps the N1 return and locked Referral route physically
reachable so the existing gate prompts remain authoritative.

## Conditional Declutter

When the packed map succeeds, N2 omits the fallback room layer, procedural
network tile field, room compass, and decorative seven-cabinet wall. The Human
Review Desk, E.O. Board, Decision Log, central docket/token pedestal, route
cues, DANN-E lurker, and both gates remain. If the packed texture is missing,
the prior composition returns unchanged.

## Verification

- Focused N2 layer/collision contract: 4 tests.
- Full suite: 109 files / 565 tests.
- Production TypeScript/Vite build: pass.
- All 25 `?scene=` routes: pass with no browser errors.
- Full N1 packet route, intentional wrong network, N2 wrong-desk retry, all
  three docket filings, Clearance Token, and Referral exit: desktop and touch.
