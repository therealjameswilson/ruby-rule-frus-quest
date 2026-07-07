import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../../game/constants";
import { DANNE_BOSS_SPRITE_ASSET, DANNE_VFX_ASSETS } from "../../game/danneAtlas";
import { danneBoastForPhase, type DanneBoastPhase } from "../../game/danneBoasts";
import { unlockCodexEntry } from "../../game/codex";
import {
  advanceStatutoryClock,
  getStatutoryClockReadout,
  STATUTORY_DEADLINE_YEARS,
  STATUTORY_QUICK_BOSS_MS_PER_YEAR,
  STATUTORY_START_YEAR,
  STATUTORY_BOSS_MS_PER_YEAR
} from "../../game/statutoryClock";
import {
  addDanneItem,
  certifyFinalPublicationAfterDanne,
  defeatDungeonBoss,
  gameState,
  getPublicationReadinessReadout,
  hasDanneItem,
  setLatestMessage,
  setObjective
} from "../../game/state";
import type { ChoiceOption, Position } from "../../game/types";
import { hideBossHud, setBossHp, showBossHud } from "../../systems/bossHud";
import { enterCutscene, exitCutscene, playLine } from "../../systems/cutscene";
import { retroAudio } from "../../systems/audio";
import { applyHitShake } from "../../systems/combatFeedback";
import { snapPixel } from "../../systems/pixelPerfect";
import { applyStandardsViolation } from "../../systems/reliability";
import { ChoicePrompt } from "../../systems/verification";
import { Player } from "../Player";

export type DanneBossPhase = "intro" | "colossus" | "swarm" | "cloud" | "ascendant" | "defeated";

interface EgoBolt {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  expiresAt: number;
  armed: boolean;
}

interface MiniDanne {
  sprite: Phaser.GameObjects.Sprite;
  angle: number;
  radius: number;
  speed: number;
}

interface DanneBossOptions {
  player: Player;
  secretAscendant: boolean;
  quickFight: boolean;
  onDefeated: (trueEnding: boolean) => void;
  onBadEnding: () => void;
  onPhaseChange: (phase: DanneBossPhase) => void;
}

const EGO_BOLT = DANNE_VFX_ASSETS[0];
const BOSS_CENTER = { x: 128, y: 118 } as const;
const CLOUD_CORNERS: readonly Position[] = [
  { x: 72, y: 94 },
  { x: 184, y: 94 },
  { x: 72, y: 170 },
  { x: 184, y: 170 }
];

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function wait(scene: Phaser.Scene, ms: number) {
  return new Promise<void>((resolve) => {
    scene.time.delayedCall(ms, () => resolve());
  });
}

function vectorToward(from: Position, to: Position, speed: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return { vx: (dx / length) * speed, vy: (dy / length) * speed };
}

export class DanneBoss {
  readonly label = "DANN-E";
  readonly spriteKey = DANNE_BOSS_SPRITE_ASSET.key;
  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly secretAscendant: boolean;
  private readonly maxHp: number;
  private readonly phaseCount: number;
  private readonly quickFight: boolean;
  private readonly onDefeated: (trueEnding: boolean) => void;
  private readonly onBadEnding: () => void;
  private readonly onPhaseChange: (phase: DanneBossPhase) => void;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly clockContainer: Phaser.GameObjects.Container;
  private readonly clockFill: Phaser.GameObjects.Rectangle;
  private readonly clockText: Phaser.GameObjects.Text;
  private readonly clockStatusText: Phaser.GameObjects.Text;
  private readonly shortcutChoice: ChoicePrompt;
  private readonly bolts: EgoBolt[] = [];
  private readonly minis: MiniDanne[] = [];
  private phase: DanneBossPhase = "intro";
  private hp = 1;
  private statutoryYear = STATUTORY_START_YEAR;
  private deadlineDamageApplied = false;
  private shortcutOffered = false;
  private shortcutResolved = false;
  private nextBoltAt = 0;
  private nextTeleportAt = 0;
  private nextPlayerHitAt = 0;
  private phaseTransitioning = false;
  private defeated = false;
  private boastIndex = 0;

