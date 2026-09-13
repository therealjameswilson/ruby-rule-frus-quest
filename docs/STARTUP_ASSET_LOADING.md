# Startup Asset Loading

## Measured Change (2026-09-13)

A fresh isolated Chrome context on the local Vite server recorded resource
timings through the first opening scene. The initial 150-entry timing buffer
filled with development modules, so the usable measurements increased it to
10,000 entries before navigation. Counting only `/assets/` response bodies:

| Opening asset payload | Bytes |
| --- | ---: |
| Before | 78,776,811 |
| After map/reference deferral | 50,593,301 |
| After portrait deferral | 21,089,433 |
| Total deferred | 57,687,378 (73.2%) |

The two raw records under `/private/tmp/frus-startup-{before,after}/result.json`
also include the 21,793-byte development registry module; the table excludes
that module. Local elapsed times were about 1.07 and 0.96 seconds, but these
single localhost samples are not a mobile-network speed benchmark.

The portrait follow-up is `/private/tmp/frus-startup-portraits-after/result.json`.
Its raw total also includes the development registry module; the table excludes
it. This additional change defers 29,503,868 bytes. Its 0.89-second localhost
sample likewise does not establish real-device or mobile-network performance.

## Ownership

- Boot loads shared DANN-E images and live runtime character sheets.
- NPC portraits and variant stills are not shared startup images. The field
  guide loads only unlocked portraits on demand, with cached returns making
  no additional requests. Black Vault loads all variant stills before its fight.
- The field guide captures return state and pauses its parent in `init`, before
  preload. Its loading screen hides gameplay controls; closing restores play
  without consuming a combat window or forwarding the closing press.
- Each expansion scene loads its own map painting, using its existing preload
  hook and texture-existence guard. It no longer requests all five maps.
- DanneGallery loads the full map and original sprite-sheet collection through
  its existing preload. Original assets and keys are unchanged.
- Animation registration already skips absent reference textures. Runtime
  actors retain their frames, and the global nearest-filter guard covers late
  texture additions.

No image was resized, recompressed, removed or replaced. No movement, collision,
save schema, rewards or progression gates changed.

## Verification

`tools/qa-danne-demand-loading.mjs` uses independent browser contexts for the
title, Office, all five expansion scenes, and the gallery. It asserts that only
the requested map exists outside the gallery, reference sheets exist only in
the gallery, and all runtime actor sheets retain at least 16 frames. All eight
routes passed without captured page/console errors. Native screenshots under
`/private/tmp/frus-danne-demand-loading/` were inspected. The standard NARA
movement/render client also ran and its native capture was inspected.

Portrait follow-up: all eight routes passed again under
`/private/tmp/frus-demand-portraits/`, including assertions for variant/portrait
ownership. `/private/tmp/frus-codex-slow-final/` delays each portrait request two
seconds and verifies frozen drone tells, no closing swing/hit and a successful
dodge after resuming. The native loading screen was inspected. The earned-touch
boss opening under `/private/tmp/frus-deferred-boss/` reaches Swarm after three
bolt returns, without browser errors; its phase artwork was inspected. This is
a partial encounter regression, not a new full-fight or unaided-player proof.

Unit tests exercise actual NARA and field-guide preload, pause ordering and
cached returns. The complete suite passes: 223 files / 1,689 tests. Production
build retains the existing large-JS-chunk warning. This is local verification,
not a public deployment.

## Remaining Cost

About 21.1 MB still loads at startup, notably the shared boss portrait, item cards and
large UI/VFX sheets. Further demand loading must account for codex, inventory,
and cutscene consumers so those do not flash missing art or pause unexpectedly.
This change is a measured reduction, not a claim that mobile loading is solved.
