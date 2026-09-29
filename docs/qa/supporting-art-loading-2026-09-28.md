# Supporting artwork demand loading

Removed BootScene loads for HAC, shutdown, bees and mice, along with their obsolete procedural placeholder generation. GameplayMapScene already owns the HAC texture load. No active scene imports the BeeSwarm, FederalShutdown or NavyHillMice classes; their source/assets remain available. No game artwork was resized or degraded.

Cold local HTTP startup resource bodies fell from 11,519,030 to 8,179,333 bytes (29.0%). This is encoded resource size, not an internet/device speed measurement. The four images account for 3,336,772 bytes and removed boot code accounts for the remaining difference.

286 source test files / 2,128 tests, TypeScript and fresh production build pass. Browser fixture verifies startup requests exclude the four images, with no placeholder HAC texture; direct-entry and scene-restart fixtures verify detailed room NPCs and one cached HAC request. Historian Office uses the HAC texture for its Archive Guide; West Wing uses the marine guard. Initial fixture incorrectly expected a HAC actor in Capitol Hill, which has no NPC; corrected to inspect actual mapped actors. No gameplay change was made to satisfy that incorrect expectation.

Fresh touch-only opening passed assignment, planning, coaching/counter reward, save/reload and Archive entry, without injected progress or browser errors. Screenshot/state evidence: /tmp/frus-demand-supporting-opening. Standard client state checked; its known black canvas capture was supplemented by inspected compositor screenshots of Historian Office, West Wing and earned Archive arrival.

Build: /tmp/frus-demand-supporting-build, local server 5229. No deployment. Physical device and novice-learning validation remain outstanding.
