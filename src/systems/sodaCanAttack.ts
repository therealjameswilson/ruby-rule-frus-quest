import Phaser from "phaser";
import type { Position } from "../game/types";
import { bindPointerPress, getInput, getGamepadDebugState, isTouchInputCapable } from "../input/InputState";
import { retroAudio } from "./audio";
import { sodaCanTexture } from "./sodaCanArt";

export const SODA_FLAVORS = [
  { name: "LIME", color: 0x82b548 },
  { name: "BERRY", color: 0xd45888 },
  { name: "GRAPEFRUIT", color: 0xf29a70 }
] as const;
export const SODA_COOLDOWN_MS = 900;
// The full touch target ends at y190, above MENU's y194..238 target.
// Keep it to the right of the D-pad and left of the face buttons.
export const SODA_CONTROL = { x: 120, y: 168, width: 44, visualWidth: 24, height: 24, touchHeight: 44 } as const;

export function advanceSodaCan(position: Position, target: Position, delta: number) {
  const distance = Math.hypot(target.x - position.x, target.y - position.y);
  const step = 160 * Math.max(0, Math.min(50, delta)) / 1000;
  if (distance <= step + 8) return { ...target, hit: true };
  return { x: position.x + (target.x - position.x) * step / distance,
    y: position.y + (target.y - position.y) * step / distance, hit: false };
}

// A separate touch/click command leaves the stamp's B counter input unchanged.
export class SodaCanAttack {
  private pending = false;
  private disposed = false;
  private cooldown = 0;
  private flavor = 0;
  private controlOpacity = 1;
  private flight: { x: number; y: number; remaining: number; flavor: number } | null = null;
  private readonly button: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly can: Phaser.GameObjects.Container;
  private readonly controlArt?: Phaser.GameObjects.Image;
  private readonly projectileArt?: Phaser.GameObjects.Image;
  private readonly artKeys: (string | null)[];

