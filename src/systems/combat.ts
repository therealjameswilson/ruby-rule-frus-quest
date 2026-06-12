import Phaser from "phaser";
import type { Direction } from "../game/constants";
import type { Position } from "../game/types";

export const PLAYER_ACTION_HITBOX_MS = 160;
export const PLAYER_IFRAME_MS = 900;
export const PLAYER_HURT_MS = 260;

export interface HitboxReadout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function buildDirectionalHitbox(position: Position, facing: Direction) {
  const x = Math.round(position.x);
  const y = Math.round(position.y);
  if (facing === "north") return new Phaser.Geom.Rectangle(x - 9, y - 26, 18, 18);
  if (facing === "south") return new Phaser.Geom.Rectangle(x - 9, y + 8, 18, 18);
  if (facing === "west") return new Phaser.Geom.Rectangle(x - 25, y - 8, 18, 18);
  return new Phaser.Geom.Rectangle(x + 7, y - 8, 18, 18);
}

export function toHitboxReadout(hitbox: Phaser.Geom.Rectangle | null): HitboxReadout | null {
  if (!hitbox) return null;
  return {
    x: Math.round(hitbox.x),
    y: Math.round(hitbox.y),
    width: Math.round(hitbox.width),
    height: Math.round(hitbox.height)
  };
}
