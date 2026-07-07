# New Game+ Veteran Editor Cosmetic Pack

Cosmetic palette-swap sprite sheets for the five production player-character roles,
intended as a **New Game+ unlock reward**. Each veteran variant is a strict
color-lookup recolor of its production sheet: no pixel moves, no new frames, no
smoothing. The distinguished **ruby-buckram + gold/silver-trim** treatment marks a
player who has completed the game, while skin, hair, held documents, and outlines
are preserved so each role stays instantly recognizable.

All artwork is original, derived only from the repository's existing player sprite
sheets. No borrowed or copyrighted assets.

## Visual identity

- **Base:** deep ruby-buckram garments (the FRUS volume book-cloth) —
  shadow `#4A0A12`, dark `#7A0F1E`, mid `#A81828`, light `#C8283A`.
- **Gold trim (sparingly):** dark `#9C6E1A`, mid `#E0B040`, light `#F4D468` —
  applied to waistcoats, buttons, pens, and accents.
- **Silver trim (sparingly):** dark `#7C7C8A`, mid `#B4B4C2`, light `#E4E4EE` —
  applied to collars, lapels, and cuffs.
- **Preserved from source:** skin tones, hair, outline black, and the documents /
  briefcases each role carries.

## Frame layout (identical to the production sheets)

Native sheets are **128×192**, a **4×4 grid of 32×48 frames** (final cell unused),
matching `src/art/characters.ts` (`this.load.spritesheet`) and `src/art/character_anims.ts`:

- Row 1 (frames 0–3): idle down, idle up, idle left, idle right
- Row 2 (frames 4–7): walk down 1, walk down 2, walk up 1, walk up 2
- Row 3 (frames 8–11): walk left 1, walk left 2, walk right 1, walk right 2
- Row 4 (frames 12–14): interact/use-tool, reading document, approval/victory (frame 15 unused)

`native/` holds the runtime-native 128×192 sheets (the loadable sprite sheets).
The root `*.png` files are the 1024×1536 display masters — exact 8× nearest-neighbor
upscales of the native sheets (no anti-aliasing), matching the base art-pack's
"masters + `native/` derivatives" convention.

## File index

### Runtime-native sheets (`native/`, 128×192, 4×4 grid of 32×48)

| Filename | Source sheet | Production role | Palette notes | Transparency |
|---|---|---|---|---|
| `native/sprite_proofreader_veteran.png` | `sprites/native/sprite_reviewer.png` | Proofreader (`roleId` fallback → `reviewer`) | Navy suit → ruby buckram; gold waistcoat trim; silver collar | Yes |
| `native/sprite_compiler_veteran.png` | `sprites/native/sprite_compiler.png` | Compiler | Green waistcoat + trousers → ruby buckram; gold accents; brown jacket/hair preserved | Yes |
| `native/sprite_editor_veteran.png` | `sprites/native/sprite_editor.png` | Editor | Jacket + waistcoat → full ruby buckram; gold pen; silver collar | Yes |
| `native/sprite_declass_reviewer_veteran.png` | `sprites/native/sprite_declassification_coordinator.png` | Declass Reviewer | Green lapels → ruby buckram; gold accents; silver trim; cream coat preserved | Yes |
| `native/sprite_source_note_specialist_veteran.png` | `sprites/native/sprite_records_officer.png` | Source Note Specialist | Dark suit → ruby buckram; silver lapel; gold accents; cream shirt preserved | Yes |

### Display masters (root, 1024×1536, 8× nearest of native)

| Filename | Native derivative |
|---|---|
| `sprite_proofreader_veteran.png` | `native/sprite_proofreader_veteran.png` |
| `sprite_compiler_veteran.png` | `native/sprite_compiler_veteran.png` |
| `sprite_editor_veteran.png` | `native/sprite_editor_veteran.png` |
| `sprite_declass_reviewer_veteran.png` | `native/sprite_declass_reviewer_veteran.png` |
| `sprite_source_note_specialist_veteran.png` | `native/sprite_source_note_specialist_veteran.png` |

## Source → output mapping

| Production role | Source (`public/assets/art-pack/`) | Output native (`public/assets/art-pack/ng-plus/`) |
|---|---|---|
| Proofreader | `sprites/native/sprite_reviewer.png` | `native/sprite_proofreader_veteran.png` |
| Compiler | `sprites/native/sprite_compiler.png` | `native/sprite_compiler_veteran.png` |
| Editor | `sprites/native/sprite_editor.png` | `native/sprite_editor_veteran.png` |
| Declass Reviewer | `sprites/native/sprite_declassification_coordinator.png` | `native/sprite_declass_reviewer_veteran.png` |
| Source Note Specialist | `sprites/native/sprite_records_officer.png` | `native/sprite_source_note_specialist_veteran.png` |

Role → source mapping follows `getCharacterKeyForProcessRole()` in
`src/art/characters.ts` (Proofreader has no explicit key and uses the `reviewer`
fallback; Source Note Specialist maps to `records_officer`).

## Regeneration

Deterministically reproducible via `scripts/generate-ng-plus-veteran-pack.py`
(reads the production native sheets, applies per-role color lookup tables, writes
the native sheets and 8× masters).

## Intended use

New Game+ cosmetic unlock only. Load exactly like the production sheets — same
32×48 frame size, same 4×4 layout, same animation keys — swapping only the texture
path. No gameplay, hitbox, or animation-timing changes.
