# Promo Storyboard Frames — Demo Trailer / GIF

Six storyboard-style 16-bit scene frames for the *Ruby Rule: The FRUS Quest*
demo trailer / GIF. Intended for promotional / portfolio material and consulting
pitch decks.

Each frame is an **exact 256×224** indexed-color PNG (SNES logical resolution)
with **no anti-aliasing** — every pixel is a hard index into a single fixed
palette, and all gradients are ordered (Bayer 4×4) dithering. The palette is
curated from the existing FRUS art pack (warm archive browns, gold leaf, ruby
buckram red, navy, cherry-blossom pink) so the frames sit alongside the shipped
title screen, DANN-E art, and volume/garden maps.

- **Dimensions:** 256 × 224 (all frames)
- **Format:** PNG, indexed (mode `P`), 38-color shared palette
- **Anti-aliasing:** none (verified: 0 stray colors outside the palette)
- **Generator:** [`generate_frames.py`](generate_frames.py) — deterministic, re-run with `python3 docs/promo/generate_frames.py`
- **Palette source:** sampled/quantized from `public/assets/art-pack/screens/title_screen_256x224.png`, `.../danne-pack/maps/*`, `.../frus_volumes/07_legendary_boss_reward.png`, `.../bosses/danne-variants/01_danne_prime_humanoid.png`

## Trailer / GIF order

| Order | File | Scene label | Dimensions | Colors | Palette / source notes |
|------:|------|-------------|:----------:|:------:|------------------------|
| 1 | [`frame_1_title_reveal.png`](frame_1_title_reveal.png) | Title screen reveal | 256×224 | 13 | Archive bookshelf backdrop + radiant open FRUS chest with Great Seal volume; gold "RUBY RULE" lockup and "PRESS START TO VERIFY" prompt. Mirrors the shipped `screens/title_screen_256x224.png`. |
| 2 | [`frame_2_character_creation.png`](frame_2_character_creation.png) | Character creation | 256×224 | 19 | Historian bust in a gold portrait frame, class list (Compiler/Editor/Proofreader/Source-Note Spec/Declass Reviewer), and dithered stat bars. Palette/motifs from `danne-pack/portraits/07_portrait_historian.png` and the player sprite set. |
| 3 | [`frame_3_danne_encounter.png`](frame_3_danne_encounter.png) | First DANN-E encounter | 256×224 | 16 | Letterboxed black-vault confrontation: armored, red-eyed DANN-E with chest reactor and hurled ego bolts; dialog "YOU CANNOT DECLASSIFY ME." Derived from `danne-pack/screens/01_warning_screen_danne.png` and the DANN-E boss variants. |
| 4 | [`frame_4_volume_assembly.png`](frame_4_volume_assembly.png) | Volume-assembly progress moment | 256×224 | 17 | Six-slot FRUS shelf (4 verified + glowing, 2 locked), "4 / 6 VOLUMES VERIFIED" meter, Ruby Pen sparkle. Motifs from `frus_volumes/*` and `danne-pack/items/15_item_ruby_pen.png`. |
| 5 | [`frame_5_miniboss_fight.png`](frame_5_miniboss_fight.png) | Miniboss fight | 256×224 | 20 | Black-vault arena with runic floor circle, boss health bar, hooded Censorship Wraith wielding redaction bars, and the player striking with the Ruby Pen. Motifs from `danne-pack/sprites/12_sprite_censorship_wraith.png` and `maps/03_map_black_vault_lair.png`. |
| 6 | [`frame_6_binding_ceremony.png`](frame_6_binding_ceremony.png) | Binding-ceremony ending | 256×224 | 23 | Dawn cherry-blossom garden; two robed figures binding the radiant legendary volume on a pedestal, "THE RECORD IS COMPLETE." Palette from `danne-pack/maps/02_map_cherry_blossom_garden.png` and `frus_volumes/07_legendary_boss_reward.png`. |

## Verification

Run from the repo root:

```bash
python3 - <<'PY'
from PIL import Image
import glob
for f in sorted(glob.glob("docs/promo/frame_*.png")):
    im = Image.open(f); rgb = im.convert("RGB")
    pal = im.getpalette()[:38*3]
    palset = {tuple(pal[i:i+3]) for i in range(0, len(pal), 3)}
    stray = {c for _, c in rgb.getcolors(1<<20)} - palset
    print(f, im.size, im.mode, len(rgb.getcolors(1<<20)), "stray=", len(stray))
PY
```

Expected: every file reports `(256, 224) P` with `stray= 0`.
