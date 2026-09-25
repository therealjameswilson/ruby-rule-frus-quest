import Phaser from "phaser";
import { DANNE_BOSS_HD } from "../../art/danneBossPresentation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDanneItem, addProcessItem, gameState, recordStandardsViolation, resetGameState, seedProgressForScene } from "../../game/state";
import { DANNE_BOSS_RETURN } from "../../game/danneBossCombat";
import type { ChoiceOption, Position } from "../../game/types";
import type { Player } from "../Player";
import { DanneBoss, type DanneBossPhase } from "./DanneBoss";
import { exitCutscene, playLine } from "../../systems/cutscene";
import { DANNE_BOSS_PORTRAIT_ASSET } from "../../game/danneAtlas";
import { clampQuestBandText, QUEST_BAND_LAYOUT } from "../../scenes/questBandLayout";

const sodaHits = vi.hoisted(() => [] as Array<(flavor: string) => void>);
vi.mock("../../systems/sodaCanAttack", () => ({ SodaCanAttack: class {
  constructor(_scene: unknown, _origin: unknown, _target: unknown, hit: (flavor: string) => void) { sodaHits.push(hit); }
  update() {}
  destroy() {}
} }));

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
      a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top
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
  alpha = 1;
  constructor(public x = 0, public y = 0) {}
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  scale = 1;
  animation = "";
  play(key: string) { this.animation = key; return this; }
  setOrigin() { return this; } setScale(scale: number) { this.scale = scale; return this; } setDepth() { return this; }
  setVisible(visible: boolean) { this.visible = visible; return this; } setStrokeStyle() { return this; } setScrollFactor() { return this; }
  text = ""; width = 0; height = 0;
  setText(text: string) { this.text = text; return this; }
  setSize(width: number, height: number) { this.width = width; this.height = height; return this; } setFillStyle() { return this; }
  setColor() { return this; } setTint() { return this; } setTintFill() { return this; } clearTint() { return this; }
  setAlpha(alpha: number) { this.alpha = alpha; return this; } setAngle() { return this; }
  fillStyle() { return this; } fillRect() { return this; }
  destroy() { this.active = false; }
}

interface BossInternals {
  sprite: Visual;
  runIntro(): Promise<void>;
  showPhaseCutscene(key: string, phase: "intro"): Promise<void>;
  attackTelegraph: { markers: Visual[] } | null;
  hp: number;
  coreOpening: Visual;
  coreOpeningFrame: Visual;
  coreOpeningLabel: Visual;
  syncCoreOpening(time: number): void;
  takeReturnedBolt(time: number): void;
  statutoryYear: number;
  updateStatutoryClock(deltaMs: number): void;
  beginPhase(phase: Exclude<DanneBossPhase, "intro" | "defeated">): void;
  checkPlayerActionHit(time: number): void;
  hitPlayer(position: Position, kind: "ego_bolt" | "swarm", time: number): void;
  fireBolt(from: Position, target: Position, speed: number): void;
  updateBolts(time: number, delta: number): void;
  updateMinis(time: number, delta: number): void;
  minis: Array<{ sprite: Visual; angle: number; radius: number; speed: number; stunnedUntil: number; lastActionId: number }>;
  startAttackTelegraph(time: number, phase: "cloud" | "swarm"): void;
  updateAttackTelegraph(time: number): void;
  updateAttackPattern(time: number): void;
  offerShortcut(reason: string): void;
  clockContainer: Visual;
  clockStatusText: Visual;
  syncStatutoryClockUi(): void;
  defeated: boolean;
  shortcutChoice: { active: boolean; choose(key: string): void };
  bolts: Array<Position & { vx: number; vy: number; expiresAt: number; sprite: Visual; returned: boolean }>;
  retryChoice: { active: boolean; choose(key: string): void };
}

