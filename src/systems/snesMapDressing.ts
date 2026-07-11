import Phaser from "phaser";
import type { GameplayMapKey } from "../assets/registry";
import { PALETTE } from "../game/constants";
import {
  FRUS_PRODUCTION_FLOOR_STEPS,
  GAMEPLAY_MAP_FLOW_STEPS,
  type FrusProductionFloorStep,
  type GameplayMapFlowStep
} from "../game/gameplayMapFlow";

type FitRectLike = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SnesMapDressingKind =
  | "door"
  | "npc"
  | "document"
  | "workstation"
  | "gate"
  | "frus_shelf"
  | "source_index"
  | "declass_gate"
  | "review_desk"
  | "vault_core"
  | "cable_machine"
  | "witness_table"
  | "street_sign"
  | "coffee"
  | "phase_marker";

export interface SnesMapDressingFeature {
  x: number;
  y: number;
  kind: SnesMapDressingKind;
  label: string;
  action?: string;
}

interface SnesMapDressingStyle {
  label: string;
  floorKey: string;
  solidKey: string;
  floorAlpha: number;
  solidAlpha: number;
  border: string;
}

interface DrawSnesMapDressingOptions {
  solids: Phaser.Geom.Rectangle[];
  features: SnesMapDressingFeature[];
}

const TILE = 16;
const MAX_SOLID_TILES = 180;

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

const MAP_STYLES: Record<GameplayMapKey, SnesMapDressingStyle> = {
  historian_office: {
    label: "SNES office floor, desks, and shelf blockers",
    floorKey: "snes-map-floor-office",
    solidKey: "snes-map-solid-desk",
    floorAlpha: 0.42,
    solidAlpha: 0.74,
    border: PALETTE.oldGold
  },
  nara_stacks: {
    label: "SNES archive dungeon shelves and catalog path",
    floorKey: "snes-map-floor-archive",
    solidKey: "snes-map-solid-shelf",
    floorAlpha: 0.44,
    solidAlpha: 0.78,
    border: PALETTE.bronze
  },
  foggy_bottom: {
    label: "SNES sidewalk and city-block collision cues",
    floorKey: "snes-map-floor-street",
    solidKey: "snes-map-solid-stone",
    floorAlpha: 0.32,
    solidAlpha: 0.58,
    border: PALETTE.stoneLight
  },
  west_wing: {
    label: "SNES marble room grid and secure-office blockers",
    floorKey: "snes-map-floor-marble",
    solidKey: "snes-map-solid-desk",
    floorAlpha: 0.38,
    solidAlpha: 0.68,
    border: PALETTE.goldStamp
  },
  black_vault: {
    label: "SNES ruby vault floor and black-stone barriers",
    floorKey: "snes-map-floor-vault",
    solidKey: "snes-map-solid-vault",
    floorAlpha: 0.48,
    solidAlpha: 0.82,
    border: PALETTE.classNetRed
  },
  frus_floor: {
    label: "SNES production-floor workstations and paths",
    floorKey: "snes-map-floor-office",
    solidKey: "snes-map-solid-desk",
    floorAlpha: 0.4,
    solidAlpha: 0.68,
    border: PALETTE.goldStamp
  },
  embassy: {
    label: "SNES compound pavers and gate blockers",
    floorKey: "snes-map-floor-garden",
    solidKey: "snes-map-solid-stone",
    floorAlpha: 0.34,
    solidAlpha: 0.62,
    border: PALETTE.plantLeafShade
  },
  capitol_hill: {
    label: "SNES hearing-room floor and bench blockers",
    floorKey: "snes-map-floor-marble",
    solidKey: "snes-map-solid-desk",
    floorAlpha: 0.4,
    solidAlpha: 0.7,
    border: PALETTE.goldStamp
  }
};

export function snesMapDressingReadout(mapKey: GameplayMapKey) {
  return MAP_STYLES[mapKey].label;
}

export function drawSnesMapDressing(
  scene: Phaser.Scene,
  mapKey: GameplayMapKey,
  fitRect: FitRectLike,
  options: DrawSnesMapDressingOptions
) {
  ensureSnesMapDressingTextures(scene);
  const style = MAP_STYLES[mapKey];
  drawFrame(scene, fitRect, style);
  drawFloorLayer(scene, fitRect, style);
  drawSolidLayer(scene, options.solids, style);
  drawMapFlowPlaque(scene, fitRect, GAMEPLAY_MAP_FLOW_STEPS[mapKey]);
  if (mapKey === "frus_floor") drawFrusProductionFloorRail(scene, fitRect);
  drawFeatureLayer(scene, options.features);
}

