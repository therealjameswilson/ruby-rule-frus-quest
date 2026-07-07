# DANN-E Enemy Design

Design reference for the eight canonical **DANN-E** variants (Document Annihilating
Neural Network Executable), the rogue-AI antagonist of *Ruby Rule: The FRUS Quest*.
This doc is written for Codex implementation: each variant lists concrete stats and
clear movement / attack / weakness / loot fields so the forms can be wired into the
combat, cutscene, and codex systems.

The eight variants and their art are canonical and already shipped in the variants
art pack. Do **not** invent new variant names. Art lives in
`public/assets/art-pack/bosses/danne-variants/` and is registered in
`src/game/danneAtlas.ts` as `DANNE_VARIANT_ASSETS`. Combat animation frames for any
DANN-E form use the shared sprite sheet
`public/assets/art-pack/sprites/sprite_dann_e.png` — the variant cards themselves are
single illustrated stills, not sprite sheets.

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

| Variant | Loaded texture key | Room enemy AI | Counter-tool | Room-clear loot |
| --- | --- | --- | --- | --- |
| DANN-E Prime | `danne-prime-humanoid` | Chase | Review Folder | 4 document points |
| DANN-E Mark I | `danne-mark-i-prototype` | Turret | Review Folder | 4 document points |
| DANN-E Colossus | `danne-colossus-final-form` | Turret | Red Pencil | 8 document points, SOP stamp, Black Vault Review Fragment |
| DANN-E Cloud Form | `danne-cloud-form` | Patrol | Citation Stamp | 6 document points |
| DANN-E Executive | `danne-executive-suit` | Chase | Review Folder | 5 document points |
| DANN-E Swarm | `danne-swarm` | Patrol | Citation Stamp | 4 document points |
| DANN-E Defeated | `danne-defeated` | Turret | Red Pencil | 2 document points |
| DANN-E Ascendant | `danne-ascendant` | Chase | Red Pencil | 10 document points, Ascendant Record Fragment |

### Room placement

- Black Vault: Colossus, Cloud Form, Ascendant, and the Defeated false-surrender decoy.
  Clearing all four opens the west and north blast doors.
- NARA Stacks: Mark I and Swarm patrol the stacks as a mid-game room-clear challenge.
- Embassy Compound: Prime applies disguised shortcut pressure.
- Capitol Hill: Executive applies false-certainty pressure near hearing spaces.

### Room-clear loop

1. Enter a room with DANN-E pressure.
2. Identify each variant and its required FRUS counter-tool.
3. Strike with the wrong tool: the enemy is knocked back but loses no HP.
4. Strike with the correct tool: HP drops, the HP bar appears, and the enemy flashes.
5. Defeat every DANN-E enemy in the room.
6. The room-clear flag opens the vault/exit and awards any configured process stamp or FRUS
   volume fragment.

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
4. **Do not slice the variant cards as sprite sheets.** For DANN-E combat animation continue
   using `sprite_dann_e.png`.
5. **Tool → weakness wiring:** enforce the weakness listed per variant so each form teaches
   the matching FRUS tool (Citation Stamp / Red Pencil / Review Folder). Cutscene forms
   (Prime, Defeated) and the stealth form (Executive) gate on the tool check rather than an
   HP bar.

## Politically neutral
DANN-E is a fictional rogue-AI antagonist. American-flag and State Department motifs in some
variants reflect the game's U.S. diplomatic-history setting and carry no partisan framing;
the Senator and Executive forms are deliberately ambiguous.
