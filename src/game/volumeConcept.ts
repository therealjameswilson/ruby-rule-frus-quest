import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type VolumeConceptPromptId =
  | "volume_parameters"
  | "strategy_sources"
  | "coverage_breadth"
  | "policy_implementation";

export interface VolumeConceptPrompt {
  id: VolumeConceptPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface VolumeConceptEvaluation {
  ok: boolean;
  prompt: VolumeConceptPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const VOLUME_CONCEPT_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const VOLUME_CONCEPT_PROMPTS = [
  {
    id: "volume_parameters",
    question: "VOLUME CONCEPT: WHAT MUST BE DEFINED?",
    options: [
      { key: "A", label: "The parameters of this individual volume", value: "volume_parameters" },
      { key: "B", label: "Only the easiest country file", value: "easy_country_file" },
      { key: "C", label: "Whatever DANN-E says is complete", value: "machine_complete" }
    ],
    correctValue: "volume_parameters",
    sourceBasis: "The FRUS stages page says each compiler or team must determine the parameters of the individual volume.",
    successMessage: "Volume parameters filed: the chapter has a human-defined remit.",
    failureMessage: "A volume concept cannot be reduced to the easiest file or a machine completeness claim."
  },
  {
    id: "strategy_sources",
    question: "VOLUME CONCEPT: WHAT INFORMS COLLECTION STRATEGY?",
    options: [
      { key: "A", label: "Histories, memoirs, and other accounts", value: "histories_memoirs_accounts" },
      { key: "B", label: "Blind archive pulls with no context", value: "blind_pull" },
      { key: "C", label: "Only records already cited online", value: "online_only" }
    ],
    correctValue: "histories_memoirs_accounts",
    sourceBasis: "For more in-depth 20th-century volumes, compilers often consulted histories, memoirs, and other accounts to inform collection and selection.",
    successMessage: "Strategy sources filed: outside accounts now guide collection and selection.",
    failureMessage: "Collection strategy needs context before the archive pull narrows the record."
  },
  {
    id: "coverage_breadth",
    question: "VOLUME CONCEPT: WHAT KIND OF COVERAGE DOES FRUS CARRY?",
    options: [
      { key: "A", label: "Bilateral/regional relations, global issues, and policy topics", value: "full_coverage_breadth" },
      { key: "B", label: "Only bilateral cables; skip global issues", value: "bilateral_only" },
      { key: "C", label: "Only one topical lane to speed the volume", value: "single_topic_lane" }
    ],
    correctValue: "full_coverage_breadth",
    sourceBasis: "The About FRUS page says the series documents bilateral and regional relations, global issues, national security policy, foreign economic policy, and foreign-policy organization.",
    successMessage: "Coverage breadth filed: regional, global, and topical lanes are all considered.",
    failureMessage: "A FRUS volume plan cannot erase global issues or topical policy lanes for speed."
  },
  {
    id: "policy_implementation",
    question: "VOLUME CONCEPT: WHAT DEPTH SHOULD MODERN VOLUMES CARRY?",
    options: [
      { key: "A", label: "Policymaking and implementation", value: "policy_and_implementation" },
      { key: "B", label: "Only finished public communiques", value: "public_communiques" },
      { key: "C", label: "Avoid implementation defects", value: "avoid_defects" }
    ],
    correctValue: "policy_and_implementation",
    sourceBasis: "The stages page describes 20th-century volumes as offering more in-depth treatment of both policymaking and implementation.",
    successMessage: "Depth rule filed: policy and implementation both stay in scope.",
    failureMessage: "A modern FRUS volume cannot hide implementation or reduce the record to public communiques."
  }
] as const satisfies readonly VolumeConceptPrompt[];

export function getVolumeConceptPrompt(step: number) {
  return VOLUME_CONCEPT_PROMPTS[Math.max(0, Math.min(VOLUME_CONCEPT_PROMPTS.length - 1, step))];
}

export function volumeConceptComplete(step: number) {
  return step >= VOLUME_CONCEPT_PROMPTS.length;
}

export function evaluateVolumeConceptAnswer(
  promptId: VolumeConceptPromptId,
  value?: string
): VolumeConceptEvaluation {
  const prompt = VOLUME_CONCEPT_PROMPTS.find((candidate) => candidate.id === promptId) ?? VOLUME_CONCEPT_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "avoid_defects") violation = "concealed_policy_defect";
    else if (value === "machine_complete") violation = "altered_text";
    else if (value === "single_topic_lane") violation = "concealed_policy_defect";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
