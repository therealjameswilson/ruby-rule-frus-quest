import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Position } from "../game/types";
import { setPixelPosition, snapPixel } from "../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class HacMember {
  readonly label = "HAC member";
  readonly spriteKey = "snes-hac-member";
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly cue: Phaser.GameObjects.Text;
  private readonly waypoints: Position[] = [
    { x: 88, y: 174 },
    { x: 176, y: 174 },
    { x: 214, y: 132 },
    { x: 176, y: 88 },
    { x: 82, y: 88 },
    { x: 42, y: 134 }
  ];
  private waypointIndex = 0;
  private currentX: number;
  private currentY: number;
  private nextDistractionAt = 0;
  private distractingUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.currentX = x;
    this.currentY = y;
    this.waypoints[0] = { x, y };
    const shadow = scene.add.ellipse(0, 15, 18, 6, color(PALETTE.black));
    this.sprite = scene.add.image(0, 0, scene.textures.exists(this.spriteKey) ? this.spriteKey : "marcus");
    const tag = scene.add.text(0, 17, "HAC", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5);
    this.cue = scene.add.text(0, -22, "DISTRACT", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.classNetRed,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setVisible(false);
    this.container = scene.add.container(x, y, [shadow, this.sprite, tag, this.cue]).setDepth(y);
  }

  get position(): Position {
    return { x: snapPixel(this.currentX), y: snapPixel(this.currentY) };
  }

  update(timeMs: number, deltaMs: number, player: Position, canDistract: boolean) {
    this.walk(deltaMs);
    const distance = Phaser.Math.Distance.Between(this.currentX, this.currentY, player.x, player.y);
    const triggered = canDistract && distance <= 25 && timeMs >= this.nextDistractionAt;
    if (triggered) {
      this.nextDistractionAt = timeMs + 3400;
      this.distractingUntil = timeMs + 1050;
      this.scene.tweens.add({
        targets: this.container,
        x: snapPixel(this.currentX + 2),
        duration: 45,
        yoyo: true,
        repeat: 3,
        ease: "Stepped"
      });
    }
    this.cue.setVisible(timeMs < this.distractingUntil);
    if (timeMs < this.distractingUntil) this.sprite.setTint(color(PALETTE.classNetRed));
    else this.sprite.clearTint();
    const bob = Math.sin(timeMs / 190) * 1.1;
    const renderX = snapPixel(this.currentX);
    const renderY = snapPixel(this.currentY + bob);
    setPixelPosition(this.container, renderX, renderY);
    this.container.setDepth(renderY);
    return triggered;
  }

  status(timeMs: number) {
    return timeMs < this.distractingUntil ? "distracting" : "roaming";
  }

  destroy() {
    this.container.destroy();
  }

  private walk(deltaMs: number) {
    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - this.currentX;
    const dy = target.y - this.currentY;
    const distance = Math.hypot(dx, dy);
    if (distance < 3) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      return;
    }
    const step = 24 * (deltaMs / 1000);
    this.currentX += (dx / Math.max(1, distance)) * step;
    this.currentY += (dy / Math.max(1, distance)) * step;
    this.sprite.setFlipX(dx < -0.5);
  }
}
