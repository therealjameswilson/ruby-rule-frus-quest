# Ruby Rule: The FRUS Quest

First playable prototype of a browser-based NES-style FRUS production game.

StateChat proposes. Humans decide. Published FRUS is the record.

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

## MVP Features

- NES-style title screen with a ruby buckram FRUS volume, top HUD band, tiny map, and stone dungeon framing.
- Character crafting with actual FRUS production roles:
  - Proofreader
  - Compiler
  - Editor
  - Declass Reviewer
  - Source Note Specialist
- Equal-rank Archive Colleague room inspired by NES cave/dialogue composition, translated into a FRUS archive chamber with original art.
- Verification gate tutorial: citation stamp first, then a FRUS volume fragment, then the Office hub opens.
- Office hub with Elena, Marcus, Priya, the Golden Rule poster, and OpenNet/ClassNet terminals.
- Archive provenance puzzle.
- OpenNet/ClassNet routing puzzle.
- Referral, agency-equity, manifest, and visible-excision puzzle.
- Silent-read proofing puzzle where StateChat catches mechanical issues and the player catches the factual date error.
- Room-specific pixel dressing: desks, shelves, document stacks, wall maps, cable runs, vault blocks, proofing table, and ruby FRUS volumes.
- One-screen room composition with a minimap/status HUD, 16x16 tile-feeling floors, stone borders, and clear blocked/walkable space.
- Bureaucratic wall enemies: literal stone walls labeled with process blockers like `NO REPO`, `PENDING`, `FIREWALL`, `WAIT`, and `HOLD`.
- Archive stonewalls now patrol toward the player, reduce reliability on contact, knock the player back, and can be cleared by verifying them with `Space`/`Enter` nearby.
- Zelda-like symbols translated into FRUS production terms:
  - keys become citation stamps, clearance tokens, and concurrence slips
  - treasure becomes document points and source-note pickups
  - confidence status replaces hearts/life language
  - quest relics become FRUS volume fragments
  - tools become a citation stamp, red pencil mark, and review folder logic
  - antagonists include the 30-year line and DANN-E queue
- Player shadow, facing flip, and walk-bob movement polish.
- Reliability Meter and `window.render_game_to_text()` for automated testing.
- `render_game_to_text()` includes active stonewall threat positions for accessible play and QA.
- `render_game_to_text()` also reports document points and earned FRUS volume fragments.
- Process stamps that show the FRUS production path: Rule, Source, Network, Referral, Read.
- Role-specific ability hints that reinforce what each production role contributes.
- Public-domain MIDI-derived 8-bit music motifs, decision chimes, warning tones, process-stamp jingles, and an ending fanfare.
- Final completion card summarizing the production skills practiced.

## Development Shortcuts

Direct scene starts are supported for QA:

```text
/?scene=NetworkScene&role=declass_reviewer&name=Alex
/?scene=GuideScene&role=compiler&name=Ruby
/?scene=ReferralVaultScene&role=declass_reviewer&name=Alex
/?scene=SilentReadScene&role=proofreader&name=Sam
```

These seed earlier process stamps and inventory so later mechanics can be tested without replaying the full quest.

## Audio Sources

Raw public-domain MIDI source clips are checked in under `public/assets/audio/midi/`, with rights notes in `public/assets/audio/ATTRIBUTION.md`. The browser plays short Web Audio square-wave arrangements derived from those clips for reliable GitHub Pages deployment.

## Asset Policy

Sprites, tiles, enemy art, and UI textures are original repository-local SVG pixel assets in `public/assets`, with Phaser-generated fallbacks in `BootScene` if an asset is missing. Audio playback is generated in code with Web Audio oscillators. Later original PNG or cleared audio replacements can be checked in without changing the deployment model.
