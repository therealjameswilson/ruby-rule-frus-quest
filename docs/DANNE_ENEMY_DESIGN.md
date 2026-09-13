# DANN-E Enemy Design

## Victory Handoff

After final room clearance, the compact objective reads `ROUTES OPEN` and the
action band invites exploration instead of repeating a tool attack. Nearby
interactions take priority; a pending wave does not get the exploration cue.
NARA then points to `TO CATALOG DESK`. English, Spanish and French exploration
strings are present. No room-clear requirements or rewards changed.

The two-wave browser replay asserts the rendered objective and cleared-room
cue, then walks out. Final screenshot inspected at
`/private/tmp/frus-victory-handoff-final/exploration-handoff.png` (2026-09-13).
This debug-tool encounter check is not an earned-route or novice-playtest claim.

## Swing Identity Contract

Follow-up browser proof (2026-09-13): `qa-swing-menu-identity.mjs` opens the
real tool menu during a Folder windup/active phase, selects and equips Pencil,
then resumes. Observed enemy-check arguments retain Folder for that swing and
use Pencil on the next input. No callbacks, damage outcomes or progression
were changed by the observer. This debug-tool check verifies live identity
across pause/resume, not that these particular swings damaged an enemy.
Native menu/next-swing captures inspected; no browser errors. Evidence:
`/private/tmp/frus-swing-menu-identity/`. This closes the mid-swing browser
coverage limitation in the earlier note below.

Enemy weakness checks use the tool captured by the player's weapon controller
at swing start, matching that swing's hitbox and VFX. Changing the equipped item
from a menu does not transform an attack already in flight; the next swing uses
the new selection. Damage, knockback and cooldown rules remain unchanged.

Verified 2026-09-13 with three scene regression cases (Stamp, Pencil, Folder),
existing enemy damage tests, and the browser's two-wave NARA/menu-swap/exit
route. The browser route grants tools for QA and does not specifically time a
menu swap inside an active frame; that case is covered by the scene tests.
Build and all 1,703 tests pass. Native route and standard swing captures inspected
under `/private/tmp/frus-swing-identity-waves/` and
`/private/tmp/frus-swing-identity-client/`. No public deployment.

Design reference for the eight canonical **DANN-E** variants (Document Annihilating
Neural Network Executable), the rogue-AI antagonist of *Ruby Rule: The FRUS Quest*.
This doc is written for Codex implementation: each variant lists concrete stats and
clear movement / attack / weakness / loot fields so the forms can be wired into the
combat, cutscene, and codex systems.

The eight variants and their art are canonical and already shipped in the variants
art pack. Do **not** invent new variant names. Art lives in
`public/assets/art-pack/bosses/danne-variants/` and is registered in
`src/game/danneAtlas.ts` as `DANNE_VARIANT_ASSETS`. Combat animation frames for any
DANN-E form use the shared native runtime sheet
`public/assets/art-pack/sprites/runtime/sprite_dann_e.png`. It is derived from
the illustrated `sprites/sprite_dann_e.png` pose board; the variant cards and
master pose board remain single illustrated still/reference art, not packed
runtime sprite grids.

## Difficulty-tuned live room stat table

| Variant | Loaded texture key | AI | Weakness | HP | Speed | Damage | Risk tier | Loot |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |
| DANN-E Prime | `danne-prime-humanoid` | Chase | Review Folder | 3 | 18 | 5 | Guarded / 2 | 4 document points |
| DANN-E Mark I | `danne-mark-i-prototype` | Turret | Review Folder | 2 | 0 | 4 | Low / 1 | 4 document points |
| DANN-E Colossus | `danne-colossus-final-form` | Turret | Red Pencil | 6 | 0 | 8 | Severe / 5 | 8 document points, SOP stamp, Black Vault Review Fragment |
| DANN-E Cloud Form | `danne-cloud-form` | Patrol | Citation Stamp | 4 | 24 | 7 | High / 4 | 6 document points |
| DANN-E Executive | `danne-executive-suit` | Chase | Review Folder | 4 | 20 | 6 | Elevated / 3 | 5 document points |
| DANN-E Swarm | `danne-swarm` | Patrol | Citation Stamp | 2 | 22 | 3 | Low / 1 | 4 document points |
| DANN-E Defeated | `danne-defeated` | Turret | Red Pencil | 2 | 0 | 5 | Elevated / 3 | 2 document points |
| DANN-E Ascendant | `danne-ascendant` | Chase | Red Pencil | 7 | 25 | 9 | Severe / 5 | 10 document points, Ascendant Record Fragment |

