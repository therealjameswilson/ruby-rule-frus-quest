import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../../game/constants";
import { DANNE_BOSS_SPRITE_ASSET, DANNE_VFX_ASSETS } from "../../game/danneAtlas";
import {
  danneAttackTelegraphSpec,
  danneTelegraphPulseOn,
  danneTelegraphRemainingMs,
  type DanneAttackPhase,
  type DanneAttackTelegraphKind
} from "../../game/danneBossTelegraph";
import { danneBoastForPhase, type DanneBoastPhase } from "../../game/danneBoasts";
import { DANNE_CLOUD_WAYPOINTS } from "../../game/danneSceneCollisions";
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
  defeatDungeonBoss,
  gameState,
  getBlackVaultClimaxReadiness,
  getTreatyFragmentCount,
  hasDanneItem,
  recordDanneVariantDefeated,
  recordUnresolvedEquity,
  resolveStandardsViolationsByType,
  setLatestMessage,
  setObjective
} from "../../game/state";
import type { ChoiceOption, Position } from "../../game/types";
import { hideBossHud, setBossHp, showBossHud } from "../../systems/bossHud";
import { enterCutscene, exitCutscene, playLine } from "../../systems/cutscene";
import { retroAudio } from "../../systems/audio";
import { getDanneDifficultyProfile, type DanneDifficultyProfile } from "../../systems/newGamePlus";
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

interface ActiveAttackTelegraph {
  kind: DanneAttackTelegraphKind;
  label: string;
  phase: DanneAttackPhase;
  startedAt: number;
  resolvesAt: number;
  source: Position;
  target: Position;
  destination: Position | null;
  cooldownMs: number;
  markers: Phaser.GameObjects.Rectangle[];
}

interface DanneBossOptions {
  player: Player;
  secretAscendant: boolean;
  quickFight: boolean;
  onDefeated: (trueEnding: boolean) => void;
  onBadEnding: () => void;
  onPhaseChange: (phase: DanneBossPhase) => void;
  onPlayerHit?: (heavy: boolean) => void;
}

