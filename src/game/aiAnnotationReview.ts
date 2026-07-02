import type { ChoiceOption } from "./types";

export type AiAnnotationReviewPromptId =
  | "mechanical_scope"
  | "evidence_bound_route"
  | "human_signoff";

export interface AiAnnotationReviewPrompt {
  id: AiAnnotationReviewPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface AiAnnotationReviewEvaluation {
  ok: boolean;
  prompt: AiAnnotationReviewPrompt;
  message: string;
}

export const AI_ANNOTATION_REVIEW_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";

export const AI_ANNOTATION_REVIEW_PROMPTS = [
  {
    id: "mechanical_scope",
    question: "AI ANNOTATION REVIEW: WHAT MAY THE TOOL PROPOSE?",
    options: [
      { key: "A", label: "Mechanical style/source-note fixes", value: "mechanical" },
      { key: "B", label: "Final historical meaning", value: "meaning" },
      { key: "C", label: "Final classification decision", value: "classification" }
    ],
    correctValue: "mechanical",
    sourceBasis: "FRUS must be thorough, accurate, and reliable; automated review can support checks but not replace judgment.",
    successMessage: "Correct: the tool may propose mechanical fixes for human review.",
    failureMessage: "The AI annotation tool cannot decide meaning or classification."
  },
  {
    id: "evidence_bound_route",
    question: "AI ANNOTATION REVIEW: WHAT HAPPENS TO EVIDENCE-BOUND FLAGS?",
    options: [
      { key: "A", label: "Route them as physical review objects", value: "physical_flags" },
      { key: "B", label: "Auto-accept high-confidence suggestions", value: "auto_accept" },
      { key: "C", label: "Hide them until proofing is over", value: "hide" }
    ],
    correctValue: "physical_flags",
    sourceBasis: "Kellogg standards require visible treatment of difficult evidence: no hidden deletions, omissions, or concealed defects.",
    successMessage: "Correct: evidence-bound flags become physical work for the right human station.",
    failureMessage: "Evidence-bound issues cannot be auto-accepted or hidden."
  },
  {
    id: "human_signoff",
    question: "AI ANNOTATION REVIEW: WHO SIGNS OFF BEFORE PUBLICATION?",
    options: [
      { key: "A", label: "Human compiler/editor/proofreader", value: "human" },
      { key: "B", label: "StateChat terminal", value: "statechat" },
      { key: "C", label: "DANN-E deadline shortcut", value: "danne" }
    ],
    correctValue: "human",
    sourceBasis: "FRUS production depends on accountable human compilation, editing, review, proofing, and publication decisions.",
    successMessage: "Correct: StateChat stays terminal-only; humans own final review.",
    failureMessage: "StateChat and DANN-E cannot sign off for publication."
  }
] as const satisfies readonly AiAnnotationReviewPrompt[];

export function getAiAnnotationReviewPrompt(step: number) {
  return AI_ANNOTATION_REVIEW_PROMPTS[Math.max(0, Math.min(AI_ANNOTATION_REVIEW_PROMPTS.length - 1, step))];
}

export function aiAnnotationReviewComplete(step: number) {
  return step >= AI_ANNOTATION_REVIEW_PROMPTS.length;
}

export function evaluateAiAnnotationReviewAnswer(
  promptId: AiAnnotationReviewPromptId,
  value?: string
): AiAnnotationReviewEvaluation {
  const prompt = AI_ANNOTATION_REVIEW_PROMPTS.find((candidate) => candidate.id === promptId)
    ?? AI_ANNOTATION_REVIEW_PROMPTS[0];
  const ok = value === prompt.correctValue;
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage
  };
}