function ensureSnesMapDressingTextures(scene: Phaser.Scene) {
  makeFloorTextures(scene, "snes-map-floor-office", PALETTE.creamPaper, PALETTE.sepiaInk, PALETTE.goldStamp);
  makeFloorTextures(scene, "snes-map-floor-archive", PALETTE.archiveAmber, PALETTE.sepiaInk, PALETTE.oldGold);
  makeFloorTextures(scene, "snes-map-floor-street", PALETTE.stoneLight, PALETTE.stoneGray, PALETTE.paleGold);
  makeFloorTextures(scene, "snes-map-floor-marble", PALETTE.creamPaper, PALETTE.stoneLight, PALETTE.terminalCyan);
  makeFloorTextures(scene, "snes-map-floor-vault", PALETTE.deepRuby, PALETTE.buckramRed, PALETTE.goldStamp);
  makeFloorTextures(scene, "snes-map-floor-garden", PALETTE.plantLeaf, PALETTE.plantLeafShade, PALETTE.creamPaper);
  makeSolidTextures(scene, "snes-map-solid-desk", PALETTE.sepiaInk, PALETTE.deepBrown, PALETTE.goldStamp);
  makeSolidTextures(scene, "snes-map-solid-shelf", PALETTE.deepBrown, PALETTE.sepiaInk, PALETTE.creamPaper);
  makeSolidTextures(scene, "snes-map-solid-stone", PALETTE.stoneGray, PALETTE.stoneDark, PALETTE.creamPaper);
  makeSolidTextures(scene, "snes-map-solid-vault", PALETTE.black, PALETTE.deepRuby, PALETTE.classNetRed);
  makeDoorTexture(scene, "snes-map-feature-door", PALETTE.black, PALETTE.goldStamp, PALETTE.buckramRed);
  makeNpcTexture(scene, "snes-map-feature-npc", PALETTE.black, PALETTE.openNetGreen, PALETTE.creamPaper);
  makeDocumentTexture(scene, "snes-map-feature-document", PALETTE.black, PALETTE.terminalCyan, PALETTE.creamPaper);
  makeWorkstationTexture(scene, "snes-map-feature-workstation", PALETTE.black, PALETTE.oldGold, PALETTE.creamPaper);
  makeGateTexture(scene, "snes-map-feature-gate", PALETTE.black, PALETTE.classNetRed, PALETTE.goldStamp);
  makeFrusShelfTexture(scene);
  makeSourceIndexTexture(scene);
  makeDeclassGateTexture(scene);
  makeReviewDeskTexture(scene);
  makeVaultCoreTexture(scene);
  makeCableMachineTexture(scene);
  makeWitnessTableTexture(scene);
  makeStreetSignTexture(scene);
  makeCoffeeTexture(scene);
  makePhaseMarkerTexture(scene);
}

function makeTexture(scene: Phaser.Scene, key: string, draw: (graphics: Phaser.GameObjects.Graphics) => void) {
  if (scene.textures.exists(key)) return;
  const graphics = scene.add.graphics();
  draw(graphics);
  graphics.generateTexture(key, TILE, TILE);
  graphics.destroy();
}

function makeFloorTextures(scene: Phaser.Scene, key: string, base: string, shade: string, accent: string) {
  for (let variant = 0; variant < 4; variant++) {
    makeTexture(scene, textureVariant(key, variant), (graphics) => {
      graphics.fillStyle(color(base));
      graphics.fillRect(0, 0, TILE, TILE);
      graphics.fillStyle(color(shade), 0.9);
      graphics.fillRect(0, 0, TILE, 1);
      graphics.fillRect(0, 0, 1, TILE);
      if (variant === 1 || variant === 3) graphics.fillRect(12, 7, 2, 2);
      if (variant === 2 || variant === 3) graphics.fillRect(6, 10, 3, 1);
      graphics.fillStyle(color(accent), 0.85);
      if (variant !== 2) graphics.fillRect(4, 4, 1, 1);
      if (variant !== 1) graphics.fillRect(9, 12, 2, 1);
    });
  }
}

