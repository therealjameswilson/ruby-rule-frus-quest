import { describe, expect, it } from "vitest";
import { FOREIGN_GOVERNMENT_PERMISSION_PROMPTS, FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL } from "./foreignGovernmentPermission";
import {
  EMBASSY_PERMISSION_POINT_VALUE,
  fileEmbassyPermissionQueue,
  FOREIGN_PERMISSION_NOTE_ITEM_LABEL,
  VISIBLE_WITHHOLDING_NOTE_ITEM_LABEL
} from "./embassyPermissionQueue";

describe("Embassy foreign-government permission queue", () => {
  it("blocks permission routing until the chancery cable is copied", () => {
    const result = fileEmbassyPermissionQueue({
      embassyCableLogged: false,
      currentStep: 1
    });

    expect(result.ok).toBe(false);
    expect(result.shouldFilePermission).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.nextStep).toBe(1);
    expect(result.message).toContain("copy the chancery cable");
    expect(result.sourceUrl).toBe(FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL);
  });

  it("files a one-time permission note after the cable is logged", () => {
    const result = fileEmbassyPermissionQueue({
      embassyCableLogged: true,
      inventory: [],
      currentStep: 0
    });

    expect(result.ok).toBe(true);
    expect(result.shouldFilePermission).toBe(true);
    expect(result.documentPoints).toBe(EMBASSY_PERMISSION_POINT_VALUE);
    expect(result.nextStep).toBe(FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length);
    expect(result.itemsToAward).toEqual([FOREIGN_PERMISSION_NOTE_ITEM_LABEL, VISIBLE_WITHHOLDING_NOTE_ITEM_LABEL]);
    expect(result.sourceBasis).toContain("foreign-government information");
  });

  it("does not farm points but recovers missing visible-outcome inventory on repeat filing", () => {
    const result = fileEmbassyPermissionQueue({
      embassyCableLogged: true,
      alreadyFiled: true,
      inventory: [FOREIGN_PERMISSION_NOTE_ITEM_LABEL],
      currentStep: 1
    });

    expect(result.ok).toBe(true);
    expect(result.shouldFilePermission).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.nextStep).toBe(FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length);
    expect(result.itemsToAward).toEqual([VISIBLE_WITHHOLDING_NOTE_ITEM_LABEL]);
    expect(result.message).toContain("already filed");
  });
});