function fixture(phase: "colossus" | "swarm" | "cloud" | "ascendant" = "colossus", highDetail = false) {
  const scene = {
    time: { now: 0, delayedCall: (_ms: number, callback: () => void) => callback() },
    add: {
      graphics: () => new Visual(),
      sprite: (x: number, y: number) => new Visual(x, y),
      ellipse: (x: number, y: number) => new Visual(x, y),
      rectangle: (x: number, y: number) => new Visual(x, y),
      text: (x: number, y: number) => new Visual(x, y),
      container: () => new Visual()
    },
    anims: { exists: () => highDetail }, textures: { exists: (key: string) => highDetail && key === DANNE_BOSS_HD.key }, tweens: { add: vi.fn() }
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

  it("changes detailed combat forms and keeps their logical size through swarm spawning", () => {
    const { boss, internals } = fixture("colossus", true);
    expect(boss.spriteKey).toBe(DANNE_BOSS_HD.key);
    expect(internals.sprite.scale * DANNE_BOSS_HD.frameW).toBeCloseTo(32 * 1.15);
    for (const form of ["colossus", "swarm", "cloud", "ascendant"] as const) {
      internals.beginPhase(form);
      expect(internals.sprite.animation).toBe(`${DANNE_BOSS_HD.key}-${form}`);
      if (form === "swarm") for (const mini of internals.minis) {
        expect(mini.sprite.scale * DANNE_BOSS_HD.frameW).toBeCloseTo(32 * .52);
        expect(mini.sprite.animation).toBe(`${DANNE_BOSS_HD.key}-swarm`);
      }
    }
  });

  it("soda respects armor and damages only an exposed core", () => {
    const { boss, internals } = fixture();
    const hit = sodaHits[sodaHits.length - 1];
    const hp = boss.readout().hp;
    hit("LIME");
    expect(boss.readout().hp).toBe(hp);
    Object.assign(internals, { counterStunnedUntil: 3000 });
    hit("BERRY");
    expect(boss.readout().hp).toBe(hp - 10);
  });

  it("an owned stapler hits an exposed core once per swing", () => {
    const { player, internals } = fixture();
    addProcessItem("stapler");
    player.combatReadout.weapon.tool = "stapler";
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    internals.checkPlayerActionHit(1000);
    expect(internals.hp).toBe(180);
    internals.takeReturnedBolt(1500);
    player.actionId += 1;
    internals.checkPlayerActionHit(1600);
    expect(internals.hp).toBe(134);
    internals.checkPlayerActionHit(2000);
    expect(internals.hp).toBe(134);
  });

  it("charges only a movement-sized time step after a rendering stall", () => {
    const { internals }=fixture();
    internals.statutoryYear=25;
    internals.updateStatutoryClock(50);
    const normal=internals.statutoryYear;
    internals.statutoryYear=25;
    internals.updateStatutoryClock(5000);
    expect(internals.statutoryYear).toBeCloseTo(normal,10);
    internals.statutoryYear=25;
    internals.updateStatutoryClock(-100);
    expect(internals.statutoryYear).toBe(25);
  });

  it("restores elapsed deadline time when the boss is recreated from saved state", () => {
    gameState.sceneProgress.statutoryClockTenths = 278;
    const { internals } = fixture();
    expect(internals.statutoryYear).toBe(27.8);
    internals.updateStatutoryClock(100);
    expect(internals.statutoryYear).toBeGreaterThan(27.8);
  });

  it("resumes the saved phase and health without replaying earlier phases or rewards", async () => {
    gameState.sceneProgress.blackVaultBossPhase = 3;
    gameState.sceneProgress.blackVaultBossHp = 68;
    gameState.sceneProgress.statutoryClockTenths = 278;
    const { boss, internals, onDefeated } = fixture("cloud");
    await internals.runIntro();
    expect(boss.currentPhase).toBe("cloud");
    expect(internals.hp).toBe(68);
    expect(internals.statutoryYear).toBe(27.8);
    expect(internals.bolts).toHaveLength(0);
    expect(onDefeated).not.toHaveBeenCalled();
    expect(playLine).toHaveBeenCalledWith(expect.anything(),
      "Review resumed. Your counter progress is kept.", DANNE_BOSS_PORTRAIT_ASSET.key);
  });

  it("retains a saved missed deadline without applying its damage twice", () => {
    gameState.sceneProgress.statutoryClockTenths = 300;
    gameState.sceneProgress.statutoryDeadlineMissed = 1;
    const reliability = gameState.reliability;
    const violations = structuredClone(gameState.standardsViolations);
    const { internals } = fixture();
    internals.updateStatutoryClock(1000);
    expect(internals.statutoryYear).toBe(30);
    expect(gameState.reliability).toBe(reliability);
    expect(gameState.standardsViolations).toEqual(violations);
    expect(internals.shortcutChoice.active).toBe(false);
  });

  it("honors a missed-deadline flag even if an older save has no elapsed time", () => {
    delete gameState.sceneProgress.statutoryClockTenths;
    gameState.sceneProgress.statutoryDeadlineMissed = 1;
    expect(fixture().internals.statutoryYear).toBe(30);
  });

  it("explains the live counter without approving documents or starting a swing", () => {
    const { boss, internals, scene, player } = fixture();
    const documents = structuredClone(gameState.documentCandidates);
    const hp = internals.hp;
    boss.explainCounter();
    expect(gameState.latestMessage).toContain("Face an incoming Ego bolt");
    expect(internals.hp).toBe(hp);
    expect(player.actionId).toBe(1);
    expect(boss.inputLocked).toBe(false);
    expect(gameState.documentCandidates).toEqual(documents);
    internals.takeReturnedBolt(scene.time.now);
    const openedHp = internals.hp;
    boss.explainCounter();
    expect(gameState.latestMessage).toContain("fresh Red Pencil strike");
    expect(internals.hp).toBe(openedHp);
    expect(boss.inputLocked).toBe(false);
  });

  it.each(["colossus", "swarm", "cloud", "ascendant"] as const)("prioritizes the live core opening in %s guidance", phase => {
    const { scene, boss, internals } = fixture(phase);
    const armoredObjective = boss.combatObjective;
    expect(armoredObjective).not.toContain("CORE");
    internals.takeReturnedBolt(scene.time.now);
    expect(boss.combatObjective).toBe("PENCIL THE CORE");
    expect(clampQuestBandText(boss.combatObjective, QUEST_BAND_LAYOUT.objective.maxChars)).toBe(boss.combatObjective);
    scene.time.now += DANNE_BOSS_RETURN.stunMs + 1;
    expect(boss.combatObjective).toBe(armoredObjective);
    expect(boss.combatObjective.length).toBeLessThanOrEqual(15);
  });

  it("gives an actionable return instruction while the core is armored", () => {
    expect(fixture().boss.combatObjective).toBe("RETURN THE BOLT");
    expect(fixture("swarm").boss.combatObjective).toBe("PENCIL MINIS");
  });

  it("warns about Cloud lanes before returning to the bolt instruction", () => {
    const { scene, boss, internals } = fixture("cloud");
    scene.time.now = 100000;
    internals.startAttackTelegraph(scene.time.now, "cloud");
    expect(boss.combatObjective).toBe("DODGE LANES");
    internals.updateAttackTelegraph(scene.time.now + 5000);
    expect(boss.combatObjective).toBe("RETURN THE BOLT");
  });

  it("advances an owned boast only once after its input guard", async () => {
    const { scene, boss, internals } = fixture();
    let timeout: () => void = () => {};
    vi.spyOn(scene.time, "delayedCall").mockImplementation((_ms, callback) => { timeout = callback; });
    const pending = internals.showPhaseCutscene("missing-art", "intro");
    await Promise.resolve();
    expect(boss.phaseDialogueActive).toBe(true);
    expect(playLine).toHaveBeenCalledWith(scene, expect.any(String), DANNE_BOSS_PORTRAIT_ASSET.key);
    expect(boss.advanceBoast()).toBe(false);
    scene.time.now += 250;
    expect(boss.advanceBoast()).toBe(true);
    expect(boss.advanceBoast()).toBe(false);
    timeout();
    await pending;
    expect(exitCutscene).toHaveBeenCalledOnce();
    expect(boss.phaseDialogueActive).toBe(false);
  });

  it("settles a waiting boast on scene destruction without exiting another scene", async () => {
    const { scene, boss, internals } = fixture();
    vi.spyOn(scene.time, "delayedCall").mockImplementation(() => {});
    const pending = internals.showPhaseCutscene("missing-art", "intro");
    await Promise.resolve();
    boss.destroy();
    await pending;
    expect(exitCutscene).not.toHaveBeenCalled();
    expect(boss.phaseDialogueActive).toBe(false);
  });

  it("spawns four distinct satellites, not an overlapping center pile", () => {
    const { boss } = fixture("swarm");
    const minis = boss.readout().bossCombat.minis;
    expect(new Set(minis.map(m => `${m.x},${m.y}`)).size).toBe(4);
    expect(new Set(minis.map(m => m.id)).size).toBe(4);
    expect(minis.every(m => m.weakness === "red_pencil")).toBe(true);
  });

  it("disperses a satellite with an owned active Pencil swing without granting boss progress or loot", () => {
    const { internals, player, boss } = fixture("swarm");
    const before = { points: gameState.documentPoints, inventory: [...gameState.inventory], hp: internals.hp };
    const target = internals.minis[0].sprite;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(target.x - 6, target.y - 14, 12, 16);
    internals.updateMinis(1000, 0);
    expect(internals.minis).toHaveLength(3);
    expect(boss.readout().bossCombat.minisDispersed).toBe(1);
    internals.updateMinis(1001, 0);
    expect(boss.readout().bossCombat.minisDispersed).toBe(1);
    expect({ points: gameState.documentPoints, inventory: gameState.inventory, hp: internals.hp }).toEqual(before);
    expect(boss.readout().bossCombat.coreOpen).toBe(false);
  });

  it("lets a different owned tool stun but not disperse, once per swing", () => {
    const { internals, player, boss } = fixture("swarm");
    const target = internals.minis[0];
    player.combatReadout.weapon.tool = "citation_stamp";
    player.activeActionHitbox = new Phaser.Geom.Rectangle(target.sprite.x - 6, target.sprite.y - 14, 12, 16);
    internals.updateMinis(1000, 0);
    expect(internals.minis).toHaveLength(4);
    expect(target.stunnedUntil).toBe(1650);
    internals.updateMinis(1100, 0);
    expect(target.stunnedUntil).toBe(1650);
    expect(boss.readout().bossCombat.minisDispersed).toBe(0);
  });

  it("does not disperse from idle or an unowned tool", () => {
    const { internals, player } = fixture("swarm");
    internals.updateMinis(1000, 0);
    expect(internals.minis).toHaveLength(4);
    gameState.inventory = gameState.inventory.filter(item => item !== "Red Pencil");
    const target = internals.minis[0].sprite;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(target.x - 6, target.y - 14, 12, 16);
    internals.updateMinis(1000, 0);
    expect(internals.minis).toHaveLength(4);
  });

  it("preserves an individual satellite stun through pause", () => {
    const { internals, player, boss, scene } = fixture("swarm");
    const target = internals.minis[0];
    player.combatReadout.weapon.tool = "citation_stamp";
    player.activeActionHitbox = new Phaser.Geom.Rectangle(target.sprite.x - 6, target.sprite.y - 14, 12, 16);
    internals.updateMinis(1000, 0);
    player.activeActionHitbox = null;
    boss.update(1000, 0, false);
    scene.time.now = 6000;
    expect(boss.readout().bossCombat.minis[0].stunnedMs).toBe(650);
    boss.update(6000, 0, true);
    expect(target.stunnedUntil).toBe(6650);
    expect(boss.readout().bossCombat.minis[0].stunnedMs).toBe(650);
  });

  it("keeps stunned satellites from firing while the main boss can attack", () => {
    const { internals } = fixture("swarm");
    for (const mini of internals.minis) mini.stunnedUntil = 10000;
    internals.startAttackTelegraph(1000, "swarm");
    internals.updateAttackTelegraph(5000);
    expect(internals.bolts).toHaveLength(1);
    internals.startAttackTelegraph(11000, "swarm");
    internals.updateAttackTelegraph(15000);
    expect(internals.bolts).toHaveLength(4);
  });

  it("lets the player clear frozen satellites during a returned-bolt opening", () => {
    const { internals, player, boss } = fixture("swarm");
    internals.takeReturnedBolt(1000);
    const target = internals.minis[0].sprite;
    player.actionId++;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(target.x - 6, target.y - 14, 12, 16);
    internals.updateMinis(1100, 16);
    expect(internals.minis).toHaveLength(3);
    expect(boss.readout().bossCombat.coreOpen).toBe(true);
  });

  it("prioritizes a counter over satellite contact on the same frame", () => {
    const { internals, player } = fixture("swarm");
    const target = internals.minis[0].sprite;
    player.setPosition(target.x, target.y);
    player.activeActionHitbox = new Phaser.Geom.Rectangle(target.x - 6, target.y - 14, 12, 16);
    internals.updateMinis(3000, 0);
    expect(internals.minis).toHaveLength(3);
    expect(player.takeHit).not.toHaveBeenCalled();
  });

  it("does not damage across a vertical gap between the visible feet", () => {
    const { internals, player, scene } = fixture("swarm");
    const target = internals.minis[0].sprite;
    scene.time.now = 3000;
    player.setPosition(target.x, target.y + 10);
    internals.updateMinis(3000, 0);
    expect(player.takeHit).not.toHaveBeenCalled();
    player.setPosition(target.x, target.y + 7);
    internals.updateMinis(3000, 0);
    expect(player.takeHit).toHaveBeenCalledOnce();
  });

  it.each(["colossus", "swarm", "cloud", "ascendant"] as const)("protects the %s core until a bolt is returned", (phase) => {
    const { player, internals, boss } = fixture(phase);
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    for (let i = 0; i < 3; i += 1) {
      player.actionId += 1;
      internals.checkPlayerActionHit(1000 + i * 500);
    }
    expect(internals.hp).toBe(180);
    expect(player.pushAwayFrom).toHaveBeenCalledTimes(3);
    expect(gameState.reliability).toBe(100);
    expect(boss.readout().bossCombat.coreOpen).toBe(false);
    expect(boss.readout().bossCombat.feedback?.text).toBe("ARMORED: RETURN A BOLT");
    expect(internals.coreOpening.visible).toBe(false);
  });

  it("damages an exposed core only with the active owned tool, once per swing", () => {
    const { player, internals } = fixture();
    internals.takeReturnedBolt(1000);
    player.actionId += 1;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    player.combatReadout.weapon.tool = "citation_stamp";
    internals.checkPlayerActionHit(1000);
    expect(internals.hp).toBe(152);
    expect(player.pushAwayFrom).toHaveBeenCalled();
    player.combatReadout.weapon.tool = "red_pencil";
    player.actionId += 1;
    internals.checkPlayerActionHit(1400);
    expect(internals.hp).toBe(124);
    internals.checkPlayerActionHit(1800);
    expect(internals.hp).toBe(124);
    player.actionId += 1;
    gameState.inventory = gameState.inventory.filter((item) => item !== "Red Pencil");
    internals.checkPlayerActionHit(2200);
    expect(internals.hp).toBe(124);
  });

  it("requires a fresh follow-up swing and closes exactly at the opening deadline", () => {
    const { player, internals, scene, boss } = fixture();
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    internals.takeReturnedBolt(1000);
    expect(internals.coreOpening.visible).toBe(true);
    internals.checkPlayerActionHit(1100);
    expect(internals.hp).toBe(152);
    player.actionId += 1;
    internals.checkPlayerActionHit(1500);
    expect(internals.hp).toBe(124);
    scene.time.now = 1000 + DANNE_BOSS_RETURN.stunMs;
    player.actionId += 1;
    internals.checkPlayerActionHit(scene.time.now);
    expect(internals.hp).toBe(124);
    expect(boss.readout().bossCombat.coreOpen).toBe(false);
    boss.update(scene.time.now, 16, true);
    expect(internals.coreOpening.visible).toBe(false);
  });

  it("allows two separate follow-up hits before re-armoring, but never damage outside active frames", () => {
    const { player, internals } = fixture();
    internals.takeReturnedBolt(1000);
    player.actionId += 1;
    internals.checkPlayerActionHit(1500);
    expect(internals.hp).toBe(152);
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    internals.checkPlayerActionHit(1800);
    expect(internals.hp).toBe(124);
    player.actionId += 1;
    internals.checkPlayerActionHit(2300);
    expect(internals.hp).toBe(96);
    player.actionId += 1;
    internals.checkPlayerActionHit(3000);
    expect(internals.hp).toBe(96);
  });

  it("keeps the Ruby Pen upgrade behind the same counter opening", () => {
    const { player, internals } = fixture();
    addDanneItem("ruby-pen");
    gameState.equippedDanneItem = "ruby-pen";
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    internals.checkPlayerActionHit(1000);
    expect(internals.hp).toBe(180);
    internals.takeReturnedBolt(1100);
    player.actionId += 1;
    internals.checkPlayerActionHit(1500);
    expect(internals.hp).toBe(117);
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
    expect(boss.readout().bossCombat.feedback?.text).toBe("EGO RETURNED! STRIKE CORE");
    internals.updateAttackPattern(1100 + DANNE_BOSS_RETURN.stunMs - 1);
    expect(boss.readout().telegraph).toBeNull();
    internals.updateAttackPattern(1100 + DANNE_BOSS_RETURN.stunMs);
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
    expect(boss.readout().bossCombat.counterWindowMs).toBe(DANNE_BOSS_RETURN.stunMs);
    expect(boss.readout().bossCombat.coreOpen).toBe(true);
    expect(internals.coreOpening.visible).toBe(true);
    boss.update(6100, 16, true);
    expect(boss.readout().bossCombat.counterWindowMs).toBe(DANNE_BOSS_RETURN.stunMs);
    expect(boss.readout().telegraph).toBeNull();
  });

  it("shows a readable core countdown and removes every marker when armor returns", () => {
    const { internals, boss, scene } = fixture();
    internals.takeReturnedBolt(1000);
    expect(internals.coreOpeningFrame.visible).toBe(true);
    expect(internals.coreOpeningLabel.text).toBe("CORE OPEN");
    expect(internals.coreOpening.y).toBeGreaterThan(53);
    expect(internals.coreOpening.width).toBe(54);
    internals.syncCoreOpening(2600);
    expect(internals.coreOpeningLabel.text).toBe("CLOSING");
    expect(internals.coreOpening.width).toBe(11);
    scene.time.now = 3000;
    boss.update(3000,16,true);
    expect(internals.coreOpening.visible).toBe(false);
    expect(internals.coreOpeningFrame.visible).toBe(false);
    expect(internals.coreOpeningLabel.visible).toBe(false);
  });

  it("keeps a returned-bolt counter window usable after a slow rendering frame", () => {
    const {boss,internals,scene}=fixture("cloud");
    internals.takeReturnedBolt(1000);
    scene.time.now=2000;
    boss.update(2000,1000,true);
    expect(boss.readout().bossCombat.counterWindowMs).toBe(DANNE_BOSS_RETURN.stunMs-50);
    expect(boss.readout().bossCombat.coreOpen).toBe(true);
  });

  it("preserves a projectile's travel lifetime across a rendering stall", () => {
    const {boss,internals,scene}=fixture();
    internals.fireBolt({x:60,y:100},{x:60,y:200},50);
    const expiry=internals.bolts[0].expiresAt;
    scene.time.now=4000;
    boss.update(4000,3000,true);
    expect(internals.bolts).toHaveLength(1);
    expect(internals.bolts[0].expiresAt).toBe(expiry+2950);
    expect(internals.bolts[0].y).toBeCloseTo(92.5);
  });

  it("reports bounded HUD feedback, preserves it through pause, then clears it during play", () => {
    const { boss, internals, scene } = fixture();
    internals.hitPlayer({ x: 128, y: 100 }, "ego_bolt", 1000);
    expect(boss.readout().bossCombat.feedback).toEqual({ text: "EGO BOLT: -10 REL", tone: "warn", msRemaining: 1400 });
    boss.readout().bossCombat.feedback!.text = "Mutated snapshot";
    boss.update(1000, 16, false);
    scene.time.now = 11000;
    boss.update(11000, 16, false);
    expect(boss.readout().bossCombat.feedback).toEqual({ text: "EGO BOLT: -10 REL", tone: "warn", msRemaining: 1400 });
    boss.update(11000, 16, true);
    expect(boss.readout().bossCombat.feedback?.msRemaining).toBe(1384);
    scene.time.now += 1400;
    boss.update(scene.time.now, 1400, true);
    expect(boss.readout().bossCombat.feedback).toBeNull();
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
    expect(boss.readout().bossCombat.coreOpen).toBe(false);
    expect(internals.coreOpening.visible).toBe(false);
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
    internals.hp = 12;
    internals.hitPlayer({ x: 100, y: 100 }, "swarm", 1000);
    expect(boss.inputLocked).toBe(true);
    expect(boss.readout().bossCombat.retryAvailable).toBe(true);
    expect(gameState.reliability).toBe(0);
    expect(onDefeated).not.toHaveBeenCalled();
    internals.retryChoice.choose("A");
    expect(boss.currentPhase).toBe("swarm");
    expect(boss.inputLocked).toBe(false);
    expect(internals.hp).toBe(12);
    expect(internals.statutoryYear).toBe(25);
    expect(gameState.reliability).toBe(100);
    expect(player.position).toEqual({ x: 128, y: 188 });
    expect(gameState.documentCandidates).toEqual(documents);
    expect(gameState.inventory).toEqual(inventory);
    expect(gameState.sceneProgress.blackVaultBossCleared).toBeFalsy();
  });

  it("starts a new phase at full health rather than carrying retry damage forward", () => {
    const { internals } = fixture("colossus");
    internals.hp = 12;
    internals.beginPhase("cloud");
    expect(internals.hp).toBe(180);
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

  it("fires all three Cloud bolts along their locked warning lanes even after the player moves", () => {
    const { scene, player, boss, internals } = fixture("cloud");
    internals.startAttackTelegraph(1000, "cloud");
    const warning = boss.readout().telegraph!;
    expect(warning.lanes).toHaveLength(3);
    player.setPosition(180, 200);
    expect(boss.readout().telegraph?.target).toEqual(warning.target);
    scene.time.now = 1800;
    internals.updateAttackTelegraph(1800);
    expect(internals.bolts).toHaveLength(3);
    internals.bolts.forEach((bolt, index) => {
      const endpoint = warning.lanes[index];
      const dx = endpoint.x - bolt.x;
      const dy = endpoint.y - bolt.y;
      expect(bolt.vx * dy - bolt.vy * dx).toBeCloseTo(0, 7);
      expect(bolt.vx * dx + bolt.vy * dy).toBeGreaterThan(0);
    });
  });

  it("keeps Cloud lanes visible on the low pulse and disposes them when firing", () => {
    const { internals } = fixture("cloud");
    internals.startAttackTelegraph(1000, "cloud");
    const markers = internals.attackTelegraph!.markers;
    expect(markers).toHaveLength(18); // Two brackets, one raster graphic, one muzzle.
    internals.updateAttackTelegraph(1090);
    expect(markers.every(marker => marker.alpha >= 0.85 && marker.active)).toBe(true);
    internals.updateAttackTelegraph(1800);
    expect(markers.every(marker => !marker.active)).toBe(true);
  });

  it("avoids repeated clock texture refreshes while preserving warning and victory colors", () => {
    const { internals } = fixture();
    internals.statutoryYear = 20;
    internals.syncStatutoryClockUi();
    const recolor = vi.spyOn(internals.clockStatusText, "setColor");
    for (let frame = 0; frame < 120; frame++) internals.syncStatutoryClockUi();
    expect(recolor).not.toHaveBeenCalled();
    internals.statutoryYear = 30;
    internals.syncStatutoryClockUi();
    expect(recolor).toHaveBeenCalledTimes(1);
    const warning = recolor.mock.calls[0];
    internals.syncStatutoryClockUi();
    expect(recolor).toHaveBeenCalledTimes(1);
    internals.defeated = true;
    internals.syncStatutoryClockUi();
    expect(recolor).toHaveBeenCalledTimes(2);
    expect(recolor.mock.calls[1]).not.toEqual(warning);
    expect(internals.clockStatusText.text).toBe("DANN-E CLEARED");
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
    internals.takeReturnedBolt(1000);
    player.actionId += 1;
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
    internals.takeReturnedBolt(1000);
    player.actionId += 1;
    internals.hp = 1;
    player.activeActionHitbox = new Phaser.Geom.Rectangle(100, 80, 50, 70);
    internals.checkPlayerActionHit(1000);
    expect(internals.hp).toBe(1);
    expect(onDefeated).not.toHaveBeenCalled();
    expect(gameState.sceneProgress.blackVaultBossCleared).toBeFalsy();
  });
});
