# Readable FRUS Colleagues

Three generated character sheets now join the refreshed compiler in the live
game. Marcus is identifiable by his blue shirt, badge, and manila review folder;
Priya by her plum cardigan and ruby volume; the reviewer by silver hair, green
cardigan, and proof folder. DANN-E and the compiler are unchanged.

## Runtime Contract

### Veteran Compiler Refresh (2026-09-13)

The compiler's New Game+ sheet now uses the same shaded art family as the
normal compiler: silver hair, a ruby jacket, gold lapel accent and FRUS book.
The original veteran sheet is preserved under `ng-plus/native/`. Registry key,
32x48 frame size, player feet collision and save/profile identity are unchanged.

The built-in image generator edited the normal compiler reference into a
1024x1536 pose board. Prompt constraints were a 4x4 direction/stride grid,
silver hair, ruby jacket, crisp native pixels, transparent background and no
borrowed game characters. It returned a light checkerboard instead of alpha;
the edge-connected backdrop importer produces binary transparency. This board
needs a neutral-gray threshold of 175, versus 205 for the earlier light board;
the first import left specks that inflated bounds and shrank the character.
The source stays outside the public build in `assets/character-sources/`.

Idle/walk use source cells 0-11. Interaction/reading use 12/13. Source cell 14
incorrectly faces backward, so approval uses forward-facing cell 15 instead;
runtime cell 15 stays blank. Action silhouettes are still subdued, not a
verified raised-hand victory or open-book reading pose. Future art work should
improve those three poses without changing the shared animation indices.

Earned publication -> touch New Game+ -> fresh Office -> reload passes in
phone-sized Chrome, including all four walking directions, registered texture
identity and integer positions. Final native captures are in
`/private/tmp/frus-veteran-refresh-clean/`. The 26 sprite tests and build pass.
This is browser emulation, not a physical-phone or novice-enjoyment result.

- Registered keys remain `declassification_coordinator`, `general_editor`, and
  `reviewer`, loaded through `src/art/characters.ts`. No new scene-local path.
- Native sheets: 128x192 RGBA, sixteen 32x48 cells, fifteen used poses and one
  blank cell. Existing idle/walk/action indices are unchanged.
- Binary transparency, nearest-neighbor sampling, feet on native row 43 or 44,
  at least five transparent rows above every pose. No chroma background pixels.
- Source boards stay in `assets/character-sources/`, outside the public build.
  `node scripts/import-frus-colleagues.mjs` reproduces the native exports without
  external dependencies. It removes the backdrop, uses documented per-row
  bounds for the generated boards, fits poses at one scale per character, and
  samples nearest pixels. It does not synthesize new anatomy or poses.
- Original placeholder and display sheets remain untouched. Native PNG tests
  now inspect the actual registry paths, not only the old `sprites/native/`
  directory; this prevents a new export from bypassing frame-integrity checks.

## Placement and Profile Identity

The main Archive, Network, Referral, and editor colleagues stand below the HUD.
Marcus moved out of the Network's narrow central combat/carry lane. Shadows are
small and translucent; remaining names use the native 6px face. Interactable
locations, tile collision, exits, and document tasks are unchanged.

New/debug starts now share Character Create's Compiler default. The earlier
apparent Continue art regression was a debug route using the old Proofreader
default, not lost save data. Explicit role debug parameters and saved roles,
names, abilities, inventory, and New Game+ semantics are retained. Legacy
proofreaders render the refreshed reviewer rather than being converted into
compilers.

## Generation Prompts

All three used the built-in image tool, with
`public/assets/art-pack/sprites/native/sprite_compiler.png` as the reference.
The generated master dimensions were 1024x1536. Generation did not reliably
place poses on the requested row boundaries or supply alpha for Marcus, so the
importer uses inspected row bounds and explicit backdrop removal. This is not
a claim that the large pose boards are directly sliceable runtime sheets.

### Marcus

