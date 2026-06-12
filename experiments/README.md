# Experiments

This directory preserves promising work that is not part of the runnable cleanup branch yet.

## Contents

- `duplicate-assets/`: Finder-style duplicate SVGs preserved from repo hygiene work.
- `overworld-wip/`: quarantined overworld, art-pack, interior-map, and screen-manager work from the dirty working tree before Phase 8 cleanup.

## Promotion Bar

Move files back into `src/`, `public/`, or `docs/` only when they meet all of these checks:

- `npm run build` passes from a clean checkout.
- Existing `?scene=` QA deep links still boot.
- `window.render_game_to_text()` keeps its existing keys.
- StateChat remains terminal or panel output only.
- The 256x240 logical canvas and pixel-art rendering stay intact.
- The change advances one of the LttP cleanup pillars and is reviewed as a focused commit.
