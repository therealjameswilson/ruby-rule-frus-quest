import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type GpoPublicationPromptId =
  | "publication_contract"
  | "volume_binding"
  | "funding_delay";

export interface GpoPublicationPrompt {
  id: GpoPublicationPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface GpoPublicationEvaluation {
  ok: boolean;
  prompt: GpoPublicationPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const GPO_PUBLICATION_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const GPO_PUBLICATION_PROMPTS = [
  {
    id: "publication_contract",
    question: "GPO HANDOFF: WHO PREPARES AND PUBLISHES THE FINISHED VOLUME?",
    options: [
      { key: "A", label: "Government Printing Office / GPO", value: "gpo_contract" },
      { key: "B", label: "StateChat direct web release", value: "statechat_release" },
      { key: "C", label: "DANN-E private copy queue", value: "danne_queue" }
    ],
    correctValue: "gpo_contract",
    sourceBasis: "The Department of State contracts with the Government Printing Office to prepare and publish FRUS volumes.",
    successMessage: "Publication handoff logged: the finished volume goes to GPO.",
    failureMessage: "Publication is not a terminal shortcut or private machine queue."
  },
  {
    id: "volume_binding",
    question: "GPO HANDOFF: WHAT HAPPENS WHEN THE FINAL SEGMENT IS READY?",
    options: [
      { key: "A", label: "Bind the entire volume together", value: "bind_volume" },
      { key: "B", label: "Ship loose packets without final binding", value: "loose_packets" },
      { key: "C", label: "Drop the index to finish faster", value: "drop_index" }
    ],
    correctValue: "bind_volume",
    sourceBasis: "The stages page notes that GPO would bind the entire volume together when the final segment was submitted.",
    successMessage: "Binding logged: the ruby buckram volume can become one finished object.",
    failureMessage: "The final book cannot ship as loose packets or without required apparatus."
  },
  {
    id: "funding_delay",
    question: "GPO HANDOFF: WHAT IF FUNDING DELAYS A FULLY PREPARED VOLUME?",
    options: [
      { key: "A", label: "Keep the prepared volume intact in the publication queue", value: "hold_prepared" },
      { key: "B", label: "Cut pages until the print job fits", value: "cut_pages" },
      { key: "C", label: "Publish an uncertified shortcut edition", value: "uncertified" }
    ],
    correctValue: "hold_prepared",
    sourceBasis: "The stages page says lack of funding has delayed publication of fully prepared volumes.",
    successMessage: "Funding-delay handling logged: delay cannot alter the finished record.",
    failureMessage: "A funding delay cannot justify cutting pages or publishing an uncertified record."
  }
] as const satisfies readonly GpoPublicationPrompt[];

export function getGpoPublicationPrompt(step: number) {
  return GPO_PUBLICATION_PROMPTS[Math.max(0, Math.min(GPO_PUBLICATION_PROMPTS.length - 1, step))];
}

export function gpoPublicationComplete(step: number) {
  return step >= GPO_PUBLICATION_PROMPTS.length;
}

export function evaluateGpoPublicationAnswer(
  promptId: GpoPublicationPromptId,
  value?: string
): GpoPublicationEvaluation {
  const prompt = GPO_PUBLICATION_PROMPTS.find((candidate) => candidate.id === promptId) ?? GPO_PUBLICATION_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "cut_pages" || value === "drop_index") violation = "omitted_material_fact";
    else if (value === "uncertified" || value === "statechat_release") violation = "altered_text";
    else violation = "concealed_policy_defect";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
