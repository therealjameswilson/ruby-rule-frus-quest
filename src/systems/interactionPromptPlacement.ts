import { GAME_WIDTH } from "../game/constants";
import type { Interactable } from "../game/types";

// Short verb shown on the prompt per interactable kind. Keeps the floating cue
// readable at 8-bit scale and tells the player what the A button will do.
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

// Pure placement math: given the nearest interactable, decide whether the prompt
// shows, what it reads, and where it floats so it stays on-screen and above the
// target rather than under the player's sprite. Kept free of Phaser so it can be
// unit-tested without standing up a scene (importing Phaser in the test env
// touches `navigator` and crashes the suite).
export function computePromptPlacement(
  nearest: Interactable | null,
  bounds: PromptPlacementBounds = DEFAULT_PROMPT_BOUNDS
): PromptPlacement {
  if (!nearest) {
    return { visible: false, label: "", verb: "", x: 0, y: 0, ringX: 0, ringY: 0 };
  }
  const verb = promptVerbForKind(nearest.kind);
  const desiredY = nearest.y - 22;
  const bottom = bounds.bottom ?? Number.POSITIVE_INFINITY;
  return {
    visible: true,
    label: nearest.label.toUpperCase(),
    verb,
    x: clamp(nearest.x, bounds.left, bounds.right),
    y: clamp(desiredY, bounds.top, Math.max(bounds.top, bottom)),
    ringX: nearest.x,
    ringY: nearest.y
  };
}
