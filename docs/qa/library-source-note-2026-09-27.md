# Working source-note assembly

Reagan library station 3 now produces a readable working note from the evidence used at station 2. Players identify the public remarks, date them, cite the online transcript actually used, and retain an explicit limit on interpreting private exchanges. The exact unexamined archival lead and both outstanding document requests go into a separate research log. Wrong document types, dates, source locations, and unsupported claims receive specific feedback without advancing the stage.

The official source is the [Reagan Library's February 20, 1985 public remarks transcript](https://www.reaganlibrary.gov/archives/speech/remarks-following-discussions-prime-minister-margaret-thatcher-united-kingdom). The folder lead comes from page 14 of the [VIP Visits finding aid](https://www.reaganlibrary.gov/sites/default/files/finding_aids_pdfs/219646.pdf), RAC Box 6. Both were checked during the preceding comparison implementation. This desk supplies a working research citation for that online source, not a claim that the final manuscript's citation style, selection, clearance, or editorial review is complete. No volume assignment is added.

Draft choices persist. Filing advances station 2 to 3 only; the final packet remains unfinished. Returning to the completed station opens the actual saved note in a read-only view. Old saves without a newly assembled note retain the prior receipt. Shared desk controls provide keyboard/controller navigation, touch scrolling, fullscreen handling, audio reading mix, and cleanup.

Production build passed. Full suite: 281 files / 2,098 tests before the final review-scroll adjustment. Model tests cover incorrect provenance/date/type/scope, required pending research, draft restoration, invalid values, and no progression mutations from evaluation.

Browser verification uses an isolated zero-progress library fixture and completes the request and comparison desks through visible controls before source-note work. Player position is set near stations for access; this is a station integration check rather than a navigation or full-campaign run. Scenarios cover draft reload, rejection of each misleading source-note field, missing pending research, filing, reload, and unchanged read-only review. Desktop adds simulated controller selection and fullscreen. Physical iPhone/controller validation remains open.

Local only. Other libraries' source-note stations remain unchanged.

Final browser run passed all three layouts after the review-scroll improvement. The Read/Review button now brings the note heading into the body viewport; checks assert this and preserve the filed note through reopening/closing. No page errors or horizontal overflow. Desktop, phone editor/note/review, and landscape screenshots were inspected. The standard headed skill client reached PresidentialLibraryScene with valid state and no recorded errors; its known black canvas capture persists, so compositor screenshots provide visual evidence.
