import type { ProcessItemId, ProcessStampId } from "./constants";
import type { DocumentCandidate, ReviewStatus, VolumeWorkflowState } from "./types";
import { AI_ANNOTATION_REVIEW_SOURCE_URL } from "./aiAnnotationReview";
import { ANNOTATION_DRAFTING_SOURCE_URL } from "./annotationDrafting";
import { CHAPTER_RELEASE_STATUS_SOURCE_URL } from "./chapterReleaseStatus";
import { CLEARANCE_PROCEDURE_SOURCE_URL } from "./clearanceProcedure";
import { DIGITAL_RELEASE_SOURCE_URL } from "./digitalRelease";
import { EDITORIAL_METHODOLOGY_SOURCE_URL } from "./editorialMethodology";
import { EDITORIAL_TREATMENT_SOURCE_URL } from "./editorialTreatment";
import { EO13526_REVIEW_SOURCE_URL } from "./eo13526Review";
import { FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL } from "./foreignGovernmentPermission";
import { buckramGateOpen, crystalsEarned, totalEquities } from "./frusProgression";
import { GPO_PUBLICATION_SOURCE_URL } from "./gpoPublication";
import { GPO_SEGMENT_ASSEMBLY_SOURCE_URL } from "./gpoSegmentAssembly";
import { FRONT_MATTER_ASSEMBLY_SOURCE_URL } from "./frontMatterAssembly";
import { getResearchCoverageReadout, researchCoverageComplete, type ResearchCoverageReadout } from "./researchCoverage";
import { INDEX_DOCKET_SOURCE_URL } from "./indexDocket";
import { KELLOGG_CERTIFICATION_SOURCE_URL } from "./kelloggCertification";
import { PUBLIC_CITATION_CARD_SOURCE_URL } from "./publicCitationCard";
import { PUBLICATION_FUNDING_SOURCE_URL } from "./publicationFundingQueue";
import { READER_AID_REGISTERS_SOURCE_URL } from "./readerAidRegisters";
import { RECORD_COLLECTION_SOURCE_URL } from "./recordCollection";
import { RECORDS_ACCESS_SOURCE_URL } from "./recordsAccess";
import { RELEASE_CALENDAR_SOURCE_URL } from "./releaseCalendar";
import { REPOSITORY_COVERAGE_MAP_SOURCE_URL } from "./repositoryCoverageMap";
import { RESEARCH_CHARTER_SOURCE_URL } from "./researchCharter";
import { SELECTION_DOCKET_SOURCE_URL } from "./selectionDocket";
import { SERIES_CONCEPT_SOURCE_URL } from "./seriesConcept";
import { SOURCE_NOTE_PROVENANCE_SOURCE_URL } from "./sourceNoteProvenance";
import { TYPEFLOW_ORDER_SOURCE_URL } from "./typeflowOrder";
import { TYPESETTING_PREPARATION_SOURCE_URL } from "./typesettingPreparation";
import { TYPESETTER_CORRECTIONS_SOURCE_URL } from "./typesetterCorrections";
import { TYPESETTER_PROOF_SOURCE_URL } from "./typesetterProof";
import { VOLUME_CONCEPT_SOURCE_URL } from "./volumeConcept";
import { WITHHOLDING_APPEAL_SOURCE_URL } from "./withholdingAppeal";

export type FrusProductionBoardStepId =
  | "series_concept"
  | "volume_concept"
  | "records_access"
  | "research_charter"
  | "record_collection"
  | "repository_coverage_map"
  | "research_selection"
  | "source_notes"
  | "annotation"
  | "manuscript_review"
  | "clearance_procedure"
  | "eo13526_review"
  | "declassification_review"
  | "foreign_permissions"
  | "withholding_appeals"
  | "agency_referrals"
  | "advisory_monitoring"
  | "ai_annotation_review"
  | "editorial_methodology"
  | "kellogg_editing"
  | "modern_typeflow_order"
  | "typesetting_preparation"
  | "typesetter_proof"
  | "front_matter_assembly"
  | "reader_aid_registers"
  | "index_docket"
  | "typesetter_corrections"
  | "kellogg_final_certification"
  | "gpo_segment_assembly"
  | "gpo_publication"
  | "publication_funding"
  | "chapter_release_status"
  | "digital_release"
  | "public_citation"
  | "release_calendar"
  | "publication_30_year";

