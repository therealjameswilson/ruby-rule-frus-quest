# Current docked movement and crossing measurements

Measured the production build at f5c69e2 with Chrome153, ANGLE Metal on AppleM3, 375×667 viewport and DPR3. This is Mac GPU evidence, not physical iPhone performance. No concurrent tests during timed runs.

The initial mobile profiler touched the former canvas-pad position, yielding no movement. Updated it to select the visible portrait dock or canvas fallback and report the surface. Invalid requested movement or page errors now cause nonzero exit after preserving the report. Verified the guard with a deliberately zero-second walk run. Moved frame-observer setup after CPU/graphics instrumentation so profiler startup is excluded.

Results (all raw runs retained in the JSON summary):
- Initial idle/invalid run: ~60fps; no movement. Not a movement pass.
- First valid12sOffice run:100% moving samples, p99 18.5ms, one136.7ms hitch at1.2s. Cause unresolved.
-15sArchive:100% moving samples,59.96fps, p99 18.6ms, max18.9ms, no frames over33.4ms.
-20sOffice CPU-profile run:100% moving samples, p99 18.4ms. A100.3ms first interval coincided with profiler startup, motivating the measurement-order correction. Subsequent intervals stayed below33.4ms.
- Final20sOffice unprofiled run:100% moving samples,59.97fps, p99 18.6ms, max20.7ms, no frames over33.4ms. This does not establish a fix for the earlier isolated hitch.
- Eight outdoor crossings:hero pose alignment preserved,zero repeated alpha-pixel scans,zero page errors; maxima18.4–41.4ms. Several crossings still exceeded a single60Hz frame. First-ever next-disguise assets were not cached before travel.

No gameplay optimization claimed this turn. The changes improve measurement validity and provide current evidence for future work. Screenshots inspected at `/tmp/frus-{office,archive}-pacing-docked.png` and `/tmp/world-crossing-pacing.png`. Standard client outdoor movement also ran; native image black as previously observed, compositor evidence used. Node syntax and diff checks passed. No game-code changes requiring a new game build/test run.
