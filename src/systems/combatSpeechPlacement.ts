import { GAME_WIDTH } from "../game/constants";
import type { Position } from "../game/types";
import { wrapChoiceText } from "./choiceLayout";

export const COMBAT_SPEECH_WIDTH = 96;
export const COMBAT_SPEECH_BOUNDS = { left: 6, right: GAME_WIDTH - 6, top: 42, bottom: 190 };

export function combatSpeechText(message: string) {
  const text = wrapChoiceText(`DANN-E: ${message}`, 22, 2);
  return { text, height: text.split("\n").length * 8 + 6 };
}

interface Box extends Position { width: number; height: number }

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function combatSpeechPlacement(enemy: Position, player: Position, height: number): Position | null {
  const width = COMBAT_SPEECH_WIDTH;
  const bounds = COMBAT_SPEECH_BOUNDS;
  const x = Math.round(Math.max(bounds.left, Math.min(bounds.right - width, enemy.x - width / 2)));
  const sideY = Math.round(Math.max(bounds.top, Math.min(bounds.bottom - height, enemy.y - 24)));
  const enemyBox = { x: enemy.x - 14, y: enemy.y - 35, width: 28, height: 50 };
  const playerBox = { x: player.x - 18, y: player.y - 44, width: 36, height: 52 };
  const candidates = [
    { x, y: Math.round(enemyBox.y - height - 4) },
    { x, y: Math.round(enemyBox.y + enemyBox.height + 4) },
    { x: Math.round(enemyBox.x - width - 4), y: sideY },
    { x: Math.round(enemyBox.x + enemyBox.width + 4), y: sideY }
  ];
  // Silence is preferable to covering the player, the enemy, or reserved UI.
  return candidates.find((candidate) => {
    const box = { ...candidate, width, height };
    return box.x >= bounds.left && box.x + width <= bounds.right
      && box.y >= bounds.top && box.y + height <= bounds.bottom
      && !overlaps(box, playerBox) && !overlaps(box, enemyBox);
  }) ?? null;
}
