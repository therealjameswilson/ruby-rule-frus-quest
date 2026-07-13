import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { SNES_BUREAUCRATIC_WALL_ASSETS } from "../game/snesAtlas";
import type { Position } from "../game/types";
import { setPixelPosition, snapPixel } from "../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export type BureaucraticWallBehavior = "slow-chase" | "wander" | "horizontal-patrol" | "block" | "freeze" | "splitter" | "push";

interface BureaucraticWallOptions {
  behavior?: BureaucraticWallBehavior;
  accent?: string;
  textureKey?: string;
}

export class BureaucraticWall {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly spriteKey: string;
  private readonly container: Phaser.GameObjects.Container;
  private readonly stone: Phaser.GameObjects.Image;
  private readonly crack: Phaser.GameObjects.Rectangle;
  private readonly threatHalo: Phaser.GameObjects.Ellipse;
  private readonly eyeGlowLeft: Phaser.GameObjects.Rectangle;
  private readonly eyeGlowRight: Phaser.GameObjects.Rectangle;
  private readonly pressureArrow: Phaser.GameObjects.Triangle;
  private cleared = false;
  private wobbleOffset: number;
  private currentX: number;
  private currentY: number;
  private alertUntil = 0;
  private readonly behavior: BureaucraticWallBehavior;
  private readonly accent: string;
  private wanderTarget: Position;
  private retargetAt = 0;
  private lastBurstAt = 0;

  constructor(scene: Phaser.Scene, id: string, label: string, x: number, y: number, options: BureaucraticWallOptions = {}) {
    this.id = id;
    this.label = label;
    this.x = x;
    this.y = y;
    this.currentX = x;
    this.currentY = y;
    this.wobbleOffset = Phaser.Math.Between(0, 360);
    this.behavior = options.behavior ?? "slow-chase";
    this.accent = options.accent ?? PALETTE.buckramHighlight;
    this.spriteKey = wallSpriteKey(label, this.behavior, options.textureKey);
    this.wanderTarget = { x, y };
    const shadow = scene.add.ellipse(0, 15, 36, 8, color(PALETTE.black));
    this.threatHalo = scene.add.ellipse(0, 14, 45, 13)
      .setName("bureaucratic-wall-threat-halo")
      .setStrokeStyle(1, color(this.accent), 0.32)
      .setAlpha(0.18);
    this.stone = scene.add.image(0, 0, scene.textures.exists(this.spriteKey) ? this.spriteKey : "bureaucratic-wall")
      .setName("bureaucratic-wall-stone-sprite");
    const labelText = scene.add
      .text(0, 1, behaviorCode(label, this.behavior), {
        fontFamily: "monospace",
        fontSize: "8px",
        color: PALETTE.creamPaper,
        align: "center"
      })
      .setName("bureaucratic-wall-label")
      .setOrigin(0.5);
    this.crack = scene.add.rectangle(9, -2, 1, 20, color(PALETTE.black))
      .setName("bureaucratic-wall-crack")
      .setAngle(18)
      .setVisible(false);
    this.eyeGlowLeft = scene.add.rectangle(-6, -6, 3, 2, color(this.accent), 0)
      .setName("bureaucratic-wall-eye-glow");
    this.eyeGlowRight = scene.add.rectangle(5, -6, 3, 2, color(this.accent), 0)
      .setName("bureaucratic-wall-eye-glow");
    this.pressureArrow = scene.add.triangle(0, -27, 0, -4, 8, 0, 0, 4, color(this.accent), 0)
      .setName("bureaucratic-wall-pressure-arrow")
      .setVisible(false);
    this.container = scene.add.container(x, y, [
      this.threatHalo,
      shadow,
      this.stone,
      this.eyeGlowLeft,
      this.eyeGlowRight,
      labelText,
      this.pressureArrow,
      this.crack
    ]).setName("bureaucratic-wall").setDepth(y);
  }

  get isCleared() {
    return this.cleared;
  }

  get position(): Position {
    return { x: this.currentX, y: this.currentY };
  }

  get bounds() {
    return new Phaser.Geom.Rectangle(this.currentX - 15, this.currentY - 17, 30, 34);
  }

