# FRUS Production Phase Art Pack

A set of 16-bit SNES-style maps, tilesets, and props themed around the five
phases of FRUS (Foreign Relations of the United States) production. All
assets are drawn in the same painterly pixel-art style as the existing
overworld map (`public/assets/art-pack/maps/overworld/*`), with the warm
aged-parchment border, brass-plate cartouches, and the slate-blue / mossy-green
/ parchment-cream / terracotta-red palette.

## Phase maps

Each phase corresponds to one stage of the FRUS production workflow and one
interior location the player can visit.

| # | Phase | Location (in-game) | File |
|---|---|---|---|
| 1 | Compilation | Historian's Office, Foggy Bottom | `phase1_compilation_historians_office.png` |
| 2 | Declassification | Interagency Declassification Review Chamber | `phase2_declassification_review_chamber.png` |
| 3 | Verification | Archivist Hall, NARA II College Park | `phase3_verification_archivists_hall.png` |
| 4 | Copyediting & Annotation | Editor's Atelier | `phase4_copyediting_editors_atelier.png` |
| 5 | Indexing & Publication | Publication Bureau | `phase5_publication_bureau.png` |

All five maps render at the same scale and aspect ratio (3:2) and are
intended to be used as **screen-by-screen interior maps** in the same way
the existing overworld screens are used. They are NOT pre-sliced tilemaps —
they are reference/concept maps that the level designer will slice into
the game grid (16×16 native tiles, integer-scaled).

## Companion tilesets

Located in `public/assets/art-pack/tilesets/phase-pack/concept/`.

- `tileset_interior_frus_office_concept.png` — 24 labeled interior tiles:
  floors (parquet, marble, cobble), carpets, walls (stone, wood panel,
  wainscot), doors (oak closed/open, vault), furniture (desks,
  bookshelves, filing cabinet, classified safe), seating (green/leather
  chairs), lamps (green banker, brass desk), potted fern, US flag.
- `tileset_exterior_overworld_concept.png` — 24 labeled outdoor tiles:
  grass variants, paths, water, bridges, fountain, pond, trees (oak,
  cherry, evergreen), bush, hedge, stone wall, lamp post, bench,
  mailbox, flagpoles (US + foreign), obelisk monument.

These are **concept sheets**, not runtime tilesets — each tile is laid out
in a labeled grid for design reference. The art-pipeline step is to slice
each tile out, snap it to the 16×16 native grid, and re-export as a
gridded sheet alongside the existing `tileset_overworld_16x16_native.png`
/ `tileset_interiors_16x16_native.png`.

## Companion item & prop sprites

Located in `public/assets/art-pack/sprites/items/`.

- `spritesheet_props_items_concept.png` — 24 labeled FRUS-themed props:
  FRUS volume, document stack, manila folder, top-secret folder,
  classified stamp, redaction marker, red pen, blue pen, magnifying
  glass, typewriter, index cards, card-catalog drawer, inkwell &
  quill, gavel, brass key, steel key, padlock, combination dial, coffee
  mug, green banker lamp (standalone item form), agency seal, diplomatic
  pouch, microfilm reel, floppy disk.

Same concept-sheet status as the tilesets — slice into 16×16 (or 32×32 for
larger props) and re-export to a gridded runtime atlas.

## Style anchor

Style reference is the existing overworld map
(`public/assets/art-pack/maps/overworld/...`). All assets were generated
with that map passed in as an image-to-image style anchor, so the new
maps share its border, cartouches, and palette exactly.

## Origin

Generated 2026-06-12 in a Perplexity Computer session and committed to
`feature/frus-phase-art-pack`.
