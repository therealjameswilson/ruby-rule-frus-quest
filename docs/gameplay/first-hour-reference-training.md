# First-Hour Action-Adventure Training Notes

Reference: one-hour pass over the linked full-game action-adventure walkthrough, used only for broad gameplay grammar. Do not copy maps, art, enemies, music, room layouts, puzzles, names, or exact sequences.

Runtime source window: `window.render_game_to_text().oneHourTraining` records the reference duration as 23,936 seconds, the trained window as minutes 0-60, and the trained slice as 3,600 seconds. This keeps the implementation honest: the game is borrowing first-hour pacing, readability, gating, and reward-loop grammar, not reproducing the full walkthrough.

## Transferable Lessons

- The player should always understand the next verb: explore, act, unlock, read, or choose.
- A compact HUD can carry dungeon literacy: current status, keys, map, room position, and current tool without opening a menu.
- Rooms work best when they are readable from the doorway: one main idea, one visible reward or blocker, and a small number of exits.
- Tool gates feel fair when the locked door itself telegraphs the missing tool.
- Action inputs need forgiveness: short buffers, coyote-style target grace, and clear hit feedback.
- Boss and deadline pressure should be phase-based and readable, not a surprise stat check.

## FRUS Translation

- Hearts become reliability.
- Keys become source-note, clearance, referral, editing, proofing, and buckram tools.
- Dungeon map/compass becomes a room-map chip showing visited and revealed FRUS workflow rooms.
- Treasure rooms become process rewards: stamps, document points, volume fragments, or workflow tools.
- Combat pressure becomes standards pressure: missed deadlines, bad excisions, hidden defects, and DANN-E shortcuts.

## Current Implementation Pass

This pass adds an `adventureTraining` cue that is shown in the active-gameplay HUD and exposed through `window.render_game_to_text()`. It chooses the immediate next verb from live game state:

- `CHOOSE` when a workflow choice is active.
- `READ` when dialog is active.
- `ACT` when an interactable is nearby.
- `EXPLORE` when there is an unvisited room exit, using `GO EXIT N/E/S/W` language.
- `KEY` when a chapter small key can open the visible local gate.
- `MAP` when the chapter still needs its contested-equity map/compass literacy cue.
- `BOSS` when the current boss room is ready for the area review hurdle.
- `RETURN` when a boss/stamp reward should push the player back toward opened shortcuts.
- `UNLOCK` when a visible gate needs a FRUS process tool and no local key is available.
- `GOAL` when no more specific cue is available.

The gameplay-map route pass applies the same first-hour threshold lesson to the DANN-E/world-map expansion maps: a door no longer jumps instantly. It locks input, shows a ruby mosaic route card such as `03 ENTER`, then starts the destination map. The destination map then briefly shows a compact top-right arrival stamp with the same stage code and map title. The route readout also uses compact labels like `ROUTE 03 ENTER` so the HUD, door badge, transition record, and `render_game_to_text()` agree.

The proximity pass applies the same one-hour readability rule before the player is close enough to act: objects now light up inside a wider hint radius, the floating plaque says `! STEP CLOSER`, and the strict A-button action still requires the original interact radius. Pressing A just outside range gives a short "Step closer" message instead of silently failing or accidentally routing through a door. This now covers the gameplay-map scenes, Office Hub, Archive Guide/Cavern route, Archive Source Note 47 research-table loop, Two Networks Clearance Token reward, Referral Vault Concurrence Slip reward, Silent Read proofing outbox/workstation loop, and the DANN-E expansion maps.

The Silent Read route-trail pass adds the same map-literacy grammar inside the proofing/editor room: an active review folder now draws a short cyan/gold pixel route from the carried folder or floor flag to the correct workstation. The cue updates as the player moves and clears with the flag, so the physical verification loop reads as a navigable room task rather than a text-only objective.

The Archive Source Note pass now uses that same live-trail discipline for the first core FRUS proof object: when Source Note 47 is carried, the route diamonds originate at the note's current position and retarget the research table as the player moves. That keeps the first provenance task consistent with the later proofing loop.