const EGO_BOLT = DANNE_VFX_ASSETS[0];
const BOSS_CENTER = { x: 128, y: 118 } as const;
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
  private readonly difficulty: DanneDifficultyProfile;
  private readonly onDefeated: (trueEnding: boolean) => void;
  private readonly onBadEnding: () => void;
  private readonly onPhaseChange: (phase: DanneBossPhase) => void;
  private readonly onPlayerHit?: (heavy: boolean) => void;
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
  private attackTelegraph: ActiveAttackTelegraph | null = null;
  private cloudWaypointIndex = 0;
  private combatPausedAt: number | null = null;
  private phaseTransitioning = false;
  private defeated = false;
  private boastIndex = 0;
  private readonly recordedPhaseDefeats = new Set<DanneBossPhase>();
  private readonly announcedTelegraphs = new Set<DanneBossPhase>();

  constructor(scene: Phaser.Scene, options: DanneBossOptions) {
    this.scene = scene;
    this.player = options.player;
    this.secretAscendant = options.secretAscendant;
    this.quickFight = options.quickFight;
    this.difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    this.maxHp = Math.round((options.quickFight ? 48 : 180) * this.difficulty.hpMultiplier);
    this.phaseCount = this.secretAscendant ? 4 : 3;
    this.onDefeated = options.onDefeated;
    this.onBadEnding = options.onBadEnding;
    this.onPhaseChange = options.onPhaseChange;
    this.onPlayerHit = options.onPlayerHit;
    this.shadow = scene.add.ellipse(BOSS_CENTER.x, BOSS_CENTER.y + 12, 34, 9, color(PALETTE.black), 0.7)
      .setDepth(BOSS_CENTER.y - 5);
    this.sprite = scene.add.sprite(BOSS_CENTER.x, BOSS_CENTER.y, this.spriteKey)
      .setOrigin(0.5, 0.82)
      .setScale(1.15)
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
    this.syncDepths();
    if (this.phase === "intro" || this.phaseTransitioning) return;
    if (!canAct) {
      if (this.combatPausedAt === null) this.combatPausedAt = timeMs;
      return;
    }
    this.resumeCombatTimers(timeMs);
    this.updateBolts(timeMs, deltaMs);
    this.updateMinis(timeMs, deltaMs);
    this.updateStatutoryClock(deltaMs);
    this.checkPlayerActionHit(timeMs);
    this.updateAttackPattern(timeMs);
  }

  readout() {
    const cleared = this.defeated || this.phase === "defeated";
    const telegraph = this.attackTelegraph
      ? {
          kind: this.attackTelegraph.kind,
          label: this.attackTelegraph.label,
          msRemaining: danneTelegraphRemainingMs(this.attackTelegraph.resolvesAt, this.scene.time.now),
          target: { ...this.attackTelegraph.target },
          destination: this.attackTelegraph.destination ? { ...this.attackTelegraph.destination } : null
        }
      : null;
    return {
      label: `DANN-E ${this.phase.toUpperCase()}`,
      x: this.position.x,
      y: this.position.y,
      spriteKey: this.spriteKey,
      behavior: this.behaviorLabel(),
      defeatMethod: "Use the Red Pencil after completing pendants, equities, proofing, and the Buckram Key route.",
      status: `${this.hp}/${this.maxHp} HP; ${this.difficulty.label} tier; ${this.clockReadout()}; ${telegraph ? `${telegraph.label} ${telegraph.msRemaining}ms` : `${this.bolts.length} ego bolts`}; ${this.minis.length} mini-DANN-Es`,
      hp: cleared ? 0 : this.hp,
      maxHp: this.maxHp,
      damage: 12,
      difficultyTier: this.difficulty.tier === "veteran" ? 6 : 5,
      reliabilityRisk: "critical",
      enemyState: cleared ? "defeated" : this.phase,
      weakness: "red_pencil",
      telegraph,
      roomClear: {
        roomId: "DV1",
        defeated: cleared ? 1 : 0,
        required: 1,
        cleared
      }
    };
  }

  destroy() {
    this.clearAttackTelegraph();
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
    this.clearAttackTelegraph();
    this.clearBolts();
    this.combatPausedAt = null;
    this.phase = phase;
    unlockCodexEntry(this.variantKeyForPhase(phase));
    this.hp = this.maxHp;
    this.nextBoltAt = this.scene.time.now + this.cooldown(650);
    this.nextTeleportAt = phase === "cloud" ? this.scene.time.now : this.scene.time.now + this.cooldown(900);
    this.onPhaseChange(phase);
    this.sprite.setVisible(true);
    this.clockContainer.setVisible(true);
    this.applyPhaseTint();
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
    retroAudio.bossDefeat();
    hideBossHud();
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
    this.clockContainer.setVisible(false);
    this.clearAttackTelegraph();
    this.clearBolts();
    this.clearMinis();
    gameState.sceneProgress.blackVaultBossCleared = 1;
    gameState.sceneProgress.blackVaultWestOpen = 1;
    gameState.sceneProgress.blackVaultNorthOpen = 1;
    defeatDungeonBoss("buckram_gate", "DANN-E final review hurdle defeated");
    unlockCodexEntry("danne-defeated");
    this.recordPhaseDefeat("defeated");
    addDanneItem("treaty-fragments", 2);
    const completeTreatyRecord = getTreatyFragmentCount() >= 3;
    gameState.sceneProgress.blackVaultTreatyRecordComplete = completeTreatyRecord ? 1 : 0;
    await this.showPhaseCutscene("danne-defeated", "defeated", "danne-portrait-archivist");
    this.onDefeated(completeTreatyRecord);
  }

  private updateAttackPattern(timeMs: number) {
    if (this.attackTelegraph) {
      this.updateAttackTelegraph(timeMs);
      return;
    }
    if (timeMs < this.nextBoltAt || !this.isAttackPhase(this.phase)) return;
    this.startAttackTelegraph(timeMs, this.phase);
  }

  private isAttackPhase(phase: DanneBossPhase): phase is DanneAttackPhase {
    return phase === "colossus" || phase === "swarm" || phase === "cloud" || phase === "ascendant";
  }

  private startAttackTelegraph(timeMs: number, phase: DanneAttackPhase) {
    const cloudWillShift = phase === "cloud" && timeMs >= this.nextTeleportAt;
    const spec = danneAttackTelegraphSpec(phase, cloudWillShift);
    const destination = cloudWillShift
      ? DANNE_CLOUD_WAYPOINTS[this.cloudWaypointIndex++ % DANNE_CLOUD_WAYPOINTS.length]
      : null;
    const source = destination ?? this.position;
    const target = this.player.position;
    this.attackTelegraph = {
      kind: spec.kind,
      label: spec.label,
      phase,
      startedAt: timeMs,
      resolvesAt: timeMs + spec.durationMs,
      source: { ...source },
      target: { ...target },
      destination: destination ? { ...destination } : null,
      cooldownMs: spec.cooldownMs,
      markers: this.createAttackTelegraphMarkers(source, target, destination)
    };
    this.sprite.setTint(color(PALETTE.classNetRed));
    if (!this.announcedTelegraphs.has(phase)) {
      this.announcedTelegraphs.add(phase);
      setLatestMessage(destination
        ? "DANN-E marks a Cloud Shift destination. Leave the red target before the spread fires."
        : "DANN-E locks an ego-bolt line. Leave the red target, then counterattack.");
    }
    retroAudio.blip();
  }

  private updateAttackTelegraph(timeMs: number) {
    const telegraph = this.attackTelegraph;
    if (!telegraph) return;
    const pulseOn = danneTelegraphPulseOn(telegraph.startedAt, timeMs);
    for (const marker of telegraph.markers) marker.setAlpha(pulseOn ? 0.95 : 0.34);
    this.sprite.setAlpha(pulseOn ? 1 : 0.66);
    if (timeMs < telegraph.resolvesAt) return;

    this.clearAttackTelegraph();
    if (this.phase !== telegraph.phase || this.phaseTransitioning || this.defeated) return;
    if (telegraph.phase === "colossus") {
      this.fireBolt(telegraph.source, telegraph.target, this.speed(58));
    } else if (telegraph.phase === "swarm") {
      this.fireBolt(telegraph.source, telegraph.target, this.speed(62));
      for (const mini of this.minis.slice(0, 2)) {
        this.fireBolt({ x: mini.sprite.x, y: mini.sprite.y }, telegraph.target, this.speed(50));
      }
    } else if (telegraph.phase === "cloud") {
      if (telegraph.destination) {
        this.moveBossTo(telegraph.destination.x, telegraph.destination.y);
        this.nextTeleportAt = timeMs + this.cooldown(1800);
      }
      this.fireSpreadToward(this.position, telegraph.target, this.speed(64), [-0.28, 0, 0.28]);
    } else {
      this.fireSpreadToward(this.position, telegraph.target, this.speed(72), [-0.5, -0.18, 0.18, 0.5]);
      for (const corner of DANNE_CLOUD_WAYPOINTS) this.fireBolt(corner, telegraph.target, this.speed(48));
    }
    this.nextBoltAt = timeMs + this.cooldown(telegraph.cooldownMs);
  }

  private createAttackTelegraphMarkers(source: Position, target: Position, destination: Position | null) {
    const markers: Phaser.GameObjects.Rectangle[] = [];
    const add = (x: number, y: number, width: number, height: number, fill: string) => {
      const marker = this.scene.add.rectangle(snapPixel(x), snapPixel(y), width, height, color(fill), 0.95)
        .setDepth(940);
      markers.push(marker);
    };
    const bracket = (position: Position, fill: string, radius: number) => {
      add(position.x - radius, position.y - radius, 6, 2, fill);
      add(position.x - radius, position.y - radius, 2, 6, fill);
      add(position.x + radius, position.y - radius, 6, 2, fill);
      add(position.x + radius, position.y - radius, 2, 6, fill);
      add(position.x - radius, position.y + radius, 6, 2, fill);
      add(position.x - radius, position.y + radius, 2, 6, fill);
      add(position.x + radius, position.y + radius, 6, 2, fill);
      add(position.x + radius, position.y + radius, 2, 6, fill);
    };

    bracket(target, PALETTE.classNetRed, 10);
    if (destination) bracket(destination, PALETTE.terminalCyan, 14);
    for (let step = 1; step <= 6; step += 1) {
      const ratio = step / 7;
      add(
        source.x + (target.x - source.x) * ratio,
        source.y - 10 + (target.y - (source.y - 10)) * ratio,
        2,
        2,
        step % 2 === 0 ? PALETTE.goldStamp : PALETTE.classNetRed
      );
    }
    add(source.x, source.y - 10, 5, 5, PALETTE.buckramHighlight);
    return markers;
  }

  private clearAttackTelegraph() {
    const telegraph = this.attackTelegraph;
    if (telegraph) {
      for (const marker of telegraph.markers) marker.destroy();
    }
    this.attackTelegraph = null;
    this.sprite.setAlpha(1);
    this.applyPhaseTint();
  }

  private applyPhaseTint() {
    this.sprite.clearTint();
    if (this.phase === "cloud") this.sprite.setTint(color(PALETTE.terminalCyan));
    if (this.phase === "ascendant") this.sprite.setTint(color(PALETTE.buckramHighlight));
  }

  private resumeCombatTimers(timeMs: number) {
    if (this.combatPausedAt === null) return;
    const pausedMs = Math.max(0, timeMs - this.combatPausedAt);
    this.combatPausedAt = null;
    this.nextBoltAt += pausedMs;
    this.nextTeleportAt += pausedMs;
    this.nextPlayerHitAt += pausedMs;
    if (this.attackTelegraph) {
      this.attackTelegraph.startedAt += pausedMs;
      this.attackTelegraph.resolvesAt += pausedMs;
    }
    for (const bolt of this.bolts) bolt.expiresAt += pausedMs;
  }

  private checkPlayerActionHit(timeMs: number) {
    const hitbox = this.player.activeActionHitbox;
    if (!hitbox || timeMs < this.nextPlayerHitAt) return;
    if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, this.bossBody())) return;
    this.nextPlayerHitAt = timeMs + 260;
    const hasRubyPen = gameState.equippedDanneItem === "ruby-pen" && hasDanneItem("ruby-pen");
    const hasRedPencil = gameState.equippedProcessItem === "red_pencil";
    if (!hasRubyPen && !hasRedPencil) {
      this.player.pushAwayFrom(this.position, 8);
      setLatestMessage("DANN-E resists that tool. Equip the Red Pencil for accountable edits.");
      retroAudio.warning();
      return;
    }
    const baseDamage = hasRubyPen ? 35 : 28;
    const damage = this.phase === "cloud" ? Math.ceil(baseDamage / 2) : baseDamage;
    this.hp = Math.max(0, this.hp - damage);
    setBossHp(this.hp, this.phaseIndex());
    applyHitShake(this.scene, "boss-hit");
    retroAudio.bossHit();
    this.onPlayerHit?.(hasRubyPen);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.35,
      duration: 45,
      yoyo: true,
      repeat: 2,
      ease: "Stepped"
    });
    setLatestMessage(`${hasRubyPen ? "Ruby Pen" : "Red Pencil"} review hit DANN-E for ${damage}.`);
    this.resolvePhaseHp();
  }

  private resolvePhaseHp() {
    if (this.hp > 0 || this.phaseTransitioning) return;
    if (this.phase === "colossus") {
      this.recordPhaseDefeat("colossus");
      void this.transitionToPhase("swarm");
      return;
    }
    if (this.phase === "swarm") {
      this.recordPhaseDefeat("swarm");
      this.clearMinis();
      void this.transitionToPhase("cloud");
      return;
    }
    if (this.phase === "cloud") {
      this.recordPhaseDefeat("cloud");
      if (this.secretAscendant) {
        void this.transitionToPhase("ascendant");
        return;
      }
      this.resolveLegitimatePublicationOrHold();
      return;
    }
    if (this.phase === "ascendant") {
      this.recordPhaseDefeat("ascendant");
      this.resolveLegitimatePublicationOrHold();
    }
  }

  private recordPhaseDefeat(phase: Exclude<DanneBossPhase, "intro">) {
    if (this.recordedPhaseDefeats.has(phase)) return;
    this.recordedPhaseDefeats.add(phase);
    recordDanneVariantDefeated(phase);
  }

  private resolveLegitimatePublicationOrHold() {
    const readiness = getBlackVaultClimaxReadiness();
    if (!readiness.ready) {
      this.hp = 1;
      setBossHp(this.hp, this.phaseIndex());
      this.sprite.setTint(color(PALETTE.classNetRed));
      const missing = this.readinessMissingSummary(readiness);
      setLatestMessage(`DANN-E cannot be defeated until the review packet is complete: ${missing}.`);
      setObjective(`Complete the Black Vault packet: ${missing}.`);
      if (!this.shortcutOffered) this.offerShortcut("DANN-E offers to omit contested material instead.");
      return;
    }
    void this.finishFight();
  }

  private updateStatutoryClock(deltaMs: number) {
    const readiness = this.combatClockReadiness();
    this.statutoryYear = advanceStatutoryClock(
      this.statutoryYear,
      deltaMs,
      this.cooldown(this.quickFight ? STATUTORY_QUICK_BOSS_MS_PER_YEAR : STATUTORY_BOSS_MS_PER_YEAR),
      readiness
    );
    this.syncStatutoryClockUi();
    gameState.sceneProgress.statutoryClockTenths = Math.round(this.statutoryYear * 10);
    if (this.statutoryYear >= STATUTORY_DEADLINE_YEARS && !this.defeated && !this.deadlineDamageApplied) {
      this.deadlineDamageApplied = true;
      gameState.sceneProgress.statutoryDeadlineMissed = 1;
      const violation = applyStandardsViolation("missed_30_year_deadline", "Statutory Clock expired before the Buckram Gate opened.");
      setObjective("DANN-E is pressuring an unlawful shortcut. Reject concealed omissions.");
      setLatestMessage(`${violation.label} DANN-E is pressuring an omission shortcut.`);
      this.offerShortcut("The 30-year clock expired before the Buckram Gate opened.");
    }
  }

  private syncStatutoryClockUi() {
    const clockReadiness = this.combatClockReadiness();
    const climax = getBlackVaultClimaxReadiness();
    const readout = getStatutoryClockReadout({
      elapsedYears: this.statutoryYear,
      readiness: clockReadiness,
      deadlineDamageApplied: this.deadlineDamageApplied
    });
    this.statutoryYear = readout.elapsedYears;
    const ratio = Phaser.Math.Clamp(readout.progressRatio, 0, 1);
    this.clockFill.setSize(Math.max(1, Math.round(214 * ratio)), 5);
    const urgent = readout.status === "at_risk" || readout.status === "deadline_missed";
    this.clockFill.setFillStyle(color(this.defeated ? PALETTE.openNetGreen : urgent ? PALETTE.classNetRed : PALETTE.goldStamp), 0.92);
    this.clockText.setText(`STATUTORY CLOCK ${readout.elapsedYears.toFixed(1)} / ${readout.deadlineYears} YEARS`);
    this.clockStatusText
      .setText(this.defeated
        ? "DANN-E CLEARED"
        : climax.ready
          ? "RECORD READY"
          : `${climax.missingSummary.length} CHECKS OPEN`)
      .setColor(this.defeated ? PALETTE.openNetGreen : urgent ? PALETTE.classNetRed : PALETTE.goldStamp);
  }

  private offerShortcut(reason: string) {
    if (this.shortcutResolved || this.shortcutChoice.active) return;
    this.shortcutOffered = true;
    this.clearAttackTelegraph();
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
        recordUnresolvedEquity("DANN-E shortcut accepted: contested material omitted at the deadline");
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
      resolveStandardsViolationsByType("missed_30_year_deadline");
      this.hp = Math.max(1, this.hp);
      setBossHp(this.hp, this.phaseIndex());
      setObjective("Reject the shortcut. Defeat DANN-E, then route the cleared record to the bindery.");
      setLatestMessage("Shortcut rejected. DANN-E remains vulnerable to the complete human-reviewed record.");
      retroAudio.warning();
    });
  }

  private readinessMissingSummary(readiness = getBlackVaultClimaxReadiness()) {
    return readiness.missingSummary.length ? readiness.missingSummary.join(", ") : "final certification";
  }

  private clockReadout() {
    return getStatutoryClockReadout({
      elapsedYears: this.statutoryYear,
      readiness: this.combatClockReadiness(),
      deadlineDamageApplied: this.deadlineDamageApplied
    }).label;
  }

  private combatClockReadiness() {
    return {
      buckramGateOpen: this.defeated,
      completionRatio: 0.18,
      missingSummary: this.defeated ? [] : ["DANN-E final review"]
    };
  }

  private bossBody() {
    const x = Math.round(this.sprite.x);
    const y = Math.round(this.sprite.y);
    return new Phaser.Geom.Rectangle(x - 19, y - 42, 38, 48);
  }

  private fireSpreadToward(from: Position, target: Position, speed: number, angleOffsets: readonly number[]) {
    const baseAngle = Phaser.Math.Angle.Between(from.x, from.y, target.x, target.y);
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

  private speed(base: number) {
    return base * this.difficulty.speedMultiplier;
  }

  private cooldown(baseMs: number) {
    return Math.max(180, Math.round(baseMs * this.difficulty.cooldownMultiplier));
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
        .setScale(0.52)
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
    if (this.phase === "colossus") return "telegraphed ego-bolt cannon";
    if (this.phase === "swarm") return "telegraphed mini-DANN-E convergence";
    if (this.phase === "cloud") return "marked Cloud Shift with snapshot spread";
    if (this.phase === "ascendant") return "telegraphed four-source barrage";
    return "defeated";
  }
}
