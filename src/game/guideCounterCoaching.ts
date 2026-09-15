import type { Direction } from "./constants";
import { GUIDE_COUNTER, type GuideCounterReadout } from "./guideCounterTraining";
import type { Position } from "./types";
import { buildWeaponHitbox, WEAPON_TIMINGS } from "../systems/weaponState";

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
  canSwing: boolean
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
  const vx = aimX / length * GUIDE_COUNTER.speed;
  const vy = aimY / length * GUIDE_COUNTER.speed;
  const hitbox = buildWeaponHitbox(player, facing, "citation_stamp");
  const timing = WEAPON_TIMINGS.citation_stamp;
  let entry = timing.windupMs / 1000;
  let exit = (timing.windupMs + timing.activeMs) / 1000;
  // Slab intersection: include the bolt's six-pixel radius on both axes.
  for (const [position, speed, min, max] of [
    [lesson.bolt.x, vx, hitbox.x - 6, hitbox.x + hitbox.width + 6],
    [lesson.bolt.y, vy, hitbox.y - 6, hitbox.y + hitbox.height + 6]
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
