# Moving Gameplay Performance

## Current profiler (September 25, 2026)

Reports now include the WebGL renderer, software-renderer detection, drawing
buffer dimensions, browser channel, and requested ANGLE backend. The bundled
headless Chromium used in the recent September 25 runs selected SwiftShader.
Those results measure software rendering, not iPhone GPU performance.

The profiler records actual Phaser step intervals and full-run nearest-rank
p50/p95/p99, maximum interval, and counts over 33.4 and 50 ms. These are separate
from the older HUD's coarse rolling histogram. `movementRunValid` requires
movement in at least half the adjacent samples. The touch gesture uses the
current fixed-pad center (48, 202); earlier runs with the old y=178 coordinates
must be checked for movement coverage before treating them as moving tests.

On a Mac with Chrome installed, request Metal explicitly and inspect the
reported renderer to confirm acceleration:

```sh
npm run perf:profile -- --url 'http://127.0.0.1:5211/?scene=ArchiveScene' --mobile --walk --channel chrome --angle metal --seconds 60 --out /tmp/frus-metal-performance.json
```

For JavaScript attribution, add `--cpu-profile /tmp/frus.cpuprofile`.
Profiling can affect timing; compare like-for-like runs. Desktop GPU results
still do not certify physical iPhone, thermal behavior, or the full campaign.

The current ArchiveScene run on Apple M3 Metal (Chrome 153, phone viewport,
DPR 3, no CPU throttle) measured 60 seconds: 3,614 game frames, 60.00 FPS,
p95 16.9 ms, p99 17.9 ms, maximum 18.5 ms, and zero intervals above 33.4 ms.
Movement occurred in 223 of 224 adjacent samples with two threats active.
There were no browser errors or warnings. Evidence:
`/tmp/archive-metal-sustained.json` and `/tmp/archive-metal-sustained.png`.
This isolates a major test-environment difference from the recent SwiftShader
runs; it does not establish that a game-code change improved frame rate.

## Earlier measurements

Measured locally on 2026-09-13 with Chromium headless, a 375x667 CSS viewport,
DPR 3, touch emulation, and 4x CPU throttling. Each run measured 20 seconds
after warmup. This is a desktop proxy, not certification of real iPhone or
Android performance.

The profiler now supports `--mobile`, `--walk`, and `--cpu-throttle 4`, plus
`CHROMIUM_EXECUTABLE` for a configured browser. Touch walking alternates left
and right every second using actual pointer input. It records game state,
movement samples, threat count, and Phaser loop-frame throughput alongside
the existing browser frame metrics. Browser cleanup runs even on failure.

| Measure | Office | NARA Stacks |
| --- | ---: | ---: |
| Phaser loop updates/second | 59.99 | 60.03 |
| Samples with movement / adjacent pairs | 75/75 | 75/75 |
| Maximum reported threats | 1 | 4 |
| Final rolling frame histogram p99 bound | 20 ms | 20 ms |
| Final rolling maximum browser frame interval | 18.6 ms | 18.7 ms |
| Last recorded input latency sample | 13.2 ms | 10.6 ms |
| JavaScript page errors | 0 | 0 |

Both runs stayed in explore mode. Reliability remained 80 in NARA; this
measures movement with enemies active, not a sustained attack/defeat sequence.
The Phaser frame count is reported separately because a smooth browser RAF
loop alone does not prove the game loop advanced. Slight values above 60 are
sampling-window variation, not a higher target refresh rate.

The existing p99 metric is a histogram upper bound over the rolling ten-second
window, not an exact percentile over the full run. Input latency above is one
last sample, not a latency distribution. Four WebGL ReadPixels performance
warnings occurred per run; they are recorded in the reports rather than
silently ignored. No runtime optimization was justified by this short sample.

Evidence: `/private/tmp/frus-moving-perf/office-loop.json` and
`/private/tmp/frus-moving-perf/nara-loop.json`, with corresponding screenshots.

Reproduce from the repository:

```sh
npm run perf:profile -- --url 'http://127.0.0.1:5195/?scene=NaraStacksScene&fps=1' --mobile --walk --cpu-throttle 4 --seconds 20 --out /tmp/frus-nara-performance.json
```

