import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { Direction } from "../game/constants";
import { gameState, setPlayerFacing, setPlayerPosition } from "../game/state";
import type { KeyboardMap, Position } from "../game/types";
import { setPixelPosition, snapPixel } from "../systems/pixelPerfect";

interface MoveBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface PlayerMoveOptions {
  bounds?: MoveBounds;
  solids?: Phaser.Geom.Rectangle[];
}

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
  private facing: Direction = "south";
  private readonly previousDirectionDown: Record<Direction, boolean> = {
    north: false,
    south: false,
    west: false,
    east: false
  };

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

  get facingDirection() {
    return this.facing;
  }

  setPosition(x: number, y: number) {
    this.logicalX = x;
    this.logicalY = y;
    this.isMoving = false;
    this.walkClock = 0;
    this.syncRenderPosition();
    setPlayerPosition(this.position);
    setPlayerFacing(this.facing);
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
    setPlayerFacing(this.facing);
  }

  update(deltaMs: number, canMove: boolean, options: PlayerMoveOptions = {}) {
    this.idleClock += deltaMs;
    if (!canMove) {
      this.isMoving = false;
      this.sprite.setAngle(0);
      this.sprite.setScale(1);
      if (this.scene.time.now >= this.abilityFrameUntil) this.sprite.clearTint();
      this.syncRenderPosition();
      setPlayerPosition(this.position);
      setPlayerFacing(this.facing);
      return;
    }
    const touchState = typeof window === "undefined"
      ? undefined
      : (window as Window & { rubyRuleTouchState?: Record<string, boolean> }).rubyRuleTouchState;
    const directionDown: Record<Direction, boolean> = {
      west: this.keys.left.isDown || this.keys.a.isDown || !!touchState?.left,
      east: this.keys.right.isDown || this.keys.d.isDown || !!touchState?.right,
      north: this.keys.up.isDown || this.keys.w.isDown || !!touchState?.up,
      south: this.keys.down.isDown || this.keys.s.isDown || !!touchState?.down
    };
    const justPressed: Direction[] = [];
    if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a) || (directionDown.west && !this.previousDirectionDown.west)) justPressed.push("west");
    if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d) || (directionDown.east && !this.previousDirectionDown.east)) justPressed.push("east");
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w) || (directionDown.north && !this.previousDirectionDown.north)) justPressed.push("north");
    if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s) || (directionDown.south && !this.previousDirectionDown.south)) justPressed.push("south");
    if (justPressed.length) this.facing = justPressed[justPressed.length - 1];
    if (!directionDown[this.facing]) {
      const fallback = (["west", "east", "north", "south"] as Direction[]).find((direction) => directionDown[direction]);
      if (fallback) this.facing = fallback;
    }
    let dx = 0;
    let dy = 0;
    if (directionDown[this.facing]) {
      if (this.facing === "west") dx = -1;
      else if (this.facing === "east") dx = 1;
      else if (this.facing === "north") dy = -1;
      else dy = 1;
    }
    this.previousDirectionDown.west = directionDown.west;
    this.previousDirectionDown.east = directionDown.east;
    this.previousDirectionDown.north = directionDown.north;
    this.previousDirectionDown.south = directionDown.south;
    const moving = dx !== 0 || dy !== 0;
    const dt = deltaMs / 1000;
    const bounds = options.bounds ?? { left: 14, right: GAME_WIDTH - 14, top: 42, bottom: GAME_HEIGHT - 20 };
    const nextX = Phaser.Math.Clamp(this.logicalX + dx * this.speed * dt, bounds.left, bounds.right);
    const nextY = Phaser.Math.Clamp(this.logicalY + dy * this.speed * dt, bounds.top, bounds.bottom);
    if (dx !== 0 && !this.collidesAt(nextX, this.logicalY, options.solids ?? [])) this.logicalX = nextX;
    if (dy !== 0 && !this.collidesAt(this.logicalX, nextY, options.solids ?? [])) this.logicalY = nextY;
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
    setPlayerFacing(this.facing);
  }

  private collidesAt(x: number, y: number, solids: Phaser.Geom.Rectangle[]) {
    if (!solids.length) return false;
    const footBox = new Phaser.Geom.Rectangle(x - 5, y + 2, 10, 10);
    return solids.some((solid) => Phaser.Geom.Intersects.RectangleToRectangle(footBox, solid));
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