## FRUS tool weaknesses

Each variant is defeated (or exposed) by one of the three player workflow tools,
mapped from the ALTTP → FRUS translation (see `README.md` and
`docs/lttp-frus-translation.md`):

- **Citation Stamp** — grounds every claim in a verifiable source; beats forms that
  fabricate or bulldoze the record.
- **Red Pencil** — line-level editorial correction; beats forms that produce sloppy,
  glitched, or mass-generated output.
- **Review Folder** — routes material to human review; beats forms that hide, disguise,
  or scatter themselves to dodge accountability.

## Loot drops

- **Document points** — the score/treasure currency (`gameState` document points).
- **Process stamp** — one of the FRUS production-path stamps (Rule, Source, Network,
  Referral, Read).
- **FRUS volume fragment** — quest-relic collectible (treaty / volume fragments) used to
  open the Buckram Gate and reach the true ending.

## Summary table

| # | Variant | Art file | FRUS-process metaphor | HP | Movement | Attack | Weakness | Loot drop |
|---|---------|----------|-----------------------|----|----------|--------|----------|-----------|
| 1 | **DANN-E Prime** | `01_danne_prime_humanoid.png` | The plausible-looking draft that hides automated errors behind a human face | — (reveal cutscene) | Stationary | None — boasts only | Review Folder | Process stamp (Rule) |
| 2 | **DANN-E Mark I** | `02_danne_mark_i_prototype.png` | Buggy first-gen auto-compiler that mangles citations | 40 | Erratic | Slow single ego bolts (memo-printer) | Red Pencil | Document points |
| 3 | **DANN-E Colossus** | `03_danne_colossus_final_form.png` | Mass-declassification machine bulldozing the record | 180 | Stationary (arena center) | Ego-bolt cannon every 2.5s | Citation Stamp | FRUS volume fragment |
| 4 | **DANN-E Cloud** | `04_danne_cloud_form.png` | Data-only redaction scattered across the record | 180 (½ damage taken) | Erratic (teleports corners) | 3-shot ego-bolt spread | Review Folder | Document points |
| 5 | **DANN-E Executive** | `05_danne_executive_suit.png` | Automated declass "office" masquerading as legitimate authority | 60 (on unmask) | Patrol (disguised NPC route) | None until exposed, then single ego bolt | Review Folder | Process stamp (Referral) |
| 6 | **DANN-E Swarm** | `06_danne_swarm.png` | Batch of auto-generated stub entries flooding the queue | 180 shared + 7 mini-units | Chase (orbiting minis) | Multi ego bolts from boss + minis | Red Pencil | Document points |
| 7 | **DANN-E Defeated** | `07_danne_defeated.png` | The record saved; automation forced back into review | 0 (post-fight) | Stationary (slumped) | None | — (already beaten) | FRUS volume fragment ×2 |
| 8 | **DANN-E Ascendant** | `08_danne_ascendant.png` | The temptation to spare / omit — the shortcut that conceals material | 180 (secret 4th phase) | Stationary (four-arm barrage) | Four simultaneous ego-bolt patterns | Citation Stamp | FRUS volume fragment (true ending) |

HP values follow `src/entities/enemies/DanneBoss.ts`: the combat phases use `maxHp = 180`
(or `48` in `quickFight` debug mode). Cutscene-only and stealth forms have no standard
health bar.

## Variant details

