import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type GpoSegmentAssemblyPromptId =
  | "prepare_segments"
  | "submit_final_segment"
  | "bind_complete_volume";

export interface GpoSegmentAssemblyPrompt {
  id: GpoSegmentAssemblyPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface GpoSegmentAssemblyEvaluation {
  ok: boolean;
  prompt: GpoSegmentAssemblyPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const GPO_SEGMENT_ASSEMBLY_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const GPO_SEGMENT_ASSEMBLY_PROMPTS = [
  {
    id: "prepare_segments",
    question: "GPO SEGMENTS: HOW DOES THE VOLUME MOVE TO PRINT?",
    options: [
      { key: "A", label: "Send prepared sections as publication segments", value: "send_segments" },
      { key: "B", label: "Send only the easiest documents", value: "easy_documents" },
      { key: "C", label: "Let StateChat choose the print packet", value: "statechat_packet" }
    ],
    correctValue: "send_segments",
    sourceBasis: "The stages page explains that FRUS volumes could move to GPO in parts as segments were prepared.",
    successMessage: "GPO segment queue opened: prepared sections move as accountable packets.",
    failureMessage: "The print packet cannot be narrowed to easy documents or delegated to a terminal."
  },
  {
    id: "submit_final_segment",
    question: "GPO SEGMENTS: WHAT MUST ARRIVE BEFORE BINDING?",
    options: [
      { key: "A", label: "The final segment with index and apparatus intact", value: "final_segment" },
      { key: "B", label: "A placeholder index to save time", value: "placeholder_index" },
      { key: "C", label: "Loose replacement pages after publication", value: "loose_pages" }
    ],
    correctValue: "final_segment",
    sourceBasis: "Binding waits for the final submitted segment; the apparatus remains part of the finished volume.",
    successMessage: "Final segment submitted: index and apparatus stay with the record.",
    failureMessage: "Binding cannot proceed with a placeholder index or loose post-publication pages."
  },
  {
    id: "bind_complete_volume",
    question: "GPO SEGMENTS: WHAT DOES GPO BIND?",
    options: [
      { key: "A", label: "The entire certified FRUS volume", value: "complete_volume" },
      { key: "B", label: "Only the cleared document body", value: "body_only" },
      { key: "C", label: "An unmarked shortcut edition", value: "shortcut_edition" }
    ],
    correctValue: "complete_volume",
    sourceBasis: "When the final segment was submitted, GPO bound the entire volume together.",
    successMessage: "Segment assembly complete: GPO can bind one certified ruby volume.",
    failureMessage: "The final book must bind the complete certified volume, not a partial shortcut."
  }
] as const satisfies readonly GpoSegmentAssemblyPrompt[];

export function getGpoSegmentAssemblyPrompt(step: number) {
  return GPO_SEGMENT_ASSEMBLY_PROMPTS[Math.max(0, Math.min(GPO_SEGMENT_ASSEMBLY_PROMPTS.length - 1, step))];
}

export function gpoSegmentAssemblyComplete(step: number) {
  return step >= GPO_SEGMENT_ASSEMBLY_PROMPTS.length;
}

export function evaluateGpoSegmentAssemblyAnswer(
  promptId: GpoSegmentAssemblyPromptId,
  value?: string
): GpoSegmentAssemblyEvaluation {
  const prompt = GPO_SEGMENT_ASSEMBLY_PROMPTS.find((candidate) => candidate.id === promptId) ?? GPO_SEGMENT_ASSEMBLY_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "statechat_packet" || value === "shortcut_edition") violation = "altered_text";
    else if (value === "easy_documents" || value === "body_only") violation = "omitted_material_fact";
    else violation = "concealed_policy_defect";
  }

  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
