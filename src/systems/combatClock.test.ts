import { describe, expect, it } from "vitest";
import { CombatClock } from "./combatClock";
import { WeaponStateController } from "./weaponState";

describe("combat-only pause clock", () => {
  it("preserves the scene-time origin and subtracts only paused intervals", () => {
    const clock = new CombatClock();
    expect(clock.now(2000)).toBe(2000);
    expect(clock.setPaused(true, 2100)).toBe(true);
    expect(clock.setPaused(true, 9000)).toBe(false);
    expect(clock.now(9000)).toBe(2100);
    clock.setPaused(false, 12100);
    expect(clock.now(12300)).toBe(2300);
    clock.setPaused(true, 12500);
    clock.setPaused(false, 15000);
    expect(clock.now(15100)).toBe(2600);
  });

  it.each([30, 100, 260])("holds the weapon window at %i ms without adding a swing", (elapsed) => {
    const clock = new CombatClock(), weapon = new WeaponStateController();
    weapon.tryStart("red_pencil", clock.now(1000));
    clock.setPaused(true, 1000 + elapsed);
    const before = weapon.readout(clock.now(1000 + elapsed));
    expect(weapon.readout(clock.now(60000))).toEqual(before);
    clock.setPaused(false, 60000);
    expect(weapon.readout(clock.now(60000))).toEqual(before);
    expect(weapon.tryStart("red_pencil", clock.now(60000))).toBe(false);
    expect(weapon.readout(clock.now(61000)).phase).toBe("idle");
    expect(weapon.swingId).toBe(1);
  });
});
