# Hidden Reading-Room Discovery

## What Changed

The NARA secret is now a physical tool discovery rather than an instant scene
change. A clue in the stack register points toward the unlisted northeast shelf.
A Review Folder swing opens that shelf only when its active hitbox reaches it.
The same doorway art appears immediately and the middle 32 pixels of the shelf
become passable. Adjacent shelves and the four drone patrols remain intact.

Players can equip the folder and swing normally, or press A near the shelf to
equip the owned folder and face it automatically. The assisted action uses the
same windup and active frames. A wrong tool, a swing facing away, or a missing
folder does not reveal anything. A missing folder produces a short hint.

Discovery does not teleport the player or award the book. After the brief reveal,
walk into the opening or press A separately to enter. The first edition rises
and fades with a short +25 toast. The used pickup no longer advertises a stale
interaction. The south exit returns to the same NARA shelf at (204, 94), clear
of the entrance trigger, rather than the front stairwell.

## State And Map

- DN1 (NARA) and DN2 (Hidden Reading Room) are reciprocal graph neighbors.
- The hidden room belongs to the Archive area, not the Office fallback. Its
  existing pause/map overlay now opens with keyboard or touch Start.
- Owning the Review Folder or a dungeon map alone does not expose DN2. Actual
  discovery reveals it; entering records a visit. Visits persist after leaving.
- Discovery, first-edition collection, inventory, and points use the existing
  save fields. No schema change, new tool, dependency, or downloaded asset.
- Continue preserves the exact saved location. Authored arrivals are accepted
  only for the matching chapter pair; stale scene data cannot override Continue.
- Arrival input is guarded and interaction buffers reset when the scenes reopen.
- The first-edition flag and inventory check prevent repeated +25 rewards. Its
  existing final-completion bonus remains unchanged.
- Collision debug outlines update when the shelf opens.

## Verification, September 5, 2026

Baseline play reproduced A immediately teleporting from the shelf to the hidden
room, followed by a return to NARA's south/front doorway. This checkpoint fixes
that observed mismatch rather than adding a separate teleport route.

- Keyboard: direct active Review Folder swing, reveal without teleport, Continue
  in NARA, physical entry, hidden-room pause/map, pickup, Continue after pickup,
  return to the same shelf, duplicate-pickup rejection, and return to Archive.
- Touch, 375x667 / DPR 3: wrong-tool swing leaves the shelf shut; assisted A
  equips/faces the Review Folder; the same complete exploration and return loop
  succeeds. The pause panel opens with touch Start and closes with its X.
- Missing-tool check: A names the Review Folder, points do not change, and
  attempted movement into the shelf remains blocked.
- Document points stay at 201 through discovery and become 226 on pickup.
  Re-entry and another attempted pickup stay at 226, with no blocking dialogue.
- Fourteen scene-debug entries rendered nonblank with no page/console errors:
  Title, Character Create, Office, Guide, Archive, Network, Referral Vault,
  Silent Read, Cherry Blossom Garden, Black Vault, Senate, NARA Stacks, Hidden
  Reading Room, and Embassy. These are load checks, not full scene playthroughs.
- 151 Vitest files / 958 tests pass. New coverage includes active-window/tool
  contact, collision splitting, map discovery vs. ownership, Archive map area,
  persistence/reset, real interaction and reward handlers, reciprocal arrivals,
  and facing without moving the player.
- TypeScript and production build pass: 218 modules, 2,703.54 KB main JS. The
  existing large-chunk warning remains. No renderer/resolution changes.

## Evidence And Limits

The exploration checks start from a recorded, legitimately earned pre-boss
save with the Review Folder already held. The bounded fixture changes only the
starting scene/position/facing/traversal; direct-swing QA equips that owned tool.
The negative fixture removes the folder. These are not new Title-to-ending runs
or claims that the entire game now meets the fun/adventure goal.

Evidence directories:

- `/private/tmp/frus-passage-before-desktop`: reproduced old teleport/return.
- `/private/tmp/frus-passage-final-keyboard-map`: direct-swing round trip.
- `/private/tmp/frus-passage-final-mobile-map-pass`: touch round trip and map.
- `/private/tmp/frus-passage-final-no-folder`: missing-tool collision check.
- `/private/tmp/frus-passage-scene-smoke`: fourteen scene-load checks.
- `/private/tmp/frus-passage-required-pickup-final`: required game client's
  direct hidden-room pickup, 25 points and no active dialogue.

The required client's direct WebGL-buffer captures were black in headless and
headed attempts. Inspected compositor screenshots and in-frame native renderer
snapshots provide the visual evidence; no speculative renderer fix was made.
An initial direct-swing script faced south and correctly failed to reveal the
shelf. Another script expected mode `inventory` instead of the actual `pause`.
Corrected input/assertions passed without weakening the gameplay rules.

Retained native screenshots under `docs/screenshots/`:
`reading-room-open-shelf.png`, `reading-room-first-edition.png`, and
`reading-room-pause-map.png`.

This is a local checkpoint on `codex/web-opening-playtest`, served at
`http://127.0.0.1:5195/`. No push, public deployment, iPhone-project change, or
real iPhone Safari certification. Remaining priorities include reducing pause
menu density, replacing the long optional hearing quiz with a physical review
challenge, checking transition stalls, and excluding paused time from run stats.
