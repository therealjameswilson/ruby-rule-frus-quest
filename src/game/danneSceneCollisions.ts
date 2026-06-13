import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./constants";
import { DANNE_MAP_ASSETS } from "./danneAtlas";
import type { Interactable } from "./types";

export type DanneMapSceneKey = (typeof DANNE_MAP_ASSETS)[number]["sceneKey"];

export type DanneSceneInteractionAction =
  | "return-office"
  | "save-point"
  | "boss-trigger"
  | "witness-table"
  | "nara-stacks-note"
  | "cipher-machine";

export interface DanneRectDefinition {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface DannePolygonDefinition {
  points: readonly { x: number; y: number }[];
  label: string;
}

export interface DanneSceneInteractionDefinition {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  kind: Interactable["kind"];
  action: DanneSceneInteractionAction;
  accent: string;
}

export interface DannePatrolRouteDefinition {
  id: string;
  points: readonly { x: number; y: number }[];
}

export interface DanneSceneGeometry {
  sceneKey: DanneMapSceneKey;
  displayName: string;
  objective: string;
  musicScene: string;
  spawn: { x: number; y: number };
  exitTarget: string;
  exitLabel: string;
  walkable: DannePolygonDefinition;
  solids: readonly DanneRectDefinition[];
  interactions: readonly DanneSceneInteractionDefinition[];
  visibleEntities: readonly string[];
  patrolRoutes?: readonly DannePatrolRouteDefinition[];
}

const mapWalkable = (label: string): DannePolygonDefinition => ({
  label,
  points: [
    { x: 16, y: 38 },
    { x: GAME_WIDTH - 16, y: 38 },
    { x: GAME_WIDTH - 16, y: GAME_HEIGHT - 18 },
    { x: 16, y: GAME_HEIGHT - 18 }
  ]
});

export const DANNE_SCENE_GEOMETRY: Record<DanneMapSceneKey, DanneSceneGeometry> = {
  CherryBlossomGardenScene: {
    sceneKey: "CherryBlossomGardenScene",
    displayName: "Cherry Blossom Garden",
    objective: "Cherry Blossom Garden: rest and save the expedition.",
    musicScene: "GuideScene",
    spawn: { x: 128, y: 190 },
    exitTarget: "OfficeScene",
    exitLabel: "Office Back Door",
    walkable: mapWalkable("garden paths"),
    solids: [
      { x: 36, y: 78, width: 54, height: 42, label: "koi pond" },
      { x: 102, y: 48, width: 54, height: 36, label: "garden pavilion" },
      { x: 170, y: 72, width: 42, height: 32, label: "flag terrace" },
      { x: 28, y: 142, width: 42, height: 34, label: "cherry grove" },
      { x: 184, y: 146, width: 36, height: 34, label: "stone lantern hedge" }
    ],
    interactions: [
      {
        id: "garden-save-point",
        label: "Save Point",
        x: 128,
        y: 158,
        radius: 24,
        kind: "terminal",
        action: "save-point",
        accent: PALETTE.goldStamp
      },
      {
        id: "garden-return",
        label: "Return to Office",
        x: 128,
        y: 218,
        radius: 26,
        kind: "door",
        action: "return-office",
        accent: PALETTE.creamPaper
      }
    ],
    visibleEntities: ["Save Point", "Office Back Door", "Koi Pond", "Cherry Pavilion"]
  },
  BlackVaultLairScene: {
    sceneKey: "BlackVaultLairScene",
    displayName: "Black Vault Lair",
    objective: "Black Vault Lair: inspect the dormant DANN-E core.",
    musicScene: "EndingScene",
    spawn: { x: 128, y: 202 },
    exitTarget: "OfficeScene",
    exitLabel: "Vault Return Seal",
    walkable: mapWalkable("black vault floor"),
    solids: [
      { x: 95, y: 54, width: 66, height: 50, label: "DANN-E altar" },
      { x: 40, y: 74, width: 34, height: 96, label: "left lava fissure" },
      { x: 182, y: 74, width: 34, height: 96, label: "right lava fissure" },
      { x: 82, y: 148, width: 18, height: 28, label: "obsidian rubble" },
      { x: 156, y: 148, width: 18, height: 28, label: "obsidian rubble" }
    ],
    interactions: [
      {
        id: "vault-core-trigger",
        label: "DANN-E Core Trigger",
        x: 128,
        y: 122,
        radius: 28,
        kind: "terminal",
        action: "boss-trigger",
        accent: PALETTE.classNetRed
      },
      {
        id: "vault-return",
        label: "Return to Office",
        x: 128,
        y: 220,
        radius: 24,
        kind: "door",
        action: "return-office",
        accent: PALETTE.creamPaper
      }
    ],
    visibleEntities: ["DANN-E Core Trigger", "Vault Return Seal", "Obsidian Altar"]
  },
  SenateHearingChamberScene: {
    sceneKey: "SenateHearingChamberScene",
    displayName: "Senate Hearing Chamber",
    objective: "Senate Hearing Chamber: review the witness table record.",
    musicScene: "ReferralVaultScene",
    spawn: { x: 128, y: 205 },
    exitTarget: "OfficeScene",
    exitLabel: "Office Corridor",
    walkable: mapWalkable("hearing chamber carpet"),
    solids: [
      { x: 26, y: 46, width: 204, height: 38, label: "committee dais" },
      { x: 46, y: 94, width: 36, height: 32, label: "left counsel table" },
      { x: 174, y: 94, width: 36, height: 32, label: "right counsel table" },
      { x: 28, y: 142, width: 42, height: 30, label: "left gallery benches" },
      { x: 186, y: 142, width: 42, height: 30, label: "right gallery benches" }
    ],
    interactions: [
      {
        id: "senate-witness-table",
        label: "Witness Table",
        x: 128,
        y: 139,
        radius: 28,
        kind: "document",
        action: "witness-table",
        accent: PALETTE.goldStamp
      },
      {
        id: "senate-return",
        label: "Return to Office",
        x: 128,
        y: 220,
        radius: 24,
        kind: "door",
        action: "return-office",
        accent: PALETTE.creamPaper
      }
    ],
    visibleEntities: ["Witness Table", "Committee Dais", "Office Corridor"]
  },
  NaraStacksScene: {
    sceneKey: "NaraStacksScene",
    displayName: "NARA Stacks",
    objective: "NARA Stacks: read the classified stack note.",
    musicScene: "ArchiveScene",
    spawn: { x: 128, y: 205 },
    exitTarget: "OfficeScene",
    exitLabel: "Archive Stairwell",
    walkable: mapWalkable("classified stack aisles"),
    solids: [
      { x: 24, y: 52, width: 54, height: 28, label: "shelf row one" },
      { x: 102, y: 52, width: 54, height: 28, label: "shelf row two" },
      { x: 178, y: 52, width: 54, height: 28, label: "shelf row three" },
      { x: 24, y: 112, width: 54, height: 28, label: "shelf row four" },
      { x: 102, y: 112, width: 54, height: 28, label: "shelf row five" },
      { x: 178, y: 112, width: 54, height: 28, label: "shelf row six" },
      { x: 36, y: 168, width: 42, height: 26, label: "sealed cartons" },
      { x: 178, y: 168, width: 42, height: 26, label: "sealed cartons" }
    ],
    interactions: [
      {
        id: "stacks-note",
        label: "Stack Control Note",
        x: 128,
        y: 92,
        radius: 24,
        kind: "document",
        action: "nara-stacks-note",
        accent: PALETTE.terminalCyan
      },
      {
        id: "stacks-return",
        label: "Return to Office",
        x: 128,
        y: 220,
        radius: 24,
        kind: "door",
        action: "return-office",
        accent: PALETTE.creamPaper
      }
    ],
    visibleEntities: ["Stack Control Note", "Archive Stairwell", "Patrol Route Placeholders"],
    patrolRoutes: [
      { id: "drone-route-a", points: [{ x: 88, y: 92 }, { x: 168, y: 92 }] },
      { id: "drone-route-b", points: [{ x: 88, y: 152 }, { x: 168, y: 152 }] },
      { id: "drone-route-c", points: [{ x: 24, y: 92 }, { x: 24, y: 184 }] },
      { id: "drone-route-d", points: [{ x: 232, y: 92 }, { x: 232, y: 184 }] }
    ]
  },
  EmbassyCableRoomScene: {
    sceneKey: "EmbassyCableRoomScene",
    displayName: "Embassy Cable Room",
    objective: "Embassy Cable Room: inspect the bronze cipher machine.",
    musicScene: "NetworkScene",
    spawn: { x: 128, y: 204 },
    exitTarget: "OfficeScene",
    exitLabel: "Office Cable Door",
    walkable: mapWalkable("cable-room floor"),
    solids: [
      { x: 24, y: 58, width: 54, height: 34, label: "left teletype bank" },
      { x: 178, y: 58, width: 54, height: 34, label: "right teletype bank" },
      { x: 96, y: 92, width: 64, height: 34, label: "bronze cipher machine" },
      { x: 34, y: 152, width: 42, height: 28, label: "cable crates" },
      { x: 184, y: 142, width: 36, height: 46, label: "steel door casing" }
    ],
    interactions: [
      {
        id: "cipher-machine",
        label: "Bronze Cipher Machine",
        x: 128,
        y: 136,
        radius: 28,
        kind: "terminal",
        action: "cipher-machine",
        accent: PALETTE.terminalCyan
      },
      {
        id: "embassy-return",
        label: "Return to Office",
        x: 128,
        y: 220,
        radius: 24,
        kind: "door",
        action: "return-office",
        accent: PALETTE.creamPaper
      }
    ],
    visibleEntities: ["Bronze Cipher Machine", "Office Cable Door", "Steel Door", "World Clocks"]
  }
} as const;
