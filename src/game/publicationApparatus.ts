import type { ProcessStampId } from "./constants";
import type { DocumentCandidate } from "./types";
import { researchCoverageComplete } from "./researchCoverage";

export type PublicationApparatusComponentId =
  | "preface_scope"
  | "sources_consulted"
  | "persons_abbreviations"
  | "declassification_accounting"
  | "index_typeset_check"
  | "front_matter_assembly"
  | "typesetter_corrections";

export interface PublicationApparatusContext {
  processStamps: readonly ProcessStampId[];
  volumeFragments: readonly string[];
  documentCandidates: readonly DocumentCandidate[];
  documentPoints: number;
  typesettingPreparationComplete: boolean;
  typesetterProofComplete: boolean;
  indexDocketComplete: boolean;
  frontMatterAssemblyComplete: boolean;
  typesetterCorrectionsComplete: boolean;
}

export interface PublicationApparatusComponent {
  id: PublicationApparatusComponentId;
  label: string;
  shortLabel: string;
  sourceBasis: string;
  complete: boolean;
  requirement: string;
}

export interface PublicationApparatusReadout {
  sourceUrl: string;
  sourceBasis: string;
  complete: boolean;
  completed: number;
  total: number;
  components: PublicationApparatusComponent[];
  missing: PublicationApparatusComponent[];
  summary: string;
}

export const PUBLICATION_APPARATUS_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";
export const PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS = 20;

const APPARATUS_COMPONENTS = [
  {
    id: "preface_scope",
    label: "Preface and volume scope",
    shortLabel: "PREF",
    sourceBasis: "Front matter starts with a preface that frames the finished volume.",
    requirement: "File the Golden Rule charter and recover the Front Matter Fragment."
  },
  {
    id: "sources_consulted",
    label: "Sources consulted list",
    shortLabel: "SRC",
    sourceBasis: "The completed front matter lists the sources consulted.",
    requirement: "Complete repository coverage and recover the Source Note Fragment."
  },
  {
    id: "persons_abbreviations",
    label: "Persons and abbreviations lists",
    shortLabel: "PERS",
    sourceBasis: "The front matter includes persons mentioned and abbreviations used in the text.",
    requirement: "Earn enough document points for the reader apparatus and recover the Routing Fragment."
  },
  {
    id: "declassification_accounting",
    label: "Declassification accounting",
    shortLabel: "DECL",
    sourceBasis: "The edited text must account for declassification treatment before publication.",
    requirement: "Resolve referral review, recover the Referral Fragment, and leave no undisclosed deletion."
  },
  {
    id: "index_typeset_check",
    label: "Index and typeset proof check",
    shortLabel: "IDX",
    sourceBasis: "After text is prepared for typesetting, pages are checked against originals and an index is added as a reader aid.",
    requirement: "Complete proofing, prepare the printer's copy, run the typesetter proof, file the index docket, and recover the Proof Fragment."
  },
  {
    id: "front_matter_assembly",
    label: "Front matter assembly",
    shortLabel: "ASM",
    sourceBasis: "Before publication, the volume's front matter, reader aids, and proofed pages are assembled into the final apparatus.",
    requirement: "Run the front matter assembly sequence at the Buckram Gate publication table."
  },
  {
    id: "typesetter_corrections",
    label: "Typesetter correction docket",
    shortLabel: "FIX",
    sourceBasis: "Once remaining editing issues are resolved with the typesetter, the volume is then finished.",
    requirement: "Resolve remaining typesetter issues with compiler consultation before final certification."
  }
] as const satisfies ReadonlyArray<Omit<PublicationApparatusComponent, "complete">>;

function stampSet(context: PublicationApparatusContext) {
  return new Set(context.processStamps);
}

function fragmentSet(context: PublicationApparatusContext) {
  return new Set(context.volumeFragments);
}

function hasUndisclosedDeletion(context: PublicationApparatusContext) {
  return context.documentCandidates.some((document) => document.undisclosedDeletion);
}

function componentComplete(component: PublicationApparatusComponentId, context: PublicationApparatusContext) {
  const stamps = stampSet(context);
  const fragments = fragmentSet(context);
  switch (component) {
    case "preface_scope":
      return stamps.has("rule") && fragments.has("Front Matter Fragment");
    case "sources_consulted":
      return fragments.has("Source Note Fragment") && researchCoverageComplete(context.documentCandidates);
    case "persons_abbreviations":
      return fragments.has("Routing Fragment") && context.documentPoints >= PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS;
    case "declassification_accounting":
      return stamps.has("referral") && fragments.has("Referral Fragment") && !hasUndisclosedDeletion(context);
    case "index_typeset_check":
      return stamps.has("proof")
        && fragments.has("Proof Fragment")
        && context.typesettingPreparationComplete
        && context.typesetterProofComplete
        && context.indexDocketComplete;
    case "front_matter_assembly":
      return context.frontMatterAssemblyComplete;
    case "typesetter_corrections":
      return context.typesetterCorrectionsComplete;
  }
}

export function getPublicationApparatusReadout(context: PublicationApparatusContext): PublicationApparatusReadout {
  const components = APPARATUS_COMPONENTS.map((component) => ({
    ...component,
    complete: componentComplete(component.id, context)
  }));
  const missing = components.filter((component) => !component.complete);
  const complete = missing.length === 0;
  return {
    sourceUrl: PUBLICATION_APPARATUS_SOURCE_URL,
    sourceBasis: "FRUS final editing adds front matter, source/person/abbreviation lists, typesetting preparation, proof checks, final assembly, an index, and typesetter corrections before publication.",
    complete,
    completed: components.length - missing.length,
    total: components.length,
    components,
    missing,
    summary: complete
      ? "Publication apparatus complete: front matter, source aids, typesetting preparation, proof checks, assembly, index, and typesetter corrections are ready."
      : `Publication apparatus missing: ${missing.map((component) => component.shortLabel).join(", ")}.`
  };
}

export function publicationApparatusComplete(context: PublicationApparatusContext) {
  return getPublicationApparatusReadout(context).complete;
}
