import type { Direction } from "./constants";
import { GUIDE_COUNTER, type GuideCounterReadout } from "./guideCounterTraining";
import type { Position } from "./types";
import { buildWeaponHitbox, WEAPON_TIMINGS, type WeaponToolId } from "../systems/weaponState";

export type GuideCounterCue = "faceNorth" | "faceSouth" | "faceEast" | "faceWest"
  | "stepBack" | "wait" | "swing" | "recover" | "returned";

const FACE_CUES: Record<Direction, GuideCounterCue> = {
  north: "faceNorth", south: "faceSouth", east: "faceEast", west: "faceWest"
};

export function guideCounterFacing(lesson: GuideCounterReadout, player: Position): Direction {
  const source = lesson.bolt ?? GUIDE_COUNTER.source;
  const dx = source.x - player.x;
  const dy = source.y - player.y;
  return Math.abs(dx) > Math.abs(dy)
    ? dx < 0 ? "west" : "east"
    : dy < 0 ? "north" : "south";
}

// Predict only the lesson prompt. Actual returns still require the player's active hitbox.
export function guideCounterCue(
  lesson: GuideCounterReadout,
  player: Position,
  facing: Direction,
  canSwing: boolean,
  options: { tool?: WeaponToolId; velocity?: Position } = {}
): GuideCounterCue {
  if (lesson.phase === "returned" || lesson.phase === "complete") return "returned";
  const source = lesson.bolt ?? GUIDE_COUNTER.source;
  const dx = source.x - player.x;
  const dy = source.y - player.y;
  if (!lesson.bolt && Math.hypot(dx, dy) < 42) return "stepBack";
  const direction = guideCounterFacing(lesson, player);
  if (facing !== direction) return FACE_CUES[direction];
  if (!canSwing) return "recover";
  if (lesson.phase !== "incoming" || !lesson.bolt || !lesson.target) return "wait";

  const aimX = lesson.target.x - GUIDE_COUNTER.source.x;
  const aimY = lesson.target.y - (GUIDE_COUNTER.source.y + 10);
  const length = Math.hypot(aimX, aimY) || 1;
  const tool = options.tool ?? "citation_stamp";
  const timing = WEAPON_TIMINGS[tool];
  // Predict in the moving hero's frame, including the slowdown during a swing.
  const vx = aimX / length * GUIDE_COUNTER.speed - (options.velocity?.x ?? 0) * timing.movementScale;
  const vy = aimY / length * GUIDE_COUNTER.speed - (options.velocity?.y ?? 0) * timing.movementScale;
  const hitbox = buildWeaponHitbox(player, facing, tool);
  let entry = timing.windupMs / 1000;
  let exit = (timing.windupMs + timing.activeMs - 16) / 1000;
  // Keep a one-pixel and one-frame margin: rounded readouts must not advertise an edge-only hit.
  for (const [position, speed, min, max] of [
    [lesson.bolt.x, vx, hitbox.x - 5, hitbox.x + hitbox.width + 5],
    [lesson.bolt.y, vy, hitbox.y - 5, hitbox.y + hitbox.height + 5]
  ]) {
    if (Math.abs(speed) < 0.001) {
      if (position < min || position > max) return "wait";
      continue;
    }
    const a = (min - position) / speed;
    const b = (max - position) / speed;
    entry = Math.max(entry, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (entry > exit) return "wait";
  }
  return "swing";
}
