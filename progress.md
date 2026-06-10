Original prompt: Build a Web-Based NES-Style FRUS Production Game, working title Ruby Rule: The FRUS Quest.

## Progress

- Scaffolded a Vite + TypeScript + Phaser 3 app in `ruby-rule-frus-quest`.
- Added a role-crafting flow so players can choose a FRUS production role before entering the office.
- Added generated placeholder pixel textures for characters, tiles, UI panels, documents, and the FRUS volume.
- Implemented title, character creation, office hub, archive verification, network routing, referral vault, silent read, and ending scenes.
- Adjusted the character creator so typed names can use all letters while role selection stays on Left/Right.
- Ran `npm install` successfully; npm reported two moderate audit findings in dependencies.
- Ran `npm run build` successfully; Vite reported a large Phaser chunk warning only.
- Switched Phaser to the Canvas renderer after Playwright showed black WebGL canvas captures.
- Fixed title-screen start handling so early key presses are not consumed.
- Verified with Playwright screenshots/state:
  - title to character creator
  - default role confirmation into OfficeScene
  - custom role/name confirmation into OfficeScene
  - office interaction chain into ArchiveScene
  - archive document collection and Source Note 47 verification, raising reliability from 80 to 90
- Added process stamps for Rule, Source, Network, Referral, and Read milestones.
- Added role-specific `E` abilities with visible NES-style hint banners.
- Added direct scene-start query parameters for QA, with seeded prior progress.
- Improved choice prompts with full-row click targets.
- Verified direct scene starts with Playwright screenshots/state:
  - NetworkScene routing clears and awards the Network stamp.
  - ReferralVaultScene equity matching, human manifest confirmation, and visible excision award the Referral stamp.
  - SilentReadScene factual-date catch awards the Proof/Read stamp.
  - Declass Reviewer `E` ability displays an Equity Map hint and updates `render_game_to_text`.
- Added generated Web Audio chiptune music and feedback:
  - scene background patterns
  - dialog blips
  - decision confirm chimes
  - warning tones
  - process-stamp jingles
  - ending fanfare
- Reworked EndingScene into a completion card showing role, reliability, process stamps, team sign-off, and the core FRUS production lessons practiced.
- Verified the EndingScene recap with Playwright screenshot/state; `audioStatus` reported `ending fanfare`.
- Re-verified NetworkScene routing after audio integration; `audioStatus` reported `process stamp chime`.
- Added original repository-local SVG pixel assets for player roles, NPCs, manuscript, FRUS volume, room tiles, and UI panels.
- Updated BootScene to load SVG assets first and fall back to generated textures if an asset is missing.
- Added `N` sound toggle during title/gameplay/ending screens, plus an `SND ON/OFF` HUD label.
- Verified OfficeScene renders the SVG assets in Playwright; state reported `audioStatus: music OfficeScene`.
- Verified `N` toggle in NetworkScene; HUD showed `SND OFF` and state reported `audioStatus: audio muted`.
- Added reusable room-dressing helpers for desks, bookcases, document stacks, ruby FRUS volume stacks, archive shelves, network cables, vault blocks, proofing tables, and small sparkle effects.
- Added player shadow, facing flip, and simple walk-bob movement polish.
- Dressed the Office, Archive, Network, Referral Vault, and Silent Read scenes with workflow-specific visual cues.
- Verified dressed OfficeScene, NetworkScene, and SilentReadScene with Playwright screenshots/state.
- Added a stronger ruby-red FRUS buckram/NES adventure aesthetic:
  - top HUD band with minimap, item boxes, and life markers
  - one-screen dungeon wall framing around playable rooms
  - richer 16x16 tile SVGs for office, archive, network, and vault rooms
  - parchment wall maps as room dressing
  - title-screen HUD/map/stone-frame treatment
- Added original `bureaucratic-wall` enemy sprite plus Phaser fallback texture.
- Added literal stone bureaucracy enemies in Archive, Network, and Referral Vault rooms; archive walls can be cracked and cleared by interaction.
- Downloaded public-domain MIDI source clips into `public/assets/audio/midi/` and added `public/assets/audio/ATTRIBUTION.md`.
- Reworked scene music to use short Web Audio motifs derived from the public-domain Bach/Satie MIDI clips.
- Added active stonewall pressure mechanics:
  - archive bureaucratic walls patrol toward the player when nearby
  - contact knocks the player back and reduces reliability
  - nearby `Space`/`Enter` verification cracks and clears a wall
  - `render_game_to_text()` now reports `visibleThreats` with stonewall labels and coordinates

## TODO

- Improve full end-to-end traversal coverage from TitleScene to EndingScene; direct scene QA now covers the later scenes reliably.
- Consider a later non-combat `B` item such as a source-note stamp or routing card for clearing stonewalls at range.
