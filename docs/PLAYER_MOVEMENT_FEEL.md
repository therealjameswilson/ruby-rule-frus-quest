# Direct Adventure Movement

Updated September 12, 2026 in response to the request for smoother,
Link-inspired hero control. This is original movement tuning, not a claim
of reproducing Nintendo's controller code.

## Changes

- Walking speed: 58 to 72 logical pixels per second.
- Immediate starts, stops and reversals replace acceleration and release glide.
- Diagonals retain equal total speed and sticky cardinal facing.
- Tool swings retain their movement slowdown.
- Nearby open corners guide the hero sideways at 60 pixels per second,
  rather than snapping three pixels sideways. Solid walls no longer attract
  the hero toward unrelated half-tile grid lines.
- Diagonal input slides along terrain without opposite-direction corner assists.
- Walk animation reflects actual movement, not walking in place against a desk.
- Subpixel logical positions and pixel-snapped rendering remain separate.

## Verification

- Full suite: 196 files / 1,468 tests passing, including live Player start,
  reversal, release, collision, corner and 30/60/120 FPS distance tests.
- Production build passes. Existing large JavaScript chunk warning remains.
- `tools/qa-player-movement.mjs`: keyboard and simulated touch at 375x667.
  Actual directional input moves around the Office; release holds position;
  solid desks stop movement without sideways drift; feet never overlap desks;
  sampled render positions remain integers. No browser errors.
- Standard installed game client exercised the same route. Its initial WebGL
  canvas export was black; a headed rerun with native renderer capture was
  inspected successfully alongside the mobile native capture.
- Debug Office fixtures test movement, not an earned campaign completion.
  This is not a physical-iPhone test or proof of subjective enjoyment.

The first interrupted build/test attempt ran out of disk space. Only the
regenerable Node compilation cache was removed, then verification reran.
Source assets, saves and screenshots were preserved.

Local preview: http://127.0.0.1:5195/. Not deployed.

## Corner Guidance Frame-Rate Correction

The original one-pixel-per-frame ceiling made lateral guidance 30px/s at
30 FPS, 60px/s at 60 FPS, and 72px/s at 120 FPS. Regression tests reproduced
different positions after equal elapsed time at 30 and 120 FPS. Guidance now
uses a separate 60px/s rate multiplied by clamped delta and the existing tool
movement scale. The 60 FPS feel and three-pixel edge search are unchanged.
Logical positions remain fractional; rendering remains pixel-snapped.

All 1,475 tests / 196 files and the production build pass. The keyboard and
375x667 simulated-touch Office movement probes pass release, wall collision,
diagonal sliding and integer-render checks with no browser errors. Native
captures were inspected at `/private/tmp/frus-corner-rate/`. Frame-rate
equivalence is a controller unit test, not a physical-device benchmark.

## Short-Press Release Correction

The input-layer direction latch previously outlasted a released short press,
despite the player's immediate-stop controller. A live 30ms-press probe measured
6px of additional keyboard travel and 1px of touch travel after release.
Direction latches are now consumed after one input sample. Held input still
drives movement; an otherwise missed between-frame tap gets one sample, not a
forced 110ms nudge. Action latches and fresh-action edges are unchanged.

`qa-movement-release.mjs` now measures zero post-release drift for both input
sources. Baseline: `/private/tmp/frus-release-before/`; after:
`/private/tmp/frus-release-after/`. Native touch capture inspected.
The keyboard/touch movement probe also passes furniture collision, diagonal
sliding and integer rendering. The installed game client exercised short taps
and movement; native capture inspected. Evidence:
`/private/tmp/frus-release-movement/` and `/private/tmp/frus-release-client/`.

Fresh simulated-touch opening passes assignment, memo, counter training,
intentional miss, pause, reward and Continue into Archive without browser
errors. Native continued-gate capture inspected. Evidence:
`/private/tmp/frus-release-opening/`. Full suite: 1,488 tests / 196 files;
production build passes with the existing bundle warning. No new full-campaign
or physical-phone claim; not deployed.

## Committed Swing Facing

Directional input no longer rotates an attack during its windup or active
window. Movement still responds, with the existing tool slowdown; facing
unlocks in cooldown. Fallback sprite mirroring follows facing rather than
sideways movement so it agrees with the hitbox. No attack durations, reach,
damage, buffering, inventory or save behavior changed.

