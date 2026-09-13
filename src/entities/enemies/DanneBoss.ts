import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../../game/constants";
import { DANNE_BOSS_PORTRAIT_ASSET, DANNE_BOSS_SPRITE_ASSET, DANNE_VFX_ASSETS } from "../../game/danneAtlas";
import {
  danneAttackTelegraphSpec,
  danneTelegraphPulseOn,
  danneTelegraphRemainingMs,
  type DanneAttackPhase,
  type DanneAttackTelegraphKind
} from "../../game/danneBossTelegraph";
import { danneBoastForPhase, danneBoastHoldMs, type DanneBoastPhase } from "../../game/danneBoasts";
import { getSecondaryActionBadge, isTouchInputCapable, swallowNextInputFrame } from "../../input/InputState";
import {
  advanceBossBolt,
  aimReturnedBossBolt,
  bossSpreadTargets,
  createBossBoltMotion,
  DANNE_CLOUD_SPREAD,
  DANNE_BOSS_DAMAGE,
  DANNE_BOSS_ENTRY_GRACE_MS,
  DANNE_BOSS_RECOVERY_MS,
  DANNE_BOSS_RETURN,
  type BossBoltMotion,
  type DanneBossHitKind
} from "../../game/danneBossCombat";
import { DANNE_CLOUD_WAYPOINTS } from "../../game/danneSceneCollisions";
import { cloudWarningGeometry } from "../../game/cloudWarning";
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
  hasProcessItem,
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
import { recoverDanneBossPressure, takeDanneBossHit } from "../../systems/dannePressure";
import { ChoicePrompt } from "../../systems/verification";
import { isWeaponTool } from "../../systems/weaponState";
import { Player } from "../Player";
import { readDanneBossCheckpoint, writeDanneBossCheckpoint } from "../../game/danneBossCheckpoint";

export type DanneBossPhase = "intro" | "colossus" | "swarm" | "cloud" | "ascendant" | "defeated";

interface EgoBolt extends BossBoltMotion {
  sprite: Phaser.GameObjects.Sprite;
  expiresAt: number;
  returned: boolean;
}

interface MiniDanne {
  sprite: Phaser.GameObjects.Sprite;
  id: number;
  angle: number;
  radius: number;
  speed: number;
  lastActionId: number;
  stunnedUntil: number;
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
  markers: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Graphics>;
}

interface DanneBossOptions {
  player: Player;
  secretAscendant: boolean;
  quickFight: boolean;
  onDefeated: (trueEnding: boolean) => void;
  onBadEnding: () => void;
  onRetreat: () => void;
  onPhaseChange: (phase: DanneBossPhase) => void;
  onPlayerHit?: (heavy: boolean) => void;
}

