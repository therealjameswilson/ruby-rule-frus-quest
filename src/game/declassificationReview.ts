import type { ChoiceOption } from "./types";

export type DeclassificationReviewPromptId =
  | "human_equity"
  | "classified_channel"
  | "documented_decision";

export interface DeclassificationReviewPrompt {
  id: DeclassificationReviewPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface DeclassificationReviewEvaluation {
  ok: boolean;
  prompt: DeclassificationReviewPrompt;
  message: string;
}

export const DECLASSIFICATION_REVIEW_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";
export const DECLASSIFICATION_HAC_SOURCE_URL = "https://history.state.gov/about/hac/intro";

export const DECLASSIFICATION_REVIEW_PROMPTS = [
  {
    id: "human_equity",
    question: "CLEARANCE TOKEN: WHO RESOLVES A CLASSIFIED EQUITY?",
    options: [
      { key: "A", label: "Human agency equity reviewers", value: "human_equity" },
      { key: "B", label: "StateChat final sign-off", value: "statechat_signoff" },
      { key: "C", label: "Any compiler who wants speed", value: "compiler_shortcut" }
    ],
    correctValue: "human_equity",
    sourceBasis: "FRUS draws on records across the national security establishment; agency equities require human review.",
    successMessage: "Correct: classified equities move through human reviewers.",
    failureMessage: "StateChat can flag mechanics, but it cannot decide classified equities."
  },
  {
    id: "classified_channel",
    question: "CLEARANCE TOKEN: WHERE DOES CLASSIFIED REVIEW WORK TRAVEL?",
    options: [
      { key: "A", label: "OpenNet public-status queue", value: "opennet" },
      { key: "B", label: "ClassNet / declassification review channel", value: "classnet" },
      { key: "C", label: "Unmarked paper left on the reading table", value: "unmarked" }
    ],
    correctValue: "classnet",
    sourceBasis: "The game separates open research from classified review so closed material does not leak or vanish.",
    successMessage: "Correct: classified review stays in the controlled review channel.",
    failureMessage: "Wrong network: classified equities cannot ride the public-status queue."
  },
  {
    id: "documented_decision",
    question: "CLEARANCE TOKEN: WHAT MUST THE REVIEW LEAVE BEHIND?",
    options: [
      { key: "A", label: "A documented human decision or referral trail", value: "documented" },
      { key: "B", label: "A silent deletion", value: "silent_deletion" },
      { key: "C", label: "A promise to fix it after publication", value: "publish_first" }
    ],
    correctValue: "documented",
    sourceBasis: "FRUS standards reject undisclosed deletions and concealed policy defects; review limits must be visible.",
    successMessage: "Correct: the Clearance Token records the human decision trail.",
    failureMessage: "Declassification review cannot end in silence or after-publication repair."
  }
] as const satisfies readonly DeclassificationReviewPrompt[];

export function getDeclassificationReviewPrompt(step: number) {
  return DECLASSIFICATION_REVIEW_PROMPTS[Math.max(0, Math.min(DECLASSIFICATION_REVIEW_PROMPTS.length - 1, step))];
}

export function declassificationReviewComplete(step: number) {
  return step >= DECLASSIFICATION_REVIEW_PROMPTS.length;
}

export function evaluateDeclassificationReviewAnswer(
  promptId: DeclassificationReviewPromptId,
  value?: string
): DeclassificationReviewEvaluation {
  const prompt = DECLASSIFICATION_REVIEW_PROMPTS.find((candidate) => candidate.id === promptId)
    ?? DECLASSIFICATION_REVIEW_PROMPTS[0];
  const ok = value === prompt.correctValue;
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage
  };
}
