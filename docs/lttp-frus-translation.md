# ALTTP Mechanics Translation for FRUS Quest

Source studied: https://github.com/JaredBrian/AsarUSALTTPDisassembly

This project uses the disassembly as a mechanics reference only. It does not copy Nintendo code, art, music, maps, names, text, enemies, or exact puzzle layouts. The goal is to translate action-adventure grammar into a game about compiling and publishing a reliable FRUS volume.

## Studied Patterns

| Disassembly pattern | Source file | FRUS Quest translation |
| --- | --- | --- |
| Room data pointer table | `Bank1F.asm` | Screen-sized FRUS rooms with data-driven exits, locks, and workflow objects. |
| Fixed ancilla allocation | `Bank08.asm` | Temporary process effects use bounded slots so hazards remain readable. |
| Ancilla main loop | `Bank08.asm` | Projectiles, stamp bursts, and deadline pressure update separately from human workflow authority. |
| Sprite damage loop | `Bank08.asm` | Hits and unsafe shortcuts debit reliability hearts through Kellogg-standard violations. |
| Direction-to-player helpers | `Bank1D.asm` | DANN-E aims Ego bolts and deadline pressure toward the player's snapped foot position. |
| Milestone item effect | `Bank08.asm` | Pendants, crystals, process stamps, and the Buckram Key make FRUS progress tangible. |

## Current Implementation Rule

The immediate code-level translation is the process-effect slot model. The game reserves a small fixed pool for temporary effects, and DANN-E may use at most four active Ego-bolt slots at once. That keeps the screen legible on the 256x240 canvas while still making DANN-E feel present throughout the quest.

Expose the current mapping through:

- `src/game/lttpFrusTranslation.ts`
- `window.render_game_to_text()` with `?text=full`

## Design Target

Every adventure-game mechanic should map to a real FRUS production action:

- Hearts: scholarly reliability and compliance with the Kellogg standards.
- Keys: per-document sub-tasks and chapter gates.
- Big key: the current chapter's major process tool.
- Boss: the hardest review hurdle in the chapter.
- Dungeon map/compass: a revealed workflow map showing contested equities.
- Final gate: a published FRUS volume with no unresolved standards violations.
