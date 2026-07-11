# One-Hour Gameplay Training Receipt

Reference: https://www.youtube.com/watch?v=Dq_gUziNZUk

This repo treats the linked one-hour gameplay reference as action-adventure grammar only. It is not used as copied expression, training data for a generative model, or a source for protected maps, sprites, music, enemies, puzzle layouts, names, or text.

## What Was Translated

The first hour is encoded as original FRUS Quest design checks:

- A starting room with one obvious verb.
- Cardinal screen exits that teach route memory.
- Visible blocked routes that name the missing FRUS tool.
- Archive interiors that shift from overworld wandering to chapter-room routing.
- Compact map/compass literacy for contested equities.
- Local document subtasks that earn local chapter keys.
- New tools that immediately solve a nearby gate.
- Return shortcuts after process rewards.
- A key-lock cadence that keeps gates, rewards, and next rooms readable.
- Standards hazards that are visible and recoverable.
- Boss/readiness gates tied to required FRUS tools.
- Rewards that visibly change the world state.

## Where It Lives

- `src/game/firstHourTraining.ts` contains the typed 60-minute ledger and 12 five-minute drills.
- `src/game/adventureTraining.ts` converts live game state into the next visible verb.
- `docs/gameplay/first-hour-reference-training.md` explains the design transfer.
- `window.render_game_to_text().oneHourTraining` exposes the full coverage ladder for browser QA.

## Acceptance Standard

A screen is closer to the target when a new player can answer these questions without reading a long paragraph:

1. What is the next verb?
2. Which route is new?
3. Which gate is blocked?
4. Which FRUS tool or document step opens it?
5. What changed after the reward?

If a screen cannot answer those five questions visually, it needs another pass.