Create one production game sprite sheet for Marcus, a FRUS declassification coordinator. The reference is the approved art family and exact pose grid: match its clean 16-bit top-down adventure proportions, black 1px native outline, readable shaded face, shoes at a stable ground line, restrained detail. This is original FRUS art, no borrowed game characters. Character: middle-aged Black man, close-cropped dark hair, steel blue shirt with sleeves rolled to elbows, dark navy trousers, burgundy lanyard badge, one manila review folder tucked under arm. No floating loose papers, no words, no name labels, no decorative background or ground shadows. True transparent background. Generate EXACTLY 1024x1536 PNG, depicting a 128x192 native pixel sheet enlarged 8x with crisp square pixel blocks. 4 columns by 4 rows, equal cells of 256x384 display pixels, corresponding to exactly 32x48 native. Each whole body centered on cell x midpoint and feet baseline at 44/48 of each cell height, 3px native transparent bottom margin. All cells independent, no grid lines. Frame order is mandatory: row 1 idle front/down, idle back/up, idle profile left, idle profile right. Row 2 front/down walking left foot forward, front/down right foot forward, back/up left foot forward, back/up right foot forward. Row 3 profile left walking two alternating foot poses then profile right two alternating foot poses. Row 4 interacting with folder extended, reading folder, modest approval hand raised, final cell completely blank. Fifteen full-body poses and one blank. Facing in profiles is unmistakable. Do not merely mirror the same front view; genuine back and side silhouettes. Stay within 24px native character width and 40px native body height. Use clear 3-tone ramps, binary transparency, no anti-aliasing, no soft painterly pixels, no gradients.

### Priya

Produce one original production sprite pose sheet for Priya, the FRUS General Editor, matching the supplied compiler's clean shaded 16-bit pixel-art family, body proportions and top-down adventure viewpoint. Priya is a middle-aged South Asian woman with dark hair in a neat low bun, plum cardigan over ivory blouse, charcoal slacks, dark shoes, and one small ruby-red hardback FRUS volume with gold spine bands. Distinct intelligent warm face; do not copy the compiler's head. Strong 1px native dark outline, 3-tone material ramps, readable silhouette, no loose-paper clutter. Canvas exactly 1024x1536. A 4-column x 4-row pose board, each cell exactly 256x384; leave generous margin inside each cell; no pose crosses a cell boundary. Exactly fifteen full-body poses; bottom-right cell blank. Row1 idle front, idle back, idle left profile, idle right profile. Row2 walking front left-foot step, front right-foot step, back left-foot step, back right-foot step. Row3 walking left profile alternate steps, walking right profile alternate steps. Row4 extend the book for interaction, read open book, raise free hand in approval, blank. Unmistakable real side and back poses. Ground line aligned at 340 pixels inside EACH row, upper head around 60 pixels inside each row. Every character approximately 160x280px, rendered as chunky clean native-pixel clusters, intended to fit a32x48 runtime cell. Use a perfectly flat pure magenta #FF00FF chroma-key background, no shadows or reflections on it, no checkerboard. No text, labels, grid, border, Nintendo iconography, gradients, smooth illustration, lighting glow or anti-aliasing. Keep composition practical for slicing and native nearest-neighbor import.

### Reviewer

One original FRUS reviewer sprite pose sheet for a top-down 16-bit adventure. Match the supplied compiler's friendly compact shaded pixel-art style with crisp dark outlines and strong silhouette. Subject: older woman with short silver bob hair, round reading glasses, moss-green cardigan over cream shirt, charcoal trousers, dark shoes, and one cream proof folder with a narrow red margin stripe. This is a careful human proofreader, not a wizard or fantasy costume. 1024x1536 image, pure uniform magenta #FF00FF background for chroma extraction, no shadows, no text, labels, grid, border, props detached from hands, gradients, glowing effects or antialiasing. Exactly 4 columns and 4 rows, fifteen complete full-body poses and an empty bottom-right cell, each body comfortably within one equal 256x384 cell. Leave margins so slicing never clips heads or feet. Pose sequence: row 1 idle facing front/down, back/up, profile left, profile right. Row2 front walk left-foot step, front walk right-foot step, back walk left-foot step, back walk right-foot step. Row3 left walk alternate steps, right walk alternate steps. Row4 present proof folder toward viewer, look down reading open proof folder, quietly raise hand in approval, empty. Characters have stable head/body scale across cells, visible feet and modest expressions. Three-tone ramps on skin, hair and clothing; fine native pixel blocks not vector art, ready to reduce to 32x48 native cell size by nearest neighbor. No copyrighted game characters or iconography.
