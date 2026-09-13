import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameState, hasProcessItem } from "../game/state";
import type { PlayerCombatReadout } from "../game/types";
import { WeaponStateController, type WeaponToolId } from "./weaponState";
import { tryEquippedToolSwing } from "./toolSwing";

vi.mock("../game/state", () => ({ gameState: { equippedProcessItem: "citation_stamp" }, hasProcessItem: vi.fn(() => true) }));

function player() {
  const weapon = new WeaponStateController();
  const combatReadout: PlayerCombatReadout = {
    state: "idle", actionActive: false, actionMsRemaining: 0, invulnerable: false,
    invulnerableMsRemaining: 0, hitbox: null, weapon: weapon.readout(0)
  };
  return { combatReadout, startAction: vi.fn((tool: WeaponToolId) => weapon.tryStart(tool, 0)) };
}

describe("equipped tool input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameState.equippedProcessItem = "citation_stamp";
    vi.mocked(hasProcessItem).mockReturnValue(true);
  });

  it.each<WeaponToolId>(["citation_stamp", "red_pencil", "review_folder"])("starts the owned %s through the existing weapon state machine", (tool) => {
    gameState.equippedProcessItem = tool;
    const hero = player();
    expect(tryEquippedToolSwing(hero)).toEqual({ started: true });
    expect(hero.startAction).toHaveBeenCalledWith(tool);
    expect(tryEquippedToolSwing(hero)).toEqual({ started: false });
  });

  it("does not silently normalize missing or noncombat tools into a free Citation Stamp", () => {
    const hero = player();
    for (const tool of [null, "clearance_token", "citation_stamp"] as const) {
      gameState.equippedProcessItem = tool;
      vi.mocked(hasProcessItem).mockReturnValue(false);
      expect(tryEquippedToolSwing(hero)).toMatchObject({ started: false, reason: expect.any(String) });
    }
    expect(hero.startAction).not.toHaveBeenCalled();
  });

  it("cannot cancel hurt recovery into a swing", () => {
    const hero = player();
    hero.combatReadout.state = "hurt";
    expect(tryEquippedToolSwing(hero)).toEqual({ started: false });
    expect(hero.startAction).not.toHaveBeenCalled();
  });
});