function makeSolidTextures(scene: Phaser.Scene, key: string, base: string, shade: string, accent: string) {
  for (let variant = 0; variant < 3; variant++) {
    makeTexture(scene, textureVariant(key, variant), (graphics) => {
      graphics.fillStyle(color(shade));
      graphics.fillRect(0, 0, TILE, TILE);
      graphics.fillStyle(color(base));
      graphics.fillRect(1, 1, 14, 12);
      graphics.fillStyle(color(PALETTE.black), 0.75);
      graphics.fillRect(1, 13, 14, 2);
      graphics.fillStyle(color(accent));
      graphics.fillRect(3, 3, 10, 1);
      if (variant !== 1) graphics.fillRect(3, 7, 8, 1);
      if (variant !== 2) graphics.fillRect(3, 11, 5, 1);
      if (variant === 2) graphics.fillRect(11, 5, 2, 5);
    });
  }
}

function makeDoorTexture(scene: Phaser.Scene, key: string, outline: string, fill: string, highlight: string) {
  makeTexture(scene, key, (graphics) => {
    graphics.fillStyle(color(outline));
    graphics.fillRect(3, 2, 10, 12);
    graphics.fillStyle(color(fill));
    graphics.fillRect(4, 3, 8, 10);
    graphics.fillStyle(color(outline));
    graphics.fillRect(6, 6, 4, 7);
    graphics.fillStyle(color(highlight));
    graphics.fillRect(5, 4, 6, 1);
    graphics.fillRect(10, 8, 1, 1);
  });
}

function makeNpcTexture(scene: Phaser.Scene, key: string, outline: string, fill: string, highlight: string) {
  makeTexture(scene, key, (graphics) => {
    graphics.fillStyle(color(outline));
    graphics.fillRect(5, 2, 6, 5);
    graphics.fillRect(4, 8, 8, 6);
    graphics.fillStyle(color(highlight));
    graphics.fillRect(6, 3, 4, 3);
    graphics.fillStyle(color(fill));
    graphics.fillRect(5, 8, 6, 5);
    graphics.fillStyle(color(outline));
    graphics.fillRect(6, 13, 2, 2);
    graphics.fillRect(9, 13, 2, 2);
  });
}

function makeDocumentTexture(scene: Phaser.Scene, key: string, outline: string, fill: string, highlight: string) {
  makeTexture(scene, key, (graphics) => {
    graphics.fillStyle(color(outline));
    graphics.fillRect(3, 3, 9, 10);
    graphics.fillStyle(color(highlight));
    graphics.fillRect(4, 4, 7, 8);
    graphics.fillStyle(color(fill));
    graphics.fillRect(5, 5, 1, 6);
    graphics.fillRect(7, 6, 3, 1);
    graphics.fillRect(7, 9, 3, 1);
    graphics.fillStyle(color(PALETTE.goldStamp));
    graphics.fillRect(10, 11, 3, 2);
  });
}

function makeWorkstationTexture(scene: Phaser.Scene, key: string, outline: string, fill: string, highlight: string) {
  makeTexture(scene, key, (graphics) => {
    graphics.fillStyle(color(outline));
    graphics.fillRect(2, 5, 12, 8);
    graphics.fillStyle(color(fill));
    graphics.fillRect(3, 6, 10, 5);
    graphics.fillStyle(color(highlight));
    graphics.fillRect(5, 4, 6, 2);
    graphics.fillRect(6, 8, 4, 1);
    graphics.fillStyle(color(outline));
    graphics.fillRect(4, 12, 2, 3);
    graphics.fillRect(10, 12, 2, 3);
  });
}

function makeGateTexture(scene: Phaser.Scene, key: string, outline: string, fill: string, highlight: string) {
  makeTexture(scene, key, (graphics) => {
    graphics.fillStyle(color(outline));
    graphics.fillRect(2, 2, 12, 12);
    graphics.fillStyle(color(fill));
    graphics.fillRect(3, 3, 10, 10);
    graphics.fillStyle(color(outline));
    graphics.fillRect(5, 3, 1, 10);
    graphics.fillRect(8, 3, 1, 10);
    graphics.fillRect(11, 3, 1, 10);
    graphics.fillStyle(color(highlight));
    graphics.fillRect(4, 4, 8, 1);
  });
}

function makeFrusShelfTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-frus-shelf", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(1, 2, 14, 12);
    graphics.fillStyle(color(PALETTE.deepBrown));
    graphics.fillRect(2, 3, 12, 10);
    graphics.fillStyle(color(PALETTE.buckramRed));
    graphics.fillRect(3, 4, 2, 8);
    graphics.fillRect(6, 4, 2, 8);
    graphics.fillRect(10, 4, 2, 8);
    graphics.fillStyle(color(PALETTE.goldStamp));
    graphics.fillRect(3, 5, 9, 1);
    graphics.fillRect(3, 10, 9, 1);
    graphics.fillStyle(color(PALETTE.creamPaper));
    graphics.fillRect(13, 5, 1, 6);
  });
}

function makeSourceIndexTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-source-index", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(2, 3, 12, 10);
    graphics.fillStyle(color(PALETTE.creamPaper));
    graphics.fillRect(3, 4, 5, 8);
    graphics.fillRect(8, 5, 5, 7);
    graphics.fillStyle(color(PALETTE.terminalCyan));
    graphics.fillRect(4, 6, 3, 1);
    graphics.fillRect(9, 7, 3, 1);
    graphics.fillStyle(color(PALETTE.classNetRed));
    graphics.fillRect(4, 9, 2, 1);
    graphics.fillRect(10, 10, 2, 1);
  });
}

function makeDeclassGateTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-declass-gate", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(1, 2, 14, 12);
    graphics.fillStyle(color(PALETTE.classNetRed));
    graphics.fillRect(2, 3, 12, 10);
    graphics.fillStyle(color(PALETTE.black));
    for (let x = 4; x <= 11; x += 3) graphics.fillRect(x, 3, 1, 10);
    graphics.fillStyle(color(PALETTE.goldStamp));
    graphics.fillRect(5, 5, 6, 1);
    graphics.fillRect(6, 8, 4, 2);
  });
}

function makeReviewDeskTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-review-desk", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(1, 5, 14, 8);
    graphics.fillStyle(color(PALETTE.deepBrown));
    graphics.fillRect(2, 6, 12, 5);
    graphics.fillStyle(color(PALETTE.creamPaper));
    graphics.fillRect(4, 4, 5, 5);
    graphics.fillStyle(color(PALETTE.classNetRed));
    graphics.fillRect(10, 4, 1, 6);
    graphics.fillRect(9, 9, 4, 1);
    graphics.fillStyle(color(PALETTE.goldStamp));
    graphics.fillRect(4, 12, 2, 3);
    graphics.fillRect(10, 12, 2, 3);
  });
}

function makeVaultCoreTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-vault-core", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(4, 1, 8, 14);
    graphics.fillStyle(color(PALETTE.deepRuby));
    graphics.fillRect(5, 3, 6, 10);
    graphics.fillStyle(color(PALETTE.classNetRed));
    graphics.fillRect(7, 5, 2, 5);
    graphics.fillStyle(color(PALETTE.goldStamp));
    graphics.fillRect(6, 2, 4, 1);
    graphics.fillRect(3, 13, 10, 1);
  });
}

function makeCableMachineTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-cable-machine", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(2, 5, 12, 8);
    graphics.fillStyle(color(PALETTE.stoneGray));
    graphics.fillRect(3, 6, 10, 5);
    graphics.fillStyle(color(PALETTE.terminalCyan));
    graphics.fillRect(5, 7, 4, 2);
    graphics.fillStyle(color(PALETTE.goldStamp));
    graphics.fillRect(10, 7, 2, 1);
    graphics.fillRect(4, 12, 8, 1);
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(4, 13, 1, 2);
    graphics.fillRect(11, 13, 1, 2);
  });
}

function makeWitnessTableTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-witness-table", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(1, 6, 14, 6);
    graphics.fillStyle(color(PALETTE.deepBrown));
    graphics.fillRect(2, 7, 12, 3);
    graphics.fillStyle(color(PALETTE.goldStamp));
    graphics.fillRect(4, 10, 8, 1);
    graphics.fillStyle(color(PALETTE.creamPaper));
    graphics.fillRect(5, 4, 4, 3);
    graphics.fillStyle(color(PALETTE.terminalCyan));
    graphics.fillRect(10, 3, 1, 5);
    graphics.fillRect(9, 3, 3, 1);
  });
}

function makeStreetSignTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-street-sign", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(7, 4, 2, 10);
    graphics.fillRect(3, 2, 10, 5);
    graphics.fillStyle(color(PALETTE.openNetGreen));
    graphics.fillRect(4, 3, 8, 3);
    graphics.fillStyle(color(PALETTE.creamPaper));
    graphics.fillRect(5, 4, 6, 1);
    graphics.fillStyle(color(PALETTE.goldStamp));
    graphics.fillRect(5, 14, 6, 1);
  });
}

function makeCoffeeTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-coffee", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(4, 7, 8, 6);
    graphics.fillRect(11, 8, 3, 3);
    graphics.fillStyle(color(PALETTE.creamPaper));
    graphics.fillRect(5, 8, 6, 4);
    graphics.fillStyle(color(PALETTE.deepBrown));
    graphics.fillRect(6, 9, 4, 2);
    graphics.fillStyle(color(PALETTE.terminalCyan));
    graphics.fillRect(5, 3, 1, 2);
    graphics.fillRect(8, 2, 1, 3);
    graphics.fillRect(11, 3, 1, 2);
  });
}

function makePhaseMarkerTexture(scene: Phaser.Scene) {
  makeTexture(scene, "snes-map-feature-phase-marker", (graphics) => {
    graphics.fillStyle(color(PALETTE.black));
    graphics.fillRect(2, 2, 12, 12);
    graphics.fillStyle(color(PALETTE.buckramRed));
    graphics.fillRect(3, 3, 10, 10);
    graphics.fillStyle(color(PALETTE.goldStamp));
    graphics.fillRect(5, 5, 6, 1);
    graphics.fillRect(5, 8, 6, 1);
    graphics.fillRect(5, 11, 6, 1);
    graphics.fillStyle(color(PALETTE.creamPaper));
    graphics.fillRect(4, 5, 1, 1);
    graphics.fillRect(4, 8, 1, 1);
    graphics.fillRect(4, 11, 1, 1);
  });
}

function textureVariant(key: string, variant: number) {
  return `${key}-${variant}`;
}

function variantFor(x: number, y: number, count: number) {
  const hash = Math.abs(Math.floor(x / TILE) * 13 + Math.floor(y / TILE) * 7);
  return hash % count;
}

function drawFrame(scene: Phaser.Scene, fitRect: FitRectLike, style: SnesMapDressingStyle) {
  scene.add.rectangle(
    Math.round(fitRect.x + fitRect.width / 2),
    Math.round(fitRect.y + fitRect.height / 2),
    Math.round(fitRect.width),
    Math.round(fitRect.height),
    color(style.border),
    0
  )
    .setStrokeStyle(1, color(style.border), 0.65)
    .setDepth(-13);
}

function drawMapFlowPlaque(scene: Phaser.Scene, fitRect: FitRectLike, step: GameplayMapFlowStep) {
  const x = Math.round(fitRect.x + 31);
  const y = Math.round(fitRect.y + 18);
  scene.add.rectangle(x + 2, y + 2, 54, 22, color(PALETTE.black), 0.42)
    .setName("snes-map-flow-shadow")
    .setDepth(-10);
  scene.add.rectangle(x, y, 54, 22, color(PALETTE.black), 0.76)
    .setStrokeStyle(1, color(step.accent), 0.86)
    .setName("snes-map-flow-plaque")
    .setDepth(-9);
  scene.add.rectangle(x - 18, y, 12, 14, color(PALETTE.deepRuby))
    .setStrokeStyle(1, color(step.accent))
    .setName("snes-map-flow-code-box")
    .setDepth(-8);
  scene.add.text(x - 18, y - 4, step.code, {
    fontFamily: "monospace",
    fontSize: "7px",
    color: PALETTE.creamPaper,
    align: "center"
  }).setName("snes-map-flow-code").setOrigin(0.5, 0).setDepth(-7);
  scene.add.text(x - 5, y - 8, step.title, {
    fontFamily: "monospace",
    fontSize: step.title.length > 7 ? "5px" : "6px",
    color: step.accent,
    align: "left"
  }).setName("snes-map-flow-title").setOrigin(0, 0).setDepth(-7);
  scene.add.rectangle(x + 9, y + 2, 20, 1, color(PALETTE.goldStamp), 0.82)
    .setName("snes-map-flow-rule")
    .setDepth(-7);
  scene.add.text(x - 5, y + 4, step.verb, {
    fontFamily: "monospace",
    fontSize: step.verb.length > 6 ? "5px" : "6px",
    color: PALETTE.terminalCyan,
    align: "left"
  }).setName("snes-map-flow-verb").setOrigin(0, 0).setDepth(-7);
}

