# Asset Gaps Audit

This audit covers the live rendering path for the 16-bit art pack and the remaining fallback texture generators in `src/scenes/BootScene.ts`.

## Wired In This Pass

- `public/assets/art-pack/screens/title_screen_16bit_sharp_256x240.png` is now the first-choice title card in `TitleScene`.
- `public/assets/art-pack/screens/intro_screen_256x224.png` is now used as the published-volume ending backdrop in `EndingScene`.
- `public/assets/art-pack/ui/ui_hud_16bit.png` is now loaded through the central art registry and sliced for the live quest-band HUD:
  - ruby HUD bar
  - verification heart
  - equipped-tool slot
  - action badge

## Confirmed Pixel Pipeline

- `src/game/config.ts` still uses `Phaser.AUTO`.
- `pixelArt`, `roundPixels`, `antialias: false`, and `antialiasGL: false` are set in the Phaser config and render config.
- `BootScene` sets `cameras.main.roundPixels = true`.
- `BootScene` installs a texture-add guard that sets `Phaser.Textures.FilterMode.NEAREST` on newly added textures, then reapplies `NEAREST` to every texture after registration.

## Art-Pack Path Gaps

- The prompt referred to `public/assets/art-pack/hud/`, but that directory is not present in the committed pack.
- The committed HUD-equivalent art lives at:
  - `public/assets/art-pack/ui/ui_hud_16bit.png`
  - `public/assets/art-pack/ui/ui_kit.png`
- The prompt referred to refreshed ending screens under `public/assets/art-pack/screens/`, but no dedicated ending-screen PNG is present there.
- The closest native screen art is `intro_screen_256x224.png`; this pass uses it as a polished ending backdrop while preserving the completed-volume hero art from `public/assets/art-pack/volume-assembly/`.

## BootScene Fallback Generators Still Present

These generators remain as missing-texture safety nets. They should not be the primary live path where an art-pack asset exists.

- Character and role fallbacks:
  - `makeCharacterTextureIfMissing`
  - `makeSnesRoleTextureIfMissing`
  - `makeSnesNpcTextureIfMissing`
  - `makeSnesProductionColleagueTextureIfMissing`
  - `makeSnesProductionColleagueFrameSheetIfMissing`
- Object and workflow fallbacks:
  - `makeManuscriptTextureIfMissing`
  - `makeVolumeTextureIfMissing`
  - `makeFrusPrizeCoverTextureIfMissing`
  - `makeCitationStampTextureIfMissing`
  - `makeVolumeFragmentTextureIfMissing`
  - `makeArchiveColleagueTextureIfMissing`
  - `makeSnesWorkflowToolsTextureIfMissing`
- Enemy, wall, and map fallbacks:
  - `makeBureaucraticWallTextureIfMissing`
  - `makeSnesAntagonistTextureIfMissing`
  - `makeSnesWallTextureIfMissing`
  - `makeSnesMapTextureIfMissing`
- Tile and UI safety fallbacks:
  - `makeTileTextureIfMissing`
  - `makeUiTextureIfMissing`

## Remaining Replacement Candidates

- Legacy SVG relic sheets in `public/assets/sprites/`, `public/assets/tiles/`, and `public/assets/ui/` are still preloaded for existing scene compatibility. They should be replaced incrementally only when there is an equivalent native PNG or packed-sheet frame in the art pack.
- Several non-HUD UI elements are still rendered by Phaser graphics primitives. These are mostly debug overlays, collision previews, choice prompts, and accessibility/readability panels rather than art assets.
- `EndingScene` would benefit from a dedicated 256x240 final card in `public/assets/art-pack/screens/` so it does not need to reuse the intro/reading-room screen as its polished backdrop.
