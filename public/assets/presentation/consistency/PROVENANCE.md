# Supporting character and prop artwork — 2026-09-25

Original assets generated with the built-in image-generation tool for the graphics consistency pass. PNGs here are the unmodified generated originals. Runtime files under `public/assets/presentation/consistency` are lossless WebP encodings, preserving alpha and all visible source pixels. No external game artwork was used.

- `archivist-v2.png`: silver-haired archive guide in a brown tweed jacket, carrying a ruby volume. The existing compiler HD sheet served as the style reference.
- `hac-v2.png`: advisory committee member in a charcoal suit, with agenda and pen.
- `shutdown-v2.png`: rolling closure cabinet with a chained lock and beacon.
- `bees-v2.png`: five honeybees with distinct silhouettes and translucent wings.
- `mice-v2.png`: three archive mice with a torn paper scrap.
- `photocopier-v2.png`: slate-gray copier, scanner lid, paper feeder, rollers, brass fasteners and dark label panel.
- `marine-guard-v2.png`: matching full-body standing and saluting poses of an original security guard.

Art direction: natural proportions, shaded cloth/metal/paper, warm light from upper left, crisp silhouettes, transparent backgrounds, legibility at the original logical game scale. Runtime source rectangles and foot anchors are recorded in `src/art/supportingSprites.ts`, `src/entities/npcs/DanneNpc.ts` and `src/systems/photocopierArt.ts`. The copier keeps a 32×32 display and unchanged collision bounds; status lights and labels are separate gameplay overlays.

The masonry, sconces, stationery, garden pavilion, hearing-room surfaces, cable-room equipment, hidden reading-room surfaces and salad bowl are original code-native canvas artwork. Detailed side rooms reuse existing project-owned landscape, foliage, desk and archival crate art; collision and interaction definitions remain authoritative.