  constructor(scene: Phaser.Scene, options: DanneBossOptions) {
    this.scene = scene;
    this.player = options.player;
    this.secretAscendant = options.secretAscendant;
    this.quickFight = options.quickFight;
    this.maxHp = options.quickFight ? 48 : 180;
    this.phaseCount = this.secretAscendant ? 4 : 3;
    this.onDefeated = options.onDefeated;
    this.onBadEnding = options.onBadEnding;
    this.onPhaseChange = options.onPhaseChange;
    this.shadow = scene.add.ellipse(BOSS_CENTER.x, BOSS_CENTER.y + 12, 34, 9, color(PALETTE.black), 0.7)
      .setDepth(BOSS_CENTER.y - 5);
    this.sprite = scene.add.sprite(BOSS_CENTER.x, BOSS_CENTER.y, this.spriteKey)
      .setOrigin(0.5, 0.82)
      .setScale(0.14)
      .setDepth(BOSS_CENTER.y)
      .setVisible(false);
    const animKey = danneAnimKey(this.spriteKey, "walk-down");
    if (scene.anims.exists(animKey)) this.sprite.play(animKey);
    this.shortcutChoice = new ChoicePrompt(scene);
    const clockBg = scene.add.rectangle(128, 55, 224, 23, color(PALETTE.black), 0.88)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setScrollFactor(0);
    this.clockFill = scene.add.rectangle(21, 60, 1, 5, color(PALETTE.goldStamp), 0.9)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.clockText = scene.add.text(21, 46, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setScrollFactor(0);
    this.clockStatusText = scene.add.text(235, 46, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      align: "right"
    }).setOrigin(1, 0).setScrollFactor(0);
    this.clockContainer = scene.add.container(0, 0, [clockBg, this.clockFill, this.clockText, this.clockStatusText])
      .setDepth(1555)
      .setScrollFactor(0)
      .setVisible(false);
    unlockCodexEntry("enemy-danne-boss");
  }

  get isActive() {
    return !this.defeated;
  }

  get currentPhase() {
    return this.phase;
  }

  get inputLocked() {
    return this.shortcutChoice.active;
  }

  get position(): Position {
    return { x: Math.round(this.sprite.x), y: Math.round(this.sprite.y) };
  }

  start() {
    void this.runIntro();
  }

  update(timeMs: number, deltaMs: number, canAct: boolean) {
    if (this.defeated) return;
    if (this.shortcutChoice.active) {
      this.shortcutChoice.updateInput();
      this.syncStatutoryClockUi();
      return;
    }
    this.updateBolts(timeMs, deltaMs);
    this.updateMinis(timeMs, deltaMs);
    this.syncDepths();
    if (this.phase === "intro" || this.phaseTransitioning || !canAct) return;
    this.updateStatutoryClock(deltaMs);
    this.checkPlayerActionHit(timeMs);
    this.updateAttackPattern(timeMs);
  }

  readout() {
    return {
      label: `DANN-E ${this.phase.toUpperCase()}`,
      x: this.position.x,
      y: this.position.y,
      spriteKey: this.spriteKey,
      behavior: this.behaviorLabel(),
      defeatMethod: "Publish with all pendants, all crystals, the Buckram Key, and zero unresolved standards violations.",
      status: `${this.hp}/${this.maxHp} HP; Statutory Clock ${this.clockReadout()}; ${this.bolts.length} ego bolts; ${this.minis.length} mini-DANN-Es`
    };
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.clockContainer.destroy();
    for (const bolt of this.bolts) bolt.sprite.destroy();
    for (const mini of this.minis) mini.sprite.destroy();
    hideBossHud();
  }

  private async runIntro() {
    this.phaseTransitioning = true;
    unlockCodexEntry("danne-prime-humanoid");
    await this.showPhaseCutscene("danne-prime-humanoid", "intro", "danne-portrait-archivist");
    if (this.defeated) return;
    this.beginPhase("colossus");
    await this.showPhaseCutscene("danne-colossus-final-form", "colossus");
    this.phaseTransitioning = false;
  }

  private beginPhase(phase: Exclude<DanneBossPhase, "intro" | "defeated">) {
    this.phase = phase;
    unlockCodexEntry(this.variantKeyForPhase(phase));
    this.hp = this.maxHp;
    this.nextBoltAt = this.scene.time.now + 650;
    this.nextTeleportAt = this.scene.time.now + 900;
    this.onPhaseChange(phase);
    this.sprite.setVisible(true);
    this.clockContainer.setVisible(true);
    this.sprite.clearTint();
    if (phase === "cloud") this.sprite.setTint(color(PALETTE.terminalCyan));
    if (phase === "ascendant") this.sprite.setTint(color(PALETTE.buckramHighlight));
    if (phase === "swarm") this.spawnMiniDannes();
    if (phase === "colossus") this.moveBossTo(BOSS_CENTER.x, BOSS_CENTER.y);
    showBossHud(this.scene, "DANN-E", this.maxHp, this.phaseCount);
    setBossHp(this.hp, this.phaseIndex());
    this.syncStatutoryClockUi();
    setLatestMessage(`DANN-E ${phase} phase started. Statutory Clock is running.`);
    retroAudio.dannePhaseTransition();
  }

