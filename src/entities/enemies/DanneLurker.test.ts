import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DANNE_LURKER_BOLT_SPEED, DANNE_LURKER_BOLT_TELEGRAPH_MS } from "../../game/danneLurkerBalance";
import { retroAudio } from "../../systems/audio";
import { DanneLurker } from "./DanneLurker";

const { Visual } = vi.hoisted(() => {
  class Visual {
    x = 0;
    y = 0;
    visible = true;
    destroyed = false;
    setOrigin() { return this; }
    setScale() { return this; }
    setDepth() { return this; }
    setAngle() { return this; }
    setStrokeStyle() { return this; }
    setTint() { return this; }
    clearTint() { return this; }
    setAlpha() { return this; }
    setText() { return this; }
    play() { return this; }
    add() { return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    destroy() { this.destroyed = true; }
  }
  return { Visual };
});

vi.mock("phaser", () => ({
  default: {
    Math: { RadToDeg: (radians: number) => radians * 180 / Math.PI },
    Geom: {
      Rectangle: class {
        constructor(public x: number, public y: number, public width: number, public height: number) {}
      },
      Intersects: {
        RectangleToRectangle: (
          a: { x: number; y: number; width: number; height: number },
          b: { x: number; y: number; width: number; height: number }
        ) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
      }
    }
  }
}));
vi.mock("../../game/state", () => ({ gameState: { danneDifficultyTier: "standard" }, setLatestMessage: vi.fn() }));
vi.mock("../../game/codex", () => ({ unlockCodexEntry: vi.fn() }));
vi.mock("../../systems/audio", () => ({
  retroAudio: { danneBoast: vi.fn(), egoBoltFire: vi.fn(), blip: vi.fn() }
}));
// Exercise the actual lurker timers/projectiles with only the Phaser drawing surface stubbed.
vi.mock("./Enemy", () => ({
  Enemy: class {
    sprite = new Visual();
    container = new Visual();
    cue = new Visual();
    spriteKey = "danne-boss-combat";
    constructor(public scene: Phaser.Scene, public currentX: number, public currentY: number) {}
    get position() { return { x: this.currentX, y: this.currentY }; }
    moveTowardWaypoint() {}
    syncRender() {}
    color() { return 0; }
    distanceTo(player: { x: number; y: number }) { return Math.hypot(player.x - this.currentX, player.y - this.currentY); }
    destroy() {}
  }
}));

function createEncounter(encounterMode?: "combat" | "foreshadow") {
  const sprites: InstanceType<typeof Visual>[] = [];
  const scene = {
    time: { now: 1 },
    add: {
      text: () => new Visual(),
      rectangle: (x: number, y: number) => new Visual().setPosition(x, y),
      sprite: (x: number, y: number) => {
        const sprite = new Visual().setPosition(x, y);
        sprites.push(sprite);
        return sprite;
      }
    },
    tweens: { add: vi.fn() },
    anims: { exists: () => false }
  };
  const lurker = new DanneLurker(scene as unknown as Phaser.Scene, 50, 50, { waypoints: [], encounterMode });
  const update = (now: number, delta: number, player = { x: 50, y: 50 }, enabled = true) => {
    scene.time.now = now;
    return lurker.update(now, delta, player, enabled);
  };
  return { lurker, sprites, update };
}

describe("DANN-E opening fairness and projectile movement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the Office presence and boasts without contact damage or projectiles", () => {
    const { lurker, sprites, update } = createEncounter("foreshadow");
    for (let now = 101; now <= 30001; now += 100) {
      expect(update(now, 100)).toMatchObject({ triggered: false, egoBoltFired: false, egoBoltHit: false });
    }
    expect(retroAudio.danneBoast).toHaveBeenCalled();
    expect(retroAudio.egoBoltFire).not.toHaveBeenCalled();
    expect(sprites).toHaveLength(0);
    expect(lurker.readout(30001)).toMatchObject({ telegraph: null, status: "watching; safe preparation room; Standard tier" });
  });

  it("retains contact attacks in the default dungeon encounter", () => {
    const { update } = createEncounter();
    expect(update(17, 16).triggered).toBe(true);
    expect(update(33, 16).triggered).toBe(false);
  });

  it("pauses attack timers while interaction blocks pressure", () => {
    const { update, sprites } = createEncounter();
    update(17, 16, { x: 100, y: 40 }, false);
    expect(update(10017, 16, { x: 100, y: 40 }, false).egoBoltFired).toBe(false);
    expect(update(10033, 16, { x: 100, y: 40 }).egoBoltFired).toBe(false);
    expect(sprites).toHaveLength(0);
  });

  it.each([30, 60, 120, 144, 240])("moves a slow bolt at the same speed at %i fps while drawing whole pixels", (fps) => {
    const { update, sprites } = createEncounter();
    const target = { x: 100, y: 40 };
    for (let now = 17; now <= 1809; now += 16) update(now, 16, target);
    const fireAt = 1809 + DANNE_LURKER_BOLT_TELEGRAPH_MS;
    for (let now = 1825; now < fireAt; now += 16) update(now, 16, target);
    expect(update(fireAt, 0, target).egoBoltFired).toBe(true);
    expect(sprites).toHaveLength(1);
    const bolt = sprites[0];
    const startX = bolt.x;
    for (let frame = 1; frame <= fps; frame += 1) {
      update(fireAt + frame * 1000 / fps, 1000 / fps, { x: 220, y: 210 });
      expect(Number.isInteger(bolt.x)).toBe(true);
      expect(Number.isInteger(bolt.y)).toBe(true);
    }
    expect(bolt.x - startX).toBe(DANNE_LURKER_BOLT_SPEED);
    expect(bolt.y).toBe(40);
  });

  it("registers one bolt hit and removes its sprite on a high-refresh display", () => {
    const { update, sprites } = createEncounter();
    const target = { x: 100, y: 40 };
    let hits = 0;
    for (let frame = 1; frame <= 600; frame += 1) {
      if (update(1 + frame * 1000 / 144, 1000 / 144, target).egoBoltHit) hits += 1;
    }
    expect(hits).toBe(1);
    expect(sprites).toHaveLength(1);
    expect(sprites[0].destroyed).toBe(true);
  });
});
