import { beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "./Player";
import { gameState, resetGameState } from "../game/state";
import { CombatClock } from "../systems/combatClock";
import { WeaponStateController } from "../systems/weaponState";

vi.mock("phaser", () => ({ default: {} }));
vi.mock("../systems/audio", () => ({ retroAudio: { toolWindup: vi.fn(), playerHurt: vi.fn() } }));
vi.mock("../systems/combatFeedback", () => ({ applyHitShake: vi.fn() }));

function fixture() {
  const time = { now: 1000 }, sprite = { setActive: vi.fn(), setAngle: vi.fn(), setScale: vi.fn(), clearTint: vi.fn() };
  const player = Object.assign(Object.create(Player.prototype), {
    scene: { time }, sprite, logicalX: 128, logicalY: 180, facing: "north", idleClock: 0,
    invulnerableUntil: 1500, hurtUntil: 1300, abilityFrameUntil: 0, controlState: "hurt",
    combatClock: new CombatClock(), weaponState: new WeaponStateController(),
    syncRenderPosition: vi.fn(), pushAwayFrom: vi.fn()
  }) as Player;
  return { player, time, sprite };
}

beforeEach(() => resetGameState());

describe("player combat during overlays", () => {
  it("keeps the remaining recovery window and does not move the player", () => {
    const { player, time, sprite } = fixture();
    time.now = 1100;
    player.update(16, false);
    const before = player.combatReadout;
    time.now = 51100;
    player.update(16, false);
    expect(player.combatReadout).toEqual(before);
    expect(before.invulnerableMsRemaining).toBe(400);
    expect(player.position).toEqual({ x: 128, y: 180 });
    expect(sprite.setActive).toHaveBeenCalledExactlyOnceWith(false);
    player.setCombatPaused(false);
    time.now += 399;
    expect(player.isInvulnerable).toBe(true);
    time.now += 1;
    expect(player.isInvulnerable).toBe(false);
    expect(sprite.setActive).toHaveBeenLastCalledWith(true);
  });

  it.each(["citation_stamp", "red_pencil", "review_folder"] as const)("preserves %s windup, active frames and cooldown", (tool) => {
    const { player, time } = fixture();
    player.startAction(tool);
    for (const elapsed of [25, 120, 200]) {
      time.now += elapsed;
      player.update(16, false);
      const before = player.combatReadout;
      time.now += 10000;
      expect(player.combatReadout).toEqual(before);
      expect(player.activeActionHitbox).toEqual(before.hitbox ? expect.objectContaining(before.hitbox) : null);
      player.setCombatPaused(false);
      expect(player.combatReadout).toEqual(before);
    }
    time.now += 1000;
    expect(player.combatReadout.weapon.phase).toBe("idle");
    expect(player.actionId).toBe(1);
  });
});


it("shows the newly equipped tool at idle without changing an ongoing swing", () => {
  const { player, time } = fixture();
  gameState.equippedProcessItem = "red_pencil";
  expect(player.combatReadout.weapon.tool).toBe("red_pencil");
  player.startAction("citation_stamp");
  expect(player.combatReadout.weapon.tool).toBe("citation_stamp");
  time.now += 1000;
  expect(player.combatReadout.weapon.tool).toBe("red_pencil");
  expect(player.combatReadout.weapon.label).toBe("Red Pencil");
});
