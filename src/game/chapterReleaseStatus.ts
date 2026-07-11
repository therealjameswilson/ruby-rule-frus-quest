import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type ChapterReleasePromptId =
  | "production_stage"
  | "incremental_chapters"
  | "outstanding_chapters";

export interface ChapterReleasePrompt {
  id: ChapterReleasePromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface ChapterReleaseEvaluation {
  ok: boolean;
  prompt: ChapterReleasePrompt;
  message: string;
  violation: StandardViolation | null;
}

export const CHAPTER_RELEASE_STATUS_SOURCE_URL = "https://history.state.gov/historicaldocuments/status-of-the-series";

export const CHAPTER_RELEASE_PROMPTS = [
  {
    id: "production_stage",
    question: "STATUS LEDGER: WHICH STAGE MEANS A VOLUME IS RELEASED TO THE PUBLIC?",
    options: [
      { key: "A", label: "Publication", value: "publication" },
      { key: "B", label: "Clearance", value: "clearance" },
      { key: "C", label: "Research", value: "research" }
    ],
    correctValue: "publication",
    sourceBasis: "The Status page lists four broad stages: Planning, Research, Clearance, and Publication; Publication is when the volume is released to the public.",
    successMessage: "Stage ledger filed: public release belongs in Publication.",
    failureMessage: "Clearance or research status cannot be presented as public publication."
  },
  {
    id: "incremental_chapters",
    question: "STATUS LEDGER: HOW SHOULD CLEARED CHAPTERS MOVE ONLINE?",
    options: [
      { key: "A", label: "Publish cleared chapters with status tracking", value: "cleared_incremental" },
      { key: "B", label: "Wait silently until every chapter clears", value: "silent_wait" },
      { key: "C", label: "Let DANN-E fill uncleared chapters", value: "machine_fill" }
    ],
    correctValue: "cleared_incremental",
    sourceBasis: "The Status page says a growing number of volumes are published incrementally as individual chapters are cleared.",
    successMessage: "Incremental release logged: cleared chapters can appear while the ledger tracks the rest.",
    failureMessage: "Incremental release cannot hide status or invent uncleared chapter text."
  },
  {
    id: "outstanding_chapters",
    question: "STATUS LEDGER: WHAT HAPPENS TO CHAPTERS STILL IN CLEARANCE?",
    options: [
      { key: "A", label: "List outstanding chapters visibly", value: "visible_outstanding" },
      { key: "B", label: "Remove the chapter labels from the record", value: "remove_labels" },
      { key: "C", label: "Mark them cleared to avoid delay", value: "false_clear" }
    ],
    correctValue: "visible_outstanding",
    sourceBasis: "The Status page notes that volumes with outstanding chapters are listed in a table.",
    successMessage: "Outstanding chapter ledger filed: the public can see what remains in clearance.",
    failureMessage: "Outstanding chapters need visible status, not deletion or false clearance."
  }
] as const satisfies readonly ChapterReleasePrompt[];

export function getChapterReleasePrompt(step: number) {
  return CHAPTER_RELEASE_PROMPTS[Math.max(0, Math.min(CHAPTER_RELEASE_PROMPTS.length - 1, step))];
}

export function chapterReleaseComplete(step: number) {
  return step >= CHAPTER_RELEASE_PROMPTS.length;
}

export function evaluateChapterReleaseAnswer(
  promptId: ChapterReleasePromptId,
  value?: string
): ChapterReleaseEvaluation {
  const prompt = CHAPTER_RELEASE_PROMPTS.find((candidate) => candidate.id === promptId) ?? CHAPTER_RELEASE_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "silent_wait" || value === "remove_labels") violation = "omitted_material_fact";
    else if (value === "false_clear" || value === "clearance") violation = "concealed_policy_defect";
    else violation = "altered_text";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
