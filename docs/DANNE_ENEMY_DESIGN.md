# DANN-E Enemy Design

Implementation spec for the five roaming **DANN-E** enemy variants in *Ruby Rule: The FRUS Quest*. These are the field-level minions and minibosses of DANN-E — the **D**ocument **A**nnihilating **N**eural **N**etwork **E**xecutable — not the illustrated boss forms used in cutscenes (those live in `public/assets/art-pack/bosses/danne-variants/`).

Each variant translates one real obstruction to FRUS production into an action-adventure enemy. Every variant keeps DANN-E's canonical DNA: gunmetal-gray armor, glowing red eye-slits, a red chest core, and "ego bolt" projectiles (red rubber-stamp-shaped energy shots). See `public/assets/art-pack/bosses/danne-variants/MANIFEST.md` and `public/assets/art-pack/danne-pack/MANIFEST.md` for the canonical lore and visual reference.

This doc is written for Codex implementation. Values are concrete and tuned to the existing enemy scale (compare `src/entities/enemies/Enemy.ts`, `RedactorDrone` `health: 2`, `DanneBoss` `maxHp: 180`). The base `Enemy` class provides waypoint patrol movement, health, a shadow, a name tag, and a threat cue; new variants should extend it.

## Core conventions

- **Canvas:** 256x240 logical pixels; keep at most four active ego-bolt slots on screen (see `src/game/lttpFrusTranslation.ts`).
- **FRUS tools (weaknesses):** the player defeats DANN-E variants with one of three workflow tools —
  - **Citation Stamp** — verifies provenance; press `Space`/`Enter` on a nearby, stamp-tagged foe (see `citation_stamp` in `src/game/workflowTools.ts`).
  - **Red Pencil** — the editorial action hitbox; landing a mark damages the foe (compare the Ruby Pen hit in `DanneBoss.checkPlayerActionHit`).
  - **Review Folder** — routes a foe's contested equity to a human queue, dissolving blockers instead of erasing them.
