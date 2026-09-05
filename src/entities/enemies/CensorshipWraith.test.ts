import { describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import type { Player } from "../Player";
import { CensorshipWraith, WRAITH_SWIPE_TIMING } from "./CensorshipWraith";

vi.mock("phaser", () => ({ default: {
  Display: { Color: { HexStringToColor: (hex: string) => ({ color: Number.parseInt(hex.slice(1), 16) }) } },
  Math: { Clamp: (n: number, min: number, max: number) => Math.min(max, Math.max(min, n)),
    Distance: { Between: (x: number, y: number, a: number, b: number) => Math.hypot(x - a, y - b) } },
  Geom: {
    Rectangle: class {
      constructor(public x: number, public y: number, public width: number, public height: number) {}
      get centerX() { return this.x + this.width / 2; }
      get centerY() { return this.y + this.height / 2; }
    },
    Intersects: { RectangleToRectangle: (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y }
  }
} }));
vi.mock("../../game/codex", () => ({ unlockCodexEntry: vi.fn() }));
vi.mock("../../systems/accessibilitySettings", () => ({ isColorblindModeEnabled: () => false }));

function node(x = 0, y = 0) {
  return {
    x, y, anims: { currentAnim: null },
    setPosition: vi.fn(function (this: { x: number; y: number }, a: number, b: number) { this.x = a; this.y = b; return this; }),
    setVisible: vi.fn().mockReturnThis(), setActive: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(), setStrokeStyle: vi.fn().mockReturnThis(), setFlipX: vi.fn().mockReturnThis(),
    setFillStyle: vi.fn().mockReturnThis(), setAlpha: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(), clearTint: vi.fn().mockReturnThis(), setAngle: vi.fn().mockReturnThis(),
    destroy: vi.fn(), play: vi.fn()
  };
}

function encounter() {
  const sprite = node(), zone = node();
  let rectangles = 0;
  const flash = { isPaused: () => false, pause: vi.fn(), resume: vi.fn() };
  const scene = { textures: { exists: () => false }, anims: { exists: () => false },
    tweens: { add: vi.fn(), getTweensOf: () => [flash] },
    add: { ellipse: node, sprite: () => sprite, container: node,
      rectangle: () => ++rectangles > 2 ? zone : node(), text: node } };
  const wraith = new CensorshipWraith(scene as unknown as Phaser.Scene, 128, 160, [{ x: 128, y: 160 }, { x: 160, y: 160 }]);
  const player = { position: { x: 128, y: 170 }, takeHit: vi.fn() };
  let now = 0;
  const tick = (ms: number, active = true) => {
    for (let elapsed = 0; elapsed < ms; elapsed += 20) { now += 20; wraith.update(now, 20, player as unknown as Player, active); }
  };
  return { wraith, player, tick, sprite, zone, flash, time: () => now };
}

describe("Black Vault ink-sweep pause fairness", () => {
  it("freezes patrol, animation and existing hit flash without resuming other tweens", () => {
    const { wraith, player, tick, sprite, flash } = encounter();
    player.position = { x: 128, y: 220 };
    tick(300);
    const position = wraith.position;
    tick(10000, false);
    expect(wraith.position).toEqual(position);
    expect(sprite.setActive).toHaveBeenCalledExactlyOnceWith(false);
    expect(flash.pause).toHaveBeenCalledOnce();
    expect(player.takeHit).not.toHaveBeenCalled();
    tick(200);
    expect(wraith.position).not.toEqual(position);
    expect(sprite.setActive).toHaveBeenLastCalledWith(true);
    expect(flash.resume).toHaveBeenCalledOnce();
  });

  it("retains the whole remaining windup, then lands one hit, not a hit behind the menu", () => {
    const { wraith, player, tick } = encounter();
    tick(100);
    const tell = wraith.telegraph;
    expect(tell).toMatchObject({ kind: "ink-sweep-windup", msRemaining: WRAITH_SWIPE_TIMING.windupMs - 80 });
    tick(12000, false);
    expect(wraith.telegraph).toEqual(tell);
    expect(wraith.status(12100)).toBe("winding up ink sweep");
    expect(player.takeHit).not.toHaveBeenCalled();
    tick(460); expect(player.takeHit).not.toHaveBeenCalled();
    tick(20); expect(player.takeHit).toHaveBeenCalledExactlyOnceWith(wraith.position, 10, 850);
    tick(160); expect(player.takeHit).toHaveBeenCalledOnce();
  });

  it("allows a dodge after resuming the warning instead of spending it in the menu", () => {
    const { wraith, player, tick } = encounter();
    tick(80); tick(10000, false);
    player.position = { x: 160, y: 200 };
    tick(1100);
    expect(player.takeHit).not.toHaveBeenCalled();
    expect(wraith.telegraph).toBeNull();
  });

  it("holds active and recovery frames and the interval before the next swipe", () => {
    const { wraith, player, tick } = encounter();
    tick(600);
    const active = wraith.telegraph;
    tick(6000, false);
    expect(wraith.telegraph).toEqual(active);
    expect(player.takeHit).toHaveBeenCalledOnce();
    tick(160);
    const recovery = wraith.telegraph;
    expect(recovery?.kind).toBe("ink-sweep-recovery");
    tick(6000, false);
    expect(wraith.telegraph).toEqual(recovery);
    tick(1000);
    expect(player.takeHit).toHaveBeenCalledOnce();
  });

  it("takes three hits, removes the pending sweep on defeat and never updates a dead actor", () => {
    const { wraith, player, tick, zone } = encounter();
    tick(40);
    expect(wraith.tryPlayerHit(100, 1)).toBe("hit");
    expect(wraith.tryPlayerHit(500, 1)).toBe("hit");
    expect(wraith.tryPlayerHit(900, 1)).toBe("kill");
    expect(wraith.healthReadout).toEqual({ hp: 0, maxHp: 3 });
    expect(zone.destroy).toHaveBeenCalledOnce();
    expect(wraith.telegraph).toBeNull();
    tick(3000);
    expect(player.takeHit).not.toHaveBeenCalled();
  });

  it("removes the separate sweep object when the boss introduction replaces its guards", () => {
    const { wraith, tick, zone } = encounter();
    tick(40); wraith.destroy();
    expect(zone.destroy).toHaveBeenCalledOnce();
  });

  it("preserves hit immunity so an active swing cannot hit twice across a pause", () => {
    const { wraith, tick, time } = encounter();
    tick(100);
    expect(wraith.tryPlayerHit(time())).toBe("hit");
    tick(10000, false);
    expect(wraith.tryPlayerHit(time())).toBe("miss");
    tick(100);
    expect(wraith.tryPlayerHit(time())).toBe("miss");
    expect(wraith.healthReadout.hp).toBe(2);
    tick(220);
    expect(wraith.tryPlayerHit(time())).toBe("hit");
  });
});