  constructor(private readonly scene: Phaser.Scene, private readonly origin: () => Position,
    private readonly target: () => Position, private readonly onHit: (flavor: string) => void) {
    this.artKeys = SODA_FLAVORS.map(flavor => sodaCanTexture(scene, flavor.color));
    this.button = scene.add.rectangle(SODA_CONTROL.x, SODA_CONTROL.y, SODA_CONTROL.visualWidth, SODA_CONTROL.height, 0x152b2d)
      .setStrokeStyle(.5, 0xd6a23a).setDepth(1600).setScrollFactor(0).setVisible(false);
    this.label = scene.add.text(SODA_CONTROL.x, SODA_CONTROL.y, "SODA", { fontFamily: "Arial", fontSize: "6px", color: "#ffffff", align: "center" })
      .setOrigin(0.5).setDepth(1601).setScrollFactor(0).setVisible(false);
    this.button.setName("soda-throw-button");
    bindPointerPress(this.button, { down: () => {
      if (this.button.visible && this.cooldown === 0 && !this.flight) this.pending = true;
    } });
    // bindPointerPress already enabled input. Phaser's second setInteractive
    // call preserves that original shape, so replace the active hit area.
    const input = this.button.input!;
    input.hitArea = new Phaser.Geom.Rectangle((SODA_CONTROL.visualWidth - SODA_CONTROL.width) / 2, (SODA_CONTROL.height - SODA_CONTROL.touchHeight) / 2, SODA_CONTROL.width, SODA_CONTROL.touchHeight);
    input.hitAreaCallback = Phaser.Geom.Rectangle.Contains;
    input.customHitArea = true;
    if (this.artKeys[0]) {
      this.controlArt = scene.add.image(SODA_CONTROL.x, SODA_CONTROL.y, this.artKeys[0])
        .setDisplaySize(12, 18).setDepth(1601).setScrollFactor(0).setVisible(false).setName('soda-throw-icon');
      this.projectileArt = scene.add.image(0, 0, this.artKeys[0]).setDisplaySize(8, 12);
    }
    const body = scene.add.rectangle(0, 0, 6, 9, SODA_FLAVORS[0].color).setStrokeStyle(1, 0x101820);
    const lid = scene.add.rectangle(0, -4, 4, 1, 0xe1e6df);
    const stripe = scene.add.rectangle(0, 0, 4, 2, 0xe1e6df);
    if (this.projectileArt) { body.destroy(); lid.destroy(); stripe.destroy(); }
    this.can = scene.add.container(0, 0, this.projectileArt ? [this.projectileArt] : [body, lid, stripe]).setDepth(1500).setVisible(false);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  update(delta: number, enabled: boolean) {
    this.button.setVisible(enabled);
    this.label.setVisible(enabled);
    this.controlArt?.setVisible(enabled);
    if (!enabled) { this.pending = false; this.can.setVisible(false); return; }
    if (getInput().throwItemJustPressed && this.cooldown === 0 && !this.flight) this.pending = true;
    this.cooldown = Math.max(0, this.cooldown - Math.max(0, Math.min(50, delta)));
    if (this.pending && !this.flight && this.cooldown === 0) {
      this.flight = { ...this.origin(), remaining: 1800, flavor: this.flavor };
      const key = this.artKeys[this.flavor];
      if (this.projectileArt && key) this.projectileArt.setTexture(key);
      else (this.can.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(SODA_FLAVORS[this.flavor].color);
      this.flavor = (this.flavor + 1) % SODA_FLAVORS.length;
      this.cooldown = SODA_COOLDOWN_MS;
      retroAudio.blip();
    }
    this.pending = false;
    const controller = getGamepadDebugState().connected;
    const touch = isTouchInputCapable() && !controller;
    const x = touch ? SODA_CONTROL.x : 224;
    const y = touch ? SODA_CONTROL.y : 214;
    this.button.setPosition(x, y);
    this.label.setPosition(x, y + 17);
    this.controlArt?.setPosition(x, y);
    const hero = this.origin();
    const overlapsHero = Math.abs(hero.x - x) < SODA_CONTROL.width / 2 + 16
      && hero.y + 9 > y - SODA_CONTROL.height / 2
      && hero.y - 40 < y + SODA_CONTROL.height / 2;
    const targetOpacity = overlapsHero ? 0.22 : 1;
    this.controlOpacity += (targetOpacity - this.controlOpacity) * (1 - Math.exp(-Math.max(0, Math.min(50, delta)) / 70));
    const command = controller ? "RB: SODA" : touch ? "SODA" : "V: SODA";
    this.label.setText(this.cooldown > 0 || this.flight ? "FIZZ..." : command);
    this.button.setAlpha(this.controlOpacity * (this.cooldown > 0 || this.flight ? 0.5 : 1));
    this.label.setAlpha(this.controlOpacity);
    const nextKey = this.artKeys[this.flavor];
    if (this.controlArt && nextKey) this.controlArt.setTexture(nextKey)
      .setAlpha(this.controlOpacity * (this.cooldown > 0 || this.flight ? .5 : 1));
    if (!this.flight) return;
    const next = advanceSodaCan(this.flight, this.target(), delta);
    Object.assign(this.flight, { x: next.x, y: next.y, remaining: this.flight.remaining - Math.max(0, Math.min(50, delta)) });
    this.can.setVisible(true).setPosition(Math.round(next.x), Math.round(next.y));
    if (next.hit) {
      const flavor = SODA_FLAVORS[this.flight.flavor];
      this.flight = null;
      this.can.setVisible(false);
      const fizz = this.scene.add.circle(Math.round(next.x), Math.round(next.y), 8, flavor.color, 0.65).setDepth(1501);
      this.scene.tweens.add({ targets: fizz, alpha: 0, scale: 2, duration: 220, onComplete: () => fizz.destroy() });
      retroAudio.toolHit("citation_stamp");
      this.onHit(flavor.name);
    } else if (this.flight.remaining <= 0) {
      this.flight = null;
      this.can.setVisible(false);
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.button.destroy(); this.label.destroy(); this.controlArt?.destroy(); this.can.destroy();
  }
}