function drawFrusProductionFloorRail(scene: Phaser.Scene, fitRect: FitRectLike) {
  const railY = Math.round(Phaser.Math.Clamp(
    fitRect.y + fitRect.height - 76,
    fitRect.y + 64,
    fitRect.y + fitRect.height - 56
  ));
  const nodes = FRUS_PRODUCTION_FLOOR_STEPS.map((step) => ({
    step,
    x: Math.round(fitRect.x + fitRect.width * step.xRatio),
    y: railY
  }));
  const rail = scene.add.graphics()
    .setName("frus-production-flow-rail")
    .setDepth(-6);
  rail.lineStyle(3, color(PALETTE.black), 0.72);
  for (let index = 0; index < nodes.length - 1; index++) {
    rail.lineBetween(nodes[index].x, nodes[index].y + 1, nodes[index + 1].x, nodes[index + 1].y + 1);
  }
  rail.lineStyle(1, color(PALETTE.goldStamp), 0.95);
  for (let index = 0; index < nodes.length - 1; index++) {
    const start = nodes[index];
    const end = nodes[index + 1];
    rail.lineBetween(start.x, start.y, end.x, end.y);
    drawRailArrow(scene, Math.round((start.x + end.x) / 2), start.y, end.x > start.x ? 1 : -1);
  }

  const titleX = Math.round(fitRect.x + fitRect.width / 2);
  scene.add.rectangle(titleX + 1, railY - 19, 91, 12, color(PALETTE.black), 0.48)
    .setName("frus-production-flow-title-shadow")
    .setDepth(-5);
  scene.add.rectangle(titleX, railY - 20, 91, 12, color(PALETTE.deepRuby), 0.9)
    .setStrokeStyle(1, color(PALETTE.goldStamp), 0.88)
    .setName("frus-production-flow-title-card")
    .setDepth(-4);
  scene.add.text(titleX, railY - 24, "FRUS VOLUME PATH", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.creamPaper,
    align: "center"
  }).setName("frus-production-flow-title").setOrigin(0.5, 0).setDepth(-3);

  for (const node of nodes) drawProductionNode(scene, node.step, node.x, node.y);
}

function drawRailArrow(scene: Phaser.Scene, x: number, y: number, direction: 1 | -1) {
  scene.add.rectangle(x, y, 4, 3, color(PALETTE.black), 0.72)
    .setName("frus-production-flow-arrow-shadow")
    .setDepth(-5);
  scene.add.triangle(
    x,
    y,
    direction > 0 ? -2 : 2,
    -3,
    direction > 0 ? -2 : 2,
    3,
    direction > 0 ? 3 : -3,
    0,
    color(PALETTE.goldStamp),
    0.95
  ).setName("frus-production-flow-arrow").setDepth(-4);
}

function drawProductionNode(scene: Phaser.Scene, step: FrusProductionFloorStep, x: number, y: number) {
  scene.add.ellipse(x + 1, y + 2, 17, 9, color(PALETTE.black), 0.44)
    .setName("frus-production-flow-node-shadow")
    .setDepth(-5);
  scene.add.rectangle(x, y, 15, 13, color(PALETTE.black), 0.9)
    .setStrokeStyle(1, color(step.accent), 0.96)
    .setName("frus-production-flow-node")
    .setDepth(-4);
  scene.add.rectangle(x, y - 4, 9, 3, color(step.accent), 0.92)
    .setName("frus-production-flow-node-accent")
    .setDepth(-3);
  scene.add.text(x, y - 4, step.code, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.black,
    align: "center"
  }).setName("frus-production-flow-code").setOrigin(0.5, 0).setDepth(-2);
  scene.add.text(x, y + 1, step.shortLabel, {
    fontFamily: "monospace",
    fontSize: "7px",
    color: PALETTE.creamPaper,
    align: "center"
  }).setName("frus-production-flow-label").setOrigin(0.5, 0).setDepth(-2);
  scene.add.text(x, y + 9, productionNodeTag(step), {
    fontFamily: "monospace",
    fontSize: "4px",
    color: step.accent,
    align: "center"
  }).setName("frus-production-flow-tag").setOrigin(0.5, 0).setDepth(-2);
}

