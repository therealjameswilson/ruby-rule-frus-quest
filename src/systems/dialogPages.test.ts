import { describe, expect, it } from "vitest";
import { dialogHeading, dialogPages, DIALOG_COLUMNS, DIALOG_ROWS } from "./dialogPages";

describe("dialogue safe text area", () => {
  it("keeps every instruction while fitting two lines between scroll corners", () => {
    const text = "Verify source-note provenance in the Archive Guide before dispatch. Then bring the completed document back to the reviewer for approval.";
    const pages = dialogPages(text);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join(" ").replace(/\s+/g, " ")).toBe(text);
    for (const page of pages) {
      expect(page.split("\n").length).toBeLessThanOrEqual(DIALOG_ROWS);
      for (const line of page.split("\n")) expect(line.length).toBeLessThanOrEqual(DIALOG_COLUMNS);
    }
  });

  it("preserves authored page boundaries and splits long unbroken text", () => {
    expect(dialogPages(["First.", "Second."])).toEqual(["First.", "Second."]);
    expect(dialogPages("x".repeat(100)).join("").replace(/\n/g, "")).toBe("x".repeat(100));
    expect(dialogPages("")).toEqual([""]);
  });

  it("reserves room for a page counter without overflowing a long speaker name", () => {
    const heading = dialogHeading("Senior Interagency Manuscript Reviewer", 1, 12);
    expect(heading.length).toBeLessThanOrEqual(DIALOG_COLUMNS);
    expect(heading.endsWith(" 2/12")).toBe(true);
    expect(dialogHeading("Compiler", 0, 1)).toBe("Compiler:");
  });
});
