# Ruby Rule: The FRUS Quest

Browser-based NES-style FRUS production game prototype built with Phaser 3, TypeScript, and Vite.

StateChat proposes. Humans decide. Published FRUS is the record.

The current cleanup branch keeps the runnable game focused on the existing scene/dungeon flow while preserving larger overworld and art-pack experiments under `experiments/overworld-wip/` for later promotion.

## Scope

This project is a static web game intended for GitHub Pages. The active mainline is a compact top-down FRUS production quest with title, character creation, guide/tutorial, archive, network, referral, proofing, and publication-gate scenes.

The cleanup target is SNES action-adventure craft, translated into FRUS workflow language:

- tight pixel-snapped movement and collision
- readable one-screen rooms and workflow gates
- FRUS tools instead of fantasy weapons
- confidence, process stamps, document points, and equipped workflow items in the HUD
- original local assets and Web Audio oscillator sound
- human-centered verification rules, with StateChat limited to terminal/panel output

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL and play with keyboard controls.

## Build

```bash
npm run build
```

The static build is emitted to `dist/` and is ready for GitHub Pages.

## Engine Rationale

The repo is intentionally staying on Phaser 3 rather than moving engines during this cleanup pass. Phaser 3 is a good fit for an LttP-caliber browser game because it already supports:

- Arcade Physics for AABB collision and knockback
- Tilemap layers and collision for future overworld/dungeon promotion
- crisp WebGL or Canvas pixel rendering with `pixelArt` and `roundPixels`
- deterministic keyboard input and scene transitions
- static deployment through Vite and GitHub Pages

The target is classic 16-bit action-adventure feel, not a Nintendo clone. All art, code, text, and audio must stay original or repository-local.

## Controls

- Arrow keys or WASD: move
- Space or Enter: interact / advance dialog / confirm
- Left or Right on the character screen: choose role
- E: use your role ability
- M: manuscript inventory
- N: toggle sound
- R: reliability details
- Esc: pause
- F: fullscreen

## Current Cleanup Status

The `cleanup/lttp-bar` branch has landed these cleanup phases:

| Pillar | Current Status |
| --- | --- |
| 1. Tight movement | Player controller refactored toward 8-direction input, pixel-snapped positions, and exposed movement state. |
| 2. Tile-based overworld | Incomplete overworld, screen-manager, tile registry, interiors, and art-pack work is quarantined under `experiments/overworld-wip/`. It is preserved but not live. |
| 3. Collision | Player/action collision and process-gate blockers use Arcade-style AABB patterns; terrain/tile collision remains a next promotion target. |
| 4. Sword + secondary item system | FRUS action hitbox and equipped secondary workflow item HUD are in place. |
| 5. Enemy AI | Coherent patrol-style hazards and blocker enemies are retained; half-wired variants are quarantined. |
| 6. HUD | Top HUD shows role, reliability/confidence, document points, equipped process item, stamps, fragments, and status details. |
| 7. Cohesive presentation | 256x240 pixel canvas, original repository-local SVG assets, Phaser fallbacks, and Web Audio tones remain the active discipline. |
| 8. Room and dungeon scaffolding | Existing FRUS dungeon/room scenes, gates, rewards, and final certification room remain runnable; save/load remains future work. |

## MVP Features

- NES-style title screen with a ruby buckram FRUS volume, top HUD band, regional map viewport, and stone dungeon framing.
- Character crafting with actual FRUS production roles:
  - Proofreader
  - Compiler
  - Editor
  - Declass Reviewer
  - Source Note Specialist
- Equal-rank Archive Colleague room inspired by NES cave/dialogue composition, translated into a FRUS archive chamber with original art.
- Verification gate tutorial: citation stamp first, then a FRUS volume fragment, then the Office hub opens.
- Office hub with Elena, Marcus, Priya, the Golden Rule poster, and OpenNet/ClassNet terminals.
- Office hub production floor populated with original equal-rank Compiler, Declass Coordinator, Reviewer, Editor, and Review Specialist sprites inspired by supplied character-role cues.
- Archive provenance puzzle.
- Two-room OpenNet/ClassNet routing dungeon where clean routing opens the ClassNet Vault and a physical Clearance Token reward.
- Two-room Referral Vault dungeon where equity matching and visible excision open the Concurrence Chamber, then the player physically collects the Concurrence Slip.
- Two-room Editor's Labyrinth / Silent Read Tower sequence where the AI annotation review tool checks mechanical/schema issues, the Red Pencil opens the tower, evidence-bound findings route to human workstations, and the player earns the Proof Lens and Buckram Key.
- Room-specific pixel dressing: desks, shelves, document stacks, wall maps, cable runs, vault blocks, proofing table, and ruby FRUS volumes.
- Original large regional main game map with numbered FRUS Quest locations including Navy Hill, NARA I/II, Foggy Bottom, Capitol Hill, the White House, Newington, Little Rock, Springfield, the Potomac, and a locked undisclosed location, shown through fixed 1x viewports instead of being compressed into one tiny panel.
- One-screen room composition with a minimap/status HUD, 16x16 tile-feeling floors, stone borders, and clear blocked/walkable space.
- Bureaucratic wall enemies: literal stone walls labeled with process blockers like `NO REPO`, `PENDING`, `FIREWALL`, `WAIT`, and `HOLD`, now backed by distinct original 32x32 SNES-style blocker sprites.
- Roaming HAC member antagonist in the Office hub who wanders through the room and causes brief focus-distraction reliability hits if the player gets too close.
- Federal government shutdown antagonist in the Office hub: a roaming stop-work closure notice that briefly freezes movement and raises production-delay pressure when it catches the player.
- Bee swarm antagonist in the Office hub: a buzzing avoidance hazard that disrupts concentration if the player gets too close while producing FRUS.
- Navy Hill mice antagonist in the Office hub: a small source-note-scattering patrol around the Navy Hill landmark that players must skirt while keeping the workflow moving.
- Archive stonewalls now patrol toward the player, reduce reliability on contact, knock the player back, and can be cleared by verifying them with `Space`/`Enter` nearby.
- Zelda-like symbols translated into FRUS production terms:
  - keys become citation stamps, clearance tokens, and concurrence slips
  - treasure becomes document points and source-note pickups
  - confidence status replaces hearts/life language
  - quest relics become FRUS volume fragments
  - tools become a citation stamp, red pencil mark, and review folder logic
  - antagonists include the 30-year line and DANN-E queue
