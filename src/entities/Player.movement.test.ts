import { retroAudio } from "../systems/audio";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "./Player";
import { resetGameState } from "../game/state";
import { CombatClock } from "../systems/combatClock";
import { PLAYER_MOVEMENT_TUNING, walkingFeetOverlap } from "../systems/smoothMovement";

const SPEED = PLAYER_MOVEMENT_TUNING.speed;

const input = vi.hoisted(() => ({ dir: { x: 0, y: 0 } }));
vi.mock("../input/InputState", () => ({ getInput: () => input }));
vi.mock("phaser", () => ({ default: { Math: { Clamp: (n: number, min: number, max: number) => Math.min(max, Math.max(min, n)) } } }));

function fixture() {
  const player = Object.create(Player.prototype) as Player;
  const internals = {
    logicalX: 100, logicalY: 100, velocityX: 0, velocityY: 0,
    cornerNudgePixels: 4, facing: "south", movementOptions: {},
    walkClock: 0, idleClock: 0, abilityFrameUntil: 0, invulnerableUntil: 0, hurtUntil: 0,
    scene: { time: { now: 0 } }, combatClock: new CombatClock(),
    weaponState: { update: vi.fn(), movementScale: () => 1, phase: "idle", readout: () => ({phase:"idle", tool:"stapler"}) },
    sprite: { setActive: vi.fn(), setAngle: vi.fn(), setScale: vi.fn(), clearTint: vi.fn(), setFlipX: vi.fn() },
    shadow: { setScale: vi.fn() },
    collidesAt: vi.fn((_x: number, _y: number) => false), syncRenderPosition: vi.fn()
  };
  Object.assign(player, internals);
  const coords = player as unknown as { logicalX: number; logicalY: number };
  return { player, internals, coords };
}

beforeEach(() => { vi.restoreAllMocks(); resetGameState(); input.dir = { x: 0, y: 0 }; });

