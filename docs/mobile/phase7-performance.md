# Mobile SNES Quality Phase 7: Performance

## Scope

- Added a tiny release-style FPS overlay toggled with `F7` or `?fps=1`.
- Expanded the existing `F11` mobile debug HUD with frame-time p99, max frame time, sample count, and a frame-time histogram.
- Reworked the debug frame sampler to use one rolling 10-second frame window instead of per-frame `filter`, `reduce`, `map`, and spread operations.
- Added `npm run perf:profile` for repeatable browser profiling against local or deployed builds.

## Profiling Command

```sh
npm run perf:profile -- --url 'http://127.0.0.1:5194/?fps=1' --seconds 5 --warmup-ms 1000 --out docs/screenshots/mobile/phase7-perf-profile.json --screenshot docs/screenshots/mobile/phase7-performance-overlay.png
```

The profiler warms the page, clears the in-game frame window through `window.rubyRuleResetPerformanceMetrics()`, samples `window.rubyRuleMobileMetrics`, then writes a JSON report.

## Local Results

| Probe | Avg FPS | Min FPS | p99 frame | Max frame | Input latency | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| FPS overlay profile | 60.00 | 59.94 | 20ms | 16.8ms | 6.7ms | 0 |
| Full debug-HUD profile | 60.01 | 60.00 | 20ms | 16.8ms | 1.8ms | 0 |

Chromium logged one GPU `ReadPixels` warning when Playwright captured screenshots; the game page produced no page errors.

## Device-Profile Screenshots

These are Playwright device profiles, not physical-device captures.

| Profile | Avg FPS | Min FPS | p99 frame | Integer zoom |
| --- | ---: | ---: | ---: | --- |
| iPhone 14 Pro portrait | 60.00 | 59.52 | 20ms | yes |
| iPhone 14 Pro landscape | 60.01 | 59.52 | 20ms | yes |
| Pixel 7 portrait | 60.00 | 59.52 | 20ms | yes |
| Pixel 7 landscape | 60.00 | 59.52 | 20ms | yes |

Evidence files:

- `docs/screenshots/mobile/phase7-perf-profile.json`
- `docs/screenshots/mobile/phase7-debug-hud-profile.json`
- `docs/screenshots/mobile/phase7-device-matrix.json`
- `docs/screenshots/mobile/phase7-performance-overlay.png`
- `docs/screenshots/mobile/phase7-mobile-debug-histogram.png`
- `docs/screenshots/mobile/phase7-iphone14pro-portrait.png`
- `docs/screenshots/mobile/phase7-iphone14pro-landscape.png`
- `docs/screenshots/mobile/phase7-pixel7-portrait.png`
- `docs/screenshots/mobile/phase7-pixel7-landscape.png`

## Verification

- `npm run build` passed.
- Local profiling against `http://127.0.0.1:5194/` held 60 FPS after warmup.
- In-app browser loaded `http://127.0.0.1:5194/?fps=1` with no error or warning logs; its hidden-tab RAF throttling made it unsuitable for FPS measurement.
