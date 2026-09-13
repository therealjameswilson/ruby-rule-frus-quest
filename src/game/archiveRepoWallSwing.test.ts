import { describe, expect, it } from "vitest";
import { archiveRepoWallSwing, type SourceNoteStatus } from "./archiveSourceRoom";
import type { Direction } from "./constants";
import { buildWeaponHitbox, WeaponStateController, WEAPON_TIMINGS } from "../systems/weaponState";

const wallBounds = { x: 87, y: 132, width: 30, height: 34 };
const position = { x: 102, y: 171 };
const ready = {
  sourceNoteStatus: "stamped" as const,
  hasCitationStamp: true,
  tool: "citation_stamp" as const,
  hitbox: buildWeaponHitbox(position, "north", "citation_stamp"),
  wallBounds
};

describe("Archive source wall equipped swing", () => {
  it("only clears during the Citation Stamp's active frames", () => {
    const weapon = new WeaponStateController();
    const timing = WEAPON_TIMINGS.citation_stamp;
    const result = (time: number) => archiveRepoWallSwing({
      ...ready, tool: weapon.tool, hitbox: weapon.activeHitbox(position, "north", time)
    });
    expect(result(0)).toBe("miss");
    weapon.tryStart("citation_stamp", 0);
    expect(result(timing.windupMs - 1)).toBe("miss");
    expect(result(timing.windupMs)).toBe("clear");
    expect(result(timing.windupMs + timing.activeMs - 1)).toBe("clear");
    expect(result(timing.windupMs + timing.activeMs)).toBe("miss");
    expect(result(timing.windupMs + timing.activeMs + timing.cooldownMs)).toBe("miss");
  });

  it.each<SourceNoteStatus>(["inactive", "carried", "routed", "verified"])(
    "does not substitute an owned tool for source/human review at %s", (sourceNoteStatus) => {
      expect(archiveRepoWallSwing({ ...ready, sourceNoteStatus })).toBe("review-required");
    }
  );

  it.each(["red_pencil", "review_folder", null] as const)("rejects the wrong tool: %s", (tool) => {
    expect(archiveRepoWallSwing({ ...ready, tool })).toBe("stamp-required");
  });

  it("requires ownership, even if a stale swing reports Citation Stamp", () => {
    expect(archiveRepoWallSwing({ ...ready, hasCitationStamp: false })).toBe("stamp-required");
  });

  it.each<[Direction, number, number]>([
    ["north", 102, 179], ["south", 102, 119], ["east", 72, 149], ["west", 132, 149]
  ])("accepts a real hit from the %s facing at the interaction range", (facing, x, y) => {
    expect(archiveRepoWallSwing({
      ...ready, hitbox: buildWeaponHitbox({ x, y }, facing, "citation_stamp")
    })).toBe("clear");
  });

  it("does not react to a swing out of range or facing away", () => {
    expect(archiveRepoWallSwing({
      ...ready, hitbox: buildWeaponHitbox({ x: 220, y: 190 }, "north", "citation_stamp")
    })).toBe("miss");
    expect(archiveRepoWallSwing({ ...ready, hitbox: buildWeaponHitbox(position, "south", "citation_stamp") })).toBe("miss");
  });
});
