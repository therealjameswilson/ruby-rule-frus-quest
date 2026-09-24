import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { Direction } from "../game/constants";
import type { ChapterTravelData } from "../game/chapterTravel";
import { beginSnesTransition, completeSnesTransition } from "../game/state";
import { retroAudio } from "./audio";
import { prefersReducedMotion } from "./motionPreferences";
import { drawDungeonStoneBlock } from "./dungeonWallArt";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export function transitionTo(scene: Phaser.Scene, target: string, data?: ChapterTravelData) {
  retroAudio.transition();
  beginSnesTransition({
    fromScene: scene.scene.key,
    toScene: target,
    label: sceneLabel(target)
  });
  playRubyMosaicTransition(scene, {
    label: sceneLabel(target),
    onCovered: () => {
      completeSnesTransition();
      const destination = scene.scene.get(target);
      destination.events.once(Phaser.Scenes.Events.CREATE, () => {
        destination.cameras.main.fadeIn(prefersReducedMotion() ? 80 : 220, 17, 14, 24);
      });
      scene.scene.start(target, data ?? {});
    }
  });
}

interface RubyMosaicTransitionOptions {
  label: string;
  direction?: Direction;
  fromRoomId?: string;
  toRoomId?: string;
  onCovered: () => void;
  revealAfterCovered?: boolean;
  onComplete?: () => void;
}

function sceneLabel(target: string) {
  return target
    .replace("Scene", "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toUpperCase();
}

// Retain the exported name for existing callers and saved campaign tooling.
// A single directional curtain replaces the old hundreds-of-tiles mosaic.
export function playRubyMosaicTransition(scene: Phaser.Scene, options: RubyMosaicTransitionOptions) {
  const reduced = prefersReducedMotion();
  const overlay = scene.add.container(0, 0).setDepth(5000).setScrollFactor(0);
  const curtain = scene.add.rectangle(128, 120, GAME_WIDTH + 2, GAME_HEIGHT + 2, 0x110e18);
  const band = scene.add.rectangle(128, 123, GAME_WIDTH + 2, 64, 0x301722);
  const rule = scene.add.rectangle(128, 91, 36, 1, 0xd9b66f);
  const title = scene.add.text(128, 110, options.label, {
    fontFamily: "monospace", fontSize: "10px", color: "#fff0d4",
    align: "center", wordWrap: { width: 224 }
  }).setOrigin(0.5);
  const subtitle = scene.add.text(128, 142,
    options.fromRoomId && options.toRoomId ? `${options.fromRoomId}  /  ${options.toRoomId}` : "THE FRUS QUEST",
    { fontFamily: "monospace", fontSize: "6px", color: "#d9b66f", letterSpacing: 2 }
  ).setOrigin(0.5);
  overlay.add([curtain, band, rule, title, subtitle]);
  const offset = options.direction === "east" ? { x: GAME_WIDTH + 2, y: 0 }
    : options.direction === "west" ? { x: -GAME_WIDTH - 2, y: 0 }
    : options.direction === "north" ? { x: 0, y: -GAME_HEIGHT - 2 }
    : { x: 0, y: GAME_HEIGHT + 2 };
  if (reduced || !options.direction) overlay.setAlpha(0);
  else overlay.setPosition(offset.x, offset.y);
  let cancelled = false;
  const shutdown = () => { cancelled = true; scene.tweens.killTweensOf(overlay); };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, shutdown);
  const cleanup = () => {
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, shutdown);
    overlay.destroy();
  };
  scene.tweens.add({
    targets: overlay, x: 0, y: 0, alpha: 1,
    duration: reduced ? 80 : 180, ease: "Cubic.easeOut",
    onComplete: () => {
      scene.time.delayedCall(reduced ? 60 : 160, () => {
        if (cancelled) return;
        options.onCovered();
        if (!options.revealAfterCovered || cancelled) return;
        scene.tweens.add({
          targets: overlay, alpha: 0,
          x: reduced ? 0 : -offset.x * 0.08,
          y: reduced ? 0 : -offset.y * 0.08,
          duration: reduced ? 80 : 220, ease: "Sine.easeInOut",
          onComplete: () => { cleanup(); options.onComplete?.(); }
        });
      });
    }
  });
}

