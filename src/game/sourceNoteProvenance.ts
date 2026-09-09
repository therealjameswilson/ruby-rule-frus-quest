import type { ChoiceOption } from "./types";
import { ABOUT_SERIES_FIRST_FOOTNOTE_RULE, ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { SOURCE_NOTE_47_LOCATOR } from "./sourceNote47";

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
  foundMask: number;
  station: SourceNoteProvenanceStation;
  message: string;
}

export const SOURCE_NOTE_PROVENANCE_SOURCE_URL = ABOUT_SERIES_SOURCE.url;

export const SOURCE_NOTE_PROVENANCE_PROMPTS = [
  {
    id: "repository",
    question: "SOURCE NOTE 47: WHICH REPOSITORY CAN SUPPORT THE NOTE?",
    options: [
      { key: "A", label: SOURCE_NOTE_47_LOCATOR.repository, value: "national_archives" },
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
      { key: "A", label: SOURCE_NOTE_47_LOCATOR.collection, value: "policy_planning" },
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
    question: "FIRST FOOTNOTE: KEEP WHICH DETAILS?",
    options: [
      { key: "A", label: "Keep the complete metadata packet", value: "complete_first_footnote" },
      { key: "B", label: "Keep only the archive path", value: "archive_path_only" }
    ],
    correctValue: "complete_first_footnote",
    sourceBasis: ABOUT_SERIES_FIRST_FOOTNOTE_RULE,
    successMessage: "First footnote complete: Source Note 47 is ready for a human citation stamp.",
    failureMessage: "The first footnote still lacks required provenance and reader evidence."
  }
] as const satisfies readonly SourceNoteProvenancePrompt[];

export const SOURCE_NOTE_PROVENANCE_STATIONS = [
  {
    id: "repository",
    order: 1,
    label: "Repository Ledger",
    shortLabel: "ARCHIVE",
    evidenceLabel: "NATIONAL ARCHIVES"
  },
  {
    id: "collection",
    order: 2,
    label: "Collection Register",
    shortLabel: "FILES",
    evidenceLabel: "POLICY PLANNING"
  },
  {
    id: "folder",
    order: 3,
    label: "Folder Tab",
    shortLabel: "FOLDER",
    evidenceLabel: SOURCE_NOTE_47_LOCATOR.folder.toUpperCase()
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

type Progress = Readonly<Record<string, number>>;
const ALL_CLUES = (1 << SOURCE_NOTE_PROVENANCE_STATIONS.length) - 1;

function boundedInteger(value: number | undefined, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
}

export function readSourceNoteTrail(progress: Progress) {
  // Older saves inspected a prefix. Once a mask exists, the step is a count,
  // not an index: combining it with prefix bits would invent unvisited clues.
  const legacyMask = (1 << boundedInteger(progress.sourceNoteProvenanceStep, 3)) - 1;
  const foundMask = progress.sourceNoteProvenanceComplete === 1 ? ALL_CLUES
    : progress.sourceNoteProvenanceMask === undefined ? legacyMask
      : boundedInteger(progress.sourceNoteProvenanceMask, ALL_CLUES);
  const found = SOURCE_NOTE_PROVENANCE_STATIONS.filter(station => foundMask & (1 << (station.order - 1)));
  const missing = SOURCE_NOTE_PROVENANCE_STATIONS.filter(station => !(foundMask & (1 << (station.order - 1))));
  return { foundMask, found, missing, ready: missing.length === 0 };
}

export function inspectSourceNoteProvenanceStation(
  progress: Progress,
  stationId: SourceNoteProvenancePromptId
): SourceNoteProvenanceTrailResult {
  const trail = readSourceNoteTrail(progress);
  const station = SOURCE_NOTE_PROVENANCE_STATIONS.find(candidate => candidate.id === stationId)!;
  const bit = 1 << (station.order - 1);
  const ok = !(trail.foundMask & bit);
  const nextStep = trail.found.length + (ok ? 1 : 0);
  return {
    ok,
    complete: nextStep === SOURCE_NOTE_PROVENANCE_STATIONS.length,
    nextStep,
    foundMask: trail.foundMask | bit,
    station,
    message: `${station.label}: ${SOURCE_NOTE_47_LOCATOR[station.id]}. ${ok ? "Clue recorded" : "Already recorded"}; check it at the research table.`
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
