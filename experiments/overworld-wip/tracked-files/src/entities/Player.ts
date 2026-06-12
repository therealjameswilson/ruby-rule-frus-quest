import Phaser from "phaser";
import {
  ART_PACK_SHEETS,
  HUMANOID_SCALE,
  frameIndex,
  rolePackSheetKey
} from "../game/artPack";
import type { ArtPackSheetKey } from "../game/artPack";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { Direction } from "../game/constants";
import { applyHalfTileMovementCorrection } from "../game/questArchitecture";
import { getSnesRoleFrameSheet } from "../game/snesAtlas";
import { gameState, setPlayerAnimationState, setPlayerFacing, setPlayerPosition } from "../game/state";
import type { KeyboardMap, PlayerAnimationState, Position } from "../game/types";
import { setPixelPosition, snapPixel } from "../systems/pixelPerfect";
import { approach, frameDeltaSeconds } from "../systems/smoothMovement";

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

type SnesRoleFrameSheet = NonNullable<ReturnType<typeof getSnesRoleFrameSheet>>;
type PlayerControlState = "idle" | "walk" | "attack" | "hurt" | "use_item";

interface MovementInput {
  x: number;
  y: number;
  moving: boolean;
  facing: Direction;
}

export class Player {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly keys: KeyboardMap;
  private readonly speed = 58;
  private readonly acceleration = 720;
  private readonly deceleration = 900;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly idleParts: IdlePart[] = [];
  private readonly walkParts: WalkPart[] = [];
  private readonly spriteMode: "packRoleFrame48" | "snes16" | "snesRoleFrame48" | "nes8";
  private readonly roleFrameSheet: SnesRoleFrameSheet | null;
  private readonly packRoleSheetKey: ArtPackSheetKey | null;
  private readonly shadowOffsetY: number;
  private readonly shadowDepthOffset: number;
  private walkClock = 0;
  private idleClock = 0;
  private abilityFrameUntil = 0;
  private isMoving = false;
  private controlState: PlayerControlState = "idle";
  private logicalX: number;
  private logicalY: number;
  private velocityX = 0;
  private velocityY = 0;
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
    this.packRoleSheetKey = this.getAvailablePackRoleSheet(scene);
    this.roleFrameSheet = this.getAvailableRoleFrameSheet(scene);
    this.spriteMode = this.packRoleSheetKey
      ? "packRoleFrame48"
      : this.roleFrameSheet
      ? "snesRoleFrame48"
      : scene.textures.exists(gameState.playerProfile.snesSpriteKey)
        ? "snes16"
        : "nes8";
    const isSnesScale = this.spriteMode === "packRoleFrame48" || this.spriteMode === "snes16" || this.spriteMode === "snesRoleFrame48";
    this.shadowOffsetY = isSnesScale ? 9 : 8;
    this.shadowDepthOffset = isSnesScale ? 2 : 1;
    this.shadow = scene.add
      .ellipse(
        snapPixel(x),
        snapPixel(y + this.shadowOffsetY),
        this.spriteMode === "packRoleFrame48" || this.spriteMode === "snesRoleFrame48" ? 20 : this.spriteMode === "snes16" ? 18 : 12,
        isSnesScale ? 6 : 4,
        color(PALETTE.black)
      )
      .setDepth(snapPixel(y - this.shadowDepthOffset));
    const textureKey = this.spriteMode === "packRoleFrame48" && this.packRoleSheetKey
      ? ART_PACK_SHEETS[this.packRoleSheetKey].textureKey
      : this.spriteMode === "snesRoleFrame48"
      ? this.roleFrameSheet?.key ?? gameState.playerProfile.snesSpriteKey
      : this.spriteMode === "snes16"
        ? gameState.playerProfile.snesSpriteKey
        : gameState.playerProfile.spriteKey;
    const initialFrame = this.spriteMode === "packRoleFrame48" && this.packRoleSheetKey
      ? frameIndex(this.packRoleSheetKey, "idle-down")
      : this.spriteMode === "snesRoleFrame48"
        ? "idle-0"
        : undefined;
    this.sprite = scene.add
      .image(snapPixel(x), snapPixel(y), textureKey, initialFrame)
      .setOrigin(0.5, this.spriteMode === "packRoleFrame48" || this.spriteMode === "snesRoleFrame48" ? 0.84 : this.spriteMode === "snes16" ? 0.75 : 0.5)
      .setDepth(snapPixel(y));
    this.sprite.setScale(this.spriteRenderScale());
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
      z: Phaser.Input.Keyboard.KeyCodes.Z,
      x: Phaser.Input.Keyboard.KeyCodes.X,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      tab: Phaser.Input.Keyboard.KeyCodes.TAB,
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
    return { x: snapPixel(this.logicalX), y: snapPixel(this.logicalY) };
  }

  get facingDirection() {
    return this.facing;
  }

  get animationState(): PlayerAnimationState {
    const prefix = this.isMoving ? "walk" : "idle";
    const suffix = this.facing === "north"
      ? "up"
      : this.facing === "south"
        ? "down"
        : this.facing === "west"
          ? "left"
          : "right";
    return `${prefix}_${suffix}` as PlayerAnimationState;
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
      this.velocityX = 0;
      this.velocityY = 0;
      this.sprite.setAngle(0);
      this.sprite.setScale(this.spriteRenderScale());
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
    const movementInput = this.resolveMovementInput(directionDown);
    this.facing = movementInput.facing;
    const dx = movementInput.x;
    const dy = movementInput.y;
    this.previousDirectionDown.west = directionDown.west;
    this.previousDirectionDown.east = directionDown.east;
    this.previousDirectionDown.north = directionDown.north;
    this.previousDirectionDown.south = directionDown.south;
    const inputMoving = movementInput.moving;
    const dt = frameDeltaSeconds(deltaMs);
    const targetVelocityX = dx * this.speed;
    const targetVelocityY = dy * this.speed;
    const velocityRate = inputMoving ? this.acceleration : this.deceleration;
    this.velocityX = approach(this.velocityX, targetVelocityX, velocityRate * dt);
    this.velocityY = approach(this.velocityY, targetVelocityY, velocityRate * dt);
    const moving = Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1;
    const bounds = options.bounds ?? { left: 14, right: GAME_WIDTH - 14, top: 42, bottom: GAME_HEIGHT - 20 };
    const solids = options.solids ?? [];
    const attemptedX = this.logicalX + this.velocityX * dt;
    const attemptedY = this.logicalY + this.velocityY * dt;
    const nextX = Phaser.Math.Clamp(attemptedX, bounds.left, bounds.right);
    const nextY = Phaser.Math.Clamp(attemptedY, bounds.top, bounds.bottom);
    if (Math.abs(this.velocityX) > 0.01) {
      if (!this.collidesAt(nextX, this.logicalY, solids)) {
        this.logicalX = nextX;
        if (nextX !== attemptedX) this.velocityX = 0;
      } else {
        this.velocityX = 0;
        this.applyHalfTileCorrection(this.facing, bounds, solids);
      }
    }
    if (Math.abs(this.velocityY) > 0.01) {
      if (!this.collidesAt(this.logicalX, nextY, solids)) {
        this.logicalY = nextY;
        if (nextY !== attemptedY) this.velocityY = 0;
      } else {
        this.velocityY = 0;
        this.applyHalfTileCorrection(this.facing, bounds, solids);
      }
    }
    if (moving) {
      this.walkClock += deltaMs;
      this.sprite.setFlipX(this.spriteMode !== "packRoleFrame48" && this.spriteMode !== "snesRoleFrame48" && dx < 0);
    } else {
      this.walkClock = 0;
    }
    this.isMoving = moving;
    this.controlState = moving ? "walk" : "idle";
    this.sprite.setAngle(0);
    this.sprite.setScale(this.spriteRenderScale());
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

  private applyHalfTileCorrection(direction: Direction, bounds: MoveBounds, solids: Phaser.Geom.Rectangle[]) {
    if (!solids.length) return;
    const corrected = applyHalfTileMovementCorrection({
      position: { x: this.logicalX, y: this.logicalY },
      direction,
      bounds,
      canOccupy: (position) => !this.collidesAt(position.x, position.y, solids)
    });
    this.logicalX = corrected.x;
    this.logicalY = corrected.y;
  }

  private playAbilityFrame() {
    this.abilityFrameUntil = this.scene.time.now + 420;
    this.controlState = "use_item";
    if (this.spriteMode === "packRoleFrame48" || this.spriteMode === "snesRoleFrame48") {
      this.sprite.clearTint();
      this.updateRoleFrame();
      return;
    }
    this.sprite.setTint(color(PALETTE.goldStamp));
  }

  private resolveMovementInput(directionDown: Record<Direction, boolean>): MovementInput {
    const justPressed: Direction[] = [];
    if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a) || (directionDown.west && !this.previousDirectionDown.west)) justPressed.push("west");
    if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d) || (directionDown.east && !this.previousDirectionDown.east)) justPressed.push("east");
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w) || (directionDown.north && !this.previousDirectionDown.north)) justPressed.push("north");
    if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s) || (directionDown.south && !this.previousDirectionDown.south)) justPressed.push("south");

    let facing = justPressed.length ? justPressed[justPressed.length - 1] : this.facing;
    const horizontal = (directionDown.west ? -1 : 0) + (directionDown.east ? 1 : 0);
    const vertical = (directionDown.north ? -1 : 0) + (directionDown.south ? 1 : 0);
    const moving = horizontal !== 0 || vertical !== 0;

    if (moving && !directionDown[facing]) {
      if (horizontal < 0) facing = "west";
      else if (horizontal > 0) facing = "east";
      else if (vertical < 0) facing = "north";
      else facing = "south";
    }

    if (horizontal !== 0 && vertical !== 0) {
      const diagonal = Math.SQRT1_2;
      return { x: horizontal * diagonal, y: vertical * diagonal, moving, facing };
    }
    return { x: horizontal, y: vertical, moving, facing };
  }

  private syncRenderPosition() {
    const renderX = snapPixel(this.logicalX);
    const renderY = snapPixel(this.logicalY);
    this.updateRoleFrame();
    setPixelPosition(this.sprite, renderX, renderY);
    setPixelPosition(this.shadow, renderX, renderY + this.shadowOffsetY);
    this.shadow.setDepth(renderY - this.shadowDepthOffset);
    this.sprite.setDepth(renderY);
    this.syncIdleCue(renderX, renderY);
    this.syncWalkCycleCue(renderX, renderY);
    setPlayerAnimationState(this.animationState);
  }

  private createWalkCycleCue(scene: Phaser.Scene) {
    if (this.spriteMode === "packRoleFrame48" || this.spriteMode === "snesRoleFrame48") return;
    if (this.spriteMode === "snes16") {
      this.addWalkRect(scene, -8, 8, -1, 5, 3);
      this.addWalkRect(scene, 8, 8, 1, 5, 3);
      return;
    }
    this.addWalkRect(scene, -4, 14, -1, 4, 2);
    this.addWalkRect(scene, 8, 14, 1, 4, 2);
  }

  private createIdleCue(scene: Phaser.Scene) {
    if (this.spriteMode === "packRoleFrame48" || this.spriteMode === "snesRoleFrame48") return;
    if (this.spriteMode === "snes16") {
      this.createSnesIdleCue(scene);
      return;
    }
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

  private createSnesIdleCue(scene: Phaser.Scene) {
    const role = gameState.playerProfile.roleId;
    if (role === "compiler") {
      this.addIdleRect(scene, -11, -5, 8, 5, PALETTE.goldStamp, "compiler-folder");
      this.addIdleRect(scene, -10, -4, 6, 1, PALETTE.creamPaper, "compiler-folder");
      this.addIdleRect(scene, -4, -14, 1, 1, PALETTE.white, "compiler-glint");
      this.addIdleRect(scene, 5, -14, 1, 1, PALETTE.white, "compiler-glint");
      return;
    }
    if (role === "declass_reviewer") {
      this.addIdleRect(scene, -12, -6, 5, 5, PALETTE.creamPaper, "declass-mug");
      this.addIdleRect(scene, -11, -5, 3, 1, PALETTE.classNetRed, "declass-mug");
      this.addIdleRect(scene, -11, -11, 1, 1, PALETTE.creamPaper, "declass-steam");
      this.addIdleRect(scene, -9, -13, 1, 1, PALETTE.creamPaper, "declass-steam");
      this.addIdleRect(scene, 9, -7, 5, 7, PALETTE.sepiaInk, "declass-mug");
      this.addIdleRect(scene, 10, -6, 3, 5, PALETTE.creamPaper, "declass-mug");
      return;
    }
    if (role === "editor") {
      this.addIdleRect(scene, 6, -21, 1, 6, PALETTE.goldStamp, "editor-pencil");
      this.addIdleRect(scene, 7, -19, 1, 5, PALETTE.buckramHighlight, "editor-pencil");
      this.addIdleRect(scene, 8, -17, 1, 4, PALETTE.buckramRed, "editor-pencil");
      return;
    }
    if (role === "proofreader") {
      this.addIdleRect(scene, -13, -5, 6, 7, PALETTE.creamPaper, "proof-pages");
      this.addIdleRect(scene, -7, -4, 5, 6, PALETTE.white, "proof-pages");
      this.addIdleRect(scene, -12, -2, 4, 1, PALETTE.buckramHighlight, "proof-line");
      this.addIdleRect(scene, -6, -1, 3, 1, PALETTE.buckramRed, "proof-line");
      return;
    }
    if (role === "source_note_specialist") {
      this.addIdleRect(scene, -13, -4, 5, 5, PALETTE.buckramRed, "source-satchel");
      this.addIdleRect(scene, -12, -3, 3, 1, PALETTE.goldStamp, "source-satchel");
      this.addIdleRect(scene, 9, -4, 6, 5, PALETTE.goldStamp, "source-stamp");
      this.addIdleRect(scene, 10, -3, 4, 1, PALETTE.buckramRed, "source-stamp");
    }
  }

  private addWalkRect(scene: Phaser.Scene, ox: number, oy: number, side: -1 | 1, width: number, height: number) {
    const rect = scene.add.rectangle(0, 0, width, height, color(PALETTE.black)).setOrigin(0, 0).setVisible(false);
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

  private getAvailableRoleFrameSheet(scene: Phaser.Scene): SnesRoleFrameSheet | null {
    const sheet = getSnesRoleFrameSheet(gameState.playerProfile.roleId);
    if (!sheet || !scene.textures.exists(sheet.key)) return null;
    return scene.textures.get(sheet.key).has("idle-0") ? sheet : null;
  }

  private getAvailablePackRoleSheet(scene: Phaser.Scene): ArtPackSheetKey | null {
    const sheetKey = rolePackSheetKey(gameState.playerProfile.roleId);
    if (!sheetKey) return null;
    const textureKey = ART_PACK_SHEETS[sheetKey].textureKey;
    return scene.textures.exists(textureKey) ? sheetKey : null;
  }

  private spriteRenderScale() {
    return this.spriteMode === "packRoleFrame48" ? HUMANOID_SCALE : 1;
  }

  private updateRoleFrame() {
    if (this.spriteMode === "packRoleFrame48" && this.packRoleSheetKey) {
      const textureKey = ART_PACK_SHEETS[this.packRoleSheetKey].textureKey;
      const abilityActive = this.scene.time.now < this.abilityFrameUntil;
      const directionFrames: Record<Direction, { walk: string; idle: string }> = {
        north: { walk: "walk-up", idle: "idle-up" },
        south: { walk: "walk-down", idle: "idle-down" },
        west: { walk: "walk-left", idle: "idle-left" },
        east: { walk: "walk-right", idle: "idle-right" }
      };
      const frameName = abilityActive
        ? "read"
        : this.isMoving
          ? `${directionFrames[this.facing].walk}-${Math.floor(this.walkClock / 140) % 2}`
          : directionFrames[this.facing].idle;
      const nextFrame = frameIndex(this.packRoleSheetKey, frameName);
      if (nextFrame >= 0 && (this.sprite.texture.key !== textureKey || Number(this.sprite.frame.name) !== nextFrame)) {
        this.sprite.setTexture(textureKey, nextFrame);
      }
      this.sprite.setScale(this.spriteRenderScale());
      return;
    }

    if (this.spriteMode !== "snesRoleFrame48" || !this.roleFrameSheet) return;
    const texture = this.scene.textures.get(this.roleFrameSheet.key);
    const abilityActive = this.scene.time.now < this.abilityFrameUntil;
    const directionFrames: Record<Direction, { walk: string; idle: string }> = {
      north: { walk: "walk-up", idle: "walk-up-0" },
      south: { walk: "walk-down", idle: "idle-0" },
      west: { walk: "walk-left", idle: "walk-left-0" },
      east: { walk: "walk-right", idle: "walk-right-0" }
    };
    const frameName = abilityActive
      ? "read"
      : this.isMoving
        ? `${directionFrames[this.facing].walk}-${Math.floor(this.walkClock / 110) % 4}`
        : this.facing === "south"
          ? `idle-${Math.floor(this.idleClock / 520) % 2}`
          : directionFrames[this.facing].idle;

    if (texture.has(frameName) && String(this.sprite.frame.name) !== frameName) {
      this.sprite.setTexture(this.roleFrameSheet.key, frameName);
    }
  }
}
