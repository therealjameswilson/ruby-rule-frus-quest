import { beforeAll, describe, expect, it } from "vitest";
import type * as WeaponStateModule from "./weaponState";

let weaponState: typeof WeaponStateModule;

describe("weaponState", () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        navigator: globalThis.navigator ?? { userAgent: "vitest" },
        location: { href: "http://localhost/" }
      },
      configurable: true
    });
    weaponState = await import("./weaponState");
  });

  it("recognizes only the equipped combat tools", () => {
    const { isWeaponTool, normalizeWeaponTool } = weaponState;
    expect(isWeaponTool("citation_stamp")).toBe(true);
    expect(isWeaponTool("red_pencil")).toBe(true);
    expect(isWeaponTool("review_folder")).toBe(true);
    expect(isWeaponTool("proof_lens")).toBe(false);
    expect(normalizeWeaponTool(null)).toBe("citation_stamp");
  });

  it("keeps the hitbox absent until the active frame window", () => {
    const { WeaponStateController, WEAPON_TIMINGS } = weaponState;
    const state = new WeaponStateController();
    const position = { x: 128, y: 120 };
    const timing = WEAPON_TIMINGS.red_pencil;

    expect(state.tryStart("red_pencil", 1000)).toBe(true);
    expect(state.readout(1000).phase).toBe("windup");
    expect(state.activeHitbox(position, "east", 1000)).toBeNull();

    const activeAt = 1000 + timing.windupMs + 1;
    const activeHitbox = state.activeHitbox(position, "east", activeAt);
    expect(state.readout(activeAt).phase).toBe("active");
    expect(activeHitbox).not.toBeNull();
    expect(activeHitbox?.width).toBe(timing.hitbox.height);
    expect(activeHitbox?.height).toBe(timing.hitbox.width);

    const cooldownAt = 1000 + timing.windupMs + timing.activeMs + 1;
    expect(state.activeHitbox(position, "east", cooldownAt)).toBeNull();
    expect(state.readout(cooldownAt).phase).toBe("cooldown");
    expect(state.tryStart("citation_stamp", cooldownAt)).toBe(false);

    const idleAt = 1000 + timing.windupMs + timing.activeMs + timing.cooldownMs + 1;
    expect(state.readout(idleAt).phase).toBe("idle");
    expect(state.tryStart("citation_stamp", idleAt)).toBe(true);
  });

  it("builds distinct directional hitboxes for each tool", () => {
    const { buildWeaponHitbox } = weaponState;
    const position = { x: 100, y: 100 };
    const stampNorth = buildWeaponHitbox(position, "north", "citation_stamp");
    const pencilEast = buildWeaponHitbox(position, "east", "red_pencil");
    const folderSouth = buildWeaponHitbox(position, "south", "review_folder");

    expect(stampNorth.y).toBeLessThan(position.y);
    expect(pencilEast.x).toBeGreaterThan(position.x);
    expect(folderSouth.y).toBeGreaterThan(position.y);
    expect(pencilEast.height).toBeGreaterThan(stampNorth.height);
    expect(folderSouth.width).toBeGreaterThan(stampNorth.width);
  });

  it("keeps one swing id through the active window so a target cannot be hit twice", () => {
    const { WeaponStateController, WEAPON_TIMINGS } = weaponState;
    const state = new WeaponStateController();
    const timing = WEAPON_TIMINGS.review_folder;
    const registeredHits = new Set<string>();

    const registerHit = (targetId: string, nowMs: number) => {
      const readout = state.readout(nowMs);
      if (!readout.active) return false;
      const key = `${readout.swingId}:${targetId}`;
      if (registeredHits.has(key)) return false;
      registeredHits.add(key);
      return true;
    };

    expect(state.tryStart("review_folder", 5000)).toBe(true);
    const activeStart = 5000 + timing.windupMs + 1;
    const firstSwingId = state.readout(activeStart).swingId;

    expect(registerHit("danne-mark-i", activeStart)).toBe(true);
    const activeEndInside = 5000 + timing.windupMs + timing.activeMs - 1;
    expect(registerHit("danne-mark-i", activeStart + Math.floor(timing.activeMs / 2))).toBe(false);
    expect(state.readout(activeEndInside).swingId).toBe(firstSwingId);
    expect(registerHit("danne-cloud", activeEndInside)).toBe(true);

    const idleAt = 5000 + timing.windupMs + timing.activeMs + timing.cooldownMs + 1;
    expect(state.readout(idleAt).phase).toBe("idle");
    expect(state.tryStart("review_folder", idleAt)).toBe(true);
    const nextActive = idleAt + timing.windupMs + 1;
    expect(state.readout(nextActive).swingId).toBe(firstSwingId + 1);
    expect(registerHit("danne-mark-i", nextActive)).toBe(true);
  });
});
