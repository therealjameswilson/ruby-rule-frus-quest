> September 27 update: the four fixed compiler assignments, volume-selection screen, volume-specific manuscript dialogue, and required-library gate have been removed. The holdings below remain optional library research examples. Existing assignment flags no longer constrain play. Earlier QA below describes the original implementation.

# Active compilation missions — September 26, 2026

The player-facing story remains an archival adventure. Kathy assigns a volume, DANN-E misfiles evidence and proposes shortcuts, Alex asks about his films, and Randolph's conference room is still too hot.

## Workflow basis

This revision uses the repository's existing transcription/mapping of the user-supplied August 2026 compilation SOP in `COMPILER_SOP_MISSION.md` and `src/game/compilerMission.ts`. The original DOCX was not available for a fresh reread in this checkout; no new internal SOP requirements are inferred. The existing ten ordered tasks and their approval authorities remain authoritative.

| Mission | Compiler work and completion evidence |
| --- | --- |
| Kathy / INBOX | Choose one of four active-volume remits. Route the volume plan, then obtain supervisory research-plan approval. |
| Archive Guide / source and annotation stations | Retain original provenance, distinguish document from finding-aid evidence, verify citations and supporting annotation. Existing physical packet work remains required. |
| Presidential library | Request a specific file, compare its scope and record types, prepare a source/access note, and file a research packet with explicit gaps. Four separate saved receipts; wrong answers do not advance. |
| NSC wing | Optional source-trail chambers use the same collection as the parent assignment. They cannot substitute for the four-step manuscript packet. |
| Archive east manuscript desk | Requires the chosen library packet on new assigned runs. Select policy-relevant documents within the existing illustrative page budget; assemble chapter annotation and numbered quotation backup. |
| Supervisor / GE-AGE review | First review of the volume precedes second review in the same marked copy. Revision follows both reviews. |
| Revision / DPD handoff | Address gaps and annotation, obtain front-matter review, address Joint Historian provenance/terminology recommendations for CIA equities, and complete the signed submission checklist. Handoff is not publication. |
| Alex Poster's office | Optional colleague discussion of source comparison/overlap after answering the film question. Does not grant formal review approval. |
| Randolph conference room | Optional coverage-meeting notes about chronology, decisions, agency perspectives and gaps. The heat hazard remains; dialogue pauses active movement. No review approval is awarded for entering the room. |
| Two Networks / referral vault | Existing downstream classification, agency-equity and referral work stays distinct from compiler access and from DPD submission. |
| Silent Read / final gate | Existing editorial, proof, human certification and publication checks remain. Defeating DANN-E does not replace them. These downstream phases are not attributed to the compilation SOP, which ends at DPD submission. |

The main desk offers a direct research-rail trip when the assigned packet is missing. Filing the packet offers a return to the Archive; exploration remains available. Existing advanced saves without a new assignment do not receive a retroactive lock.

## Verified volume and archival sources

All four volume pages and the [Status of the Series](https://history.state.gov/historicaldocuments/status-of-the-series) were checked on September 26, 2026 and list these volumes as **Being Researched**. This is a curated set, not every active volume or a claim about named compilers' assignments.

- [Reagan VIII: Western Europe, 1985–1988](https://history.state.gov/historicaldocuments/frus1981-88v08): [Executive Secretariat, NSC: VIP Visits finding aid](https://www.reaganlibrary.gov/sites/default/files/finding_aids_pdfs/219646.pdf), RAC Box 6, Thatcher visit February 20, 1985, folders (1)(2), PDF pages 13–14. The listed OPEN status is distinguished from DIGITIZED. The December 1984 visit is an out-of-period comparator, not silently included in the manuscript.
- [Bush 41 IV: Soviet Union, Russia, and Post-Soviet States: Policy](https://history.state.gov/historicaldocuments/frus1989-92v04): [Rice records finding aid](https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-condoleezza-rice-files), FOIA 2010-0156-F, Condoleezza Rice 1989–1990 Subject Files, CF00715-001, Arms Control [1], NAID 470424829. The official listing marks this entry On Site. The exercise explicitly asks the compiler to coordinate arms-control overlap and identify later-period gaps.
- [Clinton XVIII: Russia: High-Level Contacts](https://history.state.gov/historicaldocuments/frus1993-00v18): [Clinton Digital Library item 57569](https://clinton.presidentiallibraries.us/items/show/57569), MDR 2015-0782-M-2, NSC Cable, Email, and Records Management System. The item describes Clinton–Yeltsin memcons/telcons from April 21, 1996 through December 31, 1999. MDR and FOIA identifiers, event dates and upload dates, and this subset versus the whole volume are kept distinct.
- [Bush 43 XLIII: China, 2001–2004](https://history.state.gov/historicaldocuments/frus2001-08v43): [FOIA 2017-0023-F finding aid](https://www.georgewbushlibrary.gov/media/7324), NSC EP-3 records, March 15–April 30, 2001. The November 17, 2025 inventory lists 215 ARMS assets: 177 full releases, 22 partial releases, 16 withheld, with some classified material unprocessed. Players distinguish drafts/press guidance from underlying policy instructions.

The missions use published archival metadata. They do not invent quotations, document-level findings, presidential approvals, box numbers or unpublished contents. Collection-to-volume relevance is a game research choice, not a statement that a compiler has selected a particular record for publication. The full lead and official link are available from SOURCES and the companion field guide.

## Persistence

Library slots remain in their original order, including older optional background destinations. The four new dossiers store receipts under `libraryResearch_v2_<library>` and `nscResearch_v2_<library>` so earlier Iran-Contra, Africa, commons and terrorism packets remain intact without being relabeled as the new research. Assignment is saved separately as `compilerVolumeAssignment` (1–4). The game readout exposes the volume and individual research receipts under `compilerMission.volume`.