export type FrusProductionBoardStatus = "complete" | "active" | "locked";

export interface FrusProductionBoardContext {
  volumeWorkflowState: VolumeWorkflowState;
  documentCandidates: readonly DocumentCandidate[];
  processStamps: readonly ProcessStampId[];
  heldProcessItems: ReadonlySet<ProcessItemId>;
  documentPoints: number;
  reliability: number;
  volumeFragments: readonly string[];
  finalGatePublished: boolean;
  hacReviewComplete: boolean;
  aiAnnotationReviewComplete: boolean;
  sourceNoteProvenanceComplete: boolean;
  annotationDraftingComplete: boolean;
  foreignGovernmentPermissionComplete: boolean;
  withholdingAppealComplete: boolean;
  editorialMethodologyComplete: boolean;
  editorialTreatmentComplete: boolean;
  typeflowOrderComplete: boolean;
  typesettingPreparationComplete: boolean;
  typesetterProofComplete: boolean;
  manuscriptReviewComplete: boolean;
  clearanceProcedureComplete: boolean;
  eo13526ReviewComplete: boolean;
  recordsAccessComplete: boolean;
  researchCharterComplete: boolean;
  recordCollectionComplete: boolean;
  repositoryCoverageMapComplete: boolean;
  selectionDocketComplete: boolean;
  seriesConceptComplete: boolean;
  volumeConceptComplete: boolean;
  chapterReleaseComplete: boolean;
  digitalReleaseComplete: boolean;
  publicCitationComplete: boolean;
  releaseCalendarComplete: boolean;
  frontMatterAssemblyComplete: boolean;
  readerAidRegistersComplete: boolean;
  indexDocketComplete: boolean;
  typesetterCorrectionsComplete: boolean;
  kelloggFinalCertificationComplete: boolean;
  gpoSegmentAssemblyComplete: boolean;
  gpoPublicationComplete: boolean;
  publicationFundingComplete: boolean;
}

export interface FrusProductionBoardStep {
  id: FrusProductionBoardStepId;
  label: string;
  shortLabel: string;
  sourceBasis: string;
  sourceUrl: string;
  gameplayTask: string;
}

export interface FrusProductionBoardStepReadout extends FrusProductionBoardStep {
  status: FrusProductionBoardStatus;
  complete: boolean;
  locked: boolean;
}

export interface FrusProductionBoardReadout {
  completed: number;
  total: number;
  nextStep: FrusProductionBoardStepReadout | null;
  steps: FrusProductionBoardStepReadout[];
  sourceUrls: string[];
  researchCoverage: ResearchCoverageReadout;
}

