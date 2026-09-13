# About the Series in FRUS Quest

Source: [About the Series, FRUS 1989-1992, Volume XXXI, START I, 1989-1991](https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries).
Reviewed against the official page on September 4, 2026.

The source is a set of production rules the player practices, not a required
reading screen before play. `src/game/aboutSeries.ts` keeps the source URL,
concise rules, handbook pages, and this volume's review figures together.

## Playable Applications

| Source principle | Player action |
| --- | --- |
| Accurate, objective selection; retain decision facts and policy defects | The Archive research review rejects a cleaned-up record and awards the RULE stamp for retaining evidence. |
| Relevant agency and presidential records; document access limits | Explore the archive, trace repository/collection/folder, and file the repository coverage packet. |
| First-footnote provenance, original classification, distribution, drafting, background, and reader evidence | At the final Folder Tab, keep the complete metadata packet. An archive path alone cannot verify the note. Return to the table for the separate human Citation Stamp, then use it to open the NO REPO passage. |
| Visible treatment of omissions | Silent Read distinguishes a bracketed excision from an undisclosed deletion. |
| An excerpt's release does not release the complete source document | Silent Read rejects the assumption that the entire source is public. |
| Account for wholly withheld records | Silent Read retains the chronological heading, source note, and withheld page count. |
| Washington-time chronology; conversation date rather than drafting date | Order the memorandum by the conversation in the proof decision. |
| Index references use document numbers | Physically route the bindery index entry to DOC 87, not PAGE 87. |
| Publication within 30 years | The statutory clock creates pressure without making concealment a legitimate shortcut. |

## Optional Handbook

Items -> Series Handbook has 13 short pages. Left/right or the large Back/Next
targets turn pages. Up/down selects another entry; categories remain clickable.
Confirm or the source button opens the exact official page in a separate tab.
The handbook also covers original text and marginalia, the typographic distinction
between unrelated and classified omissions, E.O. 13526 review/concurrence, and
the Historical Advisory Committee's advisory role.

For this START I volume only, review ran from 2017 to 2024: one document was
withheld in full, seven received paragraph-or-larger excisions, and 26 received
smaller excisions. These are reported historical outcomes, not game quotas.

## Saves and Limits

- First-footnote success saves `sceneProgress.aboutSeriesFirstFootnoteComplete`
  with the existing provenance fields. A rejected answer leaves the trail at
  step two and gives an immediate retry; it earns no points or completion.
- Existing provenance-complete saves remain verified/stamped under their existing
  rules. They are not credited with completing the new first-footnote decision.
  QA distinguishes `pending`, `legacy-credit`, and `verified`.
- Opening the codex checkpoints the gameplay position and held document before
  entering its transient scene. Closing restores room, carried-item, interaction,
  and certification state. Reading the source must not reset the task.
- The archive fixtures and characters are fictional practice material, not
  transcripts of documents from the cited START I volume. The decision models
  retaining metadata; it does not fabricate unknown metadata or certify a real
  document. Actual compilation, access research, and declassification decisions
  require much more than these compressed exercises.
- The committee advises and monitors the series; the game does not claim that
  it must approve every individual volume. The clock is a game abstraction.

## Verification

Unit tests cover concise page/choice layout, complete first-footnote fields,
review figures, old/new save round-trips, index routing, and codex state retention.
Production Chromium replays exercise real keyboard and 375x667/DPR-3 touch input:
carry a note into/out of the codex, trace its three stations, reject an incomplete
packet, retry, Continue, stamp, and open the passage. Handbook checks turn every
page, check text bounds, open the official source, and close the reader.
This is browser simulation, not real iPhone/Safari certification.
