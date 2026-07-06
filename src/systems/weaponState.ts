import type Phaser from "phaser";
import type { Direction, ProcessItemId } from "../game/constants";
import type { Position } from "../game/types";

export type WeaponPhase = "idle" | "windup" | "active" | "cooldown";
export type WeaponToolId = Extract<ProcessItemId, "citation_stamp" | "red_pencil" | "review_folder">;

export interface WeaponTiming {
  label: string;
  windupMs: number;
  activeMs: number;
  cooldownMs: number;
  movementScale: number;
  vfxTextureKey: string;
  vfxFrame: number;
  hitbox: {
    width: number;
    height: number;
    reach: number;
  };
}

export interface WeaponReadout {
  phase: WeaponPhase;
  tool: WeaponToolId;
  label: string;
  canSwing: boolean;
  active: boolean;
  windupMsRemaining: number;
  activeMsRemaining: number;
  cooldownMsRemaining: number;
  cooldownRatio: number;
  movementScale: number;
  swingId: number;
}

export const WEAPON_VFX_ASSET = {
  key: "pack-effects-stamps",
  path: "assets/art-pack/effects/effects_stamps.png",
  frameWidth: 204,
  frameHeight: 256
} as const;

export const WEAPON_TOOLS = ["citation_stamp", "red_pencil", "review_folder"] as const;

export const WEAPON_TIMINGS: Record<WeaponToolId, WeaponTiming> = {
  citation_stamp: {
    label: "Citation Stamp",
    windupMs: 70,
    activeMs: 135,
    cooldownMs: 190,
    movementScale: 0.72,
    vfxTextureKey: WEAPON_VFX_ASSET.key,
    vfxFrame: 17,
    hitbox: { width: 19, height: 17, reach: 17 }
  },
  red_pencil: {
    label: "Red Pencil",
    windupMs: 95,
    activeMs: 155,
    cooldownMs: 250,
    movementScale: 0.66,
    vfxTextureKey: WEAPON_VFX_ASSET.key,
    vfxFrame: 13,
    hitbox: { width: 25, height: 13, reach: 19 }
  },
  review_folder: {
    label: "Review Folder",
    windupMs: 120,
    activeMs: 175,
    cooldownMs: 300,
    movementScale: 0.58,
    vfxTextureKey: WEAPON_VFX_ASSET.key,
    vfxFrame: 19,
    hitbox: { width: 26, height: 21, reach: 15 }
  }
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rectangle(x: number, y: number, width: number, height: number): Phaser.Geom.Rectangle {
  return {
    x,
    y,
    width,
    height,
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2
  } as Phaser.Geom.Rectangle;
}

export function isWeaponTool(tool: ProcessItemId | null | undefined): tool is WeaponToolId {
  return Boolean(tool && (WEAPON_TOOLS as readonly string[]).includes(tool));
}

export function normalizeWeaponTool(tool: ProcessItemId | null | undefined): WeaponToolId {
  return isWeaponTool(tool) ? tool : "citation_stamp";
}

export function weaponTiming(tool: ProcessItemId | null | undefined) {
  return WEAPON_TIMINGS[normalizeWeaponTool(tool)];
}

export function buildWeaponHitbox(position: Position, facing: Direction, tool: ProcessItemId | null | undefined) {
  const timing = weaponTiming(tool);
  const x = Math.round(position.x);
  const y = Math.round(position.y);
  const { width, height, reach } = timing.hitbox;
  if (facing === "north") return rectangle(x - Math.round(width / 2), y - reach - height, width, height);
  if (facing === "south") return rectangle(x - Math.round(width / 2), y + reach, width, height);
  if (facing === "west") return rectangle(x - reach - height, y - Math.round(width / 2), height, width);
  return rectangle(x + reach, y - Math.round(width / 2), height, width);
}

export class WeaponStateController {
  private currentPhase: WeaponPhase = "idle";
  private currentTool: WeaponToolId = "citation_stamp";
  private phaseStartedAt = 0;
  private activeStartedAt = 0;
  private activeEndsAt = 0;
  private cooldownEndsAt = 0;
  private swingCounter = 0;

  get phase() {
    return this.currentPhase;
  }

  get tool() {
    return this.currentTool;
  }

  get swingId() {
    return this.swingCounter;
  }

  tryStart(tool: ProcessItemId | null | undefined, nowMs: number) {
    this.update(nowMs);
    if (this.currentPhase !== "idle") return false;
    this.currentTool = normalizeWeaponTool(tool);
    this.currentPhase = "windup";
    this.phaseStartedAt = nowMs;
    this.activeStartedAt = nowMs + WEAPON_TIMINGS[this.currentTool].windupMs;
    this.activeEndsAt = this.activeStartedAt + WEAPON_TIMINGS[this.currentTool].activeMs;
    this.cooldownEndsAt = this.activeEndsAt + WEAPON_TIMINGS[this.currentTool].cooldownMs;
    this.swingCounter += 1;
    return true;
  }

  update(nowMs: number) {
    if (this.currentPhase === "idle") return;
    if (nowMs < this.activeStartedAt) {
      this.currentPhase = "windup";
      return;
    }
    if (nowMs < this.activeEndsAt) {
      this.currentPhase = "active";
      return;
    }
    if (nowMs < this.cooldownEndsAt) {
      this.currentPhase = "cooldown";
      return;
    }
    this.currentPhase = "idle";
  }

  movementScale(nowMs: number) {
    this.update(nowMs);
    if (this.currentPhase === "windup" || this.currentPhase === "active") {
      return WEAPON_TIMINGS[this.currentTool].movementScale;
    }
    return 1;
  }

  activeHitbox(position: Position, facing: Direction, nowMs: number) {
    this.update(nowMs);
    if (this.currentPhase !== "active") return null;
    return buildWeaponHitbox(position, facing, this.currentTool);
  }

  previewHitbox(position: Position, facing: Direction) {
    return buildWeaponHitbox(position, facing, this.currentTool);
  }

  readout(nowMs: number): WeaponReadout {
    this.update(nowMs);
    const timing = WEAPON_TIMINGS[this.currentTool];
    const cooldownTotal = timing.cooldownMs;
    const cooldownMsRemaining = this.currentPhase === "cooldown"
      ? Math.max(0, Math.round(this.cooldownEndsAt - nowMs))
      : this.currentPhase === "windup" || this.currentPhase === "active"
        ? Math.max(0, Math.round(this.cooldownEndsAt - this.activeEndsAt))
        : 0;
    return {
      phase: this.currentPhase,
      tool: this.currentTool,
      label: timing.label,
      canSwing: this.currentPhase === "idle",
      active: this.currentPhase === "active",
      windupMsRemaining: this.currentPhase === "windup" ? Math.max(0, Math.round(this.activeStartedAt - nowMs)) : 0,
      activeMsRemaining: this.currentPhase === "active" ? Math.max(0, Math.round(this.activeEndsAt - nowMs)) : 0,
      cooldownMsRemaining,
      cooldownRatio: cooldownTotal <= 0 ? 0 : clamp(cooldownMsRemaining / cooldownTotal, 0, 1),
      movementScale: this.movementScale(nowMs),
      swingId: this.swingCounter
    };
  }
}
