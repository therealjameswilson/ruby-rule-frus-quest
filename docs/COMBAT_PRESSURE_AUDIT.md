# Combat Pressure Audit

Audited 2026-09-12 on runtime `e6e1779`. This records current behavior, not a
claim that all enemy balance is finished.

## Hit Contracts

`Player.takeHit()` accepts/rejects a hit through invulnerability, applies
knockback, hurt feedback and recovery frames. It does **not** debit reliability.
Do not put a universal debit in this method: several callers already charge
their own costs, and doing so would double-charge those encounters.

| Caller | Reliability consequence | Physical response |
| --- | --- | --- |
| RedactorDrone active stamp | None | 8px push, 800ms protection |
| CensorshipWraith active swipe | None | 10px push, 850ms protection |
| Archive process-wall contact | 4 after an accepted hit | Push plus contact cooldown |
| GameplayMapScene room enemies | 4 after an accepted hit | Push plus 700ms protection |
| DANN-E lurker helper | Balance-table cost after acceptance | Kind-specific push and 700ms protection |
| DANN-E boss helper | 10 for bolts, 5 for swarm | 1,000ms protection; actual loss recorded for recovery |

Authoritative implementations: `src/entities/Player.ts`,
`src/entities/enemies/RedactorDrone.ts`, `CensorshipWraith.ts`,
`src/scenes/ArchiveScene.ts`, `GameplayMapScene.ts`, and
`src/systems/dannePressure.ts`.

## Confirmed Gap

The two expansion enemy classes produce convincing hit feedback without a
heart cost. Their current tests cover collision, windup, pause and avoidance,
but calling a mocked `takeHit` is not evidence of a reliability debit.
The NARA browser probe also confirmed unchanged reliability while the hero
was displaced. The resulting interruption still matters for readability;
moving the briefing outside attack range addressed that separately.

This audit does not establish whether knockback-only pressure was intentional.
Keep the current behavior until the encounter's consequence and recovery are
implemented together. `DanneMapScene` does not currently provide a generic
zero-reliability retry for these expansion encounters; the main boss has its
own explicit retry/retreat and combat-loss recovery.

## Next Combat Pass

1. Choose explicit knockback-only or reliability-pressure rules per encounter.
2. If adding a heart cost, charge only after `takeHit()` returns true and add a
   room checkpoint/retry at the same time. Preserve documents and separate
   combat recovery from editorial-standard penalties.
3. Verify overlapping attacks cannot bypass recovery frames, pause preserves
   tells, and defeat/retry cannot duplicate rewards or erase document decisions.
4. Recheck earned keyboard/touch entry, safe retreat and completion. Debug-room
   snapshots alone do not prove the difficulty curve or player enjoyment.

Verification this audit: 23 existing drone, wraith and DANN-E-pressure tests
pass. Runtime unchanged. Prior live displacement evidence is under
`/private/tmp/frus-nara-briefing-before/` and `frus-nara-briefing-after/`.
