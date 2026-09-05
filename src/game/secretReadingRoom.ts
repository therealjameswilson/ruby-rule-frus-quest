import type { GameState } from "./state";
import type { ProcessItemId } from "./constants";
import type { DanneRectDefinition } from "./danneSceneCollisions";
import type { Position } from "./types";

export const HIDDEN_READING_ROOM_SCENE = "HiddenReadingRoomScene" as const;
export const HIDDEN_READING_ROOM_DISCOVERED_FLAG = "hiddenReadingRoomDiscovered" as const;
export const HIDDEN_FIRST_EDITION_FOUND_FLAG = "hiddenFirstEditionFound" as const;
export const HIDDEN_FIRST_EDITION_LABEL = "First Edition FRUS Volume" as const;
export const READING_PASSAGE = {
  shelfLabel: "shelf row three",
  opening: { x: 188, y: 52, width: 32, height: 28 },
  returnSpawn: { x: 204, y: 94 }
} as const;

type Hitbox = { x: number; y: number; width: number; height: number };

export function canRevealReadingPassage(discovered: boolean, hasFolder: boolean, tool: ProcessItemId | null, hitbox: Hitbox | null) {
  if (discovered || !hasFolder || tool !== "review_folder" || !hitbox) return false;
  const opening = READING_PASSAGE.opening;
  return hitbox.x < opening.x + opening.width && hitbox.x + hitbox.width > opening.x
    && hitbox.y < opening.y + opening.height && hitbox.y + hitbox.height > opening.y;
}

export function readingPassageSolids(solids: readonly DanneRectDefinition[], opened: boolean): readonly DanneRectDefinition[] {
  if (!opened) return solids;
  return solids.flatMap((solid) => solid.label === READING_PASSAGE.shelfLabel ? [
    { ...solid, width: READING_PASSAGE.opening.x - solid.x },
    { ...solid, x: READING_PASSAGE.opening.x + READING_PASSAGE.opening.width,
      width: solid.x + solid.width - READING_PASSAGE.opening.x - READING_PASSAGE.opening.width }
  ] : [solid]);
}

export function insideReadingPassage(position: Position) {
  return position.x >= 196 && position.x <= 212 && position.y >= 52 && position.y <= 80;
}

export function readingPassageLabel(discovered: boolean, hasFolder: boolean) {
  return discovered ? "Reading Room" : hasFolder ? "Unlisted Shelf" : "Faint Wall Seam";
}

export function hiddenReadingRoomDiscovered(state: Pick<GameState, "sceneProgress">) {
  return Boolean(state.sceneProgress[HIDDEN_READING_ROOM_DISCOVERED_FLAG]);
}

export function hiddenFirstEditionFound(state: Pick<GameState, "sceneProgress" | "inventory">) {
  return Boolean(state.sceneProgress[HIDDEN_FIRST_EDITION_FOUND_FLAG])
    || state.inventory.includes(HIDDEN_FIRST_EDITION_LABEL);
}

export function hiddenFirstEditionBonusLabel(state: Pick<GameState, "sceneProgress" | "inventory">) {
  return `Hidden first edition: ${hiddenFirstEditionFound(state) ? "yes" : "no"}`;
}
