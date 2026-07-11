import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption, DocumentCandidate } from "./types";

export type DocumentSelectionPromptId = "candidate_set";
export type DocumentSelectionAnswer = "balanced_record" | "public_only" | "low_risk_only";

export interface DocumentSelectionPrompt {
  id: DocumentSelectionPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: DocumentSelectionAnswer;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface DocumentSelectionEvaluation {
  ok: boolean;
  prompt: DocumentSelectionPrompt;
  selectedDocumentIds: string[];
  documentPoints: number;
  message: string;
  violation: StandardViolation | null;
}

export const DOCUMENT_SELECTION_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";
export const DOCUMENT_SELECTION_MIN_SIGNIFICANCE = 60;
export const DOCUMENT_SELECTION_POINT_VALUE = 14;

export const DOCUMENT_SELECTION_PROMPT = {
  id: "candidate_set",
  question: "CANDIDATE SELECTION: WHICH SET BELONGS IN THE VOLUME?",
  options: [
    { key: "A", label: "High-value records, including hard equities", value: "balanced_record" },
    { key: "B", label: "Only already-public, low-friction records", value: "public_only" },
    { key: "C", label: "Only low-risk records that avoid defects", value: "low_risk_only" }
  ],
  correctValue: "balanced_record",
  sourceBasis: "FRUS must be thorough, accurate, reliable, and must omit no facts of major importance or conceal policy defects.",
  successMessage: "Balanced set selected: significant records and hard evidence stay in the volume.",
  failureMessage: "Selection cannot avoid hard records merely because they slow review."
} as const satisfies DocumentSelectionPrompt;

function byId(documents: readonly DocumentCandidate[], ids: readonly string[]) {
  const idSet = new Set(ids);
  return documents.filter((document) => idSet.has(document.id)).map((document) => document.id);
}

export function recommendedCandidateIds(documents: readonly DocumentCandidate[]) {
  return documents
    .filter((document) => (
      document.significance >= DOCUMENT_SELECTION_MIN_SIGNIFICANCE
      && (
        document.uniqueness >= 50
        || document.sensitivityRisk >= 40
        || document.annotationNeeded
      )
    ))
    .map((document) => document.id);
}

export function evaluateDocumentSelectionAnswer(
  value: string | undefined,
  documents: readonly DocumentCandidate[]
): DocumentSelectionEvaluation {
  const ok = value === DOCUMENT_SELECTION_PROMPT.correctValue;
  if (ok) {
    return {
      ok: true,
      prompt: DOCUMENT_SELECTION_PROMPT,
      selectedDocumentIds: recommendedCandidateIds(documents),
      documentPoints: DOCUMENT_SELECTION_POINT_VALUE,
      message: DOCUMENT_SELECTION_PROMPT.successMessage,
      violation: null
    };
  }

  const publicOnly = documents
    .filter((document) => document.citationComplete && document.sensitivityRisk < 25)
    .map((document) => document.id);
  const lowRiskOnly = documents
    .filter((document) => document.sensitivityRisk < 20)
    .sort((a, b) => b.significance - a.significance)
    .slice(0, 2)
    .map((document) => document.id);
  return {
    ok: false,
    prompt: DOCUMENT_SELECTION_PROMPT,
    selectedDocumentIds: value === "public_only"
      ? publicOnly
      : value === "low_risk_only"
        ? lowRiskOnly
        : byId(documents, []),
    documentPoints: 0,
    message: value === "public_only"
      ? "Public-only selection omits evidence-bound material facts."
      : DOCUMENT_SELECTION_PROMPT.failureMessage,
    violation: value === "public_only" ? "omitted_material_fact" : "concealed_policy_defect"
  };
}
