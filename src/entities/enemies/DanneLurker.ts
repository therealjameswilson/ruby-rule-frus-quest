import { DANNE_BOSS_HD, danneBossFormAnimation } from "../../art/danneBossPresentation";
import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../../game/constants";
import { unlockCodexEntry } from "../../game/codex";
import { DANNE_BOSS_SPRITE_ASSET, DANNE_VFX_ASSETS } from "../../game/danneAtlas";
import { danneTelegraphPulseOn } from "../../game/danneBossTelegraph";
import { danneLurkerBoast } from "../../game/danneBoasts";
import {
  DANNE_LURKER_ATTACK_RANGE,
  DANNE_LURKER_BOLT_COOLDOWN_MS,
  DANNE_LURKER_BOLT_SPEED,
  DANNE_LURKER_BOLT_TELEGRAPH_MS,
  DANNE_LURKER_INITIAL_BOLT_DELAY_MS,
  DANNE_LURKER_TOOL_STUN_MS,
  DANNE_LURKER_RETURN_STUN_MS,
  DANNE_LURKER_RETURN_SPEED,
  danneLurkerTelegraphRemainingMs
} from "../../game/danneLurkerBalance";
import { FRUS_DANNE_EGO_BOLT_SLOT_COUNT } from "../../game/lttpFrusTranslation";
import { gameState, setLatestMessage } from "../../game/state";
import type { PlayerCombatReadout, Position } from "../../game/types";
import { getSecondaryActionBadge } from "../../input/InputState";
import { retroAudio } from "../../systems/audio";
import { getDanneDifficultyProfile } from "../../systems/newGamePlus";
import { recoverDanneLurkerPressure } from "../../systems/dannePressure";
import { snapPixel } from "../../systems/pixelPerfect";
import { frameDeltaSeconds } from "../../systems/smoothMovement";
import { isWeaponTool, type WeaponToolId } from "../../systems/weaponState";
import { Enemy } from "./Enemy";
import { combatSpeechPlacement, combatSpeechText, COMBAT_SPEECH_WIDTH } from "../../systems/combatSpeechPlacement";

interface DanneLurkerOptions {
  waypoints: Position[];
  label?: string;
  encounterMode?: "combat" | "foreshadow";
  speechBlocked?: () => boolean;
  boltBlocked?: (x: number, y: number) => boolean;
}

interface EgoBolt {
  sprite: Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expiresAt: number;
  armedAt: number;
  armed: boolean;
  returnedBy: WeaponToolId | null;
}

interface EgoBoltTelegraph {
  startedAt: number;
  resolvesAt: number;
  target: Position;
  markers: Phaser.GameObjects.Rectangle[];
}

const EGO_BOLT = DANNE_VFX_ASSETS[0];
const EGO_BOAST_COOLDOWN_MS = 4200;
const EGO_BOLT_ARM_MS = 260;

function vectorToward(from: Position, to: Position, speed: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return { vx: (dx / length) * speed, vy: (dy / length) * speed };
}

export class DanneLurker extends Enemy {
  private cueColor?: string;
  private nextPressureAt = 0;
  private pressureUntil = 0;
  private nextEgoBoltAt = 0;
  private nextBoastAt = 0;
  private boastUntil = 0;
  private boastIndex = 0;
  private egoBoltTelegraph: EgoBoltTelegraph | null = null;
  private telegraphExplained = false;
  private lastUpdateAt = 0;
  private pausedAt: number | null = null;
  private stunnedUntil = 0;
  private lastCounterSwing = -1;
  private toolCounters = 0;
  private boltsReturned = 0;
  private readonly bolts: EgoBolt[] = [];
  private readonly boastText: Phaser.GameObjects.Text;
  private readonly speechPanel: Phaser.GameObjects.Container;
  private readonly speechBack: Phaser.GameObjects.Rectangle;
  private readonly speechBlocked: () => boolean;
  private readonly boltBlocked: (x: number, y: number) => boolean;
  private readonly speechPlayer = { x: 128, y: 184 };
  private speechHeight = 22;
  private speechEnabled = false;
  private speechDestroyed = false;
  private readonly encounterMode: "combat" | "foreshadow";
  private readonly homePosition: Position;

