# Ruby Rule original score

The current runtime score is composed in `src/systems/originalScore.ts`. Ten original sixteen-bar arrangements share an open-fifth/falling-third motif, with separate research, outdoor, routing, combat and publication treatments. They are not transcriptions of the former classical MIDI assets. The older files remain in the asset archive but are not used by this scheduler.

All sound is synthesized locally: additive chamber voices, plucked tones, glass-like bells, bass, soft pads, a pitched hand-drum and filtered brushed noise. No external audio service or downloaded sample is required. The lead leaves space for counterlines and cadence rests. Music and effects remain separate buses through room transitions.

## Verification

Run a Vite dev server and then `tools/qa-original-score.mjs` with `FRUS_QA_URL`, `PLAYWRIGHT_MODULE`, and optionally `FRUS_QA_OUT`. The checker renders every complete arrangement through OfflineAudioContext, checks headroom and stereo output, exports two listening previews, and verifies live music-only fading, mute and resume. Preview WAVs are amplified 3x for convenient listening; they do not represent the game's final master volume.

On 2026-09-24 all ten complete renders passed: RMS 0.0119–0.0171, peak 0.0507–0.0962 before the game's master/music mix. A narrow network-theme transient was found and fixed by explicitly initializing envelopes at zero and ramping the brushed-noise attack. Scene transition, mute/resume and browser error checks passed.

These are signal and lifecycle checks, not an auditory quality sign-off. Speaker/headphone listening, balance against the full effects catalog, ambience, and physical-device performance still require review before the overall presentation goal is complete.

## Environmental sound (2026-09-24)

`roomAmbience.ts` adds five quiet synthesized stereo environments: office ventilation, archival room tone, outdoor wind and occasional birds, equipment ventilation, and low vault resonance. These are original Web Audio synthesis, with no recordings or downloaded samples. They follow the effects mixer channel. Cached noise and bird buffers are shared within each audio context; every active environment has three scheduled sources, no additional JavaScript timer, and a short fade/disconnect on disposal. Scene, mute, background suspension and interrupted-context handling use the existing audio lifecycle.

`tools/qa-room-ambience.mjs` uses a development server for source imports, renders all five profiles offline, checks levels and post-stop silence, then exercises same-theme scene changes, effects/music separation, mute/re-enable and simulated background/resume in Chromium. This establishes signal and lifecycle behavior, not a speaker/headphone listening review or physical iPhone validation.
