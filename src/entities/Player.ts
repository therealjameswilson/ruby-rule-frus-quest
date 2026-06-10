import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/constants";
import { gameState, setPlayerPosition } from "../game/state";
import type { KeyboardMap, Position } from "../game/types";

export class Player {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly keys: KeyboardMap;
  private readonly speed = 58;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private walkClock = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.shadow = scene.add.ellipse(x, y + 8, 12, 4, 0x050505, 0.35).setDepth(y - 1);
    this.sprite = scene.add.image(x, y, gameState.playerProfile.spriteKey).setDepth(y);
    this.keys = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      m: Phaser.Input.Keyboard.KeyCodes.M,
      n: Phaser.Input.Keyboard.KeyCodes.N,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      f: Phaser.Input.Keyboard.KeyCodes.F
    }) as KeyboardMap;
    setPlayerPosition(this.position);
  }

  get inputKeys() {
    return this.keys;
  }

  get position() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  pushAwayFrom(source: Position, distance = 12) {
    const dx = this.sprite.x - source.x;
    const dy = this.sprite.y - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x + (dx / length) * distance, 14, GAME_WIDTH - 14);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y + (dy / length) * distance, 42, GAME_HEIGHT - 20);
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 8);
    this.shadow.setDepth(this.sprite.y - 1);
    this.sprite.setDepth(this.sprite.y);
    setPlayerPosition(this.position);
  }

  update(deltaMs: number, canMove: boolean) {
    if (!canMove) {
      this.sprite.setAngle(0);
      this.shadow.setPosition(this.sprite.x, this.sprite.y + 8);
      setPlayerPosition(this.position);
      return;
    }
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    const up = this.keys.up.isDown || this.keys.w.isDown;
    const down = this.keys.down.isDown || this.keys.s.isDown;
    let dx = Number(right) - Number(left);
    let dy = Number(down) - Number(up);
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    const moving = dx !== 0 || dy !== 0;
    const dt = deltaMs / 1000;
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x + dx * this.speed * dt, 14, GAME_WIDTH - 14);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y + dy * this.speed * dt, 42, GAME_HEIGHT - 20);
    if (moving) {
      this.walkClock += deltaMs;
      this.sprite.setFlipX(dx < 0);
      this.sprite.setAngle(Math.sin(this.walkClock / 70) > 0 ? 3 : -3);
      this.sprite.setScale(1, Math.sin(this.walkClock / 60) > 0 ? 0.96 : 1);
    } else {
      this.sprite.setAngle(0);
      this.sprite.setScale(1);
    }
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 8);
    this.shadow.setDepth(this.sprite.y - 1);
    this.shadow.setScale(moving ? 1.08 : 1);
    this.sprite.setDepth(this.sprite.y);
    setPlayerPosition(this.position);
  }
}