  update(timeMs: number, deltaMs = 16, target?: Position) {
    if (this.cleared) return;
    const homeRadius = this.behavior === "block" || this.behavior === "freeze" || this.behavior === "splitter" ? 1 : 7;
    const homeX = this.x + Math.sin((timeMs + this.wobbleOffset) / 720) * homeRadius;
    const homeY = this.y + Math.cos((timeMs + this.wobbleOffset) / 860) * Math.max(1, homeRadius - 3);
    let desiredX = homeX;
    let desiredY = homeY;
    let distanceToTarget = Number.POSITIVE_INFINITY;
    let targetDx = 0;
    let targetDy = 0;
    if (target) {
      targetDx = target.x - this.currentX;
      targetDy = target.y - this.currentY;
      distanceToTarget = Math.hypot(targetDx, targetDy);
    }

    if (this.behavior === "horizontal-patrol") {
      desiredX = this.x + Math.sin((timeMs + this.wobbleOffset) / 520) * 28;
      desiredY = this.y;
    } else if (this.behavior === "wander") {
      if (timeMs >= this.retargetAt) {
        this.retargetAt = timeMs + Phaser.Math.Between(900, 1600);
        this.wanderTarget = {
          x: Phaser.Math.Clamp(this.x + Phaser.Math.Between(-30, 30), 28, 228),
          y: Phaser.Math.Clamp(this.y + Phaser.Math.Between(-22, 22), 56, 202)
        };
      }
      desiredX = this.wanderTarget.x;
      desiredY = this.wanderTarget.y;
    } else if ((this.behavior === "slow-chase" || this.behavior === "push") && target) {
      const distance = distanceToTarget;
      const sight = this.behavior === "push" ? 74 : 78;
      const pressure = this.behavior === "push" ? 16 : 11;
      if (distance < sight && distance > 1) {
        desiredX += (targetDx / distance) * pressure;
        desiredY += (targetDy / distance) * Math.max(8, pressure - 3);
      }
    }
    const maxDrift = this.behavior === "wander" || this.behavior === "horizontal-patrol" ? 34 : this.behavior === "block" || this.behavior === "freeze" || this.behavior === "splitter" ? 3 : 18;
    desiredX = Phaser.Math.Clamp(desiredX, this.x - maxDrift, this.x + maxDrift);
    desiredY = Phaser.Math.Clamp(desiredY, this.y - maxDrift, this.y + maxDrift);
    const baseSpeed = this.behavior === "slow-chase" ? 10 : this.behavior === "wander" ? 16 : this.behavior === "horizontal-patrol" ? 20 : this.behavior === "push" ? 18 : 7;
    const speed = (timeMs < this.alertUntil ? 32 : baseSpeed) * (deltaMs / 1000);
    this.currentX = Phaser.Math.Linear(this.currentX, desiredX, Phaser.Math.Clamp(speed, 0.02, 0.22));
    this.currentY = Phaser.Math.Linear(this.currentY, desiredY, Phaser.Math.Clamp(speed, 0.02, 0.22));
    const bob = Math.sin((timeMs + this.wobbleOffset) / (this.behavior === "freeze" ? 90 : 180)) * (this.behavior === "freeze" ? 0.7 : 1.3);
    const renderX = snapPixel(this.currentX);
    const renderY = snapPixel(this.currentY + bob);
    setPixelPosition(this.container, renderX, renderY);
    this.container.setDepth(renderY);
    this.updateThreatTelegraph(timeMs, distanceToTarget, targetDx, targetDy);
    if (timeMs < this.alertUntil) this.stone.setTint(color(this.accent));
    else this.stone.clearTint();
  }

  markHit() {
    const now = this.container.scene.time.now;
    this.alertUntil = now + 700;
    this.crack.setVisible(true);
    if (now - this.lastBurstAt > 90) {
      this.lastBurstAt = now;
      this.spawnImpactFlash(false);
      this.spawnStoneChipBurst(false);
    }
    this.container.scene.tweens.add({
      targets: this.container,
      x: this.x + 2,
      duration: 45,
      yoyo: true,
      repeat: 3,
      ease: "Stepped"
    });
  }

