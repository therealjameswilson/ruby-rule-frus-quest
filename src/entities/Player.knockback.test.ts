import { beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "./Player";
import { resetGameState } from "../game/state";

vi.mock("phaser", () => ({ default: { Math: { Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)) } } }));

interface Internals {
  logicalX: number;
  logicalY: number;
  velocityX: number;
  velocityY: number;
  movementOptions: { bounds?: { left: number; right: number; top: number; bottom: number }; solids?: unknown[] };
  collidesAt: ReturnType<typeof vi.fn>;
  syncRenderPosition: ReturnType<typeof vi.fn>;
}

function fixture(x = 200, y = 183) {
  // Exercise the real movement methods without constructing Phaser render objects.
  const player = Object.create(Player.prototype) as Player;
  const internals = player as unknown as Internals;
  Object.assign(internals, {
    logicalX: x, logicalY: y, velocityX: 58, velocityY: 0,
    facing: "east", movementOptions: {}, collidesAt: vi.fn(() => false), syncRenderPosition: vi.fn(),
    idleClock: 0, abilityFrameUntil: 0, invulnerableUntil: 0,
    scene: { time: { now: 0 } }, weaponState: { update: vi.fn() },
    sprite: { setAngle: vi.fn(), setScale: vi.fn(), clearTint: vi.fn() }
  });
  return { player, internals };
}

beforeEach(() => resetGameState());

describe("player knockback terrain collision", () => {
  it("preserves the full open-floor push and stops residual movement", () => {
    const { player, internals } = fixture();
    player.pushAwayFrom({ x: 180, y: 183 }, 12);
    expect(player.position).toEqual({ x: 212, y: 183 });
    expect(internals.velocityX).toBe(0);
    expect(internals.velocityY).toBe(0);
  });

  it("stops the feet before the proof room's east wall", () => {
    const { player, internals } = fixture(230, 183);
    const walls = [{ x: 240, y: 176, width: 16, height: 16 }];
    internals.movementOptions = { solids: walls };
    internals.collidesAt.mockImplementation((x: number) => x + 8 >= 240);
    player.pushAwayFrom({ x: 218, y: 183 }, 11);
    expect(player.position).toEqual({ x: 231, y: 183 });
    expect(internals.collidesAt).toHaveBeenLastCalledWith(232, 183, walls);
  });

  it("cannot jump over a thin wall even when the endpoint is clear", () => {
    const { player, internals } = fixture(100, 100);
    internals.collidesAt.mockImplementation((x: number) => x >= 104 && x <= 106);
    player.pushAwayFrom({ x: 90, y: 100 }, 12);
    expect(player.position).toEqual({ x: 103, y: 100 });
  });

  it("stops diagonal knockback at terrain without changing the hit direction", () => {
    const { player, internals } = fixture(100, 100);
    internals.collidesAt.mockImplementation((_x: number, y: number) => y >= 105);
    player.pushAwayFrom({ x: 90, y: 90 }, 20);
    expect(internals.logicalY).toBeLessThan(105);
    expect(internals.logicalX).toBe(internals.logicalY);
    expect(internals.logicalY).toBeGreaterThan(104);
  });

  it("uses scene bounds instead of pushing out of the room", () => {
    const { player, internals } = fixture(100, 100);
    internals.movementOptions = { bounds: { left: 30, right: 105, top: 50, bottom: 200 } };
    player.pushAwayFrom({ x: 90, y: 100 }, 20);
    expect(player.position).toEqual({ x: 105, y: 100 });
  });

  it("retains collision context while a dialogue freezes movement", () => {
    const { player, internals } = fixture(230, 183);
    const options = { solids: [{ x: 240, y: 176, width: 16, height: 16 }] };
    internals.movementOptions = options;
    internals.collidesAt.mockImplementation((x: number) => x + 8 >= 240);
    player.update(16, false);
    expect(internals.movementOptions).toBe(options);
    player.pushAwayFrom({ x: 218, y: 183 }, 11);
    expect(player.position).toEqual({ x: 231, y: 183 });
  });
});
