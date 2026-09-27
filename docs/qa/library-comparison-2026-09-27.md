# Reagan evidence comparison

Replaced the second Reagan library station’s binary access-status question with a saved evidence table. Players sort four cards into archival lead, public statement, and unresolved question, then retain requests for a private meeting record and contemporaneous State/embassy reporting. Filing advances only the comparison station and clears its barrier; it does not claim those follow-ups have been performed. The source-note and packet stations remain unchanged. No specific compiler volume is assigned.

## Source grounding

The folder metadata comes from the [Reagan Library VIP Visits finding aid](https://www.reaganlibrary.gov/sites/default/files/finding_aids_pdfs/219646.pdf), page 14, RAC Box 6. The February 20, 1985 entry is OPEN, with no DIGITIZED label.

The two attributed summaries paraphrase [Reagan and Thatcher’s public remarks on February 20, 1985](https://www.reaganlibrary.gov/archives/speech/remarks-following-discussions-prime-minister-margaret-thatcher-united-kingdom): Reagan paragraph 3 on INF deployments, Thatcher paragraph 4 on balanced arms reductions and security. Both speakers appear in the same public event; these are not independent private meeting records. Official sources checked September 27, 2026. The question about private discussion and the proposed follow-up requests are instructional research work, not claims about unseen documents.

## Verification

Production build passed. Full suite: 280 files / 2,096 tests. Model checks distinguish public statements from archival leads and unresolved private evidence, preserve drafts, require follow-ups, reject invalid classifications, and do not mutate progression on evaluation.

Browser scenarios passed at 1280×900, 390×844 touch, and 844×390 touch. Each begins with an isolated zero-progress library fixture, completes the existing request desk through its UI, opens comparison, checks missing/wrong evidence and missing follow-up feedback, saves and reloads a partial draft, files the completed table, reloads again, and verifies stage 2 with both barriers clear. Desktop additionally checks simulated D-pad/A classification and fullscreen. No page errors or horizontal overflow. Player placement is controlled for station access; this is not a new navigation or whole-campaign claim.

Inspected desktop, phone, and landscape source/table screenshots. Standard headed skill client reached PresidentialLibraryScene, but its canvas capture remained black as in prior runs; compositor screenshots provide visual evidence. Physical iPhone/controller behavior and subjective audio quality are unverified.

Local only. Other libraries retain their earlier comparison interactions.
