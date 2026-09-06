# Reversible Bindery Route

## Reproduced Problem

An earned pending-seal save held two filed packets and 217 points. The bindery
had no return doorway and G1 had no exits. Walking to its west edge and pressing
A repeatedly stayed in EndingScene. A player asked to repair the record could
not even return to earlier rooms.

## Change

A small west-wall passage leads from G1 to the already-cleared Black Vault
(DV1). It is separate from the Index Desk and inbox. Its nearby A prompt and HUD
say `RETURN TO VAULT`; the pause map exposes the matching west connection.
The vault's existing south exit leads back to proofing. Its quiet core returns
to the bindery without replaying the fight.

Leaving saves the current packet step/status and freezes controls for the
transition. Returning rebuilds the same packet state through the existing save
model. The doorway does not seal a packet, grant points, restore reliability,
clear violations, or change a document. Published endings cannot use it.

## Verification

- Baseline replay reproduces the missing exit with earned, not seeded, progress.
- Keyboard and 375x667/DPR-3 simulated touch: pending seal -> west passage ->
  cleared vault -> proofing -> quiet core -> bindery -> reload/Continue.
- Two packets remain filed; pending seal stays routed; 217 points, 100
  reliability, inventory, documents, cover pieces and boss counts stay intact.
- Closing pause near the doorway does not travel. The next deliberate A does.
- Normal desktop and touch binding regressions still publish at 241 points, with no
  console/page errors or duplicate reward on Continue.
- 173 test files / 1,174 tests and production build pass. The main bundle is
  2,741.89 KB; the existing Vite large-chunk warning remains.

Retained screenshots: `docs/screenshots/bindery-return-before.png`,
`bindery-return-touch.png`, and `bindery-return-restored.png`. The required
web-game client travels through the door; renderer/compositor captures provide
visual proof because its direct WebGL-buffer image remains black.

Replay: `tools/qa-bindery-return.mjs`, with `FRUS_QA_STORAGE` pointing to the
earned `pending-seal-storage.json` from `tools/qa-bindery-finale.mjs`.
Use `--baseline` against the old build or `--mobile` for actual simulated touch.
`PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, `FRUS_QA_URL`, and `FRUS_QA_OUT` use
the same conventions as the neighboring replay tools. Do not substitute debug
grants for an earned snapshot when claiming progression verification.

## Still Open

This restores navigation, not a general damaged-record correction system.
Already-completed editorial tasks still need an explicit reopen/recheck path for
a subsequently damaged record; no automatic historical judgments were added.
Fresh whole-game pacing, older art consistency and actual iPhone Safari remain
unverified. This local pass is not a public deployment or whole-game completion.
