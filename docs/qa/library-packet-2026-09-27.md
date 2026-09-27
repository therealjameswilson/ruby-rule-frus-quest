# Saved research packet and handoff

Reagan station 4 now packages the actual saved archival request, evidence comparison, and working source note. The player inspects each paper and attaches it explicitly. The comparison includes its evidence summaries and provenance, not just classification labels. Official finding-aid/transcript links accompany the papers. An always-visible research status and separate open-work section distinguish a packet for supervisor review from a finished chapter or cleared volume.

The model checks each underlying artifact as well as attachment state. Incomplete/stale evidence cannot be filed. Draft attachments persist; a filed packet becomes read-only. Scene-owned stage advancement awards eight points once and retains the existing return-to-Archive option.

Older completed saves retain stage credit. If they lack the newly introduced artifacts, the room marks the relevant desks REVISIT and the packet identifies missing work. Revisiting those desks repairs the artifacts without advancing old stage credit or granting another reward. The previous legacy receipt is not silently converted into a researched packet.

## Verification

Production build passed. Full suite: 282 files / 2,100 tests before final evidence-text/source-link and legacy-label additions. Focused final tests: 4 files / 10 tests. Coverage includes missing/stale artifacts, attachment drafts, retained open work, invalid selections, idempotent filing, and separation of model submission from scene rewards.

Final browser checks passed desktop 1280×900, portrait touch 390×844, landscape touch 844×390, and an older completed save. New runs earned the first three desks through UI before assembling the packet. Checks cover missing attachments, removal/re-attachment, saved partial packets, completed reload/read-only review, exact +8 reward for new completion, zero additional reward for repaired legacy completion, simulated controller/fullscreen, and desktop return to ArchiveScene. Legacy repair checks use a fixture with prior stage 4 and no new evidence fields. Player positions are set near desks; this is a station integration check, not a fresh whole-campaign or navigation proof.

No page errors or horizontal overflow. Inspected source, comparison, source-note, open-work, and legacy-repair compositor screenshots. One early legacy error capture omitted header text; a targeted rerun with a 500ms settling interval rendered the header correctly and passed the same repair path. No root-cause claim. The standard headed game client reached PresidentialLibraryScene with valid state; its known black canvas capture persists.

Sources remain those documented in the preceding comparison/source-note reports: the Reagan Library VIP Visits finding aid, RAC Box 6, page 14, and the February 20, 1985 public remarks transcript. No new historical inference or specific volume assignment is added.

Local only. Physical iPhone/controller behavior and subjective audio remain unverified. Other libraries retain their existing final-station interactions.