  constructor(scene: Phaser.Scene, x: number, y: number, options: DanneLurkerOptions) {
    unlockCodexEntry("enemy-danne-boss");
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    const detailed = scene.textures.exists(DANNE_BOSS_HD.key);
    super(scene, x, y, {
      label: options.label ?? "DANN-E",
      spriteKey: detailed ? DANNE_BOSS_HD.key : DANNE_BOSS_SPRITE_ASSET.key,
      fallbackTextureKey: "snes-wall-danne-queue",
      waypoints: options.waypoints,
      tag: { text: "DANN-E", y: 17, color: PALETTE.goldStamp, backgroundColor: PALETTE.black, visible: false },
      cue: { text: "30YR", y: -24, color: PALETTE.classNetRed, backgroundColor: PALETTE.black },
      // HD colossus soles end at atlas rows 185–186: (186 - 192 * .82) * .18 ≈ 5.1.
      shadow: detailed ? { y: 5.1, width: 18, height: 4 } : { y: 13, width: 21, height: 6 },
      speed: 16 * difficulty.speedMultiplier,
      acceleration: 58 * difficulty.speedMultiplier,
      waypointTolerance: 4
    });
    this.encounterMode = options.encounterMode ?? "combat";
    this.speechBlocked = options.speechBlocked ?? (() => false);
    this.boltBlocked = options.boltBlocked ?? (() => false);
    this.homePosition = { x, y };
    this.sprite.setOrigin(0.5, 0.82).setScale(0.72 / (detailed ? DANNE_BOSS_HD.density : 1));
    const animKey = detailed ? danneBossFormAnimation("colossus") : danneAnimKey(DANNE_BOSS_SPRITE_ASSET.key, "walk-down");
    if (scene.anims.exists(animKey)) this.sprite.play(animKey);
    this.speechBack = scene.add.rectangle(0, 0, COMBAT_SPEECH_WIDTH, this.speechHeight, this.color(PALETTE.black), 0.96)
      .setOrigin(0).setStrokeStyle(1, this.color(PALETTE.goldStamp));
    this.boastText = scene.add.text(COMBAT_SPEECH_WIDTH / 2, 4, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      align: "center",
      lineSpacing: 2
    }).setOrigin(0.5, 0);
    this.speechPanel = scene.add.container(0, 0, [this.speechBack, this.boastText])
      .setName("danne-lurker-speech").setDepth(930).setVisible(false);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncSpeech);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroySpeech);
    this.nextBoastAt = scene.time.now + 160;
    this.nextEgoBoltAt = scene.time.now + DANNE_LURKER_INITIAL_BOLT_DELAY_MS;
    this.lastUpdateAt = scene.time.now;
  }

  update(timeMs: number, deltaMs: number, player: Position, canPressure: boolean, combat?: PlayerCombatReadout) {
    this.speechPlayer.x = player.x;
    this.speechPlayer.y = player.y;
    this.speechEnabled = canPressure;
    this.resumeAfterUpdateGap(timeMs, deltaMs);
    this.lastUpdateAt = timeMs;
    if (!canPressure) {
      if (this.pausedAt === null) this.pausedAt = timeMs;
      this.cue.setVisible(false);
      this.speechPanel.setVisible(false);
      this.syncRender(timeMs, 0, 0);
      return { triggered: false, pressureActive: false, egoBoltFired: false, egoBoltHit: false };
    }
    if (this.pausedAt !== null) {
      this.shiftAttackTimers(Math.max(0, timeMs - this.pausedAt));
      this.pausedAt = null;
    }
    const canAttack = this.encounterMode === "combat";
    // The warning lane must keep the same firing origin until the bolt launches.
    if (timeMs >= this.stunnedUntil && !this.egoBoltTelegraph) this.moveTowardWaypoint(deltaMs);
    const swing = canAttack && combat?.actionActive && combat.weapon.active
      && combat.weapon.phase === "active" && isWeaponTool(combat.weapon.tool) && combat.hitbox
      ? { box: new Phaser.Geom.Rectangle(combat.hitbox.x, combat.hitbox.y, combat.hitbox.width, combat.hitbox.height),
          tool: combat.weapon.tool, id: combat.weapon.swingId }
      : null;
    if (swing && timeMs >= this.stunnedUntil && swing.id !== this.lastCounterSwing
      && Phaser.Geom.Intersects.RectangleToRectangle(swing.box, this.bodyBounds())) {
      this.lastCounterSwing = swing.id;
      this.toolCounters += 1;
      this.stun(timeMs, DANNE_LURKER_TOOL_STUN_MS, swing.tool, false);
    }
    // Resolve counters before contact damage, so an active parry wins the frame.
    const egoBoltHit = this.updateBolts(timeMs, deltaMs, player, canAttack, swing);
    const stunned = timeMs < this.stunnedUntil;
    const distance = this.distanceTo(player);
    // Match Player's terrain footprint: proximity alone is not a damaging hit.
    const triggered = canAttack && !stunned && timeMs >= this.nextPressureAt
      && Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(player.x - 8, player.y - 3, 16, 8), this.bodyBounds()
      );
    if (triggered) {
      this.nextPressureAt = timeMs + this.cooldown(5600);
      this.pressureUntil = timeMs + 1150;
      this.scene.tweens.add({
        targets: this.container,
        x: snapPixel(this.currentX + 3),
        duration: 45,
        yoyo: true,
        repeat: 5,
        ease: "Stepped"
      });
    }
    let egoBoltFired = false;
    if (canAttack && !stunned && this.egoBoltTelegraph) {
      egoBoltFired = this.updateEgoBoltTelegraph(timeMs);
    } else if (canAttack && !stunned && distance <= DANNE_LURKER_ATTACK_RANGE && timeMs >= this.nextEgoBoltAt) {
      this.startEgoBoltTelegraph(timeMs, player);
    }

    const boasted = !stunned && !this.speechBlocked() && !this.egoBoltTelegraph && this.bolts.length === 0
      && distance <= DANNE_LURKER_ATTACK_RANGE && timeMs >= this.nextBoastAt;
    if (boasted) {
      this.nextBoastAt = timeMs + this.cooldown(EGO_BOAST_COOLDOWN_MS);
      this.boastUntil = timeMs + 1700;
      const boast = danneLurkerBoast(this.boastIndex);
      this.boastIndex += 1;
      this.setSpeech(boast);
      setLatestMessage(`DANN-E boasts: ${boast}`);
      retroAudio.danneBoast();
    }

    const active = timeMs < this.pressureUntil;
    const cueColor = stunned ? PALETTE.terminalCyan : PALETTE.classNetRed;
    if (cueColor !== this.cueColor) {
      this.cue.setColor(cueColor);
      this.cueColor = cueColor;
    }
    this.cue.setText(stunned ? "STUN" : "30YR")
      .setVisible(active || (stunned && (timeMs >= this.boastUntil || this.speechBlocked())));
    if (stunned) this.sprite.setTint(this.color(Math.floor(timeMs / 120) % 2 === 0 ? PALETTE.creamPaper : PALETTE.terminalCyan));
    else if (this.egoBoltTelegraph && Math.floor(timeMs / 100) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else if (this.egoBoltTelegraph) this.sprite.setTint(this.color(PALETTE.goldStamp));
    else if (active && Math.floor(timeMs / 105) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else if (active) this.sprite.setTint(this.color(PALETTE.goldStamp));
    else this.sprite.clearTint();

    const hoverX = Math.sin(timeMs / 260) * 0.7;
    const hoverY = Math.cos(timeMs / 310) * 0.55;
    const holdingAim = stunned || this.egoBoltTelegraph !== null;
    this.syncRender(timeMs, holdingAim ? 0 : hoverX, holdingAim ? 0 : hoverY);
    return { triggered, pressureActive: active, egoBoltFired, egoBoltHit };
  }

  status(timeMs: number) {
    timeMs = this.pausedAt ?? timeMs;
    if (this.encounterMode === "foreshadow") return "watching; safe preparation room";
    if (timeMs < this.stunnedUntil) return `stunned ${Math.ceil(this.stunnedUntil - timeMs)}ms`;
    const slotReadout = `${this.bolts.length}/${FRUS_DANNE_EGO_BOLT_SLOT_COUNT} ego slots`;
    if (this.egoBoltTelegraph) {
      return `ego lock ${danneLurkerTelegraphRemainingMs(this.egoBoltTelegraph.resolvesAt, timeMs)}ms; ${slotReadout}`;
    }
    if (timeMs < this.pressureUntil) return `deadline pressure; ${slotReadout}`;
    if (timeMs < this.boastUntil) return `boasting; ${slotReadout}`;
    return this.bolts.length ? `firing ${slotReadout}` : "lurking";
  }

  enterRoom(timeMs: number, visible = true) {
    this.container.setVisible(visible);
    this.clearEgoBoltTelegraph();
    this.clearBolts();
    this.currentX = this.homePosition.x;
    this.currentY = this.homePosition.y;
    this.velocityX = 0;
    this.velocityY = 0;
    this.waypointIndex = 0;
    this.pressureUntil = 0;
    this.stunnedUntil = 0;
    this.boastUntil = 0;
    this.pausedAt = null;
    this.lastUpdateAt = timeMs;
    this.lastCounterSwing = -1;
    this.toolCounters = 0;
    this.boltsReturned = 0;
    this.nextPressureAt = timeMs + DANNE_LURKER_INITIAL_BOLT_DELAY_MS;
    this.nextEgoBoltAt = timeMs + DANNE_LURKER_INITIAL_BOLT_DELAY_MS;
    this.nextBoastAt = timeMs + DANNE_LURKER_INITIAL_BOLT_DELAY_MS;
    this.cue.setVisible(false);
    this.speechPanel.setVisible(false);
    this.speechEnabled = false;
    this.syncRender(timeMs);
  }

  readout(timeMs: number) {
    timeMs = this.pausedAt ?? timeMs;
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    const telegraph = this.egoBoltTelegraph
      ? {
          kind: "lurker_ego_lock",
          label: "EGO LOCK",
          msRemaining: danneLurkerTelegraphRemainingMs(this.egoBoltTelegraph.resolvesAt, timeMs),
          target: { ...this.egoBoltTelegraph.target },
          destination: null
        }
      : null;
    return {
      label: "DANN-E LURKER",
      x: this.position.x,
      y: this.position.y,
      spriteKey: this.spriteKey,
      behavior: this.encounterMode === "foreshadow"
        ? "watches from the perimeter and boasts; no contact damage or ego bolts"
        : "fires ego bolts; tool strikes interrupt him and return his projectiles",
      defeatMethod: this.encounterMode === "foreshadow"
        ? "Prepare in safety. DANN-E attacks in the archives."
        : `${getSecondaryActionBadge()}: swing an equipped Stamp, Pencil or Folder to stun DANN-E or return an Ego bolt. Final defeat is at the Buckram Gate.`,
      status: `${this.status(timeMs)}; ${difficulty.label} tier`,
      counterplay: {
        stunnedMsRemaining: Math.max(0, Math.ceil(this.stunnedUntil - (this.pausedAt ?? timeMs))),
        toolCounters: this.toolCounters,
        boltsReturned: this.boltsReturned,
        bolts: this.bolts.map((bolt) => ({ x: snapPixel(bolt.x), y: snapPixel(bolt.y), returned: bolt.returnedBy !== null }))
      },
      telegraph
    };
  }

  private stun(timeMs: number, duration: number, tool: WeaponToolId, returned: boolean) {
    if (timeMs < this.stunnedUntil) return;
    this.clearEgoBoltTelegraph();
    this.stunnedUntil = timeMs + duration;
    this.pressureUntil = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.nextPressureAt = Math.max(this.nextPressureAt, this.stunnedUntil + 500);
    this.nextEgoBoltAt = Math.max(this.nextEgoBoltAt, this.stunnedUntil + 800);
    this.nextBoastAt = Math.max(this.nextBoastAt, this.stunnedUntil + 2200);
    this.boastUntil = timeMs + 750;
    const recovered = returned ? recoverDanneLurkerPressure() : 0;
    this.setSpeech(recovered > 0 ? `REFUTED! +${recovered}` : returned ? "REFUTED!" : "INTERRUPTED!", PALETTE.terminalCyan);
    setLatestMessage(recovered > 0
      ? `Ego returned: ${recovered} reliability recovered from combat pressure. DANN-E is stunned; editorial decisions are unchanged.`
      : returned ? "Ego bolt returned. DANN-E is stunned!" : "DANN-E interrupted. Keep compiling!");
    retroAudio.toolHit(tool);
  }

  destroy() {
    if (this.speechDestroyed) return;
    this.speechDestroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncSpeech);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroySpeech);
    this.speechPanel.destroy();
    this.clearEgoBoltTelegraph();
    this.clearBolts();
    super.destroy();
  }

  private readonly destroySpeech = () => this.destroy();

  private setSpeech(message: string, accent: string = PALETTE.goldStamp) {
    const layout = combatSpeechText(message);
    this.boastText.setText(layout.text);
    this.speechHeight = layout.height;
    this.speechBack.setSize(COMBAT_SPEECH_WIDTH, layout.height).setStrokeStyle(1, this.color(accent));
  }

  private readonly syncSpeech = () => {
    if (this.speechDestroyed) return;
    const visible = this.speechEnabled && this.scene.time.now < this.boastUntil
      && !this.speechBlocked() && !this.egoBoltTelegraph && this.bolts.length === 0;
    const placement = visible ? combatSpeechPlacement(this.position, this.speechPlayer, this.speechHeight) : null;
    this.speechPanel.setVisible(placement !== null);
    if (placement) this.speechPanel.setPosition(placement.x, placement.y);
  };

  private clearBolts() {
    for (const bolt of this.bolts.splice(0)) {
      bolt.sprite.destroy();
      bolt.glow.destroy();
    }
  }

  private startEgoBoltTelegraph(timeMs: number, target: Position) {
    const snapshot = { x: snapPixel(target.x), y: snapPixel(target.y) };
    const source = this.position;
    const markers: Phaser.GameObjects.Rectangle[] = [];
    const add = (x: number, y: number, width: number, height: number, fill: string) => {
      const marker = this.scene.add.rectangle(snapPixel(x), snapPixel(y), width, height, this.color(fill), 0.92)
        .setDepth(938);
      markers.push(marker);
    };
    const radius = 9;
    add(snapshot.x - radius, snapshot.y - radius, 6, 2, PALETTE.classNetRed);
    add(snapshot.x - radius, snapshot.y - radius, 2, 6, PALETTE.classNetRed);
    add(snapshot.x + radius, snapshot.y - radius, 6, 2, PALETTE.classNetRed);
    add(snapshot.x + radius, snapshot.y - radius, 2, 6, PALETTE.classNetRed);
    add(snapshot.x - radius, snapshot.y + radius, 6, 2, PALETTE.classNetRed);
    add(snapshot.x - radius, snapshot.y + radius, 2, 6, PALETTE.classNetRed);
    add(snapshot.x + radius, snapshot.y + radius, 6, 2, PALETTE.classNetRed);
    add(snapshot.x + radius, snapshot.y + radius, 2, 6, PALETTE.classNetRed);
    for (let step = 1; step <= 4; step += 1) {
      const ratio = step / 5;
      add(
        source.x + (snapshot.x - source.x) * ratio,
        source.y - 10 + (snapshot.y - (source.y - 10)) * ratio,
        2,
        2,
        step % 2 === 0 ? PALETTE.goldStamp : PALETTE.classNetRed
      );
    }
    this.egoBoltTelegraph = {
      startedAt: timeMs,
      resolvesAt: timeMs + DANNE_LURKER_BOLT_TELEGRAPH_MS,
      target: snapshot,
      markers
    };
    this.sprite.setTint(this.color(PALETTE.classNetRed));
    if (!this.telegraphExplained) {
      this.telegraphExplained = true;
      setLatestMessage(`Leave the red brackets, or face the bolt and press ${getSecondaryActionBadge()} to return it with your tool.`);
    }
    retroAudio.blip();
  }

  private updateEgoBoltTelegraph(timeMs: number) {
    const telegraph = this.egoBoltTelegraph;
    if (!telegraph) return false;
    const pulseOn = danneTelegraphPulseOn(telegraph.startedAt, timeMs, 100);
    for (const marker of telegraph.markers) marker.setAlpha(pulseOn ? 0.94 : 0.28);
    this.sprite.setAlpha(pulseOn ? 1 : 0.7);
    if (timeMs < telegraph.resolvesAt) return false;
    const target = { ...telegraph.target };
    this.clearEgoBoltTelegraph();
    this.nextEgoBoltAt = timeMs + this.cooldown(DANNE_LURKER_BOLT_COOLDOWN_MS);
    return this.fireEgoBolt(target);
  }

  private clearEgoBoltTelegraph() {
    if (this.egoBoltTelegraph) {
      for (const marker of this.egoBoltTelegraph.markers) marker.destroy();
    }
    this.egoBoltTelegraph = null;
    this.sprite.setAlpha(1);
    this.sprite.clearTint();
  }

  private resumeAfterUpdateGap(timeMs: number, deltaMs: number) {
    if (this.pausedAt !== null || this.lastUpdateAt <= 0) return;
    const expectedFrameMs = Math.max(50, deltaMs * 2);
    const gapMs = timeMs - this.lastUpdateAt - expectedFrameMs;
    if (gapMs > 120) this.shiftAttackTimers(gapMs);
  }

  private shiftAttackTimers(pausedMs: number) {
    if (pausedMs <= 0) return;
    this.nextPressureAt += pausedMs;
    this.pressureUntil += pausedMs;
    this.nextEgoBoltAt += pausedMs;
    this.nextBoastAt += pausedMs;
    this.boastUntil += pausedMs;
    if (this.stunnedUntil > 0) this.stunnedUntil += pausedMs;
    if (this.egoBoltTelegraph) {
      this.egoBoltTelegraph.startedAt += pausedMs;
      this.egoBoltTelegraph.resolvesAt += pausedMs;
    }
    for (const bolt of this.bolts) {
      bolt.armedAt += pausedMs;
      bolt.expiresAt += pausedMs;
    }
  }

  private fireEgoBolt(target: Position) {
    if (this.bolts.length >= FRUS_DANNE_EGO_BOLT_SLOT_COUNT) return false;
    const from = this.position;
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    const { vx, vy } = vectorToward({ x: from.x, y: from.y - 10 }, target, DANNE_LURKER_BOLT_SPEED * difficulty.speedMultiplier);
    const startX = snapPixel(from.x);
    const startY = snapPixel(from.y - 10);
    const angle = Math.round(Phaser.Math.RadToDeg(Math.atan2(vy, vx)));
    const glow = this.scene.add.rectangle(startX, startY, 14, 8, this.color(PALETTE.classNetRed), 0.9)
      .setAngle(angle)
      .setDepth(Math.round(from.y + 3))
      .setStrokeStyle(1, this.color(PALETTE.goldStamp), 0.85);
    const bolt = this.scene.add.sprite(startX, startY, EGO_BOLT.key, Math.abs(vx) > Math.abs(vy) ? 0 : 4)
      .setOrigin(0.5)
      .setScale(0.045)
      .setDepth(Math.round(from.y + 4));
    const animKey = danneAnimKey(EGO_BOLT.key, "fly");
    if (this.scene.anims.exists(animKey)) bolt.play(animKey);
    bolt.setAngle(angle);
    this.bolts.push({
      sprite: bolt,
      glow,
      x: startX,
      y: startY,
      vx,
      vy,
      expiresAt: this.scene.time.now + 2200,
      armedAt: this.scene.time.now + EGO_BOLT_ARM_MS,
      armed: true,
      returnedBy: null
    });
    retroAudio.egoBoltFire();
    return true;
  }

  private cooldown(baseMs: number) {
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    return Math.max(220, Math.round(baseMs * difficulty.cooldownMultiplier));
  }

  private updateBolts(timeMs: number, deltaMs: number, player: Position, allowHit: boolean,
    swing: { box: Phaser.Geom.Rectangle; tool: WeaponToolId } | null) {
    const dt = frameDeltaSeconds(deltaMs);
    const footBox = new Phaser.Geom.Rectangle(player.x - 8, player.y - 4, 16, 9);
    let hit = false;
    for (let index = this.bolts.length - 1; index >= 0; index -= 1) {
      const bolt = this.bolts[index];
      if (bolt.returnedBy) {
        const velocity = vectorToward(bolt, { x: this.position.x, y: this.position.y - 5 }, DANNE_LURKER_RETURN_SPEED);
        bolt.vx = velocity.vx;
        bolt.vy = velocity.vy;
      }
      // Keep sub-pixel travel independent of display refresh; snap only the art.
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      const x = snapPixel(bolt.x);
      const y = snapPixel(bolt.y);
      if (this.boltBlocked?.(x, y)) {
        bolt.sprite.destroy();
        bolt.glow.destroy();
        this.bolts.splice(index, 1);
        continue;
      }
      bolt.sprite.setPosition(x, y);
      bolt.glow.setPosition(x, y);
      bolt.sprite.setDepth(Math.round(bolt.sprite.y + 6));
      bolt.glow.setDepth(Math.round(bolt.sprite.y + 5));
      const boltBox = new Phaser.Geom.Rectangle(bolt.sprite.x - 6, bolt.sprite.y - 6, 12, 12);
      if (allowHit && bolt.armed && !bolt.returnedBy && swing
        && Phaser.Geom.Intersects.RectangleToRectangle(boltBox, swing.box)) {
        bolt.returnedBy = swing.tool;
        bolt.expiresAt = timeMs + 2400;
        this.boltsReturned += 1;
        bolt.sprite.setTintFill(this.color(PALETTE.terminalCyan));
        bolt.glow.setFillStyle(this.color(PALETTE.terminalCyan));
        const velocity = vectorToward(bolt, this.position, DANNE_LURKER_RETURN_SPEED);
        const angle = Math.round(Phaser.Math.RadToDeg(Math.atan2(velocity.vy, velocity.vx)));
        bolt.sprite.setAngle(angle);
        bolt.glow.setAngle(angle);
        setLatestMessage("EGO RETURNED!");
        retroAudio.toolHit(swing.tool);
      }
      if (bolt.returnedBy && Phaser.Geom.Intersects.RectangleToRectangle(boltBox, this.bodyBounds())) {
        this.stun(timeMs, DANNE_LURKER_RETURN_STUN_MS, bolt.returnedBy, true);
        bolt.armed = false;
      } else if (allowHit && !bolt.returnedBy && bolt.armed && timeMs >= bolt.armedAt && Phaser.Geom.Intersects.RectangleToRectangle(boltBox, footBox)) {
        bolt.armed = false;
        hit = true;
      }
      if (timeMs >= bolt.expiresAt || bolt.sprite.x < -20 || bolt.sprite.x > GAME_WIDTH + 20 || bolt.sprite.y < 10 || bolt.sprite.y > GAME_HEIGHT + 20 || !bolt.armed) {
        bolt.sprite.destroy();
        bolt.glow.destroy();
        this.bolts.splice(index, 1);
      }
    }
    return hit;
  }
}
