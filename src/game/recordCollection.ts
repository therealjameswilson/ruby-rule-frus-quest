import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type RecordCollectionPromptId =
  | "identify_search"
  | "copy_or_note"
  | "context_records";

export interface RecordCollectionPrompt {
  id: RecordCollectionPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface RecordCollectionEvaluation {
  ok: boolean;
  prompt: RecordCollectionPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const RECORD_COLLECTION_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";
export const FIELD_CABLE_COLLECTION_DOCUMENT_ID = "telegram_001";
export const FIELD_CABLE_COLLECTION_POINT_VALUE = 3;
export const FIELD_CABLE_COLLECTION_STEP = 1;
export const FIELD_CABLE_COLLECTION_SOURCE_BASIS =
  "The FRUS stages page says compilers identify important records, search for them, and make copies or notes of documents likely to be selected for publication or needed for context.";

export interface FieldCableCollectionResult {
  alreadyLogged: boolean;
  documentId: typeof FIELD_CABLE_COLLECTION_DOCUMENT_ID;
  documentPoints: number;
  nextRecordCollectionStep: number;
  sourceUrl: string;
  sourceBasis: string;
  message: string;
}

export const RECORD_COLLECTION_PROMPTS = [
  {
    id: "identify_search",
    question: "COLLECTION: WHAT COMES BEFORE SELECTION?",
    options: [
      { key: "A", label: "Identify important records and search for them", value: "identify_search" },
      { key: "B", label: "Select the first easy folder", value: "easy_folder" },
      { key: "C", label: "Let StateChat harvest without review", value: "machine_harvest" }
    ],
    correctValue: "identify_search",
    sourceBasis: "The FRUS stages page says compilers identify important records to be consulted and search for them.",
    successMessage: "Collection route logged: important records are identified and searched before selection.",
    failureMessage: "Collection cannot start from an easy folder or unreviewed machine harvest."
  },
  {
    id: "copy_or_note",
    question: "COLLECTION: WHAT DO YOU KEEP FROM THE SEARCH?",
    options: [
      { key: "A", label: "Copies or notes for likely publication and context", value: "copies_notes_context" },
      { key: "B", label: "Only the final documents already chosen", value: "selected_only" },
      { key: "C", label: "Everything, even if it stalls the deadline", value: "copy_everything" }
    ],
    correctValue: "copies_notes_context",
    sourceBasis: "Compilers make copies or take notes of documents likely to be selected, or needed to contextualize the volume.",
    successMessage: "Collection notes filed: likely documents and context records are both preserved.",
    failureMessage: "Collection needs both candidate records and context, without turning every file into a deadline sink."
  },
  {
    id: "context_records",
    question: "COLLECTION: WHY KEEP BACKGROUND RECORDS?",
    options: [
      { key: "A", label: "They contextualize the volume even if not printed", value: "contextualize_volume" },
      { key: "B", label: "They can be ignored after selection", value: "ignore_background" },
      { key: "C", label: "They are useful only if already public", value: "public_only_context" }
    ],
    correctValue: "contextualize_volume",
    sourceBasis: "The stages page names background information necessary to contextualize the volume as part of collection.",
    successMessage: "Context trail logged: background records now support the selected document set.",
    failureMessage: "Background records are part of the evidence trail, not disposable scenery."
  }
] as const satisfies readonly RecordCollectionPrompt[];

export function getRecordCollectionPrompt(step: number) {
  return RECORD_COLLECTION_PROMPTS[Math.max(0, Math.min(RECORD_COLLECTION_PROMPTS.length - 1, step))];
}

export function recordCollectionComplete(step: number) {
  return step >= RECORD_COLLECTION_PROMPTS.length;
}

export function logFieldCableCollection(
  currentRecordCollectionStep = 0,
  alreadyLogged = false
): FieldCableCollectionResult {
  return {
    alreadyLogged,
    documentId: FIELD_CABLE_COLLECTION_DOCUMENT_ID,
    documentPoints: alreadyLogged ? 0 : FIELD_CABLE_COLLECTION_POINT_VALUE,
    nextRecordCollectionStep: Math.max(currentRecordCollectionStep, FIELD_CABLE_COLLECTION_STEP),
    sourceUrl: RECORD_COLLECTION_SOURCE_URL,
    sourceBasis: FIELD_CABLE_COLLECTION_SOURCE_BASIS,
    message: alreadyLogged
      ? "Embassy cable already logged: the telegram candidate remains in the collection notes."
      : "Embassy cable logged: copied a likely telegram candidate and preserved context notes."
  };
}

export function evaluateRecordCollectionAnswer(
  promptId: RecordCollectionPromptId,
  value?: string
): RecordCollectionEvaluation {
  const prompt = RECORD_COLLECTION_PROMPTS.find((candidate) => candidate.id === promptId) ?? RECORD_COLLECTION_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "copy_everything") violation = "missed_30_year_deadline";
    else if (value === "machine_harvest") violation = "altered_text";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
