import { describe, expect, it } from "vitest";
import { advanceBossBolt, aimReturnedBossBolt, createBossBoltMotion, DANNE_BOSS_RETURN } from "./danneBossCombat";

describe("DANN-E boss projectile motion", () => {
  it.each([30, 60, 120, 144, 240])("travels at the same speed at %i fps without rounding away motion", (fps) => {
    const bolt = createBossBoltMotion({ x: 100, y: 100 }, { x: 140, y: 120 }, 50);
    for (let frame = 0; frame < fps; frame += 1) advanceBossBolt(bolt, 1000 / fps);
    expect(bolt.x).toBeCloseTo(140, 7);
    expect(bolt.y).toBeCloseTo(120, 7);
    expect(Math.round(bolt.x)).toBe(140);
    expect(Math.round(bolt.y)).toBe(120);
  });

  it("aims from the visible muzzle, not the boss's feet", () => {
    const bolt = createBossBoltMotion({ x: 100, y: 100 }, { x: 150, y: 90 }, 50);
    expect(bolt).toEqual({ x: 100, y: 90, vx: 50, vy: 0 });
  });

  it("clamps stalls and ignores negative time", () => {
    const bolt = createBossBoltMotion({ x: 0, y: 10 }, { x: 100, y: 0 }, 100);
    advanceBossBolt(bolt, -30);
    expect(bolt.x).toBe(0);
    advanceBossBolt(bolt, 10000);
    expect(bolt.x).toBe(5);
  });

  it("aims a return from the bolt itself without applying another muzzle offset", () => {
    const bolt = { x: 128, y: 160, vx: 0, vy: 50 };
    aimReturnedBossBolt(bolt, { x: 128, y: 106 });
    expect(bolt).toEqual({ x: 128, y: 160, vx: 0, vy: -DANNE_BOSS_RETURN.speed });
    advanceBossBolt(bolt, 50);
    expect(bolt.y).toBe(152.5);
    aimReturnedBossBolt(bolt, { x: bolt.x, y: bolt.y });
    expect(bolt.vx).toBe(0);
    expect(bolt.vy).toBe(0);
  });
});