Two regression cases first failed on the old controller, then passed.
The full suite passes 1,477 tests / 196 files; production build passes with
the existing bundle warning. `qa-swing-facing.mjs` exercises keyboard and
simulated touch at 375x667 in the debug vault: a south-facing swing while
moving west retains a south hitbox, then permits west facing in cooldown.
Native captures inspected; no browser errors. Temporary evidence is at
`/private/tmp/frus-swing-facing/` and `/private/tmp/frus-swing-facing-touch/`.
The installed game client also exercised a vault swing and movement.

The earned touch boss regression then cleared Colossus, Swarm and Cloud,
verified seven fresh core hits, and reached the bindery in 54.406 seconds
after its opening checks, without retry or missed deadline. Continue restored
the bindery. Cloud reduced reliability to 60 before the existing victory
recovery; the fight was not damage-free. Evidence: `/private/tmp/frus-swing-boss/`.
This is scripted earned-save QA, not unaided play or physical-phone evidence.
Retained touch image: `screenshots/swing-facing-touch.png`. Local only.

## Fresh Opening Regression

After the movement commit, `qa-guide-counter.mjs` passed on both keyboard
(`--coaching`) and simulated touch (`--mobile`). Both start without a save,
create a compiler, talk to JR, collect the memo, deliver it, enter Guide,
complete the counter lesson, collect the Front Matter Fragment, reload,
Continue and enter ArchiveScene. No progress was injected.

- Touch: 17 checkpoints, including a harmless miss, frozen projectile during
  pause, returned bolt and persistent reward. No browser errors.
- Keyboard: also checks opposite room boundaries, intentionally faces away,
  then follows the displayed facing/timing cues for the counter. No browser
  errors. Reliability remains 80 on both routes.
- Native screenshots inspected: saved gate on touch, coached counter on
  keyboard, and Archive entry. Retained in `screenshots/movement-opening-*.png`.

This verifies that faster movement preserves the opening interactions and
first room transition. The scripts know the route, so this is not evidence
that an unaided new player understands the adventure, nor a full-campaign
completion or physical-device test. No gameplay retuning was needed here.

## Earned Archive Regression

The simulated-touch `qa-archive-wall.mjs --mobile` run continued from the
fresh opening save after the movement change. All 39 checkpoints passed
and reached NetworkScene with 55 document points and 73 reliability.
The run starts with 20 points and 80 reliability; deliberate wrong-route
and early-swing checks take time under live enemy pressure.

Verified: locked stairs; no unreviewed stamp bypass; all source-trail clues;
refusal to file unsupported readership; corrected-but-unfiled Continue;
source approval and wall clearing; repeated-swing reward protection;
annotation-stack entry; partial-packet Continue; cart contact collision;
four deliberate cart pushes and intermediate-position Continue; parked-cart
context access; three-note packet return/filing; telegram/cross-reference
pickups; east exit to Two Networks. No browser errors or injected progress.

Native cart-contact and Network-entry images were inspected and retained as
`screenshots/movement-archive-cart.png` and
`screenshots/movement-network-entry.png`. The earned continuation is at
`/private/tmp/frus-faster-archive-touch/earned-storage.json` for subsequent
local QA. It is temporary, not a shipped save. No gameplay edits were needed.
Next: Network traversal, choices and gated exits with this controller.

## Earned Network Regression

`qa-network-ledger.mjs --crossing --pointer` continued the earned Archive
save on keyboard movement and pointer choices. All 29 checkpoints completed
through ReferralVaultScene with 82 reliability and no browser errors.

The route verifies public-first crossing requirements, stamp opening and
pause-input isolation, saved crossing state, four routing packets, immediate
retry after a wrong network, three protected-review dockets, wrong-desk
retry, explicit ledger editing versus filing, unfiled-draft Continue,
Clearance Token pickup and the east referral exit. No game-state injection
or gameplay edits were used. Native crossing and ledger screenshots were
inspected; the earned next save is
`/private/tmp/frus-faster-network/desktop/earned-storage.json`.

This run is keyboard/pointer, not simulated touch. It exercises known routes
and intentional mistakes, not unaided discovery. Next: Referral traversal
and remaining campaign checks after the movement change.

