import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Direction, RoomType } from "../game/constants";
import { SNES_ARCHIVE_TILE_ASSET, SNES_GATE_GLYPH_ASSET } from "../game/snesAtlas";

type TrackFn = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

interface SnesRoomLayerOptions {
  roomId: string;
  roomType?: RoomType;
  theme?: "office" | "archive" | "network" | "vault" | "proof" | "ending";
  track?: TrackFn;
}

interface SnesWorldMapOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  cropX?: number;
  cropY?: number;
}

type SnesGateDirection = "north" | "south" | "west" | "east";
type SnesGateGlyphFrame = (typeof SNES_GATE_GLYPH_ASSET.frames)[number];
type SnesArchiveTileFrame = (typeof SNES_ARCHIVE_TILE_ASSET.frames)[number];

interface SnesGateOptions {
  direction: SnesGateDirection;
  hasExit: boolean;
  unlocked: boolean;
  accent?: string;
  lockLabel?: string;
  exitLabel?: string;
  track?: TrackFn;
  depth?: number;
}

interface SnesTreasureOptions {
  x: number;
  y: number;
  textureKey: string;
  label: string;
  collected?: boolean;
  accent?: string;
  track?: TrackFn;
  depth?: number;
}

interface SnesMapTabletOptions {
  x: number;
  y: number;
  label: string;
  nodes: readonly string[];
  activeIndex?: number;
  accent?: string;
  track?: TrackFn;
  depth?: number;
}

interface SnesRoomIntroOptions {
  title: string;
  subtitle?: string;
  accent?: string;
  track?: TrackFn;
  depth?: number;
}

interface SnesFrusCoverPiece {
  fragment: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SnesFrusCoverAssemblyOptions {
  x: number;
  y: number;
  scale?: number;
  pieces: readonly SnesFrusCoverPiece[];
  earnedFragments: readonly string[];
  published?: boolean;
  title?: string;
  track?: TrackFn;
  depth?: number;
}

interface SnesPublicationTeamMember {
  textureKey: string;
  label: string;
  role: string;
  x: number;
  y: number;
  accent?: string;
}

interface SnesPublicationTeamOptions {
  x: number;
  y: number;
  members: readonly SnesPublicationTeamMember[];
  track?: TrackFn;
  depth?: number;
}

interface SnesPublicationShrineOptions {
  x: number;
  y: number;
  ready: boolean;
  published?: boolean;
  fragmentsCollected: number;
  fragmentsNeeded: number;
  apparatusComplete: boolean;
  stampsComplete: boolean;
  reliabilityReady: boolean;
  track?: TrackFn;
  depth?: number;
}

interface SnesStatutoryClockOptions {
  x: number;
  y: number;
  elapsedYears: number;
  deadlineYears: number;
  yearsRemaining: number;
  status: "running" | "at_risk" | "deadline_missed" | "buckram_gate_open" | "published";
  label?: string;
  track?: TrackFn;
  depth?: number;
}

interface SnesProgressMuralOptions {
  x: number;
  y: number;
  pendantsCollected: number;
  pendantsRequired: number;
  crystalsCollected: number;
  crystalsRequired: number;
  fragmentsCollected: number;
  fragmentsNeeded: number;
  repositoryMapComplete: boolean;
  apparatusComplete: boolean;
  standardsClear: boolean;
  buckramKeyHeld: boolean;
  gateOpen: boolean;
  completionRatio: number;
  track?: TrackFn;
  depth?: number;
}

interface SnesDanneArenaOptions {
  x: number;
  y: number;
  phaseIndex?: number;
  phaseCount?: number;
  gateOpen?: boolean;
  shortcutOffered?: boolean;
  track?: TrackFn;
  depth?: number;
}

interface SnesNaraStacksTileRoomOptions {
  depth?: number;
  track?: TrackFn;
}

interface SnesEmbassyCableRoomTileRoomOptions {
  depth?: number;
  track?: TrackFn;
}

interface SnesBlackVaultTileRoomOptions {
  depth?: number;
  track?: TrackFn;
}

interface SnesSenateHearingChamberTileRoomOptions {
  depth?: number;
  track?: TrackFn;
}

interface SnesCherryBlossomGardenTileRoomOptions {
  depth?: number;
  track?: TrackFn;
}

interface SnesRoomCompassOptions {
  x: number;
  y: number;
  roomId: string;
  roomTitle: string;
  exits: Partial<Record<Direction, string>>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, string>>;
  track?: TrackFn;
  depth?: number;
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function keep<T extends Phaser.GameObjects.GameObject>(object: T, track?: TrackFn) {
  return track ? track(object) : object;
}

function tag<T extends Phaser.GameObjects.GameObject>(object: T, name: string) {
  object.setName(name);
  return object;
}

function keepTagged<T extends Phaser.GameObjects.GameObject>(object: T, name: string, track?: TrackFn) {
  return keep(tag(object, name), track);
}

function themeColor(theme: SnesRoomLayerOptions["theme"], roomType?: RoomType) {
  if (theme === "network") return PALETTE.shadowNavy;
  if (theme === "vault" || roomType === "boss" || roomType === "secret") return PALETTE.deepRuby;
  if (theme === "proof") return PALETTE.creamPaper;
  if (theme === "office") return PALETTE.creamPaper;
  return PALETTE.archiveAmber;
}

function accentColor(theme: SnesRoomLayerOptions["theme"], roomType?: RoomType) {
  if (theme === "network") return PALETTE.terminalCyan;
  if (theme === "vault" || roomType === "boss") return PALETTE.classNetRed;
  if (roomType === "reward" || roomType === "secret") return PALETTE.goldStamp;
  if (theme === "proof") return PALETTE.buckramHighlight;
  return PALETTE.goldStamp;
}

export function addSnesRoomLayer(scene: Phaser.Scene, options: SnesRoomLayerOptions) {
  const track = options.track;
  const base = themeColor(options.theme, options.roomType);
  const accent = accentColor(options.theme, options.roomType);
  const shadow = options.theme === "network" ? PALETTE.black : PALETTE.deepRuby;
  keepTagged(scene.add.rectangle(128, 130, 220, 164, color(PALETTE.black)).setDepth(-17), "snes-room-shadow", track);
  keepTagged(scene.add.rectangle(128, 126, 212, 156, color(base)).setStrokeStyle(2, color(accent)).setDepth(-16), "snes-room-base", track);
  keepTagged(scene.add.rectangle(128, 47, 204, 6, color(PALETTE.creamPaper)).setDepth(-15), "snes-room-wall-top", track);
  keepTagged(scene.add.rectangle(128, 207, 204, 6, color(shadow)).setDepth(-15), "snes-room-wall-front", track);
  keepTagged(scene.add.rectangle(25, 126, 6, 154, color(PALETTE.creamPaper)).setDepth(-15), "snes-room-wall-left", track);
  keepTagged(scene.add.rectangle(231, 126, 6, 154, color(shadow)).setDepth(-15), "snes-room-wall-right", track);

  addSnesFloorVariants(scene, options, base, accent, track);
  addSnesWallDepth(scene, options, accent, shadow, track);

  for (let y = 54; y <= 198; y += 16) {
    for (let x = 34; x <= 222; x += 16) {
      const odd = ((x + y) / 16) % 2 === 0;
      const dot = odd ? PALETTE.buckramRed : PALETTE.sepiaInk;
      keepTagged(scene.add.rectangle(x, y, 2, 2, color(dot)).setDepth(-14), "snes-room-buckram-dot", track);
    }
  }

  for (let x = 40; x <= 216; x += 32) {
    keepTagged(scene.add.rectangle(x, 58, 18, 4, color(accent)).setDepth(-13), "snes-room-wall-brass", track);
    keepTagged(scene.add.rectangle(x + 4, 192, 18, 4, color(PALETTE.black)).setDepth(-13), "snes-room-wall-shadow", track);
  }

  addSnesRoomTypeLandmark(scene, options, base, accent, track);
  addSnesThemeLandmarks(scene, options, accent, track);
  addSnesAmbientSprites(scene, options, accent, track);

  const roomMarker = options.roomId.slice(0, 3).toUpperCase();
  keepTagged(scene.add.rectangle(128, 48, 42, 9, color(PALETTE.black)).setStrokeStyle(1, color(accent)).setDepth(38), "snes-room-marker-frame", track);
  keepTagged(scene.add.text(128, 44, roomMarker, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: accent
  }).setOrigin(0.5, 0).setDepth(39), "snes-room-marker-label", track);

  if (options.roomType === "puzzle" || options.roomType === "boss") {
    keepTagged(scene.add.rectangle(128, 126, 82, 42, color(PALETTE.black)).setStrokeStyle(2, color(accent)).setDepth(-12), "snes-room-central-shadow", track);
    keepTagged(scene.add.rectangle(128, 126, 64, 24, color(base)).setDepth(-11), "snes-room-central-floor", track);
  }

  if (options.roomType === "secret") {
    for (let i = 0; i < 5; i += 1) {
      keepTagged(scene.add.rectangle(64 + i * 32, 86 + (i % 2) * 48, 6, 6, color(PALETTE.goldStamp)).setDepth(-10), "snes-room-secret-cache", track);
      keepTagged(scene.add.rectangle(65 + i * 32, 87 + (i % 2) * 48, 4, 4, color(PALETTE.deepRuby)).setDepth(-9), "snes-room-secret-inset", track);
    }
  }
}

export function addSnesGate(scene: Phaser.Scene, options: SnesGateOptions) {
  const track = options.track;
  const depth = options.depth ?? 60;
  const accent = options.accent ?? PALETTE.goldStamp;
  const locked = options.hasExit && !options.unlocked;
  const openingColor = options.hasExit ? PALETTE.black : PALETTE.stoneDark;
  const archColor = options.hasExit ? accent : PALETTE.stoneGray;
  const capColor = locked ? PALETTE.classNetRed : archColor;
  const label = options.lockLabel ?? "LOCK";
  const exitLabel = options.exitLabel ?? "";
  const glyphFrame = gateGlyphFrame(options, locked);

  if (options.direction === "north" || options.direction === "south") {
    const y = options.direction === "north" ? 36 : 220;
    const trimY = options.direction === "north" ? 42 : 214;
    keepTagged(scene.add.rectangle(128, y, 40, 12, color(PALETTE.black), 0.82).setDepth(depth), "snes-gate-shadow", track);
    keepTagged(scene.add.rectangle(128, y, 34, 9, color(openingColor), 1).setDepth(depth + 1), "snes-gate-opening", track);
    keepTagged(scene.add.rectangle(110, y, 6, 12, color(PALETTE.stoneGray), 1).setDepth(depth + 2), "snes-gate-post", track);
    keepTagged(scene.add.rectangle(146, y, 6, 12, color(PALETTE.stoneGray), 1).setDepth(depth + 2), "snes-gate-post", track);
    keepTagged(scene.add.rectangle(128, trimY, 28, 2, color(archColor), 1).setDepth(depth + 3), "snes-gate-threshold", track);
    keepTagged(scene.add.rectangle(128, y - (options.direction === "north" ? 5 : -5), 22, 3, color(capColor), 1).setDepth(depth + 4), "snes-gate-cap", track);
    addGateGlyph(scene, 128, y, options.direction, glyphFrame, track, depth + 7);
    if (locked) {
      keepTagged(scene.add.rectangle(128, y, 26, 3, color(PALETTE.classNetRed), 1).setDepth(depth + 5), "snes-gate-lock-bar", track);
      keepTagged(scene.add.rectangle(128, y + (options.direction === "north" ? 4 : -4), 20, 2, color(PALETTE.classNetRed), 1).setDepth(depth + 5), "snes-gate-lock-bar", track);
      addGateSeal(scene, 128, options.direction === "north" ? 48 : 208, label, track, depth + 8);
    } else if (options.hasExit && exitLabel) {
      addGateRoutePlaque(scene, 128, options.direction === "north" ? 48 : 208, exitLabel, accent, track, depth + 8);
    }
    return;
  }

  const x = options.direction === "west" ? 8 : 248;
  const trimX = options.direction === "west" ? 15 : 241;
  keepTagged(scene.add.rectangle(x, 120, 12, 40, color(PALETTE.black), 0.82).setDepth(depth), "snes-gate-shadow", track);
  keepTagged(scene.add.rectangle(x, 120, 9, 34, color(openingColor), 1).setDepth(depth + 1), "snes-gate-opening", track);
  keepTagged(scene.add.rectangle(x, 102, 12, 6, color(PALETTE.stoneGray), 1).setDepth(depth + 2), "snes-gate-post", track);
  keepTagged(scene.add.rectangle(x, 138, 12, 6, color(PALETTE.stoneGray), 1).setDepth(depth + 2), "snes-gate-post", track);
  keepTagged(scene.add.rectangle(trimX, 120, 2, 28, color(archColor), 1).setDepth(depth + 3), "snes-gate-threshold", track);
  keepTagged(scene.add.rectangle(x + (options.direction === "west" ? 5 : -5), 120, 3, 22, color(capColor), 1).setDepth(depth + 4), "snes-gate-cap", track);
  addGateGlyph(scene, x, 120, options.direction, glyphFrame, track, depth + 7);
  if (locked) {
    keepTagged(scene.add.rectangle(x, 120, 3, 26, color(PALETTE.classNetRed), 1).setDepth(depth + 5), "snes-gate-lock-bar", track);
    keepTagged(scene.add.rectangle(x + (options.direction === "west" ? 4 : -4), 120, 2, 20, color(PALETTE.classNetRed), 1).setDepth(depth + 5), "snes-gate-lock-bar", track);
    addGateSeal(scene, options.direction === "west" ? 22 : 234, 120, label, track, depth + 8);
  } else if (options.hasExit && exitLabel) {
    addGateRoutePlaque(scene, options.direction === "west" ? 22 : 234, 120, exitLabel, accent, track, depth + 8);
  }
}

function gateGlyphFrame(options: SnesGateOptions, locked: boolean): SnesGateGlyphFrame {
  const label = options.exitLabel?.toUpperCase() ?? "";
  if (!options.hasExit) return "sealed";
  if (locked) return "locked";
  if (label === "SECRET") return "secret";
  if (label === "BOSS") return "boss";
  return "open";
}

function addGateGlyph(
  scene: Phaser.Scene,
  x: number,
  y: number,
  direction: SnesGateDirection,
  frame: SnesGateGlyphFrame,
  track?: TrackFn,
  depth = 68
) {
  if (scene.textures.exists(SNES_GATE_GLYPH_ASSET.key)) {
    const glyph = scene.add.image(x, y, SNES_GATE_GLYPH_ASSET.key, frame)
      .setDepth(depth);
    keep(glyph.setName(`snes-gate-glyph-${direction}-${frame}`), track);
    return;
  }

  const fill = frame === "open"
    ? PALETTE.openNetGreen
    : frame === "locked" || frame === "boss"
      ? PALETTE.classNetRed
      : frame === "secret"
        ? PALETTE.goldStamp
        : PALETTE.stoneGray;
  keep(scene.add.rectangle(x, y, 8, 8, color(fill), 0.9)
    .setName(`snes-gate-glyph-fallback-${direction}-${frame}`)
    .setStrokeStyle(1, color(PALETTE.black))
    .setDepth(depth), track);
}

function addGateSeal(scene: Phaser.Scene, x: number, y: number, label: string, track?: TrackFn, depth = 68) {
  keepTagged(scene.add.rectangle(x, y, 24, 11, color(PALETTE.black), 0.96).setStrokeStyle(1, color(PALETTE.classNetRed)).setDepth(depth), "snes-gate-lock-seal", track);
  keepTagged(scene.add.text(x, y - 4, label, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.classNetRed
  }).setOrigin(0.5, 0).setDepth(depth + 1), "snes-gate-lock-label", track);
}

