# Annotation Stacks discovery room

The Archive replay exposed a second lap around the same A1 desks after the
source-note review. The three annotation pickups now live in a separate, quiet
room. The Citation Stamp payoff opens a physical north doorway to explore;
the compiler then carries the packet south to the existing research table.

## Route and review contract

- `A1 -> north -> AS`: opens after the reviewed NO REPO wall is stamped. Owning
  the Citation Stamp or verifying the source note alone cannot bypass this gate.
- `AS -> south -> A1`: always available, including with a partial packet. The
  compiler returns to the same north doorway at (128,68).
- Three wide reading aisles contain source, context, and selection notes. They
  can be collected in any order and stay collected after leaving or reloading.
- Collecting all three does not file the packet, award points, edit a document,
  or approve release. The existing human research-table choice remains required.
  Until filing, the completed packet's return hint targets the table, not the
  stacks doorway behind the player.
- `AS -> north -> NARA Stacks`: opens only after the packet is filed. Returning
  from NARA restores AS at (128,64). The pause map uses the same gate conditions.
- A1's east Network route still requires the original supporting documents and
  human reviews. The earned replay retains 43 points before gathering, 51 after
  filing, and 55 upon reaching Network.

AS pauses and hides the wandering DANN-E pressure so the new discovery beat is
distinct from source-room verification. Other Archive rooms retain their
existing pressure, tools, damage, and rewards.

## State and rendering

No save schema or inventory changes. Existing annotation masks, held-packet
state, and completion flags remain authoritative. Legacy prefix-filed or
carried notes still count; completed saves are not reopened. Return-room code
13 identifies AS without renumbering the twelve existing Archive codes.

The room uses the existing packed native interior texture: 16x16 tiles, eight
columns, zero margin and spacing. The 16x12 map starts at (0,32), below the HUD.
Source indices are zero-based and become Phaser GIDs through `packedTileGid`:

| Layer | Source indices | Purpose |
| --- | --- | --- |
| Ground | 4 | Dark wood aisle base |
| Ground | 3 | Warm wood note pads |
| Ground | 0 | South entry floor |
| Ground | 6 | North threshold |
| Collision | 8 | Perimeter wall panels |
| Collision | 19 | Two double-width shelf banks |

Both doorways are two tiles wide. Matching collision cells drive the player's
feet collision and the rectangle fallback when the native texture is absent.
Note cards sit behind the player and use a forgiving 28-pixel interaction range.
No new assets or dependencies were added. Existing floor-art seams and the
mixed older character/prop art remain presentation gaps, not solved by this room.

## Replay and verification

Run against an unchanged production preview while the browser is active. Do not
rebuild `dist/` during a replay that reloads saved progress.

```sh
FRUS_QA_STORAGE=/path/to/earned-guide-archive-storage.json \
FRUS_QA_OUT=/tmp/archive-keyboard node tools/qa-archive-wall.mjs

FRUS_QA_STORAGE=/path/to/earned-guide-archive-storage.json \
FRUS_QA_OUT=/tmp/archive-touch node tools/qa-archive-wall.mjs --mobile

FRUS_QA_STORAGE=/tmp/archive-keyboard/partial-stacks-storage.json \
FRUS_QA_LEGACY_STORAGE=/path/to/old-completed-network-storage.json \
FRUS_QA_OUT=/tmp/annotation-safety node tools/qa-annotation-stacks-safety.mjs
```

`PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, and `FRUS_QA_URL` optionally select
the installed browser runtime and preview URL. The replays use earned storage;
they do not inject quest completion. The fallback case only blocks the interior
texture request. Its expected failed request is not treated as a gameplay error.

Verified on September 8, 2026:

- Full keyboard and simulated 375x667/DPR-3 touch Archive routes reach Network
  with the original 55 points and no page/console errors. They cover note pickup,
  partial Continue, paused movement, blocked unfiled NARA exit, returning the
  held packet, and the research-table choice. The keyboard run also tries the
  physical A1 north gate before review and confirms it remains closed.
- Partial-packet return/re-entry, closed shelves, missing-texture fallback, and
  an old completed save's NARA round-trip preserve inventory, documents, and
  points. These checks pass without page/console errors beyond the deliberately
  blocked asset request.
- 181 test files / 1,244 tests pass. Production build passes: 242 modules,
  2,769.94 KB main JavaScript. The existing large-chunk warning remains.
- Fourteen scene routes boot without page/console errors or blank renders;
  explore scenes retain pause, frozen position/reliability, map, and resume.
- The required web-game client exercises movement from an earned partial save.
  Its direct WebGL buffer capture is black in this environment, including a
  headed check; inspected renderer snapshots and compositor images show the
  actual room. This capture limitation is not hidden as a successful screenshot.
  One final client navigation timed out before loading; the local preview
  responded normally, all fourteen scene checks passed, and an isolated retry
  completed with the expected room, held packet, and 43 points.

Retained screenshots: `screenshots/annotation-stacks.png`,
`screenshots/annotation-stacks-touch.png`, and
`screenshots/annotation-stacks-fallback.png`.

## Remaining bar

This makes the annotation trip a distinct, connected space; it does not prove
the whole game is fun or that three pickups constitute a deep puzzle. Next
priorities are meaningful document-puzzle variety, a consistent source-art
family, uninterrupted novice playthroughs, and real iPhone Safari checks.
The change is local only; no public deployment is claimed.
