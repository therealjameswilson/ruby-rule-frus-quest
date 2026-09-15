import { expect, it, vi } from "vitest";
import { advanceSodaCan, SODA_FLAVORS } from "./sodaCanAttack";
vi.mock("phaser", () => ({ default: {} }));
vi.mock("./audio", () => ({ retroAudio: {} }));
vi.mock("../input/InputState", () => ({ bindPointerPress: vi.fn() }));
it("flies toward DANN-E and resolves contact without overshooting", () => {
  let can = { x: 40, y: 140, hit: false };
  for (let n = 0; n < 100 && !can.hit; n++) can = advanceSodaCan(can, { x: 176, y: 112 }, 16);
  expect(can).toEqual({ x: 176, y: 112, hit: true });
});
it("caps delayed frames and has three distinct flavors", () => {
  expect(advanceSodaCan({ x: 0, y: 0 }, { x: 100, y: 0 }, 10000).x).toBe(8);
  expect(new Set(SODA_FLAVORS.map(flavor => flavor.name)).size).toBe(3);
});
