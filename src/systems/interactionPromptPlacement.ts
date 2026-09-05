import { GAME_WIDTH } from "../game/constants";
import type { Interactable } from "../game/types";

// Short verb shown on the prompt per interactable kind. Keeps the floating cue
// readable at 8-bit scale and tells the player what the primary action will do.
const KIND_VERB: Record<Interactable["kind"], string> = {
  npc: "TALK",
  terminal: "USE",
  poster: "READ",
  document: "CHECK",
  door: "ENTER",
  manuscript: "READ",
  enemy: "FACE"
};

export function promptVerbForKind(kind: Interactable["kind"]): string {
  return KIND_VERB[kind] ?? "ACT";
}

export interface PromptPlacement {
  visible: boolean;
  label: string;
  verb: string;
  /** Anchor X for the floating prompt (clamped to stay on-screen). */
  x: number;
  /** Anchor Y for the floating prompt (clamped away from reserved HUD/map bands). */
  y: number;
  /** World position of the highlight ring (the interactable itself). */
  ringX: number;
  ringY: number;
}

export interface PromptPlacementBounds {
  left: number;
  right: number;
  top: number;
  bottom?: number;
}

export const DEFAULT_PROMPT_BOUNDS: PromptPlacementBounds = {
  left: 36,
  right: GAME_WIDTH - 36,
  top: 50
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function fitPromptText(value: string, measure: (text: string) => number, maxWidth = GAME_WIDTH - 36) {
  if (measure(value) <= maxWidth) return value;
  let short = value;
  while (short.length > 0 && measure(`${short}...`) > maxWidth) short = short.slice(0, -1);
  return `${short.trimEnd()}...`;
}

// Pure placement math: given the nearest interactable, decide whether the prompt
// shows, what it reads, and where it floats so it stays on-screen and above the
// target rather than under the player's sprite. Kept free of Phaser so it can be
// unit-tested without standing up a scene (importing Phaser in the test env
// touches `navigator` and crashes the suite).
export function computePromptPlacement(
  nearest: Interactable | null,
  bounds: PromptPlacementBounds = DEFAULT_PROMPT_BOUNDS,
  panelWidth = 0
): PromptPlacement {
  if (!nearest) {
    return { visible: false, label: "", verb: "", x: 0, y: 0, ringX: 0, ringY: 0 };
  }
  const verb = promptVerbForKind(nearest.kind);
  // Character art is 32x48, so leave enough clearance for the player's head
  // when they stand immediately below an object or workstation.
  const desiredY = nearest.y - 40;
  const bottom = bounds.bottom ?? Number.POSITIVE_INFINITY;
  const halfWidth = Math.min(GAME_WIDTH - 16, Math.max(0, panelWidth)) / 2;
  const left = Math.max(bounds.left, halfWidth + 8);
  const right = Math.min(bounds.right, GAME_WIDTH - halfWidth - 8);
  return {
    visible: true,
    label: nearest.label.toUpperCase(),
    verb,
    x: left <= right ? clamp(nearest.x, left, right) : GAME_WIDTH / 2,
    y: clamp(desiredY, bounds.top, Math.max(bounds.top, bottom)),
    ringX: nearest.x,
    ringY: nearest.y
  };
}
