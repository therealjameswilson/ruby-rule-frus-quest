# history.state.gov Art Pack

Eight 16-bit SNES-style assets drawn directly from the visual and thematic
content of history.state.gov, matching the existing overworld map's
painterly aesthetic (parchment border, brass cartouches, slate-blue /
mossy-green / parchment-cream / terracotta-red palette).

## Title screen

| File | Use |
|---|---|
| `screens/title_office_of_the_historian.png` | Boot / title screen. State Dept Great Seal over OFFICE OF THE HISTORIAN brass plaque and FRUS volume stack. |

## Maps (full-screen locations)

| File | In-game purpose |
|---|---|
| `maps/hsg/buildings_of_the_department.png` | Overworld park showing 6 historical State HQs (Carpenters Hall → Truman Building) along the Potomac. |
| `maps/hsg/milestones_hall.png` | Era-select hub. Banner corridor for each historical era 1750→present, each leading to a Milestones essay scene. |
| `maps/hsg/guide_to_countries.png` | World-map screen for the Guide to Country Recognition / Worldwide Diplomatic Archives Index. |
| `maps/hsg/hall_of_secretaries.png` | Portrait gallery interior. Oval-framed Secretaries from Jefferson to Kerry, with collectible artifact pedestals. |

## Tileable wall

| File | Use |
|---|---|
| `backgrounds/wall_frus_bookshelf_tileable.png` | Interior decoration. Wall of FRUS volumes by administration, slot directly behind NPCs in the Historian's Office or Publication Bureau. Designed to tile horizontally. |

## UI kit (concept)

| File | Contents |
|---|---|
| `ui/ui_frame_kit_hsg_concept.png` | Six reusable UI surfaces: dialogue box, vertical menu panel, unfurled scroll, A/B/Start button set, 4×4 inventory grid, health+seal HUD. Style is deep-navy + parchment + brass-trim, branded with the State Dept eagle seal. |

## Icon sheet (concept)

| File | Contents |
|---|---|
| `icons/icon_sheet_hsg_concept.png` | 24 themed icons (4×6 grid): Great Seal, FRUS Volume, Diplomatic Pouch, Courier Badge, USMC Anchor & Globe, Microfiche, Eagle Stamp, Conference Gavel, Treaty Scroll, Quill & Inkwell, Globe on Stand, Compass, Ambassador Sash, Country Recognition Pin, Declassified Stamp, Classified Stamp, Redacted Bar, Handshake, Brass Key, Capitol Dome, White House, Truman Building, history.state.gov wordmark badge, Office of the Historian badge. |

## Status

Maps and the title screen are **finished, runtime-ready PNGs** (use as-is).

The UI kit, icon sheet, and bookshelf wall are **concept sheets** — they
need to be sliced into runtime atlases:
- UI kit → cut each of the 6 elements into its own labeled image (and
  9-slice the dialogue box, menu panel, and inventory grid for arbitrary
  resizing).
- Icon sheet → slice into 24 individual 32×32 icons in a gridded
  spritesheet with consistent cell origins.
- Bookshelf wall → trim to a power-of-2 width and verify it tiles
  seamlessly along the horizontal edge.

## Origin

Generated 2026-06-12 in a Perplexity Computer session, drawing thematic
content from history.state.gov (FRUS series, Secretaries gallery,
Buildings of the Department, Milestones in U.S. Foreign Relations, Guide
to Country Recognition). Committed on `feature/history-state-gov-art-pack`.
