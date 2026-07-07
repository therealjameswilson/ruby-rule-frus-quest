# Hidden Reading-Room Secret Art Pack

Optional bonus-area art for **Ruby Rule: FRUS Quest** — a small hidden reading
room reached through a secret passage, plus its rare collectible reward: a gilded
"first edition" FRUS volume. All artwork is original SNES-era pixel art with hard
edges, a locked limited palette, and no anti-aliasing. Palette is style-locked to
the existing archive / stone-dungeon tilesets (federal stone grays, ruby buckram,
gold stamp, cream paper, dark archival wood, reading-room green banker lamp, warm
candle glow).

## Assets (`public/assets/art-pack/secrets/`)

| File | Type | Dimensions | Grid / layout | Transparency | Intended use |
|---|---|---|---|---|---|
| `tileset_reading_room_16x16_native.png` | Tileset (native) | 112×112 | 7×7 grid, 16×16 tiles | Yes (RGBA, edges only) | Native 1× source for the hidden reading-room bonus area — load into Phaser as a tilemap tileset with `tileWidth/tileHeight = 16`. |
| `tileset_reading_room_16x16.png` | Tileset (display) | 896×896 | 7×7 grid, 128×128 cells | Yes (RGBA) | 8× crisp nearest-neighbor upscale of the native sheet (display/master). Load with `tileWidth/tileHeight = 128`. |
| `collectible_first_edition_frus_32x32.png` | Collectible sprite sheet | 128×32 | 4 frames of 32×32, horizontal | Yes (RGBA) | Rare "first edition" gilded FRUS volume — the optional secret reward. Sparkle-animated. |

### Reading-room tileset — tile map (7×7, row-major, 16px each)

Slice with `cellW = imageWidth / 7`, `cellH = imageHeight / 7`.

- **Row 1 — floors & rug:** stone floor, cracked stone floor, ruby+gold rug center, rug edge (top border), rug corner, polished wood floor, marble floor.
- **Row 2 — walls, doorway & hidden passage:** stone wall, wall top/capstone, wall niche (small shelf), stone arch, doorway threshold (walkable), **hidden passage (disguised as plain wall — faint crack + off-color brick is the tell)**, hidden passage revealed edge (opened dark gap with light hint).
- **Row 3 — shelves & furniture:** full bookshelf, half bookshelf, reading table (left half), reading table (right half), reading chair, reading pedestal/display, globe (archive prop).
- **Row 4 — lighting & props:** candle, candle warm-glow overlay, green banker lamp, banker-lamp green-glow overlay, wall sconce, framed archival map, brass FRUS placard.
- **Rows 5–7 — seamless fills:** gap-free tessellating fills — stone floor (cols 1–4), ruby rug (col 5), wood floor (col 6), marble (col 7).

### Collectible — animation

- **Frames:** 4 (indices 0–3), each 32×32, laid out left→right.
- **Base:** a standing ruby-buckram FRUS hardback with gold-stamped frame, gold title bars, a gold first-edition seal medallion, and a cream page block. The volume is pixel-identical across all frames; only the sparkles change.
- **Animation:** a rotating 4-point gold twinkle set orbits the volume for a "rare / legendary" shimmer.
- **Suggested speed:** ~8 fps (125 ms/frame) → ~500 ms full loop. Loop indefinitely.

```ts
// Phaser load
this.load.spritesheet('secret.frus_first_edition',
  'assets/art-pack/secrets/collectible_first_edition_frus_32x32.png',
  { frameWidth: 32, frameHeight: 32 });
this.anims.create({
  key: 'frus_first_edition_sparkle',
  frames: this.anims.generateFrameNumbers('secret.frus_first_edition', { start: 0, end: 3 }),
  frameRate: 8, repeat: -1,
});

// Tileset load (native)
map.addTilesetImage('reading_room', 'secrets/tileset_reading_room_16x16_native.png', 16, 16);
```

## Intended use in game

An optional secret: a disguised stone-wall tile (Row 2) conceals a passage into a
small reading-room bonus area built from this tileset. The gilded first-edition
FRUS volume sits on the reading pedestal as the rare collectible reward for players
who find the hidden passage.

## Palette notes

Locked palette shared with the archive / stone-dungeon pack. Only alpha values 0
and 255 are used (no anti-aliasing); the display tileset is an exact ×8
nearest-neighbor upscale (identical color count to the native sheet).

- **Federal stone:** `#282528` `#3D3736` `#4D453F` `#6B615A` `#8A7E74` (outline `#0F0F14`)
- **Ruby buckram:** `#5A0106` `#760F1F` `#A8283C`
- **Gold stamp:** `#8A6A2A` `#C9A24B` `#F0D67A` `#FFF6C8`
- **Cream paper:** `#B8A880` `#D8C9A0` `#E8DEC4`
- **Archival wood:** `#3A281A` `#5B4028` `#805C3A`
- **Reading-room green:** `#14422E` `#226442` `#4A9668` `#96D6AA`
- **Warm candle glow:** `#C86018` `#F0A830` `#FFE896`

## Provenance

Generated deterministically 2026-07-06 for **Ruby Rule: FRUS Quest** via an
original Python/PIL pixel-art script (`/tmp/gen_secrets.py`). All artwork is
original; no copyrighted game assets were copied, traced, or referenced.
