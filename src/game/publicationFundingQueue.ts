import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type PublicationFundingPromptId =
  | "fully_prepared_delay"
  | "queue_integrity"
  | "public_status_note";

export interface PublicationFundingPrompt {
  id: PublicationFundingPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface PublicationFundingEvaluation {
  ok: boolean;
  prompt: PublicationFundingPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const PUBLICATION_FUNDING_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const PUBLICATION_FUNDING_PROMPTS = [
  {
    id: "fully_prepared_delay",
    question: "FUNDING QUEUE: WHAT IF A FULLY PREPARED VOLUME IS DELAYED?",
    options: [
      { key: "A", label: "Hold the finished volume intact in queue", value: "hold_intact" },
      { key: "B", label: "Cut lower-profile documents to print now", value: "cut_documents" },
      { key: "C", label: "Let DANN-E publish an uncertified digest", value: "uncertified_digest" }
    ],
    correctValue: "hold_intact",
    sourceBasis: "The stages page says lack of funding has delayed publication of fully-prepared FRUS volumes.",
    successMessage: "Funding queue logged: delay cannot alter a fully prepared volume.",
    failureMessage: "A funding delay cannot justify cutting records or issuing an uncertified digest."
  },
  {
    id: "queue_integrity",
    question: "FUNDING QUEUE: WHAT MUST STAY WITH THE WAITING VOLUME?",
    options: [
      { key: "A", label: "Certified text, apparatus, index, and binding packet", value: "complete_packet" },
      { key: "B", label: "Only the document body; rebuild aids later", value: "body_only" },
      { key: "C", label: "A shortened copy without visible delay history", value: "hidden_delay" }
    ],
    correctValue: "complete_packet",
    sourceBasis: "The official stages distinguish a fully-prepared volume from a published one; the prepared record must remain complete while it waits.",
    successMessage: "Queue integrity logged: the complete publication packet stays together.",
    failureMessage: "A waiting FRUS volume cannot lose its apparatus, index, or delay trail."
  },
  {
    id: "public_status_note",
    question: "FUNDING QUEUE: HOW SHOULD THE PLAYER HANDLE THE PUBLIC RECORD?",
    options: [
      { key: "A", label: "Mark prepared-but-delayed before release tracking", value: "mark_delayed" },
      { key: "B", label: "Call it published because the text is ready", value: "call_published" },
      { key: "C", label: "Hide the delay to protect confidence", value: "hide_delay" }
    ],
    correctValue: "mark_delayed",
    sourceBasis: "Funding can delay publication even when a volume is fully prepared, so readiness and publication status must remain distinct.",
    successMessage: "Prepared-but-delayed status filed: publication tracking can proceed honestly.",
    failureMessage: "A ready volume is not published until publication actually occurs, and the delay cannot be hidden."
  }
] as const satisfies readonly PublicationFundingPrompt[];

export function getPublicationFundingPrompt(step: number) {
  return PUBLICATION_FUNDING_PROMPTS[Math.max(0, Math.min(PUBLICATION_FUNDING_PROMPTS.length - 1, step))];
}

export function publicationFundingComplete(step: number) {
  return step >= PUBLICATION_FUNDING_PROMPTS.length;
}

export function evaluatePublicationFundingAnswer(
  promptId: PublicationFundingPromptId,
  value?: string
): PublicationFundingEvaluation {
  const prompt = PUBLICATION_FUNDING_PROMPTS.find((candidate) => candidate.id === promptId) ?? PUBLICATION_FUNDING_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "cut_documents" || value === "body_only") violation = "omitted_material_fact";
    else if (value === "hidden_delay" || value === "hide_delay") violation = "concealed_policy_defect";
    else violation = "altered_text";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
