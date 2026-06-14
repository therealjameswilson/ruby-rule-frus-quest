import type Phaser from "phaser";
import type { Position } from "../game/types";
import { setPixelPosition, snapPixel } from "./pixelPerfect";

export function approach(current: number, target: number, maxDelta: number) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
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
