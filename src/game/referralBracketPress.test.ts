import { describe, expect, it } from "vitest";
import { referralBracketStrike } from "./referralBracketPress";
import { buildWeaponHitbox } from "../systems/weaponState";

const ready = {
  reviewed: true, step: 2, carried: 3, ownsStamp: true, tool: "citation_stamp" as const,
  hitbox: buildWeaponHitbox({ x: 176, y: 180 }, "north", "citation_stamp")
};

describe("physical bracket press", () => {
  it("prints only on an active stamp contact with the reviewed proof", () => {
    expect(referralBracketStrike(ready)).toBe("print");
    expect(referralBracketStrike({ ...ready, hitbox: null })).toBe("miss");
    expect(referralBracketStrike({ ...ready, hitbox: buildWeaponHitbox({ x: 176, y: 180 }, "south", "citation_stamp") })).toBe("miss");
  });
  it("rejects wrong tools and missing inventory", () => {
    expect(referralBracketStrike({ ...ready, tool: "red_pencil" })).toBe("wrong-tool");
    expect(referralBracketStrike({ ...ready, tool: "review_folder" })).toBe("wrong-tool");
    expect(referralBracketStrike({ ...ready, ownsStamp: false })).toBe("wrong-tool");
  });
  it("never skips review, missing dockets or already-completed treatment", () => {
    expect(referralBracketStrike({ ...ready, reviewed: false })).toBe("miss");
    for (const step of [0, 1, 3, NaN]) expect(referralBracketStrike({ ...ready, step })).toBe("miss");
    for (const carried of [0, 1, 2]) expect(referralBracketStrike({ ...ready, carried })).toBe("miss");
  });
});