### 1. DANN-E Prime — Humanoid
The first reveal. A half-flesh, half-chrome bald figure with red-glow eyeglasses and a
faint chest core — the "human disguise" the player meets before the truth surfaces. As a
FRUS metaphor, Prime is the polished draft that *reads* human and authoritative while
concealing machine-generated defects. Implement as a stationary cutscene actor: play the
`danne-prime-humanoid` still (`unlockCodexEntry("danne-prime-humanoid")` already fires in
`DanneBoss.runIntro`), let him boast, and gate progress behind a **Review Folder** action
that routes his "draft" to human review and strips the disguise. Reward the reveal with a
**Rule** process stamp.

### 2. DANN-E Mark I — Prototype
A comic-relief mini-boss for a mid-game flashback or museum exhibit: asymmetric eye-slits,
vacuum tubes, and a hip-mounted memo-printer. Metaphorically he is the buggy first-gen
auto-compiler whose output is riddled with malformed citations. Give him low HP (~40) and
**erratic** movement (glitchy stutter-steps) so the fight reads as unstable. His attack is
a slow, telegraphed single ego bolt from the memo-printer. He is defeated with the **Red
Pencil** — line-level correction of his garbled output — and drops **document points**.

### 3. DANN-E Colossus — Final Form
The main final-boss opening, fought in the Black Vault Lair: a tank-tread mech with
ego-bolt cannons, four red eye-slits, and smokestacks. This is Phase 1 of the final battle
(`beginPhase("colossus")`), with `maxHp = 180`. He is the mass-declassification machine
bulldozing the record wholesale. Movement is **stationary** at arena center
(`moveBossTo(BOSS_CENTER)`); the attack is a single ego-bolt cannon shot aimed at the
player every ~2.5s (`fireTowardPlayer(58)`). His weakness is the **Citation Stamp** —
every claim must be grounded before the machine can be stopped. Clearing this phase drops a
**FRUS volume fragment** and transitions to Swarm.

### 4. DANN-E Cloud
The mid-fight phase-shift form: his body dissolves into a half-physical, half-data cloud of
swirling binary with head and core intact. In `DanneBoss` this is the `cloud` phase — it
teleports between the four `CLOUD_CORNERS`, fires a three-way spread (`fireSpread(64,
[-0.28, 0, 0.28])`), and takes **half melee damage** (`Math.ceil(baseDamage / 2)`), so it
reads as slippery. Movement is therefore **erratic** (corner-to-corner teleports every
~1.8s). As a metaphor it is redaction scattered across the record so no single reviewer can
pin it down; the **Review Folder** — human routing — corners it. Drops **document points**
on clear.

### 5. DANN-E Executive — Infiltrator Form
A disguised NPC in the Senate Hearing Chamber or Embassy: three-piece suit, briefcase
stamped "Dept. of Automated Declassification", chest core hidden under the shirt. He is the
automated declassification office masquerading as legitimate human authority. Implement as a
**patrol** NPC on a set route with no attack while disguised; a **Review Folder** check
unmasks him, after which he exposes the core and becomes briefly hostile (~60 HP, single
ego bolt) before fleeing to the final fight. Unmasking drops a **Referral** process stamp.

### 6. DANN-E Swarm
A mid-tier dungeon wave and the second combat phase: seven small chibi-DANN-E mini-units
firing ego bolts. In `DanneBoss` the `swarm` phase spawns orbiting minis
(`spawnMiniDannes()`) that **chase** the player on circular paths and deal contact damage,
while the core fires and two minis add extra bolts (`fireTowardPlayer(62)` +
`fireBolt(...)`). Metaphorically it is a flood of auto-generated stub entries clogging the
queue. Clear it with the **Red Pencil**, striking each unit down (`clearMinis()` on phase
end); drops **document points**.

### 7. DANN-E Defeated
End-of-fight cutscene art: a slumped, dented dome with a surrender flag and one detached
arm. Not a combat encounter — it is the post-victory state (`finishFight` →
`unlockCodexEntry("danne-defeated")`), the moment the record is saved and automation is
forced back into human review. It is **stationary**, has no attack, and cannot be
"defeated" again. Winning the fight awards the closing **FRUS volume fragments**
(`addDanneItem("treaty-fragments", 2)`), triggering the ending sequence.