const ABOUT_FRUS_URL = "https://history.state.gov/historicaldocuments/about-frus";
const HAC_URL = "https://history.state.gov/about/hac/intro";
const FRUS_STAGES_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const FRUS_PRODUCTION_BOARD_STEPS = [
  {
    id: "series_concept",
    label: "Grand conceptualization",
    shortLabel: "GRD",
    sourceBasis: "FRUS work begins with an organizational scheme for the series as a whole.",
    sourceUrl: SERIES_CONCEPT_SOURCE_URL,
    gameplayTask: "File the whole-series plan at the Scope / Selection Desk before drafting the volume charter."
  },
  {
    id: "volume_concept",
    label: "Volume conceptualization",
    shortLabel: "VOL",
    sourceBasis: "Compilers determine the parameters of the individual volume and use contextual accounts to shape collection and selection.",
    sourceUrl: VOLUME_CONCEPT_SOURCE_URL,
    gameplayTask: "Define the volume remit and strategy sources at the Scope / Selection Desk."
  },
  {
    id: "records_access",
    label: "20-year records access",
    shortLabel: "20Y",
    sourceBasis: "OH historians get full and complete access to pertinent records at 20 years.",
    sourceUrl: RECORDS_ACCESS_SOURCE_URL,
    gameplayTask: "File the 20-year access authorization before the Scope Charter opens collection."
  },
  {
    id: "research_charter",
    label: "Scope charter",
    shortLabel: "SCP",
    sourceBasis: "OH historians plan the scope, content, source route, and hard questions of a volume before collection and selection narrow the record.",
    sourceUrl: RESEARCH_CHARTER_SOURCE_URL,
    gameplayTask: "File the scope, source route, and Kellogg standards at the Scope / Selection Desk before collection begins."
  },
  {
    id: "record_collection",
    label: "Collection",
    shortLabel: "COL",
    sourceBasis: "Compilers identify important records, search for them, and copy or note records for publication or context.",
    sourceUrl: RECORD_COLLECTION_SOURCE_URL,
    gameplayTask: "File the archive collection pass before choosing the final candidate set."
  },
  {
    id: "repository_coverage_map",
    label: "Repository coverage map",
    shortLabel: "MAP",
    sourceBasis: "FRUS research covers White House/NSC, State, Defense, CIA, other agency, and private-papers source lanes.",
    sourceUrl: REPOSITORY_COVERAGE_MAP_SOURCE_URL,
    gameplayTask: "File the repository coverage map so source lanes and visible gaps are known before selection narrows the record."
  },
  {
    id: "research_selection",
    label: "Selection docket",
    shortLabel: "SEL",
    sourceBasis: "Selection narrows collected records into a printed subset, avoids reprinting Supplemental FRUS Submissions, and uses annotation to mitigate selectivity.",
    sourceUrl: SELECTION_DOCKET_SOURCE_URL,
    gameplayTask: "Select a balanced candidate set, document the subset rationale, check supplemental-submission duplicates, and bridge omitted context in annotation."
  },
  {
    id: "source_notes",
    label: "Source-note provenance",
    shortLabel: "SRC",
    sourceBasis: "FRUS source notes must preserve a defensible provenance trail: repository, collection, and folder cannot be guessed or deferred.",
    sourceUrl: SOURCE_NOTE_PROVENANCE_SOURCE_URL,
    gameplayTask: "Carry Source Note 47 to the research table, verify repository/collection/folder, then apply the Citation Stamp."
  },
  {
    id: "annotation",
    label: "Annotation drafting",
    shortLabel: "ANN",
    sourceBasis: "Annotation provides provenance plus context about persons, events, policies, references, and attachments.",
    sourceUrl: ANNOTATION_DRAFTING_SOURCE_URL,
    gameplayTask: "Draft expanded annotations at the research table before manuscript review."
  },
  {
    id: "manuscript_review",
    label: "Manuscript review",
    shortLabel: "REV",
    sourceBasis: "FRUS manuscripts receive human review for completeness, cohesion, concision, content appropriateness, and annotation accuracy.",
    sourceUrl: FRUS_STAGES_URL,
    gameplayTask: "Run the FRUS Cart manuscript review: first-pass recommendations, then series assessment."
  },
  {
    id: "clearance_procedure",
    label: "Clearance procedure lane",
    shortLabel: "LANE",
    sourceBasis: "Declassification review became a separate accountable function, with agency-equity lanes routed to responsible reviewers.",
    sourceUrl: CLEARANCE_PROCEDURE_SOURCE_URL,
    gameplayTask: "Separate compilation from clearance review, route the correct era lane, and map agency equities before applying the release standard."
  },
  {
    id: "eo13526_review",
    label: "E.O. 13526 release review",
    shortLabel: "EO",
    sourceBasis: "Reviewers apply E.O. 13526 by releasing all information subject only to current national security requirements, with visible accounting.",
    sourceUrl: EO13526_REVIEW_SOURCE_URL,
    gameplayTask: "Apply the E.O. 13526 release standard and preserve concurrence plus withholding accounting before claiming clearance."
  },
  {
    id: "declassification_review",
    label: "Declassification review",
    shortLabel: "DEC",
    sourceBasis: "E.O. 13526 review releases all information subject only to current national security requirements, with concurrence and visible accounting.",
    sourceUrl: EO13526_REVIEW_SOURCE_URL,
    gameplayTask: "Route OpenNet/ClassNet issues, apply the release standard, and earn the Clearance Token."
  },
  {
    id: "foreign_permissions",
    label: "Foreign-government permission",
    shortLabel: "FGP",
    sourceBasis: "Foreign-government information selected for publication may require permission before the volume proceeds.",
    sourceUrl: FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL,
    gameplayTask: "Flag foreign-government information and preserve a visible permission or withholding note."
  },
  {
    id: "withholding_appeals",
    label: "Withholding and appeal review",
    shortLabel: "APP",
    sourceBasis: "Declassification review may withhold whole documents or excise portions; contested withholding needs a visible review outcome.",
    sourceUrl: WITHHOLDING_APPEAL_SOURCE_URL,
    gameplayTask: "Route the whole-document withholding appeal before marking partial excisions."
  },
  {
    id: "agency_referrals",
    label: "Agency referrals",
    shortLabel: "REF",
    sourceBasis: "HAC advises on preparation and declassification; agency equities must resolve cleanly.",
    sourceUrl: HAC_URL,
    gameplayTask: "Resolve every distinct agency equity and earn Concurrence."
  },
  {
    id: "advisory_monitoring",
    label: "HAC and process monitoring",
    shortLabel: "HAC",
    sourceBasis: "HAC monitors compilation, editing, preparation, declassification procedures, 30-year classified samples, and annual findings.",
    sourceUrl: HAC_URL,
    gameplayTask: "File the HAC hearing record: process oversight, declassification procedure review, 30-year sample, annual findings, and Kellogg standards."
  },
  {
    id: "ai_annotation_review",
    label: "AI annotation review SOP",
    shortLabel: "AIR",
    sourceBasis: "FRUS must remain thorough, accurate, and reliable; AI/StateChat support can flag mechanical annotation issues, but evidence-bound and final decisions stay with accountable humans.",
    sourceUrl: AI_ANNOTATION_REVIEW_SOURCE_URL,
    gameplayTask: "Run the terminal-only AI annotation review SOP before carrying StateChat flags into human review stations."
  },
  {
    id: "editorial_methodology",
    label: "Editorial methodology ledger",
    shortLabel: "MTH",
    sourceBasis: "The About-the-Series methodology fixes chronology, transcription, source-note metadata, and annotation rules before final treatment.",
    sourceUrl: EDITORIAL_METHODOLOGY_SOURCE_URL,
    gameplayTask: "File the methodology ledger: Washington-time order, exact transcription, source-footnote metadata, and editorial-note context."
  },
  {
    id: "kellogg_editing",
    label: "Editorial treatment",
    shortLabel: "KLG",
    sourceBasis: "Remaining textual issues are flagged for consultation; editing must improve readability without altering records.",
    sourceUrl: EDITORIAL_TREATMENT_SOURCE_URL,
    gameplayTask: "Resolve textual issues with human editorial treatment before the proof stamp can satisfy Kellogg standards."
  },
  {
    id: "modern_typeflow_order",
    label: "Modern typeflow order",
    shortLabel: "TYP",
    sourceBasis: "Since the late 1970s, compilations have been cleared in manuscript before proceeding to typesetting.",
    sourceUrl: TYPEFLOW_ORDER_SOURCE_URL,
    gameplayTask: "File the modern sequence: clear the manuscript first, then move into typesetting."
  },
  {
    id: "typesetting_preparation",
    label: "Typesetting preparation",
    shortLabel: "PREP",
    sourceBasis: "After completion, FRUS text is prepared for typesetting and document notes are reviewed for classification, drafting, date, and related metadata.",
    sourceUrl: TYPESETTING_PREPARATION_SOURCE_URL,
    gameplayTask: "Prepare the printer's copy: cleared text plus faithful document-note metadata before proof comparison."
  },
  {
    id: "typesetter_proof",
    label: "Typesetter proof",
    shortLabel: "PRF",
    sourceBasis: "After typesetting, pages are compared to original documents and remaining textual issues are flagged for compiler consultation.",
    sourceUrl: TYPESETTER_PROOF_SOURCE_URL,
    gameplayTask: "Compare the typeset pages to originals and preserve classification, drafting, date, and text metadata."
  },
  {
    id: "front_matter_assembly",
    label: "Front matter assembly",
    shortLabel: "ASM",
    sourceBasis: "Completed front matter frames the volume with preface, sources consulted, persons, abbreviations, and proofed pages.",
    sourceUrl: FRONT_MATTER_ASSEMBLY_SOURCE_URL,
    gameplayTask: "Assemble the publication apparatus at the Buckram Gate table before the index docket."
  },
  {
    id: "reader_aid_registers",
    label: "Reader-aid registers",
    shortLabel: "AID",
    sourceBasis: "Completed front matter includes lists of persons mentioned and abbreviations used in the text.",
    sourceUrl: READER_AID_REGISTERS_SOURCE_URL,
    gameplayTask: "File the persons-mentioned and abbreviations-used registers before indexing the proofed pages."
  },
  {
    id: "index_docket",
    label: "Index docket",
    shortLabel: "IDX",
    sourceBasis: "After typeset pages are compared to originals, an index is added as a reader aid before publication.",
    sourceUrl: INDEX_DOCKET_SOURCE_URL,
    gameplayTask: "Verify index entries, cross-references, and human-reviewed headings before final certification."
  },
  {
    id: "typesetter_corrections",
    label: "Typesetter correction docket",
    shortLabel: "FIX",
    sourceBasis: "Once remaining editing issues are resolved with the typesetter, the volume is then finished.",
    sourceUrl: TYPESETTER_CORRECTIONS_SOURCE_URL,
    gameplayTask: "Resolve flagged textual issues with compiler/typesetter consultation before final certification."
  },
  {
    id: "kellogg_final_certification",
    label: "Final Kellogg certification",
    shortLabel: "CRT",
    sourceBasis: "The final volume must be thorough, accurate, reliable, and free of undisclosed deletions, material omissions, or concealed policy defects.",
    sourceUrl: KELLOGG_CERTIFICATION_SOURCE_URL,
    gameplayTask: "Run the final human certification checklist before any GPO packet leaves the office."
  },
  {
    id: "gpo_segment_assembly",
    label: "GPO segment assembly",
    shortLabel: "SEG",
    sourceBasis: "FRUS volumes could move to GPO in prepared segments; the final segment and apparatus must stay intact before binding.",
    sourceUrl: GPO_SEGMENT_ASSEMBLY_SOURCE_URL,
    gameplayTask: "Submit prepared publication segments, preserve the final index/apparatus, and bind the complete certified volume."
  },
  {
    id: "gpo_publication",
    label: "GPO publication handoff",
    shortLabel: "GPO",
    sourceBasis: "The Department contracts with the Government Printing Office to prepare and publish FRUS volumes.",
    sourceUrl: GPO_PUBLICATION_SOURCE_URL,
    gameplayTask: "Complete the GPO handoff: print and bind the finished ruby buckram volume."
  },
  {
    id: "publication_funding",
    label: "Publication funding queue",
    shortLabel: "FND",
    sourceBasis: "Lack of funding can delay publication of fully prepared FRUS volumes, but the prepared record must remain intact.",
    sourceUrl: PUBLICATION_FUNDING_SOURCE_URL,
    gameplayTask: "Route the fully prepared volume through the funding wait queue without cutting pages, hiding delay, or publishing an uncertified shortcut."
  },
  {
    id: "chapter_release_status",
    label: "Chapter release ledger",
    shortLabel: "CHP",
    sourceBasis: "The Status page tracks Planning, Research, Clearance, and Publication stages, plus volumes published incrementally as chapters clear.",
    sourceUrl: CHAPTER_RELEASE_STATUS_SOURCE_URL,
    gameplayTask: "File visible chapter status: cleared chapters, outstanding chapters, and the public Publication stage."
  },
  {
    id: "digital_release",
    label: "Digital edition release",
    shortLabel: "WEB",
    sourceBasis: "FRUS eBooks use persistent document numbers, and the digital edition needs a TEI-backed public release path.",
    sourceUrl: DIGITAL_RELEASE_SOURCE_URL,
    gameplayTask: "Prepare the history.state.gov digital release manifest after GPO handoff: document numbers, TEI master, and eBook catalog."
  },
  {
    id: "public_citation",
    label: "Public citation card",
    shortLabel: "CIT",
    sourceBasis: "The FRUS citation guide requires stable document numbers, complete citation elements, and canonical history.state.gov URLs.",
    sourceUrl: PUBLIC_CITATION_CARD_SOURCE_URL,
    gameplayTask: "Assemble the reader citation card: media-neutral document number, full publication elements, canonical URL, and legacy-digitization caution."
  },
  {
    id: "release_calendar",
    label: "Release calendar docket",
    shortLabel: "REL",
    sourceBasis: "The Status page lists current and previous-year releases, anticipated current-year releases, stages of production, and published volumes being digitized.",
    sourceUrl: RELEASE_CALENDAR_SOURCE_URL,
    gameplayTask: "File the public release-calendar docket: released volumes, anticipated releases, and digitization status."
  },
  {
    id: "publication_30_year",
    label: "30-year publication",
    shortLabel: "PUB",
    sourceBasis: "The statute mandates FRUS publication 30 years after the events documented.",
    sourceUrl: ABOUT_FRUS_URL,
    gameplayTask: "Open the Buckram Gate with all pendants, crystals, standards, fragments, and the Buckram Key."
  }
] as const satisfies readonly FrusProductionBoardStep[];

