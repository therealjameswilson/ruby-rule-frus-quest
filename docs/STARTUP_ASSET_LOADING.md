# Startup Asset Loading

## Measured Change (2026-09-13)

A fresh isolated Chrome context on the local Vite server recorded resource
timings through the first opening scene. The initial 150-entry timing buffer
filled with development modules, so the usable measurements increased it to
10,000 entries before navigation. Counting only `/assets/` response bodies:

| Opening asset payload | Bytes |
| --- | ---: |
| Before | 78,776,811 |
| After | 50,593,301 |
| Deferred | 28,183,510 (35.8%) |

The two raw records under `/private/tmp/frus-startup-{before,after}/result.json`
also include the 21,793-byte development registry module; the table excludes
that module. Local elapsed times were about 1.07 and 0.96 seconds, but these
single localhost samples are not a mobile-network speed benchmark.

## Ownership

- Boot loads shared DANN-E images and live runtime character sheets.
- Each expansion scene loads its own map painting, using its existing preload
  hook and texture-existence guard. It no longer requests all five maps.
- DanneGallery loads the full map and original sprite-sheet collection through
  its existing preload. Original assets and keys are unchanged.
- Animation registration already skips absent reference textures. Runtime
  actors retain their frames, and the global nearest-filter guard covers late
  texture additions.

No image was resized, recompressed, removed or replaced. No input, collision,
save, progression, dialogue or combat behavior changed.

## Verification

`tools/qa-danne-demand-loading.mjs` uses independent browser contexts for the
title, Office, all five expansion scenes, and the gallery. It asserts that only
the requested map exists outside the gallery, reference sheets exist only in
the gallery, and all runtime actor sheets retain at least 16 frames. All eight
routes passed without captured page/console errors. Native screenshots under
`/private/tmp/frus-danne-demand-loading/` were inspected. The standard NARA
movement/render client also ran and its native capture was inspected.

Unit tests exercise the actual NARA preload and cached-return path. The complete
suite passes: 222 files / 1,687 tests. Production build passes with the existing
large-JS-chunk warning. This is local verification, not a public deployment.

## Remaining Cost

About 50.6 MB still loads at startup, notably boss portraits, item cards and
large UI/VFX sheets. Further demand loading must account for codex, inventory,
and cutscene consumers so those do not flash missing art or pause unexpectedly.
This change is a measured reduction, not a claim that mobile loading is solved.
