# Editable Proof and Return-to-Review Loop

## Player Experience

The first Editor Desk task is now a small editable proof, not another answer
list. Restore the missing indication, then deliberately file the draft. The
existing separate stamp still grants the Red Pencil and the original reward.
Leaving before filing keeps the first-time draft through Continue.

After completing all eight editorial tasks, a missing withholding indication
no longer turns the editor's desk into a dead end. The bindery's blocked seal
names the west return route. Use the Red Pencil at the Editor Desk, carry the
corrected proof east, and use the Proof Lens at the Proof Table. File the proof,
then return through the cleared vault to the same pending bindery packet.

This is a repair opportunity, not an additional mandatory trip in a clean run.
An incomplete submission gives a short hint with no new damage. Repeated taps
cannot award points. Reading freezes movement, weapon use and DANN-E pressure;
Return/B/Esc does not become an attack. The HUD says `REVIEW FULL RECORD`, not
`CHOOSE ANSWER`. The two filing/return targets sit above the mobile A hit zone.

## Historical Boundary

Source: [About the Series, FRUS 1989-1992, Volume XXXI](https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries),
especially Editorial Methodology and Declassification Review.

That source distinguishes visible indications from release decisions. Omitted
classified text is indicated in italic brackets, with the extent stated where
possible. It also distinguishes this from unrelated-subject omissions and
requires preservation of the original record. A bracket repair is not agency
concurrence or a fresh declassification decision.

The two retained notes are **fictional training evidence**, not quotations from
historical documents: Source Note 47 specifies three withheld lines; the
Referral Note specifies withheld text without a known extent. Their authored
indications are `[3 lines not declassified]` and `[Text not declassified]`.
Style is recorded as italic; the bitmap panel explicitly labels that treatment.

## State and Safety

- Optional `DocumentCandidate.editorialRepair` stores indication, style and
  draft/proofed status. Existing save cloning copies it independently.
- Reopening requires the completed eight-task chapter, a selected unpublished
  record, retained evidence, an outstanding repair and the matching owned tool.
- Draft filing sets ready-for-proof and leaves the hidden-deletion violation
  unresolved. Only explicit proof filing clears that document's hidden flag and
  its document-linked undisclosed-deletion ledger entries.
- Repository, citation status, first-footnote metadata, agency responses and
  review status are unchanged. The general proof transition is not used because
  it also changes agency responses.
- Other documents, altered-text violations, policy-concealment violations and
  deadlines remain untouched. Published documents cannot be silently rewritten.
- No chapter reward, stamp, tool, boss victory, binding packet or reliability
  is granted again. Further damage invalidates any earlier repair proof.
- Opening the recheck saves position. Continue preserves the station position,
  filed draft/proof and original pending bindery packet.

## Verification

The regression begins with an earned pending-seal save at 217 points and two
filed packets. It deliberately injects a missing-bracket fault into that saved
record. This is a legacy/damaged-save test, **not** a newly earned gameplay
mistake or a fresh whole-game completion. Against the previous build, the
completed Editor Desk ignores the repair action.

Keyboard/mouse and 375x667/DPR-3 Chromium touch replays restore the indication,
file a draft, Continue, recheck, Continue at the Proof Table, file, and return to
the bindery. Points remain 217 until the normal remaining publication steps
award 24. Publication and Continue finish at 241 with no duplicate completion
reward. Separate first-time desktop/touch chapter replays still award exactly
87 points across all eight tasks and reach Black Vault.

- 175 test files / 1,193 tests pass with `--pool=threads --maxWorkers=2`.
- Production build passes: 237 modules; main JS 2,750.48 KB. Existing large-chunk
  warning remains; no dependency or resolution change.
- Required web-game client files the repaired proof in headed and headless
  runs. Direct WebGL-buffer captures remain black; inspected native-renderer
  and browser-compositor captures show the actual panel and filed correction.
- Fourteen scene-debug routes render nonblank without page/console errors;
  every exploration route also passes pause, map and close checks.
- The final touch replay attempts the blocked standards seal before leaving.
  It remains locked and points to the Editor Desk without changing progress.

Replays: `tools/qa-editorial-repair.mjs` and `tools/qa-proof-comparison.mjs`.
Supply an earned pending-seal `FRUS_QA_STORAGE`; use `--baseline` for the old
build or `--mobile` for touch. Module, browser, URL and output overrides follow
the neighboring QA tools. The script records the injected fixture explicitly.

Evidence directories under `/private/tmp/`: `frus-editorial-repair-before`,
`frus-editorial-repair-publish-final`, `frus-editorial-repair-publish-touch-final`,
`frus-editorial-first-playthrough`, `frus-editorial-first-touch`, and
`frus-editorial-repair-client-hud-final`, `frus-editorial-repair-touch-seal-check`,
and `frus-editorial-final-scene-smoke`. Retained screenshots are prefixed
`editorial-repair-` in `docs/screenshots/`.

## Next Playtest

Unsupported or different damaged-record cases still require their own retained
evidence and human repair flow. Do not make certification auto-heal them.
Fresh whole-game pacing, consistency of older art and actual iPhone Safari
remain open. This is a local verified checkpoint, not a public deployment or
proof that the broader fun/adventure goal is complete.