- **Loot types:** `document points` (score/currency), a `process stamp` (Rule / Source / Network / Referral / Read), or a `FRUS volume fragment` (quest relic). Drops are granted through `src/game/state.ts` (`addDanneItem`, document-point and stamp helpers).
- **Movement vocabulary:** `patrol` (fixed waypoint loop), `chase` (vector toward the player's snapped foot position), `stationary` (holds a lane/gate), `erratic` (jittered wander).

## Sprite sheet references

Runtime sprites are sliced 4 cols x 4 rows for 4-direction movement (`pixelArt: true`, integer scale only), matching `public/assets/art-pack/danne-pack/MANIFEST.md` integration notes.

Present in the repo today (align new variant art to these):

- `public/assets/art-pack/danne-pack/sprites/11_sprite_redactor_drone.png` — redaction-stamp drone (source for the Redactor / Classification Drone look).
- `public/assets/art-pack/danne-pack/sprites/12_sprite_censorship_wraith.png` — shredded-redaction-bar wraith (mid-tier reference).
- `public/assets/art-pack/danne-pack/sprites/runtime/runtime_redactor_drone.png` — sliced runtime sheet in use.
- `public/assets/art-pack/danne-pack/vfx/19_vfx_ego_bolt_strip.png` — 4-frame ego-bolt projectile strip (2 rotations, play at 10 fps).
- `public/assets/art-pack/bosses/danne-variants/*.png` — illustrated boss forms for cutscene/codex only; do not slice as sprite sheets.

Expected paths for the dedicated DANN-E enemy pack (author sprite sheets here; names align exactly to the variants below). If the parallel asset PRs are not yet on this branch, these are the target filenames to create:

- `public/assets/art-pack/enemies/danne/danne-redactor.png`
- `public/assets/art-pack/enemies/danne/danne-queue-blocker.png`
- `public/assets/art-pack/enemies/danne/danne-30-year-wall.png`
- `public/assets/art-pack/enemies/danne/danne-classification-drone.png`
- `public/assets/art-pack/enemies/danne/danne-shutdown-miniboss.png`

Expected shared VFX (author here; ego-bolt strip already exists in `danne-pack/vfx/`):

- `public/assets/art-pack/vfx/danne-ego-bolt.png` — canonical ego-bolt strip (or reuse `danne-pack/vfx/19_vfx_ego_bolt_strip.png`).
- `public/assets/art-pack/vfx/danne-redaction-bar.png` — black-bar stamp projectile.
- `public/assets/art-pack/vfx/danne-queue-stall.png` — "PENDING/WAIT/HOLD" stall pulse.
- `public/assets/art-pack/vfx/danne-shutdown-freeze.png` — stop-work closure freeze burst.

## Variant summary

| # | Variant | FRUS metaphor | HP | Movement | Attack | Weakness | Loot drop |
|---|---------|---------------|----|----------|--------|----------|-----------|
| 1 | **DANN-E Redactor** | Automated redaction erasing text silently | 3 | Patrol | Fires black-bar redaction projectiles that blank a lane | **Red Pencil** | `document points` (small) |
| 2 | **DANN-E Queue Blocker** | Permission request stuck in a review queue | 4 | Stationary (lane gate) | Blocks a doorway; emits `PENDING`/`WAIT` stall pulses that slow the player | **Review Folder** | `process stamp` (Referral) |
| 3 | **DANN-E 30-Year Wall** | The 30-year declassification line as a moving wall | 6 | Chase | Rams the player, knocks back, drains reliability on contact | **Citation Stamp** | `FRUS volume fragment` |
| 4 | **DANN-E Classification Drone** | Overclassification bot re-stamping documents SECRET | 3 | Erratic | Drops ego bolts and re-classifies a stamped tile back to locked | **Citation Stamp** | `document points` (medium) |
| 5 | **DANN-E Shutdown Miniboss** | Federal government shutdown freezing production | 24 | Chase (phased) | Roaming stop-work notice that briefly freezes movement; ego-bolt spread in phase 2 | **Review Folder**, then **Red Pencil** | `FRUS volume fragment` + `process stamp` (Read) |

## Variant details

### 1. DANN-E Redactor

The Redactor is the entry-level DANN-E minion and the clearest statement of the game's thesis: it deletes the record silently. It patrols a fixed waypoint loop (`patrol`, speed ~22, matching `RedactorDrone`) and, when the player comes within ~44px, fires a black-bar redaction projectile that blanks a horizontal lane for a beat. The bars are readable and telegraphed so the player can sidestep. Its weakness is the **Red Pencil**: a landed editorial mark cancels the redaction and destroys the drone in ~3 hits, reinforcing that visible editorial marking beats silent deletion. On death it drops a small pile of `document points`. Implement as a subclass of `Enemy` reusing the `RedactorDrone` black-bar projectile logic; sprite `enemies/danne/danne-redactor.png` (fallback to `danne-pack/sprites/11_sprite_redactor_drone.png`).

### 2. DANN-E Queue Blocker

The Queue Blocker embodies a foreign-government or agency permission request that is stuck "in the queue." It is `stationary`, planted across a doorway or corridor lane like the bureaucratic walls (`src/entities/BureaucraticWall.ts`, labels `PENDING`, `WAIT`, `HOLD`). It does not chase; instead it periodically emits a stall pulse that briefly slows the player who lingers in range, applying production-delay pressure without dealing hard damage. It cannot be brute-forced — the **Review Folder** is required, routing the stalled equity to the correct human queue so the blocker dissolves (4 "HP" modeled as folder-route progress). Clearing it opens the lane and drops a **Referral** `process stamp`, marking that the equity was handled through channels rather than skipped. Sprite `enemies/danne/danne-queue-blocker.png`.

### 3. DANN-E 30-Year Wall

The 30-Year Wall turns the statutory 30-year declassification line into a physical, advancing hazard (compare the patrolling archive stonewalls and `DanneLurker`'s `30YR` cue). It actively `chase`s the player at moderate speed, rams on contact, knocks the player back, and debits reliability through a Kellogg-standard violation (`applyStandardsViolation`). It is heavier than the minions (6 HP) and shrugs off the Red Pencil. Its weakness is the **Citation Stamp**: verifying provenance nearby with `Space`/`Enter` proves the record is eligible for release and forces the wall to recede. Defeating it yields a `FRUS volume fragment`, the quest-relic reward for clearing a major declassification gate. Sprite `enemies/danne/danne-30-year-wall.png` (fallback `snes-wall-danne-queue`).

### 4. DANN-E Classification Drone

The Classification Drone is the overclassification counterpart to the Redactor: rather than erasing text, it re-stamps cleared documents back to SECRET/TOP SECRET, undoing the player's progress. It moves `erratic`ally (jittered wander around a home point, ~3px amplitude) so it is harder to line up than a patroller. It lobs ego bolts (reuse `DANNE_VFX_ASSETS`/`danne-ego-bolt.png`) and, on a cooldown, re-locks the nearest previously-stamped tile. The **Citation Stamp** is its weakness — re-verifying provenance both defeats the drone (3 HP) and permanently re-clears the tile it locked, so the player is rewarded for reasserting the source trail. Drops a medium `document points` reward. Sprite `enemies/danne/danne-classification-drone.png` (visual sibling of `danne-pack/sprites/11_sprite_redactor_drone.png`).

### 5. DANN-E Shutdown Miniboss

The Shutdown Miniboss scales the Office-hub federal-shutdown hazard (`src/entities/enemies/FederalShutdown.ts`) into a two-phase encounter that gates a room. It is a roaming stop-work closure notice that `chase`s the player; on contact it briefly **freezes** player movement (~600ms) and raises production-delay pressure rather than dealing raw damage. **Phase 1** (24 HP total, first ~half): it is invulnerable to direct hits and must be dispersed with the **Review Folder**, which reopens funding/permission and strips its freeze aura. **Phase 2**: exposed, it fires a three-way ego-bolt spread and is finished with the **Red Pencil**. Defeating it drops a `FRUS volume fragment` plus a **Read** `process stamp`, marking the room's silent-read review as complete. Show the boss healthbar frame (`danne-pack/ui/18_ui_boss_healthbar.png`) during the fight. Sprite `enemies/danne/danne-shutdown-miniboss.png`.

## Implementation checklist for Codex

1. Add each variant as a subclass of `src/entities/enemies/Enemy.ts`, wiring `spriteKey` to the `enemies/danne/` sheet with a Phaser-generated or existing-asset fallback (see `BootScene`).
2. Load sheets sliced 4x4 for 4-direction walk; register anims via the `danne_anims` helper pattern.
3. Gate weaknesses on the equipped workflow tool: Red Pencil = action hitbox, Citation Stamp / Review Folder = proximity `Space`/`Enter` verification (`src/systems/verification.ts`).
4. Grant drops through `src/game/state.ts` (`document points`, process stamps, `addDanneItem` for fragments); unlock the matching codex entry (`unlockCodexEntry`) on first encounter.
5. Keep active ego bolts within the four-slot budget and report threat positions in `window.render_game_to_text()` for QA.
6. Update `progress.md` after wiring the enemies in code (per `AGENTS.md`).
