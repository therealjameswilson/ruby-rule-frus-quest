# Final Encounter Playtest

Tested locally on 2026-09-12 at runtime commit `67dda1b`.

## Scope

The starting snapshot was earned through the Editor and Silent Read chapter:
`/private/tmp/frus-proof-cancel-after/desktop/earned-storage.json`.
No boss-health, document, reward, or inventory values were injected. Browser
automation used keyboard or touch input and read runtime state for navigation
and combat timing. This is functional evidence, not an unaided human fun test.

## Verified

- Colossus, Swarm, and Cloud defeated. Seven counter/open-core cycles included
  seven fresh melee hits; no retries or missed deadline in the keyboard run.
- Pausing preserved the open-core timer. Boast dialogue held the player and
  statutory clock, used DANN-E's portrait, and accepted deliberate advancement.
- Cloud telegraph reported three distinct spread lanes; native screenshot checked.
- Combat did not change the documentary record or award document points.
  Recoverable combat pressure was restored on victory.
- Bindery Continue retained boss clears, variant counts, inventory and points.
- Five binding packets completed through physical movement and interactions.
  A wrong index choice did not award credit or damage reliability; the human
  certification could be canceled and resumed before deliberate approval.
- Publication required the final press interaction. Points rose from 201 to
  241; certification became published. Reload preserved completion statistics.
- Native publication and record screenshots were inspected: clean publication,
  reliability 100/100, deadline met, three DANN-E variants, five cover pieces,
  first edition not found, one volume finished. Recorded play time was 10:41,
  accumulated across the earned run, not the duration of this test invocation.
- A separate portrait-touch test used sixteen unevenly timed swings without
  projectile/timer reads choosing the swing times. It returned two bolts and
  reached Swarm with reliability 75. No document mutation or console errors.
- The complete five-packet bindery route also passed using portrait touch at
  375x667 / DPR 3, including the wrong index attempt, cancel/resume certification,
  publication, summary navigation and Continue. Native touch panels inspected;
  final points 241, published status and no browser errors match keyboard.

## Evidence

- Full keyboard boss and reload: `/private/tmp/frus-final-earned/`.
- Keyboard binding, publication and reload: `/private/tmp/frus-final-publication/`.
- Uneven touch combat: `/private/tmp/frus-final-imprecise-touch/`.
- Full touch binding and publication: `/private/tmp/frus-final-publication-touch/`.
- Scripts: `tools/qa-boss-counter-loop.mjs`, `tools/qa-bindery-finale.mjs`.

## Nearest-Edge Movement Regression

After the nearest-first corner steering change on 2026-09-12:

- Full suite: 202 test files, 1,564 tests passed.
- Fresh portrait-touch opening passed through memo filing, a harmless counter
  miss, pause, returned bolt, reward and Archive entry. Evidence:
  `/private/tmp/frus-corner-opening/`.
- Earned portrait-touch boss route defeated all three phases without retries or
  a missed deadline. Five fresh open-core hits; Continue preserved the result.
- The sixteen uneven Cloud swings reduced HP from 180 to 68 and returned six
  bolts; reliability fell from 90 to 70. Later precisely timed inputs completed
  the fight. No documentary record or document-point changes, no browser errors.
- Native tutorial, archive, Cloud and resumed bindery screenshots inspected.
  Evidence: `/private/tmp/frus-corner-boss/`. This remains browser simulation,
  not physical-device or first-time human evidence.
- Follow-up found in the resumed bindery: objective says TAKE FRONT PACKET but
  the secondary HUD hint says VISIT THE LIT DESK (initially misread as LEFT).
  The initial packet is at the inbox, not a workstation.

## Bindery Guidance Follow-Up

- Replaced the generic desk hint with a destination derived from saved packet
  progress: inbox while waiting, the named station while carried/routed, and
  central press after all deliveries. Nearby interaction and decision cues
  retain priority. English, Spanish and French cues fit the existing HUD.
- Full earned touch binding route passed with explicit visible-HUD assertions
  before and after pickup. Wrong index response, cancel/reload certification,
  deliberate approval, publication and Continue preserved their prior behavior.
- Result: published, 241 document points, no browser errors. Native inbox,
  front-destination and completed-publication screenshots inspected at
  `/private/tmp/frus-bindery-guidance-touch/`.
- Full suite: 202 files / 1,566 tests passed. Build passed with the existing
  chunk-size warning. Local browser evidence only; not a deployment.

## Touch Forgiveness Follow-Up

Runtime `fbb83d9`, same earned entry, 375x667 / DPR 3:

- First sixteen-swing Cloud sample: HP 180 -> 124, four returned bolts,
  reliability 90 -> 60. Continued to victory without retry and reloaded it.
  Evidence: `/private/tmp/frus-cloud-uneven-touch/`.
- Second sixteen-swing sample: HP 180 -> 96, three returned bolts,
  reliability 90 -> 70. Continued to victory and reload with no retry or missed
  deadline. Evidence: `/private/tmp/frus-cloud-uneven-guarded/`.
- The uneven-input check now requires actual progress and positive reliability,
  in addition to unchanged documents and points. Swing cadence is fixed; only
  visible relative boss position determines facing. Outside that sample, the
  route still uses precise runtime reads, so it is not an unaided human test.
- Deliberately exhausted reliability while holding touch B. The retry dialog
  remained open instead of selecting retreat. Releasing B and pressing A
  restarted Colossus with reliability 100, unchanged documents and points;
  subsequent uneven swings reached Swarm. Native retry panels inspected.
  Evidence: `/private/tmp/frus-boss-retry-touch/`.
- No damage, speed, or timing changes based on these samples. Differences between
  automation runs are not enough to identify a touch-specific balance defect.

## Remaining Bar

- Do not claim a full unaided first-time playthrough or physical iPhone QA.
- Full touch boss follow-up passed all three phases with seven fresh melee hits,
  no retries, and persisted victory: `/private/tmp/frus-final-full-touch/`.
  Cloud reduced reliability to 20 before victory recovery (keyboard ended combat
  at 80). This single automated comparison warrants further touch-difficulty
  observation, not an immediate balance conclusion.
- Observe whether a new player understands facing and returning the bolt without
  runtime readouts. Functional success alone does not establish readable combat.
- Evaluate whether the five final handoffs feel like a satisfying conclusion or
  repetitive errands. Preserve human certification when improving the pacing.
- Optional secrets and the alternate/secret ending paths are outside this pass.
- These results are local; they do not establish public deployment status.
