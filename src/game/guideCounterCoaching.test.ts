import { describe, expect, it } from "vitest";
import type { Direction } from "./constants";
import { guideCounterCue, guideCounterFacing } from "./guideCounterCoaching";
import { GuideCounterTraining, type GuideCounterReadout } from "./guideCounterTraining";
import { WeaponStateController } from "../systems/weaponState";

function lesson(boltY: number): GuideCounterReadout {
  return { phase: "incoming", remainingMs: 2000, target: { x: 176, y: 174 },
    bolt: { x: 176, y: boltY, returned: false }, attempts: 1, harmless: true };
}

describe("practice counter coaching", () => {
  it.each([{ x: 176, y: 174 }, { x: 96, y: 154 }, { x: 216, y: 112 }, { x: 176, y: 70 }])(
    "auto-facing a timed swing returns the Ego Bolt to DANN-E from %j", player => {
      const training = new GuideCounterTraining();
      const weapon = new WeaponStateController();
      let facing: Direction = "south";
      let returned = false, completed = false;
      for (let now = 0; now < 7000; now += 10) {
        const current = training.readout();
        const aim = guideCounterFacing(current, player);
        if (guideCounterCue(current, player, aim, weapon.readout(now).canSwing) === "swing") {
          if (weapon.tryStart("citation_stamp", now)) facing = aim;
        }
        const event = training.update(10, player, weapon.activeHitbox(player, facing, now));
        if (event === "return") returned = true;
        if (event === "complete") { completed = true; break; }
      }
      expect(returned).toBe(true);
      expect(completed).toBe(true);
    }
  );
  it.each(["stapler", "citation_stamp"] as const)("predicts a real moving return with %s", tool => {
    for (const velocity of [{x:0,y:-30},{x:0,y:30},{x:-25,y:0},{x:25,y:0}]) {
      const player = { x:176, y:164 };
      const training = new GuideCounterTraining();
      const weapon = new WeaponStateController();
      let facing: Direction = "north", returned = false, started = false;
      for (let now = 0; now < 4000; now += 5) {
        const current = training.readout();
        if (current.phase === "incoming") {
          const movingScale = weapon.movementScale(now);
          player.x += velocity.x * movingScale * .005;
          player.y += velocity.y * movingScale * .005;
          const aim = guideCounterFacing(current, player);
          if (!started && guideCounterCue(current, player, aim, true, {tool, velocity}) === "swing") {
            started = weapon.tryStart(tool, now);
            facing = aim;
          }
        }
        const event = training.update(5, player, weapon.activeHitbox(player, facing, now));
        if (event === "return") { returned = true; break; }
      }
      expect(returned, `${tool} moving ${JSON.stringify(velocity)}`).toBe(true);
      expect(weapon.swingId).toBe(1);
    }
  });

  it("names the missing facing input instead of inviting a swing away from the bolt", () => {
    expect(guideCounterCue(lesson(132), { x: 176, y: 174 }, "south", true)).toBe("faceNorth");
    const ready = new GuideCounterTraining().readout();
    expect(guideCounterCue(ready, { x: 96, y: 154 }, "north", true)).toBe("faceEast");
    expect(guideCounterCue(ready, { x: 216, y: 112 }, "north", true)).toBe("stepBack");
    expect(guideCounterCue(ready, { x: 176, y: 70 }, "north", true)).toBe("faceSouth");
    expect(guideCounterCue(lesson(132), { x: 220, y: 132 }, "south", true)).toBe("faceWest");
  });

  it("waits for an actual predicted active-window intersection", () => {
    const player = { x: 176, y: 174 };
    expect(guideCounterCue(lesson(122), player, "north", true)).toBe("wait");
    expect(guideCounterCue(lesson(135), player, "north", true)).toBe("swing");
    expect(guideCounterCue(lesson(170), player, "north", true)).toBe("wait");
    expect(guideCounterCue(lesson(135), { x: 210, y: 174 }, "north", true)).toBe("wait");
    expect(guideCounterCue(lesson(135), player, "north", false)).toBe("recover");
  });

  it("never encourages another swing after a successful return", () => {
    expect(guideCounterCue({ ...lesson(135), phase: "returned" }, { x: 176, y: 174 }, "south", false)).toBe("returned");
  });

  it.each([
    [{ x: 176, y: 174 }, "north"],
    [{ x: 96, y: 154 }, "east"],
    [{ x: 216, y: 112 }, "west"],
    [{ x: 176, y: 70 }, "south"]
  ] as const)("the cue can produce a real return from %j facing %s", (player, facing: Direction) => {
    const training = new GuideCounterTraining();
    const weapon = new WeaponStateController();
    let pressAt = Infinity;
    let returned = false;
    for (let now = 0; now < 7000; now += 10) {
      if (now === pressAt) weapon.tryStart("citation_stamp", now);
      const event = training.update(10, player, weapon.activeHitbox(player, facing, now));
      if (event === "return") { returned = true; break; }
      if (guideCounterCue(training.readout(), player, facing, weapon.readout(now).canSwing) === "swing" && pressAt === Infinity) {
        pressAt = now + 50;
      }
    }
    expect(returned).toBe(true);
    expect(weapon.swingId).toBe(1);
  });
});
