import { describe, expect, it } from "vitest";
import { sanitizeCompilerNameInput } from "./CompilerNameInput";

describe("native compiler names", () => {
  it("uses the existing ten-letter name alphabet for pasted values", () => {
    expect(sanitizeCompilerNameInput("Ezra X 123!")).toBe("EzraX");
    expect(sanitizeCompilerNameInput("abcdefghijklmnop")).toBe("abcdefghij");
    expect(sanitizeCompilerNameInput("")).toBe("");
  });
});
