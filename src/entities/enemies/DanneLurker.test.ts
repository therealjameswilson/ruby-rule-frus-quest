import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DANNE_LURKER_BOLT_SPEED, DANNE_LURKER_BOLT_TELEGRAPH_MS, DANNE_LURKER_TOOL_STUN_MS, DANNE_LURKER_RETURN_STUN_MS } from "../../game/danneLurkerBalance";
import type { PlayerCombatReadout } from "../../game/types";
import { WeaponStateController, type WeaponToolId } from "../../systems/weaponState";
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
    setFillStyle() { return this; }
    setColor() { return this; }
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
vi.mock("../../input/InputState", () => ({ getSecondaryActionBadge: () => "X" }));
vi.mock("../../systems/audio", () => ({
  retroAudio: { danneBoast: vi.fn(), egoBoltFire: vi.fn(), blip: vi.fn(), toolHit: vi.fn() }
}));
// Exercise the actual lurker timers/projectiles with only the Phaser drawing surface stubbed.
vi.mock("./Enemy", () => ({
  Enemy: class {
    sprite = new Visual();
    container = new Visual();
    cue = new Visual();
    velocityX = 0;
    velocityY = 0;
    spriteKey = "danne-boss-combat";
    constructor(public scene: Phaser.Scene, public currentX: number, public currentY: number) {}
    get position() { return { x: this.currentX, y: this.currentY }; }
    moveTowardWaypoint() {}
    bodyBounds() { return { x: this.currentX - 9, y: this.currentY - 14, width: 18, height: 20 }; }
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
  const update = (now: number, delta: number, player = { x: 50, y: 50 }, enabled = true, combat?: PlayerCombatReadout) => {
    scene.time.now = now;
    return lurker.update(now, delta, player, enabled, combat);
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

function toolSwing(tool: WeaponToolId = "citation_stamp", x = 45, y = 38): PlayerCombatReadout {
  const weapon = new WeaponStateController();
  weapon.tryStart(tool, 0);
  weapon.update(125);
  return {
    state: "attack", actionActive: true, actionMsRemaining: 80,
    weapon: weapon.readout(125), invulnerable: false, invulnerableMsRemaining: 0,
    hitbox: { x, y, width: 19, height: 17 }
  };
}

function firedEncounter() {
  const encounter = createEncounter();
  const target = { x: 100, y: 40 };
  for (let now = 17; now <= 1809; now += 16) encounter.update(now, 16, target);
  const firedAt = 1809 + DANNE_LURKER_BOLT_TELEGRAPH_MS;
  for (let now = 1825; now < firedAt; now += 16) encounter.update(now, 16, target);
  expect(encounter.update(firedAt, 0, target).egoBoltFired).toBe(true);
  return { ...encounter, firedAt, target };
}

describe("DANN-E tool counterplay", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each<WeaponToolId>(["citation_stamp", "red_pencil", "review_folder"])("interrupts DANN-E with an active %s strike before contact damage", (tool) => {
    const { lurker, update } = createEncounter();
    expect(update(17, 16, { x: 50, y: 50 }, true, toolSwing(tool))).toMatchObject({ triggered: false, egoBoltHit: false });
    expect(lurker.readout(17).counterplay).toMatchObject({ toolCounters: 1, stunnedMsRemaining: DANNE_LURKER_TOOL_STUN_MS });
    expect(retroAudio.toolHit).toHaveBeenCalledWith(tool);
    for (let now = 33; now <= 1905; now += 16) {
      update(now, 16, { x: 50, y: 50 }, true, toolSwing(tool));
    }
    expect(lurker.readout(1905).counterplay).toMatchObject({ toolCounters: 1, stunnedMsRemaining: 112 });
    expect(retroAudio.toolHit).toHaveBeenCalledTimes(1);
    expect(retroAudio.egoBoltFire).not.toHaveBeenCalled();
  });

  it.each(["windup", "cooldown", "idle"] as const)("does not counter during %s even with a stale hitbox", (phase) => {
    const { lurker, update } = createEncounter();
    const combat = toolSwing();
    combat.weapon.phase = phase;
    update(17, 16, { x: 50, y: 50 }, true, combat);
    expect(lurker.readout(17).counterplay.toolCounters).toBe(0);
  });

  it("requires the swing to overlap DANN-E and leaves the safe Office untouched", () => {
    const combat = createEncounter();
    combat.update(17, 16, { x: 100, y: 40 }, true, toolSwing("citation_stamp", 150, 120));
    expect(combat.lurker.readout(17).counterplay.toolCounters).toBe(0);
    const office = createEncounter("foreshadow");
    office.update(17, 16, { x: 50, y: 50 }, true, toolSwing());
    expect(office.lurker.readout(17).counterplay.toolCounters).toBe(0);
  });

  it("cancels a pending shot and preserves the remaining stun while paused", () => {
    const { lurker, update } = createEncounter();
    const target = { x: 100, y: 40 };
    for (let now = 17; now <= 1809; now += 16) update(now, 16, target);
    expect(lurker.readout(1809).telegraph).not.toBeNull();
    update(1825, 16, target, true, toolSwing());
    expect(lurker.readout(1825).telegraph).toBeNull();
    update(1841, 16, target, false, toolSwing());
    const remaining = lurker.readout(1841).counterplay.stunnedMsRemaining;
    update(11841, 16, target, false);
    expect(lurker.readout(11841).counterplay.stunnedMsRemaining).toBe(remaining);
    update(11857, 16, target);
    expect(lurker.readout(11857).counterplay.stunnedMsRemaining).toBe(remaining);
    expect(retroAudio.egoBoltFire).not.toHaveBeenCalled();
  });

  it("reflects a bolt once before player collision and stuns its sender on return", () => {
    const { lurker, update, firedAt, target, sprites } = firedEncounter();
    for (let elapsed = 16; elapsed <= 800; elapsed += 16) update(firedAt + elapsed, 16, target);
    const returnedAt = firedAt + 800;
    const bolt = sprites[0];
    expect(bolt.x).toBeGreaterThan(75);
    // Overlap both the player and tool: the active tool must win this frame.
    const player = { x: bolt.x, y: bolt.y };
    const swing = toolSwing("review_folder", bolt.x - 5, bolt.y - 5);
    expect(update(returnedAt, 0, player, true, swing).egoBoltHit).toBe(false);
    expect(lurker.readout(returnedAt).counterplay).toMatchObject({ boltsReturned: 1, toolCounters: 0 });
    expect(lurker.readout(returnedAt).counterplay.bolts[0].returned).toBe(true);
    let hitTime = 0;
    for (let elapsed = 16; elapsed <= 800; elapsed += 16) {
      expect(update(returnedAt + elapsed, 16, player, true, swing).egoBoltHit).toBe(false);
      if (lurker.readout(returnedAt + elapsed).counterplay.stunnedMsRemaining > 0) {
        hitTime = returnedAt + elapsed;
        break;
      }
    }
    expect(hitTime).toBeGreaterThan(returnedAt);
    expect(lurker.readout(hitTime).counterplay).toMatchObject({ boltsReturned: 1, stunnedMsRemaining: DANNE_LURKER_RETURN_STUN_MS, bolts: [] });
    expect(bolt.destroyed).toBe(true);
    expect(retroAudio.toolHit).toHaveBeenCalledTimes(2);
  });

  it("does not move or return a bolt while an overlay blocks the encounter", () => {
    const { lurker, update, firedAt, sprites, target } = firedEncounter();
    const before = { x: sprites[0].x, y: sprites[0].y };
    update(firedAt + 16, 16, target, false, toolSwing());
    update(firedAt + 5000, 16, target, false, toolSwing());
    expect(sprites[0]).toMatchObject(before);
    expect(lurker.readout(firedAt + 5000).counterplay).toMatchObject({ toolCounters: 0, boltsReturned: 0 });
  });

  it("clears old room shots and gives the new doorway a contact/shot grace period", () => {
    const { lurker, update, firedAt, sprites } = firedEncounter();
    lurker.enterRoom(firedAt);
    expect(sprites[0].destroyed).toBe(true);
    expect(lurker.readout(firedAt)).toMatchObject({ telegraph: null, counterplay: { bolts: [], stunnedMsRemaining: 0 } });
    for (let elapsed = 16; elapsed < 1800; elapsed += 16) {
      expect(update(firedAt + elapsed, 16)).toMatchObject({ triggered: false, egoBoltFired: false, egoBoltHit: false });
    }
    expect(update(firedAt + 1800, 16).triggered).toBe(true);
    expect(lurker.readout(firedAt + 1800).telegraph).not.toBeNull();
  });
});