  private async transitionToPhase(phase: Exclude<DanneBossPhase, "intro" | "defeated">) {
    if (this.phaseTransitioning || this.defeated) return;
    this.phaseTransitioning = true;
    this.beginPhase(phase);
    await this.showPhaseCutscene(this.variantKeyForPhase(phase), phase);
    this.phaseTransitioning = false;
  }

  private async finishFight() {
    if (this.defeated) return;
    this.defeated = true;
    this.phase = "defeated";
    this.onPhaseChange("defeated");
    applyHitShake(this.scene, "boss-defeat");
    hideBossHud();
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
    this.clockContainer.setVisible(false);
    this.clearBolts();
    this.clearMinis();
    gameState.sceneProgress.blackVaultBossCleared = 1;
    gameState.sceneProgress.blackVaultWestOpen = 1;
    gameState.sceneProgress.blackVaultNorthOpen = 1;
    defeatDungeonBoss("buckram_gate", "DANN-E final review hurdle defeated");
    unlockCodexEntry("danne-defeated");
    addDanneItem("treaty-fragments", 2);
    const certification = certifyFinalPublicationAfterDanne();
    const trueEnding = certification.trueEnding;
    if (trueEnding && this.secretAscendant) {
      await this.showPhaseCutscene("danne-ascendant", "ascendant", "danne-portrait-historian", "The complete treaty record forces DANN-E back into review.");
    }
    await this.showPhaseCutscene("danne-defeated", "defeated", "danne-portrait-archivist");
    this.onDefeated(trueEnding);
  }

  private updateAttackPattern(timeMs: number) {
    if (timeMs < this.nextBoltAt) return;
    if (this.phase === "colossus") {
      this.fireTowardPlayer(58);
      this.nextBoltAt = timeMs + 2500;
      return;
    }
    if (this.phase === "swarm") {
      this.fireTowardPlayer(62);
      for (const mini of this.minis.slice(0, 2)) {
        this.fireBolt({ x: mini.sprite.x, y: mini.sprite.y }, this.player.position, 50);
      }
      this.nextBoltAt = timeMs + 1550;
      return;
    }
    if (this.phase === "cloud") {
      if (timeMs >= this.nextTeleportAt) {
        const target = CLOUD_CORNERS[Math.floor(timeMs / 1800) % CLOUD_CORNERS.length];
        this.moveBossTo(target.x, target.y);
        this.nextTeleportAt = timeMs + 1800;
      }
      this.fireSpread(64, [-0.28, 0, 0.28]);
      this.nextBoltAt = timeMs + 1250;
      return;
    }
    if (this.phase === "ascendant") {
      this.fireSpread(72, [-0.5, -0.18, 0.18, 0.5]);
      for (const corner of CLOUD_CORNERS) this.fireBolt(corner, this.player.position, 48);
      this.nextBoltAt = timeMs + 980;
    }
  }

