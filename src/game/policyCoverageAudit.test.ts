import { describe, expect, it } from "vitest";
import {
  evaluatePolicyCoverageAuditAnswer,
  getPolicyCoverageAuditPrompt,
  policyCoverageAuditComplete,
  POLICY_COVERAGE_AUDIT_PROMPTS
} from "./policyCoverageAudit";

describe("policy coverage audit", () => {
  it("tracks the Kellogg coverage standards after selection", () => {
    expect(POLICY_COVERAGE_AUDIT_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "major_decisions",
      "material_facts",
      "policy_defects"
    ]);
    expect(POLICY_COVERAGE_AUDIT_PROMPTS[0].sourceBasis).toContain("thorough, accurate, and reliable");
    expect(POLICY_COVERAGE_AUDIT_PROMPTS[1].sourceBasis).toContain("omit no facts");
    expect(POLICY_COVERAGE_AUDIT_PROMPTS[2].sourceBasis).toContain("conceal a defect in policy");
  });

  it("completes only after all audit prompts are filed", () => {
    expect(policyCoverageAuditComplete(0)).toBe(false);
    expect(policyCoverageAuditComplete(POLICY_COVERAGE_AUDIT_PROMPTS.length - 1)).toBe(false);
    expect(policyCoverageAuditComplete(POLICY_COVERAGE_AUDIT_PROMPTS.length)).toBe(true);
  });

  it("accepts the complete coverage path and maps shortcuts to standards violations", () => {
    const first = getPolicyCoverageAuditPrompt(0);
    const correct = evaluatePolicyCoverageAuditAnswer(first.id, first.correctValue);
    const easy = evaluatePolicyCoverageAuditAnswer("major_decisions", "easy_description");
    const avoidEquities = evaluatePolicyCoverageAuditAnswer("major_decisions", "avoid_equities");
    const droppedFact = evaluatePolicyCoverageAuditAnswer("material_facts", "drop_complications");
    const silentSummary = evaluatePolicyCoverageAuditAnswer("material_facts", "silent_summary");
    const hiddenDefect = evaluatePolicyCoverageAuditAnswer("policy_defects", "hide_defects");
    const smoothParaphrase = evaluatePolicyCoverageAuditAnswer("policy_defects", "smooth_paraphrase");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(easy.violation).toBe("omitted_material_fact");
    expect(avoidEquities.violation).toBe("concealed_policy_defect");
    expect(droppedFact.violation).toBe("omitted_material_fact");
    expect(silentSummary.violation).toBe("omitted_material_fact");
    expect(hiddenDefect.violation).toBe("concealed_policy_defect");
    expect(smoothParaphrase.violation).toBe("altered_text");
  });
});