The Two Networks reward pass extends the live-trail language to process tools: after the player reaches the ClassNet Vault, the Clearance Token pedestal draws an original cyan/gold route from the player's current position to the token. This makes the stage reward feel like a visible room objective before it becomes an inventory item and overworld gate key.

The Two Networks tile-strip pass applies the same first-hour room-readability rule to the network dungeon itself. N1 now uses original 16x16 OpenNet/ClassNet floor tiles, cable crossings, terminal pads, and firewall gates so the player can distinguish the open network, closed network, and blocked terminal route at a glance. N2 reuses the same strip as a red ClassNet vault with wall tiles and a token plinth, making the reward room read like a proper stage-gate chamber instead of a flat drawing.

The Referral Vault reward pass applies the same room grammar to the Concurrence Slip. In the Concurrence Chamber, the pedestal now draws a live route from the player to the slip and labels the current human-review gate (`PERMISSION`, `APPEAL`, `VISIBLE EXCISION`, or `TAKE SLIP`). This keeps the referral stage readable as a physical process reward instead of a text-only checklist.

The Referral Vault tile-strip pass gives that reward loop its own room language. R1 now uses original 16x16 equity floor, referral-channel, manifest desk, agency-seal, and excision-gate tiles so the player can read the agency-equity puzzle and visible-withholding gate as physical blockers. R2 shifts the same stage into a concurrence chamber with wall tiles, seal plaques, and a central slip plinth, making the Concurrence Slip feel like a dungeon reward rather than a floating inventory icon.

The Buckram Gate publication-table pass carries that grammar into the win room. Once the final gate has a valid human publication action available, the table draws a short route from the player's current position and the floating prompt names the exact next action (`CERTIFY`, `GPO`, `FUNDING`, `PUBLISH`, etc.). The route clears when the player reaches the table, leaving the final publication verb anchored to the physical FRUS volume handoff.

The FRUS Production Floor workflow-rail pass applies the same first-hour path-readability lesson to the full compilation pipeline. The production-floor map now draws a compact `FRUS VOLUME PATH` rail with five nodes (`SRC`, `COMP`, `DEC`, `ANN`, `PUB`) and exposes the full route in `render_game_to_text()` as `1 RESEARCH > 2 COMPILE > 3 DECLASS > 4 ANNOTATE > 5 PUBLISH`. This makes the actual FRUS production flow visible as a navigable path without copying the reference video's maps or layouts.

The FRUS Production Floor current-stage cursor pass makes that rail reactive. As the player crosses the production floor, the rail highlights the nearest phase with `NOW R`, `NOW C`, `NOW D`, `NOW A`, or `NOW P`, while `render_game_to_text()` reports the full current stage (`FRUS FLOOR CURRENT: 3 DECLASS`, etc.). The result is closer to a 16-bit dungeon-readable path: the map teaches both the whole route and the player's present workflow position.

The live task-card pass adds the verb layer that makes the rail more playable: each active node now carries a compact task card (`VERIFY SRC`, `SELECT DOC`, `ROUTE EQ`, `CHECK NOTE`, `BIND VOL`) and the text-state mirror reports the full current FRUS task. The player can therefore read the production floor like a dungeon map and a workflow checklist at the same time.

The gate-status pass adds dungeon-like completion literacy to the same rail. Each FRUS Production Floor node now carries a tiny status light and requirement card (`CITE`, `SEL`, `EQ`, `EDIT`, `BIND`), with text-state output such as `FRUS FLOOR GATES: 1 NEED CITE > 2 NEED SEL > 3 NEED EQ > 4 NEED EDIT > 5 NEED BIND`. The floating `STEP CLOSER` prompt also reserves the rail area on this map, and the active task card shifts to the side of the player so the workflow cue stays readable while standing on a station.

The next-gate pass adds the final one-glance route cue for that rail: the first unfinished station gets a compact `NEXT <requirement>` card and arrow, and `render_game_to_text()` mirrors it as `FRUS FLOOR NEXT GATE: 1 CITE` or `FRUS FLOOR NEXT GATE: READY`. This makes the production floor closer to a dungeon progress board: current room, completed gates, and next missing key are all readable without opening a menu.

