import Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameState, recordStandardsViolation, resetGameState, seedProgressForScene } from "../../game/state";
import type { ChoiceOption, Position } from "../../game/types";
import type { Player } from "../Player";
import { DanneBoss, type DanneBossPhase } from "./DanneBoss";

vi.mock("phaser", () => {
  class Rectangle {
    constructor(public x: number, public y: number, public width: number, public height: number) {}
    get left() { return this.x; }
    get right() { return this.x + this.width; }
    get top() { return this.y; }
    get bottom() { return this.y + this.height; }
  }
  return { default: {
    Display: { Color: { HexStringToColor: (hex: string) => ({ color: parseInt(hex.replace("#", ""), 16) }) } },
    Geom: { Rectangle, Intersects: { RectangleToRectangle: (a: Rectangle, b: Rectangle) => (
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    ) } },
    Math: {
      Clamp: (n: number, min: number, max: number) => Math.min(max, Math.max(min, n)),
      RadToDeg: (n: number) => n * 180 / Math.PI,
      Angle: { Between: (x: number, y: number, x2: number, y2: number) => Math.atan2(y2 - y, x2 - x) },
      Distance: { Between: (x: number, y: number, x2: number, y2: number) => Math.hypot(x2 - x, y2 - y) }
    }
  } };
});
vi.mock("../Player", () => ({ Player: class {} }));
vi.mock("../../systems/audio", () => ({ retroAudio: {
  blip: vi.fn(), confirm: vi.fn(), warning: vi.fn(), bossHit: vi.fn(), bossDefeat: vi.fn(),
  dannePhaseTransition: vi.fn(), danneBoast: vi.fn(), egoBoltFire: vi.fn(), toolHit: vi.fn()
} }));
vi.mock("../../systems/bossHud", () => ({ hideBossHud: vi.fn(), setBossHp: vi.fn(), showBossHud: vi.fn() }));
vi.mock("../../systems/combatFeedback", () => ({ applyHitShake: vi.fn() }));
vi.mock("../../systems/cutscene", () => ({ enterCutscene: vi.fn(async () => {}), exitCutscene: vi.fn(async () => {}), playLine: vi.fn() }));
vi.mock("../../systems/feedbackToast", () => ({ FeedbackToast: class {
  show = vi.fn(); update = vi.fn(); destroy = vi.fn();
} }));
vi.mock("../../systems/verification", () => ({ ChoicePrompt: class {
  active = false;
  options: ChoiceOption[] = [];
  callback?: (option: ChoiceOption) => void;
  show(_title: string, options: ChoiceOption[], callback: (option: ChoiceOption) => void) {
    this.active = true; this.options = options; this.callback = callback;
  }
  updateInput() {}
  choose(key: string) {
    const option = this.options.find((candidate) => candidate.key === key);
    if (!option) return;
    this.active = false;
    this.callback?.(option);
  }
} }));

class Visual {
  active = true;
  visible = true;
  constructor(public x = 0, public y = 0) {}
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setOrigin() { return this; } setScale() { return this; } setDepth() { return this; }
  setVisible(visible: boolean) { this.visible = visible; return this; } setStrokeStyle() { return this; } setScrollFactor() { return this; }
  setText() { return this; } setSize() { return this; } setFillStyle() { return this; }
  setColor() { return this; } setTint() { return this; } clearTint() { return this; }
  setAlpha() { return this; } setAngle() { return this; }
  destroy() { this.active = false; }
}

interface BossInternals {
  hp: number;
  statutoryYear: number;
  beginPhase(phase: Exclude<DanneBossPhase, "intro" | "defeated">): void;
  checkPlayerActionHit(time: number): void;
  hitPlayer(position: Position, kind: "ego_bolt" | "swarm", time: number): void;
  fireBolt(from: Position, target: Position, speed: number): void;
  updateBolts(time: number, delta: number): void;
  startAttackTelegraph(time: number, phase: "cloud"): void;
  updateAttackTelegraph(time: number): void;
  updateAttackPattern(time: number): void;
  offerShortcut(reason: string): void;
  clockContainer: Visual;
  shortcutChoice: { active: boolean; choose(key: string): void };
  bolts: Array<Position & { expiresAt: number; sprite: Visual; returned: boolean }>;
  retryChoice: { active: boolean; choose(key: string): void };
}

