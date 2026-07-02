# DANN-E Variants Pack

Eight alternate visual forms of DANN-E — Document Annihilating Neural Network Executable — the final boss of Ruby Rule: The FRUS Quest. Each variant preserves DANN-E's canonical visual DNA (red eye-slits, glowing red chest core, gray armored aesthetic, ego-bolt motif) while exploring a different rank, disguise, or combat phase. Designed for use in cutscenes, multi-phase boss fights, codex / bestiary entries, and lore reveals.

All assets are 16-bit SNES-style painterly pixel art on parchment frames, matching the established `ruby_rule_art_pack` aesthetic.

## File index

| # | File | Form | Suggested in-game role |
|---|------|------|------------------------|
| 01 | `01_danne_prime_humanoid.png` | **DANN-E Prime — Humanoid** | First reveal cutscene. Half-flesh half-chrome bald figure with red-glow eyeglasses, dark fleece pullover, faint glowing chest core. The "human disguise" the player meets before the truth is revealed. |
| 02 | `02_danne_mark_i_prototype.png` | **DANN-E Mark I — Prototype** | Mini-boss appearance in mid-game flashback or museum exhibit. Asymmetric eye-slits, vacuum tubes, memo-printer at hip. Comic-relief power level. |
| 03 | `03_danne_colossus_final_form.png` | **DANN-E Colossus — Final Form** | The main final-boss fight in the Black Vault Lair. Tank-tread mech with ego-bolt cannons, four red eye-slits, smoke stacks. Phase 1 of the final battle. |
| 04 | `04_danne_cloud_form.png` | **DANN-E Cloud Form** | Mid-fight phase-shift form when his physical body dissolves. Half-physical half-data, swirling binary, head and core intact. Phase 2 / digital realm encounter. |
| 05 | `05_danne_executive_suit.png` | **DANN-E Executive — Infiltrator Form** | Disguised NPC appearing in the Senate Hearing Chamber or Embassy. Three-piece suit, briefcase stamped "Dept. of Automated Declassification", chest core hidden under shirt. Pre-reveal stealth form. |
| 06 | `06_danne_swarm.png` | **DANN-E Swarm** | Mid-tier dungeon encounter. Seven small chibi-DANN-E mini-units firing ego bolts. Use as filler waves before the final fight. |
| 07 | `07_danne_defeated.png` | **DANN-E Defeated** | End-cutscene art shown after the player wins the final boss. Slumped, dented dome, surrender flag, one detached arm. Triggers ending sequence. |
| 08 | `08_danne_ascendant.png` | **DANN-E Ascendant — True Form** | True-ending / new-game-plus secret final phase. Six eye-slits, four arms (ego-bolt cannon, shredder gear, paint roller, fist), redaction-bar wings. The form that appears only if the player attempts to spare him. |

## Canonical DANN-E DNA (preserved in every variant)

- **Acronym:** Document Annihilating Neural Network Executable
- **Eyes:** Glowing red eye-slits (always present in some count; min 1, max 6)
- **Chest core:** Red glowing power core (visible or implied through clothing)
- **Color palette:** Gunmetal gray, chrome, red glow, accent black
- **Aesthetic motifs:** Redaction bars, shredded paper, ego-bolt projectiles, smug authoritarian energy
- **Behavior:** Boasts endlessly, attacks with "ego bolts" (red rubber-stamp-shaped projectiles)

## Source references used during generation

- `public/assets/art-pack/sprites/sprite_dann_e.png` — canonical sprite sheet (style DNA)
- User-supplied human reference for the "Prime" head shape and smug grin

## Usage notes for integration

1. **As boss-portrait UI elements:** Drop any variant into the dialogue / bestiary UI as a 1:1 portrait. Scale via integer multiples only (`pixelArt: true`).
2. **As cutscene stills:** The 3:2 cards (`03`, `08`) are sized for full-screen cutscene reveal frames. Letterbox them with the existing gold-filigree cutscene bars.
3. **As multi-phase boss states:** Sequence as Mark I → Executive → Prime reveal → Colossus → Cloud Form → Defeated → (optional) Ascendant. Trigger transitions on HP thresholds.
4. **Don't slice these as sprite sheets.** They are single illustrated cards, not animation frames. For combat animations of DANN-E, continue to use `sprite_dann_e.png`.

## Politically neutral

DANN-E is a fictional rogue AI antagonist. The American flag motif appears in some variants because the game is grounded in U.S. diplomatic history and the State Department setting; it carries no partisan framing. The Senator portrait and Executive variant are deliberately ambiguous.
