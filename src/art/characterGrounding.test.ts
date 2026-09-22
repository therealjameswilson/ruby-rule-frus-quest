import { describe, expect, it } from "vitest";
import { characterGroundOffset } from "./characterGrounding";

describe("character boot grounding", () => {
  it.each([47, 45, 44, 38, 37])("keeps boots at the ground line with last painted row %s", bottom => {
    const offset = characterGroundOffset((x, y) => x >= 10 && x <= 20 && y >= 2 && y <= bottom ? 255 : 0);
    expect(bottom + offset).toBe(47);
  });
  it("does not displace an empty or unavailable frame", () => {
    expect(characterGroundOffset(() => 0)).toBe(0);
    expect(characterGroundOffset(() => null)).toBe(0);
  });
});
