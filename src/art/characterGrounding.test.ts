import { describe, expect, it } from "vitest";
import { cachedCharacterPoses, characterGroundOffset, characterPoseCenter, groundedPoseTransform } from "./characterGrounding";

it('reuses pose measurements across rooms without reading sprite pixels again', () => {
  const texture = {};
  let reads = 0;
  const alpha = (_frame: number, x: number, y: number) => {
    reads++;
    return x >= 10 && x <= 20 && y >= 2 && y <= 45 ? 255 : 0;
  };
  const first = cachedCharacterPoses(texture, alpha);
  expect(first).toHaveLength(15);
  expect(first[0]).toEqual({ scaleY: 1, offsetY: 2, offsetX: .5 });
  const initialReads = reads;
  expect(initialReads).toBeGreaterThan(0);
  expect(cachedCharacterPoses(texture, alpha)).toBe(first);
  expect(reads).toBe(initialReads);
  expect(cachedCharacterPoses({}, alpha)).not.toBe(first);
  expect(reads).toBeGreaterThan(initialReads);
});

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

 it('grounds interaction, reading and approval frames as well as walking', () => {
 const poses=cachedCharacterPoses({}, (frame,x,y)=>x>=10&&x<=20&&y>=2&&y<=(frame>=12?38:45)?255:0);
 for (const frame of [12,13,14]) expect(poses[frame].offsetY+(38-43)*poses[frame].scaleY).toBeCloseTo(4);
 });
