import type { AreaId, Direction } from "./constants";
import type { Position } from "./types";
import type { CameraReadout } from "../systems/CameraController";

export const WORLD_SCREEN_WIDTH = 256;
export const WORLD_SCREEN_HEIGHT = 224;
export const WORLD_HUD_HEIGHT = 16;
export const WORLD_TILE_SIZE = 16;

export type WorldObjectKind = "npc" | "terminal" | "poster" | "document" | "door";
export type SpawnPointKey = "center" | "entry" | "return" | Direction;
export type WorldScreenType = "overworld" | "interior";

export interface WorldTileDefinition {
  name: string;
  solid: boolean;
  palette: string;
}

export interface WorldObjectDefinition {
  id: string;
  label: string;
  kind: WorldObjectKind;
  x: number;
  y: number;
  texture?: string;
  solid?: boolean;
  grantsFlag?: string;
  grantsItem?: string;
  requiresFlag?: string;
  requiresFlags?: string[];
  requiresItem?: string;
  requiresItems?: string[];
  targetScreenId?: string;
  targetSpawn?: SpawnPointKey;
  dialog?: string[];
  lockedDialog?: string[];
  successDialog?: string[];
}

export interface WorldNpcDefinition {
  id: string;
  label: string;
  displayName?: string;
  role: string;
  x: number;
  y: number;
  facing?: Direction;
  texture?: string;
  spriteKey?: string;
  dialogueId?: string;
  questFlags?: string[];
}

export interface WorldNpcRegistryDefinition {
  id: string;
  displayName: string;
  role: string;
  spriteKey: string;
  homeScreenId: string;
  position: {
    tileX: number;
    tileY: number;
  };
  facing: Direction;
  dialogueId: string;
  questFlags: string[];
}

export interface WorldScreenDefinition {
  id: string;
  regionName: string;
  areaId: AreaId;
  screenType?: WorldScreenType;
  gridX: number;
  gridY: number;
  tileLayout: string[];
  exits: Partial<Record<Direction, string>>;
  exitRequirements?: Partial<Record<Direction, string[]>>;
  spawnPoints: Partial<Record<SpawnPointKey, Position>>;
  interactables: WorldObjectDefinition[];
  npcs: WorldNpcDefinition[];
  requiredFlags?: string[];
}

export interface WorldDoorDefinition {
  screenId: string;
  object: WorldObjectDefinition;
}

export interface WorldInteriorDefinition {
  doors: WorldDoorDefinition[];
  screens: WorldScreenDefinition[];
}

export interface WorldScreensDefinition {
  id: string;
  displayName: string;
  tileSize: number;
  screenWidthTiles: number;
  screenHeightTiles: number;
  gridWidth?: number;
  gridHeight?: number;
  viewport: {
    width: number;
    height: number;
    hudHeight: number;
  };
  startScreenId: string;
  startSpawn: SpawnPointKey;
  tileLegend: Record<string, WorldTileDefinition>;
  screens: WorldScreenDefinition[];
  questFlags: Record<string, boolean>;
}

export interface FrusOverworldState {
  currentRegion: string;
  currentAreaId: AreaId;
  currentScreenId: string;
  currentScreenX: number;
  currentScreenY: number;
  player: Position;
  inventory: string[];
  activeTool: string | null;
  questFlags: Record<string, boolean>;
  visitedScreenIds: string[];
  discoveredRegionNames: string[];
  debugRevealMap: boolean;
  pauseMapOpen: boolean;
  viewport: {
    width: number;
    height: number;
    hudHeight: number;
  };
  camera: CameraReadout | null;
}

export function screenKey(gridX: number, gridY: number) {
  return `${gridX},${gridY}`;
}

export function localToCanvas(local: Position) {
  return {
    x: local.x,
    y: WORLD_HUD_HEIGHT + local.y
  };
}

export function canvasToLocal(position: Position) {
  return {
    x: position.x,
    y: position.y - WORLD_HUD_HEIGHT
  };
}

export function screenBounds() {
  return {
    left: 8,
    right: WORLD_SCREEN_WIDTH - 8,
    top: WORLD_HUD_HEIGHT + 8,
    bottom: WORLD_HUD_HEIGHT + WORLD_SCREEN_HEIGHT - 8
  };
}

export function oppositeDirection(direction: Direction): Direction {
  if (direction === "north") return "south";
  if (direction === "south") return "north";
  if (direction === "east") return "west";
  return "east";
}

export function fallbackSpawnFor(direction: SpawnPointKey): Position {
  if (direction === "north") return { x: 128, y: 18 };
  if (direction === "south") return { x: 128, y: 210 };
  if (direction === "east") return { x: 238, y: 128 };
  if (direction === "west") return { x: 18, y: 128 };
  return { x: 128, y: 184 };
}

export function getScreenById(world: WorldScreensDefinition, screenId: string) {
  return world.screens.find((screen) => screen.id === screenId) ?? null;
}

export function getScreenAt(world: WorldScreensDefinition, gridX: number, gridY: number) {
  return world.screens.find((screen) => screen.gridX === gridX && screen.gridY === gridY) ?? null;
}

export function spawnFor(screen: WorldScreenDefinition, spawn: SpawnPointKey) {
  return localToCanvas(screen.spawnPoints[spawn] ?? screen.spawnPoints.center ?? fallbackSpawnFor(spawn));
}

export function defaultOverworldState(world: WorldScreensDefinition): FrusOverworldState {
  const screen = getScreenById(world, world.startScreenId) ?? world.screens[0];
  const player = spawnFor(screen, world.startSpawn);
  return {
    currentRegion: screen.regionName,
    currentAreaId: screen.areaId,
    currentScreenId: screen.id,
    currentScreenX: screen.gridX,
    currentScreenY: screen.gridY,
    player,
    inventory: [],
    activeTool: null,
    questFlags: { ...world.questFlags },
    visitedScreenIds: [screen.id],
    discoveredRegionNames: [screen.regionName],
    debugRevealMap: false,
    pauseMapOpen: false,
    viewport: { ...world.viewport },
    camera: null
  };
}
