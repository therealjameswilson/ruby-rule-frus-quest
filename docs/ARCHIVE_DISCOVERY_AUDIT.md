# Archive Discovery and Guidance Lifetime

## Playthrough

On 2026-09-09, a simulated-touch playthrough used a save earned through the
fresh opening, not injected progression. It collected Source Note 47, explored
the folder clue before the other two clues, resumed partial progress, corrected
an unsupported readership claim, applied the Citation Stamp, opened the stacks,
parked the context cart, gathered the annotation packet, filed the coverage
decision, collected supporting records and reached Two Networks.

Baseline evidence: `/private/tmp/frus-archive-discovery-0909/results.json`.
The route passed with no browser errors. This is guided automated play, not
evidence that an unaided first-time player finds every step intuitive.

## Reproduced Defect

The carried-note trail is rebuilt as the player moves. Its markers were owned
both by the trail's cleanup list and the room's long-lived cleanup list.
Destroyed markers remained referenced by the latter until room exit.

The `--route-lifetime` option in `tools/qa-archive-wall.mjs` now walks the
carried note around both sides of the room with real touch inputs, records
read-only marker counts, and asserts bounded ownership before continuing the
normal critical path.

| Measurement | Before Fix | After Fix |
| --- | --- | --- |
| Room cleanup objects, start | 67 | 64 |
| Room cleanup objects, after walk | 2,198 | 64 |
| Destroyed objects still retained, start | 1 | 1 |
| Destroyed objects still retained, after walk | 2,131 | 1 |
| Visible trail markers, after walk | 4 | 4 |

The before-fix test fails its retention assertion. After the fix, markers have
one owner: the trail. `clearRoom()` already calls its cleanup. No puzzle rules,
input bindings, save fields, rewards or collision changed. This removes retained
references; it does not eliminate marker recreation or establish a measured FPS
gain. The one unrelated retired room object was present before the walk.

Evidence: `/private/tmp/frus-route-lifetime-before-0909/route-lifetime.json`
and `/private/tmp/frus-route-lifetime-after-0909/route-lifetime.json`.
The installed browser client's first resume was before pickup; this was not
counted as carried-note proof. A second run collected the note through keyboard
input and walked with the trail visible:
`/private/tmp/frus-route-client-carry-0909/`. Native screenshots and the reported
held item were inspected, not merely captured.

Build passes (255 modules, main JS 2,802.51 KB, existing chunk-size warning).
All 195 test files and 1,454 tests pass. The source-level cleanup assertion is
a structural regression guard; the browser before/after walk is the evidence
of the actual retention defect and its correction.

The post-fix touch run also completed the entire Archive path through Two
Networks, including partial saves and cart movement. Its results are in
`/private/tmp/frus-route-lifetime-after-0909/results.json`, with no browser errors.
No deployment was performed.

## Remaining Playtest Questions

- Can a new player identify the research table and three source stations without
  route coordinates or a walkthrough?
- Does the source review feel like a meaningful evidence decision rather than
  an interruption between spatial tasks?
- Are supporting document pickups sufficiently rewarding after the cart puzzle?
- The moving trail still creates replacement objects; consider reusing geometry
  if profiling shows allocation spikes, rather than claiming this retention fix
  solves all performance problems.