function addGateRoutePlaque(scene: Phaser.Scene, x: number, y: number, label: string, accent: string, track?: TrackFn, depth = 68) {
  const trimmed = label.replace(/\s+/g, " ").trim().slice(0, 8).toUpperCase();
  keepTagged(scene.add.rectangle(x, y, 28, 11, color(PALETTE.black), 0.9).setStrokeStyle(1, color(accent)).setDepth(depth), "snes-gate-route-plaque", track);
  keepTagged(scene.add.text(x, y - 4, trimmed, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: accent
  }).setOrigin(0.5, 0).setDepth(depth + 1), "snes-gate-route-label", track);
}

export function addSnesTreasurePedestal(scene: Phaser.Scene, options: SnesTreasureOptions) {
  const track = options.track;
  const depth = options.depth ?? 130;
  const accent = options.accent ?? PALETTE.goldStamp;
  const label = options.label.slice(0, 16).toUpperCase();
  const glowAlpha = options.collected ? 0.28 : 0.62;
  keepTagged(scene.add.ellipse(options.x, options.y + 18, 62, 16, color(PALETTE.black), 0.72).setDepth(depth - 4), "snes-treasure-shadow", track);
  keepTagged(scene.add.rectangle(options.x, options.y + 12, 56, 18, color(PALETTE.deepRuby), 1).setStrokeStyle(2, color(accent)).setDepth(depth - 3), "snes-treasure-plinth", track);
  keepTagged(scene.add.rectangle(options.x, options.y + 2, 40, 18, color(PALETTE.black), 0.95).setStrokeStyle(1, color(accent)).setDepth(depth - 2), "snes-treasure-case", track);
  keepTagged(scene.add.rectangle(options.x, options.y - 11, 28, 5, color(accent), 1).setDepth(depth - 1), "snes-treasure-lid", track);
  keepTagged(scene.add.rectangle(options.x, options.y + 21, 72, 9, color(PALETTE.black), 0.95).setStrokeStyle(1, color(accent)).setDepth(depth + 2), "snes-treasure-label-frame", track);
  keepTagged(scene.add.text(options.x, options.y + 17, label, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: options.collected ? PALETTE.stoneLight : accent,
    align: "center"
  }).setOrigin(0.5, 0).setDepth(depth + 3), "snes-treasure-label", track);

  if (scene.textures.exists(options.textureKey)) {
    const icon = keepTagged(scene.add.image(options.x, options.y - 1, options.textureKey).setDepth(depth + 1), "snes-treasure-icon", track);
    if (options.collected && "setTint" in icon) icon.setTint(color(PALETTE.goldStamp));
  } else {
    keepTagged(scene.add.rectangle(options.x, options.y - 1, 16, 16, color(accent), 1).setDepth(depth + 1), "snes-treasure-icon-fallback", track);
  }

  for (const [dx, dy] of [[-24, -8], [24, -7], [-16, 8], [16, 8]] as const) {
    keepTagged(scene.add.rectangle(options.x + dx, options.y + dy, 3, 3, color(accent), glowAlpha).setDepth(depth), "snes-treasure-spark", track);
    keepTagged(scene.add.rectangle(options.x + dx + 1, options.y + dy + 1, 1, 1, color(PALETTE.white), glowAlpha).setDepth(depth + 1), "snes-treasure-spark-core", track);
  }
}

export function addSnesRewardBurst(scene: Phaser.Scene, x: number, y: number, textureKey: string, label: string, track?: TrackFn) {
  const container = keepTagged(scene.add.container(x, y).setDepth(900), "snes-reward-burst", track);
  container.add(scene.add.ellipse(0, 4, 58, 18, color(PALETTE.black), 0.68));
  container.add(scene.add.rectangle(0, -8, 46, 28, color(PALETTE.black), 0.92).setStrokeStyle(2, color(PALETTE.goldStamp)));
  if (scene.textures.exists(textureKey)) container.add(scene.add.image(0, -10, textureKey));
  else container.add(scene.add.rectangle(0, -10, 18, 18, color(PALETTE.goldStamp)));
  container.add(scene.add.text(0, 10, label.slice(0, 18).toUpperCase(), {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0));
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    container.add(scene.add.rectangle(Math.round(Math.cos(angle) * 28), Math.round(Math.sin(angle) * 18) - 6, 3, 3, color(PALETTE.goldStamp), 0.9));
  }
  scene.tweens.add({
    targets: container,
    y: y - 10,
    alpha: 0,
    duration: 900,
    ease: "Cubic.easeOut",
    onComplete: () => container.destroy()
  });
  return container;
}

export function addSnesMapTablet(scene: Phaser.Scene, options: SnesMapTabletOptions) {
  const depth = options.depth ?? 142;
  const accent = options.accent ?? PALETTE.terminalCyan;
  const activeIndex = Math.max(0, Math.min(options.nodes.length - 1, options.activeIndex ?? 0));
  const container = keepTagged(scene.add.container(options.x, options.y).setDepth(depth), "snes-map-tablet", options.track);
  container.add(tag(scene.add.rectangle(1, 2, 55, 37, color(PALETTE.black), 0.42), "snes-map-tablet-shadow"));
  container.add(tag(scene.add.rectangle(0, 0, 53, 35, color(PALETTE.sepiaInk)), "snes-map-tablet-body"));
  container.add(tag(scene.add.rectangle(0, -1, 49, 31, color(PALETTE.creamPaper)), "snes-map-tablet-paper"));
  container.add(tag(scene.add.rectangle(0, -14, 43, 5, color(PALETTE.deepRuby)), "snes-map-tablet-heading"));
  container.add(tag(scene.add.text(0, -17, options.label.slice(0, 10).toUpperCase(), {
    fontFamily: "monospace",
    fontSize: "4px",
    color: accent
  }).setOrigin(0.5, 0), "snes-map-tablet-label"));

  const positions = [
    [-16, -4],
    [-2, -8],
    [14, -2],
    [-12, 9],
    [6, 7],
    [20, 10]
  ] as const;
  const total = Math.min(options.nodes.length, positions.length);
  for (let index = 0; index < total; index += 1) {
    const [nodeX, nodeY] = positions[index];
    if (index > 0) {
      const [prevX, prevY] = positions[index - 1];
      const midX = (prevX + nodeX) / 2;
      const midY = (prevY + nodeY) / 2;
      const horizontal = Math.abs(nodeX - prevX) >= Math.abs(nodeY - prevY);
      container.add(tag(scene.add.rectangle(
        midX,
        midY,
        horizontal ? Math.max(5, Math.abs(nodeX - prevX)) : 2,
        horizontal ? 2 : Math.max(5, Math.abs(nodeY - prevY)),
        color(PALETTE.archiveAmber),
        0.88
      ), "snes-map-tablet-route"));
    }
    const nodeColor = index === activeIndex
      ? accent
      : index < activeIndex
        ? PALETTE.goldStamp
        : PALETTE.stoneGray;
    container.add(tag(scene.add.rectangle(nodeX, nodeY, 8, 7, color(nodeColor), 0.96), "snes-map-tablet-grid-cell"));
    container.add(tag(scene.add.rectangle(nodeX, nodeY, 4, 3, color(index === activeIndex ? PALETTE.white : PALETTE.shadowNavy), 0.72), "snes-map-tablet-grid-chip"));
    container.add(tag(scene.add.text(nodeX, nodeY - 4, options.nodes[index].slice(0, 2).toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "3px",
      color: index === activeIndex ? PALETTE.black : PALETTE.creamPaper
    }).setOrigin(0.5, 0), "snes-map-tablet-node-label"));
  }
  container.add(tag(scene.add.rectangle(0, 16, 42, 3, color(PALETTE.black), 0.86), "snes-map-tablet-footer"));
  container.add(tag(scene.add.rectangle(-18 + activeIndex * 7, 16, 5, 3, color(accent), 0.92), "snes-map-tablet-beacon"));
  return container;
}

