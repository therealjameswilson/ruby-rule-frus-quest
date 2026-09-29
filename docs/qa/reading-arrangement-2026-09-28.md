# Reading arrangement

Document desks now retain the current score's bass and sustained harmony while withholding new melody/counterline and percussion notes. Existing short note tails decay naturally; up to the scheduler's120ms lookahead can already be queued when a desk opens. The musical step keeps advancing. Closing the final reading owner restores the normal arrangement at the current position. Existing volume attenuation, user mix preferences, effects and ambience remain active.

Validation:16 focused tests across audioReadingMix, audio and originalScore pass; TypeScript and Vite production build pass. Build /tmp/frus-reading-arrangement-build. Fresh Vite5236 supplied live QA to avoid HMR singleton duplication. Standard game client movement/state and compositor Network/ledger screenshots inspected.

qa-reading-arrangement records eight seconds each of live Network score during exploration/reading. Reading observed bass/pad only, zero pulse calls; after release foreground parts and percussion resumed without restarting (step32 to34). No page errors. Native ledger opening/closing acquires/releases the same mix. Peak amplitudes .3165 exploration/.0988 reading; RMS .0549/.0238. These are automated waveform/lifecycle results, not human listening or physical-device validation. Raw /tmp/frus-reading-arrangement-final; WAV copies under untracked artifacts/audio-preview.

No deployment. Existing static5235 still serves the preceding runtime; updated dev5236 and new build carry this change. Next assess the mix in actual longer gameplay and human listening, plus remaining whole-game presentation/learning gaps. Do not infer console-quality sound from these numerical checks alone.
