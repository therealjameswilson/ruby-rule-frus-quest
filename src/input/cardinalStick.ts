import type { CardinalDirection } from './InputState';

/** Retain a nearby cardinal direction at diagonal boundaries, never its opposite. */
export function cardinalStick(x: number, y: number, previous: CardinalDirection): CardinalDirection | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < 0.35) return null;
  const horizontal: CardinalDirection = x < 0 ? 'left' : 'right';
  const vertical: CardinalDirection = y < 0 ? 'up' : 'down';
  const absX = Math.abs(x), absY = Math.abs(y);
  if (absX > absY * 1.35) return horizontal;
  if (absY > absX * 1.35) return vertical;
  if (previous === horizontal || previous === vertical) return previous;
  return absX >= absY ? horizontal : vertical;
}