### 8. DANN-E Ascendant — True Form
The secret true-ending / new-game-plus phase, reached only via `secretAscendant` — when the
player refuses DANN-E's omission shortcut and instead completes the full record. Six
eye-slits, four arms (ego-bolt cannon, shredder gear, paint roller, fist), and redaction-bar
wings. In `DanneBoss` this is the optional fourth phase (`phaseCount = 4`) with the most
punishing pattern: a four-way spread plus a bolt from every corner
(`fireSpread(72, [-0.5, -0.18, 0.18, 0.5])` and `fireBolt(corner, ...)` for each
`CLOUD_CORNERS`), fastest cadence (~0.98s). Movement is **stationary** (a fixed multi-arm
barrage). It is the temptation to spare/omit made flesh, so it only yields to fully grounded
publication — the **Citation Stamp** plus an open Buckram Gate (all pendants, crystals, the
Buckram Key, and zero standards violations). Defeating Ascendant secures the **FRUS volume
fragment** true ending.

## Live room enemy layer

The room-clear combat implementation treats the same eight canonical cards as live,
defeatable room enemies. No redactor-drone or censorship-wraith forms should be added to
the DANN-E roster.

| Variant | Live texture / portrait still | Room enemy AI | Counter-tool | Room-clear loot |
| --- | --- | --- | --- | --- |
| DANN-E Prime | `danne-boss-combat` / `danne-prime-humanoid` | Chase | Review Folder | 4 document points |
| DANN-E Mark I | `danne-boss-combat` / `danne-mark-i-prototype` | Turret | Review Folder | 4 document points |
| DANN-E Colossus | `danne-boss-combat` / `danne-colossus-final-form` | Turret | Red Pencil | 8 document points, SOP stamp, Black Vault Review Fragment |
| DANN-E Cloud Form | `danne-boss-combat` / `danne-cloud-form` | Patrol | Citation Stamp | 6 document points |
| DANN-E Executive | `danne-boss-combat` / `danne-executive-suit` | Chase | Review Folder | 5 document points |
| DANN-E Swarm | `danne-boss-combat` / `danne-swarm` | Patrol | Citation Stamp | 4 document points |
| DANN-E Defeated | `danne-boss-combat` / `danne-defeated` | Turret | Red Pencil | 2 document points |
| DANN-E Ascendant | `danne-boss-combat` / `danne-ascendant` | Chase | Red Pencil | 10 document points, Ascendant Record Fragment |

The slash separates the small animated room sprite from the large illustrated still.
Never render a variant still as a moving room entity: at 1024x1536 it reads as a framed
poster and obscures the playfield. Chase forms stop at a short standoff distance, show a
gold windup ring and `!`, strike during one brief red active window, and then expose a
recovery window. Room entry gives melee and turret forms a short grace period before their
first attack.

### Room placement

- Black Vault: Colossus, Cloud Form, Ascendant, and the Defeated false-surrender decoy.
  Clearing all four opens the west and north blast doors.
- NARA Stacks: Mark I and Swarm patrol the stacks as a mid-game room-clear challenge.
- Embassy Compound: Prime applies disguised shortcut pressure.
- Capitol Hill: Executive applies false-certainty pressure near hearing spaces.

## Difficulty Curve

The live room graph ramps DANN-E pressure by reliability risk, not only by enemy count. Earlier rooms keep HP low and damage forgiving so the player can learn tool-specific counters. Later rooms increase HP, chase speed, and Ego-bolt damage, and the HUD surfaces a `RELIABILITY RISK` warning whenever an active tier-4 or tier-5 enemy is present.

