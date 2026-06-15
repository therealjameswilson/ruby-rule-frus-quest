import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type FrontMatterAssemblyPromptId =
  | "preface_scope"
  | "sources_consulted"
  | "persons_abbreviations"
  | "index_handoff";

export interface FrontMatterAssemblyPrompt {
  id: FrontMatterAssemblyPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface FrontMatterAssemblyEvaluation {
  ok: boolean;
  prompt: FrontMatterAssemblyPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const FRONT_MATTER_ASSEMBLY_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const FRONT_MATTER_ASSEMBLY_PROMPTS = [
  {
    id: "preface_scope",
    question: "FRONT MATTER: WHAT OPENS THE FINISHED VOLUME?",
    options: [
      { key: "A", label: "A preface that explains the volume scope", value: "preface_scope" },
      { key: "B", label: "A blank cover to save time", value: "blank_cover" },
      { key: "C", label: "StateChat's promotional summary", value: "machine_preface" }
    ],
    correctValue: "preface_scope",
    sourceBasis: "The FRUS stages page describes completed front matter before publication, including the material that frames the volume for readers.",
    successMessage: "Preface and scope filed: the reader knows what the volume covers.",
    failureMessage: "A FRUS volume needs a human-edited scope note, not a blank or machine pitch."
  },
  {
    id: "sources_consulted",
    question: "FRONT MATTER: WHAT SOURCE AID MUST BE ASSEMBLED?",
    options: [
      { key: "A", label: "Sources consulted", value: "sources_consulted" },
      { key: "B", label: "Only the easiest repository", value: "easy_repository" },
      { key: "C", label: "No source list; readers can search later", value: "no_source_list" }
    ],
    correctValue: "sources_consulted",
    sourceBasis: "Final FRUS apparatus includes a sources-consulted section so the research base remains visible.",
    successMessage: "Sources consulted filed: the research base stays visible.",
    failureMessage: "The source trail cannot be narrowed to easy repositories or left out."
  },
  {
    id: "persons_abbreviations",
    question: "FRONT MATTER: WHAT HELPS READERS DECODE THE TEXT?",
    options: [
      { key: "A", label: "Persons and abbreviations lists", value: "persons_abbreviations" },
      { key: "B", label: "Only famous names", value: "famous_only" },
      { key: "C", label: "Rename offices for smoother prose", value: "renamed_offices" }
    ],
    correctValue: "persons_abbreviations",
    sourceBasis: "Completed front matter includes lists of persons mentioned and abbreviations used in the text.",
    successMessage: "Persons and abbreviations filed: the reader apparatus is clear.",
    failureMessage: "Reader aids cannot drop less famous people or alter office names."
  },
  {
    id: "index_handoff",
    question: "FRONT MATTER: WHAT FINAL AID JOINS THE TYPESET PAGES?",
    options: [
      { key: "A", label: "Index after proofed pages are checked", value: "index_handoff" },
      { key: "B", label: "Drop the index if the deadline is close", value: "drop_index" },
      { key: "C", label: "Let DANN-E invent subject headings", value: "machine_index" }
    ],
    correctValue: "index_handoff",
    sourceBasis: "After typesetting, pages are checked against originals and an index is added before publication.",
    successMessage: "Index handoff filed: proofed pages and reader aids are ready.",
    failureMessage: "The index is part of the publication apparatus; it cannot be skipped or invented."
  }
] as const satisfies readonly FrontMatterAssemblyPrompt[];

export function getFrontMatterAssemblyPrompt(step: number) {
  return FRONT_MATTER_ASSEMBLY_PROMPTS[
    Math.max(0, Math.min(FRONT_MATTER_ASSEMBLY_PROMPTS.length - 1, step))
  ];
}

export function frontMatterAssemblyComplete(step: number) {
  return step >= FRONT_MATTER_ASSEMBLY_PROMPTS.length;
}

export function evaluateFrontMatterAssemblyAnswer(
  promptId: FrontMatterAssemblyPromptId,
  value?: string
): FrontMatterAssemblyEvaluation {
  const prompt = FRONT_MATTER_ASSEMBLY_PROMPTS.find((candidate) => candidate.id === promptId)
    ?? FRONT_MATTER_ASSEMBLY_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "machine_preface" || value === "machine_index") violation = "concealed_policy_defect";
    else if (value === "renamed_offices") violation = "altered_text";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