## Earned Referral Regression

The simulated-touch `qa-referral-manifest.mjs --mobile` continuation passed
38 checkpoints from the earned Network save to SilentReadScene, with 91
reliability and no browser errors. This covers agency handoffs, wrong-desk
retry, the dispatch-copy shelf route and return shortcut, partial-save
Continue, explicit manifest filing, treatment dockets, Concurrence Slip
collection, backtracking without duplicate rewards, and the editor exit.

The first run exposed a timing-confounded test: its no-teleport assertion
included later live frames during which enemy knockback can occur. The test
now measures the actual completion method synchronously, without changing
gameplay or injecting progress. The successful rerun measured exactly
`(198, 185)` before and after completion. Native editor-entry art was inspected.

Evidence and the next earned save are under
`/private/tmp/frus-faster-referral-verified/mobile-375x667-dpr3/`.
These are temporary QA artifacts. Remaining editor and boss checks are not
yet verified with the faster controller; scripted touch is not real-device
or unaided-player evidence. No deployment was performed.

## Earned Editor and Proof Regression

`qa-proof-comparison.mjs --mobile` continued the earned Referral save through
51 checkpoints to BlackVaultLairScene. It earned 87 document points (114 to
201), ended at 100 reliability, and reported no browser errors. All motion
and choices used simulated touch; no progress was injected.

The run covers the editor hint and draft pickup, carried-draft Continue,
visible withholding repair, explicit filing, Red Pencil pickup, proof-room
furniture collision, seven review checks, deliberate wrong/incomplete
submissions, partial-draft Continue, frozen combat during choices, no
choice-input swing leakage, Buckram Key pickup, backtracking without duplicate
rewards, and the Black Vault handoff. Native repair, proof-room and vault-entry
screenshots were inspected. No gameplay change was needed for this pass.

Temporary evidence and the earned boss-entry save are at
`/private/tmp/frus-faster-editor/mobile/`. Retained images:
`screenshots/movement-proof-room.png` and
`screenshots/movement-black-vault-entry.png`.
Next: exercise boss counters, miss/recovery, and the binding ceremony with
the faster controller. These known-route checks do not prove unaided
comprehension, real-device performance, or whole-game fun.

## Earned Boss and Publication Regression

The boss's armored-core objective now says `RETURN THE BOLT`, replacing the
ambiguous `FACE + SWING`. The browser test checks the actual HUD text as well
as reported state. Existing exposed-core and swarm instructions are unchanged.

The first earned touch boss run reached Cloud but exhausted reliability
twice. Its retry limit then counted taps swallowed by the prompt's 300ms
guard as additional retries. The QA script now waits out that guard and counts
only confirmed restarts. No damage, HP, enemy timing, or retry limit was reduced.
This initial failure remains evidence that Cloud's forgiveness needs a less
timing-aware playtest, not proof of a harmless false alarm throughout the fight.

The full rerun passed Colossus, Swarm and Cloud in 59.925 seconds after opening
strikes, with six verified fresh core hits, no retries and no missed deadline.
It checks boss portrait attribution, boast input isolation, swarm dispersal,
cloud lane warnings, pause freezing the counter window, no document changes
from combat, and persisted victory after Continue. Evidence:
`/private/tmp/frus-faster-boss-verified/`. The earlier failed run remains in
`/private/tmp/frus-faster-boss/`.

The resulting earned save passed `qa-bindery-finale.mjs --mobile`: all five
packets, bench collision, correction retry, human certification, publication
and Continue. Points increased from 201 to 241 exactly; browser errors were
empty. Evidence: `/private/tmp/frus-faster-bindery/`. Retained images show the
armored-core instruction and publication. The installed web-game client also
loaded and moved in the Black Vault debug route; its native image was inspected.
That separate debug smoke check is not earned campaign evidence.

Focused boss tests: 45 passed. Production build passed with the existing
large-chunk warning (main JS 2,802.51 kB). The chained faster-controller campaign
now reaches publication; it is informed automation across saved chapter
checkpoints, not an uninterrupted novice playthrough or real-device QA.
Next: a less scripted Cloud miss/recovery probe and an unaided-comprehension
pass. No public deployment was performed.
