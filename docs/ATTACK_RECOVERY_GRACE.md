# Attack Recovery Grace

Both combat-map update loops previously consumed a buffered action with
`canAct=true` before asking the weapon whether it could swing. A press during
cooldown was therefore discarded even inside the existing 110ms grace window.
They now consume only when the weapon is ready. Timing, damage and input
bindings are unchanged; one press can produce at most one queued swing.

Menus, dialogue, decisions and transitions clear pending presses. Hitstop
continues to preserve them for the existing grace window. The buffer uses a
null empty marker so scene time zero cannot invent or repeat an action.

## Verification

- All 1,479 tests / 196 files pass. Production build passes with the existing
  large-bundle warning. Added time-zero and actual weapon-recovery unit cases.
- `tools/qa-attack-buffer.mjs` passes in BlackVaultLairScene and GameplayMapScene:
  a late tap queues once, an earlier tap expires, and opening a menu immediately
  clears a confirmed pending tap with no delayed swing after closing it.
- Keyboard and 375x667 simulated-touch tool presses pass; menu cancellation
  uses keyboard M in both modes. This is not a complete touch-menu or physical
  phone test. No browser page errors; native captures inspected.
- The installed web-game client also exercised successive vault swings and
  movement; its native render was inspected.

Final evidence: `/private/tmp/frus-attack-buffer-keyboard-complete/` and
`/private/tmp/frus-attack-buffer-touch-complete/`. Earlier investigations are
retained in similarly named temporary folders. Initial pause checks raced a
completed swing; subsequent probes revealed the existing 90ms short-tap latch
merges very close presses. Final early-tap/cancellation tests leave 110ms
between presses and verify a genuinely pending buffer before testing removal.

The subsequent fresh-edge correction is documented in `FRESH_ACTION_EDGES.md`;
it preserves the latch but no longer merges distinct taps. No new campaign completion or novice enjoyment
claim is made by this focused check. Local only; not deployed.
