import { describe, expect, it } from "vitest";
import { characterGroundOffset, characterPoseCenter, groundedPoseTransform } from "./characterGrounding";

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

it("keeps crown and planted boot steady for short and tall stride poses", () => {
  for (const [top, bottom] of [[2, 45], [5, 38], [0, 47]]) {
    const { scaleY, offsetY } = groundedPoseTransform(bottom, bottom - top + 1, 44);
    expect(offsetY + (bottom - 43) * scaleY).toBeCloseTo(4);
    expect((bottom - top + 1) * scaleY).toBeCloseTo(44);
  }
});

it("measures off-center artwork so pose changes do not lurch sideways", () => {
  expect(characterPoseCenter((x, y) => x >= 14 && x <= 30 && y > 2 ? 255 : 0)).toBe(22);
  expect(characterPoseCenter((x, y) => x >= 6 && x <= 24 && y > 2 ? 255 : 0)).toBe(15);
});