- Final Buckram Gate: the player earns five cover pieces and the Buckram Key, enters a physical final room, certifies the volume at a human publication table, and only then publishes the assembled FRUS cover.
- Player shadow, facing flip, and walk-bob movement polish.
- Larger 32x32 SNES-style player and human specialist sprites with readable FRUS production props.
- Playable Compiler and Editor in-play sprite strips with four-direction walk frames, idle frames, and role-ability document review poses.
- Multi-pose equal-rank production colleague sprite sheet with front, back, side, walk, workstation, and approval poses for Compiler, Editor, Declass Coordinator, Reviewer, and Review Specialist roles.
- Reliability Meter and `window.render_game_to_text()` for automated testing.
- `render_game_to_text()` includes active stonewall threat positions for accessible play and QA.
- `render_game_to_text()` also reports document points and earned FRUS volume fragments.
- Process stamps that show the FRUS production path: Rule, Source, Network, Referral, Read.
- SOP stamp for the AI annotation review tool: mechanical fixes may auto-apply, but provenance, classification, publication-status, and meaning decisions stay human.
- Role-specific ability hints that reinforce what each production role contributes.
- Public-domain MIDI-derived 8-bit music motifs, decision chimes, warning tones, process-stamp jingles, and an ending fanfare.
- Final completion card summarizing the production skills practiced and the assembled FRUS cover prize.

## Development Shortcuts

Direct scene starts are supported for QA:

```text
/?scene=NetworkScene&role=declass_reviewer&name=Alex
/?scene=GuideScene&role=compiler&name=Ruby
/?scene=ReferralVaultScene&role=declass_reviewer&name=Alex
/?scene=SilentReadScene&role=proofreader&name=Sam
```

These seed earlier process stamps and inventory so later mechanics can be tested without replaying the full quest.

## Experiments

Promising but incomplete work is preserved under `experiments/`:

- `experiments/duplicate-assets/`: Finder-style duplicate SVG assets retained from repo hygiene.
- `experiments/overworld-wip/`: dirty overworld, art-pack, interior-map, screen-manager, and tilemap work quarantined during Phase 8.

Do not move the whole WIP folder back into the live game at once. Promote one subsystem at a time, behind fallbacks, with `npm run build` and direct `?scene=` QA.

## Audio Sources

Raw public-domain MIDI source clips are checked in under `public/assets/audio/midi/`, with rights notes in `public/assets/audio/ATTRIBUTION.md`. The browser plays short Web Audio square-wave arrangements derived from those clips for reliable GitHub Pages deployment.

## Asset Policy

Sprites, tiles, enemy art, and UI textures are original repository-local SVG pixel assets in `public/assets`, with Phaser-generated fallbacks in `BootScene` if an asset is missing. Audio playback is generated in code with Web Audio oscillators. Later original PNG or cleared audio replacements can be checked in without changing the deployment model.

## Roadmap

1. Pillars 1 and 3: tighten the player body, foot collision box, knockback, and i-frame timing against all room blockers.
2. Pillar 2: promote the quarantined tile registry and screen-manager work in small, buildable steps.
3. Pillar 2: replace poster-like room composition with validated Phaser tilemap layers only after fallbacks and `?scene=` links survive.
4. Pillar 4: turn workflow tools into a true equipped-use state machine with clear active frames and cooldowns.
5. Pillar 5: standardize enemy base behavior for patrol, chase, and projectile-like FRUS hazards.
6. Pillar 6: add a minimal minimap/status panel that stays readable at native resolution.
7. Pillar 7: enforce one active palette/scale path for all live sprites and tiles before promoting art-pack PNGs.
8. Pillar 8: add local save/load for room state, collected rewards, process stamps, and publication progress.
