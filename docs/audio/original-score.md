# Ruby Rule original score

The current runtime score is composed in `src/systems/originalScore.ts`. Ten original sixteen-bar arrangements share an open-fifth/falling-third motif, with separate research, outdoor, routing, combat and publication treatments. They are not transcriptions of the former classical MIDI assets. The older files remain in the asset archive but are not used by this scheduler.

All sound is synthesized locally: additive chamber voices, plucked tones, glass-like bells, bass, soft pads, a pitched hand-drum and filtered brushed noise. No external audio service or downloaded sample is required. The lead leaves space for counterlines and cadence rests. Music and effects remain separate buses through room transitions.

## Verification

Run a Vite dev server and then `tools/qa-original-score.mjs` with `FRUS_QA_URL`, `PLAYWRIGHT_MODULE`, and optionally `FRUS_QA_OUT`. The checker renders every complete arrangement through OfflineAudioContext, checks headroom and stereo output, exports two listening previews, and verifies live music-only fading, mute and resume. Preview WAVs are amplified 3x for convenient listening; they do not represent the game's final master volume.

On 2026-09-24 all ten complete renders passed: RMS 0.0119–0.0171, peak 0.0507–0.0962 before the game's master/music mix. A narrow network-theme transient was found and fixed by explicitly initializing envelopes at zero and ramping the brushed-noise attack. Scene transition, mute/resume and browser error checks passed.

These are signal and lifecycle checks, not an auditory quality sign-off. Speaker/headphone listening, balance against the full effects catalog, ambience, and physical-device performance still require review before the overall presentation goal is complete.
