# Manuscript packet excerpts

Added six explicitly fictional sample excerpts to the two existing selection packets. Players can compare an instruction, dissent, and evidence of unsuccessful implementation against repetitive daily summaries and a detail suitable for annotation. No named volume, historical quotation, new mandatory gate, or selection-rule change.

Validation:
- Production build and 282 files / 2,114 tests passed.
- `qa-manuscript-desk.mjs`: desktop1280×900, touch390×844 and touch844×390 fixtures pass rejected incomplete/over-budget selections, reversible placement, draft save/reload, and downstream chapter/review/revision/DPD handoff. Zero browser errors. These are seeded workflow fixtures; not a fresh earned campaign.
- Desktop controller polling: Down scrolls tall packet text; Right moves between controls; A selects/files; B saves/leaves. Initial test assumed exactly two Down presses reach Submit, which stopped being true with longer cards. Updated it to verify reading-scroll and direct-focus behavior separately. A subsequent assertion was corrected to use textContent, since innerText reflects CSS uppercase. No runtime input changes were needed.
- Independent375×667/844×390 fixtures bring each of six excerpts completely inside the scroll viewport, with unchanged selection state. Screenshots `/tmp/frus-excerpts-{phone,landscape}-{2,5}.png` inspected. Main desk screenshots under `/tmp/frus-manuscript-excerpts-final/` also inspected.
- Standard client Archive movement x138 in explore mode; known native screenshot black, compositor evidence used.

No physical controller/iPhone or novice-comprehension validation claimed. Local only.
