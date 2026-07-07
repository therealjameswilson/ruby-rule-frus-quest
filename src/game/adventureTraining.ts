import { ITEM_REGISTRY } from "./constants";
import type { Direction, ProcessItemId, RoomType } from "./constants";
import {
  firstHourBeat,
  firstHourSegmentForBeat,
  firstHourTrainingDrillForBeat,
  firstHourTrainingDrillForMinute
} from "./firstHourTraining";
import type {
  FirstHourTrainingBeatId,
  FirstHourTrainingDrill,
  FirstHourTrainingDrillId,
  FirstHourTrainingPhaseId
} from "./firstHourTraining";
import type { ChoiceOption, GameMode } from "./types";

const DIRECTION_ORDER: readonly Direction[] = ["north", "east", "south", "west"];

export interface AdventureTrainingRoomState {
  currentRoomId: string;
  roomTitle: string;
  roomType?: RoomType;
  visitedRoomIds: readonly string[];
  exits: Partial<Record<Direction, string>>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, ProcessItemId | string>>;
}

export interface AdventureTrainingDungeonState {
  displayName: string;
  smallKeys: number;
  smallKeysRequired: number;
  bigKeyHeld: boolean;
  bossDefeated: boolean;
  mapRevealed: boolean;
}

export interface AdventureTrainingInput {
  mode: GameMode;
  objective?: string;
  latestMessage?: string;
  finalGatePublished?: boolean;
  nearestInteractable?: string | null;
  activeDialog?: { speaker: string; text: string } | null;
  currentChoice?: { title: string; options: readonly ChoiceOption[] } | null;
  roomTraversal?: AdventureTrainingRoomState | null;
  dungeon?: AdventureTrainingDungeonState | null;
}

export interface AdventureTrainingCue {
  verb: "READ" | "CHOOSE" | "ACT" | "EXPLORE" | "UNLOCK" | "KEY" | "MAP" | "BOSS" | "RETURN" | "GOAL";
  text: string;
  detail: string;
  sourceBeatId: FirstHourTrainingBeatId;
  phase: FirstHourTrainingPhaseId;
  phaseLabel: string;
  drillId: FirstHourTrainingDrillId;
  drillLabel: string;
  drillMinuteRange: string;
  drillObjective: string;
}

export function getAdventureTrainingCue(input: AdventureTrainingInput): AdventureTrainingCue {
  if (input.finalGatePublished) {
    const beat = firstHourBeat("reward_return");
    return {
      verb: "RETURN",
      text: beat.cueText,
      detail: "Published FRUS cover changed the world: public record complete.",
      ...trainingMeta(beat.id, firstHourTrainingDrillForMinute(59))
    };
  }

  if (input.mode === "choice" && input.currentChoice) {
    const optionKeys = input.currentChoice.options.map((option) => option.key).join("/");
    return {
      verb: "CHOOSE",
      text: `CHOOSE ${optionKeys}`,
      detail: shortText(input.currentChoice.title, 52),
      ...trainingMeta("room_readability")
    };
  }

  if (input.mode === "dialog" && input.activeDialog) {
    return {
      verb: "READ",
      text: "A ADVANCE",
      detail: shortText(input.activeDialog.speaker, 52),
      ...trainingMeta("room_readability")
    };
  }

  if (input.nearestInteractable) {
    return {
      verb: "ACT",
      text: `A ${shortText(input.nearestInteractable.toUpperCase(), 18)}`,
      detail: "Use the nearest visible object.",
      ...trainingMeta("room_readability")
    };
  }

  const roomCue = input.roomTraversal ? roomTrainingCue(input.roomTraversal, input.dungeon ?? null) : null;
  if (roomCue) return roomCue;

  const objective = cueObjective(input.latestMessage || input.objective || "Explore the workflow.");
  return {
    verb: "GOAL",
    text: `NEXT ${objective}`,
    detail: objective,
    ...trainingMeta("standards_pressure")
  };
}

