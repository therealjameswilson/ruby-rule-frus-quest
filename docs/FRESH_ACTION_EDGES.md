# Distinct Action Taps

The 90ms short-tap latch prevented brief presses from disappearing between
frames, but also merged a second deliberate press into the first held state.
InputState now records fresh keyboard and touch presses separately. Each
produces a one-tick edge even while the previous short-tap hold remains active.
Browser key repeat and redundant touch-down updates do not create new edges.

The hold durations, direction latches, gamepad polling, weapon cooldowns and
save format are unchanged. Primary/confirm, secondary, cancel, Start and
Select keep their aliases. Reset and overlay swallowing clear pending edges.

## Verification

Six new regression cases failed on the previous implementation: rapid Z, X,
Enter and Escape taps, plus touch A/B re-presses. All pass after the fix. An
additional regression checks queued edges cannot survive overlay swallowing.
All 1,486 tests / 196 files pass; build passes with the existing bundle warning.

`qa-attack-buffer.mjs --rapid` uses 35ms gaps between selected presses. Both
combat-map types pass keyboard and simulated-touch tool tests: late presses
queue once, early ones expire, and a confirmed pending press is cleared by a
menu. That probe opens menus with keyboard M, including in touch mode.
Evidence: `/private/tmp/frus-rapid-taps-keyboard/` and
`/private/tmp/frus-rapid-taps-touch/`.

The fresh touch opening also passes character creation, assignment, memo,
counter training, deliberate miss, pause, reward, Continue and Archive entry.
Native compiler, returned-bolt and Archive screenshots were inspected.
Evidence: `/private/tmp/frus-fresh-edges-opening/`. The installed web-game
client exercised rapid vault swings and movement; native capture inspected.

The keyboard opening with `--coaching` also reaches Archive after boundary
checks, intentional wrong facing, a coached counter, reward and Continue.
No browser errors; native counter capture inspected. Evidence:
`/private/tmp/frus-fresh-edges-opening-keyboard/`.

This proves deterministic edges and scripted routes, not unaided enjoyment or
physical-iPhone performance. Local only; no public deployment.
