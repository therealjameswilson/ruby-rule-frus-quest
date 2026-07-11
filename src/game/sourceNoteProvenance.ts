import type { ChoiceOption } from "./types";

export type SourceNoteProvenancePromptId =
  | "repository"
  | "collection"
  | "folder";

export interface SourceNoteProvenancePrompt {
  id: SourceNoteProvenancePromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface SourceNoteProvenanceEvaluation {
  ok: boolean;
  prompt: SourceNoteProvenancePrompt;
  message: string;
}

export interface SourceNoteProvenanceStation {
  id: SourceNoteProvenancePromptId;
  order: 1 | 2 | 3;
  label: string;
  shortLabel: string;
  evidenceLabel: string;
}

export interface SourceNoteProvenanceTrailResult {
  ok: boolean;
  complete: boolean;
  nextStep: number;
  station: SourceNoteProvenanceStation;
  expectedStation: SourceNoteProvenanceStation;
  message: string;
}

export const SOURCE_NOTE_PROVENANCE_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";

export const SOURCE_NOTE_PROVENANCE_PROMPTS = [
  {
    id: "repository",
    question: "SOURCE NOTE 47: WHICH REPOSITORY CAN SUPPORT THE NOTE?",
    options: [
      { key: "A", label: "Fictional National Archives Collection", value: "national_archives" },
      { key: "B", label: "DANN-E guessed a missing repository", value: "danne_guess" },
      { key: "C", label: "No repository needed after routing", value: "none" }
    ],
    correctValue: "national_archives",
    sourceBasis: "FRUS rests on a thorough, accurate, and reliable documentary record from official sources.",
    successMessage: "Repository matched: the source note now points to a defensible archive trail.",
    failureMessage: "A source note cannot be verified by a guessed or missing repository."
  },
  {
    id: "collection",
    question: "SOURCE NOTE 47: WHICH COLLECTION LINE BELONGS IN THE CITATION?",
    options: [
      { key: "A", label: "Office Files of the Policy Planning Staff", value: "policy_planning" },
      { key: "B", label: "Shortcut queue, no collection listed", value: "shortcut" },
      { key: "C", label: "Personal memory of the compiler", value: "memory" }
    ],
    correctValue: "policy_planning",
    sourceBasis: "Compilation depends on tracing documents to the records that preserve their context.",
    successMessage: "Collection matched: context travels with the document.",
    failureMessage: "A collection line cannot be replaced by memory or a shortcut queue."
  },
  {
    id: "folder",
    question: "SOURCE NOTE 47: WHICH FOLDER COMPLETES THE PROVENANCE TRAIL?",
    options: [
      { key: "A", label: "Alliance Consultation, February 1969", value: "alliance_consultation" },
      { key: "B", label: "Folder withheld without indication", value: "withheld" },
      { key: "C", label: "Publish first, cite later", value: "late_cite" }
    ],
    correctValue: "alliance_consultation",
    sourceBasis: "Kellogg standards reject undisclosed alteration and material omissions; the reader needs the real trail.",
    successMessage: "Folder matched: Source Note 47 is ready for a human citation stamp.",
    failureMessage: "The folder trail must be visible before the note can be stamped."
  }
] as const satisfies readonly SourceNoteProvenancePrompt[];

export const SOURCE_NOTE_PROVENANCE_STATIONS = [
  {
    id: "repository",
    order: 1,
    label: "Repository Ledger",
    shortLabel: "REPO",
    evidenceLabel: "NATIONAL ARCHIVES"
  },
  {
    id: "collection",
    order: 2,
    label: "Collection Register",
    shortLabel: "COLL",
    evidenceLabel: "POLICY PLANNING"
  },
  {
    id: "folder",
    order: 3,
    label: "Folder Tab",
    shortLabel: "FOLDER",
    evidenceLabel: "ALLIANCE CONSULTATION"
  }
] as const satisfies readonly SourceNoteProvenanceStation[];

export function getSourceNoteProvenancePrompt(step: number) {
  return SOURCE_NOTE_PROVENANCE_PROMPTS[Math.max(0, Math.min(SOURCE_NOTE_PROVENANCE_PROMPTS.length - 1, step))];
}

export function sourceNoteProvenanceComplete(step: number) {
  return step >= SOURCE_NOTE_PROVENANCE_PROMPTS.length;
}

export function getSourceNoteProvenanceStation(step: number) {
  const normalizedStep = Number.isFinite(step) ? Math.floor(step) : 0;
  return SOURCE_NOTE_PROVENANCE_STATIONS[
    Math.max(0, Math.min(SOURCE_NOTE_PROVENANCE_STATIONS.length - 1, normalizedStep))
  ];
}

export function inspectSourceNoteProvenanceStation(
  step: number,
  stationId: SourceNoteProvenancePromptId
): SourceNoteProvenanceTrailResult {
  const safeStep = Number.isFinite(step) ? Math.floor(step) : 0;
  const normalizedStep = Math.max(0, Math.min(SOURCE_NOTE_PROVENANCE_STATIONS.length, safeStep));
  const expectedStation = getSourceNoteProvenanceStation(normalizedStep);
  const station = SOURCE_NOTE_PROVENANCE_STATIONS.find((candidate) => candidate.id === stationId)
    ?? expectedStation;
  if (normalizedStep >= SOURCE_NOTE_PROVENANCE_STATIONS.length) {
    return {
      ok: true,
      complete: true,
      nextStep: SOURCE_NOTE_PROVENANCE_STATIONS.length,
      station,
      expectedStation,
      message: "The repository, collection, and folder trail is already complete."
    };
  }
  if (station.id !== expectedStation.id) {
    return {
      ok: false,
      complete: false,
      nextStep: normalizedStep,
      station,
      expectedStation,
      message: `Trace the ${expectedStation.label.toLowerCase()} next.`
    };
  }
  const nextStep = normalizedStep + 1;
  const prompt = getSourceNoteProvenancePrompt(normalizedStep);
  return {
    ok: true,
    complete: sourceNoteProvenanceComplete(nextStep),
    nextStep,
    station,
    expectedStation,
    message: prompt.successMessage
  };
}

export function evaluateSourceNoteProvenanceAnswer(
  promptId: SourceNoteProvenancePromptId,
  value?: string
): SourceNoteProvenanceEvaluation {
  const prompt = SOURCE_NOTE_PROVENANCE_PROMPTS.find((candidate) => candidate.id === promptId)
    ?? SOURCE_NOTE_PROVENANCE_PROMPTS[0];
  const ok = value === prompt.correctValue;
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage
  };
}