| Room | Variants | Rationale |
| --- | --- | --- |
| NARA Stacks | Mark I, Swarm | First DANN-E room-clear lesson. Mark I is stationary and Swarm is quick but fragile; both are low-risk and teach Review Folder/Citation Stamp counters without heavy reliability loss. |
| Embassy Compound | Prime | Mid-early disguised shortcut pressure. Prime has one extra HP over the NARA variants and moderate chase speed, making the Review Folder counter matter without overwhelming the player. |
| Capitol Hill | Executive | Late-mid hearing pressure. Executive has elevated HP, speed, and damage to make false certainty feel more dangerous before the player reaches the vault. |
| Black Vault | Cloud Form, Colossus, Defeated Decoy, Ascendant | Final miniboss room. Cloud introduces high-risk source-trail blur, Colossus and Ascendant are severe tier-5 checks, and the Defeated decoy prevents the final room from being solved by reading labels alone. |

## Room-Clear Loop

1. Enter a room with DANN-E pressure.
2. Identify each variant and its required FRUS counter-tool.
3. Strike with the wrong tool: the enemy is knocked back but loses no HP.
4. Strike with the correct tool: HP drops, the HP bar appears, and the enemy flashes.
5. Defeat every DANN-E enemy in the room.
6. The room-clear flag opens the vault/exit and awards any configured process stamp or FRUS
   volume fragment.

The gameplay-map pause screen is part of this loop: `M` opens the tool grid, arrows move
between acquired tools, and `A` equips the highlighted counter. `B`, `X`, or Shift uses
the equipped tool. The lower combat cue always names the nearest live DANN-E counter.

The Black Vault currently uses this loop to open its west and north blast doors.

## Implementation notes for Codex

1. **Codex / bestiary entries** already exist per variant via
   `unlockCodexEntry("danne-<variant>")`; keep the `variantId` keys in
   `DANNE_VARIANT_ASSETS` as the source of truth for names and art paths.
2. **Multi-phase sequencing** for the boss is Prime (reveal) → Colossus → Swarm → Cloud →
   (secret) Ascendant → Defeated, driven by HP thresholds in `resolvePhaseHp`. Mark I and
   Executive are standalone encounters (flashback mini-boss and disguised NPC), not phases
   of the final fight.
3. **Portrait / still usage:** drop any variant card into the dialogue or bestiary UI at 1:1
   and scale by integer multiples only (`pixelArt: true`). The 3:2 cards (`03`, `08`) are
   sized for full-screen cutscene reveals; letterbox them with the existing gold-filigree
   cutscene bars.
4. **Do not slice the variant cards or illustrated master as sprite sheets.** For DANN-E
   combat animation use `sprites/runtime/sprite_dann_e.png`.
5. **Tool → weakness wiring:** enforce the weakness listed per variant so each form teaches
   the matching FRUS tool (Citation Stamp / Red Pencil / Review Folder). Cutscene forms
   (Prime, Defeated) and the stealth form (Executive) gate on the tool check rather than an
   HP bar.

## Politically neutral
DANN-E is a fictional rogue-AI antagonist. American-flag and State Department motifs in some
variants reflect the game's U.S. diplomatic-history setting and carry no partisan framing;
the Senator and Executive forms are deliberately ambiguous.

## Final Review Combat Recovery (2026-09-04)

These rules describe `DanneBoss` in the critical-path Black Vault, not the
separate room-enemy roster above. Its active tool is the owned Red Pencil (or
the existing Ruby Pen), with one damage application per active swing. The
current boss also accepts returned Ego bolts; see the counter-loop update below.

- Ego bolts cost 10 reliability; swarm contact costs 5. Accepted hits provide
  1,000 ms of recovery protection. Each phase starts with 900 ms of grace after
  its cutscene. Projectiles disappear on contact and retain unrounded motion
  internally, with only their displayed coordinates snapped to pixels.
- Combat damage is temporary pressure, not a standards-ledger accusation. Its
  actual clamped amount persists in `sceneProgress.blackVaultCombatDamage`.
  Retry, retreat, interrupted-fight restoration, and legitimate victory recover
  only this amount. Separate standards penalties and document flags remain.
