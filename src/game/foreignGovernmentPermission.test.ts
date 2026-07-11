import { describe, expect, it } from "vitest";
import {
  evaluateForeignGovernmentPermissionAnswer,
  foreignGovernmentPermissionComplete,
  FOREIGN_GOVERNMENT_PERMISSION_PROMPTS,
  FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL,
  getForeignGovernmentPermissionPrompt
} from "./foreignGovernmentPermission";

describe("foreign government permission prompts", () => {
  it("keeps the foreign-government permission sequence stable", () => {
    expect(FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "identify_foreign_government_information",
      "seek_permission",
      "record_permission_outcome"
    ]);
    expect(FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL).toContain("history.state.gov");
  });

  it("accepts the correct permission answer for every prompt", () => {
    for (const prompt of FOREIGN_GOVERNMENT_PERMISSION_PROMPTS) {
      const result = evaluateForeignGovernmentPermissionAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(60);
    }
  });

  it("maps unsafe permission shortcuts to standards damage categories", () => {
    const ignored = evaluateForeignGovernmentPermissionAnswer("identify_foreign_government_information", "reader_infers");
    const machineConsent = evaluateForeignGovernmentPermissionAnswer("seek_permission", "machine_consent");
    const silentCut = evaluateForeignGovernmentPermissionAnswer("record_permission_outcome", "silent_cut");

    expect(ignored.violation).toBe("omitted_material_fact");
    expect(machineConsent.violation).toBe("concealed_policy_defect");
    expect(silentCut.violation).toBe("undisclosed_deletion");
  });

  it("reports completion only after every permission prompt is answered", () => {
    expect(foreignGovernmentPermissionComplete(0)).toBe(false);
    expect(foreignGovernmentPermissionComplete(FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length - 1)).toBe(false);
    expect(foreignGovernmentPermissionComplete(FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length)).toBe(true);
  });

  it("clamps prompt lookup to the permission sequence", () => {
    expect(getForeignGovernmentPermissionPrompt(-1).id).toBe("identify_foreign_government_information");
    expect(getForeignGovernmentPermissionPrompt(99).id).toBe("record_permission_outcome");
  });
});