function roomTrainingCue(
  room: AdventureTrainingRoomState,
  dungeon: AdventureTrainingDungeonState | null
): AdventureTrainingCue | null {
  if (dungeon?.bossDefeated) {
    const beat = firstHourBeat("reward_return");
    return {
      verb: "RETURN",
      text: beat.cueText,
      detail: `Use the ${dungeon.displayName} reward to open the next FRUS route.`,
      ...trainingMeta(beat.id)
    };
  }

  const lockedDirections = DIRECTION_ORDER.filter((direction) => room.lockedExits?.[direction]);
  const smallKeyLockedDirection = firstDirection(lockedDirections.filter((direction) => !room.requiredItems?.[direction]));
  const processLockedDirection = firstDirection(lockedDirections.filter((direction) => room.requiredItems?.[direction]));
  if (smallKeyLockedDirection && dungeon && dungeon.smallKeys > 0) {
    const beat = firstHourBeat("small_key");
    return {
      verb: "KEY",
      text: beat.cueText,
      detail: `${directionLabel(smallKeyLockedDirection)} gate can open with a chapter key.`,
      ...trainingMeta(beat.id)
    };
  }

  if (dungeon && dungeon.bigKeyHeld && !dungeon.bossDefeated && room.roomType === "boss") {
    const beat = firstHourBeat("boss_gate");
    return {
      verb: "BOSS",
      text: beat.cueText,
      detail: `Resolve the hardest ${dungeon.displayName} review hurdle.`,
      ...trainingMeta(beat.id)
    };
  }

  if (dungeon && !dungeon.mapRevealed && dungeon.smallKeysRequired > 0) {
    const beat = firstHourBeat("map_literacy");
    return {
      verb: "MAP",
      text: beat.cueText,
      detail: `Reveal contested-equity routes in ${dungeon.displayName}.`,
      ...trainingMeta(beat.id)
    };
  }

  const unvisitedExit = firstDirection(DIRECTION_ORDER.filter((direction) => {
    const target = room.exits[direction];
    return Boolean(target && !room.visitedRoomIds.includes(target));
  }));
  if (unvisitedExit) {
    const beat = firstHourBeat("unvisited_exit");
    return {
      verb: "EXPLORE",
      text: `${beat.cueText} ${directionLabel(unvisitedExit)}`,
      detail: `New room from ${room.roomTitle}.`,
      ...trainingMeta(beat.id)
    };
  }

  const lockedDirection = processLockedDirection ?? smallKeyLockedDirection;
  if (lockedDirection) {
    const requiredItem = room.requiredItems?.[lockedDirection];
    const requiredLabel = requiredItemLabel(requiredItem);
    const beat = firstHourBeat("visible_gate");
    return {
      verb: "UNLOCK",
      text: `${beat.cueText}: ${shortText(requiredLabel.toUpperCase(), 12)}`,
      detail: `${directionLabel(lockedDirection)} gate: ${room.lockedExits?.[lockedDirection] ?? requiredLabel}.`,
      ...trainingMeta(beat.id)
    };
  }

  const anyExit = firstDirection(DIRECTION_ORDER.filter((direction) => room.exits[direction]));
  if (anyExit) {
    return {
      verb: "EXPLORE",
      text: `SEARCH ${directionLabel(anyExit)}`,
      detail: `All known exits in ${room.roomTitle} have been visited.`,
      ...trainingMeta("unvisited_exit")
    };
  }

  return null;
}

function trainingMeta(sourceBeatId: FirstHourTrainingBeatId, drillOverride?: FirstHourTrainingDrill) {
  const segment = firstHourSegmentForBeat(sourceBeatId);
  const drill = drillOverride ?? firstHourTrainingDrillForBeat(sourceBeatId);
  return {
    sourceBeatId,
    phase: segment.id,
    phaseLabel: segment.label,
    drillId: drill.id,
    drillLabel: drill.label,
    drillMinuteRange: `${drill.minutes[0]}-${drill.minutes[1]}`,
    drillObjective: drill.frusTrainingObjective
  };
}

function firstDirection(directions: readonly Direction[]) {
  return directions[0] ?? null;
}

function directionLabel(direction: Direction) {
  if (direction === "north") return "N";
  if (direction === "south") return "S";
  if (direction === "east") return "E";
  return "W";
}

function requiredItemLabel(itemId: ProcessItemId | string | undefined) {
  const item = ITEM_REGISTRY.find((candidate) => candidate.id === itemId);
  if (item) return item.shortLabel;
  return itemId ?? "TOOL";
}

function shortText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function cueObjective(value: string) {
  return shortText(value.replace(/^(?:next|goal)\s*[:>-]?\s+/i, ""), 52);
}