export function addSnesRoomCompass(scene: Phaser.Scene, options: SnesRoomCompassOptions) {
  const depth = options.depth ?? 148;
  const locked = options.lockedExits ?? {};
  const required = options.requiredItems ?? {};
  const container = keepTagged(scene.add.container(options.x, options.y).setDepth(depth), "snes-room-compass", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };
  const dirs = ["north", "south", "west", "east"] as const;
  const roomTypeLabel = options.roomTitle.replace(/\s+/g, " ").trim().slice(0, 10).toUpperCase();

  add(scene.add.rectangle(1, 2, 62, 45, color(PALETTE.black), 0.46), "snes-room-compass-shadow");
  add(scene.add.rectangle(0, 0, 60, 43, color(PALETTE.black), 0.92).setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-room-compass-frame");
  add(scene.add.rectangle(0, -18, 46, 6, color(PALETTE.deepRuby), 1).setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-room-compass-title-band");
  add(scene.add.text(0, -21, options.roomId.toUpperCase(), {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-room-compass-room-id");

  add(scene.add.rectangle(0, 4, 22, 18, color(PALETTE.deepRuby), 0.62).setStrokeStyle(1, color(PALETTE.stoneGray)), "snes-room-compass-center");
  add(scene.add.rectangle(0, 3, 10, 7, color(PALETTE.creamPaper), 0.92).setStrokeStyle(1, color(PALETTE.sepiaInk)), "snes-room-compass-document-chip");
  add(scene.add.rectangle(-4, 3, 1, 7, color(PALETTE.classNetRed), 1), "snes-room-compass-document-redbar");

  const positions: Record<Direction, { x: number; y: number; w: number; h: number; labelX: number; labelY: number }> = {
    north: { x: 0, y: -9, w: 10, h: 8, labelX: 0, labelY: -14 },
    south: { x: 0, y: 17, w: 10, h: 8, labelX: 0, labelY: 20 },
    west: { x: -22, y: 4, w: 8, h: 10, labelX: -25, labelY: 1 },
    east: { x: 22, y: 4, w: 8, h: 10, labelX: 25, labelY: 1 }
  };

  for (const direction of dirs) {
    const target = options.exits[direction];
    const isLocked = Boolean(target && locked[direction]);
    const fill = !target
      ? PALETTE.stoneDark
      : isLocked
        ? PALETTE.classNetRed
        : PALETTE.openNetGreen;
    const alpha = target ? 0.92 : 0.36;
    const pos = positions[direction];
    add(scene.add.rectangle(pos.x, pos.y, pos.w, pos.h, color(fill), alpha).setStrokeStyle(1, color(PALETTE.black)), "snes-room-compass-exit-arrow");
    if (target) {
      add(scene.add.text(pos.labelX, pos.labelY, direction[0].toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "4px",
        color: isLocked ? PALETTE.creamPaper : PALETTE.black,
        align: "center"
      }).setOrigin(0.5, 0), "snes-room-compass-direction-label");
    }
    if (isLocked) {
      const label = (required[direction] ?? locked[direction] ?? "LOCK").replace(/_/g, " ").slice(0, 4).toUpperCase();
      add(scene.add.rectangle(pos.x, pos.y, pos.w + 6, pos.h + 4, color(PALETTE.black), 0.68).setStrokeStyle(1, color(PALETTE.classNetRed)), "snes-room-compass-lock-seal");
      add(scene.add.text(pos.x, pos.y - 4, label, {
        fontFamily: "monospace",
        fontSize: "3px",
        color: PALETTE.classNetRed,
        align: "center"
      }).setOrigin(0.5, 0), "snes-room-compass-lock-label");
    }
  }

  add(scene.add.rectangle(0, 32, 52, 8, color(PALETTE.deepRuby), 1).setStrokeStyle(1, color(PALETTE.sepiaInk)), "snes-room-compass-footer");
  add(scene.add.text(0, 28, roomTypeLabel, {
    fontFamily: "monospace",
    fontSize: "4px",
    color: PALETTE.creamPaper,
    align: "center"
  }).setOrigin(0.5, 0), "snes-room-compass-title-label");
  return container;
}

export function addSnesRoomIntroBanner(scene: Phaser.Scene, options: SnesRoomIntroOptions) {
  const track = options.track;
  const depth = options.depth ?? 820;
  const accent = options.accent ?? PALETTE.goldStamp;
  const title = options.title.replace(/\s+/g, " ").trim().toUpperCase().slice(0, 30);
  const subtitle = (options.subtitle ?? "FRUS PRODUCTION ROOM").replace(/\s+/g, " ").trim().toUpperCase().slice(0, 28);
  const container = keepTagged(scene.add.container(128, 68).setDepth(depth), "snes-room-intro-banner", track);
  container.add(tag(scene.add.rectangle(0, 0, 154, 28, color(PALETTE.black), 0.92).setStrokeStyle(2, color(accent)), "snes-room-intro-panel"));
  container.add(tag(scene.add.rectangle(0, -16, 124, 3, color(accent), 1), "snes-room-intro-top-rule"));
  container.add(tag(scene.add.rectangle(0, 16, 124, 3, color(PALETTE.deepRuby), 1), "snes-room-intro-bottom-rule"));
  container.add(tag(scene.add.rectangle(-68, 0, 5, 18, color(accent), 1), "snes-room-intro-side-rule"));
  container.add(tag(scene.add.rectangle(68, 0, 5, 18, color(accent), 1), "snes-room-intro-side-rule"));
  container.add(tag(scene.add.text(0, -11, title, {
    fontFamily: "monospace",
    fontSize: "7px",
    color: accent,
    align: "center"
  }).setOrigin(0.5, 0), "snes-room-intro-title"));
  container.add(tag(scene.add.text(0, 3, subtitle, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.creamPaper,
    align: "center"
  }).setOrigin(0.5, 0), "snes-room-intro-subtitle"));
  scene.tweens.add({
    targets: container,
    y: 58,
    alpha: 0,
    delay: 720,
    duration: 420,
    ease: "Cubic.easeIn",
    onComplete: () => {
      if (container.active) container.destroy();
    }
  });
  return container;
}

export function addSnesFrusCoverAssembly(scene: Phaser.Scene, options: SnesFrusCoverAssemblyOptions) {
  const depth = options.depth ?? 130;
  const scale = options.scale ?? 1;
  const title = options.title ?? "ASSEMBLED FRUS";
  const earned = new Set(options.earnedFragments);
  const complete = options.published || options.pieces.every((piece) => earned.has(piece.fragment));
  const container = keepTagged(scene.add.container(options.x, options.y).setScale(scale).setDepth(depth), "snes-frus-cover-assembly", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.rectangle(5, 7, 86, 126, color(PALETTE.black), 0.82), "snes-frus-cover-shadow");
  add(scene.add.rectangle(0, 0, 80, 120, color(PALETTE.deepRuby), 1).setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-frus-cover-base");
  add(scene.add.rectangle(-34, 0, 8, 120, color(PALETTE.buckramRed), 1), "snes-frus-cover-spine");
  add(scene.add.rectangle(-28, 0, 2, 120, color(PALETTE.black), 0.72), "snes-frus-cover-spine-shadow");
  for (const y of [-43, -23, 39] as const) {
    add(scene.add.rectangle(-34, y, 8, 3, color(PALETTE.goldStamp), 1), "snes-frus-cover-spine-band");
  }

  for (let row = -48; row <= 50; row += 12) {
    for (let col = -22; col <= 34; col += 14) {
      const offset = ((row + col) / 2) % 3 === 0 ? 1 : 0;
      add(scene.add.rectangle(col + offset, row, 2, 2, color(PALETTE.buckramRed), 0.62), "snes-frus-cover-buckram-dot");
    }
  }

  add(scene.add.rectangle(10, -46, 48, 2, color(PALETTE.goldStamp), 1), "snes-frus-cover-title-rule");
  add(scene.add.rectangle(10, -20, 48, 2, color(PALETTE.goldStamp), 1), "snes-frus-cover-title-rule");
  add(scene.add.text(10, -42, "FOREIGN\nRELATIONS", {
    fontFamily: "monospace",
    fontSize: "7px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-frus-cover-title");
  add(scene.add.text(10, -11, "VOLUME\nREADY", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.creamPaper,
    align: "center"
  }).setOrigin(0.5, 0), "snes-frus-cover-volume-label");
  add(scene.add.circle(10, 33, 13, color(PALETTE.deepRuby), 1).setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-frus-cover-seal");
  add(scene.add.circle(10, 33, 7, color(PALETTE.goldStamp), 0.28).setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-frus-cover-seal-ring");
  add(scene.add.rectangle(10, 33, 10, 2, color(PALETTE.goldStamp), 1), "snes-frus-cover-seal-rule");
  add(scene.add.rectangle(10, 37, 6, 2, color(PALETTE.goldStamp), 1), "snes-frus-cover-seal-rule");

  for (const piece of options.pieces) {
    const pieceX = -40 + piece.x + piece.width / 2;
    const pieceY = -60 + piece.y + piece.height / 2;
    const isEarned = earned.has(piece.fragment);
    add(scene.add.rectangle(pieceX, pieceY, piece.width, piece.height)
      .setStrokeStyle(1, color(isEarned ? PALETTE.goldStamp : PALETTE.sepiaInk)), isEarned ? "snes-frus-cover-piece-earned" : "snes-frus-cover-piece-missing");
    if (isEarned) {
      add(scene.add.rectangle(pieceX + piece.width / 2 - 3, pieceY - piece.height / 2 + 3, 2, 2, color(PALETTE.white), 0.8), "snes-frus-cover-piece-glint");
      continue;
    }
    add(scene.add.rectangle(pieceX, pieceY, piece.width, piece.height, color(PALETTE.black), 0.84), "snes-frus-cover-piece-mask");
    add(scene.add.text(pieceX, pieceY - 3, piece.label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.sepiaInk,
      align: "center"
    }).setOrigin(0.5), "snes-frus-cover-piece-label");
  }

  add(scene.add.rectangle(0, 64, 74, 10, color(PALETTE.black), 0.96).setStrokeStyle(1, color(complete ? PALETTE.goldStamp : PALETTE.sepiaInk)), "snes-frus-cover-label-frame");
  add(scene.add.text(0, 60, complete ? title : `PIECES ${earned.size}/${options.pieces.length}`, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: complete ? PALETTE.goldStamp : PALETTE.creamPaper,
    align: "center"
  }).setOrigin(0.5, 0), "snes-frus-cover-label");

  if (complete) {
    for (const [dx, dy] of [[-32, -52], [34, -38], [-22, 50], [34, 42]] as const) {
      add(scene.add.rectangle(dx, dy, 3, 3, color(PALETTE.goldStamp), 0.9), "snes-frus-cover-complete-spark");
      add(scene.add.rectangle(dx + 1, dy + 1, 1, 1, color(PALETTE.white), 0.9), "snes-frus-cover-complete-spark-core");
    }
  }

  return container;
}

export function addSnesPublicationTeam(scene: Phaser.Scene, options: SnesPublicationTeamOptions) {
  const depth = options.depth ?? 158;
  const container = keepTagged(scene.add.container(options.x, options.y).setDepth(depth), "snes-publication-team", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.rectangle(0, -25, 102, 9, color(PALETTE.black), 0.84).setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-publication-team-rank-banner");
  add(scene.add.text(0, -29, "EQUAL-RANK REVIEW CIRCLE", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-publication-team-rank-label");

  for (const member of options.members) {
    const accent = member.accent ?? PALETTE.goldStamp;
    add(scene.add.ellipse(member.x, member.y + 4, 22, 7, color(PALETTE.black), 0.62), "snes-publication-team-shadow");
    if (scene.textures.exists(member.textureKey)) {
      add(scene.add.sprite(member.x, member.y, member.textureKey, 0)
        .setOrigin(0.5, 0.9)
        .setScale(0.42), "snes-publication-team-sprite");
    } else {
      addPublicationFallbackSprite(scene, add, member.x, member.y, accent);
    }
    add(scene.add.rectangle(member.x, member.y + 10, 23, 8, color(PALETTE.black), 0.92).setStrokeStyle(1, color(accent)), "snes-publication-team-label-frame");
    add(scene.add.text(member.x, member.y + 6, member.label.slice(0, 5).toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent,
      align: "center"
    }).setOrigin(0.5, 0), "snes-publication-team-label");
    add(scene.add.text(member.x, member.y + 15, member.role.slice(0, 8).toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0), "snes-publication-team-role-label");
  }

  return container;
}

export function addSnesPublicationShrine(scene: Phaser.Scene, options: SnesPublicationShrineOptions) {
  const depth = options.depth ?? 120;
  const accent = options.published ? PALETTE.openNetGreen : options.ready ? PALETTE.goldStamp : PALETTE.classNetRed;
  const container = keepTagged(scene.add.container(options.x, options.y).setDepth(depth), "snes-publication-shrine", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.ellipse(0, 39, 134, 16, color(PALETTE.black), 0.72), "snes-publication-shrine-shadow");
  add(scene.add.rectangle(0, 35, 124, 12, color(PALETTE.black), 0.88).setStrokeStyle(1, color(accent)), "snes-publication-shrine-base-shadow");
  add(scene.add.rectangle(0, 29, 116, 12, color(PALETTE.deepRuby), 1).setStrokeStyle(2, color(accent)), "snes-publication-shrine-dais");
  add(scene.add.rectangle(0, 21, 92, 8, color(PALETTE.buckramRed), 1).setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-publication-shrine-dais-top");

  for (const railY of [-35, -25] as const) {
    add(scene.add.rectangle(0, railY, 104, 3, color(PALETTE.goldStamp), 1), "snes-publication-shrine-press-rail");
    add(scene.add.rectangle(0, railY + 3, 100, 2, color(PALETTE.black), 0.62), "snes-publication-shrine-press-rail-shadow");
  }
  for (const railX of [-52, 52] as const) {
    add(scene.add.rectangle(railX, -23, 5, 36, color(PALETTE.stoneGray), 1).setStrokeStyle(1, color(PALETTE.black)), "snes-publication-shrine-press-post");
    add(scene.add.rectangle(railX, -44, 12, 8, color(PALETTE.deepRuby), 1).setStrokeStyle(1, color(accent)), "snes-publication-shrine-press-cap");
  }

  add(scene.add.rectangle(0, -48, 78, 10, color(PALETTE.black), 0.92).setStrokeStyle(1, color(accent)), "snes-publication-shrine-title-frame");
  add(scene.add.text(0, -52, options.published ? "PUBLIC RECORD" : options.ready ? "READY TO PUBLISH" : "ASSEMBLY LOCK", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: accent,
    align: "center"
  }).setOrigin(0.5, 0), "snes-publication-shrine-title");

  const socketLabels = ["SRC", "ANN", "EQ", "PRF", "IDX"];
  for (let index = 0; index < options.fragmentsNeeded; index += 1) {
    const socketX = -40 + index * 20;
    const filled = index < options.fragmentsCollected;
    add(scene.add.rectangle(socketX, 48, 15, 12, color(filled ? PALETTE.deepRuby : PALETTE.black), 1)
      .setStrokeStyle(1, color(filled ? PALETTE.goldStamp : PALETTE.stoneGray)), "snes-publication-shrine-fragment-socket");
    if (filled) {
      add(scene.add.rectangle(socketX, 45, 9, 5, color(PALETTE.creamPaper), 1).setStrokeStyle(1, color(PALETTE.sepiaInk)), "snes-publication-shrine-fragment-page");
      add(scene.add.rectangle(socketX - 4, 45, 1, 5, color(PALETTE.classNetRed), 1), "snes-publication-shrine-fragment-redbar");
    }
    add(scene.add.text(socketX, 53, socketLabels[index] ?? "VOL", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: filled ? PALETTE.goldStamp : PALETTE.stoneGray,
      align: "center"
    }).setOrigin(0.5, 0), "snes-publication-shrine-fragment-label");
  }

  const status = [
    { label: "STAMP", ok: options.stampsComplete, x: -48 },
    { label: "APP", ok: options.apparatusComplete, x: -16 },
    { label: "REL", ok: options.reliabilityReady, x: 16 },
    { label: "KEY", ok: options.ready || options.published, x: 48 }
  ] as const;
  for (const item of status) {
    add(scene.add.rectangle(item.x, -6, 26, 12, color(PALETTE.black), 0.9)
      .setStrokeStyle(1, color(item.ok ? PALETTE.openNetGreen : PALETTE.classNetRed)), "snes-publication-shrine-status-frame");
    add(scene.add.text(item.x, -10, item.label, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: item.ok ? PALETTE.openNetGreen : PALETTE.classNetRed,
      align: "center"
    }).setOrigin(0.5, 0), "snes-publication-shrine-status-label");
    add(scene.add.text(item.x, -3, item.ok ? "OK" : "--", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: item.ok ? PALETTE.creamPaper : PALETTE.stoneGray,
      align: "center"
    }).setOrigin(0.5, 0), "snes-publication-shrine-status-value");
  }

  add(scene.add.rectangle(-62, 10, 14, 22, color(PALETTE.black), 0.95).setStrokeStyle(1, color(PALETTE.terminalCyan)), "snes-publication-shrine-statechat-tower");
  add(scene.add.rectangle(-62, 5, 8, 5, color(PALETTE.terminalCyan), options.ready ? 0.86 : 0.38), "snes-publication-shrine-statechat-screen");
  add(scene.add.text(-62, 16, "AI\nCHK", {
    fontFamily: "monospace",
    fontSize: "4px",
    color: PALETTE.terminalCyan,
    align: "center"
  }).setOrigin(0.5), "snes-publication-shrine-statechat-label");

  add(scene.add.rectangle(62, 10, 14, 22, color(PALETTE.black), 0.95).setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-publication-shrine-human-tower");
  add(scene.add.rectangle(62, 5, 8, 5, color(PALETTE.goldStamp), options.ready || options.published ? 0.92 : 0.36), "snes-publication-shrine-human-seal");
  add(scene.add.text(62, 16, "HUM\nREV", {
    fontFamily: "monospace",
    fontSize: "4px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5), "snes-publication-shrine-human-label");

  if (options.ready || options.published) {
    for (const [dx, dy] of [[-48, -42], [-24, -18], [25, -41], [49, -18], [0, 40]] as const) {
      add(scene.add.rectangle(dx, dy, 3, 3, color(PALETTE.goldStamp), 0.92), "snes-publication-shrine-ready-spark");
      add(scene.add.rectangle(dx + 1, dy + 1, 1, 1, color(PALETTE.white), 0.95), "snes-publication-shrine-ready-spark-core");
    }
  }

  if (options.published) {
    add(scene.add.rectangle(0, 8, 90, 3, color(PALETTE.openNetGreen), 0.92), "snes-publication-shrine-public-record-line");
    add(scene.add.rectangle(0, 13, 72, 2, color(PALETTE.goldStamp), 0.92), "snes-publication-shrine-public-gold-line");
  }

  return container;
}

export function addSnesStatutoryClock(scene: Phaser.Scene, options: SnesStatutoryClockOptions) {
  const depth = options.depth ?? 150;
  const ratio = Phaser.Math.Clamp(options.elapsedYears / Math.max(1, options.deadlineYears), 0, 1);
  const urgent = options.status === "at_risk" || options.status === "deadline_missed";
  const cleared = options.status === "buckram_gate_open" || options.status === "published";
  const accent = cleared ? PALETTE.openNetGreen : urgent ? PALETTE.classNetRed : PALETTE.goldStamp;
  const container = keepTagged(scene.add.container(options.x, options.y).setDepth(depth), "snes-statutory-clock", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.ellipse(0, 33, 76, 11, color(PALETTE.black), 0.68), "snes-statutory-clock-shadow");
  add(scene.add.rectangle(0, 4, 70, 60, color(PALETTE.black), 0.94).setStrokeStyle(2, color(accent)), "snes-statutory-clock-frame");
  add(scene.add.rectangle(0, -28, 54, 8, color(PALETTE.deepRuby), 1).setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-statutory-clock-title-band");
  add(scene.add.text(0, -32, "30-YR CLOCK", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: accent,
    align: "center"
  }).setOrigin(0.5, 0), "snes-statutory-clock-title");

  add(scene.add.circle(0, -2, 20, color(PALETTE.deepRuby), 1).setStrokeStyle(2, color(accent)), "snes-statutory-clock-face");
  add(scene.add.circle(0, -2, 14, color(PALETTE.black), 0.72).setStrokeStyle(1, color(PALETTE.stoneGray)), "snes-statutory-clock-face-inner");
  for (let index = 0; index < 30; index += 1) {
    const angle = Phaser.Math.DegToRad(-120 + index * 8);
    const tickX = Math.round(Math.cos(angle) * 17);
    const tickY = Math.round(Math.sin(angle) * 17) - 2;
    const passed = index / 29 <= ratio;
    const major = index % 5 === 0 || index === 29;
    add(scene.add.rectangle(tickX, tickY, major ? 3 : 2, major ? 3 : 2, color(passed ? accent : PALETTE.stoneDark), passed ? 1 : 0.72), "snes-statutory-clock-tick");
  }

  const handAngle = Phaser.Math.DegToRad(-120 + ratio * 240);
  const handLength = 13;
  const hand = scene.add.rectangle(
    Math.round(Math.cos(handAngle) * handLength / 2),
    Math.round(Math.sin(handAngle) * handLength / 2) - 2,
    handLength,
    2,
    color(accent),
    1
  ).setAngle(Phaser.Math.RadToDeg(handAngle));
  add(hand, "snes-statutory-clock-hand");
  add(scene.add.circle(0, -2, 3, color(PALETTE.goldStamp), 1).setStrokeStyle(1, color(PALETTE.black)), "snes-statutory-clock-hub");

  add(scene.add.rectangle(0, 22, 54, 7, color(PALETTE.black), 0.92).setStrokeStyle(1, color(PALETTE.stoneGray)), "snes-statutory-clock-progress-frame");
  add(scene.add.rectangle(-26 + Math.max(1, Math.round(52 * ratio)) / 2, 22, Math.max(1, Math.round(52 * ratio)), 3, color(accent), 0.94), "snes-statutory-clock-progress-fill");
  add(scene.add.text(0, 27, `${options.elapsedYears.toFixed(1)}/${options.deadlineYears}`, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.creamPaper,
    align: "center"
  }).setOrigin(0.5, 0), "snes-statutory-clock-year-label");

  const statusLabel = options.status === "deadline_missed"
    ? "MISS"
    : options.status === "at_risk"
      ? "RISK"
      : options.status === "published"
        ? "PUB"
        : options.status === "buckram_gate_open"
          ? "OPEN"
          : `${Math.max(0, options.yearsRemaining).toFixed(1)}Y`;
  add(scene.add.rectangle(0, 38, 46, 9, color(PALETTE.deepRuby), 1).setStrokeStyle(1, color(accent)), "snes-statutory-clock-status-frame");
  add(scene.add.text(0, 34, statusLabel, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: accent,
    align: "center"
  }).setOrigin(0.5, 0), "snes-statutory-clock-status-label");

  if (urgent && !cleared) {
    add(scene.add.rectangle(-30, -22, 3, 46, color(PALETTE.classNetRed), 0.9), "snes-statutory-clock-warning-bar");
    add(scene.add.rectangle(30, -22, 3, 46, color(PALETTE.classNetRed), 0.9), "snes-statutory-clock-warning-bar");
  }
  if (cleared) {
    add(scene.add.rectangle(-23, -22, 4, 4, color(PALETTE.goldStamp), 0.92), "snes-statutory-clock-clear-spark");
    add(scene.add.rectangle(23, -22, 4, 4, color(PALETTE.goldStamp), 0.92), "snes-statutory-clock-clear-spark");
    add(scene.add.rectangle(0, 14, 34, 2, color(PALETTE.openNetGreen), 0.9), "snes-statutory-clock-clear-line");
  }

  return container;
}

export function addSnesProgressMural(scene: Phaser.Scene, options: SnesProgressMuralOptions) {
  const depth = options.depth ?? 118;
  const accent = options.gateOpen ? PALETTE.openNetGreen : PALETTE.goldStamp;
  const completion = Phaser.Math.Clamp(options.completionRatio, 0, 1);
  const crystalTotal = Math.max(1, Math.min(8, options.crystalsRequired || 1));
  const crystalsShown = Math.min(options.crystalsCollected, crystalTotal);
  const container = keepTagged(scene.add.container(options.x, options.y).setDepth(depth), "snes-progress-mural", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.rectangle(0, 0, 138, 34, color(PALETTE.black), 0.9).setStrokeStyle(2, color(accent)), "snes-progress-mural-frame");
  add(scene.add.rectangle(0, -17, 90, 7, color(PALETTE.deepRuby), 1).setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-progress-mural-title-band");
  add(scene.add.text(0, -21, "VOLUME SEALS", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: accent,
    align: "center"
  }).setOrigin(0.5, 0), "snes-progress-mural-title");

  for (let index = 0; index < options.pendantsRequired; index += 1) {
    const x = -56 + index * 14;
    const filled = index < options.pendantsCollected;
    add(scene.add.triangle(x, -5, 0, 7, 6, -5, 12, 7, color(filled ? PALETTE.goldStamp : PALETTE.stoneDark), filled ? 1 : 0.82)
      .setStrokeStyle(1, color(filled ? PALETTE.creamPaper : PALETTE.stoneGray)), "snes-progress-mural-pendant-glyph");
    add(scene.add.rectangle(x + 1, 3, 8, 2, color(filled ? PALETTE.openNetGreen : PALETTE.classNetRed), filled ? 0.9 : 0.72), "snes-progress-mural-pendant-base");
  }
  add(scene.add.text(-42, 9, `PEN ${options.pendantsCollected}/${options.pendantsRequired}`, {
    fontFamily: "monospace",
    fontSize: "4px",
    color: options.pendantsCollected >= options.pendantsRequired ? PALETTE.goldStamp : PALETTE.stoneGray,
    align: "center"
  }).setOrigin(0.5, 0), "snes-progress-mural-pendant-label");

  for (let index = 0; index < crystalTotal; index += 1) {
    const x = -12 + index * 7;
    const filled = index < crystalsShown;
    add(scene.add.polygon(x, -3, [0, -5, 4, 0, 0, 5, -4, 0], color(filled ? PALETTE.terminalCyan : PALETTE.black), filled ? 0.95 : 0.82)
      .setStrokeStyle(1, color(filled ? PALETTE.creamPaper : PALETTE.stoneGray)), "snes-progress-mural-crystal-glyph");
    if (filled) {
      add(scene.add.rectangle(x, -4, 1, 3, color(PALETTE.white), 0.95), "snes-progress-mural-crystal-spark");
    }
  }
  add(scene.add.text(12, 9, `EQ ${options.crystalsCollected}/${options.crystalsRequired || 0}`, {
    fontFamily: "monospace",
    fontSize: "4px",
    color: options.crystalsRequired > 0 && options.crystalsCollected >= options.crystalsRequired ? PALETTE.terminalCyan : PALETTE.stoneGray,
    align: "center"
  }).setOrigin(0.5, 0), "snes-progress-mural-crystal-label");

  for (let index = 0; index < options.fragmentsNeeded; index += 1) {
    const x = 43 + index * 8;
    const filled = index < options.fragmentsCollected;
    add(scene.add.rectangle(x, -4, 6, 8, color(filled ? PALETTE.creamPaper : PALETTE.black), 1)
      .setStrokeStyle(1, color(filled ? PALETTE.goldStamp : PALETTE.stoneGray)), "snes-progress-mural-fragment-glyph");
    if (filled) {
      add(scene.add.rectangle(x - 2, -4, 1, 8, color(PALETTE.classNetRed), 1), "snes-progress-mural-fragment-redbar");
    }
  }
  add(scene.add.text(58, 9, `COV ${options.fragmentsCollected}/${options.fragmentsNeeded}`, {
    fontFamily: "monospace",
    fontSize: "4px",
    color: options.fragmentsCollected >= options.fragmentsNeeded ? PALETTE.goldStamp : PALETTE.stoneGray,
    align: "center"
  }).setOrigin(0.5, 0), "snes-progress-mural-fragment-label");

  const lamps = [
    { label: "MAP", ok: options.repositoryMapComplete, x: -55 },
    { label: "APP", ok: options.apparatusComplete, x: -25 },
    { label: "STD", ok: options.standardsClear, x: 25 },
    { label: "KEY", ok: options.buckramKeyHeld, x: 55 }
  ] as const;
  for (const lamp of lamps) {
    add(scene.add.rectangle(lamp.x, 20, 20, 8, color(PALETTE.black), 0.92)
      .setStrokeStyle(1, color(lamp.ok ? PALETTE.openNetGreen : PALETTE.classNetRed)), "snes-progress-mural-status-lamp-frame");
    add(scene.add.rectangle(lamp.x - 7, 20, 3, 3, color(lamp.ok ? PALETTE.openNetGreen : PALETTE.classNetRed), 0.94), "snes-progress-mural-status-lamp");
    add(scene.add.text(lamp.x + 2, 17, lamp.label, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: lamp.ok ? PALETTE.creamPaper : PALETTE.stoneGray,
      align: "center"
    }).setOrigin(0.5, 0), "snes-progress-mural-status-label");
  }

  add(scene.add.rectangle(0, 16, 44, 4, color(PALETTE.black), 0.88).setStrokeStyle(1, color(PALETTE.stoneGray)), "snes-progress-mural-completion-frame");
  add(scene.add.rectangle(-21 + Math.max(1, Math.round(42 * completion)) / 2, 16, Math.max(1, Math.round(42 * completion)), 2, color(accent), 0.94), "snes-progress-mural-completion-fill");
  if (options.gateOpen) {
    add(scene.add.rectangle(0, -10, 128, 2, color(PALETTE.openNetGreen), 0.78), "snes-progress-mural-open-line");
    add(scene.add.rectangle(0, 26, 110, 2, color(PALETTE.goldStamp), 0.78), "snes-progress-mural-open-line");
  }

  return container;
}

export function addSnesCherryBlossomGardenTileRoom(scene: Phaser.Scene, options: SnesCherryBlossomGardenTileRoomOptions = {}) {
  const depth = options.depth ?? -18;
  const container = keepTagged(scene.add.container(0, 0).setDepth(depth), "snes-cherry-garden-tile-room", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.rectangle(128, 136, 248, 178, color(PALETTE.black), 0.98)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-cherry-garden-outer-frame");
  add(scene.add.rectangle(128, 136, 238, 168, color(PALETTE.plantLeafDark), 1), "snes-cherry-garden-grass-base");

  for (let y = 52; y <= 212; y += 16) {
    for (let x = 16; x <= 240; x += 16) {
      const variant = ((x / 16) + (y / 16) * 2) % 5;
      const fill = variant === 0
        ? PALETTE.plantLeaf
        : variant === 1
          ? PALETTE.plantLeafShade
          : PALETTE.plantLeafDark;
      add(scene.add.rectangle(x, y, 16, 16, color(fill), 1), "snes-cherry-garden-grass-tile");
      add(scene.add.rectangle(x - 5, y + 4, 5, 1, color(PALETTE.creamPaper), variant === 2 ? 0.44 : 0.2), "snes-cherry-garden-grass-blade");
      if (variant === 3) {
        add(scene.add.rectangle(x + 5, y - 4, 2, 2, color(PALETTE.mutedRuby), 0.9), "snes-cherry-garden-petal-dot");
      }
    }
  }

  const pathTiles = [
    { x: 128, y: 68, w: 54, h: 22 },
    { x: 128, y: 108, w: 24, h: 78 },
    { x: 87, y: 132, w: 68, h: 24 },
    { x: 170, y: 132, w: 74, h: 24 },
    { x: 128, y: 180, w: 34, h: 64 },
    { x: 128, y: 214, w: 48, h: 20 }
  ] as const;
  for (const path of pathTiles) {
    add(scene.add.rectangle(path.x + 1, path.y + 2, path.w, path.h, color(PALETTE.deepBrown), 0.28), "snes-cherry-garden-path-shadow");
    add(scene.add.rectangle(path.x, path.y, path.w, path.h, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.paleGold), 0.72), "snes-cherry-garden-paper-path");
    for (let mark = -Math.floor(path.w / 2) + 8; mark < path.w / 2; mark += 16) {
      add(scene.add.rectangle(path.x + mark, path.y - 2, 4, 1, color(PALETTE.sepiaInk), 0.28), "snes-cherry-garden-path-pebble");
    }
  }

  for (let x = 16; x <= 240; x += 16) {
    add(scene.add.rectangle(x, 42, 16, 12, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.48), "snes-cherry-garden-top-wall-tile");
    add(scene.add.rectangle(x, 230, 16, 12, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.48), "snes-cherry-garden-bottom-wall-tile");
  }
  for (let y = 58; y <= 214; y += 16) {
    add(scene.add.rectangle(6, y, 12, 16, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.46), "snes-cherry-garden-left-wall-tile");
    add(scene.add.rectangle(250, y, 12, 16, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.46), "snes-cherry-garden-right-wall-tile");
  }

  add(scene.add.ellipse(63, 98, 58, 36, color(PALETTE.black), 0.42), "snes-cherry-garden-koi-pond-shadow");
  add(scene.add.ellipse(63, 96, 54, 34, color(PALETTE.mapWater), 1)
    .setStrokeStyle(2, color(PALETTE.creamPaper), 0.9), "snes-cherry-garden-koi-pond");
  for (const ripple of [
    { x: 50, y: 92, w: 12 },
    { x: 66, y: 99, w: 16 },
    { x: 78, y: 88, w: 10 }
  ] as const) {
    add(scene.add.rectangle(ripple.x, ripple.y, ripple.w, 1, color(PALETTE.terminalCyan), 0.72), "snes-cherry-garden-koi-pond-ripple");
  }
  add(scene.add.rectangle(57, 100, 7, 3, color(PALETTE.goldStamp), 1)
    .setStrokeStyle(1, color(PALETTE.deepRuby)), "snes-cherry-garden-koi-fish");

  add(scene.add.rectangle(128, 69, 60, 36, color(PALETTE.black), 0.38), "snes-cherry-garden-pavilion-shadow");
  add(scene.add.rectangle(128, 66, 54, 28, color(PALETTE.bronze), 1)
    .setStrokeStyle(2, color(PALETTE.deepBrown)), "snes-cherry-garden-pavilion");
  add(scene.add.triangle(128, 43, -34, 24, 34, 24, 0, 0, color(PALETTE.deepRuby), 1)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-cherry-garden-pavilion-roof");
  add(scene.add.rectangle(128, 65, 34, 10, color(PALETTE.creamPaper), 0.94)
    .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-cherry-garden-pavilion-scroll");
  add(scene.add.rectangle(116, 66, 1, 8, color(PALETTE.classNetRed), 1), "snes-cherry-garden-pavilion-scroll-margin");
  add(scene.add.rectangle(134, 66, 12, 2, color(PALETTE.goldStamp), 0.9), "snes-cherry-garden-pavilion-scroll-line");

  for (const tree of [
    { x: 37, y: 154, canopyW: 38, canopyH: 28, trunkW: 9, trunkH: 18, highlightW: 18, highlightH: 12 },
    { x: 205, y: 154, canopyW: 38, canopyH: 28, trunkW: 9, trunkH: 18, highlightW: 18, highlightH: 12 },
    { x: 207, y: 85, canopyW: 34, canopyH: 24, trunkW: 8, trunkH: 16, highlightW: 16, highlightH: 10 },
    { x: 37, y: 198, canopyW: 32, canopyH: 24, trunkW: 8, trunkH: 15, highlightW: 15, highlightH: 10 }
  ] as const) {
    add(scene.add.rectangle(tree.x, tree.y + Math.round(tree.trunkH / 2) + 8, tree.trunkW, tree.trunkH, color(PALETTE.deepBrown), 1)
      .setStrokeStyle(1, color(PALETTE.black), 0.7), "snes-cherry-garden-tree-trunk");
    add(scene.add.ellipse(tree.x, tree.y, tree.canopyW, tree.canopyH, color(PALETTE.mutedRuby), 1)
      .setStrokeStyle(2, color(PALETTE.deepRuby), 0.9), "snes-cherry-garden-cherry-tree-canopy");
    add(scene.add.ellipse(tree.x - 8, tree.y - 4, tree.highlightW, tree.highlightH, color(PALETTE.creamPaper), 0.34), "snes-cherry-garden-blossom-highlight");
  }

  add(scene.add.rectangle(128, 156, 30, 20, color(PALETTE.black), 0.74)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-cherry-garden-save-point");
  add(scene.add.rectangle(128, 152, 18, 7, color(PALETTE.terminalCyan), 0.94), "snes-cherry-garden-save-point-glow");
  add(scene.add.text(128, 159, "SAVE", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-cherry-garden-save-point-label");

  add(scene.add.rectangle(96, 133, 40, 22, color(PALETTE.black), 0.54), "snes-cherry-garden-historian-mat-shadow");
  add(scene.add.rectangle(96, 131, 36, 18, color(PALETTE.creamPaper), 1)
    .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-cherry-garden-historian-mat");
  add(scene.add.rectangle(88, 128, 9, 7, color(PALETTE.deepRuby), 1)
    .setStrokeStyle(1, color(PALETTE.black)), "snes-cherry-garden-historian-book");
  add(scene.add.rectangle(101, 130, 12, 2, color(PALETTE.sepiaInk), 0.82), "snes-cherry-garden-historian-note-line");

  add(scene.add.rectangle(174, 157, 35, 22, color(PALETTE.black), 0.55), "snes-cherry-garden-ruby-pen-chest-shadow");
  add(scene.add.rectangle(174, 155, 31, 18, color(PALETTE.deepRuby), 1)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-cherry-garden-ruby-pen-chest");
  add(scene.add.rectangle(174, 150, 25, 5, color(PALETTE.buckramHighlight), 1), "snes-cherry-garden-ruby-pen-chest-lid");
  add(scene.add.rectangle(174, 157, 7, 5, color(PALETTE.goldStamp), 1)
    .setStrokeStyle(1, color(PALETTE.black), 0.62), "snes-cherry-garden-ruby-pen-chest-lock");

  add(scene.add.rectangle(128, 219, 42, 16, color(PALETTE.black), 0.82)
    .setStrokeStyle(1, color(PALETTE.creamPaper)), "snes-cherry-garden-return-threshold");
  add(scene.add.rectangle(128, 213, 22, 4, color(PALETTE.goldStamp), 1), "snes-cherry-garden-return-stair-top");
  add(scene.add.rectangle(128, 219, 30, 4, color(PALETTE.bronze), 1), "snes-cherry-garden-return-stair-mid");
  add(scene.add.rectangle(128, 225, 38, 4, color(PALETTE.deepBrown), 1), "snes-cherry-garden-return-stair-bottom");

  add(scene.add.rectangle(128, 47, 102, 11, color(PALETTE.black), 0.9)
    .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-cherry-garden-title-frame");
  add(scene.add.text(128, 43, "CHERRY GARDEN", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-cherry-garden-title");

  return container;
}

export function addSnesBlackVaultTileRoom(scene: Phaser.Scene, options: SnesBlackVaultTileRoomOptions = {}) {
  const depth = options.depth ?? -18;
  const container = keepTagged(scene.add.container(0, 0).setDepth(depth), "snes-black-vault-tile-room", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.rectangle(128, 136, 248, 178, color(PALETTE.black), 0.98)
    .setStrokeStyle(2, color(PALETTE.classNetRed)), "snes-black-vault-outer-frame");
  add(scene.add.rectangle(128, 136, 238, 168, color(PALETTE.shadowNavy), 1), "snes-black-vault-floor-base");

  for (let y = 52; y <= 212; y += 16) {
    for (let x = 16; x <= 240; x += 16) {
      const variant = (x / 16 + y / 16 * 2) % 5;
      const fill = variant === 0
        ? PALETTE.stoneDark
        : variant === 1
          ? PALETTE.deepRuby
          : PALETTE.black;
      add(scene.add.rectangle(x, y, 16, 16, color(fill), variant === 1 ? 0.96 : 1), "snes-black-vault-floor-tile");
      add(scene.add.rectangle(x - 6, y - 6, 2, 1, color(PALETTE.classNetRed), variant === 0 ? 0.46 : 0.22), "snes-black-vault-floor-red-glint");
      if (variant === 3) add(scene.add.rectangle(x + 4, y + 5, 5, 1, color(PALETTE.goldStamp), 0.26), "snes-black-vault-floor-crack");
    }
  }

  for (let x = 16; x <= 240; x += 16) {
    add(scene.add.rectangle(x, 42, 16, 12, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.classNetRed), 0.58), "snes-black-vault-top-wall-tile");
    add(scene.add.rectangle(x, 230, 16, 12, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.42), "snes-black-vault-bottom-wall-tile");
  }
  for (let y = 58; y <= 214; y += 16) {
    add(scene.add.rectangle(6, y, 12, 16, color(PALETTE.black), 1)
      .setStrokeStyle(1, color(PALETTE.classNetRed), 0.5), "snes-black-vault-left-wall-tile");
    add(scene.add.rectangle(250, y, 12, 16, color(PALETTE.black), 1)
      .setStrokeStyle(1, color(PALETTE.classNetRed), 0.5), "snes-black-vault-right-wall-tile");
  }

  for (const door of [
    { x: 128, y: 48, w: 42, h: 14, label: "CORE" },
    { x: 24, y: 136, w: 14, h: 42, label: "LOCK" },
    { x: 232, y: 136, w: 14, h: 42, label: "LOCK" }
  ] as const) {
    add(scene.add.rectangle(door.x, door.y, door.w, door.h, color(PALETTE.black), 0.92)
      .setStrokeStyle(2, color(PALETTE.classNetRed)), "snes-black-vault-blast-door");
    add(scene.add.rectangle(door.x, door.y, Math.max(3, door.w - 12), 3, color(PALETTE.classNetRed), 0.96), "snes-black-vault-blast-door-light");
    add(scene.add.text(door.x, door.y - 3, door.label, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0), "snes-black-vault-blast-door-label");
  }

  for (const fissure of [
    { x: 57, y: 122 },
    { x: 199, y: 122 }
  ] as const) {
    add(scene.add.rectangle(fissure.x, fissure.y, 34, 100, color(PALETTE.black), 0.88)
      .setStrokeStyle(2, color(PALETTE.deepRuby)), "snes-black-vault-fissure-chasm");
    for (let y = -36; y <= 36; y += 18) {
      add(scene.add.rectangle(fissure.x, fissure.y + y, 20, 4, color(PALETTE.classNetRed), 0.72)
        .setAngle(y % 36 === 0 ? -12 : 14), "snes-black-vault-fissure-redaction-flame");
      add(scene.add.rectangle(fissure.x + 3, fissure.y + y + 4, 12, 2, color(PALETTE.goldStamp), 0.5), "snes-black-vault-fissure-glow");
    }
  }

  add(scene.add.rectangle(128, 86, 72, 52, color(PALETTE.black), 0.78), "snes-black-vault-altar-shadow");
  add(scene.add.rectangle(128, 82, 66, 42, color(PALETTE.deepRuby), 1)
    .setStrokeStyle(2, color(PALETTE.classNetRed)), "snes-black-vault-altar");
  add(scene.add.rectangle(128, 64, 54, 10, color(PALETTE.black), 0.95)
    .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-black-vault-altar-plaque");
  add(scene.add.text(128, 59, "DANN-E CORE", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-black-vault-altar-label");
  add(scene.add.rectangle(128, 88, 28, 22, color(PALETTE.black), 0.94)
    .setStrokeStyle(2, color(PALETTE.classNetRed)), "snes-black-vault-core-socket");
  add(scene.add.rectangle(128, 82, 18, 4, color(PALETTE.classNetRed), 1), "snes-black-vault-core-eye");
  add(scene.add.rectangle(128, 94, 10, 8, color(PALETTE.goldStamp), 0.9)
    .setStrokeStyle(1, color(PALETTE.black)), "snes-black-vault-core-chest");

  for (const station of [
    { x: 91, y: 125, label: "SRC", tint: PALETTE.terminalCyan },
    { x: 165, y: 125, label: "STD", tint: PALETTE.goldStamp },
    { x: 91, y: 165, label: "EQ", tint: PALETTE.classNetRed },
    { x: 165, y: 165, label: "PUB", tint: PALETTE.openNetGreen }
  ] as const) {
    add(scene.add.rectangle(station.x, station.y + 5, 28, 8, color(PALETTE.black), 0.56), "snes-black-vault-review-station-shadow");
    add(scene.add.rectangle(station.x, station.y, 24, 17, color(PALETTE.black), 0.88)
      .setStrokeStyle(1, color(station.tint)), "snes-black-vault-review-station");
    add(scene.add.rectangle(station.x - 5, station.y - 2, 8, 8, color(PALETTE.creamPaper), 0.96)
      .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-black-vault-review-station-paper");
    add(scene.add.text(station.x + 5, station.y - 5, station.label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: station.tint,
      align: "center"
    }).setOrigin(0.5, 0), "snes-black-vault-review-station-label");
  }

  for (const rubble of [
    { x: 91, y: 162 },
    { x: 165, y: 162 }
  ] as const) {
    add(scene.add.rectangle(rubble.x, rubble.y + 6, 22, 8, color(PALETTE.black), 0.46), "snes-black-vault-rubble-shadow");
    add(scene.add.rectangle(rubble.x - 6, rubble.y, 10, 9, color(PALETTE.stoneGray), 1)
      .setStrokeStyle(1, color(PALETTE.black)), "snes-black-vault-rubble-stone");
    add(scene.add.rectangle(rubble.x + 5, rubble.y + 2, 12, 7, color(PALETTE.stoneLight), 1)
      .setStrokeStyle(1, color(PALETTE.black)), "snes-black-vault-rubble-stone");
    add(scene.add.rectangle(rubble.x + 1, rubble.y - 6, 9, 8, color(PALETTE.stoneDark), 1)
      .setStrokeStyle(1, color(PALETTE.black)), "snes-black-vault-rubble-stone");
  }

  add(scene.add.rectangle(128, 156, 22, 16, color(PALETTE.black), 0.94)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-black-vault-treaty-fragment-frame");
  add(scene.add.rectangle(124, 154, 9, 11, color(PALETTE.creamPaper), 1)
    .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-black-vault-treaty-fragment-page-a");
  add(scene.add.rectangle(131, 157, 9, 11, color(PALETTE.creamPaper), 1)
    .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-black-vault-treaty-fragment-page-b");
  add(scene.add.rectangle(131, 158, 5, 1, color(PALETTE.classNetRed), 1), "snes-black-vault-treaty-fragment-redline");

  add(scene.add.rectangle(128, 219, 40, 16, color(PALETTE.black), 0.88)
    .setStrokeStyle(1, color(PALETTE.creamPaper)), "snes-black-vault-return-threshold");
  add(scene.add.rectangle(128, 213, 22, 4, color(PALETTE.goldStamp), 1), "snes-black-vault-return-stair-top");
  add(scene.add.rectangle(128, 219, 30, 4, color(PALETTE.bronze), 1), "snes-black-vault-return-stair-mid");
  add(scene.add.rectangle(128, 225, 38, 4, color(PALETTE.deepBrown), 1), "snes-black-vault-return-stair-bottom");

  add(scene.add.rectangle(128, 47, 104, 11, color(PALETTE.black), 0.92)
    .setStrokeStyle(1, color(PALETTE.classNetRed)), "snes-black-vault-room-title-frame");
  add(scene.add.text(128, 43, "BLACK VAULT LAIR", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-black-vault-room-title");

  return container;
}

export function addSnesSenateHearingChamberTileRoom(scene: Phaser.Scene, options: SnesSenateHearingChamberTileRoomOptions = {}) {
  const depth = options.depth ?? -18;
  const container = keepTagged(scene.add.container(0, 0).setDepth(depth), "snes-senate-hearing-chamber-tile-room", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.rectangle(128, 136, 248, 178, color(PALETTE.black), 0.98)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-senate-room-outer-frame");
  add(scene.add.rectangle(128, 136, 238, 168, color(PALETTE.deepRuby), 1), "snes-senate-room-carpet-base");

  for (let y = 52; y <= 212; y += 16) {
    for (let x = 16; x <= 240; x += 16) {
      const variant = (x / 16 + y / 16) % 4;
      const fill = variant === 0
        ? PALETTE.buckramRed
        : variant === 1
          ? PALETTE.deepRuby
          : PALETTE.mutedRuby;
      add(scene.add.rectangle(x, y, 16, 16, color(fill), 1), "snes-senate-carpet-tile");
      add(scene.add.rectangle(x, y - 6, 10, 1, color(PALETTE.goldStamp), variant === 0 ? 0.22 : 0.12), "snes-senate-carpet-thread");
      if (variant === 2) add(scene.add.rectangle(x - 5, y + 5, 2, 1, color(PALETTE.creamPaper), 0.26), "snes-senate-carpet-fleck");
    }
  }

  for (let x = 16; x <= 240; x += 16) {
    add(scene.add.rectangle(x, 42, 16, 12, color(PALETTE.deepBrown), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.44), "snes-senate-top-wall-tile");
    add(scene.add.rectangle(x, 230, 16, 12, color(PALETTE.deepBrown), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.44), "snes-senate-bottom-wall-tile");
  }
  for (let y = 58; y <= 214; y += 16) {
    add(scene.add.rectangle(6, y, 12, 16, color(PALETTE.deepBrown), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.42), "snes-senate-left-wall-tile");
    add(scene.add.rectangle(250, y, 12, 16, color(PALETTE.deepBrown), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.42), "snes-senate-right-wall-tile");
  }

  add(scene.add.rectangle(128, 68, 206, 38, color(PALETTE.black), 0.58), "snes-senate-dais-shadow");
  add(scene.add.rectangle(128, 65, 204, 34, color(PALETTE.deepBrown), 1)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-senate-committee-dais");
  add(scene.add.rectangle(128, 51, 178, 8, color(PALETTE.black), 0.88)
    .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-senate-dais-nameplate");
  add(scene.add.text(128, 47, "COMMITTEE DAIS", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-senate-dais-label");

  for (let seat = 0; seat < 7; seat += 1) {
    const x = 50 + seat * 26;
    add(scene.add.rectangle(x, 66, 18, 12, color(PALETTE.bronze), 1)
      .setStrokeStyle(1, color(PALETTE.black)), "snes-senate-dais-seat");
    add(scene.add.rectangle(x, 58, 16, 7, color(PALETTE.archiveAmber), 1)
      .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-senate-dais-folder");
    add(scene.add.rectangle(x - 4, 58, 1, 7, color(PALETTE.classNetRed), 1), "snes-senate-dais-folder-redbar");
  }

  for (const table of [
    { x: 64, y: 110, label: "COUNSEL" },
    { x: 192, y: 110, label: "REVIEW" }
  ] as const) {
    add(scene.add.rectangle(table.x + 2, table.y + 5, 40, 14, color(PALETTE.black), 0.46), "snes-senate-counsel-table-shadow");
    add(scene.add.rectangle(table.x, table.y, 36, 30, color(PALETTE.deepBrown), 1)
      .setStrokeStyle(2, color(PALETTE.black)), "snes-senate-counsel-table");
    add(scene.add.rectangle(table.x, table.y - 8, 28, 7, color(PALETTE.archiveAmber), 1)
      .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-senate-counsel-folder");
    add(scene.add.rectangle(table.x + 8, table.y + 2, 10, 4, color(PALETTE.creamPaper), 0.95)
      .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-senate-counsel-note");
    add(scene.add.text(table.x, table.y + 8, table.label, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0), "snes-senate-counsel-label");
  }

  for (const bench of [
    { x: 49, y: 157 },
    { x: 207, y: 157 }
  ] as const) {
    add(scene.add.rectangle(bench.x + 2, bench.y + 5, 46, 12, color(PALETTE.black), 0.42), "snes-senate-gallery-bench-shadow");
    for (let row = 0; row < 3; row += 1) {
      add(scene.add.rectangle(bench.x, bench.y - 8 + row * 9, 42, 5, color(PALETTE.bronze), 1)
        .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-senate-gallery-bench-row");
    }
    add(scene.add.rectangle(bench.x, bench.y + 15, 36, 5, color(PALETTE.black), 0.84)
      .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-senate-gallery-rail");
  }

  add(scene.add.rectangle(128, 141, 52, 24, color(PALETTE.black), 0.55), "snes-senate-witness-table-shadow");
  add(scene.add.rectangle(128, 137, 48, 22, color(PALETTE.archiveAmber), 1)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-senate-witness-table");
  add(scene.add.rectangle(128, 127, 36, 8, color(PALETTE.black), 0.9)
    .setStrokeStyle(1, color(PALETTE.terminalCyan)), "snes-senate-witness-mic-panel");
  add(scene.add.rectangle(119, 127, 6, 5, color(PALETTE.terminalCyan), 0.95), "snes-senate-witness-mic");
  add(scene.add.rectangle(137, 127, 6, 5, color(PALETTE.classNetRed), 0.95), "snes-senate-record-light");
  add(scene.add.rectangle(119, 139, 12, 10, color(PALETTE.creamPaper), 1)
    .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-senate-witness-docket");
  add(scene.add.rectangle(116, 139, 1, 9, color(PALETTE.classNetRed), 1), "snes-senate-witness-docket-redbar");
  add(scene.add.rectangle(139, 141, 12, 7, color(PALETTE.goldStamp), 0.9)
    .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-senate-hearing-seal");
  add(scene.add.text(128, 151, "WITNESS", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.deepBrown,
    align: "center"
  }).setOrigin(0.5, 0), "snes-senate-witness-label");

  add(scene.add.rectangle(128, 219, 40, 16, color(PALETTE.black), 0.82)
    .setStrokeStyle(1, color(PALETTE.creamPaper)), "snes-senate-return-threshold");
  add(scene.add.rectangle(128, 213, 22, 4, color(PALETTE.goldStamp), 1), "snes-senate-return-stair-top");
  add(scene.add.rectangle(128, 219, 30, 4, color(PALETTE.bronze), 1), "snes-senate-return-stair-mid");
  add(scene.add.rectangle(128, 225, 38, 4, color(PALETTE.deepBrown), 1), "snes-senate-return-stair-bottom");

  add(scene.add.rectangle(128, 177, 84, 10, color(PALETTE.black), 0.86)
    .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-senate-hearing-route-plaque");
  add(scene.add.text(128, 173, "HAC REVIEW RECORD", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-senate-hearing-route-label");

  add(scene.add.rectangle(128, 47, 126, 11, color(PALETTE.black), 0.9)
    .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-senate-room-title-frame");
  add(scene.add.text(128, 43, "SENATE HEARING", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-senate-room-title");

  return container;
}

export function addSnesDanneArena(scene: Phaser.Scene, options: SnesDanneArenaOptions) {
  const depth = options.depth ?? -8;
  const phaseIndex = Phaser.Math.Clamp(options.phaseIndex ?? 0, 0, Math.max(0, (options.phaseCount ?? 4) - 1));
  const phaseCount = Math.max(1, options.phaseCount ?? 4);
  const accent = options.gateOpen ? PALETTE.openNetGreen : options.shortcutOffered ? PALETTE.classNetRed : PALETTE.goldStamp;
  const container = keepTagged(scene.add.container(options.x, options.y).setDepth(depth), "snes-danne-arena", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.ellipse(0, 9, 148, 68, color(PALETTE.black), 0.56), "snes-danne-arena-shadow");
  add(scene.add.rectangle(0, 6, 112, 58, color(PALETTE.deepRuby), 0.54).setStrokeStyle(2, color(accent)), "snes-danne-arena-core-floor");
  add(scene.add.rectangle(0, 6, 92, 38, color(PALETTE.black), 0.42).setStrokeStyle(1, color(PALETTE.buckramRed)), "snes-danne-arena-inner-floor");

  for (const lane of [
    { x: 0, y: 6, width: 130, height: 3, angle: 0 },
    { x: 0, y: 6, width: 100, height: 3, angle: 90 },
    { x: 0, y: 6, width: 116, height: 2, angle: 34 },
    { x: 0, y: 6, width: 116, height: 2, angle: -34 }
  ] as const) {
    add(scene.add.rectangle(lane.x, lane.y, lane.width, lane.height, color(PALETTE.classNetRed), 0.34).setAngle(lane.angle), "snes-danne-arena-ego-bolt-lane");
  }

  const stations = [
    { label: "SRC", x: 0, y: -31, tint: PALETTE.terminalCyan },
    { label: "EQ", x: 53, y: 7, tint: PALETTE.classNetRed },
    { label: "PRF", x: 0, y: 45, tint: PALETTE.creamPaper },
    { label: "STD", x: -53, y: 7, tint: PALETTE.goldStamp }
  ] as const;
  for (const station of stations) {
    add(scene.add.rectangle(station.x, station.y + 5, 24, 8, color(PALETTE.black), 0.62), "snes-danne-arena-station-shadow");
    add(scene.add.rectangle(station.x, station.y, 22, 16, color(PALETTE.black), 0.88)
      .setStrokeStyle(1, color(station.tint)), "snes-danne-arena-review-station");
    add(scene.add.rectangle(station.x - 5, station.y - 2, 8, 7, color(PALETTE.creamPaper), 1)
      .setStrokeStyle(1, color(PALETTE.sepiaInk)), "snes-danne-arena-station-paper");
    add(scene.add.rectangle(station.x - 8, station.y - 2, 1, 7, color(PALETTE.classNetRed), 1), "snes-danne-arena-station-redbar");
    add(scene.add.text(station.x + 5, station.y - 5, station.label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: station.tint,
      align: "center"
    }).setOrigin(0.5, 0), "snes-danne-arena-station-label");
  }

  add(scene.add.rectangle(0, 6, 30, 24, color(PALETTE.black), 0.92).setStrokeStyle(2, color(PALETTE.classNetRed)), "snes-danne-arena-core");
  add(scene.add.rectangle(0, 0, 20, 4, color(PALETTE.classNetRed), 0.98), "snes-danne-arena-core-eye");
  add(scene.add.rectangle(0, 9, 10, 8, color(accent), 0.95).setStrokeStyle(1, color(PALETTE.black)), "snes-danne-arena-core-chest");
  add(scene.add.text(0, 18, "DANN-E", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.creamPaper,
    align: "center"
  }).setOrigin(0.5, 0), "snes-danne-arena-core-label");

  add(scene.add.rectangle(0, -47, 78, 9, color(PALETTE.black), 0.86).setStrokeStyle(1, color(accent)), "snes-danne-arena-phase-band");
  add(scene.add.text(0, -51, options.gateOpen ? "LEGAL ROUTE READY" : "DEADLINE PRESSURE", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: accent,
    align: "center"
  }).setOrigin(0.5, 0), "snes-danne-arena-phase-title");

  for (let index = 0; index < phaseCount; index += 1) {
    const x = -24 + index * 16;
    const active = index === phaseIndex;
    const cleared = index < phaseIndex || options.gateOpen;
    const lampColor = active ? PALETTE.classNetRed : cleared ? PALETTE.openNetGreen : PALETTE.stoneGray;
    add(scene.add.rectangle(x, -36, 10, 8, color(PALETTE.black), 0.92).setStrokeStyle(1, color(lampColor)), "snes-danne-arena-phase-lamp-frame");
    add(scene.add.rectangle(x, -36, 5, 3, color(lampColor), active ? 0.98 : 0.74), "snes-danne-arena-phase-lamp");
    add(scene.add.text(x, -32, `${index + 1}`, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: lampColor,
      align: "center"
    }).setOrigin(0.5, 0), "snes-danne-arena-phase-label");
  }

  if (options.shortcutOffered) {
    add(scene.add.rectangle(0, 56, 86, 8, color(PALETTE.black), 0.92).setStrokeStyle(1, color(PALETTE.classNetRed)), "snes-danne-arena-shortcut-warning-frame");
    add(scene.add.text(0, 52, "SHORTCUT = DEFECT", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.classNetRed,
      align: "center"
    }).setOrigin(0.5, 0), "snes-danne-arena-shortcut-warning-label");
  }

  return container;
}

export function addSnesNaraStacksTileRoom(scene: Phaser.Scene, options: SnesNaraStacksTileRoomOptions = {}) {
  const depth = options.depth ?? -18;
  const container = keepTagged(scene.add.container(0, 0).setDepth(depth), "snes-nara-stacks-tile-room", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.rectangle(128, 136, 248, 178, color(PALETTE.black), 0.98)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-nara-room-outer-frame");
  add(scene.add.rectangle(128, 136, 238, 168, color(PALETTE.stoneDark), 1), "snes-nara-room-floor-base");

  for (let y = 52; y <= 212; y += 16) {
    for (let x = 16; x <= 240; x += 16) {
      const variant = ((x / 16) + (y / 16)) % 4;
      const fill = variant === 0 ? PALETTE.stoneGray : variant === 1 ? PALETTE.stoneLight : PALETTE.stoneDark;
      add(scene.add.rectangle(x, y, 16, 16, color(fill), 1), "snes-nara-floor-tile");
      add(scene.add.rectangle(x - 7, y - 7, 2, 1, color(PALETTE.stoneLight), 0.55), "snes-nara-floor-scuff");
      if (variant === 2) add(scene.add.rectangle(x + 5, y + 4, 3, 1, color(PALETTE.black), 0.34), "snes-nara-floor-crack");
    }
  }

  for (let x = 16; x <= 240; x += 16) {
    add(scene.add.rectangle(x, 42, 16, 12, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.45), "snes-nara-top-wall-tile");
    add(scene.add.rectangle(x, 230, 16, 12, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.45), "snes-nara-bottom-wall-tile");
  }
  for (let y = 58; y <= 214; y += 16) {
    add(scene.add.rectangle(6, y, 12, 16, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.45), "snes-nara-left-wall-tile");
    add(scene.add.rectangle(250, y, 12, 16, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.45), "snes-nara-right-wall-tile");
  }

  const shelves = [
    { x: 24, y: 52, w: 54, h: 28, label: "17" },
    { x: 102, y: 52, w: 54, h: 28, label: "18" },
    { x: 178, y: 52, w: 54, h: 28, label: "23" },
    { x: 24, y: 112, w: 54, h: 28, label: "A" },
    { x: 102, y: 112, w: 54, h: 28, label: "B" },
    { x: 178, y: 112, w: 54, h: 28, label: "C" }
  ] as const;
  for (const shelf of shelves) {
    const cx = shelf.x + shelf.w / 2;
    const cy = shelf.y + shelf.h / 2;
    add(scene.add.rectangle(cx + 2, cy + 3, shelf.w, shelf.h, color(PALETTE.black), 0.55), "snes-nara-shelf-shadow");
    add(scene.add.rectangle(cx, cy, shelf.w, shelf.h, color(PALETTE.stoneGray), 1)
      .setStrokeStyle(2, color(PALETTE.black)), "snes-nara-shelf-block");
    add(scene.add.rectangle(cx, shelf.y + 5, shelf.w - 6, 8, color(PALETTE.stoneLight), 1), "snes-nara-shelf-top");
    for (let row = 0; row < 2; row += 1) {
      const yy = shelf.y + 14 + row * 8;
      add(scene.add.rectangle(cx, yy, shelf.w - 8, 4, color(PALETTE.bronze), 1)
        .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-nara-shelf-box-row");
      for (let mark = 0; mark < 4; mark += 1) {
        add(scene.add.rectangle(shelf.x + 10 + mark * 10, yy, 2, 4, color(mark % 2 === 0 ? PALETTE.creamPaper : PALETTE.classNetRed), 0.82), "snes-nara-shelf-class-mark");
      }
    }
    add(scene.add.rectangle(cx, shelf.y + 13, 18, 12, color(PALETTE.creamPaper), 0.96)
      .setStrokeStyle(1, color(PALETTE.black)), "snes-nara-shelf-row-plaque");
    add(scene.add.text(cx, shelf.y + 8, `ROW ${shelf.label}`, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black,
      align: "center"
    }).setOrigin(0.5, 0), "snes-nara-shelf-row-label");
  }

  for (const carton of [
    { x: 57, y: 181 },
    { x: 199, y: 181 }
  ] as const) {
    add(scene.add.rectangle(carton.x, carton.y + 5, 42, 10, color(PALETTE.black), 0.42), "snes-nara-carton-shadow");
    add(scene.add.rectangle(carton.x, carton.y, 42, 26, color(PALETTE.bronze), 1)
      .setStrokeStyle(2, color(PALETTE.deepBrown)), "snes-nara-sealed-cartons");
    add(scene.add.rectangle(carton.x, carton.y - 5, 34, 4, color(PALETTE.creamPaper), 0.9), "snes-nara-carton-label");
    add(scene.add.rectangle(carton.x + 10, carton.y + 4, 12, 3, color(PALETTE.classNetRed), 0.86), "snes-nara-carton-seal");
  }

  for (const rail of [
    { x: 128, y: 92, w: 96, h: 3 },
    { x: 128, y: 152, w: 96, h: 3 },
    { x: 24, y: 138, w: 3, h: 96 },
    { x: 232, y: 138, w: 3, h: 96 }
  ] as const) {
    add(scene.add.rectangle(rail.x, rail.y, rail.w, rail.h, color(PALETTE.classNetRed), 0.42), "snes-nara-drone-patrol-rail");
    add(scene.add.rectangle(rail.x, rail.y, Math.max(rail.w, 5), Math.max(rail.h, 5), color(PALETTE.black), 0)
      .setStrokeStyle(1, color(PALETTE.classNetRed), 0.44), "snes-nara-drone-patrol-outline");
  }

  add(scene.add.rectangle(128, 92, 24, 18, color(PALETTE.black), 0.9)
    .setStrokeStyle(2, color(PALETTE.terminalCyan)), "snes-nara-stack-note-station");
  add(scene.add.rectangle(124, 90, 10, 12, color(PALETTE.creamPaper), 1)
    .setStrokeStyle(1, color(PALETTE.sepiaInk)), "snes-nara-stack-note-page");
  add(scene.add.rectangle(121, 90, 1, 11, color(PALETTE.classNetRed), 1), "snes-nara-stack-note-margin");
  add(scene.add.rectangle(134, 90, 7, 4, color(PALETTE.terminalCyan), 0.96), "snes-nara-stack-note-cue");

  add(scene.add.rectangle(204, 184, 18, 14, color(PALETTE.black), 0.92)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-nara-treaty-fragment-frame");
  add(scene.add.rectangle(202, 183, 8, 10, color(PALETTE.creamPaper), 1)
    .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-nara-treaty-fragment-page-a");
  add(scene.add.rectangle(207, 186, 8, 10, color(PALETTE.creamPaper), 1)
    .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-nara-treaty-fragment-page-b");
  add(scene.add.rectangle(207, 187, 5, 1, color(PALETTE.classNetRed), 1), "snes-nara-treaty-fragment-redline");

  add(scene.add.rectangle(128, 219, 40, 16, color(PALETTE.black), 0.82)
    .setStrokeStyle(1, color(PALETTE.creamPaper)), "snes-nara-return-threshold");
  add(scene.add.rectangle(128, 213, 22, 4, color(PALETTE.goldStamp), 1), "snes-nara-return-stair-top");
  add(scene.add.rectangle(128, 219, 30, 4, color(PALETTE.bronze), 1), "snes-nara-return-stair-mid");
  add(scene.add.rectangle(128, 225, 38, 4, color(PALETTE.deepBrown), 1), "snes-nara-return-stair-bottom");

  add(scene.add.rectangle(128, 47, 92, 11, color(PALETTE.black), 0.9)
    .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-nara-room-title-frame");
  add(scene.add.text(128, 43, "NARA II STACKS", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-nara-room-title");

  return container;
}

export function addSnesEmbassyCableRoomTileRoom(scene: Phaser.Scene, options: SnesEmbassyCableRoomTileRoomOptions = {}) {
  const depth = options.depth ?? -18;
  const container = keepTagged(scene.add.container(0, 0).setDepth(depth), "snes-embassy-cable-room-tile-room", options.track);
  const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
    container.add(tag(object, name));
    return object;
  };

  add(scene.add.rectangle(128, 136, 248, 178, color(PALETTE.black), 0.98)
    .setStrokeStyle(2, color(PALETTE.goldStamp)), "snes-embassy-room-outer-frame");
  add(scene.add.rectangle(128, 136, 238, 168, color(PALETTE.stoneDark), 1), "snes-embassy-room-floor-base");

  for (let y = 52; y <= 212; y += 16) {
    for (let x = 16; x <= 240; x += 16) {
      const variant = (x / 16 + y / 8) % 5;
      const fill = variant === 0
        ? PALETTE.stoneLight
        : variant === 1
          ? PALETTE.stoneGray
          : PALETTE.stoneDark;
      add(scene.add.rectangle(x, y, 16, 16, color(fill), 1), "snes-embassy-floor-tile");
      add(scene.add.rectangle(x - 7, y - 7, 2, 1, color(PALETTE.creamPaper), variant === 0 ? 0.42 : 0.24), "snes-embassy-floor-glint");
      if (variant === 3) add(scene.add.rectangle(x + 4, y + 5, 4, 1, color(PALETTE.black), 0.32), "snes-embassy-floor-crack");
    }
  }

  for (let x = 16; x <= 240; x += 16) {
    add(scene.add.rectangle(x, 42, 16, 12, color(PALETTE.shadowNavy), 1)
      .setStrokeStyle(1, color(PALETTE.terminalCyan), 0.38), "snes-embassy-top-wall-tile");
    add(scene.add.rectangle(x, 230, 16, 12, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.42), "snes-embassy-bottom-wall-tile");
  }
  for (let y = 58; y <= 214; y += 16) {
    add(scene.add.rectangle(6, y, 12, 16, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.44), "snes-embassy-left-wall-tile");
    add(scene.add.rectangle(250, y, 12, 16, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.44), "snes-embassy-right-wall-tile");
  }

  const teletypeBanks = [
    { x: 51, y: 75, label: "OPEN" },
    { x: 205, y: 75, label: "CLASS" }
  ] as const;
  for (const bank of teletypeBanks) {
    add(scene.add.rectangle(bank.x + 2, bank.y + 4, 54, 34, color(PALETTE.black), 0.5), "snes-embassy-teletype-shadow");
    add(scene.add.rectangle(bank.x, bank.y, 54, 34, color(PALETTE.stoneGray), 1)
      .setStrokeStyle(2, color(PALETTE.black)), "snes-embassy-teletype-bank");
    add(scene.add.rectangle(bank.x, bank.y - 8, 44, 8, color(PALETTE.black), 0.92)
      .setStrokeStyle(1, color(bank.label === "OPEN" ? PALETTE.openNetGreen : PALETTE.classNetRed)), "snes-embassy-teletype-screen");
    add(scene.add.rectangle(bank.x - 11, bank.y - 8, 13, 3, color(PALETTE.terminalCyan), 0.92), "snes-embassy-teletype-scanline");
    add(scene.add.rectangle(bank.x + 14, bank.y - 8, 5, 3, color(bank.label === "OPEN" ? PALETTE.openNetGreen : PALETTE.classNetRed), 0.95), "snes-embassy-teletype-status");
    for (let row = 0; row < 2; row += 1) {
      add(scene.add.rectangle(bank.x - 14, bank.y + 3 + row * 8, 18, 3, color(PALETTE.creamPaper), 0.9), "snes-embassy-teletype-paper");
      add(scene.add.rectangle(bank.x + 11, bank.y + 3 + row * 8, 17, 3, color(PALETTE.goldStamp), 0.88), "snes-embassy-teletype-key-row");
    }
    add(scene.add.text(bank.x, bank.y + 11, bank.label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: bank.label === "OPEN" ? PALETTE.openNetGreen : PALETTE.classNetRed,
      align: "center"
    }).setOrigin(0.5, 0), "snes-embassy-teletype-label");
  }

  add(scene.add.rectangle(128, 110, 72, 42, color(PALETTE.black), 0.58), "snes-embassy-cipher-shadow");
  add(scene.add.rectangle(128, 109, 64, 34, color(PALETTE.bronze), 1)
    .setStrokeStyle(2, color(PALETTE.deepBrown)), "snes-embassy-cipher-machine");
  add(scene.add.rectangle(128, 95, 50, 8, color(PALETTE.black), 0.92)
    .setStrokeStyle(1, color(PALETTE.terminalCyan)), "snes-embassy-cipher-display");
  add(scene.add.rectangle(119, 95, 16, 3, color(PALETTE.terminalCyan), 0.95), "snes-embassy-cipher-display-glow");
  add(scene.add.rectangle(137, 95, 8, 3, color(PALETTE.classNetRed), 0.95), "snes-embassy-cipher-warning-light");
  for (let key = 0; key < 5; key += 1) {
    add(scene.add.rectangle(108 + key * 10, 111, 6, 5, color(key % 2 === 0 ? PALETTE.creamPaper : PALETTE.paleGold), 0.94)
      .setStrokeStyle(1, color(PALETTE.deepBrown)), "snes-embassy-cipher-key");
  }
  add(scene.add.rectangle(128, 126, 30, 5, color(PALETTE.black), 0.74)
    .setStrokeStyle(1, color(PALETTE.terminalCyan), 0.7), "snes-embassy-cipher-cable-slot");

  for (const line of [
    { x: 82, y: 122, w: 78, h: 3, angle: 0, tint: PALETTE.openNetGreen },
    { x: 174, y: 122, w: 78, h: 3, angle: 0, tint: PALETTE.classNetRed },
    { x: 128, y: 146, w: 70, h: 3, angle: 90, tint: PALETTE.terminalCyan }
  ] as const) {
    add(scene.add.rectangle(line.x, line.y, line.w, line.h, color(line.tint), 0.36).setAngle(line.angle), "snes-embassy-cable-route");
  }

  for (const crate of [
    { x: 55, y: 166, text: "CABLE" },
    { x: 80, y: 166, text: "BAG" }
  ] as const) {
    add(scene.add.rectangle(crate.x, crate.y + 5, 30, 10, color(PALETTE.black), 0.4), "snes-embassy-cable-crate-shadow");
    add(scene.add.rectangle(crate.x, crate.y, 30, 22, color(PALETTE.archiveAmber), 1)
      .setStrokeStyle(2, color(PALETTE.deepBrown)), "snes-embassy-cable-crate");
    add(scene.add.rectangle(crate.x, crate.y - 5, 22, 4, color(PALETTE.creamPaper), 0.95), "snes-embassy-cable-crate-label");
    add(scene.add.text(crate.x, crate.y - 1, crate.text, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.deepBrown,
      align: "center"
    }).setOrigin(0.5, 0), "snes-embassy-cable-crate-text");
  }

  add(scene.add.rectangle(202, 165, 42, 54, color(PALETTE.black), 0.62), "snes-embassy-secure-door-shadow");
  add(scene.add.rectangle(202, 165, 36, 48, color(PALETTE.stoneGray), 1)
    .setStrokeStyle(2, color(PALETTE.black)), "snes-embassy-secure-door-casing");
  add(scene.add.rectangle(202, 165, 24, 36, color(PALETTE.deepRuby), 1)
    .setStrokeStyle(2, color(PALETTE.classNetRed)), "snes-embassy-secure-door");
  add(scene.add.rectangle(202, 153, 14, 6, color(PALETTE.black), 0.9)
    .setStrokeStyle(1, color(PALETTE.classNetRed)), "snes-embassy-secure-door-panel");
  add(scene.add.rectangle(208, 167, 3, 5, color(PALETTE.goldStamp), 1), "snes-embassy-secure-door-handle");
  add(scene.add.rectangle(202, 189, 46, 9, color(PALETTE.black), 0.9)
    .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-embassy-guard-post");
  add(scene.add.text(202, 184, "GUARD", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-embassy-guard-post-label");

  add(scene.add.rectangle(128, 219, 40, 16, color(PALETTE.black), 0.82)
    .setStrokeStyle(1, color(PALETTE.creamPaper)), "snes-embassy-return-threshold");
  add(scene.add.rectangle(128, 213, 22, 4, color(PALETTE.goldStamp), 1), "snes-embassy-return-stair-top");
  add(scene.add.rectangle(128, 219, 30, 4, color(PALETTE.bronze), 1), "snes-embassy-return-stair-mid");
  add(scene.add.rectangle(128, 225, 38, 4, color(PALETTE.deepBrown), 1), "snes-embassy-return-stair-bottom");

  add(scene.add.rectangle(128, 47, 118, 11, color(PALETTE.black), 0.9)
    .setStrokeStyle(1, color(PALETTE.goldStamp)), "snes-embassy-room-title-frame");
  add(scene.add.text(128, 43, "EMBASSY CABLE ROOM", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.goldStamp,
    align: "center"
  }).setOrigin(0.5, 0), "snes-embassy-room-title");

  return container;
}

function addPublicationFallbackSprite(
  scene: Phaser.Scene,
  add: <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => T,
  x: number,
  y: number,
  accent: string
) {
  add(scene.add.rectangle(x, y - 12, 9, 8, color(PALETTE.archiveAmber), 1).setStrokeStyle(1, color(PALETTE.black)), "snes-publication-team-fallback-head");
  add(scene.add.rectangle(x, y - 4, 12, 14, color(accent), 1).setStrokeStyle(1, color(PALETTE.black)), "snes-publication-team-fallback-body");
  add(scene.add.rectangle(x - 2, y - 8, 3, 2, color(PALETTE.black), 1), "snes-publication-team-fallback-eyes");
  add(scene.add.rectangle(x + 3, y - 8, 3, 2, color(PALETTE.black), 1), "snes-publication-team-fallback-eyes");
  add(scene.add.rectangle(x - 5, y + 4, 4, 5, color(PALETTE.deepBrown), 1), "snes-publication-team-fallback-foot");
  add(scene.add.rectangle(x + 5, y + 4, 4, 5, color(PALETTE.deepBrown), 1), "snes-publication-team-fallback-foot");
  add(scene.add.rectangle(x + 8, y - 2, 4, 7, color(PALETTE.creamPaper), 1).setStrokeStyle(1, color(PALETTE.black)), "snes-publication-team-fallback-document");
}

function roomHash(roomId: string) {
  return roomId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function floorAccent(theme: SnesRoomLayerOptions["theme"], roomType?: RoomType) {
  if (theme === "network") return PALETTE.terminalCyan;
  if (theme === "proof") return PALETTE.buckramHighlight;
  if (theme === "vault" || roomType === "boss") return PALETTE.classNetRed;
  if (roomType === "reward" || roomType === "secret") return PALETTE.goldStamp;
  return PALETTE.sepiaInk;
}

function addSnesFloorVariants(
  scene: Phaser.Scene,
  options: SnesRoomLayerOptions,
  base: string,
  accent: string,
  track?: TrackFn
) {
  const hash = roomHash(options.roomId);
  const quiet = options.theme === "proof" ? PALETTE.creamPaper : base;
  const mark = floorAccent(options.theme, options.roomType);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 11; col += 1) {
      const x = 48 + col * 16;
      const y = 70 + row * 16;
      const variant = (row * 7 + col * 3 + hash) % 5;
      const archiveFrame = archiveFloorTileFrame(variant, options);
      if (archiveFrame && drawSnesArchiveTile(scene, archiveFrame, x, y, -15, `snes-room-archive-floor-${archiveFrame}`, track)) {
        continue;
      }
      const alpha = variant === 0 ? 0.2 : variant === 1 ? 0.14 : 0.09;
      const tileColor = variant === 0 ? mark : variant === 1 ? accent : quiet;
      keepTagged(scene.add.rectangle(x, y, 12, 12, color(tileColor), alpha).setDepth(-15), "snes-room-floor-variant", track);
      if (variant === 2) {
        keepTagged(scene.add.rectangle(x - 4, y + 4, 4, 1, color(mark), 0.36).setDepth(-14), "snes-room-floor-crack", track);
        keepTagged(scene.add.rectangle(x - 1, y + 5, 1, 3, color(mark), 0.28).setDepth(-14), "snes-room-floor-crack", track);
      } else if (variant === 3) {
        keepTagged(scene.add.rectangle(x + 3, y - 2, 1, 1, color(mark), 0.52).setDepth(-14), "snes-room-floor-speck", track);
        keepTagged(scene.add.rectangle(x - 2, y + 3, 1, 1, color(mark), 0.42).setDepth(-14), "snes-room-floor-speck", track);
      }
    }
  }
}

function addSnesWallDepth(
  scene: Phaser.Scene,
  options: SnesRoomLayerOptions,
  accent: string,
  shadow: string,
  track?: TrackFn
) {
  const topFill = options.theme === "network" ? PALETTE.stoneGray : PALETTE.creamPaper;
  const frontFill = options.theme === "proof" ? PALETTE.buckramHighlight : shadow;
  for (let x = 34; x <= 222; x += 16) {
    if (archiveWallTilesEnabled(options) && archiveTileFramesReady(scene, ["wall_top", "wall_front"])) {
      drawSnesArchiveTile(scene, "wall_top", x, 43, -14, "snes-room-archive-wall-top-tile", track);
      drawSnesArchiveTile(scene, "wall_front", x, 207, -14, "snes-room-archive-wall-front-tile", track);
      keepTagged(scene.add.rectangle(x + 5, 209, 3, 1, color(accent), 0.74).setDepth(-13), "snes-room-wall-front-highlight", track);
      continue;
    }
    keepTagged(scene.add.rectangle(x, 43, 13, 6, color(topFill), 0.62).setDepth(-14), "snes-room-wall-top-tile", track);
    keepTagged(scene.add.rectangle(x, 207, 13, 8, color(frontFill), 0.76).setDepth(-14), "snes-room-wall-front-tile", track);
    keepTagged(scene.add.rectangle(x + 5, 209, 3, 1, color(accent), 0.74).setDepth(-13), "snes-room-wall-front-highlight", track);
  }
  for (let y = 62; y <= 190; y += 16) {
    if (archiveWallTilesEnabled(options) && archiveTileFramesReady(scene, ["wall_side"])) {
      drawSnesArchiveTile(scene, "wall_side", 25, y, -14, "snes-room-archive-wall-side-tile", track)?.setFlipX(true);
      drawSnesArchiveTile(scene, "wall_side", 231, y, -14, "snes-room-archive-wall-side-tile", track);
      continue;
    }
    keepTagged(scene.add.rectangle(25, y, 6, 12, color(topFill), 0.58).setDepth(-14), "snes-room-wall-side-tile", track);
    keepTagged(scene.add.rectangle(231, y, 6, 12, color(frontFill), 0.74).setDepth(-14), "snes-room-wall-side-tile", track);
  }
  keepTagged(scene.add.rectangle(25, 47, 10, 10, color(accent), 0.82).setDepth(-13), "snes-room-corner-brass", track);
  keepTagged(scene.add.rectangle(231, 47, 10, 10, color(accent), 0.82).setDepth(-13), "snes-room-corner-brass", track);
  keepTagged(scene.add.rectangle(25, 207, 10, 10, color(PALETTE.black), 0.88).setDepth(-13), "snes-room-corner-shadow", track);
  keepTagged(scene.add.rectangle(231, 207, 10, 10, color(PALETTE.black), 0.88).setDepth(-13), "snes-room-corner-shadow", track);
}

function archiveFloorTileFrame(variant: number, options: SnesRoomLayerOptions): SnesArchiveTileFrame | null {
  if (!archiveTilesEnabled(options)) return null;
  if (options.roomType === "boss" || options.roomType === "secret") return variant < 2 ? "floor_ruby" : "floor_shadow";
  if (variant === 0) return "floor_base";
  if (variant === 1 || variant === 2) return "floor_crack";
  if (variant === 3) return "floor_dot";
  return "floor_base";
}

function archiveTilesEnabled(options: SnesRoomLayerOptions) {
  return options.theme === "archive" || options.theme === "vault" || options.roomType === "boss" || options.roomType === "secret";
}

function archiveWallTilesEnabled(options: SnesRoomLayerOptions) {
  return archiveTilesEnabled(options);
}

function drawSnesArchiveTile(
  scene: Phaser.Scene,
  frame: SnesArchiveTileFrame,
  x: number,
  y: number,
  depth: number,
  name: string,
  track?: TrackFn
) {
  if (!scene.textures.exists(SNES_ARCHIVE_TILE_ASSET.key)) return null;
  const texture = scene.textures.get(SNES_ARCHIVE_TILE_ASSET.key);
  if (!texture.has(frame)) return null;
  return keepTagged(scene.add.image(Math.round(x), Math.round(y), SNES_ARCHIVE_TILE_ASSET.key, frame).setDepth(depth), name, track);
}

function archiveTileFramesReady(scene: Phaser.Scene, frames: readonly SnesArchiveTileFrame[]) {
  if (!scene.textures.exists(SNES_ARCHIVE_TILE_ASSET.key)) return false;
  const texture = scene.textures.get(SNES_ARCHIVE_TILE_ASSET.key);
  return frames.every((frame) => texture.has(frame));
}

function addSnesRoomTypeLandmark(
  scene: Phaser.Scene,
  options: SnesRoomLayerOptions,
  base: string,
  accent: string,
  track?: TrackFn
) {
  const roomType = options.roomType ?? "normal";
  if (roomType === "hint") {
    keepTagged(scene.add.rectangle(128, 86, 52, 30, color(PALETTE.black), 0.82).setStrokeStyle(1, color(accent)).setDepth(-8), "snes-room-hint-board", track);
    keepTagged(scene.add.rectangle(116, 84, 12, 16, color(PALETTE.creamPaper), 1).setDepth(-7), "snes-room-hint-paper", track);
    keepTagged(scene.add.rectangle(132, 89, 25, 2, color(PALETTE.goldStamp), 1).setDepth(-7), "snes-room-hint-line", track);
    keepTagged(scene.add.rectangle(132, 95, 19, 2, color(PALETTE.buckramRed), 1).setDepth(-7), "snes-room-hint-line", track);
    return;
  }
  if (roomType === "reward") {
    keepTagged(scene.add.ellipse(128, 124, 54, 16, color(PALETTE.black), 0.7).setDepth(-8), "snes-room-reward-shadow", track);
    keepTagged(scene.add.rectangle(128, 117, 28, 22, color(PALETTE.deepRuby), 1).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(-7), "snes-room-reward-plinth", track);
    keepTagged(scene.add.rectangle(128, 106, 14, 10, color(PALETTE.creamPaper), 1).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-6), "snes-room-reward-volume", track);
    keepTagged(scene.add.rectangle(132, 106, 2, 10, color(PALETTE.buckramRed), 1).setDepth(-5), "snes-room-reward-spine", track);
    return;
  }
  if (roomType === "boss") {
    keepTagged(scene.add.ellipse(128, 130, 74, 22, color(PALETTE.black), 0.78).setDepth(-8), "snes-room-boss-shadow", track);
    keepTagged(scene.add.rectangle(128, 118, 38, 30, color(PALETTE.deepRuby), 1).setStrokeStyle(2, color(accent)).setDepth(-7), "snes-room-boss-core", track);
    keepTagged(scene.add.rectangle(128, 111, 26, 4, color(PALETTE.classNetRed), 1).setDepth(-6), "snes-room-boss-eye", track);
    keepTagged(scene.add.rectangle(128, 124, 12, 10, color(PALETTE.goldStamp), 1).setDepth(-6), "snes-room-boss-seal", track);
    return;
  }
  if (roomType === "puzzle") {
    keepTagged(scene.add.rectangle(128, 122, 50, 18, color(PALETTE.sepiaInk), 1).setStrokeStyle(1, color(PALETTE.black)).setDepth(-8), "snes-room-puzzle-table", track);
    keepTagged(scene.add.rectangle(112, 119, 16, 10, color(PALETTE.creamPaper), 1).setDepth(-7), "snes-room-puzzle-paper", track);
    keepTagged(scene.add.rectangle(137, 119, 18, 3, color(accent), 1).setDepth(-7), "snes-room-puzzle-marker", track);
    keepTagged(scene.add.rectangle(140, 126, 12, 2, color(PALETTE.buckramRed), 1).setDepth(-7), "snes-room-puzzle-marker", track);
    return;
  }
  keepTagged(scene.add.rectangle(54, 80, 22, 13, color(PALETTE.sepiaInk), 0.95).setStrokeStyle(1, color(PALETTE.black)).setDepth(-8), "snes-room-source-box", track);
  keepTagged(scene.add.rectangle(54, 74, 17, 8, color(PALETTE.creamPaper), 1).setDepth(-7), "snes-room-source-note", track);
  keepTagged(scene.add.rectangle(49, 74, 2, 8, color(accent), 1).setDepth(-6), "snes-room-source-note-margin", track);
  keepTagged(scene.add.rectangle(202, 82, 23, 16, color(base), 0.9).setStrokeStyle(1, color(accent)).setDepth(-8), "snes-room-side-desk", track);
}

function addSnesThemeLandmarks(
  scene: Phaser.Scene,
  options: SnesRoomLayerOptions,
  accent: string,
  track?: TrackFn
) {
  if (options.theme === "network") {
    for (let index = 0; index < 4; index += 1) {
      const x = 76 + index * 35;
      keepTagged(scene.add.rectangle(x, 183, 22, 14, color(PALETTE.black), 0.88).setStrokeStyle(1, color(PALETTE.terminalCyan)).setDepth(-8), "snes-room-network-terminal", track);
      keepTagged(scene.add.rectangle(x, 179, 13, 4, color(PALETTE.terminalCyan), 0.9).setDepth(-7), "snes-room-network-glow", track);
    }
    return;
  }
  if (options.theme === "vault") {
    for (let index = 0; index < 3; index += 1) {
      const x = 88 + index * 40;
      keepTagged(scene.add.rectangle(x, 183, 26, 10, color(PALETTE.black), 0.86).setStrokeStyle(1, color(accent)).setDepth(-8), "snes-room-vault-tray", track);
      keepTagged(scene.add.rectangle(x, 181, 16, 2, color(PALETTE.classNetRed), 0.9).setDepth(-7), "snes-room-vault-seal", track);
    }
    return;
  }
  if (options.theme === "proof") {
    for (let index = 0; index < 3; index += 1) {
      const x = 86 + index * 42;
      keepTagged(scene.add.rectangle(x - 3, 180, 11, 14, color(PALETTE.creamPaper), 1).setStrokeStyle(1, color(PALETTE.black)).setDepth(-8), "snes-room-proof-page", track);
      keepTagged(scene.add.rectangle(x + 5, 182, 11, 14, color(PALETTE.creamPaper), 1).setStrokeStyle(1, color(PALETTE.black)).setDepth(-8), "snes-room-proof-page", track);
      keepTagged(scene.add.rectangle(x + 3, 187, 8, 1, color(PALETTE.buckramRed), 1).setDepth(-7), "snes-room-proof-mark", track);
    }
    return;
  }
  if (options.theme === "office") {
    keepTagged(scene.add.rectangle(128, 184, 64, 16, color(PALETTE.sepiaInk), 1).setStrokeStyle(1, color(PALETTE.black)).setDepth(-8), "snes-room-office-desk", track);
    keepTagged(scene.add.rectangle(112, 180, 12, 10, color(PALETTE.creamPaper), 1).setDepth(-7), "snes-room-office-paper", track);
    keepTagged(scene.add.rectangle(145, 178, 8, 7, color(PALETTE.goldStamp), 1).setDepth(-7), "snes-room-office-mug", track);
  }
}

function addSnesAmbientSprites(
  scene: Phaser.Scene,
  options: SnesRoomLayerOptions,
  accent: string,
  track?: TrackFn
) {
  if (options.theme === "network") {
    for (let index = 0; index < 4; index += 1) {
      addAmbientPulse(scene, 76 + index * 35, 177, PALETTE.terminalCyan, PALETTE.white, "snes-room-ambient-terminal-pulse", track, index * 90);
    }
    return;
  }

  if (options.theme === "vault" || options.roomType === "boss" || options.roomType === "secret") {
    addAmbientTorch(scene, 56, 72, PALETTE.classNetRed, PALETTE.goldStamp, track, 0);
    addAmbientTorch(scene, 200, 72, PALETTE.classNetRed, PALETTE.goldStamp, track, 140);
    return;
  }

  if (options.theme === "proof") {
    for (let index = 0; index < 3; index += 1) {
      addAmbientPulse(scene, 90 + index * 40, 174, PALETTE.buckramRed, PALETTE.creamPaper, "snes-room-ambient-proof-shimmer", track, index * 120);
    }
    return;
  }

  if (options.theme === "office") {
    addAmbientPulse(scene, 146, 177, PALETTE.goldStamp, PALETTE.creamPaper, "snes-room-ambient-mug-steam", track, 80);
    addAmbientDust(scene, accent, track);
    return;
  }

  addAmbientPulse(scene, 55, 72, PALETTE.goldStamp, PALETTE.creamPaper, "snes-room-ambient-lamp-glint", track, 0);
  addAmbientDust(scene, accent, track);
}

function addAmbientPulse(
  scene: Phaser.Scene,
  x: number,
  y: number,
  primary: string,
  highlight: string,
  name: string,
  track?: TrackFn,
  delay = 0
) {
  const container = keepTagged(scene.add.container(x, y).setDepth(-4), name, track);
  container.add(tag(scene.add.rectangle(0, 0, 8, 3, color(primary), 0.82), `${name}-bar`));
  container.add(tag(scene.add.rectangle(3, -1, 2, 1, color(highlight), 0.92), `${name}-spark`));
  const tween = scene.tweens.add({
    targets: container,
    alpha: 0.28,
    delay,
    duration: 360,
    yoyo: true,
    repeat: -1,
    ease: "Stepped"
  });
  container.once(Phaser.GameObjects.Events.DESTROY, () => tween.stop());
  return container;
}

function addAmbientTorch(
  scene: Phaser.Scene,
  x: number,
  y: number,
  primary: string,
  highlight: string,
  track?: TrackFn,
  delay = 0
) {
  const container = keepTagged(scene.add.container(x, y).setDepth(-4), "snes-room-ambient-torch", track);
  container.add(tag(scene.add.rectangle(0, 7, 12, 5, color(PALETTE.black), 0.64), "snes-room-ambient-torch-shadow"));
  container.add(tag(scene.add.rectangle(0, 4, 8, 8, color(PALETTE.sepiaInk), 1), "snes-room-ambient-torch-bowl"));
  container.add(tag(scene.add.rectangle(0, -1, 6, 8, color(primary), 0.9), "snes-room-ambient-torch-flame"));
  container.add(tag(scene.add.rectangle(1, -3, 2, 5, color(highlight), 0.9), "snes-room-ambient-torch-core"));
  const tween = scene.tweens.add({
    targets: container,
    scaleY: 0.86,
    alpha: 0.72,
    delay,
    duration: 220,
    yoyo: true,
    repeat: -1,
    ease: "Stepped"
  });
  container.once(Phaser.GameObjects.Events.DESTROY, () => tween.stop());
  return container;
}

function addAmbientDust(scene: Phaser.Scene, accent: string, track?: TrackFn) {
  const dots = [
    { x: 86, y: 92, delay: 0 },
    { x: 172, y: 104, delay: 160 },
    { x: 118, y: 154, delay: 320 }
  ] as const;
  for (const dot of dots) {
    const particle = keepTagged(scene.add.rectangle(dot.x, dot.y, 2, 2, color(accent), 0.46).setDepth(-4), "snes-room-ambient-dust", track);
    const tween = scene.tweens.add({
      targets: particle,
      y: dot.y - 4,
      alpha: 0.12,
      delay: dot.delay,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Stepped"
    });
    particle.once(Phaser.GameObjects.Events.DESTROY, () => tween.stop());
  }
}

export function addSnesWorldMap(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label = "FRUS ATLAS",
  textureKey = "frus-snes-atlas",
  track?: TrackFn,
  options: SnesWorldMapOptions = {}
) {
  const viewportWidth = options.viewportWidth ?? 80;
  const viewportHeight = options.viewportHeight ?? 56;
  const cropX = options.cropX ?? 0;
  const cropY = options.cropY ?? 0;
  keep(scene.add.rectangle(x + 3, y + 4, viewportWidth + 10, viewportHeight + 10, color(PALETTE.black)).setDepth(68), track);
  keep(scene.add.rectangle(x, y, viewportWidth + 8, viewportHeight + 8, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(69), track);
  if (scene.textures.exists(textureKey)) {
    const texture = scene.textures.get(textureKey);
    const source = texture.getSourceImage() as { width?: number; height?: number };
    const sourceWidth = source.width ?? viewportWidth;
    const sourceHeight = source.height ?? viewportHeight;
    const left = x - viewportWidth / 2;
    const top = y - viewportHeight / 2;
    const atlas = scene.add
      .image(
        Math.round(left - cropX + sourceWidth / 2),
        Math.round(top - cropY + sourceHeight / 2),
        textureKey
      )
      .setDepth(70);
    const maskRect = scene.add.rectangle(x, y, viewportWidth, viewportHeight, color(PALETTE.black)).setVisible(false);
    atlas.setMask(maskRect.createGeometryMask());
    keep(maskRect, track);
    keep(atlas, track);
  } else {
    keep(scene.add.rectangle(x, y, viewportWidth, viewportHeight, color(PALETTE.creamPaper)).setDepth(70), track);
  }
  keep(scene.add.rectangle(x, y + viewportHeight / 2 - 3, Math.max(72, viewportWidth - 8), 8, color(PALETTE.black)).setDepth(71), track);
  keep(scene.add.text(x, y + viewportHeight / 2 - 6, label, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp
  }).setOrigin(0.5, 0).setDepth(72), track);
}

export function addSnesWorkflowRelicRack(scene: Phaser.Scene, x: number, y: number, track?: TrackFn) {
  keep(scene.add.rectangle(x + 2, y + 2, 138, 28, color(PALETTE.black)).setDepth(65), track);
  keep(scene.add.rectangle(x, y, 136, 26, color(PALETTE.deepRuby)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(66), track);
  if (scene.textures.exists("snes-workflow-tools")) {
    keep(scene.add.image(x, y - 1, "snes-workflow-tools").setDepth(67), track);
  }
  keep(scene.add.text(x, y + 11, "FRUS WORKFLOW RELICS", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.creamPaper
  }).setOrigin(0.5, 0).setDepth(68), track);
}
