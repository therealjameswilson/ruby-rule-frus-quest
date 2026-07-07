import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type ClearanceProcedurePromptId =
  | "separate_clearance_function"
  | "era_review_lane"
  | "agency_equity_lane";

export interface ClearanceProcedurePrompt {
  id: ClearanceProcedurePromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface ClearanceProcedureEvaluation {
  ok: boolean;
  prompt: ClearanceProcedurePrompt;
  message: string;
  violation: StandardViolation | null;
}

export const CLEARANCE_PROCEDURE_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const CLEARANCE_PROCEDURE_PROMPTS = [
  {
    id: "separate_clearance_function",
    question: "CLEARANCE PROCEDURE: WHO OWNS THE DECLASSIFICATION LANE?",
    options: [
      { key: "A", label: "A separate declassification review function", value: "separate_clearance" },
      { key: "B", label: "The compiler alone, for speed", value: "compiler_alone" },
      { key: "C", label: "StateChat final sign-off", value: "statechat_final" }
    ],
    correctValue: "separate_clearance",
    sourceBasis: "The stages page describes 20th-century declassification specialists organized separately from compilation and review functions.",
    successMessage: "Clearance lane separated: compilation and declassification stay accountable.",
    failureMessage: "Declassification review cannot collapse into compiler speed or terminal sign-off."
  },
  {
    id: "era_review_lane",
    question: "CLEARANCE PROCEDURE: HOW DID THE REVIEW LANE CHANGE AFTER 1980?",
    options: [
      { key: "A", label: "Retired Foreign Service clearance reviewers take the lane", value: "foreign_service_lane" },
      { key: "B", label: "No human lane remains", value: "no_human_lane" },
      { key: "C", label: "Desk notes can disappear if old enough", value: "desk_notes_vanish" }
    ],
    correctValue: "foreign_service_lane",
    sourceBasis: "The stages page notes that after 1980 retired Foreign Service reviewers took over clearance duties.",
    successMessage: "Era lane logged: the reviewer path matches the period of the workflow.",
    failureMessage: "The review lane still needs accountable human clearance."
  },
  {
    id: "agency_equity_lane",
    question: "CLEARANCE PROCEDURE: WHAT IF A DOCUMENT HAS OTHER AGENCY EQUITIES?",
    options: [
      { key: "A", label: "Route the equity to the responsible agency", value: "route_agency" },
      { key: "B", label: "Infer approval from silence", value: "infer_approval" },
      { key: "C", label: "Cut the equity and leave no trace", value: "silent_cut" }
    ],
    correctValue: "route_agency",
    sourceBasis: "The stages page says this stage increasingly involved securing clearance from other agencies when their equities appeared.",
    successMessage: "Agency equity lane logged: the referral trail stays visible.",
    failureMessage: "Agency clearance cannot be inferred from silence or hidden by cutting the record."
  }
] as const satisfies readonly ClearanceProcedurePrompt[];

export function getClearanceProcedurePrompt(step: number) {
  return CLEARANCE_PROCEDURE_PROMPTS[Math.max(0, Math.min(CLEARANCE_PROCEDURE_PROMPTS.length - 1, step))];
}

export function clearanceProcedureComplete(step: number) {
  return step >= CLEARANCE_PROCEDURE_PROMPTS.length;
}

export function evaluateClearanceProcedureAnswer(
  promptId: ClearanceProcedurePromptId,
  value?: string
): ClearanceProcedureEvaluation {
  const prompt = CLEARANCE_PROCEDURE_PROMPTS.find((candidate) => candidate.id === promptId) ?? CLEARANCE_PROCEDURE_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "silent_cut") violation = "undisclosed_deletion";
    else if (value === "infer_approval" || value === "desk_notes_vanish") violation = "omitted_material_fact";
    else violation = "concealed_policy_defect";
  }

  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
