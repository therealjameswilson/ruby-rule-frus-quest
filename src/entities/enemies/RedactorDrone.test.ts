import { beforeEach, describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import type { Player } from "../Player";
import { RedactorDrone, DRONE_STAMP_TIMING } from "./RedactorDrone";

const geometry = vi.hoisted(() => ({ blocked: false }));
vi.mock("phaser", () => ({ default: {
  Display: { Color: { HexStringToColor: (hex: string) => ({ color: Number.parseInt(hex.slice(1), 16) }) } },
  Math: { Clamp: (n: number, min: number, max: number) => Math.min(max, Math.max(min, n)),
    Distance: { Between: (x: number, y: number, a: number, b: number) => Math.hypot(x - a, y - b) } },
  Geom: {
    Rectangle: class { constructor(public x: number, public y: number, public width: number, public height: number) {} },
    Line: class { constructor(public x1: number, public y1: number, public x2: number, public y2: number) {} },
    Intersects: {
      LineToRectangle: () => geometry.blocked,
      RectangleToRectangle: (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    }
  }
} }));
vi.mock("../../game/codex", () => ({ unlockCodexEntry: vi.fn() }));
vi.mock("../../systems/accessibilitySettings", () => ({ isColorblindModeEnabled: () => false }));

function node(x = 0, y = 0) {
  return {
    x, y, visible: true, anims: { currentAnim: null },
    setPosition: vi.fn(function (this: { x: number; y: number }, a: number, b: number) { this.x = a; this.y = b; return this; }),
    setVisible: vi.fn(function (this: { visible: boolean }, visible: boolean) { this.visible = visible; return this; }),
    setOrigin: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(), setStrokeStyle: vi.fn().mockReturnThis(), setFillStyle: vi.fn().mockReturnThis(),
    setName: vi.fn().mockReturnThis(), setAlpha: vi.fn().mockReturnThis(), setFlipX: vi.fn().mockReturnThis(),
    setActive: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(), clearTint: vi.fn().mockReturnThis(), destroy: vi.fn(), play: vi.fn()
  };
}

function encounter() {
  const rectangles: ReturnType<typeof node>[] = [];
  const texts: Array<{ text: string; node: ReturnType<typeof node> }> = [];
  const scene = { textures: { exists: () => false }, anims: { exists: () => false }, tweens: { add: vi.fn(), getTweensOf: () => [] },
    add: { ellipse: node, sprite: node, container: node,
      rectangle: (x: number, y: number) => { const n = node(x, y); rectangles.push(n); return n; },
      text: (x: number, y: number, text: string) => { const n = node(x, y); texts.push({ text, node: n }); return n; } } };
  let solids = [{} as Phaser.Geom.Rectangle];
  const drone = new RedactorDrone(scene as unknown as Phaser.Scene, 128, 152, [{ x: 128, y: 152 }, { x: 160, y: 152 }], () => solids);
  const player = { position: { x: 128, y: 153 }, takeHit: vi.fn() };
  let time = 0;
  const tick = (ms: number, active = true) => {
    for (let elapsed = 0; elapsed < ms; elapsed += 20) { time += 20; drone.update(time, 20, player as unknown as Player, active); }
  };
  return { drone, player, tick, rectangles, texts, openShelf: () => { solids = []; } };
}

beforeEach(() => { geometry.blocked = false; });

describe("live Redactor Drone stamp loop", () => {
  it("marks the feet, grants a complete windup, and hits a stationary player once", () => {
    const { drone, player, tick } = encounter();
    tick(20);
    expect(drone.stampReadout[0]).toMatchObject({ x: 128, y: 154, phase: "windup", width: 30, height: 8 });
    tick(DRONE_STAMP_TIMING.windupMs - 20);
    expect(player.takeHit).not.toHaveBeenCalled();
    tick(20);
    expect(player.takeHit).toHaveBeenCalledExactlyOnceWith(expect.any(Object), 8, 800);
    tick(400);
    expect(player.takeHit).toHaveBeenCalledOnce();
  });

  it("lets movement out of the warning zone dodge the attack", () => {
    const { drone, player, tick } = encounter();
    tick(20); player.position = { x: 128, y: 175 };
    tick(1100);
    expect(player.takeHit).not.toHaveBeenCalled();
    expect(drone.stampReadout[0].phase).toBe("recovery");
    tick(100); expect(drone.stampReadout).toEqual([]);
  });

  it("freezes patrol, warning, and damage across a long map pause", () => {
    const { drone, player, tick } = encounter();
    tick(160);
    const position = drone.position, telegraph = drone.telegraph, stamps = drone.stampReadout;
    tick(12000, false);
    expect(drone.position).toEqual(position);
    expect(drone.telegraph).toEqual(telegraph);
    expect(drone.stampReadout).toEqual(stamps);
    expect(player.takeHit).not.toHaveBeenCalled();
    tick(200); expect(player.takeHit).not.toHaveBeenCalled();
    tick(60); expect(player.takeHit).toHaveBeenCalledOnce();
  });

  it("uses shelf line of sight and does not attack outside aggro range", () => {
    const { drone, player, tick } = encounter();
    geometry.blocked = true; tick(2000); expect(drone.stampReadout).toEqual([]);
    geometry.blocked = false; player.position = { x: 128, y: 220 };
    tick(2000); expect(drone.stampReadout).toEqual([]);
    player.position = { x: 128, y: 153 }; tick(20); expect(drone.stampReadout).toHaveLength(1);
  });

  it("takes two separate tool hits and destroys pending hazards on defeat", () => {
    const { drone, player, tick, rectangles } = encounter();
    tick(20);
    expect(drone.tryPlayerHit(100, 1, { x: 120, y: 152 })).toBe("hit");
    expect(drone.healthReadout).toEqual({ hp: 1, maxHp: 2 });
    expect(drone.tryPlayerHit(120, 1)).toBe("miss");
    expect(drone.tryPlayerHit(500, 1)).toBe("kill");
    expect(drone.healthReadout.hp).toBe(0);
    expect(rectangles.at(-1)?.destroy).toHaveBeenCalledOnce();
    tick(2000); expect(player.takeHit).not.toHaveBeenCalled();
  });

  it("reads updated collision geometry after a shelf opens", () => {
    const { drone, tick, openShelf } = encounter();
    geometry.blocked = true; tick(100); expect(drone.stampReadout).toEqual([]);
    openShelf(); tick(20); expect(drone.stampReadout).toHaveLength(1);
  });

  it("hides permanent name tags and uses a compact, temporary warning", () => {
    const { texts, tick } = encounter();
    expect(texts.find((text) => text.text === "DRONE")?.node.visible).toBe(false);
    expect(texts.find((text) => text.text === "!")?.node.y).toBeLessThan(-25);
    tick(20); expect(texts.find((text) => text.text === "!")?.node.visible).toBe(true);
    tick(500); expect(texts.find((text) => text.text === "!")?.node.visible).toBe(false);
  });
});