Remaining checks: physical iPhone/Safari and Android/Chrome, prolonged combat,
input-latency distributions, thermal throttling, and background/resume. These
results do not prove a locked 60 FPS on every device or scene.

## Earned Boss Route Under Slowdown

The full touch DANN-E counter test now accepts `FRUS_QA_CPU_THROTTLE` (default
1) and records the rate in its result. A separate 4x-throttled run used an
earned pre-boss save, not a debug-granted inventory, at 375x667 and DPR 3.
Evidence: `/private/tmp/frus-throttled-earned-boss/result.json` and captures.

- Simultaneous D-pad movement and tool swing worked with independent fingers.
- Protected melee did no damage; returned bolts opened the core.
- Seven return/approach cycles produced seven fresh core hits across Colossus,
  Swarm, and Cloud; no retries were needed.
- Pausing preserved the exposure window and did not leak an attack on resume.
- Reloading Cloud preserved its earned 124 HP, document record and defeat counts.
- The fight reached the bindery and survived Continue without duplicated rewards.
- The measured fight loop took 77.284 seconds, including its scripted pause and
  reload checks; the statutory deadline was met and no JavaScript errors occurred.

This proves the scripted combat/control sequence survived the CPU slowdown.
It is not a continuous combat frame-time or input-latency distribution, nor an
unaided human playtest. The timing is not a recommended completion time.

## Publication Continuation Under Slowdown

The bindery QA harness also accepts `FRUS_QA_CPU_THROTTLE`. A 4x-throttled
touch run continued directly from the boss test's earned bindery save.
Evidence: `/private/tmp/frus-throttled-publication/`.

The routine front/index assembly advanced to 2/5 packets without granting the
human seal. The standards choice stayed inside its panel with touch targets
at least 44 CSS pixels tall. Cancelling did not trigger a tool swing; a cold
Continue restored the routed packet and exact position. Human certification
advanced to 5/5, and the separate publication interaction completed the volume.
Final points were 241, the deadline was met, and Continue preserved completion
stats without duplicating points or rewards. No JavaScript errors occurred.

Native screenshots of the human-seal decision, published volume and deadline
record were visually inspected. The final record still exposes optional
discoveries separately (the hidden first edition was not found in this run).
No gameplay rule or reward value was changed to obtain this result.

## Landscape and Held-touch Rotation

Movement and delayed-art inventory checks now support `--landscape` at 667x375.
Both passed. Adding `--rotate` to the movement harness reproduced a stuck
thumb capture after viewport rotation. TouchControls now releases its captured
inputs and redraws on resize/orientationchange, removing both listeners on
shutdown. It does not change keyboard mappings or fractional movement logic.

After the fix, both landscape-to-portrait and portrait-to-landscape rotation
passed while the thumb was held: capture cleared, the hero stopped without
drift, and a fresh touch moved correctly. Collision, walk animation, pixel
alignment and desktop movement also passed. Native and viewport screenshots
were inspected. Evidence: `/private/tmp/frus-rotation-after/`,
`/private/tmp/frus-rotation-portrait-after/`, and `/private/tmp/frus-landscape-inventory/`.
These viewport-resize simulations are not physical Safari rotation tests.

## Cached hero alignment at region crossings

The September 25 crossing trace found 61–67 ms inside scene creation, mostly
individual alpha-pixel reads used to align the hero's twelve poses. The player
now reuses immutable measurements keyed by the loaded texture object. Removing
and replacing a texture gets new measurements; weak keys do not retain it.

Eight explicit crossings previously had maximum intervals of 76–96 ms. With
the cache, the verification run measured 17.4–22.7 ms maxima and 2.1–3.0 ms
scene creation. It performed zero new alpha-pixel reads and preserved every
pose transform. New DANN-E disguises still loaded normally. The test places
the hero near each edge, then uses actual keyboard input to cross; it is not
a complete navigation playthrough. Before/after compact results are retained
in `hardware-pacing-baseline.json`. First-time character measurement and
physical iPhone performance are not covered by this crossing improvement.
