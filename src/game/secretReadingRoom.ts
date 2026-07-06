import type { GameState } from "./state";

export const HIDDEN_READING_ROOM_SCENE = "HiddenReadingRoomScene" as const;
export const HIDDEN_READING_ROOM_DISCOVERED_FLAG = "hiddenReadingRoomDiscovered" as const;
export const HIDDEN_FIRST_EDITION_FOUND_FLAG = "hiddenFirstEditionFound" as const;
export const HIDDEN_FIRST_EDITION_LABEL = "First Edition FRUS Volume" as const;

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