export function transitionArchiveRoom(
  scene: Phaser.Scene,
  options: {
    fromRoomId: string;
    toRoomId: string;
    direction: Direction;
    label: string;
    onCovered: () => void;
    onComplete: () => void;
  }
) {
  retroAudio.transition();
  beginSnesTransition({
    fromScene: scene.scene.key,
    fromRoomId: options.fromRoomId,
    toRoomId: options.toRoomId,
    direction: options.direction,
    label: options.label
  });
  playRubyMosaicTransition(scene, {
    label: options.label,
    direction: options.direction,
    fromRoomId: options.fromRoomId,
    toRoomId: options.toRoomId,
    revealAfterCovered: true,
    onCovered: options.onCovered,
    onComplete: () => {
      completeSnesTransition();
      options.onComplete();
    }
  });
}

export function drawTiledFloor(scene: Phaser.Scene, textureKey: string) {
  for (let y = 40; y < GAME_HEIGHT; y += 16) {
    for (let x = 8; x < GAME_WIDTH; x += 16) {
      scene.add.image(x, y, textureKey).setDepth(-20);
    }
  }
}

export function drawRoomFrame(
  scene: Phaser.Scene,
  title: string,
  accent: string = PALETTE.goldStamp,
  options: { showLegacyHud?: boolean } = {}
) {
  const showLegacyHud = options.showLegacyHud ?? true;
  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy)).setDepth(-30);
  if (showLegacyHud) drawAdventureHud(scene, title, accent);
  drawDungeonWalls(scene, accent);
  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 16, GAME_WIDTH - 8, GAME_HEIGHT - 40).setStrokeStyle(4, color(PALETTE.buckramRed)).setDepth(50);
}

function drawAdventureHud(scene: Phaser.Scene, title: string, accent: string) {
  scene.add.rectangle(GAME_WIDTH / 2, 16, GAME_WIDTH, 32, color(PALETTE.black)).setDepth(760).setScrollFactor(0);
  scene.add.rectangle(GAME_WIDTH / 2, 31, GAME_WIDTH, 2, color(PALETTE.buckramRed)).setDepth(761).setScrollFactor(0);
  scene.add.rectangle(26, 16, 42, 20, color(PALETTE.stoneGray)).setStrokeStyle(1, color(PALETTE.creamPaper)).setDepth(762).setScrollFactor(0);
  scene.add.rectangle(26, 16, 34, 12, color(PALETTE.stoneDark)).setDepth(763).setScrollFactor(0);
  const roomHash = title.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rooms = [
    [16, 12],
    [25, 12],
    [34, 12],
    [25, 19],
    [25, 6]
  ];
  rooms.forEach(([x, y], index) => {
    const active = index === roomHash % rooms.length;
    scene.add.rectangle(x, y, active ? 6 : 4, active ? 5 : 4, color(active ? accent : PALETTE.stoneLight)).setDepth(764).setScrollFactor(0);
  });
  scene.add.text(52, 5, title, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: accent
  }).setDepth(802).setScrollFactor(0);
  drawHudIcon(scene, 141, 16, "B", PALETTE.terminalCyan);
  drawHudIcon(scene, 160, 16, "A", PALETTE.goldStamp);
  scene.add.text(184, 5, "-CONF-", {
    fontFamily: "monospace",
    fontSize: "7px",
    color: PALETTE.buckramHighlight
  }).setDepth(802).setScrollFactor(0);
  for (let i = 0; i < 5; i += 1) {
    scene.add.rectangle(214 + i * 7, 20, 5, 5, color(PALETTE.buckramHighlight)).setDepth(802).setScrollFactor(0);
    scene.add.rectangle(215 + i * 7, 18, 3, 2, color(PALETTE.goldStamp)).setDepth(803).setScrollFactor(0);
  }
}

function drawHudIcon(scene: Phaser.Scene, x: number, y: number, label: string, accent: string) {
  scene.add.rectangle(x + 1, y + 1, 14, 20, color(PALETTE.stoneDark)).setDepth(801).setScrollFactor(0);
  scene.add.rectangle(x, y, 14, 20, color(PALETTE.black)).setStrokeStyle(2, color(accent)).setDepth(802).setScrollFactor(0);
  scene.add.rectangle(x, y - 3, 8, 1, color(PALETTE.creamPaper)).setDepth(803).setScrollFactor(0);
  scene.add.text(x, y - 7, label, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.creamPaper
  }).setOrigin(0.5).setDepth(803).setScrollFactor(0);
  scene.add.rectangle(x - 1, y + 4, 7, 9, color(PALETTE.black)).setDepth(803).setScrollFactor(0);
  scene.add.rectangle(x, y + 3, 6, 8, color(accent)).setDepth(804).setScrollFactor(0);
  scene.add.rectangle(x + 2, y + 1, 2, 2, color(PALETTE.creamPaper)).setDepth(805).setScrollFactor(0);
}