function fixture(phase: "colossus" | "swarm" | "cloud" = "colossus") {
  const scene = {
    time: { now: 0, delayedCall: (_ms: number, callback: () => void) => callback() },
    add: {
      sprite: (x: number, y: number) => new Visual(x, y),
      ellipse: (x: number, y: number) => new Visual(x, y),
      rectangle: (x: number, y: number) => new Visual(x, y),
      text: (x: number, y: number) => new Visual(x, y),
      container: () => new Visual()
    },
    anims: { exists: () => false }, textures: { exists: () => false }, tweens: { add: vi.fn() }
  };
  let invulnerableUntil = 0;
  const player = {
    position: { x: 128, y: 140 },
    activeActionHitbox: null as Phaser.Geom.Rectangle | null,
    actionId: 1,
    combatReadout: { weapon: { tool: "red_pencil" } },
    takeHit: vi.fn((_source: Position, _distance: number, recoveryMs: number) => {
      if (scene.time.now < invulnerableUntil) return false;
      invulnerableUntil = scene.time.now + recoveryMs;
      return true;
    }),
    pushAwayFrom: vi.fn(),
    setPosition(x: number, y: number) { this.position = { x, y }; }
  };
  const onDefeated = vi.fn();
  const onRetreat = vi.fn();
  const onPhaseChange = vi.fn();
  const boss = new DanneBoss(scene as unknown as Phaser.Scene, {
    player: player as unknown as Player, secretAscendant: false, quickFight: false,
    onDefeated, onRetreat, onBadEnding: vi.fn(), onPhaseChange
  });
  const internals = boss as unknown as BossInternals;
  internals.beginPhase(phase);
  scene.time.now = 1000;
  return { scene, player, boss, internals, onDefeated, onRetreat, onPhaseChange };
}

