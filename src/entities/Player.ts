import Phaser from "phaser";
import { characterAnimKey } from "../art/character_anims";
import { getCharacterKeyForProcessRole, type CharacterKey } from "../art/characters";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { Direction } from "../game/constants";
import { applyHalfTileMovementCorrection } from "../game/questArchitecture";
import { getSnesRoleFrameSheet } from "../game/snesAtlas";
import { gameState, setPlayerAnimationState, setPlayerCombat, setPlayerFacing, setPlayerPosition } from "../game/state";
import type { PlayerAnimationState, PlayerCombatReadout, PlayerControlState, Position } from "../game/types";
import { getInput } from "../input/InputState";
import {
  buildDirectionalHitbox,
  PLAYER_ACTION_HITBOX_MS,
  PLAYER_HURT_MS,
  PLAYER_IFRAME_MS,
  toHitboxReadout
} from "../systems/combat";
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

interface MovementInput {
  x: number;
  y: number;
  moving: boolean;
  facing: Direction;
}

export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly speed = 58;
  private readonly acceleration = 720;
  private readonly deceleration = 900;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly actionHitboxVisual: Phaser.GameObjects.Rectangle;
  private readonly idleParts: IdlePart[] = [];
  private readonly walkParts: WalkPart[] = [];
  private readonly spriteMode: "artPack32x48" | "snes16" | "snesRoleFrame48" | "nes8";
  private readonly roleFrameSheet: SnesRoleFrameSheet | null;
  private readonly characterKey: CharacterKey | null;
  private readonly shadowOffsetY: number;
  private readonly shadowDepthOffset: number;
  private walkClock = 0;
  private idleClock = 0;
  private abilityFrameUntil = 0;
  private actionActiveUntil = 0;
  private invulnerableUntil = 0;
  private hurtUntil = 0;
  private isMoving = false;
  private controlState: PlayerControlState = "idle";
  private logicalX: number;
  private logicalY: number;
  private velocityX = 0;
  private velocityY = 0;
  private readonly scene: Phaser.Scene;
  private facing: Direction = "south";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.logicalX = x;
    this.logicalY = y;
    const preferredCharacterKey = getCharacterKeyForProcessRole(gameState.playerProfile.roleId);
    this.characterKey = scene.textures.exists(preferredCharacterKey) ? preferredCharacterKey : null;
    this.roleFrameSheet = this.characterKey ? null : this.getAvailableRoleFrameSheet(scene);
    this.spriteMode = this.characterKey
      ? "artPack32x48"
      : this.roleFrameSheet
      ? "snesRoleFrame48"
      : scene.textures.exists(gameState.playerProfile.snesSpriteKey)
        ? "snes16"
        : "nes8";
    const isSnesScale = this.spriteMode === "snes16" || this.spriteMode === "snesRoleFrame48" || this.spriteMode === "artPack32x48";
    this.shadowOffsetY = this.spriteMode === "artPack32x48" ? 5 : isSnesScale ? 9 : 8;
    this.shadowDepthOffset = isSnesScale ? 2 : 1;
    this.shadow = scene.add
      .ellipse(
        snapPixel(x),
        snapPixel(y + this.shadowOffsetY),
        this.spriteMode === "artPack32x48" || this.spriteMode === "snesRoleFrame48" ? 20 : this.spriteMode === "snes16" ? 18 : 12,
        isSnesScale ? 6 : 4,
        color(PALETTE.black)
      )
      .setDepth(snapPixel(y - this.shadowDepthOffset));
    const textureKey = this.spriteMode === "artPack32x48"
      ? this.characterKey ?? gameState.playerProfile.snesSpriteKey
      : this.spriteMode === "snesRoleFrame48"
      ? this.roleFrameSheet?.key ?? gameState.playerProfile.snesSpriteKey
      : this.spriteMode === "snes16"
        ? gameState.playerProfile.snesSpriteKey
        : gameState.playerProfile.spriteKey;
    this.sprite = scene.add
      .sprite(snapPixel(x), snapPixel(y), textureKey, this.spriteMode === "snesRoleFrame48" ? "idle-0" : undefined)
      .setOrigin(0.5, this.spriteMode === "artPack32x48" ? 0.9 : this.spriteMode === "snesRoleFrame48" ? 0.84 : this.spriteMode === "snes16" ? 0.75 : 0.5)
      .setDepth(snapPixel(y));
    if (this.spriteMode === "artPack32x48" && this.characterKey) {
      this.sprite.play(characterAnimKey(this.characterKey, "idle-down"));
    }
    this.actionHitboxVisual = scene.add
      .rectangle(snapPixel(x), snapPixel(y), 18, 18)
      .setOrigin(0, 0)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(899)
      .setVisible(false);
    this.createIdleCue(scene);
    this.createWalkCycleCue(scene);
    scene.events.on("role-ability-frame", this.playAbilityFrame, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off("role-ability-frame", this.playAbilityFrame, this);
    });
    this.syncRenderPosition();
    setPlayerPosition(this.position);
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

  get isActionActive() {
    return this.scene.time.now < this.actionActiveUntil;
  }

  get activeActionHitbox() {
    return this.isActionActive ? this.getFacingActionHitbox() : null;
  }

  get isInvulnerable() {
    return this.scene.time.now < this.invulnerableUntil;
  }

  get combatReadout(): PlayerCombatReadout {
    const now = this.scene.time.now;
    const hitbox = this.activeActionHitbox;
    return {
      state: this.currentControlState(now),
      actionActive: this.isActionActive,
      actionMsRemaining: Math.max(0, Math.round(this.actionActiveUntil - now)),
      invulnerable: this.isInvulnerable,
      invulnerableMsRemaining: Math.max(0, Math.round(this.invulnerableUntil - now)),
      hitbox: toHitboxReadout(hitbox)
    };
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

  startAction() {
    this.actionActiveUntil = this.scene.time.now + PLAYER_ACTION_HITBOX_MS;
    this.controlState = "attack";
    this.abilityFrameUntil = Math.max(this.abilityFrameUntil, this.scene.time.now + PLAYER_ACTION_HITBOX_MS);
    this.syncRenderPosition();
  }

  getFacingActionHitbox() {
    return buildDirectionalHitbox(this.position, this.facing);
  }

  takeHit(source: Position, distance = 14, invulnerabilityMs = PLAYER_IFRAME_MS) {
    if (this.isInvulnerable) return false;
    this.invulnerableUntil = this.scene.time.now + invulnerabilityMs;
    this.hurtUntil = this.scene.time.now + PLAYER_HURT_MS;
    this.controlState = "hurt";
    this.pushAwayFrom(source, distance);
    this.syncRenderPosition();
    return true;
  }

  update(deltaMs: number, canMove: boolean, options: PlayerMoveOptions = {}) {
    this.idleClock += deltaMs;
    const now = this.scene.time.now;
    if (!canMove) {
      this.isMoving = false;
      this.velocityX = 0;
      this.velocityY = 0;
      this.sprite.setAngle(0);
      this.sprite.setScale(1);
      if (now >= this.abilityFrameUntil && !this.isInvulnerable) this.sprite.clearTint();
      this.syncRenderPosition();
      setPlayerPosition(this.position);
      setPlayerFacing(this.facing);
      return;
    }
    const movementInput = this.resolveMovementInput();
    this.facing = movementInput.facing;
    const dx = movementInput.x;
    const dy = movementInput.y;
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
      this.sprite.setFlipX(this.spriteMode !== "snesRoleFrame48" && this.spriteMode !== "artPack32x48" && dx < 0);
    } else {
      this.walkClock = 0;
    }
    this.isMoving = moving;
    if (now >= this.hurtUntil && now >= this.actionActiveUntil) this.controlState = moving ? "walk" : "idle";
    this.sprite.setAngle(0);
    this.sprite.setScale(1);
    if (now >= this.abilityFrameUntil && !this.isInvulnerable) this.sprite.clearTint();
    this.shadow.setScale(1);
    this.syncRenderPosition();
    setPlayerPosition(this.position);
    setPlayerFacing(this.facing);
  }

  private collidesAt(x: number, y: number, solids: Phaser.Geom.Rectangle[]) {
    if (!solids.length) return false;
    const footBox = new Phaser.Geom.Rectangle(x - 8, y - 3, 16, 8);
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
    if (this.spriteMode === "snesRoleFrame48" || this.spriteMode === "artPack32x48") {
      this.sprite.clearTint();
      this.updateRoleFrame();
      return;
    }
    this.sprite.setTint(color(PALETTE.goldStamp));
  }

  private resolveMovementInput(): MovementInput {
    const input = getInput();
    const moving = input.dir.x !== 0 || input.dir.y !== 0;
    let facing = this.facing;
    if (input.dir.x < 0) facing = "west";
    else if (input.dir.x > 0) facing = "east";
    else if (input.dir.y < 0) facing = "north";
    else if (input.dir.y > 0) facing = "south";
    return { x: input.dir.x, y: input.dir.y, moving, facing };
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
    this.syncActionHitbox();
    this.syncInvulnerabilityBlink();
    setPlayerAnimationState(this.animationState);
    setPlayerCombat(this.combatReadout);
  }

  private currentControlState(now = this.scene.time.now): PlayerControlState {
    if (now < this.hurtUntil) return "hurt";
    if (now < this.actionActiveUntil) return "attack";
    if (this.controlState === "hurt" || this.controlState === "attack") return this.isMoving ? "walk" : "idle";
    return this.controlState;
  }

  private syncActionHitbox() {
    const hitbox = this.activeActionHitbox;
    if (!hitbox) {
      this.actionHitboxVisual.setVisible(false);
      return;
    }
    this.actionHitboxVisual
      .setVisible(true)
      .setSize(hitbox.width, hitbox.height)
      .setPosition(snapPixel(hitbox.x), snapPixel(hitbox.y))
      .setDepth(snapPixel(this.logicalY + 1));
  }

  private syncInvulnerabilityBlink() {
    if (!this.isInvulnerable) {
      this.sprite.setAlpha(1);
      if (this.scene.time.now >= this.abilityFrameUntil) this.sprite.clearTint();
      return;
    }
    const blinkOn = Math.floor(this.scene.time.now / 90) % 2 === 0;
    this.sprite.setAlpha(blinkOn ? 1 : 0.45);
    this.sprite.setTint(color(PALETTE.classNetRed));
  }

  private createWalkCycleCue(scene: Phaser.Scene) {
    if (this.spriteMode === "artPack32x48") return;
    if (this.spriteMode === "snesRoleFrame48") return;
    if (this.spriteMode === "snes16") {
      this.addWalkRect(scene, -8, 8, -1, 5, 3);
      this.addWalkRect(scene, 8, 8, 1, 5, 3);
      return;
    }
    this.addWalkRect(scene, -4, 14, -1, 4, 2);
    this.addWalkRect(scene, 8, 14, 1, 4, 2);
  }

  private createIdleCue(scene: Phaser.Scene) {
    if (this.spriteMode === "artPack32x48") return;
    if (this.spriteMode === "snesRoleFrame48") return;
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

  private updateRoleFrame() {
    if (this.spriteMode === "artPack32x48" && this.characterKey) {
      const abilityActive = this.scene.time.now < this.abilityFrameUntil;
      const directionSuffix = this.directionSuffix();
      const suffix = abilityActive
        ? this.isActionActive
          ? "interact"
          : "reading"
        : this.isMoving
          ? `walk-${directionSuffix}`
          : `idle-${directionSuffix}`;
      const animKey = characterAnimKey(this.characterKey, suffix);
      if (this.scene.anims.exists(animKey)) {
        this.sprite.play(animKey, true);
      }
      return;
    }
    if (this.spriteMode !== "snesRoleFrame48" || !this.roleFrameSheet) return;
    const texture = this.scene.textures.get(this.roleFrameSheet.key);
    const abilityActive = this.scene.time.now < this.abilityFrameUntil;
    const directionFrames: Record<Direction, string> = {
      north: "walk-up",
      south: "walk-down",
      west: "walk-left",
      east: "walk-right"
    };
    const frameName = abilityActive
      ? "read"
      : this.isMoving
        ? `${directionFrames[this.facing]}-${Math.floor(this.walkClock / 110) % 4}`
        : `idle-${Math.floor(this.idleClock / 520) % 2}`;

    if (texture.has(frameName) && String(this.sprite.frame.name) !== frameName) {
      this.sprite.setTexture(this.roleFrameSheet.key, frameName);
    }
  }

  private directionSuffix() {
    if (this.facing === "north") return "up";
    if (this.facing === "south") return "down";
    if (this.facing === "west") return "left";
    return "right";
  }
}
