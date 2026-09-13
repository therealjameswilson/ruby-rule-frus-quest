import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./indexRouter.ts", import.meta.url), "utf8");

describe("IndexRouterOverlay", () => {
  it("presents one stable-reference action instead of another quiz chain", () => {
    expect(source).toContain('"PAGE 87"');
    expect(source).toContain('"DOC 87"');
    expect(source).toContain("ABOUT_SERIES_RULES.index.toUpperCase()");
    expect(source).not.toContain("ChoicePrompt");
  });

  it("supports keyboard, gamepad, and direct touch targets", () => {
    expect(source).toContain("input.navLeftJustPressed");
    expect(source).toContain("input.navRightJustPressed");
    expect(source).toContain("input.aJustPressed");
    expect(source).toContain("input.bJustPressed");
    expect(source.match(/bindPointerDown\(/g)).toHaveLength(2);
    expect(source).toContain("96, 44");
  });
});
