import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { Direction } from "../game/constants";
import { beginSnesTransition, completeSnesTransition } from "../game/state";
import { retroAudio } from "./audio";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export function transitionTo(scene: Phaser.Scene, target: string) {
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
      scene.scene.start(target);
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

function transitionOrder(cells: Phaser.GameObjects.Rectangle[], direction?: Direction) {
  const keyed = cells.map((cell) => ({ cell, x: cell.x, y: cell.y }));
  if (direction === "east") return keyed.sort((a, b) => b.x - a.x || a.y - b.y).map((item) => item.cell);
  if (direction === "west") return keyed.sort((a, b) => a.x - b.x || a.y - b.y).map((item) => item.cell);
  if (direction === "north") return keyed.sort((a, b) => a.y - b.y || a.x - b.x).map((item) => item.cell);
  if (direction === "south") return keyed.sort((a, b) => b.y - a.y || a.x - b.x).map((item) => item.cell);
  const centerX = GAME_WIDTH / 2;
  const centerY = GAME_HEIGHT / 2;
  return keyed
    .sort((a, b) => Math.abs(a.x - centerX) + Math.abs(a.y - centerY) - (Math.abs(b.x - centerX) + Math.abs(b.y - centerY)))
    .map((item) => item.cell);
}

export function playRubyMosaicTransition(scene: Phaser.Scene, options: RubyMosaicTransitionOptions) {
  const overlay = scene.add.container(0, 0).setDepth(5000);
  const cells: Phaser.GameObjects.Rectangle[] = [];
  const palette = [PALETTE.black, PALETTE.deepRuby, PALETTE.buckramRed, PALETTE.black];
  const cellSize = 16;
  for (let y = 0; y < GAME_HEIGHT; y += cellSize) {
    for (let x = 0; x < GAME_WIDTH; x += cellSize) {
      const fill = palette[((x / cellSize) + (y / cellSize)) % palette.length];
      const cell = scene.add.rectangle(x, y, cellSize, cellSize, color(fill)).setOrigin(0, 0).setVisible(false);
      cells.push(cell);
      overlay.add(cell);
    }
  }

  const plateShadow = scene.add.rectangle(130, 122, 150, 38, color(PALETTE.black)).setVisible(false);
  const plate = scene.add.rectangle(128, 119, 150, 38, color(PALETTE.deepRuby)).setStrokeStyle(2, color(PALETTE.goldStamp)).setVisible(false);
  const title = scene.add.text(128, 107, options.label.slice(0, 24), {
    fontFamily: "monospace",
    fontSize: "8px",
    color: PALETTE.creamPaper
  }).setOrigin(0.5, 0).setVisible(false);
  const subtitle = scene.add.text(
    128,
    123,
    options.fromRoomId && options.toRoomId ? `${options.fromRoomId} -> ${options.toRoomId}` : "FRUS QUEST ROUTE",
    {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }
  ).setOrigin(0.5, 0).setVisible(false);
  const stitchA = scene.add.rectangle(75, 134, 58, 2, color(PALETTE.goldStamp)).setVisible(false);
  const stitchB = scene.add.rectangle(181, 134, 58, 2, color(PALETTE.goldStamp)).setVisible(false);
  overlay.add([plateShadow, plate, title, subtitle, stitchA, stitchB]);

  const ordered = transitionOrder(cells, options.direction);
  const showPlate = (visible: boolean) => {
    plateShadow.setVisible(visible);
    plate.setVisible(visible);
    title.setVisible(visible);
    subtitle.setVisible(visible);
    stitchA.setVisible(visible);
    stitchB.setVisible(visible);
  };
  const reveal = () => {
    showPlate(false);
    const reversed = [...ordered].reverse();
    let index = 0;
    let event: Phaser.Time.TimerEvent;
    event = scene.time.addEvent({
      delay: 8,
      loop: true,
      callback: () => {
        for (let i = 0; i < 14 && index < reversed.length; i += 1) {
          reversed[index].setVisible(false);
          index += 1;
        }
        if (index >= reversed.length) {
          event.remove(false);
          overlay.destroy();
          options.onComplete?.();
        }
      }
    });
  };
  let index = 0;
  let event: Phaser.Time.TimerEvent;
  event = scene.time.addEvent({
    delay: 10,
    loop: true,
    callback: () => {
      for (let i = 0; i < 12 && index < ordered.length; i += 1) {
        ordered[index].setVisible(true);
        index += 1;
      }
      if (index >= ordered.length) {
        event.remove(false);
        showPlate(true);
        scene.time.delayedCall(80, () => {
          options.onCovered();
          if (options.revealAfterCovered) scene.time.delayedCall(40, reveal);
        });
      }
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

export function drawRoomFrame(scene: Phaser.Scene, title: string, accent: string = PALETTE.goldStamp) {
  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy)).setDepth(-30);
  drawAdventureHud(scene, title, accent);
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
    drawStoneBlock(scene, x, topY, accent);
    if (x < 112 || x > 144) drawStoneBlock(scene, x, bottomY, accent);
  }
  for (let y = 56; y <= 200; y += 16) {
    if (y >= 104 && y <= 136) continue;
    drawStoneBlock(scene, 8, y, accent);
    drawStoneBlock(scene, GAME_WIDTH - 8, y, accent);
  }
  scene.add.rectangle(128, 220, 30, 8, color(PALETTE.black)).setDepth(43);
  scene.add.rectangle(128, 36, 30, 8, color(PALETTE.black)).setDepth(43);
}

function drawStoneBlock(scene: Phaser.Scene, x: number, y: number, accent: string) {
  scene.add.rectangle(x, y, 16, 16, color(PALETTE.black)).setDepth(40);
  scene.add.rectangle(x - 1, y - 1, 13, 13, color(PALETTE.stoneDark)).setDepth(41);
  scene.add.rectangle(x - 4, y - 4, 5, 5, color(PALETTE.stoneGray)).setDepth(42);
  scene.add.rectangle(x + 3, y + 5, 7, 2, color(accent)).setDepth(42);
  scene.add.rectangle(x - 1, y + 6, 10, 1, color(PALETTE.black)).setDepth(43);
}

export function addObjectiveText(scene: Phaser.Scene) {
  return scene.add.text(8, 224, "", {
    fontFamily: "monospace",
    fontSize: "8px",
    color: PALETTE.creamPaper,
    backgroundColor: PALETTE.black
  }).setDepth(810).setScrollFactor(0);
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