describe("live player movement", () => {
  it.each([30, 60, 120])("stops at an NPC's feet and can immediately walk away at %s FPS", fps => {
    const { player, coords, internals } = fixture();
    const feet = { x: 64, y: 119, width: 12, height: 8 };
    coords.logicalX = 90;
    coords.logicalY = 122;
    internals.collidesAt.mockImplementation((x, y) => walkingFeetOverlap(x, y, feet));
    input.dir.x = -1;
    for (let frame = 0; frame < fps; frame++) {
      player.update(1000 / fps, true, { solids: [{}] as never[] });
      expect(walkingFeetOverlap(coords.logicalX, coords.logicalY, feet)).toBe(false);
    }
    expect(coords.logicalX).toBeCloseTo(82, 2);
    expect(coords.logicalY).toBe(122);
    input.dir.x = 1;
    player.update(1000 / fps, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBeCloseTo(82 + SPEED / fps, 2);
  });

  it.each([30, 60, 120])("keeps corner assistance inside the remaining movement budget at %s FPS", fps => {
    for (const axis of ["x", "y"] as const) for (const sign of [-1, 1]) for (const scale of [0.5, 1]) {
      const { player, coords, internals } = fixture();
      const step = SPEED * scale / fps;
      internals.weaponState.movementScale = () => scale;
      if (axis === "x") coords.logicalX = 100 - sign * step * 0.8;
      else coords.logicalY = 100 - sign * step * 0.8;
      const start = { x: coords.logicalX, y: coords.logicalY };
      internals.collidesAt.mockImplementation((x, y) =>
        sign * ((axis === "x" ? x : y) - 100) > 0 && (axis === "x" ? y : x) > 98);
      input.dir = { x: axis === "x" ? sign : 0, y: axis === "y" ? sign : 0 };
      player.update(1000 / fps, true, { solids: [{}] as never[] });
      const travelled = Math.abs(coords.logicalX - start.x) + Math.abs(coords.logicalY - start.y);
      expect(travelled).toBeLessThanOrEqual(step + 0.001);
      expect(axis === "x" ? coords.logicalY : coords.logicalX).toBeLessThan(100);
    }
  });

  it.each([30, 60, 120])("clears fractional doorway edges without overshooting at %s FPS", fps => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation((x, y) => x > 100 && y > 99.75);
    input.dir.x = 1;
    player.update(1000 / fps, true, { solids: [{}] as never[] });
    expect(coords.logicalY).toBeLessThanOrEqual(99.75);
    expect(coords.logicalY).toBeGreaterThan(99.749);
    expect(coords.logicalX).toBeGreaterThan(100);
    expect(Math.abs(coords.logicalX - 100) + Math.abs(coords.logicalY - 100)).toBeLessThanOrEqual(SPEED / fps + 0.0001);
    player.update(1000 / fps, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBeGreaterThan(100);
  });

  it("guides through a doorway within a quarter tile but not beyond it", () => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation((x, y) => x > 100 && y > 96);
    input.dir.x = 1;
    for (let i = 0; i < 5; i++) player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalY).toBe(96);
    expect(coords.logicalX).toBeGreaterThan(100);
    coords.logicalX = 100;
    coords.logicalY = 101;
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBe(100);
    expect(coords.logicalY).toBe(101);
  });

  it.each([30, 60, 120])("approaches an obstacle without a frame-sized gap at %s FPS", fps => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation(x => x >= 105.3);
    input.dir.x = 1;
    for (let i = 0; i < fps; i++) player.update(1000 / fps, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBeLessThan(105.3);
    expect(coords.logicalX).toBeGreaterThan(105.299);
    expect(coords.logicalY).toBe(100);
    input.dir.x = -1;
    player.update(1000 / fps, true);
    expect(coords.logicalX).toBeCloseTo(105.3 - SPEED / fps, 2);
  });

  it.each(["x", "y"] as const)("keeps a partial negative %s step without entering the wall", axis => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation((x, y) => (axis === "x" ? x : y) <= 99.5);
    input.dir[axis] = -1;
    player.update(1000 / 30, true, { solids: [{}] as never[] });
    const position = axis === "x" ? coords.logicalX : coords.logicalY;
    expect(position).toBeGreaterThan(99.5);
    expect(position).toBeLessThan(99.501);
  });

  it.each([30, 60, 120])("travels the same distance at %s frames per second", fps => {
    const { player, coords } = fixture();
    input.dir.x = 1;
    for (let i = 0; i < fps; i++) player.update(1000 / fps, true);
    expect(coords.logicalX).toBeCloseTo(100 + SPEED);
    expect(coords.logicalY).toBe(100);
  });

  it("starts, reverses and stops on the current input frame", () => {
    const { player, coords } = fixture();
    input.dir.x = 1;
    player.update(1000 / 60, true);
    expect(coords.logicalX).toBeCloseTo(100 + SPEED / 60);
    input.dir.x = -1;
    player.update(1000 / 60, true);
    expect(coords.logicalX).toBeCloseTo(100);
    input.dir.x = 0;
    player.update(1000 / 60, true);
    expect(coords.logicalX).toBeCloseTo(100);
    expect(player.animationState).toBe("idle_left");
  });

  it.each(["windup", "active"])("keeps attack facing during %s while allowing sideways movement", phase => {
    const { player, coords, internals } = fixture();
    internals.weaponState.phase = phase;
    input.dir.x = 1;
    player.update(1000 / 60, true);
    expect(player.facingDirection).toBe("south");
    expect(coords.logicalX).toBeGreaterThan(100);
    internals.weaponState.phase = "cooldown";
    player.update(1000 / 60, true);
    expect(player.facingDirection).toBe("east");
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

  it("rounds an open corner gently without an instant sideways snap", () => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation((x, y) => x > 100 && y > 98);
    input.dir.x = 1;
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBe(100);
    expect(coords.logicalY).toBe(100 - PLAYER_MOVEMENT_TUNING.cornerGuideSpeed / 60);
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalY).toBe(98);
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBeGreaterThan(100);
  });

  it.each([30, 60, 120])("guides around a corner at the same rate at %s FPS", fps => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation((x, y) => x > 100 && y > 98);
    input.dir.x = 1;
    for (let i = 0; i < fps / 30; i++) player.update(1000 / fps, true, { solids: [{}] as never[] });
    expect(coords.logicalY).toBeCloseTo(98);
    expect(coords.logicalX).toBeGreaterThan(100);
    expect(coords.logicalX).toBeLessThanOrEqual(100 + SPEED / 30 - 2 + 0.0001);
  });

  it("paces the stride by distance rather than elapsed time during slow movement", () => {
    const { player, internals } = fixture();
    internals.weaponState.movementScale = () => 0.5;
    input.dir.x = 1;
    player.update(1000 / 60, true);
    const animation = player as unknown as { walkClock: number };
    expect(animation.walkClock).toBeCloseTo(1000 / 120);
    input.dir = { x: 0, y: -1 };
    player.update(1000 / 60, true);
    expect(animation.walkClock).toBeCloseTo(1000 / 60);
    input.dir = { x: 0, y: 0 };
    player.update(1000 / 60, true);
    expect(animation.walkClock).toBe(0);
  });

  it("keeps the same walk step when changing direction and resumes idle animation on release", () => {
    const { player } = fixture();
    const sprite = { anims: { stop: vi.fn() }, setFrame: vi.fn(), setFlipX: vi.fn(), play: vi.fn() };
    Object.assign(player, {
      sprite, spriteMode: "artPack32x48", characterKey: "compiler",
      isMoving: true, walkClock: 280, facing: "east",
      scene: { time: { now: 0 }, anims: { exists: () => true } }
    });
    const animation = player as unknown as { updateRoleFrame(): void; facing: string; isMoving: boolean };
    animation.updateRoleFrame();
    expect(sprite.setFrame).toHaveBeenLastCalledWith(11);
    animation.facing = "north";
    animation.updateRoleFrame();
    expect(sprite.setFrame).toHaveBeenLastCalledWith(6);
    expect(sprite.setFlipX).toHaveBeenLastCalledWith(true);
    expect(sprite.play).not.toHaveBeenCalled();
    animation.isMoving = false;
    animation.updateRoleFrame();
    expect(sprite.play).toHaveBeenCalledWith("compiler-idle-up", true);
  });

  it("slides along a wall in the held diagonal direction without opposite nudges", () => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation(x => x > 100);
    input.dir = { x: 1, y: 1 };
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBe(100);
    expect(coords.logicalY).toBeCloseTo(100 + SPEED / 60);
  });

  it.each([30, 60, 120])("slides at walking speed without sticking at %s FPS", fps => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation((_x, y) => y > 100);
    input.dir = { x: -1, y: 1 };
    for (let i = 0; i < fps; i++) player.update(1000 / fps, true, {
      solids: [{}] as never[], bounds: { left: 0, right: 240, top: 40, bottom: 220 }
    });
    expect(coords.logicalX).toBeCloseTo(100 - SPEED);
    expect(coords.logicalY).toBe(100);
    input.dir = { x: 0, y: 0 };
    player.update(1000 / fps, true);
    expect(coords.logicalX).toBeCloseTo(100 - SPEED);
  });

  it("keeps open diagonals normalized and stops at a closed corner", () => {
    const { player, coords, internals } = fixture();
    input.dir = { x: 1, y: 1 };
    player.update(1000 / 60, true);
    expect(Math.hypot(coords.logicalX - 100, coords.logicalY - 100)).toBeCloseTo(SPEED / 60);
    coords.logicalX = 100;
    coords.logicalY = 100;
    internals.collidesAt.mockImplementation((x, y) => x > 100 || y > 100);
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(coords.logicalX).toBe(100);
    expect(coords.logicalY).toBe(100);
  });

  it("slides along room bounds and respects tool movement weight", () => {
    const { player, coords, internals } = fixture();
    internals.weaponState.movementScale = () => 0.5;
    input.dir = { x: 1, y: -1 };
    player.update(1000 / 60, true, { bounds: { left: 20, right: 100, top: 20, bottom: 180 } });
    expect(coords.logicalX).toBe(100);
    expect(coords.logicalY).toBeCloseTo(100 - SPEED * 0.5 / 60);
  });

  it.each(["x", "y"] as const)("chooses the nearer open edge when moving on %s", axis => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation((x, y) => {
      const forward = axis === "x" ? x : y;
      const lateral = axis === "x" ? y : x;
      return forward > 100 && lateral > 97 && lateral < 101;
    });
    input.dir[axis] = 1;
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(axis === "x" ? coords.logicalY : coords.logicalX).toBe(101);
    player.update(1000 / 60, true, { solids: [{}] as never[] });
    expect(axis === "x" ? coords.logicalX : coords.logicalY).toBeGreaterThan(100);
  });

  it.each([30, 60, 120])("does not steer past a one-pixel opening at %s FPS", fps => {
    const { player, coords, internals } = fixture();
    internals.collidesAt.mockImplementation((x, y) => x > 100 && y > 99);
    input.dir.x = 1;
    for (let i = 0; i < Math.ceil(fps / 60); i++) {
      player.update(1000 / fps, true, { solids: [{}] as never[] });
    }
    expect(coords.logicalY).toBe(99);
    input.dir.x = 0;
    player.update(1000 / fps, true);
    expect(coords.logicalY).toBe(99);
    expect(player.animationState).toBe("idle_right");
  });
});


describe("foot contact audio", () => {
  it("follows traveled strides and stays silent when stopped, paused or blocked", () => {
    const step=vi.spyOn(retroAudio,"footstep").mockImplementation(()=>{});
    const {player,internals}=fixture();
    input.dir={x:1,y:0};
    for(let i=0;i<24;i++)player.update(1000/60,true);
    expect(step).toHaveBeenCalledTimes(2);
    expect(step.mock.calls.map(call=>call[1])).toEqual([true,false]);
    input.dir={x:0,y:0};
    for(let i=0;i<24;i++)player.update(1000/60,true);
    expect(step).toHaveBeenCalledTimes(2);
    input.dir={x:1,y:0};
    player.update(1000,false);
    expect(step).toHaveBeenCalledTimes(2);
    internals.collidesAt.mockReturnValue(true);
    for(let i=0;i<24;i++)player.update(1000/60,true);
    expect(step).toHaveBeenCalledTimes(2);
  });
});