const VOLUME_STATE_ORDER: readonly VolumeWorkflowState[] = [
  "charter",
  "research",
  "candidate_selection",
  "source_note_verification",
  "annotation",
  "declassification_review",
  "referral_resolution",
  "editing",
  "proofing",
  "final_assembly",
  "published"
];

function stampSet(context: FrusProductionBoardContext) {
  return new Set(context.processStamps);
}

function volumeAtLeast(context: FrusProductionBoardContext, state: VolumeWorkflowState) {
  return VOLUME_STATE_ORDER.indexOf(context.volumeWorkflowState) >= VOLUME_STATE_ORDER.indexOf(state);
}

function hasDocumentAtOrBeyond(context: FrusProductionBoardContext, states: readonly string[]) {
  return context.documentCandidates.some((document) => states.includes(document.workflowState));
}

function hasSelectedDocument(context: FrusProductionBoardContext) {
  return context.documentCandidates.some((document) => document.selected || document.workflowState === "selected");
}

function hasAnyEquityResponse(context: FrusProductionBoardContext, predicate: (status: ReviewStatus) => boolean) {
  return context.documentCandidates.some((document) => document.equities.some((equity) => predicate(equity.response)));
}

function allDistinctEquitiesResolved(context: FrusProductionBoardContext) {
  const total = totalEquities(context.documentCandidates);
  return total > 0 && crystalsEarned(context.documentCandidates) === total;
}

