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

Current `main` is the harmonized Phaser/Vite GitHub Pages game produced by PR #78 plus the physical Archive, Two Networks, ClassNet, and Referral Vault follow-ups. Every stacked Codex gameplay head and later Perplexity art drop is represented; superseded component PRs are closed by design, not missing. The obsolete five-form DANN-E draft in PR #41 is the sole intentional exclusion because the canonical eight-form roster replaced it. Historical source branches and the deployment branch remain on the remote for provenance and are not pending integrations.

The branch-by-branch evidence and the two restored data payloads are recorded in [`docs/AGENT_PULL_HARMONIZATION.md`](docs/AGENT_PULL_HARMONIZATION.md).

| Pillar | Deploy Status |
| --- | --- |
| 1. Tight movement | Live on `main`: player movement is pixel-snapped, exposes movement/facing state to QA, and remains keyboard/touch compatible. |
| 2. Tile-based overworld | Partially live: region/world scenes and gameplay-map scenes boot through direct links; older large overworld experiments remain quarantined under `experiments/overworld-wip/`. |
| 3. Collision | Live on `main`: player/action collision, gates, interactables, and room blockers use Arcade-style AABB patterns; fuller per-tile terrain collision remains a promotion target. |
| 4. Combat and workflow tools | Live on `main`: equipped Citation Stamp, Red Pencil, and Review Folder swings have active frames/cooldowns; tool-specific DANN-E counters, room-clear gates, ego attacks, hit-stop, loot, and Buckram Gate pressure are integrated. |
| 5. Enemy AI | Live on `main`: the canonical eight DANN-E forms, roaming lurkers, patrol/chase/turret strategies, boss phases, taunts, hazards, difficulty tiers, and automated combat coverage are integrated. |
| 6. HUD and volume assembly | Live on `main`: role, reliability, document points, equipped tools, cooldown, stamps, fragments, DANN-E risk, and the persistent five-piece volume-assembly arc share the compact quest band and pause subscreen. |
| 7. Visual pipeline | Live on `main`: fixed 256x240 pixel canvas, integer nearest-neighbor scaling, native 16-bit character/DANN-E sheets, repository-local Codex and Perplexity art packs, guarded fallbacks, and Web Audio tones. |
| 8. Room and dungeon scaffolding | Live on `main`: FRUS dungeon/room scenes, DANN-E map scenes, gates, rewards, final certification, true/bad ending scenes, and debug galleries all boot through `?scene=` QA links. |
| Mobile parity | Live on `main`: floating D-pad, A/B/Start controls, multi-touch combat, touch cooldown feedback, safe-area metrics, and integer DPR scaling are verified on iPhone-sized Chromium. |
| Accessibility | Live on `main`: keyboard/touch/gamepad controls, concise/full `window.render_game_to_text()` payloads, debug scenes, QA deep links, and persisted high-contrast/colorblind patterns are integrated. |
| New Game+ | Live on `main`: first completion unlocks the veteran cosmetic, harder DANN-E tier, second-volume region, and persistent completed-volume count. |

Current integration verification passes 502 Vitest cases and covers the complete desktop and touch-driven route through both Network rooms, the physical Referral Vault, and into Silent Read Tower. The large deploy footprint remains static art-pack PNG/audio payload, not JavaScript growth.

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
- Archive provenance puzzle: carry Source Note 47, trace repository/collection/folder stations, stamp the verified citation, and physically file three expanded-annotation notes.
- Two-room OpenNet/ClassNet dungeon where the player routes four packets representing seven source items, then physically files three ClassNet dockets representing nine human-review checks at the Human Desk, E.O. Board, and Decision Ledger before claiming the Clearance Token.
- Two-room Referral Vault dungeon where the player routes three files to distinct agency desks, carries StateChat's draft manifest to a human concurrence desk, files permission/appeal/visible-excision dockets, opens the Concurrence Chamber, and physically collects the Concurrence Slip.
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

1. Convert the remaining Editor's Labyrinth and Silent Read review checks into physical room puzzles with short decision moments.
2. Promote the quarantined tile registry and screen manager in small, fallback-guarded steps.
3. Replace remaining poster-like room surfaces with validated Phaser tilemap layers and per-tile collision.
4. Give every main dungeon a compact entrance, key/tool reveal, shortcut, and boss/review payoff.
5. Continue tuning DANN-E encounters around readable telegraphs, movement choices, and distinctive tool counters.
6. Simplify oversized scene implementations as physical interactions move into reusable systems.
7. Expand save/load coverage to exact in-room puzzle and enemy-wave state.
8. Keep testing complete desktop and iPhone playthroughs rather than only direct-scene bootability.
