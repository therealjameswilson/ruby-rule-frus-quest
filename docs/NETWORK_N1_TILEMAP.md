# Network N1 Tilemap Promotion

Network N1 is the second main-path room promoted to a real Phaser tilemap.
Its physical four-packet routing puzzle, DANN-E lurker, FIREWALL blockers,
room-clear gate, N2 transition, and save fields remain unchanged.

## Asset Contract

- Manifest entry: `tileset_interiors_16x16`
- Runtime key: `pack-tiles-interiors-native`
- Source: `assets/art-pack/tilesets/gameplay/tileset_interiors_16x16_native.png`
- Grid: 8 columns x 8 rows
- Tile size: 16 x 16
- Margin/spacing: 0/0
- Phaser first GID: 1

`src/game/networkN1Tilemap.test.ts` reads the art-pack manifest and fails if
the typed registry drifts from the committed sheet.

## N1 Layer Map

The room is 16 columns x 12 rows at world origin `(0, 32)`.

| Layer | Source indices | Purpose |
| --- | --- | --- |
| Ground | `0`, `3`, `5`, `6`, `7` | Warm OpenNet zone, dark ClassNet zone, checker terminal pads, concrete center lane, parquet sorter pad. |
| Walls | `8`, `10`, `14` | Panel, metal, and blue perimeter cells with tile-derived collision. |
| Decoration | `27`, `28` | Compact map and bulletin-board wall cues. |

The only opening is the east exit at `(15, 4..6)`. Every other perimeter
cell is solid. The route remains physically reachable while locked so the
existing `ROUT` gate can explain the missing packet work.

The manifest documents zero-based source frames. The tileset registers at
`firstgid: 1`, and `packedTileGid(sourceIndex)` produces unambiguous layer
values without treating frame zero as an empty tile.

## Conditional Declutter

When the packed map succeeds, N1 no longer draws the fallback room layer,
large central network-map panel, room compass, cable lattice, or duplicate
OpenNet/ClassNet floor labels. The actual terminals, colored terminal pads,
packet sorter, routing trail, Marcus, blockers, and gate remain. If the packed
texture is absent, the prior composition returns unchanged.

## Verification

- Focused N1 tilemap contract: 5 tests.
- Full suite: 108 files / 561 tests.
- Production TypeScript/Vite build: pass.
- All 25 `?scene=` routes: pass with no browser errors.
- Full four-packet N1 route, including wrong-network retry: desktop and touch.
- Full three-docket N2 route, Clearance Token pickup, and Referral Vault exit:
  desktop and touch.
- Archive A1 source-room route rechecked after the shared `firstgid` fix.