function productionNodeTag(step: FrusProductionFloorStep) {
  if (step.fullLabel === "RESEARCH") return "SRC";
  if (step.fullLabel === "COMPILE") return "COMP";
  if (step.fullLabel === "DECLASS") return "DEC";
  if (step.fullLabel === "ANNOTATE") return "ANN";
  return "PUB";
}

function drawFloorLayer(scene: Phaser.Scene, fitRect: FitRectLike, style: SnesMapDressingStyle) {
  const startX = Math.ceil(fitRect.x / TILE) * TILE;
  const startY = Math.ceil(fitRect.y / TILE) * TILE;
  const endX = fitRect.x + fitRect.width - 1;
  const endY = fitRect.y + fitRect.height - 1;
  const floorAlpha = Math.min(style.floorAlpha, 0.18);
  for (let y = startY; y <= endY; y += TILE) {
    for (let x = startX; x <= endX; x += TILE) {
      scene.add.image(x + TILE / 2, y + TILE / 2, textureVariant(style.floorKey, variantFor(x, y, 4)))
        .setAlpha(floorAlpha)
        .setDepth(-19);
    }
  }
}

function drawSolidLayer(scene: Phaser.Scene, solids: Phaser.Geom.Rectangle[], style: SnesMapDressingStyle) {
  let count = 0;
  const solidAlpha = Math.min(style.solidAlpha, 0.42);
  for (const solid of solids) {
    const columns = Math.max(1, Math.ceil(solid.width / TILE));
    const rows = Math.max(1, Math.ceil(solid.height / TILE));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const edgeTile = row === 0 || col === 0 || row === rows - 1 || col === columns - 1;
        if (!edgeTile) continue;
        if (count >= MAX_SOLID_TILES) return;
        const x = Math.round(solid.x + Math.min(solid.width - 1, col * TILE + TILE / 2));
        const y = Math.round(solid.y + Math.min(solid.height - 1, row * TILE + TILE / 2));
        scene.add.image(x, y, textureVariant(style.solidKey, variantFor(x, y, 3)))
          .setAlpha(solidAlpha)
          .setDepth(-16 + Math.min(5, row));
        count++;
      }
    }
  }
}

function drawFeatureLayer(scene: Phaser.Scene, features: SnesMapDressingFeature[]) {
  for (const feature of features) {
    const key = featureKey(feature.kind);
    const sprite = scene.add.image(Math.round(feature.x), Math.round(feature.y), key)
      .setAlpha(0.84)
      .setDepth(-12);
    scene.tweens.add({
      targets: sprite,
      alpha: 1,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Stepped",
      easeParams: [2]
    });
  }
}

function featureKey(kind: SnesMapDressingKind) {
  if (kind === "door") return "snes-map-feature-door";
  if (kind === "npc") return "snes-map-feature-npc";
  if (kind === "workstation") return "snes-map-feature-workstation";
  if (kind === "gate") return "snes-map-feature-gate";
  if (kind === "frus_shelf") return "snes-map-feature-frus-shelf";
  if (kind === "source_index") return "snes-map-feature-source-index";
  if (kind === "declass_gate") return "snes-map-feature-declass-gate";
  if (kind === "review_desk") return "snes-map-feature-review-desk";
  if (kind === "vault_core") return "snes-map-feature-vault-core";
  if (kind === "cable_machine") return "snes-map-feature-cable-machine";
  if (kind === "witness_table") return "snes-map-feature-witness-table";
  if (kind === "street_sign") return "snes-map-feature-street-sign";
  if (kind === "coffee") return "snes-map-feature-coffee";
  if (kind === "phase_marker") return "snes-map-feature-phase-marker";
  return "snes-map-feature-document";
}