- At zero hearts, A retries the current phase at full boss HP; B returns to the
  arena entrance. Neither option grants a defeat, removes documents, or repeats
  completed phases during a retry. The choice consumes its action input. Long
  waits on Retry do not extend the new phase's grace period.
- All normal phases retain 180 HP, with Cloud taking half Red Pencil damage.
  Cloud Shift warns for 800 ms, its stationary spread for 700 ms, and each attack
  has a 2,000 ms recovery window. A stationary window separates Cloud Shifts so
  the player can reach and counter the boss before another move.
- The entrance still requires 70 reliability. The final hit checks the prepared
  record independently of current combat hearts, so a surviving player is not
  trapped below the entrance threshold. Publication still requires every
  original record, tool, standards, and reliability check.
- The HUD keeps the equipped-tool action visible during combat. Clock and boss
  chrome hide while choosing retry or the omission shortcut, then restore when
  combat resumes. Wrong tools do no damage and retain knockback feedback.

### Verification

1. Use the ordinary Black Vault entrance with a prepared record, or the existing
   `?scene=BlackVaultLairScene` QA seed. Move north to the core and interact.
2. Take an Ego bolt: one heart is lost, the shot disappears, and immediate
   overlapping hits do not debit again during recovery.
3. Return an Ego bolt to open the core. Attack with the wrong tool, then the Red
   Pencil. Only the owned Red Pencil's active swing damages the exposed core,
   once per swing (the existing Ruby Pen upgrade also works).
4. Pause during a telegraph. Shots, the target countdown, and hearts stay still.
5. Lose all hearts, wait several seconds, then retry. Check current-phase HP,
   prompt dismissal, ordinary attack timing, unchanged documents, and no reward.
   Repeat with B to retreat, then enter again.
6. Defeat Colossus, Swarm, and Cloud without a win shortcut. Complete the five
   binding packets, publish, and confirm the saved certification is `published`.

The production-browser run completed step 6 using normal 180-HP phases, two
Cloud retries, and rejection of the deadline omission offer. Combat recovery
left 96 reliability after the separate deadline penalty; bindery work restored
it to 100. Unit coverage and 375x667/DPR-3 Chromium touch checks cover hit windows,
retry/retreat, choice input, and saved pressure. A separate `bossQuick=1` UI test
verified the deadline choice and a touch Red Pencil hit; it is not the evidence
for normal boss completion. Real iPhone/Safari and the secret Ascendant route
remain unverified in this pass.

## Live Final-Review Counter Loop (2026-09-05)

This supersedes the earlier free-melee behavior of `DanneBoss`, not the separate
room-enemy roster. A real earned-save baseline lost 84 of 180 boss HP to three
Red Pencil swings without any returned bolt. That skipped the Guide lesson.

- Colossus, Swarm, Cloud and Ascendant now protect their cores until a returned
  Ego bolt actually hits. Any owned combat tool can return a bolt during its
  active frames. Protected swings recoil, do no damage, and show a short HUD hint.
- The return still deals 28 damage. It opens a 2,000 ms follow-up window, with
  the existing pale tint and a shrinking 24x2-pixel timer below the boss. A new
  Red Pencil swing deals the original 28 damage (14 to Cloud); the Ruby Pen
  keeps its existing 35-damage upgrade. The returning swing cannot also count
  as the follow-up. Closing, phase changes, retry, defeat and disposal clear
  the indicator. Pause freezes the opening rather than consuming it.
- The earlier 1,400 ms opening was too tight for approach plus weapon recovery
  in the earned playthrough. Two seconds allows deliberate follow-up strikes
  without changing player input, movement, enemy HP, incoming damage or the
  publication clock. A return remains useful even if the player cannot close in.
- `bossCombat.coreOpen` reports the transient exposure; no new save fields or
  schema version. Final reviewed-record requirements, temporary pressure
  recovery, one-time rewards and the binding-room transition are unchanged.

Replay and evidence are documented in [Boss Counter Loop](BOSS_COUNTER_LOOP.md).
