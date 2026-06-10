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

- NES-style title screen with a ruby buckram FRUS volume.
- Character crafting with actual FRUS production roles:
  - Proofreader
  - Compiler
  - Editor
  - Declass Reviewer
  - Source Note Specialist
- Office hub with Elena, Marcus, Priya, the Golden Rule poster, and OpenNet/ClassNet terminals.
- Archive provenance puzzle.
- OpenNet/ClassNet routing puzzle.
- Referral, agency-equity, manifest, and visible-excision puzzle.
- Silent-read proofing puzzle where StateChat catches mechanical issues and the player catches the factual date error.
- Room-specific pixel dressing: desks, shelves, document stacks, cable runs, vault blocks, proofing table, and ruby FRUS volumes.
- Player shadow, facing flip, and walk-bob movement polish.
- Reliability Meter and `window.render_game_to_text()` for automated testing.
- Process stamps that show the FRUS production path: Rule, Source, Network, Referral, Read.
- Role-specific ability hints that reinforce what each production role contributes.
- Generated 8-bit chiptune music, decision chimes, warning tones, process-stamp jingles, and an ending fanfare.
- Final completion card summarizing the production skills practiced.

## Development Shortcuts

Direct scene starts are supported for QA:

```text
/?scene=NetworkScene&role=declass_reviewer&name=Alex
/?scene=ReferralVaultScene&role=declass_reviewer&name=Alex
/?scene=SilentReadScene&role=proofreader&name=Sam
```

These seed earlier process stamps and inventory so later mechanics can be tested without replaying the full quest.

## Asset Policy

Sprites, tiles, and UI textures are original repository-local SVG pixel assets in `public/assets`, with Phaser-generated fallbacks in `BootScene` if an asset is missing. Audio is generated in code with Web Audio oscillators. Later original PNG or audio replacements can be checked in without changing the deployment model.
