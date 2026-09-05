import { describe, expect, it } from "vitest";
import { choiceLayout, wrapChoiceText } from "./choiceLayout";
import { SILENT_READ_REVIEW_ITEMS, silentReadDecision } from "../game/silentReadReview";

describe("choice layout", () => {
  const options = [
    { key: "A", label: "Omit contested material" },
    { key: "B", label: "Keep Kellogg standards" }
  ];

  it("keeps a deadline question, boast, and actions in separate bands", () => {
    const layout = choiceLayout("The 30-year clock expired before the Buckram Gate opened.\n\nDANN-E: OMIT THE HARD PART AND PUBLISH NOW?", options);
    expect(layout.fontSize).toBe(8);
    expect(layout.contextText).not.toContain("SOURCE:");
    expect(layout.contextText).toContain("DANN-E:");
    expect(layout.rows[0].y).toBeGreaterThan(layout.contextY + 12);
    expect(layout.rows[1].y).toBeGreaterThan(layout.rows[0].y + layout.rows[0].height);
    expect(layout.top).toBeGreaterThanOrEqual(30);
    expect(layout.top + layout.height).toBeLessThanOrEqual(210);
  });

  it("fits four long answers without overlapping or leaving the screen", () => {
    const long = "A disputed source needs careful comparison against the complete original document before publication. ";
    const layout = choiceLayout(`${long.repeat(3)}\n\n${long.repeat(3)}`, ["A", "B", "C", "D"].map((key) => ({ key, label: long.repeat(3) })));
    expect(layout.fontSize).toBe(6);
    expect(layout.height).toBeLessThanOrEqual(180);
    for (let i = 1; i < layout.rows.length; i += 1) {
      expect(layout.rows[i].y).toBeGreaterThan(layout.rows[i - 1].y + layout.rows[i - 1].height);
    }
    expect(layout.rows.at(-1)!.y + layout.rows.at(-1)!.height).toBeLessThan(layout.height);
  });

  it("wraps options instead of truncating them at the old 32-character limit", () => {
    const label = "Keep the original and add a visible bracketed note";
    const layout = choiceLayout("How should this deletion be marked?", [{ key: "A", label }]);
    expect(layout.rows[0].text.replace(/\n/g, " ")).toBe(`[A] ${label}`);
    expect(layout.rows[0].height).toBeGreaterThan(22);
  });

  it("splits unbroken strings and marks overflow explicitly", () => {
    expect(wrapChoiceText("abcdefghijklmnop", 6, 2)).toBe("abcdef\nghi...");
    expect(wrapChoiceText("", 6, 2)).toBe("");
    expect(wrapChoiceText("one  two\nthree", 9, 3)).toBe("one two\nthree");
  });

  it.each(SILENT_READ_REVIEW_ITEMS.map((item) => item.id))("keeps proof evidence legible and untruncated for %s", (id) => {
    const decision = silentReadDecision(id);
    if (!decision) return;
    const layout = choiceLayout(`${decision.question}\n\n${decision.context}`, decision.options, 8);
    expect(layout.fontSize).toBe(8);
    expect(layout.contextFontSize).toBe(8);
    expect(layout.contextText.replace(/\n/g, " ")).toBe(decision.context);
    expect(layout.questionText.replace(/\n/g, " ")).toBe(decision.question);
    expect(layout.rows[0].y).toBeGreaterThan(layout.contextY + layout.contextText.split("\n").length * 10);
    expect(layout.height).toBeLessThanOrEqual(180);
    expect(layout.top).toBeGreaterThanOrEqual(30);
    expect(layout.top + layout.height).toBeLessThanOrEqual(210);
    for (const [index, row] of layout.rows.entries()) {
      expect(row.text.replace(/\n/g, " ")).toBe(`[${decision.options[index].key}] ${decision.options[index].label}`);
    }
  });
});
