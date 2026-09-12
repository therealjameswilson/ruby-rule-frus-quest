import { beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "./Player";
import { resetGameState } from "../game/state";
import { CombatClock } from "../systems/combatClock";

const input = vi.hoisted(() => ({ dir: { x: 0, y: 0 } }));
vi.mock("../input/InputState", () => ({ getInput: () => input }));
vi.mock("phaser", () => ({ default: { Math: { Clamp: (n: number, min: number, max: number) => Math.min(max, Math.max(min, n)) } } }));

function fixture() {
  const player = Object.create(Player.prototype) as Player;
  const internals = {
    logicalX: 100, logicalY: 100, velocityX: 0, velocityY: 0,
    speed: 72, cornerNudgePixels: 3, facing: "south", movementOptions: {},
    walkClock: 0, idleClock: 0, abilityFrameUntil: 0, invulnerableUntil: 0, hurtUntil: 0,
    scene: { time: { now: 0 } }, combatClock: new CombatClock(),
    weaponState: { update: vi.fn(), movementScale: () => 1, phase: "idle" },
    sprite: { setAngle: vi.fn(), setScale: vi.fn(), clearTint: vi.fn(), setFlipX: vi.fn() },
    shadow: { setScale: vi.fn() },
    collidesAt: vi.fn((_x: number, _y: number) => false), syncRenderPosition: vi.fn()
  };
  Object.assign(player, internals);
  const coords = player as unknown as { logicalX: number; logicalY: number };
  return { player, internals, coords };
}

beforeEach(() => { resetGameState(); input.dir = { x: 0, y: 0 }; });

describe("live player movement", () => {
  it.each([30, 60, 120])("travels the same distance at %s frames per second", fps => {
    const { player, coords } = fixture();
    input.dir.x = 1;
    for (let i = 0; i < fps; i++) player.update(1000 / fps, true);
    expect(coords.logicalX).toBeCloseTo(172);
    expect(coords.logicalY).toBe(100);
  });

  it("starts, reverses and stops on the current input frame", () => {
    const { player, coords } = fixture();
    input.dir.x = 1;
    player.update(1000 / 60, true);
    expect(coords.logicalX).toBeCloseTo(101.2);
    input.dir.x = -1;
    player.update(1000 / 60, true);
    expect(coords.logicalX).toBeCloseTo(100);
    input.dir.x = 0;
    player.update(1000 / 60, true);
    expect(coords.logicalX).toBeCloseTo(100);
    expect(player.animationState).toBe("idle_left");
  });

  it("does not walk in place or drift sideways against a solid wall", () => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation(x => x > 100);
    input.dir.x = 1;
    for (let i = 0; i < 20; i++) player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBe(100);
    expect(coords.logicalY).toBe(100);
    expect(player.animationState).toBe("idle_right");
  });

  it("rounds an open corner gently, at most one lateral pixel per frame", () => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation((x, y) => x > 100 && y > 98);
    input.dir.x = 1;
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBe(100);
    expect(coords.logicalY).toBe(99);
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalY).toBe(98);
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBeGreaterThan(100);
  });

  it("slides along a wall in the held diagonal direction without opposite nudges", () => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation(x => x > 100);
    input.dir = { x: 1, y: 1 };
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBe(100);
    expect(coords.logicalY).toBeCloseTo(100 + 1.2 * Math.SQRT1_2);
  });
});
