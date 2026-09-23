import { describe, expect, it } from "vitest";
import { COMPILER_APPEARANCES, CHARACTERS, getCharacterKeyForProcessRole } from "./characters";

describe("compiler appearance choices", () => {
  it("offers five additions and retains the classic/veteran defaults", () => {
    expect(COMPILER_APPEARANCES).toHaveLength(6);
    expect(new Set(COMPILER_APPEARANCES.map(option => option.key)).size).toBe(6);
    expect(getCharacterKeyForProcessRole("compiler")).toBe("compiler");
    expect(getCharacterKeyForProcessRole("compiler", true, "compiler")).toBe("compiler_veteran");
    for (const option of COMPILER_APPEARANCES.slice(1)) {
      expect(CHARACTERS[option.key]).toMatch(/compilers\//);
      expect(getCharacterKeyForProcessRole("compiler", false, option.key)).toBe(option.key);
      expect(getCharacterKeyForProcessRole("compiler", true, option.key)).toBe(option.key);
    }
  });
  it("ignores invalid or inherited object keys in old or malformed saves", () => {
    for (const key of [undefined, "unknown", "toString", "__proto__"]) {
      expect(getCharacterKeyForProcessRole("compiler", false, key)).toBe("compiler");
    }
    expect(getCharacterKeyForProcessRole("editor", false, "compiler_ada")).toBe("editor");
  });
});