The next-route pass makes that cue spatial. A small alternating cyan/gold breadcrumb trail now draws from the player's current position toward the first unfinished gate, and the text-state mirror reports `FRUS FLOOR ROUTE: TO 1 CITE`. This turns the production floor from a board the player reads into a route the player can follow.

The next-gate interaction pass makes the end of that route actionable. The first unfinished node now becomes a live station (`Gate CITE`, `Gate SEL`, `Gate EQ`, `Gate EDIT`, or `Gate BIND`) with a floating prompt and short FRUS-specific instruction dialog. This carries the first-hour lesson from "see the lock" into "press A at the lock and learn exactly which production tool or human review step opens it."

The ready-gate pass makes the completion edge readable too. Once all five workflow gates are satisfied, the active station moves to the publication node as `Gate READY`, and its dialog sends the player toward the Buckram Gate with the certified record. The rail no longer goes quiet at the moment it should be giving the player a reward-return cue.

The tool-lock icon pass adds item-gate literacy to the rail. The active unfinished node now shows a small original pixel icon for the missing FRUS tool, and the text-state mirror names it (`FRUS FLOOR TOOL: CITE Citation Stamp`). That pushes the Production Floor closer to an item-gated adventure map: the player sees the lock, the route, and the tool identity in one glance.

The full lock-strip pass completes that idea across the whole rail. Every Production Floor gate now carries a mini tool silhouette, dimmed while missing and bright when satisfied, while the active gate keeps the larger icon. The map now behaves more like a dungeon item map: the player can scan all locks, see the current route, and understand which FRUS process items still need to be earned.

The gate-count plaque adds a compact progress meter to that same board. `0/5 GATE` through `5/5 GATE` gives the player the same quick-read satisfaction as a dungeon key/crystal counter, while the pips below the plaque preserve which gates have been cleared without opening a menu.

The ready-route pass keeps the finished rail from going silent. When all five Production Floor gates are clear, the breadcrumb route retargets the publication node as `Gate READY`, and the text-state mirror reports `FRUS FLOOR ROUTE: TO GATE READY`. This preserves the first-hour reward-return lesson: a cleared lock should immediately point to the next physical handoff, not just disappear.

The ready-marker pass makes that final handoff visible even before the player reaches it. The publication node now raises a green-and-gold `GATE READY` plaque and arrow while the older unfinished-gate `NEXT` marker disappears, matching the same one-screen readability rule used for earlier locked stations.

The ready-prompt pass aligns the interaction layer with that final handoff. On the completed Production Floor, generic return-door hints no longer steal the bottom prompt while the active rail route is pointing to publication; the step-closer prompt now says `GATE READY` until the player is close enough to interact with the final station.

The Buckram handoff pass makes the final Production Floor station behave like an actual adventure-game threshold. Pressing A at `Gate READY` records the completed handoff, plays the ruby mosaic route transition, and loads the Buckram Gate so the player immediately sees the remaining publication-table checklist.

The Archive Guide pass tightens the first five-minute start-room lesson. The Historian Office guide interaction now uses hierarchy-free `Archive Guide` language and raises a compact cue with an evidence map, source token, archive box, and `EVIDENCE PATH` caption. This keeps the opening FRUS office focused on a safe, readable first verb without using rank language or relying on a paragraph of instructions.

The World Map selected-route pass makes the overworld atlas playable without a mouse. Up/down cycles the selected district, left/right cycles the region, and A/Enter enters the selected route. The map now draws a four-arrow cursor around the selected cartouche and a single bottom route card with district, destination, and verb, matching the first-hour lesson that world navigation should be readable and immediately actionable.

The World Atlas Relic pass gives that lesson a visible SNES object in the region-select scene. The top map-control band now includes an original 24x24 ruby/gold/cream atlas relic labeled `MAP`, and the typed atlas readout exposes it as `worldAtlasRelic`. This keeps the first-hour map-literacy lesson anchored to an in-world FRUS artifact rather than a hidden implementation note.

## Encoded Training Profile

The reusable first-hour lessons live in `src/game/firstHourTraining.ts` as typed beats. They intentionally describe gameplay grammar, not copyrighted expression:

