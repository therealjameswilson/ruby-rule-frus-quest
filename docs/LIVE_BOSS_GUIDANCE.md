# Live boss guidance

The objective now follows the available action instead of remaining fixed for
an entire phase. The boss supplies one short, allocation-free objective getter;
the existing scene update passes it to the existing HUD/state path.

Priority:

1. Exposed core: `PENCIL THE CORE`.
2. Cloud relocation warning: `DODGE LANES`.
3. Swarm satellites remaining: `PENCIL MINIS`.
4. Protected core: `FACE + SWING`.

The exposed-core instruction takes priority even when satellites remain. It
resets when the actual opening expires, rather than following a separate hint
timer. Pause uses the same frozen combat time as the core readout. Existing
longer action feedback still explains the Ego-bolt return and fresh strike.

## Verification

Unit coverage exercises all four phases through return/open/expire, prioritizes
Cloud warnings, and checks the opening instruction against the actual HUD clamp.
An initial browser capture exposed truncation of `CORE OPEN: USE PENCIL`; this
was shortened before final verification. Do not treat state-text assertions
alone as visual proof.

Final build: 255 modules, 2,801.91 KB main JavaScript; existing size warning.
Full suite: 194 files / 1,447 tests. The installed game client booted the final
desktop build, and the final 375x667 DPR-3 browser capture shows the complete
`PENCIL THE CORE` text during a genuinely returned-bolt opening.
The final earned touch route cleared Colossus, Swarm and Cloud in 59.899 clock
seconds without retry, struck seven fresh openings, reached the bindery and
continued with records/rewards preserved and no browser errors. Final evidence:
`/private/tmp/frus-live-core-guidance-final-touch-0909/` and
`/private/tmp/frus-live-core-client-final-0909/`.

One intermediate touch replay did not complete: after Swarm damage it returned
to the vault entrance with the saved phase retained, then timed out waiting for
the ending. Evidence remains in `/private/tmp/frus-live-core-guidance-touch-0909/`.
The explicit retreat callback restarts that scene; whether a combat B press can
accidentally choose retreat on the newly opened retry prompt needs a focused
reproduction next. Do not count this attempt as a successful fight.

No damage, attack timing, tool rules, save schema, publication requirements or
deadline settings changed. Full-game first-player usability remains unproven.
