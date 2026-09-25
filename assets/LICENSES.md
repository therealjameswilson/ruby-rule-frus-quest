# Asset Provenance

## Official FRUS Reference Covers (2026-09-20)

Downloaded unchanged from the Office of the Historian. These U.S. Department
of State publication covers are presented as reference books, not as the
fictional volume compiled in the game. No endorsement is implied. No flag
image, flag-bearing website masthead, or third-party photograph was imported.
The original publication seals remain part of the covers.

| Local file (under `public/assets/official-frus/`) | Original image | Publication |
| --- | --- | --- |
| `frus1989-92v31.jpg` | https://static.history.state.gov/frus/frus1989-92v31/covers/frus1989-92v31.jpg | https://history.state.gov/historicaldocuments/frus1989-92v31 |
| `frus-history.png` | https://static.history.state.gov/frus-history/covers/frus-history.png | https://history.state.gov/historicaldocuments/frus-history |

Rights basis: official federal publication cover artwork. The Office's
[FRUS FAQ](https://history.state.gov/about/faq/what-is-frus) states that FRUS
information is public domain. This is not a blanket license for all images
on history.state.gov; unrelated and third-party site imagery is excluded.
Source files are 400 x 600 pixels; the game uses nearest-neighbor rendering
for thumbnail/exhibit display, without modifying or claiming these covers
are native pixel-art sprites.

This ledger records the September 2026 colleague refresh. It does not certify
older assets or assign a license to the entire repository.

## Original AI-Assisted Project Art

The following images were generated for Ruby Rule with the built-in image tool,
using the existing original compiler sheet as the style reference. No external
game art or downloaded third-party character asset was imported. These are
original project assets, not assets claimed to carry a third-party CC license.
No project-wide redistribution license is currently declared in this repository.

| Source Board | Runtime Export | Subject |
| --- | --- | --- |
| `assets/character-sources/compiler_veteran.png` | `public/assets/art-pack/sprites/refreshed/sprite_compiler_veteran.png` | Veteran compiler, silver hair and ruby jacket; generated 2026-09-13 from the current compiler reference |
| `assets/character-sources/declassification_coordinator.png` | `public/assets/art-pack/sprites/refreshed/sprite_declassification_coordinator.png` | Marcus, review folder and badge |
| `assets/character-sources/general_editor.png` | `public/assets/art-pack/sprites/refreshed/sprite_general_editor.png` | Priya, ruby FRUS volume |
| `assets/character-sources/reviewer.png` | `public/assets/art-pack/sprites/refreshed/sprite_reviewer.png` | Reviewer, proof folder |
| `assets/character-sources/archivist.png` | `public/assets/art-pack/sprites/refreshed/sprite_archivist.png` | Archivist, silver hair, reading glasses and ruby volume; generated 2026-09-09 |

Generation date: 2026-09-04. Prompts and import details are in
`docs/art/colleague_refresh.md`. Source boards are not served by Vite; only the
small native runtime exports are loaded. Existing fallback sheets are preserved.

## FRUS inventory tool atlas (2026-09-24)
- `public/assets/presentation/frus-tools-v2.png`: original AI-generated artwork created for this project with OpenAI image generation. Transparent source retained; runtime-only frame slicing. See adjacent `PROVENANCE.md` for subjects and integration details.

## NARA environment props (2026-09-24)
- `public/assets/art-pack/archive-environment/props-v2.png`: original AI-generated archive shelving and cartons created for this game with OpenAI image generation. Source RGBA preserved. See adjacent provenance file. Floor, walls and illumination are original canvas code.

## Outdoor storefront and James (2026-09-24)
- `public/assets/research-world/presentation/{sweetgreen,james}-v2.png`: original AI-generated artwork for the game using OpenAI image generation; original RGBA preserved. See adjacent `PROVENANCE.md`.

## Research station and cart atlas (2026-09-24)
- `public/assets/art-pack/research-props/props-v1.png`: original OpenAI-generated walnut research tray and wheeled archival cart, source RGBA preserved. Adjacent `PROVENANCE.md` includes the full prompt and frame details.
