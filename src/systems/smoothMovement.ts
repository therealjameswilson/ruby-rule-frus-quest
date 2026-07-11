import type Phaser from "phaser";
import type { Direction } from "../game/constants";
import type { Position } from "../game/types";
import { setPixelPosition, snapPixel } from "./pixelPerfect";

export function approach(current: number, target: number, maxDelta: number) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

export interface MovementVector {
  x: number;
  y: number;
  moving: boolean;
}

// Turn a raw -1/0/1 input pair into a movement vector. Diagonals are normalised
// to Math.SQRT1_2 so pressing two directions does not travel faster than one -
// the ALTTP invariant that diagonal speed equals cardinal speed.
export function resolveMovementVector(dir: { x: number; y: number }): MovementVector {
  const moving = dir.x !== 0 || dir.y !== 0;
  if (dir.x !== 0 && dir.y !== 0) {
    const diagonalScale = Math.SQRT1_2;
    return { x: dir.x * diagonalScale, y: dir.y * diagonalScale, moving };
  }
  return { x: dir.x, y: dir.y, moving };
}

// Pick the cardinal facing for the current frame. Facing is "sticky": while the
// direction the player already faces is still being held it is kept, so adding a
// second direction to make a diagonal does not snap the sprite (and therefore
// the sword/interaction reach) sideways. Only when the held facing is released
// does it adopt the remaining direction, matching the last cardinal the player
// actually intended. A fresh diagonal pressed from rest defaults to horizontal.
export function resolveFacing(previous: Direction, dir: { x: number; y: number }): Direction {
  if (dir.x === 0 && dir.y === 0) return previous;
  const horizontal: Direction | null = dir.x < 0 ? "west" : dir.x > 0 ? "east" : null;
  const vertical: Direction | null = dir.y < 0 ? "north" : dir.y > 0 ? "south" : null;
  if (previous === horizontal || previous === vertical) return previous;
  return horizontal ?? vertical ?? previous;
}

export function frameDeltaSeconds(deltaMs: number) {
  return Math.min(Math.max(deltaMs, 0), 50) / 1000;
}

export function snapRenderedPosition(position: Position): Position {
  return { x: snapPixel(position.x), y: snapPixel(position.y) };
}

export function setRenderedPosition(
  object: Phaser.GameObjects.Components.Transform,
  x: number,
  y: number
): Position {
  const renderPosition = snapRenderedPosition({ x, y });
  setPixelPosition(object, renderPosition.x, renderPosition.y);
  return renderPosition;
}