function drawDungeonWalls(scene: Phaser.Scene, accent: string) {
  const topY = 40;
  const bottomY = 216;
  for (let x = 8; x <= GAME_WIDTH - 8; x += 16) {
    if (x >= 112 && x <= 144) continue;
    drawDungeonStoneBlock(scene, x, topY, accent);
    if (x < 112 || x > 144) drawDungeonStoneBlock(scene, x, bottomY, accent);
  }
  for (let y = 56; y <= 200; y += 16) {
    if (y >= 104 && y <= 136) continue;
    drawDungeonStoneBlock(scene, 8, y, accent);
    drawDungeonStoneBlock(scene, GAME_WIDTH - 8, y, accent);
  }
  scene.add.rectangle(128, 220, 30, 8, color(PALETTE.black)).setDepth(43);
  scene.add.rectangle(128, 36, 30, 8, color(PALETTE.black)).setDepth(43);
}


export function addObjectiveText(scene: Phaser.Scene) {
  const text = scene.add.text(8, 224, compactObjectiveText(""), {
    fontFamily: "monospace",
    fontSize: "8px",
    color: PALETTE.creamPaper,
    backgroundColor: PALETTE.black,
    wordWrap: { width: 238, useAdvancedWrap: true },
    fixedWidth: 238
  }).setDepth(810).setScrollFactor(0);

  const setText = text.setText.bind(text);
  text.setText = ((value: string | string[]) => {
    const raw = Array.isArray(value) ? value.join(" ") : value;
    return setText(compactObjectiveText(raw));
  }) as typeof text.setText;

  return text;
}

const OBJECTIVE_PREFIXES: Array<[RegExp, string]> = [
  [/^Archive Cavern:\s*/i, "ARCHIVE: "],
  [/^Two Networks:\s*/i, "NETWORK: "],
  [/^Referral Vault:\s*/i, "REFERRAL: "],
  [/^Editor's Labyrinth:\s*/i, "EDITOR: "],
  [/^Silent Read Tower:\s*/i, "PROOF: "],
  [/^Office of the Historian:\s*/i, "OFFICE: "],
  [/^Black Vault Lair:\s*/i, "VAULT: "],
  [/^Buckram Gate:\s*/i, "GATE: "]
];

const OBJECTIVE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bSource Note 47\b/gi, "SN47"],
  [/\bresearch table\b/gi, "table"],
  [/\bCitation Stamp\b/gi, "stamp"],
  [/\bClearance Token\b/gi, "token"],
  [/\bConcurrence Slip\b/gi, "slip"],
  [/\bRed Pencil\b/gi, "pencil"],
  [/\bProof Lens\b/gi, "lens"],
  [/\bFRUS volume\b/gi, "volume"],
  [/\bdeclassification\b/gi, "declass"],
  [/\bpublication\b/gi, "pub."],
  [/\bprocess wall\b/gi, "wall"],
  [/\bremaining\b/gi, "left"],
  [/\bdocument tiles\b/gi, "docs"],
  [/\bprovenance\b/gi, "prov."]
];

const MAX_OBJECTIVE_CHARS = 39;

export function compactObjectiveText(objective: string) {
  let text = objective.replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of OBJECTIVE_PREFIXES) {
    text = text.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of OBJECTIVE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  if (text.length <= MAX_OBJECTIVE_CHARS) return text;
  const hardLimit = MAX_OBJECTIVE_CHARS - 3;
  const cut = text.slice(0, hardLimit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

export function addTerminalPanel(scene: Phaser.Scene, x: number, y: number, lines: string[], border: string = PALETTE.terminalCyan) {
  const box = scene.add.rectangle(x, y, 92, 70, color(PALETTE.black)).setStrokeStyle(2, color(border));
  const text = scene.add.text(x - 40, y - 27, lines.join("\n"), {
    fontFamily: "monospace",
    fontSize: "7px",
    color: PALETTE.terminalCyan,
    wordWrap: { width: 80, useAdvancedWrap: true },
    lineSpacing: 1
  });
  return scene.add.container(0, 0, [box, text]).setDepth(90);
}
