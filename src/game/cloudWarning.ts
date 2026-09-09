import { bossSpreadTargets, DANNE_CLOUD_SPREAD } from "./danneBossCombat";
import type { Position } from "./types";

// Rasterize once when the attack locks; no fractional strokes or frame allocations.
function pixelLine(from: Position, to: Position): Position[] {
  let x = Math.round(from.x), y = Math.round(from.y);
  const endX = Math.round(to.x), endY = Math.round(to.y);
  const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
  const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
  let error = dx + dy;
  const pixels: Position[] = [];
  while (true) {
    pixels.push({ x, y });
    if (x === endX && y === endY) return pixels;
    const twice = error * 2;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
  }
}

export function cloudWarningGeometry(source: Position, target: Position) {
  const muzzle = { x: source.x, y: source.y - 10 };
  return bossSpreadTargets(source, target, DANNE_CLOUD_SPREAD).map(endpoint => {
    const dx = endpoint.x - muzzle.x, dy = endpoint.y - muzzle.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / length, uy = dy / length;
    const tip = { x: muzzle.x + dx * 0.72, y: muzzle.y + dy * 0.72 };
    const wing = (side: number) => ({ x: tip.x - ux * 6 - uy * 4 * side, y: tip.y - uy * 6 + ux * 4 * side });
    return { path: pixelLine(muzzle, endpoint), arrow: [...pixelLine(wing(-1), tip), ...pixelLine(tip, wing(1))] };
  });
}
