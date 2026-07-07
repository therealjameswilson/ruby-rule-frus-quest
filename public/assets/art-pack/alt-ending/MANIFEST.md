# Alternate Ending — Contested Declassification Art Pack

Original SNES-style pixel art for the **contested declassification** ending path of
**Ruby Rule: FRUS Quest** — the branch where the player publishes a FRUS volume with
unresolved agency equities, so the record issues "under appeal" rather than cleanly
certified. The art is deliberately tense and muted to contrast with the gold-stamped
`EndingScene` / `frus-prize-cover` "clean publication" prize.

All artwork is original, hand-placed pixel art. Hard edges, no anti-aliasing, no
sub-pixel smoothing. Colors are drawn only from the game NES palette
(`src/art/palette.ts`). The theme is professional and politically neutral: generic
interagency-review motifs only — **no real officials, no real agency seals, no real
country borders.**

## Assets (`public/assets/art-pack/alt-ending/`)

| File | Dimensions | Mode | Type | Intended scene use |
|------|-----------|------|------|--------------------|
| `bg_interagency_review_room.png` | 256×240 | RGB | Full-scene background | Drop-in ending background matching the logical canvas (`GAME_WIDTH`×`GAME_HEIGHT`) filled by `EndingScene` / `BadEndingScene`. Tense interagency review room: blue-gray secure-facility wall, projection screen showing a redaction-barred "CONTESTED" equity map, four blank interagency placards (neutral balance/column motif — no seals), a wall clock (time pressure), a conference table with manila folders + one red contested folder bearing a redaction band, and empty reviewer chairs. |
| `stamp_under_appeal.png` | 176×52 | RGBA (transparent) | Overlay | "UNDER APPEAL / EQUITIES UNRESOLVED" rubber-stamp imprint. Alarm-red ink (`#FF3B3B`, ink alpha 235) with a double-ruled clipped-corner border and worn ink gaps. |
| `volume_contested_redacted.png` | 80×120 | RGBA (transparent) | Prize / item sprite | Subdued, redaction-banded variant of the completed FRUS volume cover. Same ruby-buckram visual language and geometry as `assets/sprites/frus-prize-cover.svg` (80×120), but desaturated: deep-ruby cover instead of bright buckram, archive-gray spine instead of gold, sepia faded title lines, a drained gray seal, and two black **redaction bands** across the title block and lower caption. A small gray "under appeal" corner tab with a red pennant flags the contested status. |

### Overlay placement notes

- **`stamp_under_appeal.png`** is a transparent overlay meant to be composited on top
  of another element at the moment of a contested publish:
  - Over `volume_contested_redacted.png`: center horizontally, ~y offset so the imprint
    sits across the middle of the 80×120 cover (the stamp is wider than the cover on
    purpose, so it reads as stamped *across* the volume). Optional runtime rotation of
    about −10° gives a hand-stamped look; the baked art itself is axis-aligned and crisp.
  - Over `bg_interagency_review_room.png`: center on the canvas (e.g. `x=128`, `y≈150`)
    as a full-screen "UNDER APPEAL" verdict banner.
- **`volume_contested_redacted.png`** is a drop-in alternate for the published prize
  cover in the contested branch — swap it in wherever `frus-prize-cover` /
  `reward_legendary` is shown when `EndingScene` publishes with unresolved equities.
- **`bg_interagency_review_room.png`** should be drawn at depth 0 and scaled with
  `Phaser.Textures.FilterMode.NEAREST` (as the scene already does for cover art) to keep
  pixels crisp.

## Palette notes

Every pixel is one of these `src/art/palette.ts` colors:

| Role | Hex | Palette constant |
|------|-----|------------------|
| Shadows / ink base / redaction bands | `#0F0F0F` | `NES_BLACK` |
| Floor / dark fills | `#202020` | `NES_DARK_GRAY` |
| Ceiling / seams | `#303030` | `NES_CHARCOAL` |
| Chair fills / mid tone | `#505050` | `NES_MEDIUM_GRAY` |
| Muted spine / drained detail | `#707070` | `NES_ARCHIVE_GRAY` |
| Placard highlight / stone | `#A8A79E` | `NES_STONE_LIGHT` |
| Secure-facility wall | `#304860` | `NES_SLATE_BLUE` |
| Table wood | `#4A2A00` | `NES_DEEP_BROWN` |
| Wood bevel / molding | `#806020` | `NES_BRONZE` |
| Wood grain / cover weathering | `#3A0710` | `NES_DARK_MAROON` |
| Contested cover base (muted) | `#4A0712` | `NES_DEEP_RUBY` |
| FRUS buckram accent | `#7A1020` | `NES_BUCKRAM_RUBY` |
| Contested folder / appeal flag | `#8F2030` | `NES_MUTED_RUBY` |
| Alarm accent / appeal ink | `#FF3B3B` | `NES_CLASSNET_RED` |
| Gold stamping / screen label | `#D6A23A` | `NES_GOLD` |
| Faded title lines (sepia) | `#B89A5A` | `NES_AGED_PAPER_SHADOW` |
| Manila folders / map land | `#C68642` | `NES_ARCHIVE_AMBER` |
| Paper / placard face | `#E8D8A8` | `NES_CREAM_PAPER` |
| Highlights | `#F8F0D8` | `NES_WHITE_HIGHLIGHT` |
| Water glasses | `#68C0C0` | `NES_TERMINAL_CYAN` |

## Provenance

Generated 2026-07-06 for **Ruby Rule: FRUS Quest** by `scripts/gen_alt_ending_art.py`
(original hand-authored pixel-plotting; no traced, borrowed, or copyrighted assets).
Regenerate with:

```bash
python3 scripts/gen_alt_ending_art.py
```
