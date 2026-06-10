import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { gameState, setPlayerPosition } from "../game/state";
import type { KeyboardMap, Position } from "../game/types";
import { setPixelPosition, snapPixel } from "../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type IdleTag =
  | "compiler-folder"
  | "compiler-glint"
  | "declass-mug"
  | "declass-steam"
  | "editor-pencil"
  | "proof-pages"
  | "proof-line"
  | "source-satchel"
  | "source-stamp";

interface IdlePart {
  rect: Phaser.GameObjects.Rectangle;
  ox: number;
  oy: number;
  tag: IdleTag;
  depthOffset: number;
}

interface WalkPart {
  rect: Phaser.GameObjects.Rectangle;
  ox: number;
  oy: number;
  side: -1 | 1;
}

export class Player {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly keys: KeyboardMap;
  private readonly speed = 58;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly idleParts: IdlePart[] = [];
  private readonly walkParts: WalkPart[] = [];
  private walkClock = 0;
  private idleClock = 0;
  private abilityFrameUntil = 0;
  private isMoving = false;
  private logicalX: number;
  private logicalY: number;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.logicalX = x;
    this.logicalY = y;
    this.shadow = scene.add.ellipse(snapPixel(x), snapPixel(y + 8), 12, 4, 0x050505, 0.35).setDepth(snapPixel(y - 1));
    this.sprite = scene.add.image(snapPixel(x), snapPixel(y), gameState.playerProfile.spriteKey).setDepth(snapPixel(y));
    this.createIdleCue(scene);
    this.createWalkCycleCue(scene);
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
    scene.events.on("role-ability-frame", this.playAbilityFrame, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off("role-ability-frame", this.playAbilityFrame, this);
    });
    this.syncRenderPosition();
    setPlayerPosition(this.position);
  }

  get inputKeys() {
    return this.keys;
  }

  get position() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  pushAwayFrom(source: Position, distance = 12) {
    const dx = this.logicalX - source.x;
    const dy = this.logicalY - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.logicalX = Phaser.Math.Clamp(this.logicalX + (dx / length) * distance, 14, GAME_WIDTH - 14);
    this.logicalY = Phaser.Math.Clamp(this.logicalY + (dy / length) * distance, 42, GAME_HEIGHT - 20);
    this.isMoving = false;
    this.syncRenderPosition();
    setPlayerPosition(this.position);
  }

  update(deltaMs: number, canMove: boolean) {
    this.idleClock += deltaMs;
    if (!canMove) {
      this.isMoving = false;
      this.sprite.setAngle(0);
      this.sprite.setScale(1);
      if (this.scene.time.now >= this.abilityFrameUntil) this.sprite.clearTint();
      this.syncRenderPosition();
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
    this.logicalX = Phaser.Math.Clamp(this.logicalX + dx * this.speed * dt, 14, GAME_WIDTH - 14);
    this.logicalY = Phaser.Math.Clamp(this.logicalY + dy * this.speed * dt, 42, GAME_HEIGHT - 20);
    if (moving) {
      this.walkClock += deltaMs;
      this.sprite.setFlipX(dx < 0);
    } else {
      this.walkClock = 0;
    }
    this.isMoving = moving;
    this.sprite.setAngle(0);
    this.sprite.setScale(1);
    if (this.scene.time.now >= this.abilityFrameUntil) this.sprite.clearTint();
    this.shadow.setScale(1);
    this.syncRenderPosition();
    setPlayerPosition(this.position);
  }

  private playAbilityFrame() {
    this.abilityFrameUntil = this.scene.time.now + 420;
    this.sprite.setTint(color(PALETTE.goldStamp));
  }

  private syncRenderPosition() {
    const renderX = snapPixel(this.logicalX);
    const renderY = snapPixel(this.logicalY);
    setPixelPosition(this.sprite, renderX, renderY);
    setPixelPosition(this.shadow, renderX, renderY + 8);
    this.shadow.setDepth(renderY - 1);
    this.sprite.setDepth(renderY);
    this.syncIdleCue(renderX, renderY);
    this.syncWalkCycleCue(renderX, renderY);
  }

  private createWalkCycleCue(scene: Phaser.Scene) {
    this.addWalkRect(scene, -4, 14, -1);
    this.addWalkRect(scene, 8, 14, 1);
  }

  private createIdleCue(scene: Phaser.Scene) {
    const role = gameState.playerProfile.roleId;
    if (role === "compiler") {
      this.addIdleRect(scene, -5, 3, 7, 4, PALETTE.goldStamp, "compiler-folder");
      this.addIdleRect(scene, -4, 4, 5, 1, PALETTE.creamPaper, "compiler-folder");
      this.addIdleRect(scene, -3, -3, 1, 1, PALETTE.white, "compiler-glint");
      this.addIdleRect(scene, 3, -3, 1, 1, PALETTE.white, "compiler-glint");
      return;
    }
    if (role === "declass_reviewer") {
      this.addIdleRect(scene, 5, 2, 4, 4, PALETTE.creamPaper, "declass-mug");
      this.addIdleRect(scene, 6, 3, 2, 1, PALETTE.classNetRed, "declass-mug");
      this.addIdleRect(scene, 6, -2, 1, 1, PALETTE.creamPaper, "declass-steam");
      this.addIdleRect(scene, 8, -4, 1, 1, PALETTE.creamPaper, "declass-steam");
      this.addIdleRect(scene, -7, 1, 4, 6, PALETTE.sepiaInk, "declass-mug");
      this.addIdleRect(scene, -6, 2, 3, 4, PALETTE.creamPaper, "declass-mug");
      return;
    }
    if (role === "editor") {
      this.addIdleRect(scene, 5, -5, 1, 2, PALETTE.goldStamp, "editor-pencil");
      this.addIdleRect(scene, 6, -3, 1, 2, PALETTE.buckramHighlight, "editor-pencil");
      this.addIdleRect(scene, 7, -1, 1, 2, PALETTE.buckramRed, "editor-pencil");
      return;
    }
    if (role === "proofreader") {
      this.addIdleRect(scene, -6, 2, 5, 5, PALETTE.creamPaper, "proof-pages");
      this.addIdleRect(scene, -1, 2, 5, 5, PALETTE.white, "proof-pages");
      this.addIdleRect(scene, -5, 4, 3, 1, PALETTE.buckramHighlight, "proof-line");
      this.addIdleRect(scene, 0, 4, 3, 1, PALETTE.buckramRed, "proof-line");
      return;
    }
    if (role === "source_note_specialist") {
      this.addIdleRect(scene, -7, 3, 4, 4, PALETTE.buckramRed, "source-satchel");
      this.addIdleRect(scene, -6, 4, 2, 1, PALETTE.goldStamp, "source-satchel");
      this.addIdleRect(scene, 4, 2, 5, 4, PALETTE.goldStamp, "source-stamp");
      this.addIdleRect(scene, 5, 3, 3, 1, PALETTE.buckramRed, "source-stamp");
    }
  }

  private addIdleRect(scene: Phaser.Scene, ox: number, oy: number, width: number, height: number, fill: string, tag: IdleTag) {
    const rect = scene.add.rectangle(0, 0, width, height, color(fill)).setOrigin(0, 0);
    this.idleParts.push({ rect, ox, oy, tag, depthOffset: 1 });
  }

  private addWalkRect(scene: Phaser.Scene, ox: number, oy: number, side: -1 | 1) {
    const rect = scene.add.rectangle(0, 0, 4, 2, color(PALETTE.black)).setOrigin(0, 0).setVisible(false);
    this.walkParts.push({ rect, ox, oy, side });
  }

  private syncIdleCue(renderX: number, renderY: number) {
    if (!this.idleParts.length) return;
    const tick = Math.floor(this.idleClock / 360) % 4;
    const fastTick = Math.floor(this.idleClock / 180) % 4;
    const abilityActive = this.scene.time.now < this.abilityFrameUntil;
    const hideAnimatedCue = this.isMoving && !abilityActive;
    for (const part of this.idleParts) {
      let x = renderX + part.ox;
      let y = renderY + part.oy;
      let visible = !hideAnimatedCue;

      if (part.tag === "compiler-folder") y += tick === 1 ? -1 : 0;
      if (part.tag === "compiler-glint") visible = !hideAnimatedCue && tick === 0;
      if (part.tag === "declass-steam") {
        visible = !hideAnimatedCue && tick !== 2;
        y -= fastTick % 3;
      }
      if (part.tag === "editor-pencil") y += fastTick % 2 === 0 ? 0 : 1;
      if (part.tag === "proof-pages") x += tick === 1 ? -1 : tick === 3 ? 1 : 0;
      if (part.tag === "proof-line") visible = !hideAnimatedCue && tick % 2 === 0;
      if (part.tag === "source-stamp") y += tick % 2 === 0 ? -1 : 0;
      if (abilityActive) {
        visible = true;
        y -= 1;
      }

      part.rect.setVisible(visible);
      setPixelPosition(part.rect, x, y);
      part.rect.setDepth(renderY + part.depthOffset);
    }
  }

  private syncWalkCycleCue(renderX: number, renderY: number) {
    const frame = Math.floor(this.walkClock / 140) % 2;
    for (const part of this.walkParts) {
      const stride = this.isMoving ? (frame === 0 ? part.side : -part.side) : 0;
      part.rect.setVisible(this.isMoving);
      setPixelPosition(part.rect, renderX + part.ox + stride, renderY + part.oy);
      part.rect.setDepth(renderY + 1);
    }
  }
}