function noUndisclosedDeletions(context: FrusProductionBoardContext) {
  return !context.documentCandidates.some((document) => document.undisclosedDeletion);
}

export function isFrusProductionBoardStepComplete(
  stepId: FrusProductionBoardStepId,
  context: FrusProductionBoardContext
) {
  const stamps = stampSet(context);
  switch (stepId) {
    case "series_concept":
      return context.seriesConceptComplete;
    case "volume_concept":
      return context.volumeConceptComplete;
    case "records_access":
      return context.recordsAccessComplete || stamps.has("rule") || volumeAtLeast(context, "research");
    case "research_charter":
      return context.researchCharterComplete
        || context.recordCollectionComplete
        || context.repositoryCoverageMapComplete
        || context.selectionDocketComplete
        || volumeAtLeast(context, "research");
    case "record_collection":
      return context.recordCollectionComplete;
    case "repository_coverage_map":
      return context.repositoryCoverageMapComplete;
    case "research_selection":
      return (context.selectionDocketComplete && context.documentPoints >= 12 && hasSelectedDocument(context) && researchCoverageComplete(context.documentCandidates))
        || hasDocumentAtOrBeyond(context, ["source_note_needed", "citation_verified", "annotation_needed"])
        || volumeAtLeast(context, "candidate_selection");
    case "source_notes":
      return context.sourceNoteProvenanceComplete
        || stamps.has("archive")
        || context.heldProcessItems.has("citation_stamp")
        || hasDocumentAtOrBeyond(context, ["citation_verified", "annotation_needed", "ready_for_review"]);
    case "annotation":
      return context.annotationDraftingComplete
        || hasDocumentAtOrBeyond(context, ["ready_for_review", "submitted_for_review", "referred", "cleared", "ready_for_proof", "proofed", "published"])
        || volumeAtLeast(context, "declassification_review");
    case "manuscript_review":
      return context.manuscriptReviewComplete
        || hasDocumentAtOrBeyond(context, ["ready_for_review", "submitted_for_review", "referred", "cleared", "ready_for_proof", "proofed", "published"])
        || volumeAtLeast(context, "declassification_review");
    case "clearance_procedure":
      return context.clearanceProcedureComplete || context.heldProcessItems.has("clearance_token") || stamps.has("network");
    case "eo13526_review":
      return context.eo13526ReviewComplete || context.heldProcessItems.has("clearance_token") || stamps.has("network");
    case "declassification_review":
      return stamps.has("network")
        || context.heldProcessItems.has("clearance_token")
        || hasAnyEquityResponse(context, (status) => status !== "not_submitted");
    case "foreign_permissions":
      return context.foreignGovernmentPermissionComplete
        || stamps.has("referral")
        || context.heldProcessItems.has("concurrence_slip")
        || volumeAtLeast(context, "editing");
    case "withholding_appeals":
      return context.withholdingAppealComplete
        || stamps.has("referral")
        || context.heldProcessItems.has("concurrence_slip")
        || volumeAtLeast(context, "editing");
    case "agency_referrals":
      return stamps.has("referral")
        || context.heldProcessItems.has("concurrence_slip")
        || allDistinctEquitiesResolved(context);
    case "advisory_monitoring":
      return context.hacReviewComplete || stamps.has("sop");
    case "ai_annotation_review":
      return context.aiAnnotationReviewComplete
        || stamps.has("sop")
        || context.editorialMethodologyComplete
        || context.editorialTreatmentComplete;
    case "editorial_methodology":
      return context.editorialMethodologyComplete;
    case "kellogg_editing":
      return context.editorialMethodologyComplete && context.editorialTreatmentComplete && stamps.has("proof") && context.reliability >= 70 && noUndisclosedDeletions(context);
    case "modern_typeflow_order":
      return context.finalGatePublished || context.typeflowOrderComplete;
    case "typesetting_preparation":
      return context.finalGatePublished || context.typesettingPreparationComplete;
    case "typesetter_proof":
      return context.finalGatePublished || context.typesetterProofComplete;
    case "front_matter_assembly":
      return context.finalGatePublished || context.frontMatterAssemblyComplete;
    case "reader_aid_registers":
      return context.finalGatePublished || context.readerAidRegistersComplete;
    case "index_docket":
      return context.finalGatePublished || context.indexDocketComplete;
    case "typesetter_corrections":
      return context.finalGatePublished || context.typesetterCorrectionsComplete;
    case "kellogg_final_certification":
      return context.finalGatePublished || context.kelloggFinalCertificationComplete;
    case "gpo_segment_assembly":
      return context.finalGatePublished || context.gpoSegmentAssemblyComplete || context.gpoPublicationComplete;
    case "gpo_publication":
      return context.finalGatePublished || context.gpoPublicationComplete;
    case "publication_funding":
      return context.finalGatePublished || context.publicationFundingComplete;
    case "chapter_release_status":
      return context.finalGatePublished || context.chapterReleaseComplete;
    case "digital_release":
      return context.finalGatePublished || (context.chapterReleaseComplete && context.digitalReleaseComplete);
    case "public_citation":
      return context.finalGatePublished || (context.digitalReleaseComplete && context.publicCitationComplete);
    case "release_calendar":
      return context.finalGatePublished || (context.publicCitationComplete && context.releaseCalendarComplete);
    case "publication_30_year":
      return context.finalGatePublished
        || (context.volumeWorkflowState === "published")
        || (
          buckramGateOpen(context.processStamps, context.documentCandidates)
          && context.heldProcessItems.has("buckram_key")
          && context.volumeFragments.length >= 5
          && context.chapterReleaseComplete
          && context.digitalReleaseComplete
          && context.publicCitationComplete
          && context.releaseCalendarComplete
          && context.typeflowOrderComplete
          && context.typesettingPreparationComplete
          && context.typesetterProofComplete
          && (context.sourceNoteProvenanceComplete || stamps.has("archive"))
          && (context.researchCharterComplete || context.recordCollectionComplete)
          && context.repositoryCoverageMapComplete
          && context.clearanceProcedureComplete
          && context.eo13526ReviewComplete
          && (context.aiAnnotationReviewComplete || stamps.has("sop"))
          && context.frontMatterAssemblyComplete
          && context.readerAidRegistersComplete
          && context.indexDocketComplete
          && context.typesetterCorrectionsComplete
          && context.kelloggFinalCertificationComplete
          && context.gpoSegmentAssemblyComplete
          && context.gpoPublicationComplete
          && context.publicationFundingComplete
          && context.reliability >= 70
          && stamps.has("proof")
          && noUndisclosedDeletions(context)
        );
  }
}

export function getFrusProductionBoardReadout(context: FrusProductionBoardContext): FrusProductionBoardReadout {
  const researchCoverage = getResearchCoverageReadout(context.documentCandidates);
  let foundActive = false;
  const steps = FRUS_PRODUCTION_BOARD_STEPS.map((step) => {
    const complete = isFrusProductionBoardStepComplete(step.id, context);
    const status: FrusProductionBoardStatus = complete ? "complete" : foundActive ? "locked" : "active";
    if (!complete && !foundActive) foundActive = true;
    return {
      ...step,
      status,
      complete,
      locked: status === "locked"
    };
  });
  const completed = steps.filter((step) => step.complete).length;
  return {
    completed,
    total: steps.length,
    nextStep: steps.find((step) => step.status === "active") ?? null,
    steps,
    sourceUrls: [...new Set([...steps.map((step) => step.sourceUrl), researchCoverage.sourceUrl])],
    researchCoverage
  };
}