describe("DANN-E final-review combat", () => {
  beforeEach(() => { vi.clearAllMocks(); resetGameState(); seedProgressForScene("BlackVaultLairScene"); });

  it("damages only with the active owned tool, once per swing", () => {
    const { player, internals } = fixture();
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    player.combatReadout.weapon.tool = "citation_stamp";
    internals.checkPlayerActionHit(1000);
    expect(internals.hp).toBe(180);
    expect(player.pushAwayFrom).toHaveBeenCalled();
    player.combatReadout.weapon.tool = "red_pencil";
    player.actionId += 1;
    internals.checkPlayerActionHit(1400);
    expect(internals.hp).toBe(152);
    internals.checkPlayerActionHit(1800);
    expect(internals.hp).toBe(152);
    player.actionId += 1;
    gameState.inventory = gameState.inventory.filter((item) => item !== "Red Pencil");
    internals.checkPlayerActionHit(2200);
    expect(internals.hp).toBe(152);
  });

  it("removes colliding bolts immediately and honors recovery time", () => {
    const { internals, player } = fixture();
    internals.fireBolt({ x: 128, y: 150 }, player.position, 50);
    internals.fireBolt({ x: 128, y: 150 }, player.position, 50);
    const sprites = internals.bolts.map((bolt) => bolt.sprite);
    internals.updateBolts(1000, 16);
    expect(gameState.reliability).toBe(90);
    expect(gameState.sceneProgress.blackVaultCombatDamage).toBe(10);
    expect(internals.bolts).toHaveLength(0);
    expect(sprites.every((sprite) => !sprite.active)).toBe(true);
    expect(player.takeHit).toHaveBeenCalledTimes(1);
  });

  it("expires a bolt before it can damage the player", () => {
    const { internals, player } = fixture();
    internals.fireBolt({ x: 128, y: 150 }, player.position, 50);
    internals.updateBolts(3000, 16);
    expect(gameState.reliability).toBe(100);
    expect(internals.bolts).toHaveLength(0);
  });

  it.each(["citation_stamp", "red_pencil", "review_folder"])("returns a bolt with an owned active %s before contact damage", (tool) => {
    const { internals, player, boss } = fixture("cloud");
    player.combatReadout.weapon.tool = tool;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(110, 131, 36, 22);
    internals.fireBolt({ x: 128, y: 150 }, player.position, 50);
    internals.updateBolts(1000, 16);
    expect(gameState.reliability).toBe(100);
    expect(player.takeHit).not.toHaveBeenCalled();
    expect(internals.bolts[0].returned).toBe(true);
    expect(boss.readout().bossCombat.boltsReturned).toBe(1);
    player.activeActionHitbox = null;
    internals.updateBolts(1050, 50);
    internals.updateBolts(1100, 50);
    expect(internals.hp).toBe(152);
    expect(internals.bolts).toHaveLength(0);
    expect(boss.readout().bossCombat.counterWindowMs).toBeGreaterThan(0);
    internals.updateAttackPattern(2499);
    expect(boss.readout().telegraph).toBeNull();
    internals.updateAttackPattern(2500);
    expect(boss.readout().telegraph).not.toBeNull();
  });

  it("does not return bolts in windup/cooldown or with an unowned tool", () => {
    const { internals, player } = fixture();
    player.activeActionHitbox = null;
    internals.fireBolt({ x: 128, y: 150 }, player.position, 50);
    internals.updateBolts(1000, 16);
    expect(gameState.reliability).toBe(90);
    player.activeActionHitbox = new Phaser.Geom.Rectangle(110, 131, 36, 22);
    gameState.inventory = gameState.inventory.filter((item) => item !== "Red Pencil");
    internals.fireBolt({ x: 128, y: 150 }, player.position, 50);
    internals.updateBolts(1100, 16);
    expect(internals.bolts).toHaveLength(0);
    expect(internals.hp).toBe(180);
  });

  it("clears a returned volley once, then preserves the stun across pause", () => {
    const { internals, player, boss, scene } = fixture();
    player.activeActionHitbox = new Phaser.Geom.Rectangle(110, 131, 36, 22);
    for (let i = 0; i < 3; i += 1) internals.fireBolt({ x: 128, y: 150 }, player.position, 50);
    internals.updateBolts(1000, 16);
    internals.updateBolts(1050, 50);
    internals.updateBolts(1100, 50);
    expect(internals.hp).toBe(152);
    expect(internals.bolts).toHaveLength(0);
    player.activeActionHitbox = null;
    scene.time.now = 1100;
    boss.update(1100, 16, false);
    scene.time.now = 6100;
    expect(boss.readout().bossCombat.counterWindowMs).toBe(1400);
    boss.update(6100, 16, true);
    expect(boss.readout().bossCombat.counterWindowMs).toBe(1400);
    expect(boss.readout().telegraph).toBeNull();
  });

  it("does not let a lethal returned bolt leak into the next phase", async () => {
    const { internals, player, boss, onDefeated } = fixture();
    internals.hp = 1;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(110, 131, 36, 22);
    internals.fireBolt({ x: 128, y: 150 }, player.position, 50);
    internals.updateBolts(1000, 16);
    internals.updateBolts(1050, 50);
    internals.updateBolts(1100, 50);
    expect(boss.currentPhase).toBe("swarm");
    expect(internals.hp).toBe(180);
    expect(boss.readout().bossCombat.counterWindowMs).toBe(0);
    expect(onDefeated).not.toHaveBeenCalled();
    await Promise.resolve();
  });

  it("still blocks a returned-bolt victory when a standards violation is unresolved", () => {
    const { internals, player, onDefeated } = fixture("cloud");
    recordStandardsViolation("undisclosed_deletion", "unresolved excision");
    internals.hp = 1;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(110, 131, 36, 22);
    internals.fireBolt({ x: 128, y: 150 }, player.position, 50);
    internals.updateBolts(1000, 16);
    internals.updateBolts(1050, 50);
    internals.updateBolts(1100, 50);
    expect(internals.hp).toBe(1);
    expect(onDefeated).not.toHaveBeenCalled();
    expect(internals.shortcutChoice.active).toBe(true);
    expect(gameState.sceneProgress.blackVaultBossCleared).toBeFalsy();
  });

  it("freezes shots and expiry while paused", () => {
    const { scene, boss, internals } = fixture();
    internals.fireBolt({ x: 128, y: 118 }, { x: 128, y: 190 }, 50);
    boss.update(1000, 16, false);
    scene.time.now = 6000;
    boss.update(6000, 16, false);
    expect(internals.bolts[0].y).toBe(108);
    scene.time.now = 6016;
    boss.update(6016, 16, true);
    expect(internals.bolts).toHaveLength(1);
    expect(internals.bolts[0].y).toBeCloseTo(108.8);
    expect(internals.bolts[0].expiresAt).toBe(8016);
  });

  it("offers a current-phase retry at zero without erasing research or rewinding the clock", () => {
    const { boss, internals, player, onDefeated } = fixture("swarm");
    const documents = structuredClone(gameState.documentCandidates);
    const inventory = [...gameState.inventory];
    gameState.reliability = 5;
    gameState.sceneProgress.blackVaultCombatDamage = 95;
    internals.statutoryYear = 25;
    internals.hitPlayer({ x: 100, y: 100 }, "swarm", 1000);
    expect(boss.inputLocked).toBe(true);
    expect(boss.readout().bossCombat.retryAvailable).toBe(true);
    expect(gameState.reliability).toBe(0);
    expect(onDefeated).not.toHaveBeenCalled();
    internals.retryChoice.choose("A");
    expect(boss.currentPhase).toBe("swarm");
    expect(boss.inputLocked).toBe(false);
    expect(internals.hp).toBe(180);
    expect(internals.statutoryYear).toBe(25);
    expect(gameState.reliability).toBe(100);
    expect(player.position).toEqual({ x: 128, y: 188 });
    expect(gameState.documentCandidates).toEqual(documents);
    expect(gameState.inventory).toEqual(inventory);
    expect(gameState.sceneProgress.blackVaultBossCleared).toBeFalsy();
  });

  it("lets a failed attempt retreat without granting a boss reward", () => {
    const { internals, onRetreat, onDefeated } = fixture();
    gameState.reliability = 10;
    gameState.sceneProgress.blackVaultCombatDamage = 90;
    internals.hitPlayer({ x: 100, y: 100 }, "ego_bolt", 1000);
    internals.retryChoice.choose("B");
    expect(onRetreat).toHaveBeenCalledOnce();
    expect(onDefeated).not.toHaveBeenCalled();
    expect(gameState.reliability).toBe(100);
    expect(gameState.sceneProgress.blackVaultBossCleared).toBeFalsy();
  });

  it("does not add time spent choosing Retry to the new phase's grace period", () => {
    const { scene, boss, internals } = fixture();
    gameState.reliability = 10;
    internals.hitPlayer({ x: 100, y: 100 }, "ego_bolt", 1000);
    boss.update(1000, 16, false);
    scene.time.now = 31000;
    boss.update(31000, 16, false);
    internals.retryChoice.choose("A");
    scene.time.now = 31901;
    boss.update(31901, 16, true);
    expect(boss.readout().telegraph).not.toBeNull();
    internals.hitPlayer({ x: 100, y: 100 }, "ego_bolt", 31901);
    expect(gameState.reliability).toBe(0);
  });

  it("keeps a stationary counterattack window between Cloud Shifts", () => {
    const { scene, boss, internals } = fixture("cloud");
    internals.startAttackTelegraph(1000, "cloud");
    expect(boss.readout().telegraph?.kind).toBe("cloud_shift");
    scene.time.now = 1800;
    internals.updateAttackTelegraph(1800);
    internals.startAttackTelegraph(3800, "cloud");
    expect(boss.readout().telegraph?.kind).toBe("cloud_spread");
    scene.time.now = 4500;
    internals.updateAttackTelegraph(4500);
    internals.startAttackTelegraph(6500, "cloud");
    expect(boss.readout().telegraph?.kind).toBe("cloud_shift");
  });

  it("keeps the clock out of the shortcut choice and restores it on rejection", () => {
    const { boss, internals, onPhaseChange } = fixture("cloud");
    onPhaseChange.mockClear();
    internals.offerShortcut("The statutory deadline expired.");
    expect(boss.inputLocked).toBe(true);
    expect(internals.clockContainer.visible).toBe(false);
    internals.shortcutChoice.choose("B");
    expect(boss.inputLocked).toBe(false);
    expect(internals.clockContainer.visible).toBe(true);
    expect(onPhaseChange).toHaveBeenCalledExactlyOnceWith("cloud");
    expect(gameState.sceneProgress.danneBadEnding).toBeFalsy();
  });

  it("can finish a clean record below the entrance heart threshold and recover combat loss", async () => {
    const { player, internals, onDefeated } = fixture("cloud");
    gameState.reliability = 40;
    gameState.sceneProgress.blackVaultCombatDamage = 60;
    internals.hp = 1;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    internals.checkPlayerActionHit(1000);
    await vi.waitFor(() => expect(onDefeated).toHaveBeenCalledOnce());
    expect(gameState.reliability).toBe(100);
    expect(gameState.sceneProgress.blackVaultCombatDamage).toBe(0);
    expect(gameState.sceneProgress.blackVaultBossCleared).toBe(1);
    expect(gameState.completionStats.danneVariantsDefeated.cloud).toBe(1);
    expect(gameState.completionStats.danneVariantsDefeated.defeated).toBeUndefined();
  });

  it("still blocks a victory with unresolved standards violations", () => {
    const { player, internals, onDefeated } = fixture("cloud");
    recordStandardsViolation("undisclosed_deletion", "Unbracketed edit");
    internals.hp = 1;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    internals.checkPlayerActionHit(1000);
    expect(internals.hp).toBe(1);
    expect(onDefeated).not.toHaveBeenCalled();
    expect(gameState.sceneProgress.blackVaultBossCleared).toBeFalsy();
  });
});