  clear() {
    if (this.cleared) return;
    this.cleared = true;
    this.crack.setVisible(true);
    this.spawnImpactFlash(true);
    this.spawnStoneChipBurst(true);
    this.container.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 260,
      ease: "Stepped",
      onComplete: () => this.container.destroy()
    });
  }

  destroy() {
    this.container.destroy();
  }

  isTouching(position: Position, radius = 20) {
    if (this.cleared) return false;
    return Phaser.Math.Distance.Between(this.currentX, this.currentY, position.x, position.y) <= radius;
  }

  intersectsHitbox(hitbox: Phaser.Geom.Rectangle) {
    if (this.cleared) return false;
    return Phaser.Geom.Intersects.RectangleToRectangle(this.bounds, hitbox);
  }

  private spawnImpactFlash(finalHit: boolean) {
    const scene = this.container.scene;
    const x = snapPixel(this.currentX);
    const y = snapPixel(this.currentY);
    const depth = y + 42;
    const flashColor = finalHit ? PALETTE.white : this.accent;
    const cross = scene.add.container(x, y, [
      scene.add.rectangle(0, 0, finalHit ? 28 : 20, 3, color(flashColor), finalHit ? 0.95 : 0.82),
      scene.add.rectangle(0, 0, 3, finalHit ? 28 : 20, color(PALETTE.goldStamp), finalHit ? 0.9 : 0.72)
    ])
      .setDepth(depth)
      .setAlpha(1);
    scene.tweens.add({
      targets: cross,
      scaleX: finalHit ? 1.4 : 1.18,
      scaleY: finalHit ? 1.4 : 1.18,
      alpha: 0,
      duration: finalHit ? 260 : 170,
      ease: "Stepped",
      onUpdate: () => setPixelPosition(cross, snapPixel(cross.x), snapPixel(cross.y)),
      onComplete: () => cross.destroy()
    });
  }

  private spawnStoneChipBurst(finalHit: boolean) {
    const scene = this.container.scene;
    const x = snapPixel(this.currentX);
    const y = snapPixel(this.currentY);
    const chips = finalHit ? 14 : 7;
    const colors = [
      PALETTE.stoneLight,
      PALETTE.stoneGray,
      PALETTE.goldStamp,
      this.accent,
      PALETTE.creamPaper
    ];
    for (let index = 0; index < chips; index += 1) {
      const angle = (-Math.PI * 0.9) + (Math.PI * 1.8 * index) / Math.max(1, chips - 1);
      const distance = finalHit ? 13 + (index % 4) * 3 : 7 + (index % 3) * 2;
      const targetX = snapPixel(x + Math.cos(angle) * distance);
      const targetY = snapPixel(y + Math.sin(angle) * distance - (finalHit ? 6 : 3));
      const size = finalHit && index % 3 === 0 ? 3 : index % 2 === 0 ? 2 : 1;
      const chip = scene.add
        .rectangle(x, y, size, size, color(colors[index % colors.length]), 1)
        .setDepth(y + 43);
      scene.tweens.add({
        targets: chip,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: finalHit ? 360 + (index % 3) * 35 : 210 + (index % 2) * 25,
        ease: "Stepped",
        onUpdate: () => setPixelPosition(chip, snapPixel(chip.x), snapPixel(chip.y)),
        onComplete: () => chip.destroy()
      });
    }
  }

  private updateThreatTelegraph(timeMs: number, distanceToTarget: number, targetDx: number, targetDy: number) {
    const alwaysActive = this.behavior === "block" || this.behavior === "freeze" || this.behavior === "splitter";
    const sight = this.behavior === "push" ? 74 : this.behavior === "slow-chase" ? 78 : 42;
    const active = timeMs < this.alertUntil || alwaysActive || distanceToTarget <= sight;
    const pulse = 0.55 + Math.sin((timeMs + this.wobbleOffset) / 110) * 0.2;
    this.threatHalo.setAlpha(active ? Phaser.Math.Clamp(pulse, 0.22, 0.84) : 0.18);
    this.threatHalo.setStrokeStyle(1, color(this.accent), active ? 0.86 : 0.32);
    this.eyeGlowLeft.setAlpha(active ? 0.88 : 0);
    this.eyeGlowRight.setAlpha(active ? 0.88 : 0);
    const directional = active && Number.isFinite(distanceToTarget) && distanceToTarget > 1;
    this.pressureArrow.setVisible(directional);
    this.pressureArrow.setAlpha(directional ? 0.78 : 0);
    if (directional) {
      this.pressureArrow.setRotation(Math.atan2(targetDy, targetDx));
    }
  }
}

function behaviorCode(label: string, behavior: BureaucraticWallBehavior) {
  const normalized = label.replace(/\s+/g, " ").toUpperCase();
  if (normalized.includes("NO REPO")) return "CITE";
  if (normalized.includes("FIREWALL") || normalized.includes("FORM")) return "NET";
  if (normalized.includes("PENDING")) return "REF";
  if (normalized.includes("WAIT")) return "WAIT";
  if (normalized.includes("HOLD")) return "LOCK";
  if (normalized.includes("AMBIG")) return "HUM";
  if (normalized.includes("DANN-E")) return "RULE";
  if (behavior === "push") return "RULE";
  if (behavior === "freeze") return "WAIT";
  if (behavior === "wander") return "REF";
  if (behavior === "horizontal-patrol") return "NET";
  if (behavior === "block") return "LOCK";
  return "PROC";
}

function wallSpriteKey(label: string, behavior: BureaucraticWallBehavior, override?: string) {
  if (override) return override;
  const normalized = label.replace(/\s+/g, " ").toUpperCase();
  if (normalized.includes("NO REPO")) return "snes-wall-no-repo";
  if (normalized.includes("FIREWALL") || normalized.includes("FORM")) return "snes-wall-firewall";
  if (normalized.includes("PENDING")) return "snes-wall-pending";
  if (normalized.includes("WAIT")) return "snes-wall-wait";
  if (normalized.includes("HOLD")) return "snes-wall-hold";
  if (normalized.includes("AMBIG")) return "snes-wall-ambiguous";
  if (normalized.includes("DANN-E")) return "snes-wall-danne-queue";
  const behaviorMatch = SNES_BUREAUCRATIC_WALL_ASSETS.find((asset) => asset.behavior === behavior);
  return behaviorMatch?.key ?? "bureaucratic-wall";
}
