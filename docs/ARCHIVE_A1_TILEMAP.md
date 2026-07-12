# Archive A1 Tilemap Promotion

Archive A1 is the first live dungeon room promoted from procedural floor and
wall drawing to a layered Phaser tilemap. The procedural renderer remains in
place as a guarded fallback and still serves every other Archive room.

## Asset Contract

- Manifest entry: `tileset_archive_dungeon_16x16`
- Runtime key: `pack-tiles-archive-dungeon-native`
- Source: `assets/art-pack/tilesets/gameplay/tileset_archive_dungeon_16x16_native.png`
- Grid: 7 columns x 7 rows
- Tile size: 16 x 16
- Margin/spacing: 0/0

`src/game/archiveA1Tilemap.test.ts` reads the art-pack manifest and fails if
the typed registry drifts from these values.

## A1 Layer Map

The room is 16 columns x 12 rows at world origin `(0, 32)`.

| Layer | Tile indices | Purpose |
| --- | --- | --- |
| Ground | base `0`; sparse accents `1`, `2`, `5` | Quiet stone floor with three landmark accents. |
| Walls | `7`, `8`, `9` | One-tile perimeter and tile-derived collision. |
| Decoration | `21` | Two restrained wall torches. |

The east exit is open at `(15, 4..6)` and the south exit at `(7..8, 11)`.
All other perimeter cells are collision cells. Existing locked-exit logic is
unchanged: a real exit remains physically reachable so it can explain the
missing process item, while nonexistent exits remain solid.

## Runtime Safety

`ArchiveScene` builds the three layers only when the packed texture exists.
If the texture or tileset registration is unavailable, the existing
`addSnesRoomLayer()` and archive detail renderer run unchanged. Tilemap layers
and the map are destroyed on room transition through the existing room cleanup
contract, and physical puzzle objects retain their original positions and
depths above the map.

## Verification

- Focused tilemap contract: 4 tests.
- Full suite: 107 files / 556 tests.
- Production TypeScript/Vite build: pass.
- All 25 `?scene=` routes: pass with no browser errors.
- Guide -> Archive A1 -> Network: complete on desktop and DPR-3 iPhone touch.
- A1 restart: room-clear state restores without duplicate documents or a
  relocked east gate.