const EGO_BOLT = DANNE_VFX_ASSETS[0];
const BOSS_CENTER = { x: 128, y: 118 } as const;
function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
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
  private readonly onRetreat: () => void;
  private readonly onPhaseChange: (phase: DanneBossPhase) => void;
  private readonly onPlayerHit?: (heavy: boolean) => void;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly coreOpening: Phaser.GameObjects.Rectangle;
  private readonly clockContainer: Phaser.GameObjects.Container;
  private readonly clockFill: Phaser.GameObjects.Rectangle;
  private readonly clockText: Phaser.GameObjects.Text;
  private readonly clockStatusText: Phaser.GameObjects.Text;
  private readonly shortcutChoice: ChoicePrompt;
  private readonly retryChoice: ChoicePrompt;
  private combatFeedback: { text: string; tone: "info" | "warn"; msRemaining: number } | null = null;
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
  private lastPlayerActionId = -1;
  private damageGraceUntil = 0;
  private counterStunnedUntil = 0;
  private boltsReturned = 0;
  private nextMiniId = 0;
  private minisDispersed = 0;
  private attackTelegraph: ActiveAttackTelegraph | null = null;
  private cloudWaypointIndex = 0;
  private combatPausedAt: number | null = null;
  private phaseTransitioning = false;
  private defeated = false;
  private disposed = false;
  private boastIndex = 0;
  private boastVisible = false;
  private boastReadyAt = 0;
  private finishBoast?: () => void;
  private readonly recordedPhaseDefeats = new Set<DanneBossPhase>();
  private readonly announcedTelegraphs = new Set<DanneBossPhase>();
  private readonly resumeCheckpoint: ReturnType<typeof readDanneBossCheckpoint>;

  constructor(scene: Phaser.Scene, options: DanneBossOptions) {
    this.scene = scene;
    this.deadlineDamageApplied = Boolean(gameState.sceneProgress.statutoryDeadlineMissed);
    const storedTenths = gameState.sceneProgress.statutoryClockTenths;
    this.statutoryYear = this.deadlineDamageApplied ? STATUTORY_DEADLINE_YEARS
      : Number.isFinite(storedTenths)
        ? Phaser.Math.Clamp(storedTenths / 10, STATUTORY_START_YEAR, STATUTORY_DEADLINE_YEARS)
        : STATUTORY_START_YEAR;
    this.player = options.player;
    this.secretAscendant = options.secretAscendant;
    this.quickFight = options.quickFight;
    this.difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    this.maxHp = Math.round((options.quickFight ? 48 : 180) * this.difficulty.hpMultiplier);
    this.resumeCheckpoint = options.quickFight ? null
      : readDanneBossCheckpoint(gameState.sceneProgress, this.maxHp, this.secretAscendant);
    this.phaseCount = this.secretAscendant ? 4 : 3;
    this.onDefeated = options.onDefeated;
    this.onBadEnding = options.onBadEnding;
    this.onRetreat = options.onRetreat;
    this.onPhaseChange = options.onPhaseChange;
    this.onPlayerHit = options.onPlayerHit;
    this.shadow = scene.add.ellipse(BOSS_CENTER.x, BOSS_CENTER.y + 12, 34, 9, color(PALETTE.black), 0.7)
      .setDepth(BOSS_CENTER.y - 5);
    this.sprite = scene.add.sprite(BOSS_CENTER.x, BOSS_CENTER.y, this.spriteKey)
      .setOrigin(0.5, 0.82)
      .setScale(1.15)
      .setDepth(BOSS_CENTER.y)
      .setVisible(false);
    this.coreOpening = scene.add.rectangle(BOSS_CENTER.x - 12, BOSS_CENTER.y + 12, 24, 2, color(PALETTE.creamPaper))
      .setOrigin(0, 0.5).setVisible(false);
    const animKey = danneAnimKey(this.spriteKey, "walk-down");
    if (scene.anims.exists(animKey)) this.sprite.play(animKey);
    this.shortcutChoice = new ChoicePrompt(scene);
    this.retryChoice = new ChoicePrompt(scene, { settleMs: 300 });
    const clockBg = scene.add.rectangle(128, 46, 238, 14, color(PALETTE.black), 0.98)
      .setScrollFactor(0);
    this.clockFill = scene.add.rectangle(12, 51, 1, 2, color(PALETTE.goldStamp), 0.9)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.clockText = scene.add.text(12, 41, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setScrollFactor(0);
    this.clockStatusText = scene.add.text(244, 41, "", {
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
    return !this.defeated && !this.disposed;
  }

  get currentPhase() {
    return this.phase;
  }

  get activeMiniCount() { return this.minis.length; }
  get phaseDialogueActive() { return this.boastVisible; }

  get combatObjective() {
    const now = this.combatPausedAt ?? this.scene.time.now;
    if (this.coreOpenAt(now)) return "PENCIL THE CORE";
    if (this.attackTelegraph?.kind === "cloud_shift") return "DODGE LANES";
    if (this.phase === "swarm" && this.activeMiniCount) return "PENCIL MINIS";
    return "RETURN THE BOLT";
  }

  advanceBoast() {
    if (!this.finishBoast || this.scene.time.now < this.boastReadyAt) return false;
    this.finishBoast();
    swallowNextInputFrame();
    return true;
  }

  explainCounter() {
    const button = getSecondaryActionBadge();
    const open = this.coreOpenAt(this.combatPausedAt ?? this.scene.time.now);
    this.combatFeedback = {
      text: open ? `${button}: PENCIL THE CORE` : `FACE BOLT + ${button} SWING`,
      tone: "info",
      msRemaining: 1800
    };
    setLatestMessage(open
      ? `Move within reach and press ${button} for a fresh Red Pencil strike before the core closes.`
      : `Face an incoming Ego bolt and press ${button} to swing. Its return opens DANN-E's core for the Red Pencil.`);
  }

  get inputLocked() {
    return this.shortcutChoice.active || this.retryChoice.active;
  }

  get position(): Position {
    return { x: Math.round(this.sprite.x), y: Math.round(this.sprite.y) };
  }

  start() {
    void this.runIntro();
  }

  update(timeMs: number, deltaMs: number, canAct: boolean) {
    if (!this.isActive) return;
    if (this.retryChoice.active) {
      if (this.combatPausedAt === null) this.combatPausedAt = timeMs;
      this.retryChoice.updateInput();
      return;
    }
    if (this.shortcutChoice.active) {
      if (this.combatPausedAt === null) this.combatPausedAt = timeMs;
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
    if (this.combatFeedback) {
      this.combatFeedback.msRemaining = Math.max(0, this.combatFeedback.msRemaining - deltaMs);
      if (this.combatFeedback.msRemaining === 0) this.combatFeedback = null;
    }
    this.updateBolts(timeMs, deltaMs);
    if (this.inputLocked || this.phaseTransitioning || this.defeated) return;
    this.updateMinis(timeMs, deltaMs);
    if (this.retryChoice.active) return;
    this.updateStatutoryClock(deltaMs);
    if (this.inputLocked) return;
    this.checkPlayerActionHit(timeMs);
    this.updateAttackPattern(timeMs);
    this.syncCoreOpening(timeMs);
  }

  readout() {
    const cleared = this.defeated || this.phase === "defeated";
    const telegraph = this.attackTelegraph
      ? {
          kind: this.attackTelegraph.kind,
          label: this.attackTelegraph.label,
          msRemaining: danneTelegraphRemainingMs(this.attackTelegraph.resolvesAt, this.combatPausedAt ?? this.scene.time.now),
          target: { ...this.attackTelegraph.target },
          lanes: this.attackTelegraph.phase === "cloud"
            ? bossSpreadTargets(this.attackTelegraph.source, this.attackTelegraph.target, DANNE_CLOUD_SPREAD)
            : [{ ...this.attackTelegraph.target }],
          destination: this.attackTelegraph.destination ? { ...this.attackTelegraph.destination } : null
        }
      : null;
    return {
      label: `DANN-E ${this.phase.toUpperCase()}`,
      x: this.position.x,
      y: this.position.y,
      spriteKey: this.spriteKey,
      behavior: this.behaviorLabel(),
      defeatMethod: "The core is armored. Return an Ego bolt with an active tool swing, then make a fresh Red Pencil strike before the opening closes. A complete human-reviewed record is still required.",
      status: `${this.hp}/${this.maxHp} HP; ${this.difficulty.label} tier; ${this.clockReadout()}; ${telegraph ? `${telegraph.label} ${telegraph.msRemaining}ms` : `${this.bolts.length} ego bolts`}; ${this.minis.length} mini-DANN-Es`,
      hp: cleared ? 0 : this.hp,
      maxHp: this.maxHp,
      damage: DANNE_BOSS_DAMAGE.ego_bolt,
      difficultyTier: this.difficulty.tier === "veteran" ? 6 : 5,
      reliabilityRisk: "critical",
      enemyState: cleared ? "defeated" : this.phase,
      weakness: "red_pencil",
      bossCombat: {
        bolts: this.bolts.map((bolt) => ({ x: snapPixel(bolt.x), y: snapPixel(bolt.y), returned: bolt.returned })),
        boltsReturned: this.boltsReturned,
        coreOpen: this.coreOpenAt(this.combatPausedAt ?? this.scene.time.now),
        counterWindowMs: Math.max(0, this.counterStunnedUntil - (this.combatPausedAt ?? this.scene.time.now)),
        feedback: this.combatFeedback ? { ...this.combatFeedback } : null,
        minis: this.minis.map((mini) => ({ id: mini.id, x: mini.sprite.x, y: mini.sprite.y,
          weakness: "red_pencil", stunnedMs: Math.max(0, mini.stunnedUntil - (this.combatPausedAt ?? this.scene.time.now)) })),
        minisDispersed: this.minisDispersed,
        retryAvailable: this.retryChoice.active,
        recoverablePressure: gameState.sceneProgress.blackVaultCombatDamage ?? 0,
        swarmDamage: DANNE_BOSS_DAMAGE.swarm
      },
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
    if (this.disposed) return;
    this.disposed = true;
    this.finishBoast?.();
    this.clearAttackTelegraph();
    this.combatFeedback = null;
    this.sprite.destroy();
    this.shadow.destroy();
    this.coreOpening.destroy();
    this.clockContainer.destroy();
    this.clearBolts();
    this.clearMinis();
    hideBossHud();
  }

  private async runIntro() {
    this.phaseTransitioning = true;
    if (this.resumeCheckpoint) {
      const { phase, hp } = this.resumeCheckpoint;
      this.beginPhase(phase, hp);
      await this.showPhaseCutscene(this.variantKeyForPhase(phase), phase,
        DANNE_BOSS_PORTRAIT_ASSET.key, "Review resumed. Your counter progress is kept.");
      if (!this.isActive) return;
      this.resetAttackTimers();
      this.phaseTransitioning = false;
      return;
    }
    unlockCodexEntry("danne-prime-humanoid");
    await this.showPhaseCutscene("danne-prime-humanoid", "intro");
    if (!this.isActive) return;
    this.beginPhase("colossus");
    await this.showPhaseCutscene("danne-colossus-final-form", "colossus");
    if (!this.isActive) return;
    this.resetAttackTimers();
    this.phaseTransitioning = false;
  }

  private beginPhase(phase: Exclude<DanneBossPhase, "intro" | "defeated">, remainingHp = this.maxHp) {
    this.clearAttackTelegraph();
    this.clearBolts();
    this.combatPausedAt = null;
    this.phase = phase;
    unlockCodexEntry(this.variantKeyForPhase(phase));
    this.hp = Math.max(1, Math.min(this.maxHp, remainingHp));
    this.resetAttackTimers();
    this.onPhaseChange(phase);
    writeDanneBossCheckpoint(gameState.sceneProgress, phase, this.hp);
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
    if (!this.isActive) return;
    this.resetAttackTimers();
    this.phaseTransitioning = false;
  }

  private resetAttackTimers() {
    // New phase timers start now; do not add the preceding cutscene/retry wait again.
    this.combatPausedAt = null;
    this.nextBoltAt = this.scene.time.now + DANNE_BOSS_ENTRY_GRACE_MS;
    this.nextTeleportAt = this.scene.time.now;
    this.damageGraceUntil = this.scene.time.now + DANNE_BOSS_ENTRY_GRACE_MS;
    this.counterStunnedUntil = 0;
    this.coreOpening.setVisible(false);
    this.combatFeedback = null;
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
    this.coreOpening.setVisible(false);
    this.clockContainer.setVisible(false);
    this.clearAttackTelegraph();
    this.clearBolts();
    this.clearMinis();
    recoverDanneBossPressure();
    gameState.sceneProgress.blackVaultBossCleared = 1;
    gameState.sceneProgress.blackVaultWestOpen = 1;
    gameState.sceneProgress.blackVaultNorthOpen = 1;
    defeatDungeonBoss("buckram_gate", "DANN-E final review hurdle defeated");
    unlockCodexEntry("danne-defeated");
    addDanneItem("treaty-fragments", 2);
    const completeTreatyRecord = getTreatyFragmentCount() >= 3;
    gameState.sceneProgress.blackVaultTreatyRecordComplete = completeTreatyRecord ? 1 : 0;
    await this.showPhaseCutscene("danne-defeated", "defeated");
    if (this.disposed) return;
    this.onDefeated(completeTreatyRecord);
  }

  private updateAttackPattern(timeMs: number) {
    if (timeMs < this.counterStunnedUntil) return;
    if (this.counterStunnedUntil) {
      this.counterStunnedUntil = 0;
      this.applyPhaseTint();
    }
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
      markers: this.createAttackTelegraphMarkers(source, target, destination, phase)
    };
    this.sprite.setTint(color(PALETTE.classNetRed));
    if (!this.announcedTelegraphs.has(phase)) {
      this.announcedTelegraphs.add(phase);
      setLatestMessage(destination
        ? "Cyan corners mark DANN-E's next perch. Three bright arrows show where the Ego spread will fly."
        : "Dodge the red target, or face the Ego bolt and swing your tool to return it.");
    }
    retroAudio.blip();
  }

  private updateAttackTelegraph(timeMs: number) {
    const telegraph = this.attackTelegraph;
    if (!telegraph) return;
    const pulseOn = danneTelegraphPulseOn(telegraph.startedAt, timeMs);
    for (const marker of telegraph.markers) marker.setAlpha(telegraph.phase === "cloud" ? pulseOn ? 1 : 0.85 : pulseOn ? 0.95 : 0.34);
    this.sprite.setAlpha(pulseOn ? 1 : 0.66);
    if (timeMs < telegraph.resolvesAt) return;

    this.clearAttackTelegraph();
    if (this.phase !== telegraph.phase || this.phaseTransitioning || this.defeated) return;
    if (telegraph.phase === "colossus") {
      this.fireBolt(telegraph.source, telegraph.target, this.speed(58));
    } else if (telegraph.phase === "swarm") {
      this.fireBolt(telegraph.source, telegraph.target, this.speed(62));
      for (const mini of this.minis.filter(mini => timeMs >= mini.stunnedUntil).slice(0, 2)) {
        this.fireBolt({ x: mini.sprite.x, y: mini.sprite.y }, telegraph.target, this.speed(50));
      }
    } else if (telegraph.phase === "cloud") {
      if (telegraph.destination) {
        this.moveBossTo(telegraph.destination.x, telegraph.destination.y);
        // Leave one stationary counterattack window between Cloud Shifts.
        this.nextTeleportAt = timeMs + this.cooldown(telegraph.cooldownMs + 1800);
      }
      this.fireSpreadToward(this.position, telegraph.target, this.speed(64), DANNE_CLOUD_SPREAD);
    } else {
      this.fireSpreadToward(this.position, telegraph.target, this.speed(72), [-0.5, -0.18, 0.18, 0.5]);
      for (const corner of DANNE_CLOUD_WAYPOINTS) this.fireBolt(corner, telegraph.target, this.speed(48));
    }
    this.nextBoltAt = timeMs + this.cooldown(telegraph.cooldownMs);
  }

  private createAttackTelegraphMarkers(source: Position, target: Position, destination: Position | null, phase: DanneAttackPhase) {
    const markers: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Graphics> = [];
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
    if (phase === "cloud") {
      const graphic = this.scene.add.graphics().setDepth(939);
      const lanes = cloudWarningGeometry(source, target);
      graphic.fillStyle(color(PALETTE.black), 1);
      for (const lane of lanes) for (const point of [...lane.path, ...lane.arrow]) graphic.fillRect(point.x - 1, point.y - 1, 3, 3);
      graphic.fillStyle(color(PALETTE.creamPaper), 1);
      for (const lane of lanes) for (const point of lane.path) graphic.fillRect(point.x, point.y, 1, 1);
      graphic.fillStyle(color(PALETTE.goldStamp), 1);
      for (const lane of lanes) for (const point of lane.arrow) graphic.fillRect(point.x, point.y, 1, 1);
      markers.push(graphic);
      add(source.x, source.y - 10, 5, 5, PALETTE.buckramHighlight);
      return markers;
    }
    const lanes = [target];
    for (const endpoint of lanes) {
      for (let step = 1; step <= 6; step += 1) {
        const ratio = step / 7;
        add(
          source.x + (endpoint.x - source.x) * ratio,
          source.y - 10 + (endpoint.y - (source.y - 10)) * ratio,
          2,
          2,
          step % 2 === 0 ? PALETTE.goldStamp : PALETTE.classNetRed
        );
      }
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
    this.damageGraceUntil += pausedMs;
    if (this.counterStunnedUntil) this.counterStunnedUntil += pausedMs;
    for (const mini of this.minis) if (mini.stunnedUntil) mini.stunnedUntil += pausedMs;
    if (this.attackTelegraph) {
      this.attackTelegraph.startedAt += pausedMs;
      this.attackTelegraph.resolvesAt += pausedMs;
    }
    for (const bolt of this.bolts) bolt.expiresAt += pausedMs;
  }

  private checkPlayerActionHit(timeMs: number) {
    const hitbox = this.player.activeActionHitbox;
    if (!hitbox || timeMs < this.nextPlayerHitAt || this.lastPlayerActionId === this.player.actionId) return;
    if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, this.bossBody())) return;
    this.nextPlayerHitAt = timeMs + 260;
    this.lastPlayerActionId = this.player.actionId;
    if (!this.coreOpenAt(timeMs)) {
      this.player.pushAwayFrom(this.position, 6);
      this.combatFeedback = { text: "ARMORED: RETURN A BOLT", tone: "info", msRemaining: 1100 };
      setLatestMessage("The core is armored. Return an Ego bolt first, then strike the exposed core with the Red Pencil.");
      retroAudio.warning();
      return;
    }
    const hasRubyPen = gameState.equippedDanneItem === "ruby-pen" && hasDanneItem("ruby-pen");
    const hasRedPencil = this.player.combatReadout.weapon.tool === "red_pencil" && hasProcessItem("red_pencil");
    if (!hasRubyPen && !hasRedPencil) {
      this.player.pushAwayFrom(this.position, 8);
      this.combatFeedback = { text: "CORE OPEN: USE PENCIL", tone: "info", msRemaining: Math.max(0, this.counterStunnedUntil - timeMs) };
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
    this.saveCombatCheckpoint();
  }

  private saveCombatCheckpoint() {
    if (this.isAttackPhase(this.phase) && !this.defeated) {
      writeDanneBossCheckpoint(gameState.sceneProgress, this.phase, this.hp);
    }
  }

  private coreOpenAt(timeMs: number) {
    return !this.defeated && !this.phaseTransitioning && !this.inputLocked && this.isAttackPhase(this.phase) && timeMs < this.counterStunnedUntil;
  }

  private syncCoreOpening(timeMs: number) {
    const open = this.coreOpenAt(timeMs);
    this.coreOpening.setVisible(open);
    if (!open) return;
    const remaining = Math.min(1, (this.counterStunnedUntil - timeMs) / DANNE_BOSS_RETURN.stunMs);
    this.coreOpening.setPosition(snapPixel(this.sprite.x - 12), snapPixel(this.sprite.y + 12))
      .setSize(Math.max(1, Math.round(24 * remaining)), 2).setDepth(Math.round(this.sprite.y + 15));
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

  private recordPhaseDefeat(phase: Exclude<DanneBossPhase, "intro" | "defeated">) {
    if (this.recordedPhaseDefeats.has(phase)) return;
    this.recordedPhaseDefeats.add(phase);
    recordDanneVariantDefeated(phase);
  }

  private resolveLegitimatePublicationOrHold() {
    const readiness = getBlackVaultClimaxReadiness();
    if (!readiness.recordReady) {
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
    this.clockFill.setSize(Math.max(1, Math.round(232 * ratio)), 2);
    const urgent = readout.status === "at_risk" || readout.status === "deadline_missed";
    this.clockFill.setFillStyle(color(this.defeated ? PALETTE.openNetGreen : urgent ? PALETTE.classNetRed : PALETTE.goldStamp), 0.92);
    this.clockText.setText(`STATUTORY CLOCK ${readout.elapsedYears.toFixed(1)}/${readout.deadlineYears}`);
    this.clockStatusText
      .setText(this.defeated
        ? "DANN-E CLEARED"
        : climax.recordReady
          ? "RECORD READY"
          : `${climax.recordMissingSummary.length} CHECKS OPEN`)
      .setColor(this.defeated ? PALETTE.openNetGreen : urgent ? PALETTE.classNetRed : PALETTE.goldStamp);
  }

  private offerShortcut(reason: string) {
    if (this.shortcutResolved || this.shortcutChoice.active) return;
    this.shortcutOffered = true;
    this.clearAttackTelegraph();
    this.clearBolts();
    this.combatFeedback = null;
    this.coreOpening.setVisible(false);
    this.clockContainer.setVisible(false);
    hideBossHud();
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
      this.clockContainer.setVisible(true);
      showBossHud(this.scene, "danne", this.maxHp, this.phaseCount);
      setBossHp(this.hp, this.phaseIndex());
      this.onPhaseChange?.(this.phase);
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
    for (const endpoint of bossSpreadTargets(from, target, angleOffsets)) {
      this.fireBolt(from, endpoint, speed);
    }
  }

  private fireBolt(from: Position, target: Position, speed: number) {
    const motion = createBossBoltMotion(from, target, speed);
    const { vx, vy } = motion;
    const bolt = this.scene.add.sprite(snapPixel(motion.x), snapPixel(motion.y), EGO_BOLT.key, Math.abs(vx) > Math.abs(vy) ? 0 : 4)
      .setOrigin(0.5)
      .setScale(0.03)
      .setDepth(Math.round(from.y + 4));
    const animKey = danneAnimKey(EGO_BOLT.key, "fly");
    if (this.scene.anims.exists(animKey)) bolt.play(animKey);
    bolt.setAngle(Math.round(Phaser.Math.RadToDeg(Math.atan2(vy, vx))));
    this.bolts.push({
      sprite: bolt,
      ...motion,
      expiresAt: this.scene.time.now + 2000,
      returned: false
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
    const footBox = new Phaser.Geom.Rectangle(this.player.position.x - 8, this.player.position.y - 4, 16, 9);
    const tool = this.player.combatReadout.weapon.tool;
    const swing = isWeaponTool(tool) && hasProcessItem(tool) ? this.player.activeActionHitbox : null;
    for (let index = this.bolts.length - 1; index >= 0; index -= 1) {
      const bolt = this.bolts[index];
      if (timeMs >= bolt.expiresAt) {
        bolt.sprite.destroy();
        this.bolts.splice(index, 1);
        continue;
      }
      if (bolt.returned) aimReturnedBossBolt(bolt, { x: this.sprite.x, y: this.sprite.y - 12 });
      advanceBossBolt(bolt, deltaMs);
      bolt.sprite.setPosition(snapPixel(bolt.x), snapPixel(bolt.y));
      bolt.sprite.setDepth(Math.round(bolt.sprite.y + 6));
      const boltBox = new Phaser.Geom.Rectangle(bolt.sprite.x - 6, bolt.sprite.y - 6, 12, 12);
      // A parry wins over contact on the same frame, just as in earlier rooms.
      if (!bolt.returned && swing && Phaser.Geom.Intersects.RectangleToRectangle(boltBox, swing)) {
        bolt.returned = true;
        bolt.expiresAt = timeMs + DANNE_BOSS_RETURN.lifetimeMs;
        this.boltsReturned += 1;
        aimReturnedBossBolt(bolt, { x: this.sprite.x, y: this.sprite.y - 12 });
        bolt.sprite.setTintFill(color(PALETTE.terminalCyan));
        bolt.sprite.setAngle(Math.round(Phaser.Math.RadToDeg(Math.atan2(bolt.vy, bolt.vx))));
        setLatestMessage("EGO RETURNED!");
        retroAudio.toolHit(tool);
      }
      if (bolt.returned && Phaser.Geom.Intersects.RectangleToRectangle(boltBox, this.bossBody())) {
        this.takeReturnedBolt(timeMs);
        return;
      }
      if (!bolt.returned && Phaser.Geom.Intersects.RectangleToRectangle(boltBox, footBox)) {
        bolt.sprite.destroy();
        this.bolts.splice(index, 1);
        this.hitPlayer(bolt, "ego_bolt", timeMs);
        if (this.retryChoice.active) return;
      } else if (bolt.x < -20 || bolt.x > GAME_WIDTH + 20 || bolt.y < 20 || bolt.y > GAME_HEIGHT + 20) {
        bolt.sprite.destroy();
        this.bolts.splice(index, 1);
      }
    }
  }

  private takeReturnedBolt(timeMs: number) {
    this.clearBolts();
    this.clearAttackTelegraph();
    this.counterStunnedUntil = timeMs + DANNE_BOSS_RETURN.stunMs;
    // The returning swing opens the core; a new swing earns the follow-up hit.
    this.lastPlayerActionId = this.player.actionId;
    this.nextBoltAt = Math.max(this.nextBoltAt, this.counterStunnedUntil);
    this.nextTeleportAt = Math.max(this.nextTeleportAt, this.counterStunnedUntil);
    this.hp = Math.max(0, this.hp - DANNE_BOSS_RETURN.damage);
    this.sprite.setTint(color(PALETTE.creamPaper));
    setBossHp(this.hp, this.phaseIndex());
    setLatestMessage("Ego refuted. DANN-E is stunned: close in with the Red Pencil!");
    this.combatFeedback = { text: "EGO RETURNED! STRIKE CORE", tone: "info", msRemaining: DANNE_BOSS_RETURN.stunMs };
    retroAudio.bossHit();
    applyHitShake(this.scene, "boss-hit");
    this.onPlayerHit?.(false);
    this.resolvePhaseHp();
    this.saveCombatCheckpoint();
    this.syncCoreOpening(timeMs);
  }

  private spawnMiniDannes() {
    this.clearMinis();
    const starts = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    for (const [index, angle] of starts.entries()) {
      const mini = this.scene.add.sprite(snapPixel(BOSS_CENTER.x + Math.cos(angle) * 42),
        snapPixel(BOSS_CENTER.y + 14 + Math.sin(angle) * 42 * 0.55), this.spriteKey)
        .setOrigin(0.5, 0.82)
        .setScale(0.52)
        .setDepth(BOSS_CENTER.y + index + 1);
      const animKey = danneAnimKey(this.spriteKey, "walk-down");
      if (this.scene.anims.exists(animKey)) mini.play(animKey);
      this.minis.push({ sprite: mini, id: ++this.nextMiniId, angle, radius: 42,
        speed: index % 2 === 0 ? 1 : -1, lastActionId: -1, stunnedUntil: 0 });
    }
  }

  private updateMinis(timeMs: number, deltaMs: number) {
    if (!this.minis.length) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    const tool = this.player.combatReadout.weapon.tool;
    const swing = isWeaponTool(tool) && hasProcessItem(tool) ? this.player.activeActionHitbox : null;
    const pencil = tool === "red_pencil" || (gameState.equippedDanneItem === "ruby-pen" && hasDanneItem("ruby-pen"));
    const feet = new Phaser.Geom.Rectangle(this.player.position.x - 8, this.player.position.y - 4, 16, 9);
    for (let index = this.minis.length - 1; index >= 0; index--) {
      const mini = this.minis[index];
      const stunned = timeMs < Math.max(mini.stunnedUntil, this.counterStunnedUntil);
      if (!stunned) mini.angle += mini.speed * dt * 1.7;
      const x = BOSS_CENTER.x + Math.cos(mini.angle) * mini.radius;
      const y = BOSS_CENTER.y + 14 + Math.sin(mini.angle) * (mini.radius * 0.55);
      mini.sprite.setPosition(snapPixel(x), snapPixel(y));
      mini.sprite.setDepth(Math.round(y));
      const body = new Phaser.Geom.Rectangle(mini.sprite.x - 6, mini.sprite.y - 14, 12, 16);
      // Counter the actual active swing before contact, even during the core opening.
      if (swing && mini.lastActionId !== this.player.actionId && Phaser.Geom.Intersects.RectangleToRectangle(swing, body)) {
        mini.lastActionId = this.player.actionId;
        if (pencil) {
          this.minis.splice(index, 1);
          this.minisDispersed++;
          mini.sprite.setTint(color(PALETTE.creamPaper));
          this.scene.tweens.add({ targets: mini.sprite, alpha: 0, duration: 160, onComplete: () => mini.sprite.destroy() });
          this.combatFeedback = { text: this.minis.length ? "MINI DISPERSED" : "SWARM CLEARED: RETURN BOLTS", tone: "info", msRemaining: 1200 };
          setLatestMessage("Red Pencil disperses a mini-DANN-E. The main core still requires a returned Ego bolt.");
        } else {
          mini.stunnedUntil = timeMs + 650;
          mini.sprite.setTint(color(PALETTE.terminalCyan));
          this.combatFeedback = { text: "MINI STUNNED: USE PENCIL", tone: "info", msRemaining: 1000 };
        }
        retroAudio.toolHit(tool);
        continue;
      }
      if (stunned) continue;
      if (mini.stunnedUntil) { mini.stunnedUntil = 0; mini.sprite.clearTint(); }
      const miniFeet = new Phaser.Geom.Rectangle(mini.sprite.x - 4, mini.sprite.y - 4, 8, 8);
      if (Phaser.Geom.Intersects.RectangleToRectangle(miniFeet, feet)) {
        this.hitPlayer({ x: mini.sprite.x, y: mini.sprite.y }, "swarm", timeMs);
        if (this.retryChoice.active) return;
      }
    }
  }

  private hitPlayer(source: Position, kind: DanneBossHitKind, timeMs: number) {
    if (timeMs < this.damageGraceUntil || !takeDanneBossHit(this.player, source, kind)) return;
    this.damageGraceUntil = timeMs + DANNE_BOSS_RECOVERY_MS;
    this.combatFeedback = { text: kind === "ego_bolt" ? "EGO BOLT: -10 REL" : "SWARM: -5 REL", tone: "warn", msRemaining: 1400 };
    if (gameState.reliability <= 0) this.offerRetry();
  }

  private offerRetry() {
    if (!this.isAttackPhase(this.phase) || this.retryChoice.active) return;
    const phase = this.phase;
    const remainingHp = this.hp;
    this.clearAttackTelegraph();
    this.clearBolts();
    this.clearMinis();
    this.combatFeedback = null;
    this.coreOpening.setVisible(false);
    this.clockContainer.setVisible(false);
    hideBossHud();
    setObjective("REVIEW INTERRUPTED");
    this.retryChoice.show("Review interrupted. Counter progress is kept.", [
      { key: "A", label: "Retry this phase", value: "retry" },
      { key: "B", label: "Leave the arena", value: "leave" }
    ], (option) => {
      recoverDanneBossPressure();
      if (option.value === "leave") {
        this.onRetreat();
        return;
      }
      this.player.setPosition(128, 188);
      this.beginPhase(phase, remainingHp);
      setLatestMessage("Counter progress kept. Dodge the red lock, then counter with the Red Pencil.");
    });
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
    portraitKey = DANNE_BOSS_PORTRAIT_ASSET.key,
    overrideLine?: string
  ) {
    this.boastVisible = true;
    const touch = isTouchInputCapable();
    const still = this.scene.textures.exists(variantKey)
      ? this.scene.add.image(GAME_WIDTH / 2, touch ? 78 : 86, variantKey).setDepth(1620).setScrollFactor(0)
      : null;
    if (still) {
      const source = this.scene.textures.get(variantKey).getSourceImage() as { width?: number; height?: number };
      const scale = Math.min(118 / Math.max(1, source.width ?? 1024), (touch ? 72 : 88) / Math.max(1, source.height ?? 1024));
      still.setScale(scale).setAlpha(0);
    }
    try {
      await enterCutscene(this.scene);
      if (this.disposed) return;
      if (still) this.scene.tweens.add({ targets: still, alpha: 1, duration: 150 });
      retroAudio.danneBoast();
      const line = overrideLine ?? danneBoastForPhase(boastPhase, this.boastIndex);
      this.boastIndex += 1;
      playLine(this.scene, line, portraitKey);
      await new Promise<void>(resolve => {
        let timer: Phaser.Time.TimerEvent | undefined;
        const finish = () => {
          if (this.finishBoast !== finish) return;
          this.finishBoast = undefined;
          timer?.remove(false);
          resolve();
        };
        this.finishBoast = finish;
        this.boastReadyAt = this.scene.time.now + 250;
        timer = this.scene.time.delayedCall(danneBoastHoldMs(line), finish);
      });
      if (this.disposed) return;
      await exitCutscene(this.scene);
      swallowNextInputFrame();
    } finally {
      this.boastVisible = false;
      still?.destroy();
    }
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