- Room readability: one main idea visible from the doorway.
- Unvisited-exit pressure: send the player to the next new edge before abstract objectives.
- Visible-gate fairness: name the missing FRUS tool at the gate and in the HUD.
- Small-key literacy: local document subtasks become local route opening.
- Map literacy: contested equities become the dungeon map/compass layer.
- Boss-gate clarity: the hardest review hurdle appears after the stage-gate tool is earned.
- Reward return: stamps and tools should immediately imply a newly opened shortcut.
- Standards pressure: deadline and Kellogg damage must be readable and recoverable.

## One-Hour Segment Model

The one-hour reference is encoded as seven broad phases plus one cross-cutting deadline-pressure phase, each mapped to a FRUS production mechanic:

| Minutes | Phase | FRUS Transfer |
| --- | --- | --- |
| 0-8 | Orientation | Teach movement, doors, desks, source-note objects, and safe interaction before abstract goals. |
| 8-18 | Overworld loop | Let the player see open routes and future blocked routes in the same region. |
| 18-28 | Dungeon entry | Teach source-note locks, local keys, contested-equity map literacy, and return paths. |
| 28-38 | Item mastery | Put a newly earned process tool beside a legible gate it can immediately solve. |
| 38-48 | Key-lock loop | Convert document subtasks into local chapter keys and room progress. |
| 48-56 | Boss readiness | Make the hardest review hurdle readable only after the stage tool is earned. |
| 56-60 | Reward return | Push the player back outward with a stamp, tool, or shortcut that changes the overworld. |
| 45-60 | Deadline pressure | Keep standards damage and statutory-clock pressure visible and recoverable late in the loop. |

## One-Hour Drill Ladder

The training model also has twelve five-minute drills. These are acceptance checks for FRUS Quest feel, not a copy of the reference video's rooms or sequence:

| Minutes | Drill | FRUS Acceptance Signal |
| --- | --- | --- |
| 0-5 | Start Room | A new player can name the next verb without reading a paragraph. |
| 5-10 | Edges | The HUD cue points to an unvisited N/E/S/W exit before generic objectives. |
| 10-15 | Tease Gate | Blocked routes say which tool is missing and why the route matters. |
| 15-20 | Threshold | The player sees the difference between overworld exploration and chapter-room routing. |
| 20-25 | Map Chip | The map/compass cue appears before the player spends keys blindly. |
| 25-30 | Local Key | A key is earned and the nearest locked chapter door becomes the obvious next use. |
| 30-35 | Use Reward | The player uses the newly acquired tool within one or two rooms. |
| 35-40 | Shortcut | The next cue is return/shortcut oriented after the reward. |
| 40-45 | Cadence | The dungeon loop has a visible key count, a lock, and a next room unlocked by the spend. |
| 45-50 | Hazards | The player can see the hazard state and recover through a valid FRUS action. |
| 50-55 | Boss Gate | The boss-readiness cue only appears once the required tool is held. |
| 55-60 | World Change | The game state exposes a new route immediately after the reward. |

`window.render_game_to_text().adventureTraining` now includes `sourceBeatId`, `phase`, `phaseLabel`, `drillId`, `drillLabel`, `drillMinuteRange`, and `drillObjective` so tests and future tuning can see which one-hour lesson produced the current prompt.

`window.render_game_to_text().oneHourTraining` now exposes the full one-hour coverage ladder: all twelve five-minute drills, the active drill, the active minute range, the FRUS implementation signal for each drill, and a 60-entry minute-by-minute ledger. Use it as the acceptance check when tuning new screens: every route, lock, reward, hazard, and boss gate should map back to one of these drills without copying the reference video's maps, art, text, music, or exact puzzle layouts.

The visible Office board keeps the SNES-readable twelve-node strip, while the QA readout carries literal one-hour coverage through `trainedMinuteMarks: 60` and `minuteMarks[0..59]`. Each minute mark records the phase, drill, beat cue, FRUS objective, and implementation signal, so browser probes can confirm the whole first hour has been translated into original FRUS Quest gameplay grammar.