  private checkPlayerActionHit(timeMs: number) {
    const hitbox = this.player.activeActionHitbox;
    if (!hitbox || timeMs < this.nextPlayerHitAt) return;
    if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, this.bossBody())) return;
    this.nextPlayerHitAt = timeMs + 260;
    const hasRubyPen = gameState.equippedDanneItem === "ruby-pen" && hasDanneItem("ruby-pen");
    const baseDamage = hasRubyPen ? 35 : 14;
    const damage = this.phase === "cloud" ? Math.ceil(baseDamage / 2) : baseDamage;
    this.hp = Math.max(0, this.hp - damage);
    setBossHp(this.hp, this.phaseIndex());
    applyHitShake(this.scene, "boss-hit");
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.35,
      duration: 45,
      yoyo: true,
      repeat: 2,
      ease: "Stepped"
    });
    setLatestMessage(`Ruby Pen review hit DANN-E for ${damage}.`);
    this.resolvePhaseHp();
  }

  private resolvePhaseHp() {
    if (this.hp > 0 || this.phaseTransitioning) return;
    if (this.phase === "colossus") {
      void this.transitionToPhase("swarm");
      return;
    }
    if (this.phase === "swarm") {
      this.clearMinis();
      void this.transitionToPhase("cloud");
      return;
    }
    if (this.phase === "cloud") {
      if (this.secretAscendant) {
        void this.transitionToPhase("ascendant");
        return;
      }
      this.resolveLegitimatePublicationOrHold();
      return;
    }
    if (this.phase === "ascendant") this.resolveLegitimatePublicationOrHold();
  }

  private resolveLegitimatePublicationOrHold() {
    const readiness = getPublicationReadinessReadout();
    if (!readiness.buckramGateOpen) {
      this.hp = 1;
      setBossHp(this.hp, this.phaseIndex());
      this.sprite.setTint(color(PALETTE.classNetRed));
      const missing = this.readinessMissingSummary(readiness);
      setLatestMessage(`DANN-E cannot be defeated until the Buckram Gate opens: ${missing}.`);
      setObjective(`Open Buckram Gate first: ${missing}.`);
      if (!this.shortcutOffered) this.offerShortcut("DANN-E offers to omit contested material instead.");
      return;
    }
    void this.finishFight();
  }

  private updateStatutoryClock(deltaMs: number) {
    const readiness = getPublicationReadinessReadout();
    this.statutoryYear = advanceStatutoryClock(
      this.statutoryYear,
      deltaMs,
      this.quickFight ? STATUTORY_QUICK_BOSS_MS_PER_YEAR : STATUTORY_BOSS_MS_PER_YEAR,
      readiness
    );
    this.syncStatutoryClockUi();
    gameState.sceneProgress.statutoryClockTenths = Math.round(this.statutoryYear * 10);
    gameState.sceneProgress.buckramGateOpen = readiness.buckramGateOpen ? 1 : 0;
    if (this.statutoryYear >= STATUTORY_DEADLINE_YEARS && !readiness.buckramGateOpen && !this.deadlineDamageApplied) {
      this.deadlineDamageApplied = true;
      gameState.sceneProgress.statutoryDeadlineMissed = 1;
      const violation = applyStandardsViolation("missed_30_year_deadline", "Statutory Clock expired before the Buckram Gate opened.");
      setObjective("DANN-E is pressuring an unlawful shortcut. Reject concealed omissions.");
      setLatestMessage(`${violation.label} DANN-E is pressuring an omission shortcut.`);
      this.offerShortcut("The 30-year clock expired before the Buckram Gate opened.");
    }
  }

  private syncStatutoryClockUi() {
    const readiness = getPublicationReadinessReadout();
    const readout = getStatutoryClockReadout({
      elapsedYears: this.statutoryYear,
      readiness,
      deadlineDamageApplied: this.deadlineDamageApplied
    });
    this.statutoryYear = readout.elapsedYears;
    const ratio = Phaser.Math.Clamp(readout.progressRatio, 0, 1);
    this.clockFill.setSize(Math.max(1, Math.round(214 * ratio)), 5);
    const urgent = readout.status === "at_risk" || readout.status === "deadline_missed";
    this.clockFill.setFillStyle(color(readiness.buckramGateOpen ? PALETTE.openNetGreen : urgent ? PALETTE.classNetRed : PALETTE.goldStamp), 0.92);
    this.clockText.setText(`STATUTORY CLOCK ${readout.elapsedYears.toFixed(1)} / ${readout.deadlineYears} YEARS`);
    this.clockStatusText
      .setText(readiness.buckramGateOpen ? "BUCKRAM GATE OPEN" : `${readiness.pendants.collected}/${readiness.pendants.required} P  ${readiness.crystals.collected}/${readiness.crystals.required} C`)
      .setColor(readiness.buckramGateOpen ? PALETTE.openNetGreen : urgent ? PALETTE.classNetRed : PALETTE.goldStamp);
  }

  private offerShortcut(reason: string) {
    if (this.shortcutResolved || this.shortcutChoice.active) return;
    this.shortcutOffered = true;
    this.clearBolts();
    const options: ChoiceOption[] = [
      { key: "A", label: "Omit contested material", value: "shortcut" },
      { key: "B", label: "Keep Kellogg standards", value: "standards" }
    ];
    this.shortcutChoice.show(`${reason}\n\nDANN-E: OMIT THE HARD PART AND PUBLISH NOW?`, options, (option) => {
      if (option.value === "shortcut") {
        this.shortcutResolved = true;
        gameState.sceneProgress.danneBadEnding = 1;
        gameState.sceneProgress.concealedPolicyDefect = 1;
        applyStandardsViolation("concealed_policy_defect", "DANN-E shortcut concealed policy defects by omitting material.");
        setLatestMessage("BAD ENDING: DANN-E shortcut accepted; material facts were concealed.");
        this.defeated = true;
        this.clockContainer.setVisible(false);
        this.sprite.setVisible(false);
        this.shadow.setVisible(false);
        hideBossHud();
        this.clearBolts();
        this.clearMinis();
        this.onBadEnding();
        return;
      }
      this.hp = Math.max(1, this.hp);
      setBossHp(this.hp, this.phaseIndex());
      setObjective("Reject the shortcut. Open the Buckram Gate with all pendants, crystals, and clean standards.");
      setLatestMessage("Shortcut rejected. DANN-E remains vulnerable only to lawful publication readiness.");
      retroAudio.warning();
    });
  }

  private readinessMissingSummary(readiness = getPublicationReadinessReadout()) {
    return readiness.missingSummary.length ? readiness.missingSummary.join(", ") : "final certification";
  }

  private clockReadout() {
    const readiness = getPublicationReadinessReadout();
    return getStatutoryClockReadout({
      elapsedYears: this.statutoryYear,
      readiness,
      deadlineDamageApplied: this.deadlineDamageApplied
    }).label;
  }

  private bossBody() {
    const x = Math.round(this.sprite.x);
    const y = Math.round(this.sprite.y);
    return new Phaser.Geom.Rectangle(x - 19, y - 42, 38, 48);
  }

  private fireTowardPlayer(speed: number) {
    this.fireBolt(this.position, this.player.position, speed);
  }

  private fireSpread(speed: number, angleOffsets: readonly number[]) {
    const from = this.position;
    const baseAngle = Phaser.Math.Angle.Between(from.x, from.y, this.player.position.x, this.player.position.y);
    for (const offset of angleOffsets) {
      const target = {
        x: from.x + Math.cos(baseAngle + offset) * 48,
        y: from.y + Math.sin(baseAngle + offset) * 48
      };
      this.fireBolt(from, target, speed);
    }
  }

  private fireBolt(from: Position, target: Position, speed: number) {
    const { vx, vy } = vectorToward(from, target, speed);
    const bolt = this.scene.add.sprite(snapPixel(from.x), snapPixel(from.y - 10), EGO_BOLT.key, Math.abs(vx) > Math.abs(vy) ? 0 : 4)
      .setOrigin(0.5)
      .setScale(0.03)
      .setDepth(Math.round(from.y + 4));
    const animKey = danneAnimKey(EGO_BOLT.key, "fly");
    if (this.scene.anims.exists(animKey)) bolt.play(animKey);
    bolt.setAngle(Math.round(Phaser.Math.RadToDeg(Math.atan2(vy, vx))));
    this.bolts.push({
      sprite: bolt,
      vx,
      vy,
      expiresAt: this.scene.time.now + 2000,
      armed: true
    });
    retroAudio.egoBoltFire();
  }

  private updateBolts(timeMs: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const footBox = new Phaser.Geom.Rectangle(this.player.position.x - 8, this.player.position.y - 4, 16, 9);
    for (let index = this.bolts.length - 1; index >= 0; index -= 1) {
      const bolt = this.bolts[index];
      bolt.sprite.setPosition(snapPixel(bolt.sprite.x + bolt.vx * dt), snapPixel(bolt.sprite.y + bolt.vy * dt));
      bolt.sprite.setDepth(Math.round(bolt.sprite.y + 6));
      const boltBox = new Phaser.Geom.Rectangle(bolt.sprite.x - 6, bolt.sprite.y - 6, 12, 12);
      if (bolt.armed && Phaser.Geom.Intersects.RectangleToRectangle(boltBox, footBox)) {
        bolt.armed = false;
        this.player.takeHit({ x: bolt.sprite.x, y: bolt.sprite.y }, 12, 800);
        setLatestMessage("Ego bolt hit. Evidence still requires review.");
        retroAudio.egoBoltImpact();
      }
      if (timeMs >= bolt.expiresAt || bolt.sprite.x < -20 || bolt.sprite.x > GAME_WIDTH + 20 || bolt.sprite.y < 20 || bolt.sprite.y > GAME_HEIGHT + 20) {
        bolt.sprite.destroy();
        this.bolts.splice(index, 1);
      }
    }
  }

  private spawnMiniDannes() {
    this.clearMinis();
    const starts = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    for (const [index, angle] of starts.entries()) {
      const mini = this.scene.add.sprite(BOSS_CENTER.x, BOSS_CENTER.y, this.spriteKey)
        .setOrigin(0.5, 0.82)
        .setScale(0.055)
        .setDepth(BOSS_CENTER.y + index + 1);
      const animKey = danneAnimKey(this.spriteKey, "walk-down");
      if (this.scene.anims.exists(animKey)) mini.play(animKey);
      this.minis.push({ sprite: mini, angle, radius: 42, speed: index % 2 === 0 ? 1 : -1 });
    }
  }

  private updateMinis(timeMs: number, deltaMs: number) {
    if (!this.minis.length) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    for (const mini of this.minis) {
      mini.angle += mini.speed * dt * 1.7;
      const x = BOSS_CENTER.x + Math.cos(mini.angle) * mini.radius;
      const y = BOSS_CENTER.y + 14 + Math.sin(mini.angle) * (mini.radius * 0.55);
      mini.sprite.setPosition(snapPixel(x), snapPixel(y));
      mini.sprite.setDepth(Math.round(y));
      if (Phaser.Math.Distance.Between(mini.sprite.x, mini.sprite.y, this.player.position.x, this.player.position.y) < 12) {
        this.player.takeHit({ x: mini.sprite.x, y: mini.sprite.y }, 9, 700);
      }
    }
  }

  private clearBolts() {
    for (const bolt of this.bolts.splice(0)) bolt.sprite.destroy();
  }

  private clearMinis() {
    for (const mini of this.minis.splice(0)) mini.sprite.destroy();
  }

  private async showPhaseCutscene(
    variantKey: string,
    boastPhase: DanneBoastPhase,
    portraitKey = "danne-portrait-archivist",
    overrideLine?: string
  ) {
    const still = this.scene.textures.exists(variantKey)
      ? this.scene.add.image(GAME_WIDTH / 2, 86, variantKey).setDepth(1620).setScrollFactor(0)
      : null;
    if (still) {
      const source = this.scene.textures.get(variantKey).getSourceImage() as { width?: number; height?: number };
      const scale = Math.min(118 / Math.max(1, source.width ?? 1024), 88 / Math.max(1, source.height ?? 1024));
      still.setScale(scale).setAlpha(0);
    }
    await enterCutscene(this.scene);
    if (still) {
      this.scene.tweens.add({ targets: still, alpha: 1, duration: 150 });
    }
    retroAudio.danneBoast();
    playLine(this.scene, overrideLine ?? danneBoastForPhase(boastPhase, this.boastIndex), portraitKey);
    this.boastIndex += 1;
    await wait(this.scene, 1150);
    await exitCutscene(this.scene);
    still?.destroy();
  }

  private moveBossTo(x: number, y: number) {
    this.sprite.setPosition(snapPixel(x), snapPixel(y));
    this.shadow.setPosition(snapPixel(x), snapPixel(y + 12));
    this.syncDepths();
  }

  private syncDepths() {
    const y = Math.round(this.sprite.y);
    this.sprite.setDepth(y);
    this.shadow.setDepth(y - 5);
  }

  private phaseIndex() {
    if (this.phase === "colossus") return 0;
    if (this.phase === "swarm") return 1;
    if (this.phase === "cloud") return 2;
    if (this.phase === "ascendant") return 3;
    return 0;
  }

  private variantKeyForPhase(phase: Exclude<DanneBossPhase, "intro" | "defeated">) {
    if (phase === "colossus") return "danne-colossus-final-form";
    if (phase === "swarm") return "danne-swarm";
    if (phase === "cloud") return "danne-cloud-form";
    return "danne-ascendant";
  }

  private behaviorLabel() {
    if (this.phase === "intro") return "cutscene reveal";
    if (this.phase === "colossus") return "ego-bolt cannon every 2.5s";
    if (this.phase === "swarm") return "mini-DANN-E reinforcement wave";
    if (this.phase === "cloud") return "teleporting cloud form with spread shots";
    if (this.phase === "ascendant") return "four simultaneous ego-bolt patterns";
    return "defeated";
  }
}
